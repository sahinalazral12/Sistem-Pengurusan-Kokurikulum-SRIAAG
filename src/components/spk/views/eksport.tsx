"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BadgeLaporan } from "@/components/spk/badges";
import { apiFetch, formatTarikh, formatTarikhPendek, formatMasa, labelStatusLaporan } from "@/lib/format";
import { toast } from "sonner";
import {
  Download, Printer, FileText, FileSpreadsheet, Loader2, CalendarRange, Building2, ScrollText, CheckCircle2, AlertCircle,
} from "lucide-react";

interface Unit {
  id: string;
  nama: string;
  kategori: string;
}

interface LaporanItem {
  id: string;
  status: string;
  updatedAt: string;
  sesi: { id: string; tajuk: string; tarikh: string; unit: { id: string; nama: string } };
  diciptaOleh?: { nama: string };
  objektif: string;
  ringkasan: string;
  hasil: string;
  masalah: string;
  cadangan: string;
  tarikhHantar?: string | null;
}

interface LaporanPenuh extends LaporanItem {
  statKehadiran?: { hadir: number; total: number; peratus: number };
  diciptaOleh?: { nama: string; email: string };
}

export function EksportView() {
  // Eksport CSV state
  const [csvUnitId, setCsvUnitId] = useState("");
  const [csvDari, setCsvDari] = useState("");
  const [csvHingga, setCsvHingga] = useState("");

  // Cetak PDF state
  const [pdfUnitId, setPdfUnitId] = useState("");
  const [pdfTempoh, setPdfTempoh] = useState("SEMUA");
  const [laporanTerpilih, setLaporanTerpilih] = useState<string | null>(null);

  const { data: dataUnit, isLoading: loadingUnit } = useQuery<{ units: Unit[] }>({
    queryKey: ["units-eksport"],
    queryFn: () => apiFetch("/api/units"),
  });

  const { data: dataLaporan, isLoading: loadingLaporan } = useQuery<{ laporan: LaporanItem[] }>({
    queryKey: ["laporan-eksport", pdfUnitId],
    queryFn: () => apiFetch(`/api/reports?unitId=${pdfUnitId}&status=DILULUSKAN`),
    enabled: !!pdfUnitId,
  });

  const laporanSenarai = dataLaporan?.laporan ?? [];
  const unitDipilih = dataUnit?.units.find((u) => u.id === laporanTerpilih) ?? null;

  function eksportCsv() {
    if (!csvUnitId) {
      toast.error("Sila pilih unit terlebih dahulu.");
      return;
    }
    const params = new URLSearchParams({
      unitId: csvUnitId,
      dari: csvDari,
      hingga: csvHingga,
    });
    // Trigger download melalui pelayar
    window.open(`/api/export/attendance?${params.toString()}`, "_blank");
    toast.success("Eksport CSV dijalankan. Fail akan dimuat turun sebentar lagi.");
  }

  async function cetakLaporanUnit() {
    if (!pdfUnitId) {
      toast.error("Sila pilih unit untuk cetakan.");
      return;
    }
    if (laporanSenarai.length === 0) {
      toast.error("Tiada laporan diluluskan untuk unit ini.");
      return;
    }
    // Gunakan laporan pertama dalam senarai sebagai laporan unit keseluruhan
    setLaporanTerpilih(laporanSenarai[0].id);
    // Beri masa untuk data dimuat, kemudian panggil window.print()
    setTimeout(() => {
      window.print();
    }, 600);
  }

  async function cetakLaporanIni(id: string) {
    setLaporanTerpilih(id);
    setTimeout(() => {
      window.print();
    }, 600);
  }

  // Ambil data penuh untuk laporan cetak
  const { data: dataCetak, isLoading: loadingCetak } = useQuery<{ laporan: LaporanPenuh }>({
    queryKey: ["laporan-cetak", laporanTerpilih],
    queryFn: () => apiFetch(`/api/reports/${laporanTerpilih}`),
    enabled: !!laporanTerpilih,
  });

  const laporanCetak = dataCetak?.laporan;

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .printable-area, .printable-area * { visibility: visible !important; }
          .printable-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 18mm 16mm; }
        }
      `}</style>

      <div className="no-print">
        <header className="mb-4">
          <h1 className="text-2xl font-bold text-emerald-900 school-title flex items-center gap-2">
            <Download className="h-6 w-6" /> Eksport &amp; Cetak Laporan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Eksport CSV kehadiran murid atau cetak laporan aktiviti unit dalam format A4 rasmi.
          </p>
        </header>

        {/* Bento grid dua bahagian */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Bahagian 1: Eksport CSV */}
          <Card className="card-hover border-emerald-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-800">
                <FileSpreadsheet className="h-5 w-5" /> Eksport CSV Kehadiran
              </CardTitle>
              <CardDescription>
                Muat turun rekod kehadiran murid mengikut unit dan julat tarikh dalam format CSV.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="csv-unit" className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> Pilih Unit
                </Label>
                <Select value={csvUnitId} onValueChange={setCsvUnitId}>
                  <SelectTrigger id="csv-unit">
                    <SelectValue placeholder="-- Pilih Unit --" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingUnit ? (
                      <SelectItem value="_loading" disabled>Memuatkan...</SelectItem>
                    ) : (
                      (dataUnit?.units ?? []).map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.nama}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="csv-dari" className="flex items-center gap-1">
                    <CalendarRange className="h-3.5 w-3.5" /> Tarikh Mula
                  </Label>
                  <Input id="csv-dari" type="date" value={csvDari} onChange={(e) => setCsvDari(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="csv-hingga" className="flex items-center gap-1">
                    <CalendarRange className="h-3.5 w-3.5" /> Tarikh Tamat
                  </Label>
                  <Input id="csv-hingga" type="date" value={csvHingga} onChange={(e) => setCsvHingga(e.target.value)} />
                </div>
              </div>

              <div className="rounded-md bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Jika tarikh dibiarkan kosong, semua sesi bagi unit tersebut akan dieksport. Fail CSV akan dijana secara automatik oleh pelayan.
                </span>
              </div>

              <Button onClick={eksportCsv} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white">
                <Download className="h-4 w-4 mr-2" /> Eksport CSV
              </Button>
            </CardContent>
          </Card>

          {/* Bahagian 2: Cetak PDF A4 */}
          <Card className="card-hover border-emerald-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-800">
                <Printer className="h-5 w-5" /> Cetak Laporan Aktiviti Unit (A4)
              </CardTitle>
              <CardDescription>
                Pilih unit &amp; tempoh, kemudian cetak laporan aktiviti dalam format A4 rasmi sekolah.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pdf-unit" className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> Pilih Unit
                </Label>
                <Select value={pdfUnitId} onValueChange={(v) => { setPdfUnitId(v); setLaporanTerpilih(null); }}>
                  <SelectTrigger id="pdf-unit">
                    <SelectValue placeholder="-- Pilih Unit --" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingUnit ? (
                      <SelectItem value="_loading" disabled>Memuatkan...</SelectItem>
                    ) : (
                      (dataUnit?.units ?? []).map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.nama}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pdf-tempoh">Pilih Tempoh</Label>
                <Select value={pdfTempoh} onValueChange={setPdfTempoh}>
                  <SelectTrigger id="pdf-tempoh">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEMUA">Semua Sesi</SelectItem>
                    <SelectItem value="BULAN_INI">Bulan Semasa</SelectItem>
                    <SelectItem value="TAHUN_INI">Tahun Semasa</SelectItem>
                    <SelectItem value="SEMESTER">Semester Semasa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={cetakLaporanUnit} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white" disabled={!pdfUnitId}>
                <Printer className="h-4 w-4 mr-2" /> Cetak Laporan Aktiviti Unit
              </Button>

              {pdfUnitId && (
                <p className="text-xs text-muted-foreground">
                  {loadingLaporan ? "Memuatkan senarai laporan..." : `${laporanSenarai.length} laporan diluluskan tersedia untuk unit ini.`}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Senarai laporan diluluskan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-800 text-base">
              <ScrollText className="h-5 w-5" /> Senarai Laporan Diluluskan untuk Cetakan
            </CardTitle>
            <CardDescription>Pilih satu laporan untuk dicetak secara individu.</CardDescription>
          </CardHeader>
          <CardContent>
            {!pdfUnitId ? (
              <EmptyState icon={<Building2 className="h-8 w-8" />} title="Pilih Unit" desc="Sila pilih unit pada bahagian Cetak PDF di atas untuk memuatkan senarai laporan." />
            ) : loadingLaporan ? (
              <div className="flex items-center justify-center py-10 text-emerald-700">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Memuatkan senarai laporan...
              </div>
            ) : laporanSenarai.length === 0 ? (
              <EmptyState icon={<FileText className="h-8 w-8" />} title="Tiada Laporan" desc="Tiada laporan diluluskan untuk unit ini setakat ini." />
            ) : (
              <ScrollArea className="max-h-96 rounded-md border">
                <ul className="divide-y">
                  {laporanSenarai.map((l) => (
                    <li key={l.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 hover:bg-muted/40">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm truncate">{l.sesi.tajuk}</p>
                          <BadgeLaporan status={l.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {l.sesi.unit.nama} · {formatTarikh(l.sesi.tarikh)} · Dihantar oleh {l.diciptaOleh?.nama ?? "-"}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50 self-start sm:self-center" onClick={() => cetakLaporanIni(l.id)}>
                        <Printer className="h-3.5 w-3.5 mr-1" /> Cetak Laporan Ini
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Pratonton cetakan */}
        {laporanTerpilih && (
          <Card className="border-dashed border-emerald-200 no-print">
            <CardHeader>
              <CardTitle className="text-base text-emerald-800 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Pratonton Cetakan
              </CardTitle>
              <CardDescription>Laporan berikut akan dicetak dengan layout A4. Klik "Cetak" pada dialog pelayar.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCetak ? (
                <div className="flex items-center justify-center py-10 text-emerald-700">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" /> Memuatkan butiran laporan...
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Pratonton tersedia di kawasan cetakan di bawah.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Printable area - sentiasa ada dalam DOM tetapi hanya nampak bila cetak */}
      {laporanCetak && (
        <div className="printable-area bg-white text-black">
          <PrintableReport laporan={laporanCetak} unitNama={laporanCetak.sesi.unit.nama} />
        </div>
      )}
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

function PrintableReport({ laporan, unitNama }: { laporan: LaporanPenuh; unitNama: string }) {
  const stat = laporan.statKehadiran ?? { hadir: 0, total: 0, peratus: 0 };
  const pengguna = laporan.diciptaOleh;
  const tarikhSesi = laporan.sesi.tarikh;

  return (
    <article className="font-serif text-[12pt] leading-relaxed text-black" style={{ fontFamily: "'Times New Roman', serif" }}>
      {/* Kop Sekolah */}
      <header className="border-b-2 border-black pb-3 mb-4 flex items-center gap-4">
        <div className="w-16 h-16 flex items-center justify-center border border-black rounded-full text-2xl font-bold">
          AA
        </div>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold uppercase tracking-wide">SEKOLAH RENDAH ISLAM AL AMIN, GOMBAK</h1>
          <p className="text-[10pt]">Jalan Gombak, 53100 Kuala Lumpur &middot; Tel: 03-XXXX XXXX</p>
        </div>
      </header>

      {/* Tajuk laporan */}
      <div className="text-center mb-4">
        <h2 className="text-base font-bold underline uppercase">Laporan Aktiviti Kokurikulum</h2>
        <p className="text-[11pt] mt-1">Unit: <strong>{unitNama}</strong></p>
      </div>

      {/* Maklumat sesi */}
      <section className="mb-4">
        <table className="w-full text-[11pt] border-collapse">
          <tbody>
            <tr>
              <td className="py-1 w-1/3"><strong>Tajuk Aktiviti:</strong></td>
              <td className="py-1">{laporan.sesi.tajuk}</td>
            </tr>
            <tr>
              <td className="py-1"><strong>Tarikh:</strong></td>
              <td className="py-1">{formatTarikh(tarikhSesi)}</td>
            </tr>
            <tr>
              <td className="py-1"><strong>Laporan Dihantar:</strong></td>
              <td className="py-1">{laporan.tarikhHantar ? formatTarikh(laporan.tarikhHantar) : "-"}</td>
            </tr>
            <tr>
              <td className="py-1"><strong>Disediakan Oleh:</strong></td>
              <td className="py-1">{pengguna?.nama ?? "-"} ({pengguna?.email ?? "-"})</td>
            </tr>
            <tr>
              <td className="py-1"><strong>Kehadiran:</strong></td>
              <td className="py-1">{stat.hadir} / {stat.total} murid ({stat.peratus}%)</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Kandungan laporan */}
      <section className="space-y-3 text-[11pt]">
        <SubTajuk tajuk="Objektif Aktiviti" />
        <Paragraph teks={laporan.objektif} />

        <SubTajuk tajuk="Ringkasan Aktiviti" />
        <Paragraph teks={laporan.ringkasan} />

        <SubTajuk tajuk="Hasil / Pencapaian" />
        <Paragraph teks={laporan.hasil} />

        <SubTajuk tajuk="Masalah / Halangan" />
        <Paragraph teks={laporan.masalah} />

        <SubTajuk tajuk="Cadangan Penambahbaikan" />
        <Paragraph teks={laporan.cadangan} />
      </section>

      {/* Footer ditandatangani */}
      <footer className="mt-10 flex justify-between text-[11pt]">
        <div className="text-center w-1/2">
          <p>Disediakan oleh:</p>
          <div className="h-20" />
          <p className="border-t border-black pt-1">__________________________</p>
          <p>({pengguna?.nama ?? "Guru Penasihat"})</p>
        </div>
        <div className="text-center w-1/2">
          <p>Diluluskan oleh:</p>
          <div className="h-20" />
          <p className="border-t border-black pt-1">__________________________</p>
          <p>(Penyelaras Kokurikulum)</p>
        </div>
      </footer>

      <div className="mt-6 text-center text-[9pt] text-gray-600 border-t border-gray-300 pt-2">
        Dokumen ini dijana oleh Sistem Pengurusan Kokurikulum (SPK) Sekolah Rendah Islam Al Amin, Gombak &middot; {formatTarikh(new Date())} {formatMasa(new Date())}
      </div>
    </article>
  );
}

function SubTajuk({ tajuk }: { tajuk: string }) {
  return <h3 className="font-bold text-[11pt] underline">{tajuk}</h3>;
}

function Paragraph({ teks }: { teks: string }) {
  if (!teks || teks.trim() === "") return <p className="italic text-gray-600">- Tiada -</p>;
  // Pecah mengikut baris baru
  return (
    <div className="text-justify whitespace-pre-line">
      {teks}
    </div>
  );
}
