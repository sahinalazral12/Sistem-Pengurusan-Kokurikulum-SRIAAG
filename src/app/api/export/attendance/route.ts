import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dapatPenggunaSesi, resp, respRalat } from "@/lib/auth";

// GET /api/export/attendance?unitId=&dari=&hingga=
// Eksport CSV kehadiran (FR-38)
export async function GET(req: NextRequest) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  if (sesi.peranan !== "PK" && sesi.peranan !== "GB" && sesi.peranan !== "ADMIN" && sesi.peranan !== "GURU") {
    return respRalat("Anda tiada kebenaran untuk eksport.", 403);
  }
  const url = new URL(req.url);
  const unitId = url.searchParams.get("unitId") ?? undefined;
  const dari = url.searchParams.get("dari");
  const hingga = url.searchParams.get("hingga");

  if (!unitId) return respRalat("unitId diperlukan.", 400);

  const unit = await db.unit.findUnique({ where: { id: unitId } });
  if (!unit) return respRalat("Unit tidak dijumpai.", 404);

  const where: any = { unitId };
  if (dari || hingga) {
    where.tarikh = {};
    if (dari) where.tarikh.gte = new Date(dari);
    if (hingga) where.tarikh.lte = new Date(hingga);
  }
  const sesiList = await db.sesi.findMany({
    where,
    include: { kehadiran: { include: { murid: true } } },
    orderBy: { tarikh: "asc" },
  });

  // Bina CSV
  const header = ["No Murid", "Nama", "Tahun", "Kelas"];
  const tarikhHeader = sesiList.map((s) => `${s.tajuk} (${formatTarikh(s.tarikh)})`);
  header.push(...tarikhHeader, "Peratus Kehadiran");

  const muridMap: Record<string, { noMurid: string; nama: string; tahun: number; kelas: string; perSesi: Record<string, string>; hadir: number; total: number }> = {};
  for (const s of sesiList) {
    for (const k of s.kehadiran) {
      if (!muridMap[k.muridId]) {
        muridMap[k.muridId] = {
          noMurid: k.murid.noMurid, nama: k.murid.nama, tahun: k.murid.tahun, kelas: k.murid.kelas,
          perSesi: {}, hadir: 0, total: 0,
        };
      }
      muridMap[k.muridId].perSesi[s.id] = k.status;
      muridMap[k.muridId].total++;
      if (k.status === "HADIR" || k.status === "LEWAT") muridMap[k.muridId].hadir++;
    }
  }

  const rows = [header.join(",")];
  for (const m of Object.values(muridMap)) {
    const row = [m.noMurid, `"${m.nama}"`, m.tahun, `"${m.kelas}"`];
    for (const s of sesiList) row.push(m.perSesi[s.id] || "-");
    row.push(m.total > 0 ? `${Math.round((m.hadir / m.total) * 100)}%` : "0%");
    rows.push(row.join(","));
  }

  const csv = rows.join("\n");
  const namaFail = `kehadiran_${unit.nama.replace(/\s+/g, "_")}_${formatTarikhFile(new Date())}.csv`;
  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${namaFail}"`,
    },
  });
}

function formatTarikh(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function formatTarikhFile(d: Date) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
