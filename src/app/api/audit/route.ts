import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dapatPenggunaSesi, resp, respRalat } from "@/lib/auth";

// GET /api/audit - senarai log audit (FR-39)
export async function GET(req: NextRequest) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  if (sesi.peranan !== "ADMIN" && sesi.peranan !== "PK") {
    return respRalat("Anda tiada kebenaran.", 403);
  }
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "50");
  const log = await db.logAudit.findMany({
    include: { pengguna: { select: { nama: true, email: true } } },
    orderBy: { masa: "desc" },
    take: limit,
  });
  return resp({ log });
}
