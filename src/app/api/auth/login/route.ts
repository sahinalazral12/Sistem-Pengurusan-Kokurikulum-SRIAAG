import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { tetapSesiPengguna, logAudit, resp, respRalat, SesiPengguna } from "@/lib/auth";

// POST /api/auth/login - Log masuk (FR-01)
// Selain set cookie, response juga pulangkan sesiToken (JSON string) supaya
// frontend boleh simpan di localStorage & hantar sebagai header X-SPK-Session
// (fallback jika cookie disekat oleh gateway/preview browser).
export async function POST(req: NextRequest) {
  let email = "";
  let kataLaluan = "";
  try {
    const body = await req.json();
    email = (body.email ?? "").toString().trim().toLowerCase();
    kataLaluan = (body.kataLaluan ?? "").toString();
  } catch (e) {
    console.error("RALAT parse body login:", e);
    return respRalat("Format permintaan tidak sah.", 400);
  }

  if (!email || !kataLaluan) {
    return respRalat("Emel dan kata laluan diperlukan.", 400);
  }

  let pengguna;
  try {
    pengguna = await db.pengguna.findUnique({ where: { email } });
  } catch (e) {
    console.error("RALAT DB semasa login:", e);
    return respRalat("Pangkalan data tidak dapat dicapai. Sila cuba lagi.", 503);
  }

  if (!pengguna || !pengguna.aktif) {
    return respRalat("Pengguna tidak dijumpai atau tidak aktif.", 401);
  }
  if (pengguna.kataLaluanDummy !== kataLaluan) {
    return respRalat("Kata laluan salah.", 401);
  }

  const sekarang = Date.now();
  const sesi: SesiPengguna = {
    penggunaId: pengguna.id,
    email: pengguna.email,
    nama: pengguna.nama,
    peranan: pengguna.peranan as "GURU" | "PK" | "GB" | "ADMIN",
    loginPada: sekarang,
    interaksiTerakhir: sekarang,
  };
  const sesiStr = JSON.stringify(sesi);

  try {
    await tetapSesiPengguna(sesi);
  } catch (e) {
    console.error("RALAT set cookie (tidak fatal):", e);
    // teruskan - header fallback akan digunakan
  }

  try {
    await logAudit(pengguna.id, "LOG_MASUK", "PENGGUNA", pengguna.id, `Log masuk berjaya untuk ${pengguna.email}`);
  } catch (e) {
    console.error("RALAT logAudit login (tidak fatal):", e);
  }

  return resp({
    pengguna: {
      id: pengguna.id,
      email: pengguna.email,
      nama: pengguna.nama,
      peranan: pengguna.peranan,
    },
    // sesiToken untuk fallback header (jika cookie disekat)
    sesiToken: sesiStr,
  });
}
