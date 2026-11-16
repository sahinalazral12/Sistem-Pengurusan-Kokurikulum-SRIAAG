"use client";

import { create } from "zustand";
import { QueryClient } from "@tanstack/react-query";
import type { Peranan } from "@/lib/auth";

// QueryClient tunggal dikongsi dengan page.tsx
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export type Paparan =
  | "papan-pemuka"
  | "unit-senarai"
  | "unit-butiran"
  | "sesi-senarai"
  | "kehadiran"
  | "laporan-senarai"
  | "laporan-borang"
  | "penilaian"
  | "eksport"
  | "admin-pengguna"
  | "admin-tetapan"
  | "admin-audit";

export interface PenggunaSesi {
  id: string;
  email: string;
  nama: string;
  peranan: Peranan;
}

interface AppState {
  pengguna: PenggunaSesi | null;
  loadingAuth: boolean;
  paparan: Paparan;
  // konteks view (contoh: unitId dipilih untuk butiran)
  unitIdAktif: string | null;
  sesiIdAktif: string | null;
  laporanIdAktif: string | null;

  setPengguna: (p: PenggunaSesi | null) => void;
  setLoadingAuth: (b: boolean) => void;
  setPaparan: (p: Paparan) => void;
  navigasi: (p: Paparan, opts?: { unitId?: string; sesiId?: string; laporanId?: string }) => void;
  logKeluar: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  pengguna: null,
  loadingAuth: true,
  paparan: "papan-pemuka",
  unitIdAktif: null,
  sesiIdAktif: null,
  laporanIdAktif: null,

  setPengguna: (p) => {
    // apabila pengguna berubah (login baru), kosongkan cache React Query
    queryClient.clear();
    set({ pengguna: p });
  },
  setLoadingAuth: (b) => set({ loadingAuth: b }),
  setPaparan: (p) => set({ paparan: p }),
  navigasi: (p, opts) =>
    set({
      paparan: p,
      unitIdAktif: opts?.unitId ?? null,
      sesiIdAktif: opts?.sesiId ?? null,
      laporanIdAktif: opts?.laporanId ?? null,
    }),
  logKeluar: async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("RALAT logKeluar:", e);
    }
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("spk_sesi_token");
    }
    queryClient.clear();
    set({ pengguna: null, paparan: "papan-pemuka", unitIdAktif: null, sesiIdAktif: null, laporanIdAktif: null });
  },
}));
