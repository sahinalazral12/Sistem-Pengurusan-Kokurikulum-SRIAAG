"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, formatTarikh, formatTarikhPendek } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeLaporan, BadgeKategori } from "@/components/spk/badges";
import {
  FileText,
  Plus,
  Search,
  AlertCircle,
  Inbox,
  ArrowRight,
  Eye,
  PencilLine,
} from "lucide-react";

// ----- Jenis -----
interface UnitRingkas {
  id: string;
  nama: string;
  kategori: string;
}
interface SesiRingkas {
  id: string;
  tajuk: string;
  tarikh: string;
  unit: UnitRingkas;
}
interface DiciptaOleh {
  nama: string;
}
interface LaporanItem {
  id: string;
  sesiId: string;
  objektif: string | null;
  status: string;
  komenSemakan?: string | null;
  tarikhHantar?: string | null;
  tarikhLulus?: string | null;
  updatedAt: string;
  sesi: SesiRingkas;
  diciptaOleh: DiciptaOleh;
}

export function LaporanSenarai() {
  const pengguna = useAppStore((s) => s.pengguna);
  const navigasi = useAppStore((s) => s.navigasi);
  const qc = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<string>("SEMUA");
  const [filterUnit, setFilterUnit] = useState<string>("SEMUA");
  const [carian, setCarian] = useState<string>("");
  const [dialogCipta, setDialogCipta] = useState(false);
  const [sesiDipilih, setSesiDipilih] = useState<string>("");
  const [dialogMula, setDialogMula] = useState(false);

  const ialahPK = pengguna?.peranan === "PK" || pengguna?.peranan === "ADMIN";

  // Senarai unit untuk filter
  const { data: dataUnit } = useQuery<{ units: UnitRingkas[] }>({
    queryKey: ["units", "ringkas"],
    queryFn: () => apiFetch("/api/units"),
  });

  // Senarai laporan
  const { data, isLoading, isError } = useQuery<{ laporan: LaporanItem[] }>({
    queryKey: ["laporan", filterStatus, filterUnit],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterStatus !== "SEMUA") params.set("status", filterStatus);
      if (filterUnit !== "SEMUA") params.set("unitId", filterUnit);
      const qs = params.toString();
      return apiFetch(`/api/reports${qs ? `?${qs}` : ""}`);
    },
  });

  // Senarai sesi SELESAI tanpa laporan (untuk cipta)
  const { data: dataSesi, isLoading: loadingSesi } = useQuery<{ sesi: SesiRingkas[] }>({
    queryKey: ["sesi", "SELESAI", "tiada-laporan"],
    queryFn: () => apiFetch("/api/sessions?status=SELESAI"),
    enabled: dialogCipta,
  });

  const mutCipta = useMutation({
    mutationFn: (sesiId: string) =>
      apiFetch<{ laporan: { id: string } }>("/api/reports", {
        method: "POST",
        body: JSON.stringify({ sesiId }),
      }),
    onSuccess: (res) => {
      toast.success("Laporan baru dicipta.", {
        description: "Anda kini boleh mengisi kandungan laporan.",
      });
      qc.invalidateQueries({ queryKey: ["laporan"] });
      qc.invalidateQueries({ queryKey: ["sesi", "SELESAI"] });
      setDialogCipta(false);
      setSesiDipilih("");
      navigasi("laporan-borang", { laporanId: res.laporan.id });
    },
    onError: (e: Error) => toast.error("Gagal mencipta laporan.", { description: e.message }),
  });

  const senarai = useMemo(() => {
    const senaraiAsal = data?.laporan ?? [];
    if (!carian.trim()) return senaraiAsal;
    const q = carian.toLowerCase();
    return senaraiAsal.filter((l) =>
      (l.objektif ?? "").toLowerCase().includes(q) ||
      l.sesi.tajuk.toLowerCase().includes(q) ||
      l.sesi.unit.nama.toLowerCase().includes(q) ||
      (l.diciptaOleh?.nama ?? "").toLowerCase().includes(q)
    );
  }, [data, carian]);

  const perluSemakan = useMemo(
    () => senarai.filter((l) => l.status === "DIHANTAR").length,
    [senarai]
  );

  const bukaCipta = () => {
    setSesiDipilih("");
    setDialogCipta(true);
  };

  const sahCipta = () => {
    if (!sesiDipilih) {
      toast.error("Sila pilih satu sesi terlebih dahulu.");
      return;
    }
    mutCipta.mutate(sesiDipilih);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-emerald-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-700" />
            Laporan Aktiviti Guru
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Urus dan semak laporan aktiviti kokurikulum. Guru mencipta laporan daripada sesi yang
            telah selesai, manakala Penyelaras Kokurikulum (PK) menyemak dan meluluskan laporan
            yang dihantar.
          </p>
        </div>
        <Button onClick={bukaCipta} className="bg-emerald-700 hover:bg-emerald-800 self-start sm:self-auto">
          <Plus className="h-4 w-4 mr-1" /> Cipta Laporan
        </Button>
      </div>

      {/* Nota PK */}
      {ialahPK && perluSemakan > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">{perluSemakan} laporan menunggu semakan</p>
            <p className="text-xs text-amber-800">
              Sila semak dan luluskan atau kembalikan laporan berstatus <strong>Dihantar</strong>{" "}
              yang diserlahkan di bawah.
            </p>
          </div>
        </div>
      )}

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="f-status" className="text-xs">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="f-status">
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEMUA">Semua Status</SelectItem>
                  <SelectItem value="DRAF">Draf</SelectItem>
                  <SelectItem value="DIHANTAR">Dihantar</SelectItem>
                  <SelectItem value="DIKEMBALIKAN">Dikembalikan</SelectItem>
                  <SelectItem value="DILULUSKAN">Diluluskan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-unit" className="text-xs">Unit</Label>
              <Select value={filterUnit} onValueChange={setFilterUnit}>
                <SelectTrigger id="f-unit">
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
            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor="f-cari" className="text-xs">Carian</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="f-cari"
                  placeholder="Cari tajuk, objektif, unit atau nama guru..."
                  value={carian}
                  onChange={(e) => setCarian(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Senarai */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            Gagal memuatkan senarai laporan. Sila cuba semula.
          </CardContent>
        </Card>
      ) : senarai.length === 0 ? (
        <EmptyState onCipta={bukaCipta} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {senarai.map((laporan) => (
            <LaporanCard
              key={laporan.id}
              laporan={laporan}
              ialahPK={ialahPK}
              onBuka={() => navigasi("laporan-borang", { laporanId: laporan.id })}
            />
          ))}
        </div>
      )}

      {/* Dialog Cipta Laporan */}
      <Dialog open={dialogCipta} onOpenChange={setDialogCipta}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cipta Laporan Aktiviti</DialogTitle>
            <DialogDescription>
              Pilih satu sesi yang berstatus <strong>Selesai</strong> untuk dicipta laporannya.
              Sesi yang telah mempunyai laporan tidak akan dipaparkan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Label className="text-xs">Pilih Sesi Selesai</Label>
            {loadingSesi ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (dataSesi?.sesi ?? []).length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                Tiada sesi selesai tanpa laporan buat masa ini.
              </div>
            ) : (
              <ScrollArea className="h-64 rounded-md border">
                <ul className="divide-y">
                  {dataSesi?.sesi.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => setSesiDipilih(s.id)}
                        className={`w-full text-left px-3 py-2.5 transition ${
                          sesiDipilih === s.id
                            ? "bg-emerald-50 border-l-4 border-emerald-600"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{s.tajuk}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {s.unit.nama} · {formatTarikhPendek(s.tarikh)}
                            </p>
                          </div>
                          <BadgeKategori kategori={s.unit.kategori} />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCipta(false)} disabled={mutCipta.isPending}>
              Batal
            </Button>
            <Button
              onClick={() => setDialogMula(true)}
              disabled={!sesiDipilih || mutCipta.isPending}
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              Cipta Laporan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog pengesahan cipta */}
      <AlertDialog open={dialogMula} onOpenChange={setDialogMula}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sahkan Cipta Laporan?</AlertDialogTitle>
            <AlertDialogDescription>
              Laporan kosong akan dicipta berdasarkan sesi yang dipilih. Anda akan dialihkan ke
              borang laporan untuk mengisi kandungan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutCipta.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                sahCipta();
              }}
              disabled={mutCipta.isPending}
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              {mutCipta.isPending ? "Sedang mencipta..." : "Sahkan & Cipta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LaporanCard({
  laporan,
  ialahPK,
  onBuka,
}: {
  laporan: LaporanItem;
  ialahPK: boolean;
  onBuka: () => void;
}) {
  const perluSemakan = ialahPK && laporan.status === "DIHANTAR";
  return (
    <Card
      className={`flex flex-col transition hover:shadow-md ${
        perluSemakan ? "ring-2 ring-amber-400 border-amber-300" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base leading-tight line-clamp-2">
              {laporan.sesi.tajuk}
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1.5 flex-wrap">
              <span>{laporan.sesi.unit.nama}</span>
              <span aria-hidden>·</span>
              <span>{formatTarikhPendek(laporan.sesi.tarikh)}</span>
            </CardDescription>
          </div>
          <BadgeLaporan status={laporan.status} />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <BadgeKategori kategori={laporan.sesi.unit.kategori} />
          {perluSemakan && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              <AlertCircle className="h-3 w-3" /> Perlu Semakan
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
          {laporan.objektif ?? (
            <em className="text-muted-foreground/60">Objektif belum diisi.</em>
          )}
        </p>
        <div className="mt-auto space-y-1 text-xs text-muted-foreground border-t pt-3">
          <div className="flex items-center justify-between">
            <span>Dicipta oleh</span>
            <span className="font-medium text-foreground">{laporan.diciptaOleh?.nama ?? "-"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Tarikh hantar</span>
            <span className="font-medium text-foreground">
              {laporan.tarikhHantar ? formatTarikhPendek(laporan.tarikhHantar) : "-"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Dikemaskini</span>
            <span className="font-medium text-foreground">{formatTarikhPendek(laporan.updatedAt)}</span>
          </div>
        </div>
        <Button onClick={onBuka} variant="outline" size="sm" className="w-full">
          {laporan.status === "DRAF" || laporan.status === "DIKEMBALIKAN" ? (
            <>
              <PencilLine className="h-4 w-4 mr-1" /> Borang
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-1" /> Lihat
            </>
          )}
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onCipta }: { onCipta: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <Inbox className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold">Tiada laporan dipaparkan</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Tiada laporan yang sepadan dengan tapisan anda. Cipta laporan baharu daripada sesi
          aktiviti yang telah selesai.
        </p>
        <Button onClick={onCipta} className="mt-4 bg-emerald-700 hover:bg-emerald-800">
          <Plus className="h-4 w-4 mr-1" /> Cipta Laporan
        </Button>
      </CardContent>
    </Card>
  );
}
