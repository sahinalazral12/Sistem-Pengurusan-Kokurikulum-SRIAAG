"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiFetch, formatTarikh, formatTarikhPendek } from "@/lib/format";
import { toast } from "sonner";
import {
  Settings, CalendarDays, RefreshCw, AlertTriangle, Loader2, Database, Users, GraduationCap, Building2, CalendarClock, Save, ShieldAlert,
} from "lucide-react";

interface Tetapan {
  id: string;
  tahunAkademik: number;
  semester: number;
  tarikhMula: string | null;
  tarikhTamat: string | null;
}

function toInputDate(d: string | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function AdminTetapan() {
  const qc = useQueryClient();

  // Tetapan
  const { data: dataTetapan, isLoading: loadingTetapan } = useQuery<{ tetapan: Tetapan | null }>({
    queryKey: ["tetapan"],
    queryFn: () => apiFetch("/api/tetapan"),
  });

  // Dashboard untuk statistik
  const { data: dataDash } = useQuery<any>({
    queryKey: ["dashboard-tetapan"],
    queryFn: () => apiFetch("/api/dashboard/summary"),
  });

  const tetapan = dataTetapan?.tetapan ?? null;
  const stat = dataDash?.stat ?? {};

  const [tahun, setTahun] = useState<string>(String(tetapan?.tahunAkademik ?? 2026));
  const [semester, setSemester] = useState<string>(String(tetapan?.semester ?? 2));
  const [tarikhMula, setTarikhMula] = useState<string>(toInputDate(tetapan?.tarikhMula));
  const [tarikhTamat, setTarikhTamat] = useState<string>(toInputDate(tetapan?.tarikhTamat));
  const [teksReset, setTeksReset] = useState("");

  // Sinkron bila data dimuat
  if (tetapan && String(tetapan.tahunAkademik) !== tahun && tahun === "2026" && tetapan.tahunAkademik !== 2026) {
    setTahun(String(tetapan.tahunAkademik));
  }

  const simpanMut = useMutation({
    mutationFn: (body: { tahunAkademik: number; semester: number; tarikhMula: string; tarikhTamat: string }) =>
      apiFetch<{ tetapan: Tetapan }>("/api/tetapan", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (d) => {
      toast.success("Tetapan semester berjaya disimpan.");
      setTahun(String(d.tetapan.tahunAkademik));
      setSemester(String(d.tetapan.semester));
      setTarikhMula(toInputDate(d.tetapan.tarikhMula));
      setTarikhTamat(toInputDate(d.tetapan.tarikhTamat));
      qc.invalidateQueries({ queryKey: ["tetapan"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["dashboard-tetapan"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal menyimpan tetapan."),
  });

  const resetMut = useMutation({
    mutationFn: () => apiFetch<{ ok: boolean; mesej: string }>("/api/admin/reset", { method: "POST", body: JSON.stringify({}) }),
    onSuccess: (d) => {
      toast.success(d.mesej ?? "Pangkalan data berjaya ditetap semula.");
      setTeksReset("");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal menetap semula data."),
  });

  function simpanTetapan(e: React.FormEvent) {
    e.preventDefault();
    const t = parseInt(tahun, 10);
    const s = parseInt(semester, 10);
    if (isNaN(t) || t < 2020 || t > 2100) {
      toast.error("Sila masukkan tahun akademik yang sah (2020-2100).");
      return;
    }
    if (s !== 1 && s !== 2) {
      toast.error("Semester mesti 1 atau 2.");
      return;
    }
    simpanMut.mutate({ tahunAkademik: t, semester: s, tarikhMula, tarikhTamat });
  }

  const senaraiStat = [
    { label: "Jumlah Pengguna", nilai: stat.jumlahPengguna ?? "-", ikon: <Users className="h-5 w-5" />, warna: "bg-emerald-100 text-emerald-700" },
    { label: "Jumlah Murid", nilai: stat.jumlahMurid ?? "-", ikon: <GraduationCap className="h-5 w-5" />, warna: "bg-amber-100 text-amber-700" },
    { label: "Jumlah Unit", nilai: stat.jumlahUnit ?? "-", ikon: <Building2 className="h-5 w-5" />, warna: "bg-rose-100 text-rose-700" },
    { label: "Jumlah Sesi Hari Ini", nilai: stat.sesiHariIni ?? "-", ikon: <CalendarClock className="h-5 w-5" />, warna: "bg-emerald-100 text-emerald-700" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-emerald-900 school-title flex items-center gap-2">
          <Settings className="h-6 w-6" /> Tetapan Sistem
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Konfigurasi semester akademik, statistik sistem &amp; tetapan semula pangkalan data dummy.
        </p>
      </header>

      {/* Statistik Sistem */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-emerald-800">Statistik Sistem</CardTitle>
          <CardDescription>Ringkasan data semasa dalam pangkalan data.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {senaraiStat.map((s) => (
              <div key={s.label} className="rounded-lg border p-4 flex flex-col gap-2">
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-md ${s.warna}`}>{s.ikon}</div>
                <p className="text-2xl font-bold text-emerald-900">{s.nilai}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            * Statistik diambil dari papan pemuka semasa. Jika pengguna terakhir log masuk ialah GURU, sebahagian statistik merujuk unit diamanahkan sahaja.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Tetapan Semester */}
        <Card className="border-emerald-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-800">
              <CalendarDays className="h-5 w-5" /> Tetapan Semester
            </CardTitle>
            <CardDescription>Tetapan tahun akademik &amp; semester aktif semasa.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTetapan ? (
              <div className="flex items-center justify-center py-8 text-emerald-700">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuatkan tetapan...
              </div>
            ) : (
              <form onSubmit={simpanTetapan} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tahun">Tahun Akademik</Label>
                  <Input id="tahun" type="number" min={2020} max={2100} value={tahun} onChange={(e) => setTahun(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="semester">Semester Aktif</Label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger id="semester">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Semester 1</SelectItem>
                      <SelectItem value="2">Semester 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tarikhMula">Tarikh Mula Semester</Label>
                    <Input id="tarikhMula" type="date" value={tarikhMula} onChange={(e) => setTarikhMula(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tarikhTamat">Tarikh Tamat Semester</Label>
                    <Input id="tarikhTamat" type="date" value={tarikhTamat} onChange={(e) => setTarikhTamat(e.target.value)} />
                  </div>
                </div>
                {tetapan?.tarikhMula && (
                  <p className="text-xs text-muted-foreground">Semasa: Tahun {tetapan.tahunAkademik} Semester {tetapan.semester} ({formatTarikhPendek(tetapan.tarikhMula)} - {tetapan.tarikhTamat ? formatTarikhPendek(tetapan.tarikhTamat) : "-"}).</p>
                )}
                <Button type="submit" disabled={simpanMut.isPending} className="bg-emerald-700 hover:bg-emerald-800 text-white">
                  {simpanMut.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</> : <><Save className="h-4 w-4 mr-2" /> Simpan Tetapan</>}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Reset Data Dummy - Bahagian Merbahaya */}
        <Card className="border-amber-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <ShieldAlert className="h-5 w-5" /> Reset Data Dummy
            </CardTitle>
            <CardDescription>Kawasan merbahaya - tetap semula pangkalan data ke data dummy asal (FR-40).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-amber-300 bg-amber-50 text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900">Amaran: Tindakan ini tidak boleh diundur!</AlertTitle>
              <AlertDescription className="text-amber-800">
                Semua perubahan data (pengguna, unit, sesi, kehadiran, laporan) akan dipadam dan digantikan dengan data dummy asal. Pastikan anda membuat salinan data sebelum meneruskan.
              </AlertDescription>
            </Alert>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Apakah kesan reset?</p>
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                <li>Semua pengguna, murid, unit &amp; keahlian akan dikembalikan ke data dummy asal.</li>
                <li>Semua sesi, kehadiran &amp; laporan akan dijana semula mengikut skrip seed.</li>
                <li>Sesi log masuk aktif mungkin terputus &amp; perlu log masuk semula.</li>
                <li>Log audit sebelum reset akan kekal untuk tujuan jejak.</li>
              </ul>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="bg-amber-600 hover:bg-amber-700 text-white">
                  <RefreshCw className="h-4 w-4 mr-2" /> Tetap Semula Pangkalan Data Dummy
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-amber-800">
                    <Database className="h-5 w-5" /> Pengesahan Reset Data
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Tindakan ini akan memadam semua data semasa dan menggantikan dengan data dummy asal. Untuk sahkan, sila taip <strong className="text-amber-900">RESET</strong> dalam ruang di bawah.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-1.5">
                  <Label htmlFor="teks-reset" className="text-amber-800">Taip "RESET" untuk sahkan</Label>
                  <Input id="teks-reset" value={teksReset} onChange={(e) => setTeksReset(e.target.value)} placeholder="RESET" className="border-amber-300" />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setTeksReset("")}>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={teksReset !== "RESET" || resetMut.isPending}
                    onClick={(e) => { e.preventDefault(); resetMut.mutate(); }}
                    className="bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
                  >
                    {resetMut.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menetap Semula...</> : <><RefreshCw className="h-4 w-4 mr-2" /> Sah &amp; Reset</>}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
