"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  apiFetch,
  formatTarikh,
  formatMasa,
  formatTarikhPendek,
} from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeLaporan, BadgeKategori } from "@/components/spk/badges";
import {
  ArrowLeft,
  Save,
  Send,
  CheckCircle2,
  Undo2,
  Printer,
  Plus,
  Trash2,
  ImageIcon,
  AlertCircle,
  Clock,
  MessageSquareWarning,
  Eye,
} from "lucide-react";

// ----- Jenis -----
interface StatKehadiran {
  hadir: number;
  total: number;
  peratus: number;
}
interface SesiBorang {
  id: string;
  tajuk: string;
  tarikh: string;
  masaMula: string;
  masaTamat: string;
  tempat: string | null;
  unit: { id: string; nama: string; kategori: string };
}
interface DiciptaOleh {
  nama: string;
  email: string;
}
interface Laporan {
  id: string;
  sesiId: string;
  objektif: string | null;
  ringkasan: string | null;
  hasil: string | null;
  masalah: string | null;
  cadangan: string | null;
  gambar: string[];
  status: string;
  komenSemakan: string | null;
  tarikhHantar: string | null;
  tarikhLulus: string | null;
  diciptaOleh: DiciptaOleh;
  sesi: SesiBorang;
  statKehadiran: StatKehadiran | null;
}

const MAX_GAMBAR = 5;

// Komponen luar: uruskan muatan & ralat, kemudian serahkan kepada inner
// yang di-key mengikut id+status supaya state di-initial semula hanya bila
// mod berubah (DRAF -> DIHANTAR -> DIKEMBALIKAN -> DILULUSKAN).
export function LaporanBorang() {
  const laporanIdAktif = useAppStore((s) => s.laporanIdAktif);
  const navigasi = useAppStore((s) => s.navigasi);

  const { data, isLoading, isError } = useQuery<{ laporan: Laporan }>({
    queryKey: ["laporan", laporanIdAktif],
    queryFn: () => apiFetch(`/api/reports/${laporanIdAktif}`),
    enabled: !!laporanIdAktif,
  });

  if (!laporanIdAktif) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
          Tiada laporan dipilih. Sila pilih laporan dari senarai.
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={() => navigasi("laporan-senarai")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Kembali ke Senarai
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data?.laporan) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
          Gagal memuatkan laporan. Sila cuba lagi.
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={() => navigasi("laporan-senarai")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const laporan = data.laporan;
  // Key mengikut id + status: remount hanya bila mod bertukar.
  const kunci = `${laporan.id}-${laporan.status}`;
  return <BorangLaporanInner key={kunci} laporan={laporan} laporanIdAktif={laporanIdAktif} />;
}

function BorangLaporanInner({
  laporan,
  laporanIdAktif,
}: {
  laporan: Laporan;
  laporanIdAktif: string;
}) {
  const pengguna = useAppStore((s) => s.pengguna);
  const navigasi = useAppStore((s) => s.navigasi);
  const qc = useQueryClient();

  // Lazy initializers: hanya berjalan sekali per remount.
  const [objektif, setObjektif] = useState<string>(laporan.objektif ?? "");
  const [ringkasan, setRingkasan] = useState<string>(laporan.ringkasan ?? "");
  const [hasil, setHasil] = useState<string>(laporan.hasil ?? "");
  const [masalah, setMasalah] = useState<string>(laporan.masalah ?? "");
  const [cadangan, setCadangan] = useState<string>(laporan.cadangan ?? "");
  const [gambar, setGambar] = useState<string[]>(
    Array.isArray(laporan.gambar) ? laporan.gambar : []
  );
  const [urlBaru, setUrlBaru] = useState<string>("");
  const [komenSemakan, setKomenSemakan] = useState<string>(laporan.komenSemakan ?? "");
  const [dialogHantar, setDialogHantar] = useState<boolean>(false);
  const [dialogLulus, setDialogLulus] = useState<boolean>(false);
  const [dialogKembali, setDialogKembali] = useState<boolean>(false);
  const [dirty, setDirty] = useState<boolean>(false);

  // Tentukan mod
  const status = laporan.status;
  const ialahGuru = pengguna?.peranan === "GURU";
  const ialahPK = pengguna?.peranan === "PK" || pengguna?.peranan === "ADMIN";
  const ialahGB = pengguna?.peranan === "GB";

  const modEdit = ialahGuru && (status === "DRAF" || status === "DIKEMBALIKAN");
  const modBacaGuru = ialahGuru && (status === "DIHANTAR" || status === "DILULUSKAN");
  const modSemakPK = ialahPK && status === "DIHANTAR";
  const modBacaLulus = (ialahPK || ialahGB) && status === "DILULUSKAN";

  const mutSimpan = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<{ laporan: Laporan }>("/api/reports", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Laporan disimpan.", {
        description: "Statistik kehadiran dikemas kini secara automatik.",
      });
      qc.invalidateQueries({ queryKey: ["laporan", laporanIdAktif] });
      setDirty(false);
    },
    onError: (e: Error) => toast.error("Gagal menyimpan laporan.", { description: e.message }),
  });

  const mutHantar = useMutation({
    mutationFn: () =>
      apiFetch(`/api/reports/${laporanIdAktif}/submit`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Laporan dihantar untuk semakan PK.");
      qc.invalidateQueries({ queryKey: ["laporan", laporanIdAktif] });
      qc.invalidateQueries({ queryKey: ["laporan"] });
      setDialogHantar(false);
    },
    onError: (e: Error) => toast.error("Gagal menghantar laporan.", { description: e.message }),
  });

  const mutLulus = useMutation({
    mutationFn: (komen: string) =>
      apiFetch(`/api/reports/${laporanIdAktif}/approve`, {
        method: "POST",
        body: JSON.stringify({ komen }),
      }),
    onSuccess: () => {
      toast.success("Laporan diluluskan.");
      qc.invalidateQueries({ queryKey: ["laporan", laporanIdAktif] });
      qc.invalidateQueries({ queryKey: ["laporan"] });
      setDialogLulus(false);
    },
    onError: (e: Error) => toast.error("Gagal meluluskan laporan.", { description: e.message }),
  });

  const mutKembali = useMutation({
    mutationFn: (komen: string) =>
      apiFetch(`/api/reports/${laporanIdAktif}/return`, {
        method: "POST",
        body: JSON.stringify({ komen }),
      }),
    onSuccess: () => {
      toast.success("Laporan dikembalikan kepada guru.", {
        description: "Guru akan dimaklumkan untuk membuat pembetulan.",
      });
      qc.invalidateQueries({ queryKey: ["laporan", laporanIdAktif] });
      qc.invalidateQueries({ queryKey: ["laporan"] });
      setDialogKembali(false);
    },
    onError: (e: Error) => toast.error("Gagal mengembalikan laporan.", { description: e.message }),
  });

  const bolehSimpan = useMemo(() => {
    if (!modEdit) return false;
    if (!objektif.trim() || !ringkasan.trim()) return false;
    return dirty;
  }, [modEdit, dirty, objektif, ringkasan]);

  const handleSimpan = (hantarSelepas = false) => {
    if (!objektif.trim()) {
      toast.error("Objektif diperlukan.");
      return;
    }
    if (!ringkasan.trim()) {
      toast.error("Ringkasan aktiviti diperlukan.");
      return;
    }
    mutSimpan.mutate({
      id: laporanIdAktif,
      objektif,
      ringkasan,
      hasil,
      masalah,
      cadangan,
      gambar,
      refreshStats: true,
    });
    if (hantarSelepas) {
      // Beri masa invalidate supaya state segar sebelum buka dialog
      setTimeout(() => setDialogHantar(true), 400);
    }
  };

  const tambahGambar = () => {
    const url = urlBaru.trim();
    if (!url) return;
    if (gambar.length >= MAX_GAMBAR) {
      toast.error(`Maksimum ${MAX_GAMBAR} gambar sahaja.`);
      return;
    }
    try {
      new URL(url);
    } catch {
      toast.error("URL gambar tidak sah.");
      return;
    }
    setGambar([...gambar, url]);
    setUrlBaru("");
    setDirty(true);
  };

  const buangGambar = (idx: number) => {
    setGambar(gambar.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const stat = laporan.statKehadiran;
  const hanyaBaca = !modEdit;
  const paparNotaHantar = ialahGuru && status === "DIHANTAR";
  const paparCetak = modBacaLulus || (ialahGB && status === "DILULUSKAN");

  return (
    <div className="space-y-4 max-w-4xl mx-auto printable">
      {/* Baris atas */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigasi("laporan-senarai")} className="self-start">
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali ke Senarai
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <BadgeLaporan status={laporan.status} />
          {paparCetak && (
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> Cetak PDF A4
            </Button>
          )}
        </div>
      </div>

      {/* Nota status */}
      {paparNotaHantar && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 flex items-start gap-2 print:hidden">
          <Clock className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Menunggu semakan PK</p>
            <p className="text-xs">
              Laporan ini telah dihantar dan sedang menunggu semakan daripada Penyelaras
              Kokurikulum. Anda tidak boleh mengubahsuai sehingga semakan selesai.
            </p>
          </div>
        </div>
      )}
      {laporan.status === "DIKEMBALIKAN" && laporan.komenSemakan && (
        <div className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-900 flex items-start gap-2 print:hidden">
          <MessageSquareWarning className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Laporan dikembalikan oleh PK</p>
            <p className="text-xs mt-0.5">Komen semakan:</p>
            <p className="text-sm mt-1 italic">&ldquo;{laporan.komenSemakan}&rdquo;</p>
            <p className="text-xs mt-1">Sila buat pembetulan dan hantar semula.</p>
          </div>
        </div>
      )}
      {laporan.status === "DILULUSKAN" && laporan.komenSemakan && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 flex items-start gap-2">
          <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Laporan diluluskan</p>
            {laporan.tarikhLulus && (
              <p className="text-xs">Diluluskan pada {formatTarikh(laporan.tarikhLulus)}</p>
            )}
            {laporan.komenSemakan && (
              <p className="text-sm mt-1 italic">&ldquo;{laporan.komenSemakan}&rdquo;</p>
            )}
          </div>
        </div>
      )}

      {/* Header cetakan */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold">LAPORAN AKTIVITI KOKURIKULUM</h1>
        <p className="text-sm">Sekolah Rendah Islam Al Amin, Gombak</p>
      </div>

      {/* Bahagian A: Maklumat Sesi */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-emerald-900">Bahagian A: Maklumat Sesi</CardTitle>
          <CardDescription>
            Maklumat dijana secara automatik daripada sesi aktiviti (baca sahaja).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <MedanBaca label="Tajuk Sesi" nilai={laporan.sesi.tajuk} />
          <MedanBaca
            label="Unit"
            nilai={
              <span className="inline-flex items-center gap-2">
                {laporan.sesi.unit.nama}
                <BadgeKategori kategori={laporan.sesi.unit.kategori} />
              </span>
            }
          />
          <MedanBaca label="Tarikh" nilai={formatTarikh(laporan.sesi.tarikh)} />
          <MedanBaca
            label="Masa"
            nilai={`${formatMasa(laporan.sesi.masaMula)} - ${formatMasa(laporan.sesi.masaTamat)}`}
          />
          <MedanBaca label="Tempat" nilai={laporan.sesi.tempat || "-"} />
          <MedanBaca label="Dicipta oleh" nilai={`${laporan.diciptaOleh.nama} (${laporan.diciptaOleh.email})`} />
        </CardContent>
      </Card>

      {/* Bahagian B: Kandungan Laporan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-emerald-900">Bahagian B: Kandungan Laporan</CardTitle>
          <CardDescription>
            Isi kandungan laporan aktiviti. Medan bertanda * adalah wajib.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="objektif">
              Objektif <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="objektif"
              value={objektif}
              onChange={(e) => { setObjektif(e.target.value); setDirty(true); }}
              readOnly={hanyaBaca}
              rows={3}
              placeholder={hanyaBaca ? "" : "Nyatakan objektif aktiviti..."}
              className={hanyaBaca ? "bg-muted/40" : ""}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ringkasan">
              Ringkasan Aktiviti <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="ringkasan"
              value={ringkasan}
              onChange={(e) => { setRingkasan(e.target.value); setDirty(true); }}
              readOnly={hanyaBaca}
              rows={4}
              placeholder={hanyaBaca ? "" : "Ringkasan aktiviti yang telah dijalankan..."}
              className={hanyaBaca ? "bg-muted/40" : ""}
            />
            {/* FR-24: Auto paparan kehadiran */}
            <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-900">
              <span className="font-medium">Bilangan Hadir:</span>{" "}
              {stat ? (
                <>
                  {stat.hadir}/{stat.total} ({stat.peratus}%)
                </>
              ) : (
                <span className="text-muted-foreground">Tiada data kehadiran</span>
              )}
              <span className="block text-[11px] text-emerald-700/80 mt-0.5">
                *Auto dikira daripada rekod kehadiran sesi.
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hasil">Hasil / Pencapaian</Label>
            <Textarea
              id="hasil"
              value={hasil}
              onChange={(e) => { setHasil(e.target.value); setDirty(true); }}
              readOnly={hanyaBaca}
              rows={3}
              placeholder={hanyaBaca ? "" : "Nyatakan hasil dan pencapaian..."}
              className={hanyaBaca ? "bg-muted/40" : ""}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="masalah">Masalah</Label>
              <Textarea
                id="masalah"
                value={masalah}
                onChange={(e) => { setMasalah(e.target.value); setDirty(true); }}
                readOnly={hanyaBaca}
                rows={3}
                placeholder={hanyaBaca ? "" : "Masalah dihadapi (jika ada)..."}
                className={hanyaBaca ? "bg-muted/40" : ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cadangan">Cadangan Penambahbaikan</Label>
              <Textarea
                id="cadangan"
                value={cadangan}
                onChange={(e) => { setCadangan(e.target.value); setDirty(true); }}
                readOnly={hanyaBaca}
                rows={3}
                placeholder={hanyaBaca ? "" : "Cadangan penambahbaikan akan datang..."}
                className={hanyaBaca ? "bg-muted/40" : ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bahagian C: Gambar Sokongan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-emerald-900">
            Bahagian C: Gambar Sokongan
          </CardTitle>
          <CardDescription>
            Lampirkan URL gambar sokongan aktiviti (maksimum {MAX_GAMBAR} gambar).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {modEdit && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="https://contoh.com/gambar.jpg"
                value={urlBaru}
                onChange={(e) => setUrlBaru(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    tambahGambar();
                  }
                }}
              />
              <Button
                onClick={tambahGambar}
                variant="outline"
                disabled={gambar.length >= MAX_GAMBAR}
                className="sm:w-auto w-full"
              >
                <Plus className="h-4 w-4 mr-1" /> Tambah
              </Button>
            </div>
          )}
          {gambar.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              <ImageIcon className="h-6 w-6 mx-auto mb-2 opacity-60" />
              {modEdit ? "Tiada gambar dilampirkan." : "Tiada gambar dilampirkan dalam laporan ini."}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {gambar.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="group relative aspect-square rounded-md overflow-hidden border bg-muted"
                >
                  {/* gambar dari URL luaran */}
                  <img
                    src={url}
                    alt={`Gambar sokongan ${idx + 1}`}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  {modEdit && (
                    <button
                      type="button"
                      onClick={() => buangGambar(idx)}
                      className="absolute top-1 right-1 rounded-full bg-black/60 text-white p-1 opacity-0 group-hover:opacity-100 transition"
                      aria-label="Buang gambar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {gambar.length} / {MAX_GAMBAR} gambar dilampirkan.
          </p>
        </CardContent>
      </Card>

      {/* Bahagian D: Status & Tindakan */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-base text-emerald-900">
            Bahagian D: Status &amp; Tindakan
          </CardTitle>
          <CardDescription>
            {modEdit
              ? "Simpan draf atau hantar laporan untuk semakan."
              : modSemakPK
              ? "Semak laporan dan luluskan atau kembalikan kepada guru."
              : "Tindakan tersedia mengikut status semasa."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {modEdit && (
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleSimpan(false)}
                disabled={!bolehSimpan || mutSimpan.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                {mutSimpan.isPending ? "Menyimpan..." : "Simpan Draf"}
              </Button>
              <Button
                onClick={() => {
                  if (dirty) {
                    handleSimpan(true);
                  } else {
                    setDialogHantar(true);
                  }
                }}
                disabled={mutSimpan.isPending || mutHantar.isPending || !objektif.trim() || !ringkasan.trim()}
                className="bg-emerald-700 hover:bg-emerald-800"
              >
                <Send className="h-4 w-4 mr-1" />
                {mutHantar.isPending ? "Menghantar..." : "Hantar Laporan"}
              </Button>
            </div>
          )}

          {modSemakPK && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <Label htmlFor="komen">Komen Semakan</Label>
                <Textarea
                  id="komen"
                  value={komenSemakan}
                  onChange={(e) => setKomenSemakan(e.target.value)}
                  rows={3}
                  placeholder="Tulis komen semakan untuk guru (disimpan bersama laporan)..."
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDialogKembali(true)}
                  disabled={mutKembali.isPending || mutLulus.isPending}
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  <Undo2 className="h-4 w-4 mr-1" /> Kembalikan
                </Button>
                <Button
                  onClick={() => setDialogLulus(true)}
                  disabled={mutKembali.isPending || mutLulus.isPending}
                  className="bg-emerald-700 hover:bg-emerald-800"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {mutLulus.isPending ? "Meluluskan..." : "Luluskan"}
                </Button>
              </div>
            </>
          )}

          {modBacaGuru && (
            <div className="flex items-center justify-center text-sm text-muted-foreground py-3">
              <Eye className="h-4 w-4 mr-1.5" />
              {status === "DIHANTAR"
                ? "Laporan dihantar - tiada tindakan diperlukan buat masa ini."
                : "Laporan diluluskan - mod baca sahaja."}
            </div>
          )}

          {modBacaLulus && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Laporan ini telah diluluskan dan boleh dicetak.
              </p>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1" /> Cetak PDF A4
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nota cetakan */}
      {paparCetak && (
        <p className="text-xs text-muted-foreground text-center print:hidden">
          Nota: Gunakan orientasi <strong>Potret</strong> dan saiz kertas{" "}
          <strong>A4</strong> apabila mencetak.
        </p>
      )}

      {/* AlertDialog Hantar */}
      <AlertDialog open={dialogHantar} onOpenChange={setDialogHantar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sahkan Hantar Laporan?</AlertDialogTitle>
            <AlertDialogDescription>
              Selepas dihantar, laporan tidak boleh diubahsuai sehingga disemak oleh PK.
              Pastikan semua kandungan telah lengkap.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutHantar.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                mutHantar.mutate();
              }}
              disabled={mutHantar.isPending}
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              {mutHantar.isPending ? "Menghantar..." : "Sahkan & Hantar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog Luluskan */}
      <AlertDialog open={dialogLulus} onOpenChange={setDialogLulus}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Luluskan Laporan?</AlertDialogTitle>
            <AlertDialogDescription>
              Laporan akan ditandakan sebagai Diluluskan. Tindakan ini tidak boleh diundur.
              {komenSemakan.trim() ? " Komen anda akan direkodkan." : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutLulus.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                mutLulus.mutate(komenSemakan.trim());
              }}
              disabled={mutLulus.isPending}
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              {mutLulus.isPending ? "Meluluskan..." : "Luluskan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog Kembalikan */}
      <AlertDialog open={dialogKembali} onOpenChange={setDialogKembali}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kembalikan Laporan?</AlertDialogTitle>
            <AlertDialogDescription>
              Laporan akan dikembalikan kepada guru untuk pembetulan. Sila pastikan anda telah
              menulis komen semakan yang jelas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutKembali.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (!komenSemakan.trim()) {
                  toast.error("Sila tulis komen semakan sebelum mengembalikan.");
                  return;
                }
                mutKembali.mutate(komenSemakan.trim());
              }}
              disabled={mutKembali.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {mutKembali.isPending ? "Mengembalikan..." : "Kembalikan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MedanBaca({ label, nilai }: { label: string; nilai: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground break-words">{nilai}</p>
    </div>
  );
}
