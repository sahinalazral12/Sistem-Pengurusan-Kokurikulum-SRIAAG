"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/format";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeTahap } from "@/components/spk/badges";
import {
  Star,
  Save,
  Send,
  AlertTriangle,
  Users,
  CheckCircle2,
  Info,
} from "lucide-react";

// ----- Jenis -----
interface UnitRingkas {
  id: string;
  nama: string;
  kategori: string;
}
interface AhliUnit {
  id: string; // muridId
  noMurid: string;
  nama: string;
  tahun: number;
  kelas: string;
  jawatan?: string;
}
interface PenilaianItem {
  id?: string;
  muridId: string;
  unitId: string;
  tahap: string | null;
  jawatan?: string | null;
  catatan: string | null;
  status?: string | null;
  peratusKehadiran?: number | null;
  murid: {
    noMurid: string;
    nama: string;
    tahun: number;
    kelas: string;
  };
}
interface Tetapan {
  semesterAktif?: number;
  tahunAktif?: number;
}

const TAHAP_PENILAIAN = ["CEMERLANG", "BAIK", "MEMUASKAN", "PERLU_PERHATIAN"] as const;

const TAHAP_PILIHAN_LABEL: Record<string, string> = {
  CEMERLANG: "Cemerlang",
  BAIK: "Baik",
  MEMUASKAN: "Memuaskan",
  PERLU_PERHATIAN: "Perlu Perhatian",
};

const SIMBOL_TAHAP: Record<string, string> = {
  CEMERLANG: "A+",
  BAIK: "A",
  MEMUASKAN: "B",
  PERLU_PERHATIAN: "C",
};

export function PenilaianView() {
  const qc = useQueryClient();
  const [unitId, setUnitId] = useState<string>("");
  const [tahunFilter, setTahunFilter] = useState<string>("SEMUA");
  const [dimuat, setDimuat] = useState(false);
  const [dialogHantar, setDialogHantar] = useState(false);

  // Tetapan semester & tahun aktif
  const { data: dataTetapan } = useQuery<{ tetapan: Tetapan }>({
    queryKey: ["tetapan"],
    queryFn: () => apiFetch("/api/tetapan"),
  });

  const semesterAktif = dataTetapan?.tetapan?.semesterAktif ?? 2;
  const tahunAktif = dataTetapan?.tetapan?.tahunAktif ?? new Date().getFullYear();

  // Senarai unit
  const { data: dataUnit } = useQuery<{ units: UnitRingkas[] }>({
    queryKey: ["units", "ringkas"],
    queryFn: () => apiFetch("/api/units"),
  });

  // Penilaian sedia ada untuk unit
  const { data: dataPenilaian, isLoading: loadingPenilaian } = useQuery<{ penilaian: PenilaianItem[] }>({
    queryKey: ["penilaian", unitId, semesterAktif, tahunAktif],
    queryFn: () =>
      apiFetch(
        `/api/assessments?unitId=${unitId}&semester=${semesterAktif}&tahun=${tahunAktif}`
      ),
    enabled: dimuat && !!unitId,
  });

  // Butiran unit untuk dapatkan senarai ahli jika tiada penilaian
  const { data: dataUnitDetail, isLoading: loadingUnitDetail } = useQuery<{ unit: UnitRingkas & { ahli?: AhliUnit[]; ahliUnit?: AhliUnit[] } }>({
    queryKey: ["unit", unitId],
    queryFn: () => apiFetch(`/api/units/${unitId}`),
    enabled: dimuat && !!unitId,
  });

  // Gabung ahli: jika penilaian ada, guna penilaian; jika tidak, guna ahli unit
  const senaraiMurid = useMemo<PenilaianItem[]>(() => {
    if (!dimuat || !unitId) return [];
    const penilaian = dataPenilaian?.penilaian ?? [];
    if (penilaian.length > 0) {
      return penilaian.filter((p) => tahunFilter === "SEMUA" || String(p.murid.tahun) === tahunFilter);
    }
    const ahli = dataUnitDetail?.unit?.ahli ?? dataUnitDetail?.unit?.ahliUnit ?? [];
    return ahli
      .filter((a) => tahunFilter === "SEMUA" || String(a.tahun) === tahunFilter)
      .map((a) => ({
        muridId: a.id,
        unitId,
        tahap: null,
        jawatan: a.jawatan ?? "",
        catatan: "",
        status: null,
        peratusKehadiran: null,
        murid: {
          noMurid: a.noMurid,
          nama: a.nama,
          tahun: a.tahun,
          kelas: a.kelas,
        },
      }));
  }, [dimuat, unitId, dataPenilaian, dataUnitDetail, tahunFilter]);

  const statusKumpulan = useMemo(() => {
    if (senaraiMurid.length === 0) return null;
    return senaraiMurid[0].status ?? null;
  }, [senaraiMurid]);

  const bilPerluPerhatian = useMemo(() => {
    return senaraiMurid.filter((p) => {
      const perc = p.peratusKehadiran ?? 0;
      return perc > 0 && perc < 80;
    }).length;
  }, [senaraiMurid]);

  // Tanda tangan stabil untuk remount jadual apabila data asas berubah
  // (tetapi BUKAN apabila pengguna menaip dalam borang).
  const tandaTanganJadual = useMemo(() => {
    if (senaraiMurid.length === 0) return "kosong";
    return senaraiMurid
      .map((p) => `${p.muridId}:${p.tahap ?? ""}:${p.jawatan ?? ""}:${p.catatan ?? ""}:${p.peratusKehadiran ?? ""}:${p.status ?? ""}`)
      .join("|");
  }, [senaraiMurid]);

  const mutSimpan = useMutation({
    mutationFn: (vars: { status: string; payload: { muridId: string; tahap: string; jawatan: string; catatan: string }[] }) =>
      apiFetch("/api/assessments", {
        method: "PUT",
        body: JSON.stringify({
          unitId,
          semester: semesterAktif,
          tahun: tahunAktif,
          status: vars.status,
          penilaian: vars.payload,
        }),
      }),
    onSuccess: (_data, vars) => {
      if (vars.status === "DIHANTAR") {
        toast.success("Penilaian dihantar untuk diluluskan.", {
          description: `Unit ini - Semester ${semesterAktif} ${tahunAktif}`,
        });
      } else {
        toast.success("Semua penilaian disimpan.", {
          description: "Anda boleh terus mengubahsuai sebelum dihantar.",
        });
      }
      qc.invalidateQueries({ queryKey: ["penilaian", unitId] });
      setDialogHantar(false);
    },
    onError: (e: Error) => toast.error("Gagal menyimpan penilaian.", { description: e.message }),
  });

  const handleMuat = () => {
    if (!unitId) {
      toast.error("Sila pilih unit terlebih dahulu.");
      return;
    }
    setDimuat(true);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-emerald-900 flex items-center gap-2">
          <Star className="h-6 w-6 text-emerald-700" />
          Penilaian Penglibatan Murid (Semester)
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Nilai tahap penglibatan murid dalam unit kokurikulum untuk semester semasa. Penilaian
          diukur berdasarkan kehadiran dan penglibatan. Murid dengan kehadiran di bawah 80% akan
          ditanda sebagai perlu perhatian.
        </p>
      </div>

      {/* Maklumat semester & pemilih unit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-emerald-900">Pilih Unit &amp; Muat Penilaian</CardTitle>
          <CardDescription>
            Semester dan tahun dijana secara automatik daripada tetapan sistem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-unit" className="text-xs">Unit</Label>
              <Select value={unitId} onValueChange={(v) => { setUnitId(v); setDimuat(false); }}>
                <SelectTrigger id="p-unit">
                  <SelectValue placeholder="Pilih unit" />
                </SelectTrigger>
                <SelectContent>
                  {(dataUnit?.units ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Semester Aktif</Label>
              <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
                Semester {semesterAktif}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tahun Aktif</Label>
              <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
                {tahunAktif}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="p-tahun" className="text-xs">Tapis Tahun Darjah</Label>
              <Select value={tahunFilter} onValueChange={setTahunFilter}>
                <SelectTrigger id="p-tahun">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEMUA">Semua Tahun</SelectItem>
                  <SelectItem value="4">Tahun 4</SelectItem>
                  <SelectItem value="5">Tahun 5</SelectItem>
                  <SelectItem value="6">Tahun 6</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 flex justify-start">
              <Button onClick={handleMuat} disabled={!unitId} className="bg-emerald-700 hover:bg-emerald-800">
                <Users className="h-4 w-4 mr-1" /> Muat Penilaian
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status & amaran */}
      {dimuat && senaraiMurid.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-8 w-8 text-emerald-700" />
              <div>
                <p className="text-xs text-muted-foreground">Jumlah Ahli</p>
                <p className="text-lg font-bold">{senaraiMurid.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-xs text-muted-foreground">Kehadiran &lt; 80%</p>
                <p className="text-lg font-bold">{bilPerluPerhatian}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Info className="h-8 w-8 text-sky-700" />
              <div>
                <p className="text-xs text-muted-foreground">Status Penilaian</p>
                <p className="text-sm font-bold">
                  {statusKumpulan === "DIHANTAR"
                    ? "Dihantar"
                    : statusKumpulan === "DILULUSKAN"
                    ? "Diluluskan"
                    : "Draf / Baru"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Nota status */}
      {dimuat && statusKumpulan === "DIHANTAR" && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 flex items-start gap-2">
          <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Penilaian telah dihantar</p>
            <p className="text-xs">
              Penilaian unit ini sedang menunggu kelulusan. Anda masih boleh mengubahsuai tetapi
              perlu menghantar semula.
            </p>
          </div>
        </div>
      )}
      {dimuat && statusKumpulan === "DILULUSKAN" && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 flex items-start gap-2">
          <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Penilaian diluluskan</p>
            <p className="text-xs">Penilaian ini telah diluluskan dan dikunci.</p>
          </div>
        </div>
      )}

      {/* Jadual pukal */}
      {!dimuat ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40 text-emerald-700" />
            <p className="font-medium text-foreground">Pilih unit dan muat penilaian</p>
            <p className="mt-1">Senarai ahli unit akan dipaparkan di sini untuk dinilai.</p>
          </CardContent>
        </Card>
      ) : loadingPenilaian || loadingUnitDetail ? (
        <Card>
          <CardContent className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : senaraiMurid.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-60" />
            Tiada ahli dalam unit ini untuk tahun darjah yang dipilih.
          </CardContent>
        </Card>
      ) : (
        <PenilaianTable
          key={tandaTanganJadual}
          senaraiMurid={senaraiMurid}
          semesterAktif={semesterAktif}
          tahunAktif={tahunAktif}
          statusKumpulan={statusKumpulan}
          mutSimpan={mutSimpan}
          dialogHantar={dialogHantar}
          setDialogHantar={setDialogHantar}
        />
      )}
    </div>
  );
}

// Komponen dalaman jadual: state baris di-initial dari props sekali per remount.
// Remount hanya berlaku apabila data server berubah (lihat `tandaTanganJadual`),
// bukan apabila pengguna menaip - maka fokus input kekal.
function PenilaianTable({
  senaraiMurid,
  semesterAktif,
  tahunAktif,
  statusKumpulan,
  mutSimpan,
  dialogHantar,
  setDialogHantar,
}: {
  senaraiMurid: PenilaianItem[];
  semesterAktif: number;
  tahunAktif: number;
  statusKumpulan: string | null;
  mutSimpan: ReturnType<typeof useMutation<any, any, any, any>>;
  dialogHantar: boolean;
  setDialogHantar: (v: boolean) => void;
}) {
  // Lazy initial: bina daripada data server sekali sahaja.
  const [baris, setBaris] = useState<Record<string, { tahap: string; jawatan: string; catatan: string }>>(() => {
    const init: Record<string, { tahap: string; jawatan: string; catatan: string }> = {};
    for (const p of senaraiMurid) {
      init[p.muridId] = {
        tahap: p.tahap ?? "",
        jawatan: p.jawatan ?? "",
        catatan: p.catatan ?? "",
      };
    }
    return init;
  });
  const [dirty, setDirty] = useState<boolean>(false);

  const setMedan = (muridId: string, medan: "tahap" | "jawatan" | "catatan", nilai: string) => {
    setBaris((p) => ({
      ...p,
      [muridId]: { ...(p[muridId] ?? { tahap: "", jawatan: "", catatan: "" }), [medan]: nilai },
    }));
    setDirty(true);
  };

  const bilBelumDinilai = useMemo(() => {
    return senaraiMurid.filter((p) => !(baris[p.muridId]?.tahap ?? "").trim()).length;
  }, [senaraiMurid, baris]);

  const bolehSimpan = useMemo(() => {
    if (senaraiMurid.length === 0) return false;
    const adaTahap = Object.values(baris).filter((b) => b.tahap).length;
    return adaTahap > 0 || dirty;
  }, [senaraiMurid, baris, dirty]);

  const semuaTahapLengkap = useMemo(() => {
    if (senaraiMurid.length === 0) return false;
    return senaraiMurid.every((p) => (baris[p.muridId]?.tahap ?? "").trim());
  }, [senaraiMurid, baris]);

  const binaPayload = () =>
    senaraiMurid.map((p) => ({
      muridId: p.muridId,
      tahap: baris[p.muridId]?.tahap ?? "",
      jawatan: baris[p.muridId]?.jawatan ?? "",
      catatan: baris[p.muridId]?.catatan ?? "",
    }));

  const handleSimpan = () => mutSimpan.mutate({ status: "DRAF", payload: binaPayload() });
  const handleHantar = () => mutSimpan.mutate({ status: "DIHANTAR", payload: binaPayload() });

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-emerald-900">Jadual Penilaian Pukal</CardTitle>
          <CardDescription>
            Isi tahap penilaian dan catatan untuk setiap murid. Kehadiran dipaparkan sebagai
            rujukan automatik.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[28rem] rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-20">No Murid</TableHead>
                  <TableHead className="min-w-[140px]">Nama</TableHead>
                  <TableHead className="w-16 text-center">Tahun</TableHead>
                  <TableHead className="w-20">Kelas</TableHead>
                  <TableHead className="w-28">Jawatan</TableHead>
                  <TableHead className="w-28 text-center">Kehadiran</TableHead>
                  <TableHead className="w-40">Tahap Penilaian</TableHead>
                  <TableHead className="min-w-[180px]">Catatan Guru</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {senaraiMurid.map((p) => {
                  const perc = p.peratusKehadiran ?? null;
                  const amaran = perc !== null && perc < 80;
                  const tahapBaru = baris[p.muridId]?.tahap ?? "";
                  return (
                    <TableRow key={p.muridId}>
                      <TableCell className="font-mono text-xs">{p.murid.noMurid}</TableCell>
                      <TableCell className="font-medium">{p.murid.nama}</TableCell>
                      <TableCell className="text-center">{p.murid.tahun}</TableCell>
                      <TableCell>{p.murid.kelas}</TableCell>
                      <TableCell>
                        <Input
                          value={baris[p.muridId]?.jawatan ?? ""}
                          onChange={(e) => setMedan(p.muridId, "jawatan", e.target.value)}
                          placeholder="-"
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {perc === null ? (
                          <span className="text-xs text-muted-foreground">-</span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                              amaran
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {amaran && <AlertTriangle className="h-3 w-3" />}
                            {perc.toFixed(0)}%
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={tahapBaru}
                          onValueChange={(v) => setMedan(p.muridId, "tahap", v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Pilih tahap" />
                          </SelectTrigger>
                          <SelectContent>
                            {TAHAP_PENILAIAN.map((t) => (
                              <SelectItem key={t} value={t}>
                                {SIMBOL_TAHAP[t]} - {TAHAP_PILIHAN_LABEL[t]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {tahapBaru && (
                          <div className="mt-1">
                            <BadgeTahap tahap={tahapBaru} />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={baris[p.muridId]?.catatan ?? ""}
                          onChange={(e) => setMedan(p.muridId, "catatan", e.target.value)}
                          placeholder="Catatan (jika ada)"
                          className="h-8 text-xs"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
        <Separator />
        <CardContent className="p-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {bilBelumDinilai > 0 ? (
              <span className="text-amber-700">
                {bilBelumDinilai} murid belum dinilai - semua tahap mesti diisi sebelum dihantar.
              </span>
            ) : (
              <span className="text-emerald-700">
                Semua murid telah dinilai - sedia untuk dihantar.
              </span>
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Button
              variant="outline"
              onClick={handleSimpan}
              disabled={!bolehSimpan || mutSimpan.isPending}
            >
              <Save className="h-4 w-4 mr-1" />
              {mutSimpan.isPending ? "Menyimpan..." : "Simpan Semua"}
            </Button>
            <Button
              onClick={() => setDialogHantar(true)}
              disabled={!semuaTahapLengkap || mutSimpan.isPending || statusKumpulan === "DILULUSKAN"}
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              <Send className="h-4 w-4 mr-1" /> Hantar untuk Diluluskan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AlertDialog Hantar */}
      <AlertDialog open={dialogHantar} onOpenChange={setDialogHantar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sahkan Hantar Penilaian?</AlertDialogTitle>
            <AlertDialogDescription>
              Penilaian untuk Semester {semesterAktif} Tahun {tahunAktif} akan dihantar kepada PK
              untuk diluluskan. Anda masih boleh mengubahsuai sebelum diluluskan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutSimpan.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleHantar();
              }}
              disabled={mutSimpan.isPending}
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              {mutSimpan.isPending ? "Menghantar..." : "Sahkan & Hantar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
