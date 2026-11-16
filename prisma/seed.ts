// Skrip seed data dummy untuk SPK - Sekolah Rendah Islam Al Amin, Gombak
// Melaksanakan keperluan PRD Bab 11.1
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ---- Nama rekaan murid Melayu/Islam (120: 60 lelaki + 60 perempuan) ----
const namaLelaki = [
  "Muhammad Aiman", "Muhammad Danish", "Ahmad Faris", "Muhammad Haziq", "Ahmad Irfan",
  "Muhammad Junaidi", "Ahmad Khairul", "Muhammad Luqman", "Ahmad Mikail", "Muhammad Nabil",
  "Ahmad Rauf", "Muhammad Saif", "Ahmad Tariq", "Muhammad Umar", "Ahmad Wafiy",
  "Muhammad Yusuf", "Ahmad Zahir", "Muhammad Afeef", "Ahmad Burhan", "Muhammad Farhan",
  "Ahmad Ghazali", "Muhammad Hakim", "Ahmad Iqbal", "Muhammad Jamil", "Ahmad Kamal",
  "Muhammad Lutfi", "Ahmad Mansur", "Muhammad Naufal", "Ahmad Qais", "Muhammad Rizal",
  "Ahmad Suffian", "Muhammad Tarmizi", "Ahmad Vino", "Muhammad Yusri", "Ahmad Zikri",
  "Muhammad Adib", "Ahmad Fakhri", "Muhammad Ghazi", "Ahmad Hafiz", "Muhammad Idris",
  "Ahmad Jalal", "Muhammad Khalil", "Ahmad Muhaimin", "Muhammad Nashrullah", "Ahmad Ridzuan",
  "Muhammad Syafiq", "Ahmad Taufiq", "Muhammad Ukasyah", "Ahmad Wira", "Muhammad Yasin",
  "Ahmad Zuhair", "Muhammad Aqil", "Ahmad Fawwaz", "Muhammad Hafiz", "Ahmad Izuddin",
  "Muhammad Johan", "Ahmad Khairi", "Muhammad Luthfi", "Ahmad Mukhriz", "Muhammad Nuqman",
];

const namaPerempuan = [
  "Aisyah Putri", "Hannah Zara", "Maryam Sofia", "Khadijah Aina", "Fatimah Zahra",
  "Sumayyah Hana", "Zainab Laila", "Sakinah Mira", "Hafsah Nayla", "Aminah Damia",
  "Ruqayyah Arya", "Ummu Kalthum", "Siti Aishah", "Nurul Ain", "Puteri Balqis",
  "Nur Iman", "Siti Khadijah", "Aisyah Nabila", "Nurul Huda", "Puteri Sri",
  "Siti Maryam", "Nur Syafinaz", "Aisyah Humaira", "Nurul Madihah", "Puteri Naurah",
  "Siti Aminah", "Nur Hidayah", "Aisyah Farhana", "Nurul Izzah", "Puteri Kayla",
  "Siti Zaleha", "Nur Afiqah", "Aisyah Lubna", "Nurul Husna", "Puteri Soraya",
  "Siti Noraini", "Nur Balqis", "Aisyah Mastura", "Nurul Syuhada", "Puteri Aleeya",
  "Siti Wahida", "Nur Damia", "Aisyah Razan", "Nurul Najwa", "Puteri Hanis",
  "Siti Faridah", "Nur Eryna", "Aisyah Tahirah", "Nurul Sabrina", "Puteri Iris",
  "Siti Mahani", "Nur Farihah", "Aisyah Wafiyyah", "Nurul Tasneem", "Puteri Laila",
  "Siti Rohani", "Nur Hannah", "Aisyah Yusira", "Nurul Wardina", "Puteri Maleesha",
];

const kelasTahun4 = ["4 Amanah", "4 Bestari", "4 Cemerlang"];
const kelasTahun5 = ["5 Amanah", "5 Bestari", "5 Cemerlang"];
const kelasTahun6 = ["6 Amanah", "6 Bestari", "6 Cemerlang"];

// ---- 8 Unit ----
const unitDefs = [
  { nama: "Pengakap", kategori: "BERUNIFORM", hari: "SABTU", masa: "08:00-10:30", tempat: "Padang Sekolah" },
  { nama: "Kadet Polis", kategori: "BERUNIFORM", hari: "SABTU", masa: "08:00-10:30", tempat: "Dewan Utama" },
  { nama: "Puteri Islam", kategori: "BERUNIFORM", hari: "JUMAAT", masa: "14:30-16:00", tempat: "Bilik PPI" },
  { nama: "Kelab Robotik", kategori: "KELAB", hari: "RABU", masa: "14:30-16:00", tempat: "Makmal Komputer" },
  { nama: "Persatuan Bahasa Melayu", kategori: "KELAB", hari: "KHAMIS", masa: "14:30-16:00", tempat: "Bilik Bahasa" },
  { nama: "Bola Sepak", kategori: "SUKAN", hari: "SELASA", masa: "15:30-17:00", tempat: "Padang Sekolah" },
  { nama: "Catur", kategori: "SUKAN", hari: "ISNIN", masa: "14:30-16:00", tempat: "Bilik Catur" },
  { nama: "Olahraga", kategori: "SUKAN", hari: "RABU", masa: "15:30-17:00", tempat: "Padang Sekolah" },
];

// ---- Helper tarikh ----
function tarikhISO(tahun: number, bulan: number, hari: number, jam = 0, minit = 0) {
  return new Date(tahun, bulan - 1, hari, jam, minit);
}

// Generate sesi selama semester 2 (Ogos-Oktober 2026)
function generateTarikhSesi(hari: string, count: number, startBulan = 8) {
  const hariMap: Record<string, number> = { AHAD: 0, ISNIN: 1, SELASA: 2, RABU: 3, KHAMIS: 4, JUMAAT: 5, SABTU: 6 };
  const targetHari = hariMap[hari] ?? 3;
  const sesi: { tarikh: Date; tajuk: string }[] = [];
  const mulai = tarikhISO(2026, startBulan, 5); // 5 Ogos 2026 (Rabu)
  let cur = new Date(mulai);
  // lompat ke hari target pertama
  while (cur.getDay() !== targetHari) {
    cur.setDate(cur.getDate() + 1);
  }
  let n = 0;
  const tajukPel = [
    "Latihan Mingguan", "Latihan Kemahiran Asas", "Sesi Perjumpaan Unit",
    "Latihan Intensif", "Sesi Interaktif", "Latihan Praktikal",
    "Perjumpaan Bulanan", "Sesi Penyediaan Pertandingan",
    "Latihan Pasukan", "Sesi Penilaian Kendiri",
  ];
  while (n < count) {
    sesi.push({ tarikh: new Date(cur), tajuk: `${tajukPel[n % tajukPel.length]} ${n + 1}` });
    cur.setDate(cur.getDate() + 7);
    n++;
  }
  return sesi;
}

async function main() {
  console.log("🧹 Mengosongkan data lama...");
  await db.logAudit.deleteMany();
  await db.penilaian.deleteMany();
  await db.laporanAktiviti.deleteMany();
  await db.kehadiran.deleteMany();
  await db.sesi.deleteMany();
  await db.keahlian.deleteMany();
  await db.unit.deleteMany();
  await db.murid.deleteMany();
  await db.tetapan.deleteMany();
  await db.pengguna.deleteMany();

  console.log("👤 Mewujudkan 6 pengguna...");
  const guru1 = await db.pengguna.create({ data: { email: "guru1@alamin.test", nama: "Ustaz Ahmad Faizal bin Rahman", peranan: "GURU", kataLaluanDummy: "Demo@1234" } });
  const guru2 = await db.pengguna.create({ data: { email: "guru2@alamin.test", nama: "Ustazah Siti Norliza binti Hassan", peranan: "GURU", kataLaluanDummy: "Demo@1234" } });
  const guru3 = await db.pengguna.create({ data: { email: "guru3@alamin.test", nama: "Ustaz Mohd Izuan bin Khalid", peranan: "GURU", kataLaluanDummy: "Demo@1234" } });
  const pk = await db.pengguna.create({ data: { email: "pk@alamin.test", nama: "Ustaz Hj. Abdullah bin Yusof", peranan: "PK", kataLaluanDummy: "Demo@1234" } });
  const gb = await db.pengguna.create({ data: { email: "gb@alamin.test", nama: "Ustazah Hjh. Rosmah binti Othman", peranan: "GB", kataLaluanDummy: "Demo@1234" } });
  const admin = await db.pengguna.create({ data: { email: "admin@alamin.test", nama: "Encik Hafizuddin bin Roslan", peranan: "ADMIN", kataLaluanDummy: "Demo@1234" } });

  console.log("👧 Mewujudkan 120 murid Tahap 2...");
  const murids: { id: string; tahun: number; kelas: string; jantina: string }[] = [];
  let noMuridCounter = 2024001;
  for (let tahun = 4; tahun <= 6; tahun++) {
    const kelasList = tahun === 4 ? kelasTahun4 : tahun === 5 ? kelasTahun5 : kelasTahun6;
    for (let i = 0; i < 40; i++) {
      const jantina = i < 20 ? "L" : "P";
      const nama = jantina === "L" ? namaLelaki[i % namaLelaki.length] + " bin Abdullah" : namaPerempuan[i % namaPerempuan.length] + " binti Abdullah";
      const kelas = kelasList[i % kelasList.length];
      const m = await db.murid.create({
        data: {
          noMurid: `M${noMuridCounter++}`,
          nama,
          jantina,
          tahun,
          kelas,
        },
      });
      murids.push({ id: m.id, tahun, kelas, jantina });
    }
  }

  console.log("🏠 Mewujudkan 8 unit kokurikulum...");
  // Agih unit kepada 3 guru
  const unitAssignments = [
    { utama: guru1, pembantu: guru2 }, // Pengakap
    { utama: guru2, pembantu: guru3 }, // Kadet Polis
    { utama: guru2, pembantu: guru1 }, // Puteri Islam
    { utama: guru3, pembantu: guru1 }, // Kelab Robotik
    { utama: guru1, pembantu: guru3 }, // PBM
    { utama: guru3, pembantu: guru2 }, // Bola Sepak
    { utama: guru1, pembantu: guru3 }, // Catur
    { utama: guru2, pembantu: guru3 }, // Olahraga
  ];
  const units: { id: string; kategori: string; nama: string }[] = [];
  for (let i = 0; i < unitDefs.length; i++) {
    const u = await db.unit.create({
      data: {
        nama: unitDefs[i].nama,
        kategori: unitDefs[i].kategori,
        guruUtamaId: unitAssignments[i].utama.id,
        guruPembantuId: unitAssignments[i].pembantu.id,
        hari: unitDefs[i].hari,
        masa: unitDefs[i].masa,
        tempat: unitDefs[i].tempat,
      },
    });
    units.push({ id: u.id, kategori: u.kategori, nama: u.nama });
  }

  console.log("🔗 Mendaftar keahlian: setiap murid sertai 3 kategori unit...");
  // Kelompok unit mengikut kategori
  const beruniform = units.filter((u) => u.kategori === "BERUNIFORM");
  const kelab = units.filter((u) => u.kategori === "KELAB");
  const sukan = units.filter((u) => u.kategori === "SUKAN");
  const jawatanList = ["PENGERUSI", "NAIB", "SETIAUSAHA", "BENDAHARI", "AHLI"];

  for (const m of murids) {
    // Pilih unit mengikut jantina untuk Puteri Islam (perempuan) & sukan kategori
    let berunitPilihan = beruniform[Math.floor(Math.random() * beruniform.length)];
    // Pasti perempuan -> Puteri Islam lebih cenderung
    if (m.jantina === "P" && Math.random() < 0.5) {
      berunitPilihan = beruniform.find((u) => u.nama === "Puteri Islam") ?? beruniform[0];
    } else if (m.jantina === "L" && Math.random() < 0.4) {
      berunitPilihan = beruniform.find((u) => u.nama === "Pengakap") ?? beruniform[0];
    }
    const kelabPilihan = kelab[m.tahun % kelab.length];
    const sukanPilihan = sukan[(m.tahun + murids.indexOf(m)) % sukan.length];

    // keahlian - tarikhSertai permulaan semester
    for (const unit of [berunitPilihan, kelabPilihan, sukanPilihan]) {
      // Tentukan jawatan: 1 pengerusi, 1 naib, 1 setiausaha, 1 bendahari per unit, lainnya AHLI
      const existingAhliCount = await db.keahlian.count({ where: { unitId: unit.id } });
      let jawatan = "AHLI";
      if (existingAhliCount < 5) {
        jawatan = jawatanList[existingAhliCount];
      }
      await db.keahlian.create({
        data: {
          muridId: m.id,
          unitId: unit.id,
          jawatan,
          tarikhSertai: tarikhISO(2026, 2, 3),
        },
      });
    }
  }

  console.log("📅 Mewujudkan ~10 sesi setiap unit (Semester 2: Ogos-Nov 2026)...");
  const sesiAll: { id: string; unitId: string; tarikh: Date; tajuk: string }[] = [];
  for (const unit of units) {
    const udef = unitDefs.find((u) => u.nama === unit.nama)!;
    const sesiList = generateTarikhSesi(udef.hari, 10);
    const [masaMula] = udef.masa.split("-");
    for (const s of sesiList) {
      const sesiStatus = s.tarikh < new Date() ? "SELESAI" : "DIRANCANG";
      const sesi = await db.sesi.create({
        data: {
          unitId: unit.id,
          tajuk: s.tajuk,
          tarikh: s.tarikh,
          masaMula,
          masaTamat: udef.masa.split("-")[1],
          tempat: udef.tempat,
          jenis: "MINGGUAN",
          status: sesiStatus,
        },
      });
      sesiAll.push({ id: sesi.id, unitId: unit.id, tarikh: s.tarikh, tajuk: s.tajuk });
    }
  }

  console.log("✅ Menjana rekod kehadiran (80%-95%)...");
  let totalKehadiran = 0;
  for (const sesi of sesiAll) {
    const ahli = await db.keahlian.findMany({ where: { unitId: sesi.unitId, aktif: true } });
    const targetPercent = 0.8 + Math.random() * 0.15; // 80%-95%
    const nHadir = Math.round(ahli.length * targetPercent);
    const statusOptions = ["HADIR", "HADIR", "HADIR", "TIDAK_HADIR", "LEWAT", "SAKIT", "URUSAN_RASMI"];
    for (let i = 0; i < ahli.length; i++) {
      let status: string;
      if (i < nHadir) {
        status = "HADIR";
      } else {
        status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
      }
      // pastikan sesi SELESAI dikunci
      const dikunci = sesi.tarikh < new Date();
      await db.kehadiran.create({
        data: {
          sesiId: sesi.id,
          muridId: ahli[i].muridId,
          status,
          dikunci,
        },
      });
      totalKehadiran++;
    }
  }
  console.log(`   ${totalKehadiran} rekod kehadiran dijana.`);

  console.log("📝 Mewujudkan 12 laporan aktiviti dalam pelbagai status...");
  const statusLaporan = ["DILULUSKAN", "DILULUSKAN", "DILULUSKAN", "DIHANTAR", "DIHANTAR", "DIHANTAR", "DIKEMBALIKAN", "DRAF", "DRAF", "DILULUSKAN", "DIHANTAR", "DILULUSKAN"];
  // pilih 12 sesi SELESAI untuk dijadikan laporan
  const sesiSelesai = sesiAll.filter((s) => s.tarikh < new Date()).slice(0, 12);
  for (let i = 0; i < sesiSelesai.length; i++) {
    const s = sesiSelesai[i];
    const unit = units.find((u) => u.id === s.unitId)!;
    const unitDef = unitDefs.find((u) => u.nama === unit.nama)!;
    const utama = unitAssignments.find((a) => true)!; // fallback
    // cari guru utama unit
    const unitDB = await db.unit.findUnique({ where: { id: s.unitId } });
    const status = statusLaporan[i];
    await db.laporanAktiviti.create({
      data: {
        sesiId: s.id,
        objektif: `Membentuk disiplin, kerjasama dan kemahiran asas dalam ${unitDef.nama}.`,
        ringkasan: `Sesi bermula pada ${unitDef.masa} di ${unitDef.tempat}. Aktiviti utama melibatkan ${unitDef.nama.toLowerCase()} meliputi latihan fizikal, tunjuk ajar dan latih tubi. Murid menunjukkan respons positif dan penglibatan aktif sepanjang sesi.`,
        hasil: `Seramai 25-30 murid hadir. Kemajuan ketara dalam kemahiran asas. 3 murid menunjukkan potensi untuk pertandingan peringkat daerah.`,
        masalah: `Bekalan peralatan terhad; sesetengah murid tidak memakai uniform lengkap.`,
        cadangan: `Mohon tambah peruntukan peralatan dan tegakkan disiplin pemakaian uniform.`,
        gambar: JSON.stringify(["/uploads/sesi-1.jpg", "/uploads/sesi-2.jpg"]),
        status,
        komenSemakan: status === "DIKEMBALIKAN" ? "Sila tambah butiran pencapaian murid dan lampirkan lebih gambar sokongan." : status === "DILULUSKAN" ? "Laporan lengkap dan tepat. Diterima." : null,
        diciptaOlehId: unitDB?.guruUtamaId ?? guru1.id,
        tarikhHantar: status !== "DRAF" ? new Date(s.tarikh.getTime() + 86400000) : null,
        tarikhLulus: status === "DILULUSKAN" ? new Date(s.tarikh.getTime() + 2 * 86400000) : null,
      },
    });
  }

  console.log("🏅 Mewujudkan 30 rekod penilaian murid...");
  const tahapOptions = ["CEMERLANG", "BAIK", "MEMUASKAN", "PERLU_PERHATIAN"];
  const semuaKeahlian = await db.keahlian.findMany({ where: { aktif: true } });
  // Pilih 30 keahlian unik (murid+unit) secara rawak
  const shuffled = [...semuaKeahlian].sort(() => Math.random() - 0.5).slice(0, Math.min(30, semuaKeahlian.length));
  let idxPenilaian = 0;
  for (const ahli of shuffled) {
    const tahap = tahapOptions[idxPenilaian % tahapOptions.length];
    await db.penilaian.create({
      data: {
        muridId: ahli.muridId,
        unitId: ahli.unitId,
        semester: 2,
        tahun: 2026,
        tahap,
        jawatan: ahli.jawatan,
        catatan: tahap === "CEMERLANG" ? "Penglibatan sangat aktif dan menunjukkan kepimpinan." : tahap === "PERLU_PERHATIAN" ? "Perlu galakan untuk lebih aktif menyertai aktiviti." : "Penglibatan baik dan konsisten.",
        status: idxPenilaian % 3 === 0 ? "DILULUSKAN" : idxPenilaian % 3 === 1 ? "DIHANTAR" : "DRAF",
        diciptaOlehId: guru1.id,
      },
    });
    idxPenilaian++;
  }

  console.log("⚙️ Mewujudkan tetapan sistem...");
  await db.tetapan.create({
    data: {
      tahunAkademik: 2026,
      semester: 2,
      tarikhMula: tarikhISO(2026, 6, 15),
      tarikhTamat: tarikhISO(2026, 11, 15),
    },
  });

  console.log("📜 Mewujudkan beberapa log audit...");
  await db.logAudit.create({ data: { penggunaId: admin.id, tindakan: "SISTEM_DIMULAKAN", entiti: "SISTEM", butiran: "Pangkalan data dummy dimulakan." } });
  await db.logAudit.create({ data: { penggunaId: pk.id, tindakan: "LULUS_LAPORAN", entiti: "LAPORAN_AKTIVITI", butiran: "Laporan aktiviti diluluskan." } });
  await db.logAudit.create({ data: { penggunaId: guru1.id, tindakan: "HANTAR_KEHADIRAN", entiti: "KEHADIRAN", butiran: "Kehadiran sesi dihantar dan dikunci." } });

  console.log("\n✅ SEED SELESAI!");
  console.log("   - 6 pengguna (3 guru, 1 PK, 1 GB, 1 admin)");
  console.log("   - 120 murid Tahap 2 (40 setiap tahun)");
  console.log("   - 8 unit (3 beruniform, 2 kelab, 3 sukan)");
  console.log("   - ~80 sesi dengan kehadiran 80-95%");
  console.log("   - 12 laporan aktiviti (pelbagai status)");
  console.log("   - 30 rekod penilaian");
  console.log("\n   Akaun demo: guru1@alamin.test / pk@alamin.test / gb@alamin.test / admin@alamin.test");
  console.log("   Kata laluan: Demo@1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
