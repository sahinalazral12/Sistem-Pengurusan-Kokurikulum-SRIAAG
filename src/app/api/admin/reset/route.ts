import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dapatPenggunaSesi, resp, respRalat, logAudit } from "@/lib/auth";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// POST /api/admin/reset - tetap semula data dummy (FR-40)
export async function POST(_req: NextRequest) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  if (sesi.peranan !== "ADMIN" && sesi.peranan !== "PK") {
    return respRalat("Hanya Pentadbir Sistem / PK boleh menetap semula data.", 403);
  }
  // Jalankan skrip seed semula
  try {
    await execAsync("bun run /home/z/my-project/prisma/seed.ts", { cwd: "/home/z/my-project" });
    await logAudit(sesi.penggunaId, "TETAP_SEMULA_DATA", "SISTEM", undefined, "Pangkalan data dummy ditetap semula.");
    return resp({ ok: true, mesej: "Pangkalan data dummy berjaya ditetap semula." });
  } catch (e: any) {
    console.error("RALAT reset:", e);
    return respRalat("Gagal menetap semula data: " + (e.message ?? String(e)), 500);
  }
}
