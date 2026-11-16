# Task 9 & 10 - Sesi Senarai & Kehadiran Views

**Agent**: GLM Code (frontend dev)
**Tarikh**: 2026
**Status**: Selesai

## Fail yang ditulis

1. **`/home/z/my-project/src/components/spk/views/sesi-senarai.tsx`** (~650 baris)
2. **`/home/z/my-project/src/components/spk/views/kehadiran.tsx`** (~520 baris)

## Fail 1: sesi-senarai.tsx (FR-11/12/13/14)

Paparan senarai & pengurusan sesi aktiviti:

- Header "Sesi Aktiviti" dengan keterangan.
- Bar penapis: unit (Select), status (Select: Semua/DIRANCANG/SELESAI/DIBATALKAN/DITANGGUH), carian klien-side (tajuk/tempat/unit).
- Tombol **Cipta Sesi** (Dialog) untuk GURU/PK/ADMIN. Borang: unit, tajuk, tarikh (date), masa mula/tamat (time), tempat, jenis (MINGGUAN/KHAS), `repeatCount` (1-12, sokongan sesi berulang mingguan FR-12). POST `/api/sessions`.
- Toggle paparan **Senarai** | **Kalendar Bulanan**:
  - **Senarai**: table desktop + kad mobile. Kolum: tajuk, unit (nama + BadgeKategori), tarikh+masa (formatTarikh + formatMasa), tempat, jenis (Badge), BadgeSesi status, jumlah kehadiran (`_count.kehadiran`).
  - **Kalendar**: grid bulanan manual 7 kolom (Ahd-Sab, 42 sel), nav bulan sebelum/selepas/"Hari Ini", setiap sel menunjukkan tarikh + chip kecil sesi berwarna mengikut status (hijau=Selesai, ambar=Dirancang/Tangguh, merah=Dibatalkan). Senarai sesi penuh bulan di bawah untuk tindakan lanjut.
- Menu tindakan setiap sesi (DropdownMenu):
  - **Ambil Kehadiran** -> `navigasi("kehadiran", { sesiId })`.
  - **Cipta Laporan** -> `navigasi("laporan-borang", { sesiId })` jika status SELESAI.
  - **Tangguh** (Dialog dengan sebab wajib) -> PATCH `{ status: "DITANGGUH", sebabBatal }`.
  - **Batal Sesi** (Dialog dengan sebab wajib) -> PATCH `{ status: "DIBATALKAN", sebabBatal }`.
- TanStack Query: `useQuery(["sessions", unitId, status])`, `useMutation` PATCH.
- Loading/empty states (skeleton, EmptySesi), toast sonner.

## Fail 2: kehadiran.tsx (FR-15/16/17/18/19/20/21)

Skrin Ambil Kehadiran mesra sentuh mobile-first:

- **Pemisahan komponen**: `KehadiranView` (gating sesiIdAktif) + `KehadiranContent` (semua hook dipanggil tanpa syarat untuk patuh Rules of Hooks).
- Header: tajuk sesi, nama unit, tarikh (formatTarikh), masa mula-tamat, tempat, BadgeSesi + BadgeKategori.
- Tombol Kembali -> `navigasi("sesi-senarai")`.
- **Banner dikunci** (amaran ambar): jika sesi telah DIKUNCI, papar "Kehadiran telah dikunci. Hanya PK Kokurikulum boleh membuka kunci." + tombol **Buka Kunci** (untuk PK/ADMIN sahaja) -> PATCH `/api/sessions/[id]/attendance?action=unlock`.
- **Ringkasan Bento** (5 kad): Jumlah Murid, Hadir, Lewat, Tidak Hadir, Peratus (dengan Badge "Rendah" jika <80%).
- Bar Progress peratus (ambar jika rendah).
- Tombol besar **Tanda Semua Hadir** (FR-17).
- **Senarai murid**: kad per murid dengan no giliran, nama, noMurid/tahun/kelas, Badge status semasa, dan grid 5 butang status besar (min 44px): HADIR (emerald), TIDAK_HADIR (red), LEWAT (amber), SAKIT (sky/biru), URUSAN_RASMI (violet) - ikon Lucide + label BM. Butang aktif ditonjolkan dengan `ring-2`. Medan catatan pilihan (Textarea, toggle tunjuk/sembunyi) - FR-18.
- Auto-kira peratus & ringkasan selepas setiap perubahan state tempatan.
- **Bar Simpan/Hantar sticky**:
  - Mobile: `fixed bottom-0` dengan tombol **Simpan Draf** + **Hantar & Kunci**.
  - Desktop: bar inline di bawah.
  - **AlertDialog pengesahan** sebelum hantar: "Anda akan mengunci kehadiran. Tidak boleh diubah selepas ini melainkan dibuka kunci oleh PK."
  - Simpan Draf -> PUT `{ dikunci: false, kehadiran: [...] }`.
  - Hantar & Kunci -> PUT `{ dikunci: true, kehadiran: [...] }` -> toast "Kehadiran dihantar dan dikunci."
  - Penunjuk "Terdapat perubahan belum disimpan" jika state tempatan != data asal.
- Loading/empty/error states.

## Integrasi

- Store: `useAppStore` untuk `sesiIdAktif`, `navigasi`, `pengguna`.
- Format: `formatTarikh`, `formatMasa`, `labelStatusKehadiran`, `senaraiStatusKehadiran`, `labelStatusSesi`, `labelKategoriUnit` dari `@/lib/format`.
- Komponen sedia ada: Card, Button, Input, Textarea, Label, Badge, Progress, Separator, ScrollArea, Skeleton, Select, Dialog, AlertDialog, DropdownMenu + `BadgeSesi`/`BadgeKategori` dari `@/components/spk/badges`.
- API sedia ada digunakan: `/api/sessions`, `/api/sessions/[id]`, `/api/sessions/[id]/attendance`, `/api/units`.

## Pematuhan

- "use client" pada kedua-dua fail.
- Tiada indigo/blue tema utama (warna sky hanya untuk butang SAKIT seperti diizinkan).
- Mobile-first, butang min 44px.
- Bar simpan/hantar sticky bottom pada mobile.
- Tiada test code.
- TanStack Query + toast sonner.
- Tiada ralat lint untuk kedua-dua fail (lint errors yang tinggal adalah dalam `laporan-borang.tsx` & `penilaian.tsx` - bukan milik task ini).
- Dev server: kompilasi OK, GET / 200.
