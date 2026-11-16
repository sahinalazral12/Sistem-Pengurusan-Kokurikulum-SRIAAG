import { db } from "@/lib/db";
import { dapatPenggunaSesi, resp, respRalat, unitGuru } from "@/lib/auth";

// GET /api/auth/me - maklumat pengguna semasa
export async function GET() {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  const pengguna = await db.pengguna.findUnique({ where: { id: sesi.penggunaId } });
  if (!pengguna) return respRalat("Pengguna tidak dijumpai.", 404);
  // Untuk guru, pulang senarai unit yang diamanahkan
  let unitSaya: { id: string; nama: string; kategori: string }[] = [];
  if (pengguna.peranan === "GURU") {
    unitSaya = (await unitGuru(pengguna.id)).map((u) => ({ id: u.id, nama: u.nama, kategori: u.kategori }));
  }
  return resp({
    pengguna: {
      id: pengguna.id,
      email: pengguna.email,
      nama: pengguna.nama,
      peranan: pengguna.peranan,
    },
    unitSaya,
  });
}
