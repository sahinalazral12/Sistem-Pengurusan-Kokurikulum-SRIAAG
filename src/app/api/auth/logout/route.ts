import { padamSesiPengguna, dapatPenggunaSesi, logAudit, resp } from "@/lib/auth";

export async function POST() {
  const sesi = await dapatPenggunaSesi();
  if (sesi) {
    await logAudit(sesi.penggunaId, "LOG_KELUAR", "PENGGUNA", sesi.penggunaId, "Log keluar.");
  }
  await padamSesiPengguna();
  return resp({ ok: true });
}
