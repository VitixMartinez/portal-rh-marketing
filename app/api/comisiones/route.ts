import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomUUID } from "crypto";

/**
 * GET /api/comisiones?periodo=2024-03-1
 *   Returns all employees with comisionActiva=true for the company,
 *   along with any existing VentaComision entry for the given period.
 *
 * POST /api/comisiones
 *   Upserts a VentaComision entry: { employeeId, periodo, totalVentas, montoComision, notas }
 */

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const periodo = new URL(req.url).searchParams.get("periodo") ?? "";
  const companyId = session.companyId;

  // Fetch employees with comisionActiva = true
  const empleados = await prisma.$queryRawUnsafe<any[]>(
    `SELECT e."id", e."firstName", e."lastName", e."jobTitle", e."salary",
            e."comisionActiva", e."comisionPorcentaje", e."comisionFrecuencia",
            d."name" AS "departamento"
     FROM "Employee" e
     LEFT JOIN "Department" d ON d."id" = e."departmentId"
     WHERE e."companyId" = $1
       AND e."status" = 'ACTIVO'
       AND e."comisionActiva" = TRUE
     ORDER BY e."firstName", e."lastName"`,
    companyId
  );

  // Fetch existing entries for this period
  const entradas = periodo
    ? await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "VentaComision"
         WHERE "companyId" = $1 AND "periodo" = $2`,
        companyId,
        periodo
      )
    : [];

  const entradaMap: Record<string, any> = {};
  for (const e of entradas) entradaMap[e.employeeId] = e;

  const result = empleados.map((emp) => ({
    ...emp,
    comisionActiva:     Boolean(emp.comisionActiva),
    comisionPorcentaje: Number(emp.comisionPorcentaje ?? 0),
    entrada: entradaMap[emp.id]
      ? {
          ...entradaMap[emp.id],
          totalVentas:   Number(entradaMap[emp.id].totalVentas   ?? 0),
          montoComision: Number(entradaMap[emp.id].montoComision ?? 0),
        }
      : null,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.role !== "OWNER_ADMIN") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const { employeeId, periodo, totalVentas, montoComision, notas, reporteUrl, reporteNombre } = await req.json();
  if (!employeeId || !periodo) return NextResponse.json({ error: "employeeId y periodo son requeridos" }, { status: 400 });

  const companyId = session.companyId;
  const ventas   = Number(totalVentas  ?? 0);
  const comision = Number(montoComision ?? 0);

  // Check if entry exists
  const existing = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "id" FROM "VentaComision" WHERE "employeeId" = $1 AND "periodo" = $2 AND "companyId" = $3`,
    employeeId, periodo, companyId
  );

  if (existing.length > 0) {
    // Only update reporteUrl/reporteNombre if provided (preserve existing if not)
    const reporteClauses = reporteUrl
      ? `, "reporteUrl" = $7, "reporteNombre" = $8`
      : "";
    const extraParams = reporteUrl ? [reporteUrl, reporteNombre ?? null] : [];
    await prisma.$executeRawUnsafe(
      `UPDATE "VentaComision"
       SET "totalVentas" = $1, "montoComision" = $2, "notas" = $3, "updatedAt" = NOW()${reporteClauses}
       WHERE "employeeId" = $4 AND "periodo" = $5 AND "companyId" = $6`,
      ventas, comision, notas ?? null, employeeId, periodo, companyId, ...extraParams
    );
    return NextResponse.json({ ok: true, action: "updated" });
  } else {
    const id = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "VentaComision" ("id","companyId","employeeId","periodo","totalVentas","montoComision","notas","reporteUrl","reporteNombre")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      id, companyId, employeeId, periodo, ventas, comision, notas ?? null,
      reporteUrl ?? null, reporteNombre ?? null
    );
    return NextResponse.json({ ok: true, action: "created", id });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER_ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { employeeId, periodo } = await req.json();
  await prisma.$executeRawUnsafe(
    `DELETE FROM "VentaComision" WHERE "employeeId" = $1 AND "periodo" = $2 AND "companyId" = $3`,
    employeeId, periodo, session.companyId
  );
  return NextResponse.json({ ok: true });
}
