import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Return open vacancies visible to internal employees (INTERNA or AMBAS)
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, titulo, descripcion, requisitos, ubicacion, tipo, "visibilidad", "slugInterno", "createdAt"
     FROM "Vacante"
     WHERE "companyId" = $1
       AND "estado" = 'ABIERTA'
       AND "visibilidad" IN ('INTERNA', 'AMBAS')
     ORDER BY "createdAt" DESC`,
    session.companyId
  );

  return NextResponse.json(rows);
}
