import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const [row] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT v.*,
            (SELECT COUNT(*) FROM "Aplicante" a WHERE a."vacanteId" = v.id) AS "totalAplicantes"
     FROM "Vacante" v
     WHERE v."id" = $1 AND v."companyId" = $2`,
    id, session.companyId
  );

  if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({
    ...row,
    preguntas: JSON.parse(row.preguntas ?? "[]"),
    totalAplicantes: Number(row.totalAplicantes),
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const allowed = ["titulo","descripcion","requisitos","ubicacion","tipo","preguntas","estado","visibilidad"];
  for (const key of allowed) {
    if (key in body) {
      fields.push(`"${key}" = $${idx++}`);
      values.push(key === "preguntas" ? JSON.stringify(body[key]) : body[key]);
    }
  }

  if (!fields.length) return NextResponse.json({ error: "Sin cambios" }, { status: 400 });

  fields.push(`"updatedAt" = $${idx++}`);
  values.push(new Date());
  values.push(id);
  values.push(session.companyId);

  await prisma.$executeRawUnsafe(
    `UPDATE "Vacante" SET ${fields.join(",")} WHERE "id" = $${idx} AND "companyId" = $${idx + 1}`,
    ...values
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  await prisma.$executeRawUnsafe(
    `DELETE FROM "Vacante" WHERE "id" = $1 AND "companyId" = $2`,
    id, session.companyId
  );

  return NextResponse.json({ ok: true });
}
