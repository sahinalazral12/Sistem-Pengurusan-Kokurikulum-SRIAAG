import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dapatPenggunaSesi, resp, respRalat, unitGuru, logAudit } from "@/lib/auth";

// GET /api/sessions/[id]/attendance - senarai kehadiran sesi (FR-15)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  const { id } = await params;
  const sesiData = await db.sesi.findUnique({
    where: { id },
    include: {
      unit: true,
      kehadiran: { include: { murid: true } },
    },
  });
  if (!sesiData) return respRalat("Sesi tidak dijumpai.", 404);
  // Guru: akses unit sahaja
  if (sesi.peranan === "GURU") {
    const unitIds = (await unitGuru(sesi.penggunaId)).map((u) => u.id);
    if (!unitIds.includes(sesiData.unitId)) return respRalat("Tiada akses.", 403);
  }

  // Jika sesi masih DIRANCANG dan tiada kehadiran, auto-jana rekod kosong dari keahlian unit
  if (sesiData.kehadiran.length === 0) {
    const ahli = await db.keahlian.findMany({ where: { unitId: sesiData.unitId, aktif: true }, include: { murid: true } });
    for (const a of ahli) {
      await db.kehadiran.create({
        data: { sesiId: id, muridId: a.muridId, status: "HADIR", dikunci: false },
      });
    }
    // re-fetch
    const kehadiran = await db.kehadiran.findMany({ where: { sesiId: id }, include: { murid: true } });
    return resp({ sesi: { ...sesiData, kehadiran } });
  }

  return resp({ sesi: sesiData });
}

// PUT /api/sessions/[id]/attendance - simpan kehadiran (FR-17/FR-19)
// body: { dikunci: boolean, kehadiran: [{muridId, status, catatan}] }
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  const { id } = await params;
  const body = await req.json();
  const sesiData = await db.sesi.findUnique({ where: { id }, select: { unitId: true } });
  if (!sesiData) return respRalat("Sesi tidak dijumpai.", 404);
  // Guru sahaja boleh edit (jika tidak dikunci)
  if (sesi.peranan !== "GURU" && sesi.peranan !== "PK" && sesi.peranan !== "ADMIN") {
    return respRalat("Anda tiada kebenaran.", 403);
  }
  if (sesi.peranan === "GURU") {
    const unitIds = (await unitGuru(sesi.penggunaId)).map((u) => u.id);
    if (!unitIds.includes(sesiData.unitId)) return respRalat("Tiada akses.", 403);
  }

  // Semak jika sedia dikunci
  const kehadiranSedia = await db.kehadiran.findMany({ where: { sesiId: id }, select: { dikunci: true } });
  const adaDikunci = kehadiranSedia.some((k) => k.dikunci);
  if (adaDikunci && sesi.peranan !== "PK" && sesi.peranan !== "ADMIN") {
    return respRalat("Kehadiran telah dikunci. Hanya PK Kokurikulum boleh membuka kunci.", 403);
  }

  const { kehadiran, dikunci } = body as { kehadiran: { muridId: string; status: string; catatan?: string }[]; dikunci?: boolean };
  if (!Array.isArray(kehadiran)) return respRalat("Format kehadiran tidak sah.", 400);

  // FR-16: sahkan status
  const statusSah = ["HADIR", "TIDAK_HADIR", "LEWAT", "SAKIT", "URUSAN_RASMI"];
  for (const k of kehadiran) {
    if (!statusSah.includes(k.status)) return respRalat(`Status tidak sah: ${k.status}`, 400);
  }

  // upsert setiap rekod
  for (const k of kehadiran) {
    await db.kehadiran.upsert({
      where: { sesiId_muridId: { sesiId: id, muridId: k.muridId } },
      create: { sesiId: id, muridId: k.muridId, status: k.status, catatan: k.catatan ?? null, dikunci: dikunci ?? false },
      update: { status: k.status, catatan: k.catatan ?? null, dikunci: dikunci ?? false },
    });
  }

  // Jika dikunci, tanda sesi SELESAI
  if (dikunci) {
    await db.sesi.update({ where: { id }, data: { status: "SELESAI" } });
  }

  await logAudit(sesi.penggunaId, dikunci ? "HANTAR_KEHADIRAN" : "SIMPAN_KEHADIRAN", "KEHADIRAN", undefined, `Sesi ${id}${dikunci ? " - DIKUNCI" : ""}`);
  return resp({ ok: true });
}

// PATCH /api/sessions/[id]/attendance?action=unlock - buka kunci (PK sahaja) (FR-19)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  if (sesi.peranan !== "PK" && sesi.peranan !== "ADMIN") {
    return respRalat("Hanya PK Kokurikulum boleh membuka kunci kehadiran.", 403);
  }
  const { id } = await params;
  await db.kehadiran.updateMany({ where: { sesiId: id }, data: { dikunci: false } });
  await logAudit(sesi.penggunaId, "BUKA_KUNCI_KEHADIRAN", "KEHADIRAN", undefined, `Sesi ${id}`);
  return resp({ ok: true });
}
