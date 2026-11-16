"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import {
  apiFetch,
  formatTarikh,
  formatMasa,
  labelStatusSesi,
  labelKategoriUnit,
} from "@/lib/format";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BadgeSesi, BadgeKategori } from "@/components/spk/badges";

import {
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  FileText,
  Plus,
  Search,
  MoreVertical,
  CalendarClock,
  MapPin,
  Clock as ClockIcon,
  Ban,
  PauseCircle,
  Users,
  List as ListIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

// ---------- Jenis ----------

interface UnitRingkas {
  id: string;
  nama: string;
  kategori: string;
}

interface SesiItem {
  id: string;
  unitId: string;
  tajuk: string;
  tarikh: string;
  masaMula: string;
  masaTamat: string;
  tempat?: string | null;
  jenis: string; // MINGGUAN | KHAS
  status: string; // DIRANCANG | SELESAI | DIBATALKAN | DITANGGUH
  sebabBatal?: string | null;
  unit: UnitRingkas;
  _count?: { kehadiran: number; laporan: number };
}

// ---------- Util kalendar ----------

const NAMA_HARI_PENDEK = ["Ahd", "Isn", "Sel", "Rab", "Kha", "Jum", "Sab"];
const NAMA_BULAN = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun",
  "Julai", "Ogos", "September", "Oktober", "November", "Disember",
];

function mulaiBulan(tahun: number, bulan: number): Date {
  // Ahd = 0 dalam JS Date.getDay(); kita gunakan grid Isn-Sab
  // Untuk grid Ahd-Sab, kita gunakan getDay() terus
  return new Date(tahun, bulan, 1);
}

function gridHariBulan(tahun: number, bulan: number): Date[] {
  const pertama = mulaiBulan(tahun, bulan);
  const offset = pertama.getDay(); // 0=Ahd ... 6=Sab
  const hariDalamBulan = new Date(tahun, bulan + 1, 0).getDate();
  const sel: Date[] = [];
  // Sel sebelum (bulan lepas)
  for (let i = 0; i < offset; i++) {
    sel.push(new Date(tahun, bulan, -(offset - 1 - i)));
  }
  // Hari bulan ini
  for (let d = 1; d <= hariDalamBulan; d++) {
    sel.push(new Date(tahun, bulan, d));
  }
  // Lengkapkan hingga 42 sel (6 minggu)
  while (sel.length < 42) {
    const last = sel[sel.length - 1];
    sel.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
  }
  return sel;
}

function samaHari(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function keKunciTarikh(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ====================================================================
// Komponen utama
// ====================================================================

export function SesiSenarai() {
  const pengguna = useAppStore((s) => s.pengguna);
  const navigasi = useAppStore((s) => s.navigasi);
  const queryClient = useQueryClient();

  const [unitIdPilih, setUnitIdPilih] = React.useState<string>("SEMUA");
  const [statusPilih, setStatusPilih] = React.useState<string>("SEMUA");
  const [carian, setCarian] = React.useState("");
  const [modPaparan, setModPaparan] = React.useState<"senarai" | "kalendar">("senarai");

  // Filter API: unitId, status sahaja (server-side). Carian dibuat klien-side.
  const { data: dataUnit } = useQuery<{ units: UnitRingkas[] }>({
    queryKey: ["units-sesi"],
    queryFn: () => apiFetch("/api/units"),
  });

  const queryKeySesi = React.useMemo(
    () => ["sessions", unitIdPilih, statusPilih] as const,
    [unitIdPilih, statusPilih],
  );

  const { data, isLoading, isError, refetch } = useQuery<{ sesi: SesiItem[] }>({
    queryKey: queryKeySesi,
    queryFn: () => {
      const params = new URLSearchParams();
      if (unitIdPilih !== "SEMUA") params.set("unitId", unitIdPilih);
      if (statusPilih !== "SEMUA") params.set("status", statusPilih);
      return apiFetch(`/api/sessions?${params.toString()}`);
    },
  });

  const sesiList = data?.sesi ?? [];

  const senaraiTapis = React.useMemo(() => {
    const q = carian.trim().toLowerCase();
    if (!q) return sesiList;
    return sesiList.filter((s) =>
      s.tajuk.toLowerCase().includes(q) ||
      (s.tempat ?? "").toLowerCase().includes(q) ||
      s.unit.nama.toLowerCase().includes(q),
    );
  }, [sesiList, carian]);

  // ---------- Mutasi batal / tangguh ----------
  const mutKemaskiniSesi = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: { status: string; sebabBatal?: string } }) =>
      apiFetch<{ sesi: SesiItem }>(`/api/sessions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (_d, v) => {
      toast.success(v.body.status === "DIBATALKAN" ? "Sesi telah dibatalkan." : "Sesi telah ditangguh.");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (e: Error) => toast.error(e.message || "Ralat mengemaskini sesi."),
  });

  const bolehCipta = pengguna && ["GURU", "PK", "ADMIN"].includes(pengguna.peranan);

  return (
    <div className="space-y-4 lg:space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-emerald-700" />
            <h1 className="text-xl lg:text-2xl font-bold text-emerald-900">Sesi Aktiviti</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Uruskan sesi kokurikulum: cipta, ambil kehadiran, jana laporan, batal atau tangguh sesi.
          </p>
        </div>
        {bolehCipta && <DialogCiptaSesi units={dataUnit?.units ?? []} />}
      </div>

      {/* Filter bar */}
      <Card className="shadow-none">
        <CardContent className="p-3 lg:p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="filter-unit" className="text-xs">Unit</Label>
              <Select value={unitIdPilih} onValueChange={setUnitIdPilih}>
                <SelectTrigger id="filter-unit" className="w-full">
                  <SelectValue placeholder="Semua unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEMUA">Semua Unit</SelectItem>
                  {(dataUnit?.units ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-status" className="text-xs">Status</Label>
              <Select value={statusPilih} onValueChange={setStatusPilih}>
                <SelectTrigger id="filter-status" className="w-full">
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEMUA">Semua Status</SelectItem>
                  <SelectItem value="DIRANCANG">Dirancang</SelectItem>
                  <SelectItem value="SELESAI">Selesai</SelectItem>
                  <SelectItem value="DIBATALKAN">Dibatalkan</SelectItem>
                  <SelectItem value="DITANGGUH">Ditangguh</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="filter-carian" className="text-xs">Carian</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="filter-carian"
                  value={carian}
                  onChange={(e) => setCarian(e.target.value)}
                  placeholder="Cari tajuk, tempat atau unit..."
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Toggle paparan */}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center rounded-lg border bg-muted/40 p-1">
              <Button
                size="sm"
                variant={modPaparan === "senarai" ? "default" : "ghost"}
                onClick={() => setModPaparan("senarai")}
                className={cn("h-8 gap-1.5", modPaparan === "senarai" && "bg-emerald-700 hover:bg-emerald-700")}
              >
                <ListIcon className="h-4 w-4" /> Senarai
              </Button>
              <Button
                size="sm"
                variant={modPaparan === "kalendar" ? "default" : "ghost"}
                onClick={() => setModPaparan("kalendar")}
                className={cn("h-8 gap-1.5", modPaparan === "kalendar" && "bg-emerald-700 hover:bg-emerald-700")}
              >
                <CalendarRange className="h-4 w-4" /> Kalendar Bulanan
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Jumlah: <span className="font-semibold text-foreground">{senaraiTapis.length}</span> sesi
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Kandungan */}
      {isLoading ? (
        <SenaraiSkeleton />
      ) : isError ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p>Ralat memuatkan sesi.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <Loader2 className="h-4 w-4 mr-1" /> Cuba semula
            </Button>
          </CardContent>
        </Card>
      ) : senaraiTapis.length === 0 ? (
        <EmptySesi />
      ) : modPaparan === "senarai" ? (
        <PaparanSenarai
          sesi={senaraiTapis}
          navigasi={navigasi}
          onBatalTangguh={(id, status, sebab) =>
            mutKemaskiniSesi.mutate({ id, body: { status, sebabBatal: sebab } })
          }
          kemaskiniMemuat={mutKemaskiniSesi.isPending}
        />
      ) : (
        <PaparanKalendar
          sesi={senaraiTapis}
          navigasi={navigasi}
          onBatalTangguh={(id, status, sebab) =>
            mutKemaskiniSesi.mutate({ id, body: { status, sebabBatal: sebab } })
          }
          kemaskiniMemuat={mutKemaskiniSesi.isPending}
        />
      )}
    </div>
  );
}

// ====================================================================
// Empty + Skeleton
// ====================================================================

function EmptySesi() {
  return (
    <Card>
      <CardContent className="p-10 flex flex-col items-center text-center gap-3">
        <div className="rounded-full bg-emerald-50 p-4">
          <CalendarClock className="h-8 w-8 text-emerald-600" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold">Tiada sesi dijumpai</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Cipta sesi baru menggunakan tombol &quot;Cipta Sesi&quot;, atau ubah penapis untuk melihat sesi lain.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SenaraiSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ====================================================================
// Paparan Senarai (Table)
// ====================================================================

function PaparanSenarai({
  sesi,
  navigasi,
  onBatalTangguh,
  kemaskiniMemuat,
}: {
  sesi: SesiItem[];
  navigasi: (p: "kehadiran" | "laporan-borang", opts?: { sesiId?: string }) => void;
  onBatalTangguh: (id: string, status: string, sebab: string) => void;
  kemaskiniMemuat: boolean;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-0">
        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">Tajuk</th>
                <th className="text-left font-medium px-3 py-3">Unit</th>
                <th className="text-left font-medium px-3 py-3">Tarikh & Masa</th>
                <th className="text-left font-medium px-3 py-3">Tempat</th>
                <th className="text-left font-medium px-3 py-3">Jenis</th>
                <th className="text-left font-medium px-3 py-3">Status</th>
                <th className="text-right font-medium px-3 py-3">Kehadiran</th>
                <th className="text-right font-medium px-3 py-3">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sesi.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground line-clamp-1">{s.tajuk}</div>
                    {s.sebabBatal && (
                      <div className="text-[11px] text-red-600 line-clamp-1">Sebab: {s.sebabBatal}</div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium">{s.unit.nama}</span>
                      <BadgeKategori kategori={s.unit.kategori} />
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatTarikh(s.tarikh)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <ClockIcon className="h-3.5 w-3.5" />
                      {s.masaMula} - {s.masaTamat}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {s.tempat ? (
                      <span className="inline-flex items-center gap-1 text-xs">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {s.tempat}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={s.jenis === "KHAS" ? "default" : "secondary"} className="text-xs">
                      {s.jenis === "KHAS" ? "Khas" : "Mingguan"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3"><BadgeSesi status={s.status} /></td>
                  <td className="px-3 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {s._count?.kehadiran ?? 0}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <MenuTindakan
                      sesi={s}
                      navigasi={navigasi}
                      onBatalTangguh={onBatalTangguh}
                      kemaskiniMemuat={kemaskiniMemuat}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden divide-y">
          {sesi.map((s) => (
            <div key={s.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="font-semibold text-foreground line-clamp-2">{s.tajuk}</p>
                  <p className="text-xs text-muted-foreground">{s.unit.nama}</p>
                </div>
                <BadgeSesi status={s.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatTarikh(s.tarikh)}
                </div>
                <div className="flex items-center gap-1.5">
                  <ClockIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  {s.masaMula}-{s.masaTamat}
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {s.tempat || "Tiada tempat"}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={s.jenis === "KHAS" ? "default" : "secondary"} className="text-[10px]">
                    {s.jenis === "KHAS" ? "Khas" : "Mingguan"}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> {s._count?.kehadiran ?? 0}
                  </span>
                </div>
                <MenuTindakan
                  sesi={s}
                  navigasi={navigasi}
                  onBatalTangguh={onBatalTangguh}
                  kemaskiniMemuat={kemaskiniMemuat}
                />
              </div>
              {s.sebabBatal && (
                <p className="text-[11px] text-red-600">Sebab: {s.sebabBatal}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ====================================================================
// Menu tindakan
// ====================================================================

function MenuTindakan({
  sesi,
  navigasi,
  onBatalTangguh,
  kemaskiniMemuat,
}: {
  sesi: SesiItem;
  navigasi: (p: "kehadiran" | "laporan-borang", opts?: { sesiId?: string }) => void;
  onBatalTangguh: (id: string, status: string, sebab: string) => void;
  kemaskiniMemuat: boolean;
}) {
  const bolehAksi = sesi.status === "DIRANCANG" || sesi.status === "DITANGGUH";
  const selesai = sesi.status === "SELESAI";

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1.5"
        onClick={() => navigasi("kehadiran", { sesiId: sesi.id })}
      >
        <ClipboardCheck className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Kehadiran</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={kemaskiniMemuat}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            onClick={() => navigasi("kehadiran", { sesiId: sesi.id })}
          >
            <ClipboardCheck className="h-4 w-4 mr-2" /> Ambil Kehadiran
          </DropdownMenuItem>
          {selesai && (
            <DropdownMenuItem
              onClick={() => navigasi("laporan-borang", { sesiId: sesi.id })}
            >
              <FileText className="h-4 w-4 mr-2" /> Cipta Laporan
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DialogBatalTangguh
            sesi={sesi}
            mode="DITANGGUH"
            onHantar={(sebab) => onBatalTangguh(sesi.id, "DITANGGUH", sebab)}
            memuat={kemaskiniMemuat}
            pencetus={
              <div className="flex items-center w-full cursor-pointer text-amber-700 focus:text-amber-700">
                <PauseCircle className="h-4 w-4 mr-2" /> Tangguh
              </div>
            }
          />
          <DialogBatalTangguh
            sesi={sesi}
            mode="DIBATALKAN"
            onHantar={(sebab) => onBatalTangguh(sesi.id, "DIBATALKAN", sebab)}
            memuat={kemaskiniMemuat}
            pencetus={
              <div className="flex items-center w-full cursor-pointer text-red-600 focus:text-red-600">
                <Ban className="h-4 w-4 mr-2" /> Batal Sesi
              </div>
            }
          />
          {!bolehAksi && !selesai && (
            <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
              Sesi {labelStatusSesi[sesi.status]?.toLowerCase()} - tiada tindakan.
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ====================================================================
// Dialog Batal / Tangguh
// ====================================================================

function DialogBatalTangguh({
  sesi,
  mode,
  onHantar,
  memuat,
  pencetus,
}: {
  sesi: SesiItem;
  mode: "DIBATALKAN" | "DITANGGUH";
  onHantar: (sebab: string) => void;
  memuat: boolean;
  pencetus: React.ReactNode;
}) {
  const [buka, setBuka] = React.useState(false);
  const [sebab, setSebab] = React.useState("");
  const label = mode === "DIBATALKAN" ? "Batal Sesi" : "Tangguh Sesi";
  const warnaBtn = mode === "DIBATALKAN" ? "bg-red-600 hover:bg-red-600" : "bg-amber-600 hover:bg-amber-600";

  return (
    <Dialog open={buka} onOpenChange={setBuka}>
      <DialogTrigger asChild>
        <button className="w-full text-left">{pencetus}</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            Sesi: <span className="font-medium text-foreground">{sesi.tajuk}</span> ({sesi.unit.nama}).
            Sila nyatakan sebab {mode === "DIBATALKAN" ? "pembatalan" : "penangguhan"}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`sebab-${mode}-${sesi.id}`}>Sebab *</Label>
          <Input
            id={`sebab-${mode}-${sesi.id}`}
            value={sebab}
            onChange={(e) => setSebab(e.target.value)}
            placeholder={mode === "DIBATALKAN" ? "Cth: hujan lebat, kemudahan rosak..." : "Cth: bertindan dengan peperiksaan..."}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setBuka(false)}>Batal</Button>
          <Button
            className={warnaBtn}
            disabled={!sebab.trim() || memuat}
            onClick={() => {
              onHantar(sebab.trim());
              setBuka(false);
              setSebab("");
            }}
          >
            {memuat && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Sahkan {mode === "DIBATALKAN" ? "Pembatalan" : "Penangguhan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ====================================================================
// Dialog Cipta Sesi (FR-11/12)
// ====================================================================

function DialogCiptaSesi({ units }: { units: UnitRingkas[] }) {
  const qc = useQueryClient();
  const [buka, setBuka] = React.useState(false);
  const [borang, setBorang] = React.useState({
    unitId: "",
    tajuk: "",
    tarikh: "",
    masaMula: "",
    masaTamat: "",
    tempat: "",
    jenis: "MINGGUAN",
    repeatCount: 1,
  });

  const reset = () => setBorang({
    unitId: "", tajuk: "", tarikh: "", masaMula: "", masaTamat: "",
    tempat: "", jenis: "MINGGUAN", repeatCount: 1,
  });

  const mut = useMutation({
    mutationFn: () =>
      apiFetch<{ sesi: SesiItem[] }>("/api/sessions", {
        method: "POST",
        body: JSON.stringify(borang),
      }),
    onSuccess: (d) => {
      const n = d.sesi?.length ?? 1;
      toast.success(`${n} sesi berjaya dicipta.`);
      qc.invalidateQueries({ queryKey: ["sessions"] });
      setBuka(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message || "Ralat mencipta sesi."),
  });

  const sah = borang.unitId && borang.tajuk && borang.tarikh && borang.masaMula && borang.masaTamat;

  return (
    <Dialog open={buka} onOpenChange={(o) => { setBuka(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-700 hover:bg-emerald-700 gap-1.5">
          <Plus className="h-4 w-4" /> Cipta Sesi
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cipta Sesi Aktiviti</DialogTitle>
          <DialogDescription>
            Isi butiran sesi. Untuk sesi berulang mingguan, tetapkan bilangan minggu (FR-12).
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3 pr-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-unit">Unit *</Label>
              <Select value={borang.unitId} onValueChange={(v) => setBorang((b) => ({ ...b, unitId: v }))}>
                <SelectTrigger id="c-unit"><SelectValue placeholder="Pilih unit" /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nama} <span className="text-muted-foreground">- {labelKategoriUnit[u.kategori]}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-tajuk">Tajuk *</Label>
              <Input id="c-tajuk" value={borang.tajuk} onChange={(e) => setBorang((b) => ({ ...b, tajuk: e.target.value }))} placeholder="Cth: Latihan mingguan kawad" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-tarikh">Tarikh *</Label>
                <Input id="c-tarikh" type="date" value={borang.tarikh} onChange={(e) => setBorang((b) => ({ ...b, tarikh: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-jenis">Jenis</Label>
                <Select value={borang.jenis} onValueChange={(v) => setBorang((b) => ({ ...b, jenis: v }))}>
                  <SelectTrigger id="c-jenis"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MINGGUAN">Mingguan</SelectItem>
                    <SelectItem value="KHAS">Khas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-mula">Masa Mula *</Label>
                <Input id="c-mula" type="time" value={borang.masaMula} onChange={(e) => setBorang((b) => ({ ...b, masaMula: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-tamat">Masa Tamat *</Label>
                <Input id="c-tamat" type="time" value={borang.masaTamat} onChange={(e) => setBorang((b) => ({ ...b, masaTamat: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-tempat">Tempat</Label>
              <Input id="c-tempat" value={borang.tempat} onChange={(e) => setBorang((b) => ({ ...b, tempat: e.target.value }))} placeholder="Cth: Dewan Serbaguna, Padang..." />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-repeat">Ulang Mingguan (1-12)</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="c-repeat"
                  type="number"
                  min={1}
                  max={12}
                  value={borang.repeatCount}
                  onChange={(e) => setBorang((b) => ({ ...b, repeatCount: Math.max(1, Math.min(12, Number(e.target.value) || 1)) }))}
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground">
                  {borang.repeatCount > 1
                    ? `Akan dicipta ${borang.repeatCount} sesi berulang setiap minggu.`
                    : "Satu sesi sahaja."}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => setBuka(false)}>Batal</Button>
          <Button
            className="bg-emerald-700 hover:bg-emerald-700"
            disabled={!sah || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Cipta Sesi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ====================================================================
// Paparan Kalendar Bulanan
// ====================================================================

function PaparanKalendar({
  sesi,
  navigasi,
  onBatalTangguh,
  kemaskiniMemuat,
}: {
  sesi: SesiItem[];
  navigasi: (p: "kehadiran" | "laporan-borang", opts?: { sesiId?: string }) => void;
  onBatalTangguh: (id: string, status: string, sebab: string) => void;
  kemaskiniMemuat: boolean;
}) {
  const hariIni = new Date();
  const [kursor, setKursor] = React.useState<Date>(new Date(hariIni.getFullYear(), hariIni.getMonth(), 1));
  const tahun = kursor.getFullYear();
  const bulan = kursor.getMonth();
  const selHari = gridHariBulan(tahun, bulan);

  // Petakan sesi mengikut kunci tarikh YYYY-MM-DD
  const sesiMengikutHari = React.useMemo(() => {
    const map = new Map<string, SesiItem[]>();
    for (const s of sesi) {
      const t = new Date(s.tarikh);
      const k = keKunciTarikh(t);
      const arr = map.get(k) ?? [];
      arr.push(s);
      map.set(k, arr);
    }
    return map;
  }, [sesi]);

  const bulanTahunLabel = `${NAMA_BULAN[bulan]} ${tahun}`;

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base lg:text-lg flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-emerald-700" />
              {bulanTahunLabel}
            </CardTitle>
            <CardDescription className="text-xs">
              Klik chip sesi untuk ambil kehadiran. Hijau = Selesai, Ambar = Dirancang/Tangguh, Merah = Dibatalkan.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setKursor(new Date(tahun, bulan - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setKursor(new Date(hariIni.getFullYear(), hariIni.getMonth(), 1))}>
              Hari Ini
            </Button>
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setKursor(new Date(tahun, bulan + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 lg:p-4">
        {/* Header hari */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {NAMA_HARI_PENDEK.map((h) => (
            <div key={h} className="text-center text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase py-1">
              {h}
            </div>
          ))}
        </div>
        {/* Grid hari */}
        <div className="grid grid-cols-7 gap-1">
          {selHari.map((d, i) => {
            const k = keKunciTarikh(d);
            const sesiHari = sesiMengikutHari.get(k) ?? [];
            const dalamBulan = d.getMonth() === bulan;
            const isHariIni = samaHari(d, hariIni);
            return (
              <div
                key={i}
                className={cn(
                  "min-h-[80px] lg:min-h-[110px] rounded-md border p-1 flex flex-col gap-0.5 overflow-hidden",
                  dalamBulan ? "bg-card" : "bg-muted/30 opacity-60",
                  isHariIni && "ring-2 ring-emerald-500",
                )}
              >
                <div className={cn(
                  "text-[10px] lg:text-xs font-medium",
                  isHariIni ? "text-emerald-700 font-bold" : "text-muted-foreground",
                )}>
                  {d.getDate()}
                </div>
                <div className="flex-1 space-y-0.5 overflow-y-auto scroll-area-custom max-h-[80px] lg:max-h-[90px]">
                  {sesiHari.map((s) => (
                    <ChipSesiKalendar
                      key={s.id}
                      sesi={s}
                      onClick={() => navigasi("kehadiran", { sesiId: s.id })}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Senarai penuh sesi pada bulan ini (untuk tindakan lanjut) */}
        <Separator className="my-4" />
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            Sesi pada {bulanTahunLabel} ({sesi.filter((s) => {
              const t = new Date(s.tarikh);
              return t.getFullYear() === tahun && t.getMonth() === bulan;
            }).length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {sesi
              .filter((s) => {
                const t = new Date(s.tarikh);
                return t.getFullYear() === tahun && t.getMonth() === bulan;
              })
              .sort((a, b) => new Date(a.tarikh).getTime() - new Date(b.tarikh).getTime())
              .map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-md border p-2">
                  <div className="flex flex-col items-center justify-center min-w-[44px] px-2 py-1 rounded bg-emerald-50 text-emerald-800">
                    <span className="text-[10px] uppercase">{NAMA_BULAN[new Date(s.tarikh).getMonth()].slice(0, 3)}</span>
                    <span className="text-lg font-bold leading-none">{new Date(s.tarikh).getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{s.tajuk}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {s.unit.nama} - {s.masaMula}-{s.masaTamat}
                    </p>
                  </div>
                  <BadgeSesi status={s.status} />
                  <MenuTindakan
                    sesi={s}
                    navigasi={navigasi}
                    onBatalTangguh={onBatalTangguh}
                    kemaskiniMemuat={kemaskiniMemuat}
                  />
                </div>
              ))}
            {sesi.filter((s) => {
              const t = new Date(s.tarikh);
              return t.getFullYear() === tahun && t.getMonth() === bulan;
            }).length === 0 && (
              <p className="text-xs text-muted-foreground italic py-2">Tiada sesi pada bulan ini.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChipSesiKalendar({ sesi, onClick }: { sesi: SesiItem; onClick: () => void }) {
  const warna: Record<string, string> = {
    DIRANCANG: "bg-amber-100 text-amber-900 hover:bg-amber-200 border-amber-300",
    DITANGGUH: "bg-amber-100 text-amber-900 hover:bg-amber-200 border-amber-300",
    SELESAI: "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border-emerald-300",
    DIBATALKAN: "bg-red-100 text-red-900 hover:bg-red-200 border-red-300 line-through",
  };
  return (
    <button
      onClick={onClick}
      title={`${sesi.tajuk} - ${sesi.unit.nama} (${sesi.masaMula})`}
      className={cn(
        "block w-full text-left text-[10px] lg:text-[11px] truncate rounded px-1 py-0.5 border transition",
        warna[sesi.status] ?? "bg-muted text-muted-foreground",
      )}
    >
      <span className="font-medium">{sesi.masaMula}</span> {sesi.tajuk}
    </button>
  );
}
