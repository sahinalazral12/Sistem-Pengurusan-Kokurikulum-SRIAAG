"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch, formatTarikh, labelPeranan } from "@/lib/format";
import { Peranan } from "@/lib/auth";
import { toast } from "sonner";
import { UserPlus, UserCog, Loader2, Users, Mail, ShieldCheck, CheckCircle2, XCircle, Pencil } from "lucide-react";

interface Pengguna {
  id: string;
  email: string;
  nama: string;
  peranan: Peranan;
  aktif: boolean;
  createdAt: string;
}

const PERANAN_PILIHAN: Peranan[] = ["GURU", "PK", "GB", "ADMIN"];

export function AdminPengguna() {
  const qc = useQueryClient();
  const [dialogTambah, setDialogTambah] = useState(false);
  const [editPengguna, setEditPengguna] = useState<Pengguna | null>(null);

  const { data, isLoading } = useQuery<{ pengguna: Pengguna[] }>({
    queryKey: ["pengguna"],
    queryFn: () => apiFetch("/api/pengguna"),
  });

  const senarai = data?.pengguna ?? [];

  const tambahMut = useMutation({
    mutationFn: (body: { email: string; nama: string; peranan: Peranan; kataLaluanDummy: string }) =>
      apiFetch<{ pengguna: Pengguna }>("/api/pengguna", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Pengguna berjaya ditambah.");
      qc.invalidateQueries({ queryKey: ["pengguna"] });
      setDialogTambah(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal menambah pengguna."),
  });

  const editMut = useMutation({
    mutationFn: (body: { id: string; nama: string; email: string; peranan: Peranan; kataLaluanDummy?: string; aktif: boolean }) =>
      apiFetch<{ pengguna: Pengguna }>("/api/pengguna", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Pengguna berjaya dikemaskini.");
      qc.invalidateQueries({ queryKey: ["pengguna"] });
      setEditPengguna(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal kemaskini pengguna."),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900 school-title flex items-center gap-2">
            <Users className="h-6 w-6" /> Pengurusan Pengguna
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Urus akaun pengguna sistem: guru, penyelaras, guru besar &amp; pentadbir.
          </p>
        </div>
        <Dialog open={dialogTambah} onOpenChange={setDialogTambah}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-700 hover:bg-emerald-800 text-white">
              <UserPlus className="h-4 w-4 mr-2" /> Tambah Pengguna
            </Button>
          </DialogTrigger>
          <BorangPengguna
            title="Tambah Pengguna Baru"
            desc="Isi butiran pengguna baharu. Kata laluan lalai ialah Demo@1234 jika dibiarkan kosong."
            submitLabel="Tambah"
            loading={tambahMut.isPending}
            onSubmit={(v) => tambahMut.mutate({
              email: v.email,
              nama: v.nama,
              peranan: v.peranan,
              kataLaluanDummy: v.kataLaluan || "Demo@1234",
            })}
          />
        </Dialog>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-emerald-800 flex items-center gap-2">
            <Users className="h-4 w-4" /> Senarai Pengguna ({senarai.length})
          </CardTitle>
          <CardDescription>Klik butang Edit untuk mengubah butiran atau menetapkan kata laluan baharu.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-emerald-700">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Memuatkan senarai pengguna...
            </div>
          ) : senarai.length === 0 ? (
            <EmptyState icon={<Users className="h-8 w-8" />} title="Tiada Pengguna" desc="Belum ada pengguna berdaftar dalam sistem." />
          ) : (
            <ScrollArea className="max-h-[28rem] rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-emerald-50">
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Emel</TableHead>
                    <TableHead>Peranan</TableHead>
                    <TableHead className="text-center">Status Aktif</TableHead>
                    <TableHead>Tarikh Dicipta</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {senarai.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nama}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.email}</TableCell>
                      <TableCell>
                        <BadgePeranan peranan={p.peranan} />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {p.aktif ? (
                            <><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span className="text-xs text-emerald-700">Aktif</span></>
                          ) : (
                            <><XCircle className="h-4 w-4 text-red-500" /><span className="text-xs text-red-600">Tidak Aktif</span></>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatTarikh(p.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50" onClick={() => setEditPengguna(p)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
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

      <Dialog open={!!editPengguna} onOpenChange={(o) => !o && setEditPengguna(null)}>
        {editPengguna && (
          <BorangPengguna
            title={`Edit Pengguna: ${editPengguna.nama}`}
            desc="Kemaskini butiran pengguna. Kata laluan baharu hanya diisi jika perlu ditukar."
            submitLabel="Simpan Perubahan"
            loading={editMut.isPending}
            lalai={editPengguna}
            onSubmit={(v) => editMut.mutate({
              id: editPengguna.id,
              nama: v.nama,
              email: v.email,
              peranan: v.peranan,
              kataLaluanDummy: v.kataLaluan || undefined,
              aktif: v.aktif ?? editPengguna.aktif,
            })}
          />
        )}
      </Dialog>
    </div>
  );
}

function BadgePeranan({ peranan }: { peranan: Peranan }) {
  const config: Record<Peranan, string> = {
    GURU: "bg-emerald-100 text-emerald-800 border-emerald-200",
    PK: "bg-amber-100 text-amber-800 border-amber-200",
    GB: "bg-rose-100 text-rose-800 border-rose-200",
    ADMIN: "bg-emerald-900 text-emerald-100 border-emerald-700",
  };
  return (
    <Badge variant="outline" className={config[peranan]}>
      <ShieldCheck className="h-3 w-3 mr-1" /> {labelPeranan[peranan]}
    </Badge>
  );
}

interface NilaiBorang {
  nama: string;
  email: string;
  peranan: Peranan;
  kataLaluan: string;
  aktif?: boolean;
}

function BorangPengguna({
  title,
  desc,
  submitLabel,
  loading,
  lalai,
  onSubmit,
}: {
  title: string;
  desc: string;
  submitLabel: string;
  loading: boolean;
  lalai?: Pengguna;
  onSubmit: (v: NilaiBorang) => void;
}) {
  const [nama, setNama] = useState(lalai?.nama ?? "");
  const [email, setEmail] = useState(lalai?.email ?? "");
  const [peranan, setPeranan] = useState<Peranan>(lalai?.peranan ?? "GURU");
  const [kataLaluan, setKataLaluan] = useState("");
  const [aktif, setAktif] = useState(lalai?.aktif ?? true);

  function hantar(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim() || !email.trim()) {
      toast.error("Nama dan emel diperlukan.");
      return;
    }
    onSubmit({ nama: nama.trim(), email: email.trim().toLowerCase(), peranan, kataLaluan: kataLaluan.trim(), aktif });
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-emerald-800">
          <UserCog className="h-5 w-5" /> {title}
        </DialogTitle>
        <DialogDescription>{desc}</DialogDescription>
      </DialogHeader>
      <form onSubmit={hantar} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pg-nama">Nama Penuh</Label>
          <Input id="pg-nama" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Cth: Ahmad bin Ali" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pg-email" className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Emel</Label>
          <Input id="pg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@alamin.test" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pg-peranan">Peranan</Label>
          <Select value={peranan} onValueChange={(v) => setPeranan(v as Peranan)}>
            <SelectTrigger id="pg-peranan">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERANAN_PILIHAN.map((p) => (
                <SelectItem key={p} value={p}>{labelPeranan[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pg-pw">Kata Laluan {lalai ? "Baharu (opsyenal)" : "(opsyenal)"}</Label>
          <Input id="pg-pw" type="text" value={kataLaluan} onChange={(e) => setKataLaluan(e.target.value)} placeholder={lalai ? "Biarkan kosong jika tidak diubah" : "Lalai: Demo@1234"} />
          <p className="text-xs text-muted-foreground">Prototaip: kata laluan tidak dihash.</p>
        </div>
        {lalai && (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="pg-aktif" className="text-sm font-medium">Status Aktif</Label>
              <p className="text-xs text-muted-foreground">Pengguna tidak aktif tidak boleh log masuk.</p>
            </div>
            <Switch id="pg-aktif" checked={aktif} onCheckedChange={setAktif} />
          </div>
        )}
        <DialogFooter>
          <Button type="submit" disabled={loading} className="bg-emerald-700 hover:bg-emerald-800 text-white">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</> : submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
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
