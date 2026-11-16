import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dapatPenggunaSesi, resp, respRalat, logAudit } from "@/lib/auth";

// GET /api/tetapan - dapat tetapan semasa
export async function GET() {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  const tetapan = await db.tetapan.findFirst();
  return resp({ tetapan });
}

// PATCH /api/tetapan - kemaskini tetapan (ADMIN)
export async function PATCH(req: NextRequest) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  if (sesi.peranan !== "ADMIN") return respRalat("Hanya ADMIN boleh kemaskini tetapan.", 403);
  const body = await req.json();
  const existing = await db.tetapan.findFirst();
  let tetapan;
  if (existing) {
    tetapan = await db.tetapan.update({ where: { id: existing.id }, data: {
      tahunAkademik: body.tahunAkademik ?? existing.tahunAkademik,
      semester: body.semester ?? existing.semester,
      tarikhMula: body.tarikhMula ? new Date(body.tarikhMula) : existing.tarikhMula,
      tarikhTamat: body.tarikhTamat ? new Date(body.tarikhTamat) : existing.tarikhTamat,
    } });
  } else {
    tetapan = await db.tetapan.create({ data: {
      tahunAkademik: body.tahunAkademik ?? 2026,
      semester: body.semester ?? 2,
      tarikhMula: body.tarikhMula ? new Date(body.tarikhMula) : null,
      tarikhTamat: body.tarikhTamat ? new Date(body.tarikhTamat) : null,
    } });
  }
  await logAudit(sesi.penggunaId, "KEMASKINI_TETAPAN", "TETAPAN", tetapan.id, `Tahun ${tetapan.tahunAkademik} S${tetapan.semester}`);
  return resp({ tetapan });
}
