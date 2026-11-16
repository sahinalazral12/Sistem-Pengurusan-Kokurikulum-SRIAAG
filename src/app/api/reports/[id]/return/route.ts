import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dapatPenggunaSesi, resp, respRalat, logAudit } from "@/lib/auth";

// POST /api/reports/[id]/return - kembalikan laporan (PK sahaja) (FR-27)
// body: { komen }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  if (sesi.peranan !== "PK" && sesi.peranan !== "ADMIN") {
    return respRalat("Hanya PK Kokurikulum boleh mengembalikan laporan.", 403);
  }
  const { id } = await params;
  const body = await req.json();
  if (!body.komen) return respRalat("Komen pengembalian diperlukan.", 400);
  const laporan = await db.laporanAktiviti.findUnique({ where: { id } });
  if (!laporan) return respRalat("Laporan tidak dijumpai.", 404);
  if (laporan.status !== "DIHANTAR") {
    return respRalat("Hanya laporan berstatus Dihantar boleh dikembalikan.", 400);
  }
  const updated = await db.laporanAktiviti.update({
    where: { id },
    data: { status: "DIKEMBALIKAN", komenSemakan: body.komen },
  });
  await logAudit(sesi.penggunaId, "KEMBALI_LAPORAN", "LAPORAN_AKTIVITI", id, `Dikembalikan: ${body.komen}`);
  return resp({ laporan: updated });
}
