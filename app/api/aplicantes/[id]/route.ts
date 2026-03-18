import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const { estado, notas } = body;

  const VALID_ESTADOS = ["PENDIENTE","REVISADO","ENTREVISTA","RECHAZADO","CONTRATADO"];
  if (estado && !VALID_ESTADOS.includes(estado)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (estado !== undefined) { fields.push(`"estado" = $${idx++}`); values.push(estado); }
  if (notas  !== undefined) { fields.push(`"notas"  = $${idx++}`); values.push(notas);  }

  if (!fields.length) return NextResponse.json({ error: "Sin cambios" }, { status: 400 });

  values.push(id);
  values.push(session.companyId);

  await prisma.$executeRawUnsafe(
    `UPDATE "Aplicante" SET ${fields.join(",")}
     WHERE "id" = $${idx} AND "companyId" = $${idx + 1}`,
    ...values
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  await prisma.$executeRawUnsafe(
    `DELETE FROM "Aplicante" WHERE "id" = $1 AND "companyId" = $2`,
    id, session.companyId
  );

  return NextResponse.json({ ok: true });
}
