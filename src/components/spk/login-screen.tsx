"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn, ShieldCheck, BookOpen, Users, Award } from "lucide-react";
import { apiFetch } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import Image from "next/image";

const akaunDemo = [
  { email: "guru1@alamin.test", peranan: "Guru Penasihat", desc: "Rekod kehadiran & laporan unit" },
  { email: "pk@alamin.test", peranan: "Penyelaras Kokurikulum", desc: "Lulus laporan & pantau semua unit" },
  { email: "gb@alamin.test", peranan: "Guru Besar", desc: "Paparan baca sahaja" },
  { email: "admin@alamin.test", peranan: "Pentadbir Sistem", desc: "Pengguna & tetapan" },
];

export function LoginScreen() {
  const setPengguna = useAppStore((s) => s.setPengguna);
  const [email, setEmail] = useState("");
  const [kataLaluan, setKataLaluan] = useState("");
  const [tunjuk, setTunjuk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function logMasuk(e?: React.FormEvent, emel = email) {
    e?.preventDefault();
    if (!emel || !kataLaluan) {
      toast.error("Sila masukkan emel dan kata laluan.");
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{ pengguna: { id: string; email: string; nama: string; peranan: "GURU" | "PK" | "GB" | "ADMIN" } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: emel, kataLaluan }),
      });
      setPengguna(data.pengguna);
      toast.success(`Selamat datang, ${data.pengguna.nama}!`);
    } catch (err: any) {
      toast.error(err.message ?? "Log masuk gagal.");
    } finally {
      setLoading(false);
    }
  }

  function akaunDemoKlik(emel: string) {
    setEmail(emel);
    setKataLaluan("Demo@1234");
    // hantar kata laluan terus (elak keadaan belum dikemaskini)
    logMasukDengan(emel, "Demo@1234");
  }

  async function logMasukDengan(emel: string, kunci: string) {
    if (!emel || !kunci) {
      toast.error("Sila masukkan emel dan kata laluan.");
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{ pengguna: { id: string; email: string; nama: string; peranan: "GURU" | "PK" | "GB" | "ADMIN" } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: emel, kataLaluan: kunci }),
      });
      setPengguna(data.pengguna);
      toast.success(`Selamat datang, ${data.pengguna.nama}!`);
    } catch (err: any) {
      toast.error(err.message ?? "Log masuk gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row pattern-islamic">
      {/* Bahagian kiri - branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-gradient-to-br from-emerald-900 to-emerald-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <Image src="/logo.svg" alt="Logo" width={56} height={56} className="rounded-xl" />
            <div>
              <h1 className="text-xl font-bold school-title">SEKOLAH RENDAH ISLAM AL AMIN</h1>
              <p className="text-emerald-200 text-sm">Gombak, Selangor</p>
            </div>
          </div>
        </div>
        <div className="relative space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            Sistem Pengurusan<br />
            <span className="text-amber-300">Kokurikulum</span> (SPK)
          </h2>
          <p className="text-emerald-100 text-lg max-w-md">
            Modul Laporan Guru dan Kehadiran Murid Tahap 2 (Tahun 4 hingga 6). Rekod digital, pantauan real-time & eksport mesra.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-md">
            <StatIkon ikon={<Users className="h-5 w-5" />} nilai="120" label="Murid" />
            <StatIkon ikon={<BookOpen className="h-5 w-5" />} nilai="8" label="Unit" />
            <StatIkon ikon={<Award className="h-5 w-5" />} nilai="3" label="Kategori" />
          </div>
        </div>
        <div className="relative text-emerald-200 text-sm">
          <p>Prototaip v1.1 - Pemilik Produk: Penolong Kanan Kokurikulum</p>
        </div>
      </div>

      {/* Bahagian kanan - borang */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
            <Image src="/logo.svg" alt="Logo" width={48} height={48} className="rounded-xl" />
            <div>
              <h1 className="text-base font-bold school-title text-emerald-900">SR ISLAM AL AMIN GOMBAK</h1>
              <p className="text-xs text-muted-foreground">Sistem Pengurusan Kokurikulum</p>
            </div>
          </div>

          <Card className="border-emerald-100 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-900">
                <ShieldCheck className="h-5 w-5" />
                Log Masuk Sistem
              </CardTitle>
              <CardDescription>Masukkan emel dan kata laluan akaun sekolah anda.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={logMasuk} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Emel</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="cth: guru1@alamin.test"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kataLaluan">Kata Laluan</Label>
                  <div className="relative">
                    <Input
                      id="kataLaluan"
                      type={tunjuk ? "text" : "password"}
                      placeholder="Kata laluan"
                      value={kataLaluan}
                      onChange={(e) => setKataLaluan(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button type="button" onClick={() => setTunjuk(!tunjuk)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {tunjuk ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white">
                  {loading ? "Memproses..." : (<><LogIn className="h-4 w-4 mr-2" />Log Masuk</>)}
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">Akaun Demonstrasi (klik untuk log masuk pantas):</p>
                <div className="grid grid-cols-2 gap-2">
                  {akaunDemo.map((a) => (
                    <button
                      key={a.email}
                      onClick={() => akaunDemoKlik(a.email)}
                      disabled={loading}
                      className="text-left rounded-lg border border-emerald-100 bg-emerald-50/50 p-2 hover:bg-emerald-100/70 transition disabled:opacity-50"
                    >
                      <p className="text-xs font-semibold text-emerald-900">{a.peranan}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{a.email}</p>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">Kata laluan semua akaun demo: <code className="bg-muted px-1 rounded">Demo@1234</code></p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatIkon({ ikon, nilai, label }: { ikon: React.ReactNode; nilai: string; label: string }) {
  return (
    <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
      <div className="text-amber-300 mb-1">{ikon}</div>
      <div className="text-2xl font-bold">{nilai}</div>
      <div className="text-xs text-emerald-200">{label}</div>
    </div>
  );
}
