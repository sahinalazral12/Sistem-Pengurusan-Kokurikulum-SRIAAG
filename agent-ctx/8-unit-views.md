# Task 8 - unit-senarai.tsx & unit-butiran.tsx

## Ringkasan
Dua fail paparan SPK dibina untuk pengurusan unit kokurikulum.

## Fail ditulis
1. `/home/z/my-project/src/components/spk/views/unit-senarai.tsx`
   - Header dengan tajuk "Unit Kokurikulum" + keterangan Tahap 2 (Tahun 4-6)
   - Filter kategori (button group): Semua / Badan Beruniform / Kelab/Persatuan / Sukan/Permainan
   - Input carian dengan debounce 300ms (qDebounce) -> query ["units", kategori, qDebounce]
   - Butang "Tambah Unit" (Dialog) hanya dipaparkan untuk PK/ADMIN (peranan daripada useAppStore)
   - Grid card responsif (1/2/3/4 lajur) - Bento style
   - Setiap card: nama, BadgeKategori, guru utama/pembantu, hari/masa/tempat, jumlah ahli, butang "Lihat Butiran" -> navigasi("unit-butiran", { unitId })
   - Empty state yang berbeza untuk PK/ADMIN vs GURU
   - Loading state dengan Loader2
   - useQuery ["pengguna"] enabled: peranan === PK || ADMIN; senaraiGuru ditapis (GURU/PK, aktif)
   - useMutation POST /api/units dengan invalidate ["units"]; toast sonner untuk kejayaan/ralat
   - DialogTambahUnit: Nama (Input wajib), Kategori (Select wajib), Guru Utama & Pembantu (Select), Hari (Select ISNIN..SABTU), Masa (Input cth "14:30-16:00"), Tempat (Input)

2. `/home/z/my-project/src/components/spk/views/unit-butiran.tsx`
   - Header: nama unit + BadgeKategori + status aktif + info guru utama/pembantu + hari/masa/tempat + jumlah ahli
   - Butong "Kembali" -> navigasi("unit-senarai")
   - Tabs: Ahli | Sesi | Laporan | Statistik
   - Tab Ahli (FR-07/08/08A):
     * Table: No Murid, Nama, Tahun, Kelas, Jawatan (badge), butang "Keluarkan" (PK/ADMIN/GURU)
     * Dialog Tambah Ahli: carian murid debounce 350ms auto-call /api/murid?q=...
     * Senarai keputusan dropdown (ScrollArea), pilih murid, set jawatan via Select
     * FR-08A: mesej ralat dari backend (tahun 1-3) dipaparkan via toast (onError mutation)
     * Mutasi POST members dan DELETE members dengan invalidate ["unit", unitId]
   - Tab Sesi:
     * Senarai sesi unit (dari unit.sesi): tajuk, tarikh, masa, BadgeSesi, jumlah kehadiran (_count)
     * Butang "Ambil Kehadiran" -> navigasi("kehadiran", { sesiId })
     * Butang "Cipta Sesi" -> navigasi("sesi-senarai") untuk PK/GURU/ADMIN
   - Tab Laporan:
     * useQuery ["laporan", unitId] -> /api/reports?unitId=...
     * Table: Sesi, Tarikh, Dicipta Oleh, BadgeLaporan, Kemaskini, butang "Lihat/Borang" -> navigasi("laporan-borang", { laporanId })
   - Tab Statistik:
     * Card metrics: Purata kehadiran, Jumlah Ahli, Jumlah Sesi
     * Carta Bar Recharts: kehadiran per sesi (12 terkini) dengan Cell warna (emerald/teal/amber)
     * Senarai murid dengan Progress peratus kehadiran, highlight <80% (rose + label)

## Penggunaan komponen tersedia
- useAppStore: unitIdAktif, navigasi, pengguna.peranan
- @/lib/format: apiFetch, formatTarikh, labelJawatan, labelKategoriUnit
- @/components/spk/badges: BadgeKategori, BadgeSesi, BadgeLaporan
- shadcn/ui: Card, Button, Input, Label, Select, Tabs, Table, Dialog, Badge, Progress, ScrollArea
- sonner: toast
- recharts: BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell

## Pematuhan
- Tiada indigo/blue (tema emerald/teal/amber/rose)
- Responsive (mobile-first, grid breakpoints, sticky table header)
- Loading & empty states di setiap tab
- "use client"
- Tiada test code
- TanStack Query: useQuery + useMutation + invalidate
- Semua teks UI dalam Bahasa Malaysia

## Verifikasi
- `bun run lint` - tiada ralat dalam kedua-dua fail (ralat yang ada dalam laporan-borang.tsx adalah luar skop tugas ini)
- Dev log: module-not-found untuk views lain (penilaian/eksport/admin-*) - luar skop, akan diselesaikan oleh ejen lain
