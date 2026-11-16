"use client";

// Papan Pemuka SPK - FR-35 (Guru) & FR-36 (PK/GB)
// Tema emerald/gold, reka bentuk Bento Grid, responsif.

import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  CalendarClock,
  ClipboardCheck,
  FileText,
  AlertTriangle,
  Users,
  LayoutDashboard,
  Loader2,
  Inbox,
  GraduationCap,
  Building2,
  Send,
  TrendingUp,
  ChevronRight,
  PlusCircle,
} from "lucide-react";

import { apiFetch, formatTarikh, formatMasa, formatBulanTahun } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { BadgeSesi, BadgeLaporan, BadgeKategori } from "@/components/spk/badges";

// ---------------------------------------------------------------------------
// Jenis data
// ---------------------------------------------------------------------------
type Peranan = "GURU" | "PK" | "GB" | "ADMIN";

interface Tetapan {
  tahunAkademik: number;
  semester: number;
}

interface SesiHariIni {
  id: string;
  tajuk: string;
  tarikh: string;
  masaMula: string;
  masaTamat: string;
  tempat?: string;
  unit: { nama: string; kategori: string };
  status?: string;
  _count: { kehadiran: number };
}

interface LaporanTertunggakItem {
  sesiId: string;
  tajuk: string;
  tarikh: string;
  unitNama: string;
  status: string;
}

interface MuridBerisikoGuru {
  muridId: string;
  nama: string;
  kelas: string;
  tahun: number;
  peratus: number;
  unitId: string;
}

interface TrendItem {
  bulan: string;
  peratus: number;
}

interface KehadiranUnitItem {
  unitId: string;
  nama: string;
  kategori: string;
  guruUtama: string;
  peratus: number;
  sesiCount: number;
}

interface LaporanUnitItem {
  unitId: string;
  nama: string;
  total: number;
  diluluskan: number;
  dihantar: number;
  dikembalikan: number;
  draf: number;
  belum: number;
}

interface MuridBerisikoPK {
  nama: string;
  kelas: string;
  peratus: number;
  unitNama: string;
}

interface UnitRingkas {
  id: string;
  nama: string;
  kategori: string;
}

interface DashboardGuru {
  peranan: "GURU";
  tetapan: Tetapan;
  stat: {
    jumlahUnit: number;
    jumlahAhli: number;
    laporanSayaTertunggak: number;
    laporanSayaDiluluskan: number;
    sesiHariIni: number;
  };
  sesiHariIni: SesiHariIni[];
  laporanTertunggak: LaporanTertunggakItem[];
  muridBerisiko: MuridBerisikoGuru[];
  trendBulanan: TrendItem[];
  units: UnitRingkas[];
}

interface DashboardPKGB {
  peranan: "PK" | "GB";
  tetapan: Tetapan;
  stat: {
    jumlahMurid: number;
    jumlahUnit: number;
    totalKeahlian: number;
    laporanPerluSemakan: number;
    sesiHariIni: number;
    muridBerisiko: number;
  };
  sesiHariIni: SesiHariIni[];
  kehadiranUnit: KehadiranUnitItem[];
  laporanUnit: LaporanUnitItem[];
  trendBulanan: TrendItem[];
  muridBerisiko: MuridBerisikoPK[];
  units: UnitRingkas[];
}

type DashboardData = DashboardGuru | DashboardPKGB;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function labelBulanPendek(key: string): string {
  // key format "2026-08"
  const [tahun, bulan] = key.split("-");
  if (!tahun || !bulan) return key;
  const d = new Date(Number(tahun), Number(bulan) - 1, 1);
  return d.toLocaleDateString("ms-MY", { month: "short", year: "2-digit", timeZone: "Asia/Kuala_Lumpur" });
}

// ---------------------------------------------------------------------------
// Komponen kecil: Tajuk Bahagian
// ---------------------------------------------------------------------------
function TajukBahagian({
  ikon,
  tajuk,
  keterangan,
  tindakan,
}: {
  ikon: React.ReactNode;
  tajuk: string;
  keterangan?: string;
  tindakan?: React.ReactNode;
}) {
  return (
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-emerald-100 text-emerald-700 p-1.5 dark:bg-emerald-900/30 dark:text-emerald-300">
            {ikon}
          </div>
          <div>
            <CardTitle className="text-base">{tajuk}</CardTitle>
            {keterangan && <CardDescription className="text-xs">{keterangan}</CardDescription>}
          </div>
        </div>
        {tindakan}
      </div>
    </CardHeader>
  );
}

// Empty state mesra BM
function EmptyState({ mesej, ikon }: { mesej: string; ikon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="rounded-full bg-muted p-3 text-muted-foreground mb-2">{ikon}</div>
      <p className="text-sm text-muted-foreground max-w-xs">{mesej}</p>
    </div>
  );
}

// Skeleton grid
function SkeletonKad({ kelasSpan }: { kelasSpan: string }) {
  return (
    <Card className={cn("card-hover rounded-xl shadow-sm border", kelasSpan)}>
      <CardHeader className="pb-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </CardContent>
    </Card>
  );
}

// Wrapper Card bento biasa
function KadBento({
  kelasSpan,
  children,
}: {
  kelasSpan: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("card-hover rounded-xl shadow-sm border col-span-4", kelasSpan)}>
      {children}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Header Tahun Akademik & Semester
// ---------------------------------------------------------------------------
function HeaderTetapan({ tetapan, peranan }: { tetapan: Tetapan; peranan: Peranan }) {
  const labelPeranan: Record<Peranan, string> = {
    GURU: "Papan Pemuka Guru Penasihat",
    PK: "Papan Pemuka Penyelaras Kokurikulum",
    GB: "Papan Pemuka Guru Besar (Baca Sahaja)",
    ADMIN: "Papan Pemuka Pentadbir",
  };
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-bold text-emerald-900 dark:text-emerald-100 school-title flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-emerald-700" />
          {labelPeranan[peranan] ?? "Papan Pemuka"}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Selamat datang ke Sistem Pengurusan Kokurikulum SR Islam Al Amin Gombak.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
          <CalendarClock className="h-3.5 w-3.5" />
          Tahun Akademik {tetapan.tahunAkademik}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          Semester {tetapan.semester}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kad Statistik Ringkas (PK/GB)
// ---------------------------------------------------------------------------
function KadStatPKGB({
  ikon,
  label,
  nilai,
  kelasSpan,
  hint,
}: {
  ikon: React.ReactNode;
  label: string;
  nilai: number | string;
  kelasSpan: string;
  hint?: string;
}) {
  return (
    <Card className={cn("card-hover rounded-xl shadow-sm border col-span-4", kelasSpan)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 text-emerald-700 p-2 dark:bg-emerald-900/30 dark:text-emerald-300">
            {ikon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 leading-tight">
              {nilai}
            </p>
            {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// PAPAN PEMUKA GURU
// ---------------------------------------------------------------------------
function PapanPemukaGuru({ data }: { data: DashboardGuru }) {
  const navigasi = useAppStore((s) => s.navigasi);
  const { stat, sesiHariIni, laporanTertunggak, muridBerisiko, trendBulanan } = data;

  const trendData = trendBulanan.map((t) => ({ ...t, label: labelBulanPendek(t.bulan) }));

  return (
    <div className="bento-grid">
      {/* Ringkasan Stat - col-span-4 */}
      <KadBento kelasSpan="md:col-span-4">
        <TajukBahagian
          ikon={<LayoutDashboard className="h-4 w-4" />}
          tajuk="Ringkasan"
          keterangan="Statistik penasihat unit anda"
        />
        <CardContent className="pt-0 space-y-3">
          <ItemRingkasan label="Jumlah Unit Dinasihat" nilai={stat.jumlahUnit} ikon={<Building2 className="h-4 w-4" />} />
          <ItemRingkasan label="Jumlah Ahli Aktif" nilai={stat.jumlahAhli} ikon={<Users className="h-4 w-4" />} />
          <ItemRingkasan label="Sesi Hari Ini" nilai={stat.sesiHariIni} ikon={<CalendarClock className="h-4 w-4" />} />
          <ItemRingkasan label="Laporan Diluluskan" nilai={stat.laporanSayaDiluluskan} ikon={<FileText className="h-4 w-4" />} />
          {stat.laporanSayaTertunggak > 0 && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 dark:bg-amber-900/20 dark:border-amber-800">
              <p className="text-xs text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {stat.laporanSayaTertunggak} laporan tertunggak perlu diselesaikan.
              </p>
            </div>
          )}
        </CardContent>
      </KadBento>

      {/* Sesi Hari Ini - col-span-8 */}
      <KadBento kelasSpan="md:col-span-8">
        <TajukBahagian
          ikon={<CalendarClock className="h-4 w-4" />}
          tajuk="Sesi Hari Ini"
          keterangan={`${sesiHariIni.length} sesi dijadualkan pada ${formatTarikh(new Date())}`}
        />
        <CardContent className="pt-0">
          {sesiHariIni.length === 0 ? (
            <EmptyState
              mesej="Tiada sesi aktiviti dijadualkan untuk hari ini."
              ikon={<Inbox className="h-6 w-6" />}
            />
          ) : (
            <ul className="space-y-2 max-h-96 overflow-y-auto scroll-area-custom pr-1">
              {sesiHariIni.map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/50 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{s.tajuk}</p>
                      {s.status && <BadgeSesi status={s.status} />}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {s.unit.nama}
                      </span>
                      <BadgeKategori kategori={s.unit.kategori} />
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {formatMasa(s.masaMula)} - {formatMasa(s.masaTamat)}
                      </span>
                      {s.tempat && (
                        <span className="inline-flex items-center gap-1 truncate">
                          <Building2 className="h-3 w-3" />
                          {s.tempat}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {s._count.kehadiran} rekod
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-emerald-700 hover:bg-emerald-800 text-white shrink-0"
                    onClick={() => navigasi("kehadiran", { sesiId: s.id })}
                  >
                    <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                    Ambil Kehadiran
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </KadBento>

      {/* Laporan Tertunggak - col-span-6 */}
      <KadBento kelasSpan="md:col-span-6">
        <TajukBahagian
          ikon={<FileText className="h-4 w-4" />}
          tajuk="Laporan Tertunggak"
          keterangan={`${laporanTertunggak.length} sesi menanti laporan`}
          tindakan={
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-700 hover:text-emerald-800"
              onClick={() => navigasi("laporan-senarai")}
            >
              Lihat Semua
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          }
        />
        <CardContent className="pt-0">
          {laporanTertunggak.length === 0 ? (
            <EmptyState
              mesej="Semua laporan telah diselesaikan. Tahniah!"
              ikon={<FileText className="h-6 w-6" />}
            />
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto scroll-area-custom pr-1">
              {laporanTertunggak.slice(0, 8).map((l) => {
                const statusKey = l.status === "BELUM_WUJUD" ? "DRAF" : l.status;
                return (
                  <li
                    key={l.sesiId}
                    className="rounded-lg border p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{l.tajuk}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span>{l.unitNama}</span>
                        <span aria-hidden>·</span>
                        <span>{formatTarikh(l.tarikh)}</span>
                        <BadgeLaporan status={statusKey} />
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 shrink-0"
                      onClick={() => navigasi("laporan-borang", { laporanId: l.sesiId })}
                    >
                      <PlusCircle className="h-3.5 w-3.5 mr-1" />
                      Cipta Laporan
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </KadBento>

      {/* Murid Berisiko - col-span-6 */}
      <KadBento kelasSpan="md:col-span-6">
        <TajukBahagian
          ikon={<AlertTriangle className="h-4 w-4" />}
          tajuk="Murid Berisiko (<80%)"
          keterangan={`${muridBerisiko.length} murid memerlukan perhatian`}
        />
        <CardContent className="pt-0">
          {muridBerisiko.length === 0 ? (
            <EmptyState
              mesej="Tiada murid berisiko. Kehadiran semua ahli mencukupi."
              ikon={<Users className="h-6 w-6" />}
            />
          ) : (
            <ul className="space-y-3 max-h-80 overflow-y-auto scroll-area-custom pr-1">
              {muridBerisiko.slice(0, 10).map((m) => (
                <li key={`${m.muridId}-${m.unitId}`} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{m.nama}</p>
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        m.peratus < 50 ? "text-red-600" : "text-amber-600"
                      )}
                    >
                      {m.peratus}%
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Tahun {m.tahun} · Kelas {m.kelas}
                  </p>
                  <Progress
                    value={m.peratus}
                    className="h-1.5"
                    // Warna diatur melalui variabel sekolah; tahap risiko ditunjukkan dengan teks
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </KadBento>

      {/* Trend Kehadiran Bulanan - col-span-12 */}
      <KadBento kelasSpan="md:col-span-12">
        <TajukBahagian
          ikon={<TrendingUp className="h-4 w-4" />}
          tajuk="Trend Kehadiran Bulanan"
          keterangan="Peratus kehadiran ahli unit anda mengikut bulan"
        />
        <CardContent className="pt-0">
          {trendData.length === 0 ? (
            <EmptyState
              mesej="Belum ada data kehadiran untuk dipaparkan."
              ikon={<TrendingUp className="h-6 w-6" />}
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.02 100)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "oklch(0.45 0.02 160)" }}
                    tickLine={false}
                    axisLine={{ stroke: "oklch(0.9 0.02 100)" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "oklch(0.45 0.02 160)" }}
                    tickLine={false}
                    axisLine={false}
                    unit="%"
                  />
                  <Tooltip
                    cursor={{ fill: "oklch(0.92 0.05 160 / 0.4)" }}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid oklch(0.9 0.02 100)",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v}%`, "Kehadiran"]}
                    labelFormatter={(l) => `Bulan: ${l}`}
                  />
                  <Bar dataKey="peratus" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {trendData.map((entry, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={
                          entry.peratus >= 80
                            ? "oklch(0.55 0.12 160)" // emerald
                            : entry.peratus >= 50
                              ? "oklch(0.7 0.14 80)" // emas
                              : "oklch(0.6 0.18 30)" // merah
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </KadBento>
    </div>
  );
}

function ItemRingkasan({
  label,
  nilai,
  ikon,
}: {
  label: string;
  nilai: number;
  ikon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-emerald-600 dark:text-emerald-300">{ikon}</span>
        <span className="text-xs text-muted-foreground truncate">{label}</span>
      </div>
      <span className="text-sm font-semibold tabular-nums text-emerald-900 dark:text-emerald-100">
        {nilai}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PAPAN PEMUKA PK / GB
// ---------------------------------------------------------------------------
function PapanPemukaPKGB({ data }: { data: DashboardPKGB }) {
  const navigasi = useAppStore((s) => s.navigasi);
  const readOnly = data.peranan === "GB";

  const { stat, sesiHariIni, kehadiranUnit, laporanUnit, trendBulanan, muridBerisiko } = data;
  const trendData = trendBulanan.map((t) => ({ ...t, label: labelBulanPendek(t.bulan) }));

  return (
    <div className="bento-grid">
      {/* 4 Kad stat - col-span-3 setiap satu */}
      <KadStatPKGB
        ikon={<Users className="h-5 w-5" />}
        label="Jumlah Murid"
        nilai={stat.jumlahMurid}
        kelasSpan="md:col-span-3"
        hint="Murid aktif berdaftar"
      />
      <KadStatPKGB
        ikon={<Building2 className="h-5 w-5" />}
        label="Jumlah Unit"
        nilai={stat.jumlahUnit}
        kelasSpan="md:col-span-3"
        hint="Unit kokurikulum aktif"
      />
      <KadStatPKGB
        ikon={<Send className="h-5 w-5" />}
        label="Laporan Perlu Semakan"
        nilai={stat.laporanPerluSemakan}
        kelasSpan="md:col-span-3"
        hint="Status DIHANTAR menanti"
      />
      <KadStatPKGB
        ikon={<AlertTriangle className="h-5 w-5" />}
        label="Murid Berisiko"
        nilai={stat.muridBerisiko}
        kelasSpan="md:col-span-3"
        hint="Kehadiran kurang 80%"
      />

      {/* Trend Keseluruhan - Line chart col-span-8 */}
      <KadBento kelasSpan="md:col-span-8">
        <TajukBahagian
          ikon={<TrendingUp className="h-4 w-4" />}
          tajuk="Trend Kehadiran Bulanan Keseluruhan"
          keterangan="Peratus kehadiran seluruh unit mengikut bulan"
        />
        <CardContent className="pt-0">
          {trendData.length === 0 ? (
            <EmptyState
              mesej="Belum ada data trend kehadiran untuk dipaparkan."
              ikon={<TrendingUp className="h-6 w-6" />}
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.02 100)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "oklch(0.45 0.02 160)" }}
                    tickLine={false}
                    axisLine={{ stroke: "oklch(0.9 0.02 100)" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "oklch(0.45 0.02 160)" }}
                    tickLine={false}
                    axisLine={false}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid oklch(0.9 0.02 100)",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v}%`, "Kehadiran"]}
                    labelFormatter={(l) => `Bulan: ${l}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="peratus"
                    stroke="oklch(0.45 0.11 160)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "oklch(0.55 0.12 160)", stroke: "oklch(0.45 0.11 160)" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </KadBento>

      {/* Sesi Hari Ini - col-span-4 */}
      <KadBento kelasSpan="md:col-span-4">
        <TajukBahagian
          ikon={<CalendarClock className="h-4 w-4" />}
          tajuk="Sesi Hari Ini"
          keterangan={`${sesiHariIni.length} sesi di seluruh sekolah`}
        />
        <CardContent className="pt-0">
          {sesiHariIni.length === 0 ? (
            <EmptyState
              mesej="Tiada sesi aktiviti di seluruh sekolah hari ini."
              ikon={<Inbox className="h-6 w-6" />}
            />
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto scroll-area-custom pr-1">
              {sesiHariIni.slice(0, 8).map((s) => (
                <li key={s.id} className="rounded-lg border p-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate flex-1 min-w-0">{s.tajuk}</p>
                    {s.status && <BadgeSesi status={s.status} />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2">
                    <BadgeKategori kategori={s.unit.kategori} />
                    <span className="truncate">{s.unit.nama}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatMasa(s.masaMula)} - {formatMasa(s.masaTamat)} · {s._count.kehadiran} rekod
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </KadBento>

      {/* Status Laporan mengikut Unit - Table col-span-12 */}
      <KadBento kelasSpan="md:col-span-12">
        <TajukBahagian
          ikon={<FileText className="h-4 w-4" />}
          tajuk="Status Laporan mengikut Unit"
          keterangan="Baris dengan laporan DIHANTAR ditonjolkan (perlu semakan PK)"
        />
        <CardContent className="pt-0">
          {laporanUnit.length === 0 ? (
            <EmptyState
              mesej="Tiada data laporan unit untuk dipaparkan."
              ikon={<FileText className="h-6 w-6" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Unit</TableHead>
                    <TableHead className="text-center">Total Sesi</TableHead>
                    <TableHead className="text-center">Diluluskan</TableHead>
                    <TableHead className="text-center">Dihantar</TableHead>
                    <TableHead className="text-center">Dikembalikan</TableHead>
                    <TableHead className="text-center">Draf</TableHead>
                    <TableHead className="text-center">Belum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {laporanUnit.map((u) => {
                    const perluSemakan = u.dihantar > 0;
                    return (
                      <TableRow
                        key={u.unitId}
                        className={perluSemakan ? "bg-amber-50 hover:bg-amber-100/70 dark:bg-amber-900/15 dark:hover:bg-amber-900/25" : ""}
                      >
                        <TableCell className="font-medium">
                          <button
                            type="button"
                            onClick={() => navigasi("unit-butiran", { unitId: u.unitId })}
                            className="text-emerald-700 hover:text-emerald-900 hover:underline text-left"
                          >
                            {u.nama}
                          </button>
                          {perluSemakan && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                              <AlertTriangle className="h-3 w-3" />
                              Perlu Semakan
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">{u.total}</TableCell>
                        <TableCell className="text-center tabular-nums text-emerald-700 dark:text-emerald-300 font-medium">
                          {u.diluluskan}
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-amber-700 dark:text-amber-300 font-semibold">
                          {u.dihantar}
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-orange-700 dark:text-orange-300">
                          {u.dikembalikan}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">{u.draf}</TableCell>
                        <TableCell className="text-center tabular-nums text-muted-foreground">
                          {u.belum}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </KadBento>

      {/* Purata Kehadiran mengikut Unit - col-span-6 */}
      <KadBento kelasSpan="md:col-span-6">
        <TajukBahagian
          ikon={<TrendingUp className="h-4 w-4" />}
          tajuk="Purata Kehadiran mengikut Unit"
          keterangan="Peratus kehadiran & jumlah sesi selesai"
        />
        <CardContent className="pt-0">
          {kehadiranUnit.length === 0 ? (
            <EmptyState
              mesej="Tiada data kehadiran unit untuk dipaparkan."
              ikon={<TrendingUp className="h-6 w-6" />}
            />
          ) : (
            <ul className="space-y-3 max-h-80 overflow-y-auto scroll-area-custom pr-1">
              {kehadiranUnit.map((u) => (
                <li key={u.unitId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => navigasi("unit-butiran", { unitId: u.unitId })}
                      className="text-sm font-medium text-emerald-700 hover:text-emerald-900 hover:underline truncate text-left"
                    >
                      {u.nama}
                    </button>
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums shrink-0",
                        u.peratus >= 80
                          ? "text-emerald-700 dark:text-emerald-300"
                          : u.peratus >= 50
                            ? "text-amber-600"
                            : "text-red-600"
                      )}
                    >
                      {u.peratus}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={u.peratus} className="h-1.5 flex-1" />
                    <span className="text-[11px] text-muted-foreground shrink-0">{u.sesiCount} sesi</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Guru Utama: {u.guruUtama} · <BadgeKategori kategori={u.kategori} />
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </KadBento>

      {/* Murid Berisiko - col-span-6 */}
      <KadBento kelasSpan="md:col-span-6">
        <TajukBahagian
          ikon={<AlertTriangle className="h-4 w-4" />}
          tajuk="Murid Berisiko"
          keterangan={`${muridBerisiko.length} murid dengan kehadiran < 80%`}
        />
        <CardContent className="pt-0">
          {muridBerisiko.length === 0 ? (
            <EmptyState
              mesej="Tiada murid berisiko di seluruh sekolah. Tahniah!"
              ikon={<GraduationCap className="h-6 w-6" />}
            />
          ) : (
            <ul className="space-y-3 max-h-80 overflow-y-auto scroll-area-custom pr-1">
              {muridBerisiko.slice(0, 12).map((m, i) => (
                <li key={`${m.nama}-${m.kelas}-${m.unitNama}-${i}`} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{m.nama}</p>
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums shrink-0",
                        m.peratus < 50 ? "text-red-600" : "text-amber-600"
                      )}
                    >
                      {m.peratus}%
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Kelas {m.kelas} · {m.unitNama}
                  </p>
                  <Progress value={m.peratus} className="h-1.5" />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </KadBento>

      {/* Nota read-only untuk GB */}
      {readOnly && (
        <div className="col-span-4 md:col-span-12 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:bg-amber-900/15 dark:border-amber-800 dark:text-amber-200">
          <p className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Paparan ini adalah baca sahaja. Sebarang semakan atau kelulusan laporan perlu dilakukan oleh Penyelaras Kokurikulum.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KOMPONEN UTAMA
// ---------------------------------------------------------------------------
export function PapanPemuka() {
  const { data, isLoading, isError, error, refetch } = useQuery<DashboardData>({
    queryKey: ["dashboard", "summary"],
    queryFn: () => apiFetch<DashboardData>("/api/dashboard/summary"),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="bento-grid">
          <SkeletonKad kelasSpan="md:col-span-4" />
          <SkeletonKad kelasSpan="md:col-span-8" />
          <SkeletonKad kelasSpan="md:col-span-6" />
          <SkeletonKad kelasSpan="md:col-span-6" />
          <SkeletonKad kelasSpan="md:col-span-12" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-red-100 p-3 text-red-600 mb-3 dark:bg-red-900/30 dark:text-red-300">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-red-700 dark:text-red-300">
          Gagal memuatkan data papan pemuka.
        </p>
        <p className="text-xs text-muted-foreground mt-1 max-w-md">
          {error instanceof Error ? error.message : "Sila cuba muat semula."}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          onClick={() => refetch()}
        >
          <Loader2 className="h-3.5 w-3.5 mr-1" />
          Muat Semula
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Tiada data papan pemuka tersedia.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HeaderTetapan tetapan={data.tetapan} peranan={data.peranan as Peranan} />
      {data.peranan === "GURU" ? (
        <PapanPemukaGuru data={data} />
      ) : (
        <PapanPemukaPKGB data={data} />
      )}
    </div>
  );
}

export default PapanPemuka;
