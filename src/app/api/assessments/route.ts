import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dapatPenggunaSesi, resp, respRalat, unitGuru, logAudit } from "@/lib/auth";

// GET /api/assessments - senarai penilaian
// Param: unitId, semester, tahun, muridId
export async function GET(req: NextRequest) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  const url = new URL(req.url);
  const unitId = url.searchParams.get("unitId") ?? undefined;
  const semester = url.searchParams.get("semester") ?? undefined;
  const tahun = url.searchParams.get("tahun") ?? undefined;
  const muridId = url.searchParams.get("muridId") ?? undefined;

  const where: any = {};
  if (unitId) where.unitId = unitId;
  if (semester) where.semester = parseInt(semester);
  if (tahun) where.tahun = parseInt(tahun);
  if (muridId) where.muridId = muridId;

  // Guru: sahkan akses unit
  if (sesi.peranan === "GURU" && unitId) {
    const unitIds = (await unitGuru(sesi.penggunaId)).map((u) => u.id);
    if (!unitIds.includes(unitId)) return respRalat("Tiada akses.", 403);
  } else if (sesi.peranan === "GURU") {
    const unitIds = (await unitGuru(sesi.penggunaId)).map((u) => u.id);
    where.unitId = { in: unitIds };
  }

  const penilaian = await db.penilaian.findMany({
    where,
    include: {
      murid: true,
      unit: true,
    },
    orderBy: [{ murid: { nama: "asc" } }],
    take: 200,
  });

  // Tambah peratus kehadiran untuk rujukan (FR-32)
  const hasil = [];
  for (const p of penilaian) {
    const kehadiran = await db.kehadiran.findMany({
      where: { muridId: p.muridId, sesi: { unitId: p.unitId } },
      select: { status: true },
    });
    const hadir = kehadiran.filter((k) => k.status === "HADIR" || k.status === "LEWAT").length;
    const total = kehadiran.length;
    const peratus = total > 0 ? Math.round((hadir / total) * 100) : 0;
    hasil.push({ ...p, peratusKehadiran: peratus });
  }

  return resp({ penilaian: hasil });
}

// PUT /api/assessments - kemaskini/jana penilaian pukal (FR-31/FR-33)
// body: { unitId, semester, tahun, penilaian: [{muridId, tahap, jawatan, catatan}] }
export async function PUT(req: NextRequest) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  if (sesi.peranan !== "GURU" && sesi.peranan !== "PK" && sesi.peranan !== "ADMIN") {
    return respRalat("Anda tiada kebenaran.", 403);
  }
  const body = await req.json();
  const { unitId, semester, tahun, penilaian } = body;
  if (!unitId || !semester || !tahun || !Array.isArray(penilaian)) {
    return respRalat("Medan wajib: unitId, semester, tahun, penilaian[].", 400);
  }
  if (sesi.peranan === "GURU") {
    const unitIds = (await unitGuru(sesi.penggunaId)).map((u) => u.id);
    if (!unitIds.includes(unitId)) return respRalat("Tiada akses.", 403);
  }
  const tahapSah = ["CEMERLANG", "BAIK", "MEMUASKAN", "PERLU_PERHATIAN"];

  for (const p of penilaian) {
    if (!tahapSah.includes(p.tahap)) return respRalat(`Tahap tidak sah: ${p.tahap}`, 400);
    await db.penilaian.upsert({
      where: { muridId_unitId_semester_tahun: { muridId: p.muridId, unitId, semester, tahun } },
      create: {
        muridId: p.muridId, unitId, semester, tahun,
        tahap: p.tahap, jawatan: p.jawatan || "AHLI",
        catatan: p.catatan || null, status: "DIHANTAR",
        diciptaOlehId: sesi.penggunaId,
      },
      update: {
        tahap: p.tahap, jawatan: p.jawatan || "AHLI",
        catatan: p.catatan || null,
        diciptaOlehId: sesi.penggunaId,
      },
    });
  }
  await logAudit(sesi.penggunaId, "SIMPAN_PENILAIAN", "PENILAIAN", undefined, `${penilaian.length} penilaian untuk unit ${unitId}`);
  return resp({ ok: true, count: penilaian.length });
}
