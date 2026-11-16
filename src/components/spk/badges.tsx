"use client";

import { cn } from "@/lib/utils";
import { labelStatusKehadiran, labelStatusLaporan, labelStatusSesi, labelTahapPenilaian, warnaStatusKehadiran } from "@/lib/format";
import { CheckCircle2, XCircle, Clock, Stethoscope, Briefcase, FileEdit, Send, Undo2, CheckCircle, Target, BookOpen, AlertTriangle } from "lucide-react";

// Badge status kehadiran (FR-12.1: warna + ikon/teks)
export function BadgeKehadiran({ status }: { status: string }) {
  const label = labelStatusKehadiran[status] ?? status;
  const ikon = {
    HADIR: <CheckCircle2 className="h-3.5 w-3.5" />,
    TIDAK_HADIR: <XCircle className="h-3.5 w-3.5" />,
    LEWAT: <Clock className="h-3.5 w-3.5" />,
    SAKIT: <Stethoscope className="h-3.5 w-3.5" />,
    URUSAN_RASMI: <Briefcase className="h-3.5 w-3.5" />,
  }[status] ?? null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        warnaStatusKehadiran[status] ?? "bg-muted text-muted-foreground"
      )}
    >
      {ikon}
      {label}
    </span>
  );
}

// Badge status laporan
export function BadgeLaporan({ status }: { status: string }) {
  const label = labelStatusLaporan[status] ?? status;
  const config: Record<string, { class: string; ikon: React.ReactNode }> = {
    DRAF: { class: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", ikon: <FileEdit className="h-3.5 w-3.5" /> },
    DIHANTAR: { class: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300", ikon: <Send className="h-3.5 w-3.5" /> },
    DIKEMBALIKAN: { class: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300", ikon: <Undo2 className="h-3.5 w-3.5" /> },
    DILULUSKAN: { class: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", ikon: <CheckCircle className="h-3.5 w-3.5" /> },
  };
  const c = config[status] ?? { class: "bg-muted text-muted-foreground", ikon: null };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", c.class)}>
      {c.ikon}
      {label}
    </span>
  );
}

// Badge status sesi
export function BadgeSesi({ status }: { status: string }) {
  const label = labelStatusSesi[status] ?? status;
  const config: Record<string, string> = {
    DIRANCANG: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    SELESAI: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    DIBATALKAN: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    DITANGGUH: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  };
  return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", config[status] ?? "bg-muted text-muted-foreground")}>{label}</span>;
}

// Badge tahap penilaian
export function BadgeTahap({ tahap }: { tahap: string }) {
  const label = labelTahapPenilaian[tahap] ?? tahap;
  const config: Record<string, { class: string; ikon: React.ReactNode }> = {
    CEMERLANG: { class: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", ikon: <Target className="h-3.5 w-3.5" /> },
    BAIK: { class: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300", ikon: <BookOpen className="h-3.5 w-3.5" /> },
    MEMUASKAN: { class: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", ikon: <CheckCircle className="h-3.5 w-3.5" /> },
    PERLU_PERHATIAN: { class: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", ikon: <AlertTriangle className="h-3.5 w-3.5" /> },
  };
  const c = config[tahap] ?? { class: "bg-muted text-muted-foreground", ikon: null };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", c.class)}>
      {c.ikon}
      {label}
    </span>
  );
}

// Badge kategori unit
export function BadgeKategori({ kategori }: { kategori: string }) {
  const config: Record<string, string> = {
    BERUNIFORM: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    KELAB: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    SUKAN: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  };
  const label: Record<string, string> = {
    BERUNIFORM: "Badan Beruniform",
    KELAB: "Kelab/Persatuan",
    SUKAN: "Sukan/Permainan",
  };
  return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", config[kategori] ?? "bg-muted")}>{label[kategori] ?? kategori}</span>;
}
