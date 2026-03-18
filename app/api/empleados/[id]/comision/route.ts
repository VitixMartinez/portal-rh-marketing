import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/empleados/[id]/comision — returns commission settings for an employee */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "comisionActiva", "comisionPorcentaje", "comisionFrecuencia"
     FROM "Employee"
     WHERE "id" = $1 AND "companyId" = $2`,
    id, session.companyId
  );

  if (!rows.length) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const row = rows[0];
  return NextResponse.json({
    comisionActiva:     Boolean(row.comisionActiva),
    comisionPorcentaje: Number(row.comisionPorcentaje ?? 0),
    comisionFrecuencia: row.comisionFrecuencia ?? "QUINCENAL",
  });
}

/** PATCH /api/empleados/[id]/comision — updates commission settings */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session || session.role !== "OWNER_ADMIN")
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const { id } = await params;
  const { comisionActiva, comisionPorcentaje, comisionFrecuencia } = await req.json();

  const activa = Boolean(comisionActiva);
  const pct    = Math.min(100, Math.max(0, Number(comisionPorcentaje ?? 0)));
  const freq   = ["MENSUAL", "QUINCENAL"].includes(comisionFrecuencia)
    ? comisionFrecuencia
    : "QUINCENAL";

  await prisma.$executeRawUnsafe(
    `UPDATE "Employee"
     SET "comisionActiva" = $1, "comisionPorcentaje" = $2, "comisionFrecuencia" = $3
     WHERE "id" = $4 AND "companyId" = $5`,
    activa, pct, freq, id, session.companyId
  );

  return NextResponse.json({ ok: true });
}
