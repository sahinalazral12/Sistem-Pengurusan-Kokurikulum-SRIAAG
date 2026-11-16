import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dapatPenggunaSesi, resp, respRalat, unitGuru, logAudit } from "@/lib/auth";

// GET /api/units/[id]/members - senarai ahli unit
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  const { id } = await params;
  if (sesi.peranan === "GURU") {
    const unitIds = (await unitGuru(sesi.penggunaId)).map((u) => u.id);
    if (!unitIds.includes(id)) return respRalat("Tiada akses.", 403);
  }
  const keahlian = await db.keahlian.findMany({
    where: { unitId: id, aktif: true },
    include: { murid: true },
    orderBy: [{ murid: { tahun: "asc" } }, { murid: { nama: "asc" } }],
  });
  return resp({ ahli: keahlian });
}

// POST /api/units/[id]/members - tambah murid ke unit (FR-07)
// body: { muridId, jawatan }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  const { id } = await params;
  if (sesi.peranan !== "PK" && sesi.peranan !== "ADMIN" && sesi.peranan !== "GURU") {
    return respRalat("Anda tiada kebenaran.", 403);
  }
  if (sesi.peranan === "GURU") {
    const unitIds = (await unitGuru(sesi.penggunaId)).map((u) => u.id);
    if (!unitIds.includes(id)) return respRalat("Tiada akses kepada unit ini.", 403);
  }
  const body = await req.json();
  const { muridId, jawatan } = body;
  const murid = await db.murid.findUnique({ where: { id: muridId } });
  if (!murid) return respRalat("Murid tidak dijumpai.", 404);
  // FR-08A: Tahun 1-3 ditolak
  if (murid.tahun < 4 || murid.tahun > 6) {
    return respRalat("Sistem hanya menerima murid Tahun 4, 5 dan 6. Pendaftaran murid Tahun 1-3 ditolak.", 400);
  }
  // semak sedia ada
  const sedia = await db.keahlian.findUnique({ where: { muridId_unitId: { muridId, unitId: id } } });
  if (sedia && sedia.aktif) {
    return respRalat("Murid sudah menjadi ahli unit ini.", 400);
  }
  const keahlian = await db.keahlian.create({
    data: { muridId, unitId: id, jawatan: jawatan || "AHLI" },
  });
  await logAudit(sesi.penggunaId, "TAMBAH_AHLI", "KEAHLIAN", keahlian.id, `Tambah ${murid.nama} ke unit ${id}`);
  return resp({ keahlian });
}

// DELETE /api/units/[id]/members - keluarkan murid dari unit
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  const { id } = await params;
  if (sesi.peranan !== "PK" && sesi.peranan !== "ADMIN" && sesi.peranan !== "GURU") {
    return respRalat("Anda tiada kebenaran.", 403);
  }
  const url = new URL(req.url);
  const muridId = url.searchParams.get("muridId");
  if (!muridId) return respRalat("muridId diperlukan.", 400);
  const keahlian = await db.keahlian.updateMany({
    where: { unitId: id, muridId, aktif: true },
    data: { aktif: false },
  });
  await logAudit(sesi.penggunaId, "KELUAR_AHLI", "KEAHLIAN", undefined, `Keluarkan murid ${muridId} dari unit ${id}`);
  return resp({ ok: true, count: keahlian.count });
}
