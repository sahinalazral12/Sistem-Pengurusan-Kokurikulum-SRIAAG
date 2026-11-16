"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { apiFetch, formatTarikh, formatMasa } from "@/lib/format";
import { toast } from "sonner";
import { ScrollText, RefreshCw, Loader2, Search, Clock, User, Activity, FileSearch } from "lucide-react";

interface LogAudit {
  id: string;
  tindakan: string;
  entiti: string;
  entitiId?: string | null;
  butiran?: string | null;
  masa: string;
  pengguna?: { nama: string; email: string } | null;
}

const PILIHAN_LIMIT = [50, 100, 200];

const WARNA_ENTITI: Record<string, string> = {
  PENGGUNA: "bg-emerald-100 text-emerald-800 border-emerald-200",
  UNIT: "bg-amber-100 text-amber-800 border-amber-200",
  MURID: "bg-rose-100 text-rose-800 border-rose-200",
  SESI: "bg-emerald-100 text-emerald-800 border-emerald-200",
  LAPORAN_AKTIVITI: "bg-amber-100 text-amber-800 border-amber-200",
  PENILAIAN: "bg-rose-100 text-rose-800 border-rose-200",
  KEHADIRAN: "bg-emerald-100 text-emerald-800 border-emerald-200",
  TETAPAN: "bg-amber-100 text-amber-800 border-amber-200",
  SISTEM: "bg-emerald-900 text-emerald-100 border-emerald-700",
  AUTH: "bg-rose-100 text-rose-800 border-rose-200",
};

export function AdminAudit() {
  const [limit, setLimit] = useState(50);
  const [carian, setCarian] = useState("");

  const { data, isLoading, isFetching, refetch } = useQuery<{ log: LogAudit[] }>({
    queryKey: ["audit", limit],
    queryFn: () => apiFetch(`/api/audit?limit=${limit}`),
    refetchInterval: 30000, // auto-refresh setiap 30s
  });

  const senarai = data?.log ?? [];
  const tapis = carian.trim()
    ? senarai.filter((l) =>
        (l.tindakan ?? "").toLowerCase().includes(carian.toLowerCase()) ||
        (l.entiti ?? "").toLowerCase().includes(carian.toLowerCase()) ||
        (l.butiran ?? "").toLowerCase().includes(carian.toLowerCase()) ||
        (l.pengguna?.nama ?? "").toLowerCase().includes(carian.toLowerCase())
      )
    : senarai;

  function muatSemula() {
    refetch();
    toast.success("Log audit dimuat semula.");
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900 school-title flex items-center gap-2">
            <ScrollText className="h-6 w-6" /> Log Audit Sistem
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Jejak semua tindakan pengguna dalam sistem (FR-39). Auto-muat semula setiap 30 saat.
          </p>
        </div>
        <Button variant="outline" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50" onClick={muatSemula}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Muat Semula
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-emerald-800 flex items-center gap-2">
            <Activity className="h-4 w-4" /> Senarai Log Audit
          </CardTitle>
          <CardDescription>
            Memuat sehingga {limit} rekod terkini. {isFetching && "Memuat semula..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cari" className="flex items-center gap-1">
                <Search className="h-3.5 w-3.5" /> Cari Tindakan / Pengguna / Butiran
              </Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="cari" value={carian} onChange={(e) => setCarian(e.target.value)} placeholder="Cth: TAMBAH_UNIT, login, nama pengguna..." className="pl-8" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="limit">Bilangan Rekod</Label>
              <Select value={String(limit)} onValueChange={(v) => setLimit(parseInt(v, 10))}>
                <SelectTrigger id="limit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PILIHAN_LIMIT.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} rekod</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Senarai */}
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-emerald-700">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Memuatkan log audit...
            </div>
          ) : tapis.length === 0 ? (
            <EmptyState icon={<FileSearch className="h-8 w-8" />} title="Tiada Log Dijumpai" desc={carian ? "Tiada rekod padanan dengan carian anda." : "Belum ada sebarang aktiviti direkodkan."} />
          ) : (
            <ScrollArea className="max-h-[32rem] rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-emerald-50">
                  <TableRow>
                    <TableHead className="w-36"><span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Masa</span></TableHead>
                    <TableHead className="w-44"><span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Pengguna</span></TableHead>
                    <TableHead className="w-44">Tindakan</TableHead>
                    <TableHead className="w-32">Entiti</TableHead>
                    <TableHead>Butiran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tapis.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">
                        <div className="font-medium text-emerald-900">{formatTarikh(l.masa)}</div>
                        <div className="text-muted-foreground">{formatMasa(l.masa)}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium truncate">{l.pengguna?.nama ?? "Sistem"}</div>
                        <div className="text-xs text-muted-foreground truncate">{l.pengguna?.email ?? "-"}</div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{l.tindakan}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={WARNA_ENTITI[l.entiti] ?? "bg-muted text-muted-foreground"}>
                          {l.entiti}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {l.butiran ?? "-"}
                        {l.entitiId && (
                          <div className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">ID: {l.entitiId}</div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {tapis.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Menunjukkan {tapis.length} daripada {senarai.length} rekod{carian ? " (ditapis)" : ""}.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
      <div className="rounded-full bg-muted p-3 mb-2">{icon}</div>
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs mt-1 max-w-xs">{desc}</p>
    </div>
  );
}
