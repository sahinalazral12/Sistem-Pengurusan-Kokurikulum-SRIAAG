import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dapatPenggunaSesi, resp, respRalat, unitGuru } from "@/lib/auth";

// GET /api/dashboard/summary - statistik papan pemuka (FR-35/FR-36)
export async function GET(req: NextRequest) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  const url = new URL(req.url);
  const semester = parseInt(url.searchParams.get("semester") ?? "2");

  // Tetapan semasa
  const tetapan = await db.tetapan.findFirst();
  const tahunAkademik = tetapan?.tahunAkademik ?? 2026;
  const semesterAktif = tetapan?.semester ?? semester;

  const sekarang = new Date();
  const hariIniMula = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate());
  const hariIniTamat = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate(), 23, 59, 59);

  if (sesi.peranan === "GURU") {
    // ---- Papan Pemuka Guru (FR-35) ----
    const units = await unitGuru(sesi.penggunaId);
    const unitIds = units.map((u) => u.id);

    // Sesi hari ini
    const sesiHariIni = await db.sesi.findMany({
      where: { unitId: { in: unitIds }, tarikh: { gte: hariIniMula, lte: hariIniTamat } },
      include: { unit: true, _count: { select: { kehadiran: true } } },
    });

    // Laporan tertunggak: sesi SELESAI tanpa laporan / laporan DRAF/DIKEMBALIKAN
    const sesiSelesai = await db.sesi.findMany({
      where: { unitId: { in: unitIds }, status: "SELESAI" },
      include: { laporan: true, unit: true },
    });
    const laporanTertunggak = sesiSelesai
      .filter((s) => !s.laporan || s.laporan.status === "DRAF" || s.laporan.status === "DIKEMBALIKAN")
      .map((s) => ({
        sesiId: s.id, tajuk: s.tajuk, tarikh: s.tarikh,
        unitNama: s.unit.nama,
        status: s.laporan ? s.laporan.status : "BELUM_WUJUD",
      }));

    // Murid berisiko: kehadiran < 80%
    const muridBerisiko = [];
    for (const uid of unitIds) {
      const ahli = await db.keahlian.findMany({ where: { unitId: uid, aktif: true }, include: { murid: true } });
      for (const a of ahli) {
        const kehadiran = await db.kehadiran.findMany({ where: { muridId: a.muridId, sesi: { unitId: uid } } });
        const hadir = kehadiran.filter((k) => k.status === "HADIR" || k.status === "LEWAT").length;
        const total = kehadiran.length;
        const peratus = total > 0 ? Math.round((hadir / total) * 100) : 100;
        if (peratus < 80 && total > 0) {
          muridBerisiko.push({ muridId: a.muridId, nama: a.murid.nama, kelas: a.murid.kelas, tahun: a.murid.tahun, peratus, unitId: uid });
        }
      }
    }

    // Trend kehadiran bulanan guru (FR-37)
    const sesiAll = await db.sesi.findMany({
      where: { unitId: { in: unitIds }, status: "SELESAI" },
      select: { tarikh: true, id: true },
    });
    const trendBulanan: { bulan: string; peratus: number }[] = [];
    const byBulan: Record<string, { hadir: number; total: number }> = {};
    for (const s of sesiAll) {
      const key = `${s.tarikh.getFullYear()}-${String(s.tarikh.getMonth() + 1).padStart(2, "0")}`;
      const kh = await db.kehadiran.findMany({ where: { sesiId: s.id } });
      const hadir = kh.filter((k) => k.status === "HADIR" || k.status === "LEWAT").length;
      byBulan[key] = byBulan[key] || { hadir: 0, total: 0 };
      byBulan[key].hadir += hadir;
      byBulan[key].total += kh.length;
    }
    for (const [bulan, v] of Object.entries(byBulan)) {
      trendBulanan.push({ bulan, peratus: v.total > 0 ? Math.round((v.hadir / v.total) * 100) : 0 });
    }
    trendBulanan.sort((a, b) => a.bulan.localeCompare(b.bulan));

    // Stat ringkasan
    const jumlahUnit = units.length;
    const jumlahAhli = await db.keahlian.count({ where: { unitId: { in: unitIds }, aktif: true } });
    const laporanSayaTertunggak = laporanTertunggak.length;
    const laporanSayaDiluluskan = await db.laporanAktiviti.count({ where: { diciptaOlehId: sesi.penggunaId, status: "DILULUSKAN" } });

    return resp({
      peranan: "GURU",
      tetapan: { tahunAkademik, semester: semesterAktif },
      stat: { jumlahUnit, jumlahAhli, laporanSayaTertunggak, laporanSayaDiluluskan, sesiHariIni: sesiHariIni.length },
      sesiHariIni,
      laporanTertunggak,
      muridBerisiko,
      trendBulanan,
      units,
    });
  }

  // ---- Papan Pemuka PK / GB (FR-36) ----
  const semuaUnit = await db.unit.findMany({ where: { aktif: true }, include: { guruUtama: { select: { nama: true } } } });
  const semuaUnitIds = semuaUnit.map((u) => u.id);

  // Statistik penyertaan
  const jumlahMurid = await db.murid.count({ where: { aktif: true } });
  const jumlahUnit = semuaUnit.length;
  const totalKeahlian = await db.keahlian.count({ where: { aktif: true } });

  // Purata kehadiran mengikut unit
  const kehadiranUnit = [];
  for (const u of semuaUnit) {
    const sesi = await db.sesi.findMany({ where: { unitId: u.id, status: "SELESAI" }, select: { id: true } });
    const sesiIds = sesi.map((s) => s.id);
    const totalKh = await db.kehadiran.count({ where: { sesiId: { in: sesiIds } } });
    const hadirKh = await db.kehadiran.count({ where: { sesiId: { in: sesiIds }, status: { in: ["HADIR", "LEWAT"] } } });
    const peratus = totalKh > 0 ? Math.round((hadirKh / totalKh) * 100) : 0;
    kehadiranUnit.push({ unitId: u.id, nama: u.nama, kategori: u.kategori, guruUtama: u.guruUtama?.nama ?? "-", peratus, sesiCount: sesi.length });
  }

  // Status laporan mengikut unit
  const laporanUnit = [];
  for (const u of semuaUnit) {
    const sesiIds = (await db.sesi.findMany({ where: { unitId: u.id }, select: { id: true } })).map((s) => s.id);
    const total = await db.laporanAktiviti.count({ where: { sesiId: { in: sesiIds } } });
    const diluluskan = await db.laporanAktiviti.count({ where: { sesiId: { in: sesiIds }, status: "DILULUSKAN" } });
    const dihantar = await db.laporanAktiviti.count({ where: { sesiId: { in: sesiIds }, status: "DIHANTAR" } });
    const dikembalikan = await db.laporanAktiviti.count({ where: { sesiId: { in: sesiIds }, status: "DIKEMBALIKAN" } });
    const draf = await db.laporanAktiviti.count({ where: { sesiId: { in: sesiIds }, status: "DRAF" } });
    const belum = sesiIds.length - total;
    laporanUnit.push({ unitId: u.id, nama: u.nama, total: sesiIds.length, diluluskan, dihantar, dikembalikan, draf, belum });
  }

  // Trend kehadiran bulanan keseluruhan (FR-37)
  const sesiAll = await db.sesi.findMany({ where: { status: "SELESAI" }, select: { id: true, tarikh: true } });
  const byBulan: Record<string, { hadir: number; total: number }> = {};
  for (const s of sesiAll) {
    const key = `${s.tarikh.getFullYear()}-${String(s.tarikh.getMonth() + 1).padStart(2, "0")}`;
    const kh = await db.kehadiran.findMany({ where: { sesiId: s.id } });
    const hadir = kh.filter((k) => k.status === "HADIR" || k.status === "LEWAT").length;
    byBulan[key] = byBulan[key] || { hadir: 0, total: 0 };
    byBulan[key].hadir += hadir;
    byBulan[key].total += kh.length;
  }
  const trendBulanan = Object.entries(byBulan).map(([bulan, v]) => ({ bulan, peratus: v.total > 0 ? Math.round((v.hadir / v.total) * 100) : 0 })).sort((a, b) => a.bulan.localeCompare(b.bulan));

  // Sesi hari ini (semua)
  const sesiHariIni = await db.sesi.findMany({
    where: { tarikh: { gte: hariIniMula, lte: hariIniTamat } },
    include: { unit: true, _count: { select: { kehadiran: true } } },
  });

  // Murid berisiko (semua unit)
  const muridBerisiko: { nama: string; kelas: string; peratus: number; unitNama: string }[] = [];
  for (const u of semuaUnit) {
    const ahli = await db.keahlian.findMany({ where: { unitId: u.id, aktif: true }, include: { murid: true } });
    for (const a of ahli) {
      const kh = await db.kehadiran.findMany({ where: { muridId: a.muridId, sesi: { unitId: u.id } } });
      const hadir = kh.filter((k) => k.status === "HADIR" || k.status === "LEWAT").length;
      const total = kh.length;
      if (total > 0) {
        const peratus = Math.round((hadir / total) * 100);
        if (peratus < 80) muridBerisiko.push({ nama: a.murid.nama, kelas: a.murid.kelas, peratus, unitNama: u.nama });
      }
    }
  }

  // Laporan tertunggak PK (DIHANTAR perlu semakan)
  const laporanPerluSemakan = await db.laporanAktiviti.count({ where: { status: "DIHANTAR" } });

  return resp({
    peranan: sesi.peranan,
    tetapan: { tahunAkademik, semester: semesterAktif },
    stat: {
      jumlahMurid, jumlahUnit, totalKeahlian,
      laporanPerluSemakan,
      sesiHariIni: sesiHariIni.length,
      muridBerisiko: muridBerisiko.length,
    },
    sesiHariIni,
    kehadiranUnit,
    laporanUnit,
    trendBulanan,
    muridBerisiko: muridBerisiko.slice(0, 20),
    units: semuaUnit,
  });
}
