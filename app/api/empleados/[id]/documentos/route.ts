import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomUUID } from "crypto";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "EmpleadoDocumento"
     WHERE "employeeId" = $1 AND "companyId" = $2
     ORDER BY "createdAt" DESC`,
    id, session.companyId
  );

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const { nombre, tipo, url, tamano, notas } = body;

  if (!nombre?.trim() || !url?.trim()) {
    return NextResponse.json({ error: "Nombre y URL son requeridos" }, { status: 400 });
  }

  const docId = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "EmpleadoDocumento"
      ("id","employeeId","companyId","nombre","tipo","url","tamano","notas","createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    docId,
    id,
    session.companyId,
    nombre.trim(),
    tipo ?? "OTRO",
    url.trim(),
    tamano ?? null,
    notas  ?? null,
    new Date(),
  );

  const [doc] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "EmpleadoDocumento" WHERE "id" = $1`, docId
  );

  return NextResponse.json(doc, { status: 201 });
}
