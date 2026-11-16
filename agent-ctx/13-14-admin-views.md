# Task 13 & 14 - View Eksport, Admin Pengguna, Admin Tetapan, Admin Audit

## Fail ditulis

1. **`src/components/spk/views/eksport.tsx`** - `EksportView`
   - Header "Eksport & Cetak Laporan"
   - Bento grid dua bahagian:
     - Eksport CSV: Select Unit, tarikh mula/tamat, tombol "Eksport CSV" -> `window.open(/api/export/attendance?unitId=&dari=&hingga=, _blank)`
     - Cetak PDF A4: Select Unit, Select tempoh, tombol "Cetak Laporan Aktiviti Unit"
   - Senarai laporan diluluskan untuk unit (boleh pilih satu -> tombol "Cetak Laporan Ini")
   - Komponen `PrintableReport` dengan kop sekolah, maklumat sesi, kandungan (objektif/ringkasan/hasil/masalah/cadangan), footer ditandatangani
   - CSS `@media print` sembunyikan elemen `.no-print`, hanya `.printable-area` nampak, `@page size: A4`
   - API: `/api/units`, `/api/reports?unitId=&status=DILULUSKAN`, `/api/reports/[id]`

2. **`src/components/spk/views/admin-pengguna.tsx`** - `AdminPengguna`
   - Header "Pengurusan Pengguna"
   - Tombol "Tambah Pengguna" (Dialog) dengan borang: nama, emel, peranan (Select GURU/PK/GB/ADMIN), kata laluan (opsyenal)
   - Table: Nama, Emel, Peranan (Badge), Status Aktif (icon), Tarikh Dicipta, Butang Edit
   - Edit Dialog: ubah nama, emel, peranan, kata laluan baru (opsyenal), toggle aktif (Switch)
   - API: `GET /api/pengguna`, `POST /api/pengguna`, `PATCH /api/pengguna`

3. **`src/components/spk/views/admin-tetapan.tsx`** - `AdminTetapan`
   - Header "Tetapan Sistem"
   - Statistik Sistem (4 kad: jumlah pengguna/murid/unit/sesi hari ini dari dashboard)
   - Tetapan Semester: tahun akademik (Input number), semester (Select 1/2), tarikh mula/tamat, tombol "Simpan Tetapan"
   - Reset Data Dummy: Alert kuning merbahaya + AlertDialog pengesahan double (perlu taip "RESET"), tombol "Tetap Semula Pangkalan Data Dummy", toast + reload data selepas reset
   - API: `GET/PATCH /api/tetapan`, `POST /api/admin/reset`, `GET /api/dashboard`

4. **`src/components/spk/views/admin-audit.tsx`** - `AdminAudit`
   - Header "Log Audit Sistem"
   - Filter: carian (search input) + limit (Select 50/100/200)
   - Table: Masa (formatTarikh + formatMasa), Pengguna (nama+emel), Tindakan (code badge), Entiti (Badge warna), Butiran (+ entitiId)
   - Auto-refresh setiap 30 saat (refetchInterval) + tombol "Muat Semula"
   - API: `GET /api/audit?limit=`

## Ciri teknikal
- Semua "use client"
- Tema emerald/gold/amber - tiada indigo/blue sebagai warna utama
- Responsive (grid 1 kolom mobile, 2 kolom desktop)
- Loading state (Loader2 spinner) + Empty state (icon + tajuk + desc) untuk setiap senarai
- TanStack Query untuk data fetching + invalidate pada mutation
- Sonner toast untuk feedback
- shadcn/ui components: Card, Button, Input, Label, Select, Table, Dialog, Badge, AlertDialog, Switch, Separator, ScrollArea, Alert
- Lucide icons sahaja
- Utiliti `apiFetch`, `formatTarikh`, `formatMasa`, `formatTarikhPendek`, `labelPeranan` dari `@/lib/format`

## Lint
- Keempat-empat fail lulus `eslint` tanpa error/warning (error dalam dev.log adalah dari fail view lain yang belum dihasilkan oleh ejen lain).
