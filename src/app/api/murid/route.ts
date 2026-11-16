import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dapatPenggunaSesi, resp, respRalat } from "@/lib/auth";

// GET /api/murid - cari & tapis murid (FR-08/FR-08A)
// Param: q (nama/no), tahun, kelas, unitId
export async function GET(req: NextRequest) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const tahun = url.searchParams.get("tahun");
  const kelas = url.searchParams.get("kelas") ?? undefined;
  const unitId = url.searchParams.get("unitId") ?? undefined;
  const limit = parseInt(url.searchParams.get("limit") ?? "100");

  const where: any = { aktif: true };
  // FR-08A: Tahun hanya 4, 5, 6
  if (tahun) {
    const t = parseInt(tahun);
    if (t < 4 || t > 6) return resp({ murid: [] });
    where.tahun = t;
  } else {
    where.tahun = { in: [4, 5, 6] };
  }
  if (kelas) where.kelas = { contains: kelas };
  if (q) {
    where.OR = [
      { nama: { contains: q } },
      { noMurid: { contains: q } },
    ];
  }
  if (unitId) {
    where.keahlian = { some: { unitId, aktif: true } };
  }

  const murid = await db.murid.findMany({
    where,
    include: unitId ? { keahlian: { where: { unitId, aktif: true } } } : false,
    take: limit,
    orderBy: [{ tahun: "asc" }, { nama: "asc" }],
  });
  return resp({ murid });
}
