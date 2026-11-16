import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dapatPenggunaSesi, resp, respRalat, unitGuru, logAudit } from "@/lib/auth";

// GET /api/units/[id] - butiran unit (FR-05)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  const { id } = await params;

  const unit = await db.unit.findUnique({
    where: { id },
    include: {
      guruUtama: { select: { id: true, nama: true, email: true } },
      guruPembantu: { select: { id: true, nama: true, email: true } },
      keahlian: {
        where: { aktif: true },
        include: { murid: true },
        orderBy: [{ murid: { tahun: "asc" } }, { murid: { nama: "asc" } }],
      },
      sesi: { orderBy: { tarikh: "desc" }, take: 50 },
      _count: { select: { keahlian: { where: { aktif: true } } } },
    },
  });
  if (!unit) return respRalat("Unit tidak dijumpai.", 404);

  // Guru: sahkan akses (FR-03)
  if (sesi.peranan === "GURU") {
    const unitIds = (await unitGuru(sesi.penggunaId)).map((u) => u.id);
    if (!unitIds.includes(id)) {
      return respRalat("Anda tiada akses kepada unit ini.", 403);
    }
  }
  return resp({ unit });
}

// PATCH /api/units/[id] - kemaskini unit (PK/ADMIN)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  if (sesi.peranan !== "PK" && sesi.peranan !== "ADMIN") {
    return respRalat("Anda tiada kebenaran untuk mengemaskini unit.", 403);
  }
  const { id } = await params;
  const body = await req.json();
  const unit = await db.unit.update({ where: { id }, data: body });
  await logAudit(sesi.penggunaId, "KEMASKINI_UNIT", "UNIT", id, `Kemaskini unit ${unit.nama}`);
  return resp({ unit });
}

// DELETE /api/units/[id] - nyahaktifkan unit (PK/ADMIN) (FR-05)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await dapatPenggunaSesi();
  if (!sesi) return respRalat("Tidak log masuk.", 401);
  if (sesi.peranan !== "PK" && sesi.peranan !== "ADMIN") {
    return respRalat("Anda tiada kebenaran untuk menyahaktifkan unit.", 403);
  }
  const { id } = await params;
  const unit = await db.unit.update({ where: { id }, data: { aktif: false } });
  await logAudit(sesi.penggunaId, "NYAHAKTIF_UNIT", "UNIT", id, `Nyahaktifkan unit ${unit.nama}`);
  return resp({ ok: true });
}
