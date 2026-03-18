import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomUUID } from "crypto";
import { randomBytes } from "crypto";

function genSlug() {
  return randomBytes(8).toString("hex"); // 16-char hex slug
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado"); // ABIERTA | PAUSADA | CERRADA | all

  let where = `"companyId" = $1`;
  const params: unknown[] = [session.companyId];
  if (estado && estado !== "all") {
    where += ` AND "estado" = $2`;
    params.push(estado);
  }

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT v.*,
            (SELECT COUNT(*) FROM "Aplicante" a WHERE a."vacanteId" = v.id) AS "totalAplicantes"
     FROM "Vacante" v
     WHERE ${where}
     ORDER BY v."createdAt" DESC`,
    ...params
  );

  return NextResponse.json(rows.map(r => ({
    ...r,
    preguntas: JSON.parse(r.preguntas ?? "[]"),
    totalAplicantes: Number(r.totalAplicantes),
  })));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { titulo, descripcion, requisitos, ubicacion, tipo, preguntas, visibilidad } = body;

  if (!titulo?.trim()) {
    return NextResponse.json({ error: "El título es requerido" }, { status: 400 });
  }

  const VALID_VIS = ["EXTERNA","INTERNA","AMBAS"];
  const vis = VALID_VIS.includes(visibilidad) ? visibilidad : "AMBAS";

  const id           = randomUUID();
  const slugExterno  = genSlug();
  const slugInterno  = genSlug();
  const now          = new Date();

  await prisma.$executeRawUnsafe(
    `INSERT INTO "Vacante"
      ("id","companyId","titulo","descripcion","requisitos","ubicacion","tipo","preguntas",
       "estado","visibilidad","slugExterno","slugInterno","creadoPorId","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ABIERTA',$9,$10,$11,$12,$13,$13)`,
    id,
    session.companyId,
    titulo.trim(),
    descripcion ?? null,
    requisitos  ?? null,
    ubicacion   ?? null,
    tipo        ?? "TIEMPO_COMPLETO",
    JSON.stringify(preguntas ?? []),
    vis,
    slugExterno,
    slugInterno,
    session.userId,
    now,
  );

  const [row] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "Vacante" WHERE "id" = $1`, id
  );

  return NextResponse.json({
    ...row,
    preguntas: JSON.parse(row.preguntas ?? "[]"),
  }, { status: 201 });
}
