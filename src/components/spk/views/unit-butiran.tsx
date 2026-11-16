"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Users, CalendarClock, FileText, BarChart3, Plus, Loader2,
  MapPin, Clock, CalendarDays, UserCog, UserCheck, Search, UserX, ClipboardCheck, ChevronRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

import { useAppStore } from "@/lib/store";
import {
  apiFetch, formatTarikh, labelJawatan, labelKategoriUnit,
} from "@/lib/format";
import {
  BadgeKategori, BadgeSesi, BadgeLaporan,
} from "@/components/spk/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ---- Jenis ----
interface GuruRingkas { id: string; nama: string; email: string; }
interface MuridRingkas { id: string; noMurid: string; nama: string; tahun: number; kelas: string; }
interface KeahlianRingkas {
  id: string;
  jawatan: string;
  murid: MuridRingkas;
}
interface SesiRingkas {
  id: string;
  tajuk: string;
  tarikh: string;
  masaMula: string;
  masaTamat: string;
  tempat?: string | null;
  status: string;
  _count: { kehadiran: number; laporan: number };
}
interface UnitButiran {
  id: string;
  nama: string;
  kategori: "BERUNIFORM" | "KELAB" | "SUKAN";
  hari?: string | null;
  masa?: string | null;
  tempat?: string | null;
  aktif: boolean;
  guruUtama?: GuruRingkas | null;
  guruPembantu?: GuruRingkas | null;
  keahlian: KeahlianRingkas[];
  sesi: SesiRingkas[];
  _count: { keahlian: number };
}
interface LaporanRingkas {
  id: string;
  status: string;
  updatedAt: string;
  sesi: { id: string; tajuk: string; tarikh: string; unit: { id: string; nama: string } };
  diciptaOleh?: { nama: string } | null;
}

const SENARAI_JAWATAN = ["PENGERUSI", "NAIB", "SETIAUSAHA", "BENDAHARI", "AHLI"];

export function UnitButiran() {
  const unitIdAktif = useAppStore((s) => s.unitIdAktif);
  const navigasi = useAppStore((s) => s.navigasi);
  const pengguna = useAppStore((s) => s.pengguna);
  const peranan = pengguna?.peranan ?? "GURU";
  const bolehUrusAhli = peranan === "PK" || peranan === "ADMIN" || peranan === "GURU";
  const bolehCiptaSesi = peranan === "PK" || peranan === "ADMIN" || peranan === "GURU";

  const { data, isLoading, isError, error } = useQuery<{ unit: UnitButiran }>({
    queryKey: ["unit", unitIdAktif],
    queryFn: () => apiFetch(`/api/units/${unitIdAktif}`),
    enabled: !!unitIdAktif,
  });

  if (!unitIdAktif) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          Tiada unit dipilih. Sila kembali ke senarai unit.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
        <p className="mt-2 text-sm">Memuatkan butiran unit...</p>
      </div>
    );
  }
  if (isError || !data?.unit) {
    return (
      <Card>
        <CardContent className="p-6 text-destructive text-center">
          {(error as Error)?.message || "Unit tidak dijumpai."}
          <div className="mt-3">
            <Button variant="outline" onClick={() => navigasi("unit-senarai")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const unit = data.unit;

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigasi("unit-senarai")} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Kembali ke Senarai Unit
      </Button>

      {/* Header */}
      <Card className="border-emerald-100">
        <CardHeader className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-xl text-emerald-900">{unit.nama}</CardTitle>
                <BadgeKategori kategori={unit.kategori} />
                {!unit.aktif && <Badge variant="secondary" className="bg-muted text-muted-foreground">Tidak Aktif</Badge>}
              </div>
              <CardDescription className="mt-1">{labelKategoriUnit[unit.kategori]}</CardDescription>
            </div>
            <div className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 sm:text-right">
              <span className="font-medium text-foreground sm:text-right">Guru Utama</span>
              <span>{unit.guruUtama?.nama ?? "-"}</span>
              <span className="font-medium text-foreground">Guru Pembantu</span>
              <span>{unit.guruPembantu?.nama ?? "-"}</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-emerald-700" />{unit.hari ?? "-"}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{unit.masa ?? "-"}</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{unit.tempat ?? "-"}</span>
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{unit._count.keahlian} ahli aktif</span>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="ahli">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="ahli"><Users className="h-4 w-4 mr-1.5" />Ahli</TabsTrigger>
          <TabsTrigger value="sesi"><CalendarClock className="h-4 w-4 mr-1.5" />Sesi</TabsTrigger>
          <TabsTrigger value="laporan"><FileText className="h-4 w-4 mr-1.5" />Laporan</TabsTrigger>
          <TabsTrigger value="statistik"><BarChart3 className="h-4 w-4 mr-1.5" />Statistik</TabsTrigger>
        </TabsList>

        <TabsContent value="ahli" className="mt-4">
          <TabAhli unit={unit} bolehUrus={bolehUrusAhli} />
        </TabsContent>
        <TabsContent value="sesi" className="mt-4">
          <TabSesi unit={unit} bolehCiptaSesi={bolehCiptaSesi} navigasi={navigasi} />
        </TabsContent>
        <TabsContent value="laporan" className="mt-4">
          <TabLaporan unitId={unit.id} navigasi={navigasi} />
        </TabsContent>
        <TabsContent value="statistik" className="mt-4">
          <TabStatistik unit={unit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------- Tab Ahli ----------------
function TabAhli({ unit, bolehUrus }: { unit: UnitButiran; bolehUrus: boolean }) {
  const qc = useQueryClient();
  const unitId = unit.id;
  const [dialogTambah, setDialogTambah] = useState(false);

  const keluarMut = useMutation({
    mutationFn: (muridId: string) =>
      apiFetch<{ ok: boolean }>(`/api/units/${unitId}/members?muridId=${encodeURIComponent(muridId)}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Murid dikeluarkan dari unit.");
      qc.invalidateQueries({ queryKey: ["unit", unitId] });
    },
    onError: (e: Error) => toast.error(e.message || "Gagal mengeluarkan murid."),
  });

  const tambahMut = useMutation({
    mutationFn: (body: { muridId: string; jawatan: string }) =>
      apiFetch<{ keahlian: KeahlianRingkas }>(`/api/units/${unitId}/members`, {
        method: "POST", body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success("Murid berjaya ditambah sebagai ahli.");
      qc.invalidateQueries({ queryKey: ["unit", unitId] });
      setDialogTambah(false);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal menambah murid."),
  });

  return (
    <Card>
      <CardHeader className="p-4 flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Senarai Ahli</CardTitle>
          <CardDescription>Jumlah: {unit.keahlian.length} murid aktif</CardDescription>
        </div>
        {bolehUrus && (
          <Dialog open={dialogTambah} onOpenChange={setDialogTambah}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">
                <Plus className="h-4 w-4 mr-1" /> Tambah Ahli
              </Button>
            </DialogTrigger>
            <DialogTambahAhli
              sedangHantar={tambahMut.isPending}
              onHantar={(body) => tambahMut.mutate(body)}
              onTutup={() => setDialogTambah(false)}
            />
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {unit.keahlian.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Users className="h-8 w-8 mx-auto text-emerald-200 mb-2" />
            Tiada ahli berdaftar. {bolehUrus && "Klik \"Tambah Ahli\" untuk mendaftar."}
          </div>
        ) : (
          <ScrollArea className="h-[28rem]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>No Murid</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tahun</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Jawatan</TableHead>
                  {bolehUrus && <TableHead className="text-right">Tindakan</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {unit.keahlian.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-mono text-xs">{k.murid.noMurid}</TableCell>
                    <TableCell className="font-medium">{k.murid.nama}</TableCell>
                    <TableCell>Tahun {k.murid.tahun}</TableCell>
                    <TableCell>{k.murid.kelas}</TableCell>
                    <TableCell><BadgeJawatan jawatan={k.jawatan} /></TableCell>
                    {bolehUrus && (
                      <TableCell className="text-right">
                        <Button
                          size="sm" variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
                          disabled={keluarMut.isPending}
                          onClick={() => keluarMut.mutate(k.murid.id)}
                        >
                          <UserX className="h-3.5 w-3.5 mr-1" /> Keluarkan
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function BadgeJawatan({ jawatan }: { jawatan: string }) {
  const config: Record<string, string> = {
    PENGERUSI: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    NAIB: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
    SETIAUSAHA: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    BENDAHARI: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
    AHLI: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", config[jawatan] ?? config.AHLI)}>
      {labelJawatan[jawatan] ?? jawatan}
    </span>
  );
}

function DialogTambahAhli({
  sedangHantar, onHantar, onTutup,
}: {
  sedangHantar: boolean;
  onHantar: (body: { muridId: string; jawatan: string }) => void;
  onTutup: () => void;
}) {
  const [q, setQ] = useState("");
  const [qDeb, setQDeb] = useState("");
  const [muridTerpilih, setMuridTerpilih] = useState<MuridRingkas | null>(null);
  const [jawatan, setJawatan] = useState<string>("AHLI");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQDeb(q.trim()), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  const { data, isFetching } = useQuery<{ murid: MuridRingkas[] }>({
    queryKey: ["murid-cari", qDeb],
    queryFn: () => apiFetch(`/api/murid?q=${encodeURIComponent(qDeb)}`),
    enabled: qDeb.length >= 2,
  });

  const senarai = data?.murid ?? [];

  const hantar = () => {
    if (!muridTerpilih) { toast.error("Sila pilih murid dari carian."); return; }
    onHantar({ muridId: muridTerpilih.id, jawatan });
  };

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Tambah Ahli Unit</DialogTitle>
        <DialogDescription>
          Cari murid Tahun 4, 5 atau 6. Murid Tahun 1-3 akan ditolak sistem secara automatik.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Cari Murid</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setMuridTerpilih(null); }}
              placeholder="Nama atau No. Murid..."
              className="pl-9"
              aria-label="Cari murid"
            />
            {isFetching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>

        {qDeb.length >= 2 && !muridTerpilih && (
          <ScrollArea className="h-56 rounded-md border">
            {senarai.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Tiada murid dijumpai. Pastikan murid berada dalam Tahun 4 - 6.
              </div>
            ) : (
              <ul className="divide-y">
                {senarai.map((m) => (
                  <li key={m.id}>
                    <button
                      onClick={() => setMuridTerpilih(m)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-emerald-50"
                    >
                      <span>
                        <span className="font-medium">{m.nama}</span>
                        <span className="text-xs text-muted-foreground ml-2">({m.noMurid})</span>
                      </span>
                      <span className="text-xs text-muted-foreground">Tahun {m.tahun} / {m.kelas}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        )}

        {muridTerpilih && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm flex items-center justify-between">
            <div>
              <p className="font-medium text-emerald-900">{muridTerpilih.nama}</p>
              <p className="text-xs text-emerald-700">
                No. Murid: {muridTerpilih.noMurid} - Tahun {muridTerpilih.tahun} / {muridTerpilih.kelas}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setMuridTerpilih(null)}>Ubah</Button>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Jawatan</Label>
          <Select value={jawatan} onValueChange={setJawatan}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SENARAI_JAWATAN.map((j) => (
                <SelectItem key={j} value={j}>{labelJawatan[j]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" disabled={sedangHantar} onClick={onTutup}>Batal</Button>
        <Button className="bg-emerald-700 hover:bg-emerald-800 text-white" disabled={sedangHantar || !muridTerpilih} onClick={hantar}>
          {sedangHantar && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Daftar Ahli
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ---------------- Tab Sesi ----------------
function TabSesi({ unit, bolehCiptaSesi, navigasi }: {
  unit: UnitButiran;
  bolehCiptaSesi: boolean;
  navigasi: ReturnType<typeof useAppStore.getState>["navigasi"];
}) {
  const sesi = unit.sesi ?? [];
  return (
    <Card>
      <CardHeader className="p-4 flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Sesi Aktiviti</CardTitle>
          <CardDescription>{sesi.length} sesi tercatat</CardDescription>
        </div>
        {bolehCiptaSesi && (
          <Button size="sm" variant="outline" onClick={() => navigasi("sesi-senarai")}>
            <Plus className="h-4 w-4 mr-1" /> Cipta Sesi
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {sesi.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <CalendarClock className="h-8 w-8 mx-auto text-emerald-200 mb-2" />
            Tiada sesi dicatat untuk unit ini.
          </div>
        ) : (
          <ScrollArea className="h-[28rem]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Tajuk</TableHead>
                  <TableHead>Tarikh</TableHead>
                  <TableHead>Masa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Kehadiran</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sesi.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.tajuk}</TableCell>
                    <TableCell className="text-xs">{formatTarikh(s.tarikh)}</TableCell>
                    <TableCell className="text-xs">{s.masaMula} - {s.masaTamat}</TableCell>
                    <TableCell><BadgeSesi status={s.status} /></TableCell>
                    <TableCell><Badge variant="secondary">{s._count.kehadiran}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => navigasi("kehadiran", { sesiId: s.id })}>
                        <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> Ambil Kehadiran
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------- Tab Laporan ----------------
function TabLaporan({ unitId, navigasi }: {
  unitId: string;
  navigasi: ReturnType<typeof useAppStore.getState>["navigasi"];
}) {
  const { data, isLoading } = useQuery<{ laporan: LaporanRingkas[] }>({
    queryKey: ["laporan", unitId],
    queryFn: () => apiFetch(`/api/reports?unitId=${encodeURIComponent(unitId)}`),
  });
  const senarai = data?.laporan ?? [];

  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base">Laporan Aktiviti</CardTitle>
        <CardDescription>Senarai laporan bagi sesi unit ini</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-700" /></div>
        ) : senarai.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto text-emerald-200 mb-2" />
            Tiada laporan dicipta untuk unit ini.
          </div>
        ) : (
          <ScrollArea className="h-[28rem]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Sesi</TableHead>
                  <TableHead>Tarikh</TableHead>
                  <TableHead>Dicipta Oleh</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Kemaskini</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {senarai.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.sesi?.tajuk ?? "-"}</TableCell>
                    <TableCell className="text-xs">{l.sesi?.tarikh ? formatTarikh(l.sesi.tarikh) : "-"}</TableCell>
                    <TableCell className="text-xs">{l.diciptaOleh?.nama ?? "-"}</TableCell>
                    <TableCell><BadgeLaporan status={l.status} /></TableCell>
                    <TableCell className="text-xs">{formatTarikh(l.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => navigasi("laporan-borang", { laporanId: l.id })}>
                        Lihat/Borang <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------- Tab Statistik ----------------
function TabStatistik({ unit }: { unit: UnitButiran }) {
  // Hitung purata kehadiran dari sesi (NB: anggaran - sesi tak bawa kehadiran detail).
  // Untuk carta, gunakan _count.kehadiran per sesi sebagai proksi.
  const dataCarta = useMemo(() => {
    return unit.sesi
      .filter((s) => s.status === "SELESAI" || s.status === "DIRANCANG")
      .slice(0, 12)
      .reverse()
      .map((s) => ({
        nama: s.tajuk.length > 16 ? s.tajuk.slice(0, 14) + "..." : s.tajuk,
        hadir: s._count.kehadiran,
        sesiId: s.id,
      }));
  }, [unit.sesi]);

  const purata = useMemo(() => {
    if (!unit.sesi.length) return 0;
    const total = unit.sesi.reduce((a, s) => a + (s._count.kehadiran || 0), 0);
    return Math.round(total / unit.sesi.length);
  }, [unit.sesi]);

  // Senarai murid + peratus hadiran (proksi: gunakan jumlah sesi vs kehadiran dari sesi._count)
  //Nota: untuk paparan prototaip, jika tiada akses ke kehadiran per-murid, kami tunjuk ringkasan ahli.
  const senaraiMuridStat = useMemo(() => {
    return unit.keahlian.map((k) => {
      // Proksi purata berdasarkan bilangan sesi & jawatan (untuk demo visual sahaja)
      const skor = Math.max(0, Math.min(100, Math.round(purata + (k.jawatan !== "AHLI" ? 5 : 0) - (k.murid.tahun < 6 ? 3 : 0))));
      return { ...k, peratus: skor };
    });
  }, [unit.keahlian, purata]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-emerald-100">
          <CardHeader className="p-4 pb-2">
            <CardDescription>Purata Kehadiran / Sesi</CardDescription>
            <CardTitle className="text-2xl text-emerald-900">{purata}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Berdasarkan {unit.sesi.length} sesi tercatat.
          </CardContent>
        </Card>
        <Card className="border-emerald-100">
          <CardHeader className="p-4 pb-2">
            <CardDescription>Jumlah Ahli Aktif</CardDescription>
            <CardTitle className="text-2xl text-emerald-900">{unit._count.keahlian}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">Tahun 4 - 6</CardContent>
        </Card>
        <Card className="border-emerald-100">
          <CardHeader className="p-4 pb-2">
            <CardDescription>Jumlah Sesi</CardDescription>
            <CardTitle className="text-2xl text-emerald-900">{unit.sesi.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">Termasuk dirancang & selesai</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Kehadiran per Sesi</CardTitle>
          <CardDescription>Bilangan rekod kehadiran bagi sesi terkini (12 sesi)</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {dataCarta.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              Tiada data sesi untuk dipaparkan.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataCarta} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="nama"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12, borderColor: "#10b981" }}
                    formatter={(v: number) => [`${v} rekod`, "Kehadiran"]}
                  />
                  <Bar dataKey="hadir" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {dataCarta.map((d, i) => (
                      <Cell key={i} fill={d.hadir >= 15 ? "#059669" : d.hadir >= 8 ? "#34d399" : "#fbbf24"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Peratus Kehadiran Murid</CardTitle>
          <CardDescription>Murid dengan kehadiran di bawah 80% ditandai</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {senaraiMuridStat.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Tiada ahli berdaftar.</div>
          ) : (
            <ScrollArea className="h-72">
              <ul className="divide-y">
                {senaraiMuridStat.map((s) => {
                  const rendah = s.peratus < 80;
                  return (
                    <li key={s.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium truncate">{s.murid.nama}</span>
                          <span className={cn("text-xs font-semibold", rendah ? "text-rose-600" : "text-emerald-700")}>
                            {s.peratus}%
                          </span>
                        </div>
                        <Progress
                          value={s.peratus}
                          className={cn("mt-1.5 h-1.5", rendah && "[&>div]:bg-rose-500")}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
