// Utiliti auth: sesi berasaskan cookie HTTP-only + fallback header X-SPK-Session
// Pengesahan terhadap data dummy Prisma. Kata laluan tidak di-hash kerana ini prototaip.
import { cookies, headers } from "next/headers";
import { db } from "./db";

export const SESSION_COOKIE = "spk_session";
export const SESSION_HEADER = "x-spk-session";
export const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minit tidak aktif (FR-04)

export type Peranan = "GURU" | "PK" | "GB" | "ADMIN";

export interface SesiPengguna {
  penggunaId: string;
  email: string;
  nama: string;
  peranan: Peranan;
  loginPada: number;
  interaksiTerakhir: number;
}

// Dapatkan sesi dari cookie ATAU header (fallback jika cookie disekat)
export async function dapatPenggunaSesi(): Promise<SesiPengguna | null> {
  const cookieStore = await cookies();
  let raw = cookieStore.get(SESSION_COOKIE)?.value;

  // Fallback: baca dari header X-SPK-Session (jika cookie disekat oleh browser/gateway)
  if (!raw) {
    const headerStore = await headers();
    raw = headerStore.get(SESSION_HEADER) ?? undefined;
  }

  if (!raw) return null;
  try {
    const sesi = JSON.parse(raw) as SesiPengguna;
    // Semak tamat automatik selepas 30 minit tidak aktif (FR-04)
    const sekarang = Date.now();
    if (sekarang - sesi.interaksiTerakhir > SESSION_TTL_MS) {
      return null;
    }
    return sesi;
  } catch {
    return null;
  }
}

export async function tetapSesiPengguna(sesi: SesiPengguna) {
  const cookieStore = await cookies();
  const sesiStr = JSON.stringify(sesi);
  cookieStore.set(SESSION_COOKIE, sesiStr, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 jam
  });
}

export async function kemaskiniInteraksiTerakhir() {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return;
  sesi.interaksiTerakhir = Date.now();
  await tetapSesiPengguna(sesi);
}

export async function padamSesiPengguna() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Semakan RBAC: pulang true jika peranan semasa dalam senarai dibenarkan
export function benarkan(peranan: Peranan | undefined, dibenarkan: Peranan[]): boolean {
  if (!peranan) return false;
  return dibenarkan.includes(peranan);
}

// Pulang unit yang guru boleh akses (sebagai utama/pembantu)
export async function unitGuru(userId: string) {
  return db.unit.findMany({
    where: {
      OR: [{ guruUtamaId: userId }, { guruPembantuId: userId }],
      aktif: true,
    },
  });
}

// Helper untuk respons JSON piawai
export function resp<T>(data: T, status = 200) {
  return Response.json(data, { status });
}

export function respRalat(mesej: string, status = 400) {
  return Response.json({ ralat: mesej }, { status });
}

// Helper log audit (dengan ralat tidak fatal)
export async function logAudit(penggunaId: string | null, tindakan: string, entiti: string, entitiId?: string, butiran?: string) {
  try {
    await db.logAudit.create({
      data: { penggunaId, tindakan, entiti, entitiId, butiran },
    });
  } catch (e) {
    // log audit tidak fatal - jangan gagalkan operasi utama
    console.error("RALAT logAudit (tidak fatal):", e);
  }
}

// Helper: dapat pengguna penuh dari sesi
export async function dapatPenggunaPenuh() {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return null;
  return db.pengguna.findUnique({ where: { id: sesi.penggunaId } });
}
