# Tugasan 7 - Papan Pemuka (papan-pemuka.tsx)

## Agen
Z.ai Code (fullstack dev)

## Fail diwujudkan
`/home/z/my-project/src/components/spk/views/papan-pemuka.tsx`

## Ringkasan
Membina paparan Papan Pemuka SPK (FR-35 untuk Guru, FR-36 untuk PK/GB) dengan:

### Struktur
- `"use client"` dengan TanStack Query `useQuery(["dashboard","summary"], ...)` menggunakan `apiFetch`.
- Reka bentuk **Bento Grid** menggunakan kelas `.bento-grid` + `col-span-4` / `md:col-span-X` dari `globals.css`.
- Responsif: mobile satu kolum (auto-fill minmax 220px), desktop grid 12 kolum.
- Tema emerald/gold sekolah Islam (tiada indigo/biru sebagai warna utama).
- Komponen eksport: `PapanPemuka` (default + named).

### Papan Pemuka Guru (FR-35)
1. Header tahun akademik + semester (badge emerald + emas).
2. Kad Ringkasan (md:col-span-4) - jumlahUnit, jumlahAhli, sesiHariIni, laporanDiluluskan + amaran tertunggak.
3. Kad Sesi Hari Ini (md:col-span-8) - senarai sesi dengan butang "Ambil Kehadiran" -> `navigasi("kehadiran", { sesiId })`.
4. Kad Laporan Tertunggak (md:col-span-6) - senarai dengan butang "Cipta Laporan" -> `navigasi("laporan-borang", { laporanId: sesiId })`, serta pautan "Lihat Semua" -> `laporan-senarai`.
5. Kad Murid Berisiko <80% (md:col-span-6) - dengan Progress bar dan warna risiko.
6. Kad Trend Kehadiran Bulanan (md:col-span-12) - BarChart Recharts dengan Cell warna (emerald >=80, emas >=50, merah <50).

### Papan Pemuka PK/GB (FR-36)
1. 4 kad stat (md:col-span-3 setiap satu): Jumlah Murid, Jumlah Unit, Laporan Perlu Semakan, Murid Berisiko.
2. Kad Trend Keseluruhan (md:col-span-8) - LineChart Recharts.
3. Kad Sesi Hari Ini (md:col-span-4).
4. Kad Status Laporan mengikut Unit (md:col-span-12) - Table shadcn dengan 7 kolum. Baris dengan DIHANTAR > 0 ditonjolkan dengan latar amber + label "Perlu Semakan".
5. Kad Purata Kehadiran mengikut Unit (md:col-span-6) - senarai dengan Progress bar.
6. Kad Murid Berisiko (md:col-span-6) - senarai top 12.
7. **GB baca sahaja**: banner amaran amber di bawah + tiada butang aksi (semua pautan unit-butiran dibiarkan tetapi tiada butang kelulusan/edit).

### Ciri lain
- Loading state: Skeleton grid yang menyerupai susunan bento.
- Error state: ikon AlertTriangle + butang "Muat Semula".
- Empty state setiap senarai: ikon + mesej mesra BM.
- Format tarikh/masa/bulan menggunakan `formatTarikh`, `formatMasa`, helper tempatan `labelBulanPendek`.
- Penggunaan `BadgeSesi`, `BadgeLaporan`, `BadgeKategori` dari `@/components/spk/badges`.
- Penggunaan Card, Button, Progress, Table, Skeleton dari `@/components/ui/*`.
- Custom scrollbar `.scroll-area-custom` pada senarai panjang dengan `max-h-80/96 overflow-y-auto`.

### Verifikasi
- `bun run lint`: tiada ralat.
- `dev.log`: tiada ralat berkaitan papan-pemuka.tsx (ralat lain berkaitan fail paparan lain yang belum diwujudkan oleh ejen lain).
