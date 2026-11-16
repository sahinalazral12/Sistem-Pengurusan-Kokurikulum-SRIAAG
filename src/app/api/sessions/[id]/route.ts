import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dapatPenggunaSesi, resp, respRalat, unitGuru, logAudit } from "@/lib/auth";

// PATCH /api/sessions/[id] - ubah/batal/tangguh sesi (FR-13)
// body: { status, sebabBatal, ...fields }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  const { id } = await params;
  const body = await req.json();

  // Guru: sahkan akses
  if (sesi.peranan === "GURU") {
    const sesiSedia = await db.sesi.findUnique({ where: { id }, select: { unitId: true } });
    if (!sesiSedia) return respRalat("Sesi tidak dijumpai.", 404);
    const unitIds = (await unitGuru(sesi.penggunaId)).map((u) => u.id);
    if (!unitIds.includes(sesiSedia.unitId)) return respRalat("Tiada akses.", 403);
  } else if (sesi.peranan !== "PK" && sesi.peranan !== "ADMIN") {
    return respRalat("Anda tiada kebenaran.", 403);
  }

  // Batal/tangguh perlu sebab (FR-13)
  if (body.status === "DIBATALKAN" || body.status === "DITANGGUH") {
    if (!body.sebabBatal) return respRalat("Sebab pembatalan/penangguhan diperlukan.", 400);
  }

  const data: any = {};
  if (body.tajuk) data.tajuk = body.tajuk;
  if (body.tarikh) data.tarikh = new Date(body.tarikh);
  if (body.masaMula) data.masaMula = body.masaMula;
  if (body.masaTamat) data.masaTamat = body.masaTamat;
  if (body.tempat !== undefined) data.tempat = body.tempat;
  if (body.status) {
    data.status = body.status;
    if (body.status === "DIBATALKAN" || body.status === "DITANGGUH") {
      data.sebabBatal = body.sebabBatal;
    }
  }
  const sesiUpdated = await db.sesi.update({ where: { id }, data });
  await logAudit(sesi.penggunaId, "KEMASKINI_SESI", "SESI", id, `Status: ${data.status ?? "kemaskini"}`);
  return resp({ sesi: sesiUpdated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  const { id } = await params;
  if (sesi.peranan !== "PK" && sesi.peranan !== "ADMIN") {
    return respRalat("Anda tiada kebenaran.", 403);
  }
  await db.sesi.delete({ where: { id } });
  await logAudit(sesi.penggunaId, "PADAM_SESI", "SESI", id, "Padam sesi");
  return resp({ ok: true });
}
