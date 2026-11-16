"use client";

import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { useAppStore, queryClient } from "@/lib/store";
import { apiFetch } from "@/lib/format";
import { LoginScreen } from "@/components/spk/login-screen";
import { Shell } from "@/components/spk/shell";
import { PapanPemuka } from "@/components/spk/views/papan-pemuka";
import { UnitSenarai } from "@/components/spk/views/unit-senarai";
import { UnitButiran } from "@/components/spk/views/unit-butiran";
import { SesiSenarai } from "@/components/spk/views/sesi-senarai";
import { KehadiranView } from "@/components/spk/views/kehadiran";
import { LaporanSenarai } from "@/components/spk/views/laporan-senarai";
import { LaporanBorang } from "@/components/spk/views/laporan-borang";
import { PenilaianView } from "@/components/spk/views/penilaian";
import { EksportView } from "@/components/spk/views/eksport";
import { AdminPengguna } from "@/components/spk/views/admin-pengguna";
import { AdminTetapan } from "@/components/spk/views/admin-tetapan";
import { AdminAudit } from "@/components/spk/views/admin-audit";
import { Loader2 } from "lucide-react";

export default function Page() {
  const pengguna = useAppStore((s) => s.pengguna);
  const setPengguna = useAppStore((s) => s.setPengguna);
  const loadingAuth = useAppStore((s) => s.loadingAuth);
  const setLoadingAuth = useAppStore((s) => s.setLoadingAuth);
  const paparan = useAppStore((s) => s.paparan);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{ pengguna: any }>("/api/auth/me");
        setPengguna(data.pengguna);
      } catch {
        setPengguna(null);
      } finally {
        setLoadingAuth(false);
      }
    })();
  }, [setPengguna, setLoadingAuth]);

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center pattern-islamic">
        <div className="flex flex-col items-center gap-3 text-emerald-800">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Memuatkan Sistem Pengurusan Kokurikulum...</p>
        </div>
      </div>
    );
  }

  if (!pengguna) {
    return <LoginScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Shell>
        {paparan === "papan-pemuka" && <PapanPemuka />}
        {paparan === "unit-senarai" && <UnitSenarai />}
        {paparan === "unit-butiran" && <UnitButiran />}
        {paparan === "sesi-senarai" && <SesiSenarai />}
        {paparan === "kehadiran" && <KehadiranView />}
        {paparan === "laporan-senarai" && <LaporanSenarai />}
        {paparan === "laporan-borang" && <LaporanBorang />}
        {paparan === "penilaian" && <PenilaianView />}
        {paparan === "eksport" && <EksportView />}
        {paparan === "admin-pengguna" && <AdminPengguna />}
        {paparan === "admin-tetapan" && <AdminTetapan />}
        {paparan === "admin-audit" && <AdminAudit />}
      </Shell>
    </QueryClientProvider>
  );
}
