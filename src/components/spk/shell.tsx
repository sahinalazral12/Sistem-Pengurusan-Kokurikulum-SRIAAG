"use client";

import { useAppStore, Paparan } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard, Users, CalendarClock, ClipboardCheck, FileText, Star, Download, Settings, UserCog, ScrollText, LogOut, Menu, GraduationCap
} from "lucide-react";
import { labelPeranan } from "@/lib/format";
import Image from "next/image";
import { useState } from "react";

interface ItemNav {
  paparan: Paparan;
  label: string;
  ikon: React.ReactNode;
  perananDibenarkan: ("GURU" | "PK" | "GB" | "ADMIN")[];
}

const itemNav: ItemNav[] = [
  { paparan: "papan-pemuka", label: "Papan Pemuka", ikon: <LayoutDashboard className="h-4 w-4" />, perananDibenarkan: ["GURU", "PK", "GB", "ADMIN"] },
  { paparan: "unit-senarai", label: "Unit & Keahlian", ikon: <Users className="h-4 w-4" />, perananDibenarkan: ["GURU", "PK", "ADMIN"] },
  { paparan: "sesi-senarai", label: "Sesi Aktiviti", ikon: <CalendarClock className="h-4 w-4" />, perananDibenarkan: ["GURU", "PK", "ADMIN"] },
  { paparan: "kehadiran", label: "Rekod Kehadiran", ikon: <ClipboardCheck className="h-4 w-4" />, perananDibenarkan: ["GURU", "PK"] },
  { paparan: "laporan-senarai", label: "Laporan Aktiviti", ikon: <FileText className="h-4 w-4" />, perananDibenarkan: ["GURU", "PK", "GB"] },
  { paparan: "penilaian", label: "Penilaian Murid", ikon: <Star className="h-4 w-4" />, perananDibenarkan: ["GURU", "PK"] },
  { paparan: "eksport", label: "Eksport & Cetak", ikon: <Download className="h-4 w-4" />, perananDibenarkan: ["PK", "GB", "ADMIN"] },
  { paparan: "admin-pengguna", label: "Pengguna", ikon: <UserCog className="h-4 w-4" />, perananDibenarkan: ["ADMIN"] },
  { paparan: "admin-tetapan", label: "Tetapan Sistem", ikon: <Settings className="h-4 w-4" />, perananDibenarkan: ["ADMIN"] },
  { paparan: "admin-audit", label: "Log Audit", ikon: <ScrollText className="h-4 w-4" />, perananDibenarkan: ["ADMIN", "PK"] },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { pengguna, paparan, navigasi, logKeluar } = useAppStore();
  const [open, setOpen] = useState(false);

  if (!pengguna) return null;

  const itemTampak = itemNav.filter((i) => i.perananDibenarkan.includes(pengguna.peranan));
  const inisial = pengguna.nama.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase();

  const SideContent = (
    <div className="flex flex-col h-full">
      {/* Logo & Tajuk */}
      <div className="p-4 border-b bg-emerald-900 text-white">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Logo" width={40} height={40} className="rounded-lg bg-white/10 p-0.5" />
          <div className="leading-tight">
            <h1 className="text-sm font-bold">SR Islam Al Amin</h1>
            <p className="text-[11px] text-emerald-200">Pengurusan Kokurikulum</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 overflow-y-auto scroll-area-custom">
        <ul className="space-y-1">
          {itemTampak.map((item) => (
            <li key={item.paparan}>
              <button
                onClick={() => {
                  navigasi(item.paparan);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  paparan === item.paparan || (item.paparan === "unit-senarai" && paparan === "unit-butiran") || (item.paparan === "laporan-senarai" && paparan === "laporan-borang")
                    ? "bg-emerald-100 text-emerald-900"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.ikon}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Pengguna */}
      <div className="p-3 border-t">
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-9 w-9 border border-emerald-200">
            <AvatarFallback className="bg-emerald-100 text-emerald-800 text-xs font-semibold">{inisial}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{pengguna.nama}</p>
            <p className="text-[11px] text-muted-foreground">{labelPeranan[pengguna.peranan]}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={logKeluar} className="w-full justify-start text-muted-foreground hover:text-destructive">
          <LogOut className="h-4 w-4 mr-2" /> Log Keluar
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header mobile */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Logo" width={32} height={32} className="rounded-md" />
          <div className="leading-tight">
            <p className="text-xs font-bold text-emerald-900">SR Islam Al Amin Gombak</p>
            <p className="text-[10px] text-muted-foreground">SPK</p>
          </div>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            {SideContent}
          </SheetContent>
        </Sheet>
      </header>

      {/* Header desktop */}
      <header className="hidden lg:flex sticky top-0 z-30 items-center justify-between border-b bg-white/90 backdrop-blur px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-emerald-700" />
            <div>
              <h2 className="text-base font-bold text-emerald-900 school-title">{tajukPaparan(paparan)}</h2>
              <p className="text-xs text-muted-foreground">Sistem Pengurusan Kokurikulum - Tahap 2 (Tahun 4 hingga 6)</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium">{pengguna.nama}</p>
            <p className="text-[11px] text-muted-foreground">{labelPeranan[pengguna.peranan]}</p>
          </div>
          <Avatar className="h-9 w-9 border border-emerald-200">
            <AvatarFallback className="bg-emerald-100 text-emerald-800 text-xs font-semibold">{inisial}</AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Badan */}
      <div className="flex flex-1">
        {/* Sidebar desktop */}
        <aside className="hidden lg:block w-64 border-r bg-sidebar flex-shrink-0 sticky top-[57px] h-[calc(100vh-57px)]">
          {SideContent}
        </aside>

        <main className="flex-1 min-w-0">
          <div className="p-4 lg:p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Footer sticky */}
      <footer className="mt-auto border-t bg-emerald-900 text-emerald-100 px-4 py-3 text-center text-xs">
        <p>&copy; {new Date().getFullYear()} Sekolah Rendah Islam Al Amin, Gombak. Sistem Pengurusan Kokurikulum v1.1 (Prototaip). Hak cipta terpelihara.</p>
      </footer>
    </div>
  );
}

function tajukPaparan(p: Paparan): string {
  const map: Record<Paparan, string> = {
    "papan-pemuka": "Papan Pemuka",
    "unit-senarai": "Unit & Keahlian Murid",
    "unit-butiran": "Butiran Unit",
    "sesi-senarai": "Sesi Aktiviti",
    "kehadiran": "Rekod Kehadiran",
    "laporan-senarai": "Laporan Aktiviti",
    "laporan-borang": "Borang Laporan",
    "penilaian": "Penilaian Murid",
    "eksport": "Eksport & Cetak",
    "admin-pengguna": "Pengurusan Pengguna",
    "admin-tetapan": "Tetapan Sistem",
    "admin-audit": "Log Audit",
  };
  return map[p];
}
