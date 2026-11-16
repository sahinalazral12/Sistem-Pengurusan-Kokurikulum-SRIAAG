import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dapatPenggunaSesi, resp, respRalat, unitGuru, logAudit, Peranan } from "@/lib/auth";

// GET /api/units - senarai unit mengikut peranan (FR-02/FR-03)
export async function GET(req: NextRequest) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  const url = new URL(req.url);
  const kategori = url.searchParams.get("kategori") ?? undefined;
  const carian = url.searchParams.get("q") ?? undefined;

  let where: any = { aktif: true };
  if (kategori) where.kategori = kategori;
  if (carian) where.nama = { contains: carian };

  // Guru: hanya unit yang diamanahkan (FR-03)
  if (sesi.peranan === "GURU") {
    const unitIds = (await unitGuru(sesi.penggunaId)).map((u) => u.id);
    where.id = { in: unitIds };
  }

  const units = await db.unit.findMany({
    where,
    include: {
      guruUtama: { select: { id: true, nama: true, email: true } },
      guruPembantu: { select: { id: true, nama: true, email: true } },
      _count: { select: { keahlian: { where: { aktif: true } } } },
    },
    orderBy: { nama: "asc" },
  });

  return resp({ units });
}

// POST /api/units - tambah unit (PK/ADMIN sahaja) (FR-05)
export async function POST(req: NextRequest) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  if (sesi.peranan !== "PK" && sesi.peranan !== "ADMIN") {
    return respRalat("Anda tiada kebenaran untuk menambah unit.", 403);
  }
  const body = await req.json();
  const { nama, kategori, guruUtamaId, guruPembantuId, hari, masa, tempat } = body;
  if (!nama || !kategori) return respRalat("Nama dan kategori diperlukan.", 400);
  if (!["BERUNIFORM", "KELAB", "SUKAN"].includes(kategori)) {
    return respRalat("Kategori tidak sah.", 400);
  }
  const unit = await db.unit.create({
    data: { nama, kategori, guruUtamaId: guruUtamaId || null, guruPembantuId: guruPembantuId || null, hari: hari || null, masa: masa || null, tempat: tempat || null },
  });
  await logAudit(sesi.penggunaId, "TAMBAH_UNIT", "UNIT", unit.id, `Tambah unit ${unit.nama}`);
  return resp({ unit });
}

// PATCH /api/units (body {id, ...}) - kemaskini unit (PK/ADMIN)
export async function PATCH(req: NextRequest) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  if (sesi.peranan !== "PK" && sesi.peranan !== "ADMIN") {
    return respRalat("Anda tiada kebenaran untuk mengemaskini unit.", 403);
  }
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return respRalat("ID unit diperlukan.", 400);
  const unit = await db.unit.update({ where: { id }, data });
  await logAudit(sesi.penggunaId, "KEMASKINI_UNIT", "UNIT", id, `Kemaskini unit ${unit.nama}`);
  return resp({ unit });
}
