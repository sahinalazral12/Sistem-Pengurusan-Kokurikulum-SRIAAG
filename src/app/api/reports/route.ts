import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dapatPenggunaSesi, resp, respRalat, unitGuru, logAudit } from "@/lib/auth";

// GET /api/reports - senarai laporan
// Param: unitId, status, sesiId
export async function GET(req: NextRequest) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  const url = new URL(req.url);
  const unitId = url.searchParams.get("unitId") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;

  const where: any = {};
  if (status) where.status = status;
  if (unitId) where.sesi = { unitId };

  // Guru: hanya unit diamanahkan + dicipta olehnya
  if (sesi.peranan === "GURU") {
    const unitIds = (await unitGuru(sesi.penggunaId)).map((u) => u.id);
    where.OR = [{ diciptaOlehId: sesi.penggunaId }, { sesi: { unitId: { in: unitIds } } }];
  }

  const laporan = await db.laporanAktiviti.findMany({
    where,
    include: {
      sesi: { include: { unit: true } },
      diciptaOleh: { select: { nama: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return resp({ laporan });
}

// POST /api/reports - cipta laporan baru (FR-23)
// body: { sesiId, objektif, ringkasan, hasil, masalah, cadangan, gambar[], status }
export async function POST(req: NextRequest) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  if (sesi.peranan !== "GURU" && sesi.peranan !== "PK" && sesi.peranan !== "ADMIN") {
    return respRalat("Anda tiada kebenaran.", 403);
  }
  const body = await req.json();
  const { sesiId } = body;
  if (!sesiId) return respRalat("sesiId diperlukan.", 400);
  const sesiData = await db.sesi.findUnique({ where: { id: sesiId }, include: { unit: true } });
  if (!sesiData) return respRalat("Sesi tidak dijumpai.", 404);

  if (sesi.peranan === "GURU") {
    const unitIds = (await unitGuru(sesi.penggunaId)).map((u) => u.id);
    if (!unitIds.includes(sesiData.unitId)) return respRalat("Tiada akses kepada unit ini.", 403);
  }

  // FR-24: bilangan hadir & peratus diisi automatik
  const kehadiran = await db.kehadiran.findMany({ where: { sesiId } });
  const hadir = kehadiran.filter((k) => k.status === "HADIR" || k.status === "LEWAT").length;
  const total = kehadiran.length;
  const peratus = total > 0 ? Math.round((hadir / total) * 100) : 0;

  // semak jika laporan sedia ada untuk sesi ini
  const sedia = await db.laporanAktiviti.findUnique({ where: { sesiId } });
  if (sedia) return respRalat("Laporan bagi sesi ini sudah wujud. Sila kemaskini.", 400);

  const laporan = await db.laporanAktiviti.create({
    data: {
      sesiId,
      objektif: body.objektif || "",
      ringkasan: (body.ringkasan || "") + `\n\n[Bilangan Hadir: ${hadir}/${total} (${peratus}%)]`,
      hasil: body.hasil || "",
      masalah: body.masalah || "",
      cadangan: body.cadangan || "",
      gambar: body.gambar ? JSON.stringify(body.gambar) : null,
      status: body.status === "DIHANTAR" ? "DIHANTAR" : "DRAF",
      diciptaOlehId: sesi.penggunaId,
      tarikhHantar: body.status === "DIHANTAR" ? new Date() : null,
    },
    include: { sesi: { include: { unit: true } } },
  });
  await logAudit(sesi.penggunaId, "CIPTA_LAPORAN", "LAPORAN_AKTIVITI", laporan.id, `Cipta laporan untuk sesi ${sesiId}`);
  return resp({ laporan });
}

// PUT /api/reports - kemaskini laporan
export async function PUT(req: NextRequest) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return respRalat("ID laporan diperlukan.", 400);
  const existing = await db.laporanAktiviti.findUnique({ where: { id }, include: { sesi: { include: { unit: true } } } });
  if (!existing) return respRalat("Laporan tidak dijumpai.", 404);

  // Guru: sahkan pemilikan
  if (sesi.peranan === "GURU") {
    const unitIds = (await unitGuru(sesi.penggunaId)).map((u) => u.id);
    if (!unitIds.includes(existing.sesi.unitId)) return respRalat("Tiada akses.", 403);
    // Jika Diluluskan/Dihantar, tak boleh edit (mesti kembalikan dahulu)
    if (existing.status === "DILULUSKAN") return respRalat("Laporan telah diluluskan. Tidak boleh dikemaskini.", 403);
  }

  // FR-24: auto-kemas peratus hadir
  if (data.ringkasan !== undefined || data.refreshStats) {
    const kehadiran = await db.kehadiran.findMany({ where: { sesiId: existing.sesiId } });
    const hadir = kehadiran.filter((k) => k.status === "HADIR" || k.status === "LEWAT").length;
    const total = kehadiran.length;
    const peratus = total > 0 ? Math.round((hadir / total) * 100) : 0;
    data.ringkasan = (data.ringkasan ?? existing.ringkasan ?? "") + `\n\n[Bilangan Hadir: ${hadir}/${total} (${peratus}%)]`;
  }
  if (data.gambar) data.gambar = JSON.stringify(data.gambar);

  const laporan = await db.laporanAktiviti.update({ where: { id }, data });
  await logAudit(sesi.penggunaId, "KEMASKINI_LAPORAN", "LAPORAN_AKTIVITI", id, `Status: ${data.status ?? "kemaskini"}`);
  return resp({ laporan });
}
