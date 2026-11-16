"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import {
  apiFetch,
  formatTarikh,
  labelStatusKehadiran,
  senaraiStatusKehadiran,
} from "@/lib/format";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BadgeSesi, BadgeKategori } from "@/components/spk/badges";

import {
  CheckCircle2,
  XCircle,
  Clock,
  Stethoscope,
  Briefcase,
  Lock,
  Unlock,
  Save,
  Send,
  ArrowLeft,
  AlertTriangle,
  Users,
  CalendarDays,
  MapPin,
  Clock as ClockIcon,
  Loader2,
  ClipboardCheck,
  TrendingDown,
  Info,
} from "lucide-react";

// ---------- Jenis ----------

interface UnitSesi {
  id: string;
  nama: string;
  kategori: string;
}

interface MuridRingkas {
  id: string;
  noMurid: string;
  nama: string;
  tahun: number;
  kelas: string;
}

interface KehadiranRekod {
  id?: string;
  muridId: string;
  status: string;
  catatan?: string | null;
  dikunci: boolean;
  murid: MuridRingkas;
}

interface SesiKehadiran {
  id: string;
  tajuk: string;
  tarikh: string;
  masaMula: string;
  masaTamat: string;
  tempat?: string | null;
  status: string;
  unit: UnitSesi;
  kehadiran: KehadiranRekod[];
}

// Konfigurasi butang status (FR-12.1)
const STATUS_CONFIG: Record<
  string,
  { label: string; ikon: React.ReactNode; warna: string; ring: string }
> = {
  HADIR: {
    label: "Hadir",
    ikon: <CheckCircle2 className="h-4 w-4" />,
    warna: "bg-emerald-500 text-white hover:bg-emerald-600",
    ring: "ring-emerald-500",
  },
  TIDAK_HADIR: {
    label: "Tidak Hadir",
    ikon: <XCircle className="h-4 w-4" />,
    warna: "bg-red-500 text-white hover:bg-red-600",
    ring: "ring-red-500",
  },
  LEWAT: {
    label: "Lewat",
    ikon: <Clock className="h-4 w-4" />,
    warna: "bg-amber-500 text-white hover:bg-amber-600",
    ring: "ring-amber-500",
  },
  SAKIT: {
    label: "Sakit (MC)",
    ikon: <Stethoscope className="h-4 w-4" />,
    warna: "bg-sky-500 text-white hover:bg-sky-600",
    ring: "ring-sky-500",
  },
  URUSAN_RASMI: {
    label: "Urusan",
    ikon: <Briefcase className="h-4 w-4" />,
    warna: "bg-violet-500 text-white hover:bg-violet-600",
    ring: "ring-violet-500",
  },
};

// ====================================================================
// Komponen Utama
// ====================================================================

export function KehadiranView() {
  const sesiIdAktif = useAppStore((s) => s.sesiIdAktif);
  const navigasi = useAppStore((s) => s.navigasi);

  if (!sesiIdAktif) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <ClipboardCheck className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Pilih sesi dari paparan Sesi Aktiviti untuk ambil kehadiran.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigasi("sesi-senarai")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Kembali ke Sesi Aktiviti
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <KehadiranContent sesiId={sesiIdAktif} />;
}

function KehadiranContent({ sesiId }: { sesiId: string }) {
  const navigasi = useAppStore((s) => s.navigasi);
  const pengguna = useAppStore((s) => s.pengguna);
  const qc = useQueryClient();

  // State tempatan kehadiran (sentuh-mesra, kemaskini serta-merta)
  const [rekod, setRekod] = React.useState<KehadiranRekod[]>([]);
  const [dikunciSedia, setDikunciSedia] = React.useState(false);

  const { data, isLoading, isError, refetch } = useQuery<{ sesi: SesiKehadiran }>({
    queryKey: ["attendance", sesiId],
    queryFn: () => apiFetch(`/api/sessions/${sesiId}/attendance`),
  });

  // Sync state apabila data dimuatkan
  React.useEffect(() => {
    if (data?.sesi) {
      const k = data.sesi.kehadiran.map((r) => ({ ...r }));
      setRekod(k);
      setDikunciSedia(k.some((r) => r.dikunci));
    }
  }, [data]);

  // Mutasi sentiasa dipanggil (tanpa early return) untuk patuh Rules of Hooks
  const mutSimpan = useMutation({
    mutationFn: (args: { dikunciKah: boolean; rekod: KehadiranRekod[] }) =>
      apiFetch(`/api/sessions/${sesiId}/attendance`, {
        method: "PUT",
        body: JSON.stringify({
          dikunci: args.dikunciKah,
          kehadiran: args.rekod.map((r) => ({
            muridId: r.muridId,
            status: r.status,
            catatan: r.catatan ?? "",
          })),
        }),
      }),
    onSuccess: (_d, args) => {
      if (args.dikunciKah) {
        toast.success("Kehadiran dihantar dan dikunci.");
        setDikunciSedia(true);
      } else {
        toast.success("Draf kehadiran disimpan.");
      }
      qc.invalidateQueries({ queryKey: ["attendance", sesiId] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (e: Error) => toast.error(e.message || "Ralat menyimpan kehadiran."),
  });

  const mutUnlock = useMutation({
    mutationFn: () =>
      apiFetch(`/api/sessions/${sesiId}/attendance?action=unlock`, { method: "PATCH" }),
    onSuccess: () => {
      toast.success("Kehadiran dibuka kunci. Boleh kemaskini semula.");
      setDikunciSedia(false);
      setRekod((prev) => prev.map((r) => ({ ...r, dikunci: false })));
      qc.invalidateQueries({ queryKey: ["attendance", sesiId] });
    },
    onError: (e: Error) => toast.error(e.message || "Ralat membuka kunci."),
  });

  // Adakah ada perubahan belum disimpan? (ringkas: banding dengan data asal)
  const adaPerubahan = React.useMemo(() => {
    const asal = data?.sesi.kehadiran ?? [];
    if (asal.length !== rekod.length) return true;
    return rekod.some((r, i) => {
      const a = asal[i];
      if (!a) return true;
      return a.status !== r.status || (a.catatan ?? "") !== (r.catatan ?? "");
    });
  }, [rekod, data]);

  if (isLoading) return <KehadiranSkeleton />;
  if (isError || !data?.sesi) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 mx-auto text-red-500" />
          <p className="text-sm text-muted-foreground">Sesi tidak dijumpai atau anda tiada akses.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <Loader2 className="h-4 w-4 mr-1" /> Cuba semula
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sesi = data.sesi;
  const dikunci = dikunciSedia;
  const bolehEdit = !dikunci || pengguna?.peranan === "PK" || pengguna?.peranan === "ADMIN";
  const bolehUnlock = pengguna?.peranan === "PK" || pengguna?.peranan === "ADMIN";

  // Kira ringkasan
  const jumlah = rekod.length;
  const hadir = rekod.filter((r) => r.status === "HADIR").length;
  const lewat = rekod.filter((r) => r.status === "LEWAT").length;
  const tidakHadir = rekod.filter((r) => r.status === "TIDAK_HADIR").length;
  const sakit = rekod.filter((r) => r.status === "SAKIT").length;
  const urusan = rekod.filter((r) => r.status === "URUSAN_RASMI").length;
  const peratus = jumlah > 0 ? Math.round(((hadir + lewat) / jumlah) * 100) : 0;
  const rendah = peratus < 80;

  // Tukar status satu murid
  const setStatus = (muridId: string, status: string) => {
    if (dikunci && !bolehUnlock) return;
    setRekod((prev) =>
      prev.map((r) => (r.muridId === muridId ? { ...r, status } : r)),
    );
  };

  const setCatatan = (muridId: string, catatan: string) => {
    if (dikunci && !bolehUnlock) return;
    setRekod((prev) =>
      prev.map((r) => (r.muridId === muridId ? { ...r, catatan } : r)),
    );
  };

  const tandaSemuaHadir = () => {
    if (dikunci && !bolehUnlock) return;
    setRekod((prev) => prev.map((r) => ({ ...r, status: "HADIR" })));
    toast.success("Semua murid ditanda HADIR.");
  };

  return (
    <div className="space-y-4 lg:space-y-5 pb-32 lg:pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit -ml-2 text-muted-foreground"
          onClick={() => navigasi("sesi-senarai")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
        </Button>

        <Card className="shadow-none border-emerald-200/50">
          <CardContent className="p-4 lg:p-5 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1 min-w-0">
                <h1 className="text-lg lg:text-xl font-bold text-emerald-900 line-clamp-2">{sesi.tajuk}</h1>
                <p className="text-sm text-muted-foreground">{sesi.unit.nama}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <BadgeKategori kategori={sesi.unit.kategori} />
                <BadgeSesi status={sesi.status} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                {formatTarikh(sesi.tarikh)}
              </div>
              <div className="flex items-center gap-1.5">
                <ClockIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {sesi.masaMula} - {sesi.masaTamat}
              </div>
              <div className="flex items-center gap-1.5 col-span-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {sesi.tempat || "Tiada tempat"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Banner dikunci */}
      {dikunci && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-amber-700 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-amber-900">Kehadiran Telah Dikunci</p>
                <p className="text-xs text-amber-800">
                  Kehadiran telah dikunci. Hanya PK Kokurikulum boleh membuka kunci.
                </p>
              </div>
            </div>
            {bolehUnlock && (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-400 text-amber-800 hover:bg-amber-100"
                disabled={mutUnlock.isPending}
                onClick={() => mutUnlock.mutate()}
              >
                {mutUnlock.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Unlock className="h-4 w-4 mr-1" />
                )}
                Buka Kunci
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ringkasan Bento (FR-15) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-3">
        <CardRingkasan ikon={<Users className="h-4 w-4" />} label="Jumlah Murid" nilai={jumlah} warna="text-emerald-700 bg-emerald-50" />
        <CardRingkasan ikon={<CheckCircle2 className="h-4 w-4" />} label="Hadir" nilai={hadir} warna="text-emerald-700 bg-emerald-50" />
        <CardRingkasan ikon={<Clock className="h-4 w-4" />} label="Lewat" nilai={lewat} warna="text-amber-700 bg-amber-50" />
        <CardRingkasan ikon={<XCircle className="h-4 w-4" />} label="Tidak Hadir" nilai={tidakHadir} warna="text-red-700 bg-red-50" />
        <CardPeratus peratus={peratus} rendah={rendah} />
      </div>

      {/* Bar peratus */}
      <Card className="shadow-none">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Peratus Kehadiran</span>
            <span className={cn("font-bold", rendah ? "text-amber-700" : "text-emerald-700")}>
              {peratus}%
            </span>
          </div>
          <Progress value={peratus} className={cn(rendah && "[&_[data-slot=progress-indicator]]:bg-amber-500")} />
          {rendah && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700">
              <TrendingDown className="h-3.5 w-3.5" />
              Kehadiran rendah (di bawah 80%). Sila semak dan tingkatkan penglibatan murid.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tindakan pukal */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          className="flex-1 h-11 gap-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          onClick={tandaSemuaHadir}
          disabled={!bolehEdit}
        >
          <CheckCircle2 className="h-4 w-4" /> Tanda Semua Hadir
        </Button>
        {(sakit + urusan) > 0 && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground px-2">
            <Stethoscope className="h-3.5 w-3.5" /> Sakit: {sakit}
            <Briefcase className="h-3.5 w-3.5" /> Urusan: {urusan}
          </div>
        )}
      </div>

      {/* Senarai murid */}
      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-700" /> Senarai Murid
          </CardTitle>
          <CardDescription className="text-xs">
            Ketik butang status untuk setiap murid. Medan catatan adalah pilihan.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rekod.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Tiada ahli unit direkodkan. Sila tambah ahli pada paparan Unit & Keahlian.
            </div>
          ) : (
            <div className="divide-y">
              {rekod.map((r, idx) => (
                <KadMurid
                  key={r.muridId}
                  rekod={r}
                  noGiliran={idx + 1}
                  dikunci={dikunci && !bolehUnlock}
                  onStatus={(s) => setStatus(r.muridId, s)}
                  onCatatan={(c) => setCatatan(r.muridId, c)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bar Simpan / Hantar sticky (mobile) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur p-3 lg:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="flex-1 h-11 gap-1.5"
            disabled={!bolehEdit || mutSimpan.isPending || !adaPerubahan}
            onClick={() => mutSimpan.mutate({ dikunciKah: false, rekod })}
          >
            {mutSimpan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Draf
          </Button>
          <AlertDialogHantar
            onHantar={() => mutSimpan.mutate({ dikunciKah: true, rekod })}
            memuat={mutSimpan.isPending}
            boleh={bolehEdit}
          />
        </div>
        {adaPerubahan && !dikunci && (
          <p className="text-[10px] text-amber-700 mt-1 text-center">
            Terdapat perubahan belum disimpan.
          </p>
        )}
      </div>

      {/* Bar desktop */}
      <div className="hidden lg:flex items-center justify-end gap-2 border-t pt-4">
        {adaPerubahan && !dikunci && (
          <p className="text-xs text-amber-700 mr-auto flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Terdapat perubahan belum disimpan.
          </p>
        )}
        <Button
          variant="outline"
          className="h-10 gap-1.5"
          disabled={!bolehEdit || mutSimpan.isPending || !adaPerubahan}
          onClick={() => mutSimpan.mutate({ dikunciKah: false, rekod })}
        >
          {mutSimpan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Draf
        </Button>
        <AlertDialogHantar
          onHantar={() => mutSimpan.mutate({ dikunciKah: true, rekod })}
          memuat={mutSimpan.isPending}
          boleh={bolehEdit}
        />
      </div>
    </div>
  );
}

// ====================================================================
// Kad Ringkasan (Bento)
// ====================================================================

function CardRingkasan({
  ikon, label, nilai, warna,
}: { ikon: React.ReactNode; label: string; nilai: number; warna: string }) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-3 space-y-1">
        <div className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium", warna)}>
          {ikon} {label}
        </div>
        <p className="text-xl lg:text-2xl font-bold tabular-nums">{nilai}</p>
      </CardContent>
    </Card>
  );
}

function CardPeratus({ peratus, rendah }: { peratus: number; rendah: boolean }) {
  return (
    <Card className={cn("shadow-none", rendah && "border-amber-300")}>
      <CardContent className="p-3 space-y-1">
        <div className={cn(
          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
          rendah ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800",
        )}>
          {rendah ? <TrendingDown className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Peratus
        </div>
        <div className="flex items-end gap-1.5">
          <p className={cn("text-xl lg:text-2xl font-bold tabular-nums", rendah ? "text-amber-700" : "text-emerald-700")}>
            {peratus}%
          </p>
          {rendah && <Badge className="bg-amber-200 text-amber-900 text-[10px] hover:bg-amber-200">Rendah</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

// ====================================================================
// Kad Murid + Butang Status Besar
// ====================================================================

function KadMurid({
  rekod, noGiliran, dikunci, onStatus, onCatatan,
}: {
  rekod: KehadiranRekod;
  noGiliran: number;
  dikunci: boolean;
  onStatus: (status: string) => void;
  onCatatan: (catatan: string) => void;
}) {
  const [tunjukCatatan, setTunjukCatatan] = React.useState(!!rekod.catatan);
  const statusAktif = rekod.status;

  return (
    <div className="p-3 lg:p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold shrink-0">
          {noGiliran}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground line-clamp-1">{rekod.murid.nama}</p>
          <p className="text-[11px] text-muted-foreground">
            No. {rekod.murid.noMurid} - Tahun {rekod.murid.tahun} {rekod.murid.kelas}
          </p>
        </div>
        <span className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
          rekod.status === "HADIR" && "bg-emerald-100 text-emerald-800",
          rekod.status === "TIDAK_HADIR" && "bg-red-100 text-red-800",
          rekod.status === "LEWAT" && "bg-amber-100 text-amber-800",
          rekod.status === "SAKIT" && "bg-sky-100 text-sky-800",
          rekod.status === "URUSAN_RASMI" && "bg-violet-100 text-violet-800",
        )}>
          {STATUS_CONFIG[rekod.status]?.ikon}
          {labelStatusKehadiran[rekod.status]}
        </span>
      </div>

      {/* Butang status besar - min 44px */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 lg:gap-2">
        {senaraiStatusKehadiran.map((st) => {
          const c = STATUS_CONFIG[st];
          const aktif = statusAktif === st;
          return (
            <button
              key={st}
              type="button"
              disabled={dikunci}
              onClick={() => onStatus(st)}
              className={cn(
                "min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition select-none",
                "border",
                aktif
                  ? cn(c.warna, "border-transparent ring-2", c.ring)
                  : "bg-muted/40 text-muted-foreground hover:bg-muted border-transparent",
                dikunci && !aktif && "opacity-50 cursor-not-allowed",
              )}
              aria-pressed={aktif}
              aria-label={c.label}
            >
              {c.ikon}
              <span className="leading-tight text-center">{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Toggle catatan */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          disabled={dikunci}
          onClick={() => setTunjukCatatan((v) => !v)}
        >
          <Info className="h-3.5 w-3.5 mr-1" />
          {tunjukCatatan ? "Sembunyi Catatan" : "Tambah Catatan"}
        </Button>
        {rekod.catatan && !tunjukCatatan && (
          <span className="text-[11px] text-muted-foreground truncate">Catatan sedia ada: {rekod.catatan}</span>
        )}
      </div>
      {tunjukCatatan && (
        <Textarea
          value={rekod.catatan ?? ""}
          onChange={(e) => onCatatan(e.target.value)}
          placeholder="Catatan pilihan (cth: kebenaran ibu bapa, ringkasan MC...)"
          className="text-sm min-h-[60px]"
          disabled={dikunci}
        />
      )}
    </div>
  );
}

// ====================================================================
// AlertDialog Hantar & Kunci
// ====================================================================

function AlertDialogHantar({
  onHantar, memuat, boleh,
}: { onHantar: () => void; memuat: boolean; boleh: boolean }) {
  const [buka, setBuka] = React.useState(false);
  return (
    <AlertDialog open={buka} onOpenChange={setBuka}>
      <AlertDialogTrigger asChild>
        <Button
          className="flex-1 lg:flex-none h-11 lg:h-10 gap-1.5 bg-emerald-700 hover:bg-emerald-700"
          disabled={!boleh || memuat}
        >
          {memuat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Hantar &amp; Kunci
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-600" /> Sahkan Hantar &amp; Kunci Kehadiran
          </AlertDialogTitle>
          <AlertDialogDescription>
            Anda akan mengunci kehadiran. Tidak boleh diubah selepas ini melainkan dibuka kunci oleh PK Kokurikulum.
            Sila pastikan semua status murid telah disemak dengan teliti.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-emerald-700 hover:bg-emerald-700"
            onClick={() => {
              setBuka(false);
              onHantar();
            }}
          >
            <Send className="h-4 w-4 mr-1" /> Ya, Hantar &amp; Kunci
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ====================================================================
// Skeleton
// ====================================================================

function KehadiranSkeleton() {
  return (
    <div className="space-y-4 pb-32">
      <Skeleton className="h-8 w-32" />
      <Card><CardContent className="p-4 space-y-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      </CardContent></Card>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4 space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, j) => <Skeleton key={j} className="h-12" />)}
            </div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
