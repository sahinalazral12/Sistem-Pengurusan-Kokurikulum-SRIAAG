"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users, Search, Plus, MapPin, Clock, CalendarDays, UserCheck, UserCog, Loader2, LayoutGrid,
} from "lucide-react";

import { useAppStore } from "@/lib/store";
import { apiFetch } from "@/lib/format";
import { BadgeKategori } from "@/components/spk/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ---- Jenis ----
interface PenggunaRingkas { id: string; email: string; nama: string; peranan: string; aktif: boolean; }
interface UnitRingkas {
  id: string;
  nama: string;
  kategori: "BERUNIFORM" | "KELAB" | "SUKAN";
  hari?: string | null;
  masa?: string | null;
  tempat?: string | null;
  aktif: boolean;
  guruUtama?: { nama: string } | null;
  guruPembantu?: { nama: string } | null;
  _count: { keahlian: number };
}

const KATEGORI_TAB = [
  { nilai: "", label: "Semua" },
  { nilai: "BERUNIFORM", label: "Badan Beruniform" },
  { nilai: "KELAB", label: "Kelab/Persatuan" },
  { nilai: "SUKAN", label: "Sukan/Permainan" },
] as const;

const SENARAI_HARI = ["ISNIN", "SELASA", "RABU", "KHAMIS", "JUMAAT", "SABTU"];

export function UnitSenarai() {
  const pengguna = useAppStore((s) => s.pengguna);
  const navigasi = useAppStore((s) => s.navigasi);
  const peranan = pengguna?.peranan ?? "GURU";
  const bolehUrus = peranan === "PK" || peranan === "ADMIN";

  const [kategori, setKategori] = useState<string>("");
  const [q, setQ] = useState("");
  const [dialogTambah, setDialogTambah] = useState(false);

  const qc = useQueryClient();

  // Carian debounce ringkas
  const [qDebounce, setQDebounce] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQDebounce(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Senarai unit
  const { data, isLoading, isError, error } = useQuery<{ units: UnitRingkas[] }>({
    queryKey: ["units", kategori, qDebounce],
    queryFn: () => {
      const params = new URLSearchParams();
      if (kategori) params.set("kategori", kategori);
      if (qDebounce) params.set("q", qDebounce);
      return apiFetch(`/api/units?${params.toString()}`);
    },
  });

  // Senarai pengguna (untuk dropdown guru) - PK/ADMIN sahaja
  const { data: dataPengguna } = useQuery<{ pengguna: PenggunaRingkas[] }>({
    queryKey: ["pengguna"],
    queryFn: () => apiFetch(`/api/pengguna`),
    enabled: bolehUrus,
  });

  const senaraiGuru = useMemo(() => {
    const sen = dataPengguna?.pengguna ?? [];
    return sen.filter((p) => (p.peranan === "GURU" || p.peranan === "PK") && p.aktif);
  }, [dataPengguna]);

  // Mutasi tambah unit
  const tambahMut = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<{ unit: UnitRingkas }>("/api/units", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Unit berjaya ditambah.");
      qc.invalidateQueries({ queryKey: ["units"] });
      setDialogTambah(false);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal menambah unit."),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900 flex items-center gap-2">
            <Users className="h-6 w-6" /> Unit Kokurikulum
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pengurusan badan beruniform, kelab/persatuan dan sukan/permainan. Tahap 2 (Tahun 4 - 6).
          </p>
        </div>
        {bolehUrus && (
          <Dialog open={dialogTambah} onOpenChange={setDialogTambah}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-700 hover:bg-emerald-800 text-white">
                <Plus className="h-4 w-4 mr-1" /> Tambah Unit
              </Button>
            </DialogTrigger>
            <DialogTambahUnit
              senaraiGuru={senaraiGuru}
              sedangHantar={tambahMut.isPending}
              onHantar={(body) => tambahMut.mutate(body)}
              onTutup={() => setDialogTambah(false)}
            />
          </Dialog>
        )}
      </div>

      {/* Filter + Carian */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {KATEGORI_TAB.map((k) => (
                <Button
                  key={k.nilai}
                  size="sm"
                  variant={kategori === k.nilai ? "default" : "outline"}
                  className={cn(
                    kategori === k.nilai && "bg-emerald-700 hover:bg-emerald-800 text-white"
                  )}
                  onClick={() => setKategori(k.nilai)}
                >
                  {k.label}
                </Button>
              ))}
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama unit..."
                className="pl-9"
                aria-label="Cari unit"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Senarai Unit */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
          <p className="mt-2 text-sm">Memuatkan senarai unit...</p>
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="p-6 text-center text-destructive">
            {(error as Error)?.message || "Ralat memuatkan unit."}
          </CardContent>
        </Card>
      ) : !data?.units?.length ? (
        <EmptyState bolehUrus={bolehUrus} onTambah={() => setDialogTambah(true)} />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.units.map((u) => (
            <CardUnit key={u.id} unit={u} onLihat={() => navigasi("unit-butiran", { unitId: u.id })} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Sub-komponen ----

function CardUnit({ unit, onLihat }: { unit: UnitRingkas; onLihat: () => void }) {
  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow border-emerald-100">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold text-emerald-900 line-clamp-2">{unit.nama}</CardTitle>
          <BadgeKategori kategori={unit.kategori} />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-1 flex-1 flex flex-col gap-3">
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <UserCog className="h-3.5 w-3.5 text-emerald-700" />
            <span className="font-medium text-foreground">{unit.guruUtama?.nama ?? "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <UserCheck className="h-3.5 w-3.5" />
            <span>Pembantu: {unit.guruPembantu?.nama ?? "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{unit.hari ? labelHari(unit.hari) : "-"}</span>
            <Clock className="h-3.5 w-3.5 ml-1" />
            <span>{unit.masa ?? "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" />
            <span>{unit.tempat ?? "-"}</span>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-2">
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-800">
            <Users className="h-3 w-3 mr-1" />
            {unit._count.keahlian} ahli
          </Badge>
          <Button size="sm" variant="outline" onClick={onLihat}>
            Lihat Butiran
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ bolehUrus, onTambah }: { bolehUrus: boolean; onTambah: () => void }) {
  return (
    <Card>
      <CardContent className="p-10 flex flex-col items-center justify-center text-center gap-3">
        <LayoutGrid className="h-10 w-10 text-emerald-200" />
        <div>
          <p className="font-medium text-emerald-900">Tiada unit dijumpai</p>
          <p className="text-sm text-muted-foreground mt-1">
            {bolehUrus
              ? "Tambah unit baharu atau ubah penapis carian."
              : "Tiada unit yang diamanahkan kepada anda buat masa ini."}
          </p>
        </div>
        {bolehUrus && (
          <Button className="bg-emerald-700 hover:bg-emerald-800 text-white" onClick={onTambah}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Unit
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function DialogTambahUnit({
  senaraiGuru,
  sedangHantar,
  onHantar,
  onTutup,
}: {
  senaraiGuru: PenggunaRingkas[];
  sedangHantar: boolean;
  onHantar: (body: Record<string, unknown>) => void;
  onTutup: () => void;
}) {
  const [nama, setNama] = useState("");
  const [kategori, setKategori] = useState<string>("");
  const [guruUtamaId, setGuruUtamaId] = useState<string>("");
  const [guruPembantuId, setGuruPembantuId] = useState<string>("");
  const [hari, setHari] = useState<string>("");
  const [masa, setMasa] = useState<string>("");
  const [tempat, setTempat] = useState<string>("");

  const hantar = () => {
    if (!nama.trim() || !kategori) {
      toast.error("Nama dan kategori diperlukan.");
      return;
    }
    onHantar({
      nama: nama.trim(),
      kategori,
      guruUtamaId: guruUtamaId || null,
      guruPembantuId: guruPembantuId || null,
      hari: hari || null,
      masa: masa || null,
      tempat: tempat || null,
    });
  };

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Tambah Unit Kokurikulum</DialogTitle>
        <DialogDescription>Daftar unit baharu. Medan bertanda * adalah wajib.</DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[70vh]">
        <div className="space-y-4 pr-2">
          <div className="space-y-1.5">
            <Label htmlFor="u-nama">Nama Unit *</Label>
            <Input id="u-nama" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Cth: Pengakap Kanak-kanak" />
          </div>

          <div className="space-y-1.5">
            <Label>Kategori *</Label>
            <Select value={kategori} onValueChange={setKategori}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BERUNIFORM">Badan Beruniform</SelectItem>
                <SelectItem value="KELAB">Kelab/Persatuan</SelectItem>
                <SelectItem value="SUKAN">Sukan/Permainan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Guru Utama</Label>
              <Select value={guruUtamaId} onValueChange={setGuruUtamaId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih guru" />
                </SelectTrigger>
                <SelectContent>
                  {senaraiGuru.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Guru Pembantu</Label>
              <Select value={guruPembantuId} onValueChange={setGuruPembantuId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih guru (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {senaraiGuru.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Hari</Label>
              <Select value={hari} onValueChange={setHari}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih hari" />
                </SelectTrigger>
                <SelectContent>
                  {SENARAI_HARI.map((h) => (
                    <SelectItem key={h} value={h}>{labelHari(h)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-masa">Masa</Label>
              <Input id="u-masa" value={masa} onChange={(e) => setMasa(e.target.value)} placeholder="Cth: 14:30-16:00" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="u-tempat">Tempat</Label>
            <Input id="u-tempat" value={tempat} onChange={(e) => setTempat(e.target.value)} placeholder="Cth: Dewan Sekolah" />
          </div>
        </div>
      </ScrollArea>

      <DialogFooter>
        <Button variant="outline" disabled={sedangHantar} onClick={onTutup}>
          Batal
        </Button>
        <Button className="bg-emerald-700 hover:bg-emerald-800 text-white" disabled={sedangHantar} onClick={hantar}>
          {sedangHantar && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Simpan
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// Label hari (BM)
function labelHari(h: string): string {
  const m: Record<string, string> = {
    ISNIN: "Isnin", SELASA: "Selasa", RABU: "Rabu", KHAMIS: "Khamis", JUMAAT: "Jumaat", SABTU: "Sabtu", AHAD: "Ahad",
  };
  return m[h] ?? h;
}
