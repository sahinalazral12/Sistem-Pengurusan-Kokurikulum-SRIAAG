import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { tetapSesiPengguna, logAudit, resp, respRalat } from "@/lib/auth";

// POST /api/auth/login - Log masuk (FR-01)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email ?? "").toString().trim().toLowerCase();
    const kataLaluan = (body.kataLaluan ?? "").toString();

    if (!email || !kataLaluan) {
      return respRalat("Emel dan kata laluan diperlukan.", 400);
    }

    const pengguna = await db.pengguna.findUnique({ where: { email } });
    if (!pengguna || !pengguna.aktif) {
      return respRalat("Pengguna tidak dijumpai atau tidak aktif.", 401);
    }
    if (pengguna.kataLaluanDummy !== kataLaluan) {
      return respRalat("Kata laluan salah.", 401);
    }

    const sekarang = Date.now();
    await tetapSesiPengguna({
      penggunaId: pengguna.id,
      email: pengguna.email,
      nama: pengguna.nama,
      peranan: pengguna.peranan as "GURU" | "PK" | "GB" | "ADMIN",
      loginPada: sekarang,
      interaksiTerakhir: sekarang,
    });
    await logAudit(pengguna.id, "LOG_MASUK", "PENGGUNA", pengguna.id, `Log masuk berjaya untuk ${pengguna.email}`);

    return resp({
      pengguna: {
        id: pengguna.id,
        email: pengguna.email,
        nama: pengguna.nama,
        peranan: pengguna.peranan,
      },
    });
  } catch (e) {
    console.error("RALAT login:", e);
    return respRalat("Ralat pelayan semasa log masuk.", 500);
  }
}
