import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dapatPenggunaSesi, resp, respRalat, logAudit } from "@/lib/auth";

// GET /api/pengguna - senarai pengguna (ADMIN)
export async function GET() {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  if (sesi.peranan !== "ADMIN" && sesi.peranan !== "PK") {
    return respRalat("Anda tiada kebenaran.", 403);
  }
  const pengguna = await db.pengguna.findMany({
    orderBy: { nama: "asc" },
    select: { id: true, email: true, nama: true, peranan: true, aktif: true, createdAt: true },
  });
  return resp({ pengguna });
}

// POST /api/pengguna - tambah pengguna (ADMIN)
export async function POST(req: NextRequest) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  if (sesi.peranan !== "ADMIN") return respRalat("Hanya ADMIN boleh tambah pengguna.", 403);
  const body = await req.json();
  const { email, nama, peranan, kataLaluanDummy } = body;
  if (!email || !nama || !peranan) return respRalat("email, nama, peranan diperlukan.", 400);
  if (!["GURU", "PK", "GB", "ADMIN"].includes(peranan)) return respRalat("Peranan tidak sah.", 400);
  const p = await db.pengguna.create({
    data: { email: email.toLowerCase(), nama, peranan, kataLaluanDummy: kataLaluanDummy || "Demo@1234" },
  });
  await logAudit(sesi.penggunaId, "TAMBAH_PENGGUNA", "PENGGUNA", p.id, `Tambah pengguna ${email}`);
  return resp({ pengguna: p });
}

// PATCH /api/pengguna - kemaskini pengguna
export async function PATCH(req: NextRequest) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  if (sesi.peranan !== "ADMIN") return respRalat("Hanya ADMIN boleh kemaskini pengguna.", 403);
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return respRalat("ID diperlukan.", 400);
  if (data.email) data.email = data.email.toLowerCase();
  const p = await db.pengguna.update({ where: { id }, data });
  await logAudit(sesi.penggunaId, "KEMASKINI_PENGGUNA", "PENGGUNA", id, `Kemaskini ${p.email}`);
  return resp({ pengguna: p });
}
