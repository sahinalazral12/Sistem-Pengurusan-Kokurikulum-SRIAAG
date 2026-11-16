import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dapatPenggunaSesi, resp, respRalat, unitGuru, logAudit } from "@/lib/auth";

// GET /api/sessions - senarai sesi mengikut peranan
// Param: unitId, dari, hingga, bulan, status
export async function GET(req: NextRequest) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  const url = new URL(req.url);
  const unitId = url.searchParams.get("unitId") ?? undefined;
  const dari = url.searchParams.get("dari");
  const hingga = url.searchParams.get("hingga");
  const status = url.searchParams.get("status") ?? undefined;

  const where: any = {};
  if (unitId) where.unitId = unitId;
  if (status) where.status = status;
  if (dari || hingga) {
    where.tarikh = {};
    if (dari) where.tarikh.gte = new Date(dari);
    if (hingga) where.tarikh.lte = new Date(hingga);
  }

  // Guru: hanya unit yang diamanahkan
  if (sesi.peranan === "GURU") {
    const unitIds = (await unitGuru(sesi.penggunaId)).map((u) => u.id);
    where.unitId = unitId && unitIds.includes(unitId) ? unitId : { in: unitIds };
  }

  const sesiList = await db.sesi.findMany({
    where,
    include: {
      unit: { select: { id: true, nama: true, kategori: true } },
      _count: { select: { kehadiran: true } },
      laporan: { select: { id: true, status: true } },
    },
    orderBy: { tarikh: "desc" },
    take: 200,
  });
  return resp({ sesi: sesiList });
}

// POST /api/sessions - cipta sesi (FR-11/FR-12)
export async function POST(req: NextRequest) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  if (sesi.peranan !== "GURU" && sesi.peranan !== "PK" && sesi.peranan !== "ADMIN") {
    return respRalat("Anda tiada kebenaran untuk mencipta sesi.", 403);
  }
  const body = await req.json();
  const { unitId, tajuk, tarikh, masaMula, masaTamat, tempat, jenis } = body;
  if (!unitId || !tajuk || !tarikh || !masaMula || !masaTamat) {
    return respRalat("Medan wajib: unitId, tajuk, tarikh, masaMula, masaTamat.", 400);
  }
  // Guru: sahkan akses unit
  if (sesi.peranan === "GURU") {
    const unitIds = (await unitGuru(sesi.penggunaId)).map((u) => u.id);
    if (!unitIds.includes(unitId)) return respRalat("Tiada akses kepada unit ini.", 403);
  }
  // FR-12: sokong sesi berulang (repeatCount)
  const repeatCount = Math.min(parseInt(body.repeatCount ?? "1"), 12);
  const sesiList = [];
  const baseTarikh = new Date(tarikh);
  for (let i = 0; i < repeatCount; i++) {
    const t = new Date(baseTarikh);
    t.setDate(t.getDate() + i * 7);
    const s = await db.sesi.create({
      data: {
        unitId, tajuk: repeatCount > 1 ? `${tajuk} (Minggu ${i + 1})` : tajuk,
        tarikh: t, masaMula, masaTamat, tempat: tempat || null,
        jenis: jenis || "MINGGUAN",
        status: "DIRANCANG",
      },
    });
    sesiList.push(s);
  }
  await logAudit(sesi.penggunaId, "CIPTA_SESI", "SESI", undefined, `Cipta ${repeatCount} sesi untuk unit ${unitId}`);
  return resp({ sesi: sesiList });
}
