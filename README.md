# Sistem Pengurusan Kokurikulum (SPK)
### Sekolah Rendah Islam Al Amin, Gombak

Sistem pengurusan kokurikulum komprehensif bagi murid Tahap 2 (Tahun 4 hingga 6) — Modul Laporan Guru dan Kehadiran Murid. Dibangunkan mengikut Dokumen Keperluan Produk (PRD) v1.1.

![Tema Islamic Emerald + Gold](https://img.shields.io/badge/Tema-Islamic%20Emerald%20%2B%20Gold-success)
![Next.js 16](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma + SQLite](https://img.shields.io/badge/Prisma-SQLite-teal)

---

## Ringkasan

Sistem ini menggantikan proses manual (buku kehadiran, borang kertas, hamparan berasingan) dengan platform digital yang membolehkan:
- Guru penasihat merekod kehadiran murid dengan pantas
- Guru menyediakan laporan aktiviti dengan aliran kelulusan
- Penyelaras Kokurikulum (PK) memantau semua unit dan meluluskan laporan
- Guru Besar melihat papan pemuka baca sahaja
- Pentadbir mengurus pengguna dan tetapan sistem

## Ciri Utama

| Modul | Keperluan PRD |
|-------|---------------|
| Log Masuk + RBAC | FR-01, FR-02, FR-03, FR-04 |
| Unit & Keahlian | FR-05, FR-06, FR-07, FR-08, FR-08A |
| Sesi Aktiviti | FR-11, FR-12, FR-13, FR-14 |
| Rekod Kehadiran | FR-15 – FR-22 |
| Laporan Aktiviti | FR-23 – FR-30 |
| Penilaian Murid | FR-31 – FR-34 |
| Papan Pemuka & Eksport | FR-35 – FR-40 |

## Tindanan Teknologi

- **Rangka kerja**: Next.js 16 (App Router) + TypeScript 5
- **Pangkalan data**: Prisma ORM + SQLite
- **Gaya**: Tailwind CSS 4 + shadcn/ui (New York) + Lucide icons
- **State**: TanStack Query (server) + Zustand (klien)
- **Carta**: Recharts
- **Notifikasi**: Sonner

## Akaun Demonstrasi

| Peranan | Emel | Kata Laluan |
|---------|------|-------------|
| Guru Penasihat | `guru1@alamin.test` | `Demo@1234` |
| Penyelaras Kokurikulum (PK) | `pk@alamin.test` | `Demo@1234` |
| Guru Besar (GB) | `gb@alamin.test` | `Demo@1234` |
| Pentadbir Sistem | `admin@alamin.test` | `Demo@1234` |

## Pemasangan Tempatan

### Prasyarat
- Node.js 18+ atau Bun
- SQLite (terbina dalam)

### Langkah

```bash
# 1. Klon repository
git clone https://github.com/sahinalazral12/Sistem-Pengurusan-Kokurikulum-SRIAAG.git
cd Sistem-Pengurusan-Kokurikulum-SRIAAG

# 2. Pasang kebergantungan
bun install
# atau: npm install

# 3. Salin fail persekitaran
cp .env.example .env

# 4. Push skema Prisma ke pangkalan data
bun run db:push

# 5. Muatkan data dummy (seed)
bun run prisma/seed.ts

# 6. Mulakan pelayan pembangunan
bun run dev
```

Buka `http://localhost:3000` dalam pelayar anda.

## Skrip Tersedia

| Skrip | Fungsi |
|-------|--------|
| `bun run dev` | Mulakan pelayan pembangunan (port 3000) |
| `bun run lint` | Semakan kualiti kod (ESLint) |
| `bun run db:push` | Push skema Prisma ke DB |
| `bun run db:generate` | Jana Prisma Client |
| `bun run db:reset` | Reset pangkalan data |

## Struktur Projek

```
src/
├── app/
│   ├── api/                  # API routes (REST)
│   │   ├── auth/             # login, logout, me
│   │   ├── units/            # CRUD unit & keahlian
│   │   ├── murid/            # carian & tapisan murid
│   │   ├── sessions/         # sesi & kehadiran
│   │   ├── reports/          # laporan + aliran kelulusan
│   │   ├── assessments/      # penilaian semester
│   │   ├── dashboard/        # statistik papan pemuka
│   │   ├── export/           # eksport CSV
│   │   ├── admin/reset/      # tetap semula data dummy
│   │   ├── pengguna/         # pengurusan pengguna
│   │   ├── tetapan/          # tetapan sistem
│   │   └── audit/            # log audit
│   ├── layout.tsx
│   ├── page.tsx              # aplikasi SPA tunggal
│   └── globals.css           # tema Islamic emerald/gold
├── components/
│   ├── ui/                   # shadcn/ui components
│   └── spk/
│       ├── badges.tsx        # badge status BM
│       ├── login-screen.tsx
│       ├── shell.tsx         # sidebar + header + footer
│       └── views/            # 12 paparan modul
└── lib/
    ├── auth.ts               # sesi cookie + RBAC
    ├── db.ts                 # Prisma client
    ├── format.ts             # format ms-MY + helper API
    └── store.ts              # Zustand store

prisma/
├── schema.prisma             # 10 model
└── seed.ts                   # skrip data dummy
```

## Peranan Pengguna (RBAC)

| Peranan | Keupayaan |
|---------|-----------|
| **GURU** | Rekod kehadiran unit sendiri, cipta laporan, penilaian murid |
| **PK** | Semua GURU + lulus/kembalikan laporan, pantau semua unit, eksport |
| **GB** | Paparan baca sahaja papan pemuka & laporan diluluskan |
| **ADMIN** | Pengurusan pengguna, tetapan semester, reset data, log audit |

## Pangkalan Data Dummy

Skrip `prisma/seed.ts` memuatkan:
- 6 pengguna (3 Guru + 1 PK + 1 GB + 1 Admin)
- 120 murid Tahap 2 (40 setiap Tahun 4, 5, 6)
- 8 unit (3 Badan Beruniform, 2 Kelab, 3 Sukan)
- 80 sesi aktiviti Semester 2 (Ogos–November 2026)
- 3,600 rekod kehadiran (80–95% setiap sesi)
- 12 laporan aktiviti (pelbagai status)
- 30 rekod penilaian murid
- Tetapan sistem + log audit contoh

Gunakan butang **"Tetap Semula Pangkalan Data Dummy"** dalam modul Tetapan Sistem (ADMIN) untuk reset ke keadaan asal.

## Reka Bentuk UI/UX

- **Bento Grid** layout untuk papan pemuka
- Tema warna Islamic: emerald hijau + emas
- Mobile-first responsif (butang min 44px sentuh)
- Bahasa Malaysia sepenuhnya pada label, butang & mesej ralat
- Format tarikh & masa `ms-MY` (Asia/Kuala_Lumpur)
- Warna status konsisten dengan ikon (bukan warna sahaja):
  - Hadir (hijau), Tidak Hadir (merah), Lewat (kuning), Sakit (biru), Urusan Rasmi (ungu)
- WCAG 2.1 AA: kontras warna, navigasi papan kekunci, label borang

## Keselamatan & Privasi

- Sesi berasaskan cookie HTTP-only
- RBAC dikuatkuasakan pada setiap API route
- Auto-logout selepas 30 minit tidak aktif (FR-04)
- Tiada data peribadi sebenar — semua data rekaan untuk prototaip
- Selaras dengan Akta Perlindungan Data Peribadi 2010 (PDPA)

## Hala Tuju Selepas Prototaip

- **Fasa 2**: Backend sebenar (Node.js/Laravel) + PostgreSQL/MySQL + pengesahan selamat
- **Fasa 3**: Pengimbas kod QR kehadiran + notifikasi WhatsApp/portal ibu bapa
- **Fasa 4**: Integrasi sistem data murid + analitik lanjutan

## Lesen

© 2026 Sekolah Rendah Islam Al Amin, Gombak. Hak cipta terpelihara.

Dibangunkan oleh Jurutera Perisian / Pembangun Sistem.
Pemilik Produk: Penolong Kanan Kokurikulum.
