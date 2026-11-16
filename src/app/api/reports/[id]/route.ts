import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dapatPenggunaSesi, resp, respRalat, unitGuru, logAudit } from "@/lib/auth";

// GET /api/reports/[id] - butiran laporan
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  const { id } = await params;
  const laporan = await db.laporanAktiviti.findUnique({
    where: { id },
    include: {
      sesi: { include: { unit: true } },
      diciptaOleh: { select: { nama: true, email: true } },
    },
  });
  if (!laporan) return respRalat("Laporan tidak dijumpai.", 404);
  // Guru akses terhad
  if (sesi.peranan === "GURU") {
    const unitIds = (await unitGuru(sesi.penggunaId)).map((u) => u.id);
    if (!unitIds.includes(laporan.sesi.unitId) && laporan.diciptaOlehId !== sesi.penggunaId) {
      return respRalat("Tiada akses.", 403);
    }
  }
  // Tambahkan ringkasan kehadiran
  const kehadiran = await db.kehadiran.findMany({ where: { sesiId: laporan.sesiId } });
  const hadir = kehadiran.filter((k) => k.status === "HADIR" || k.status === "LEWAT").length;
  const total = kehadiran.length;
  const peratus = total > 0 ? Math.round((hadir / total) * 100) : 0;
  const gambar = laporan.gambar ? JSON.parse(laporan.gambar) : [];
  return resp({ laporan: { ...laporan, gambar, statKehadiran: { hadir, total, peratus } } });
}
