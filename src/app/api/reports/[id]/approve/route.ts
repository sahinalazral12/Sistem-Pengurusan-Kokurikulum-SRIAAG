import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dapatPenggunaSesi, resp, respRalat, logAudit } from "@/lib/auth";

// POST /api/reports/[id]/approve - lulus laporan (PK sahaja) (FR-27)
// body: { komen }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  if (sesi.peranan !== "PK" && sesi.peranan !== "ADMIN") {
    return respRalat("Hanya PK Kokurikulum boleh meluluskan laporan.", 403);
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const laporan = await db.laporanAktiviti.findUnique({ where: { id } });
  if (!laporan) return respRalat("Laporan tidak dijumpai.", 404);
  if (laporan.status !== "DIHANTAR") {
    return respRalat("Hanya laporan berstatus Dihantar boleh diluluskan.", 400);
  }
  const updated = await db.laporanAktiviti.update({
    where: { id },
    data: { status: "DILULUSKAN", tarikhLulus: new Date(), komenSemakan: body.komen ?? "Diluluskan." },
  });
  await logAudit(sesi.penggunaId, "LULUS_LAPORAN", "LAPORAN_AKTIVITI", id, "Laporan diluluskan.");
  return resp({ laporan: updated });
}
