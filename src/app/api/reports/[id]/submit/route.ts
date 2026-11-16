import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dapatPenggunaSesi, resp, respRalat, logAudit } from "@/lib/auth";

// POST /api/reports/[id]/submit - hantar laporan (status: DIHANTAR) (FR-26)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  const { id } = await params;
  const laporan = await db.laporanAktiviti.findUnique({ where: { id } });
  if (!laporan) return respRalat("Laporan tidak dijumpai.", 404);
  if (laporan.status !== "DRAF" && laporan.status !== "DIKEMBALIKAN") {
    return respRalat("Hanya laporan Draf/Dikembalikan boleh dihantar.", 400);
  }
  const updated = await db.laporanAktiviti.update({ where: { id }, data: { status: "DIHANTAR", tarikhHantar: new Date() } });
  await logAudit(sesi.penggunaId, "HANTAR_LAPORAN", "LAPORAN_AKTIVITI", id, "Laporan dihantar untuk semakan.");
  return resp({ laporan: updated });
}
