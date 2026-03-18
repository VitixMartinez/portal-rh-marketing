import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const vacanteId = searchParams.get("vacanteId");
  if (!vacanteId) return NextResponse.json({ error: "vacanteId requerido" }, { status: 400 });

  // Verify vacancy belongs to company
  const [vac] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "id" FROM "Vacante" WHERE "id" = $1 AND "companyId" = $2`,
    vacanteId, session.companyId
  );
  if (!vac) return NextResponse.json({ error: "Vacante no encontrada" }, { status: 404 });

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT a.*,
            e."firstName" AS "empFirstName",
            e."lastName"  AS "empLastName",
            e."jobTitle"  AS "empJobTitle"
     FROM "Aplicante" a
     LEFT JOIN "Employee" e ON e."id" = a."empleadoId"
     WHERE a."vacanteId" = $1
     ORDER BY a."createdAt" DESC`,
    vacanteId
  );

  return NextResponse.json(rows.map(r => ({
    ...r,
    respuestas: JSON.parse(r.respuestas ?? "{}"),
    archivos:   JSON.parse(r.archivos   ?? "[]"),
    empleado:   r.empFirstName ? {
      firstName: r.empFirstName,
      lastName:  r.empLastName,
      jobTitle:  r.empJobTitle,
    } : null,
  })));
}
