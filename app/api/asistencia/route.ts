import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId") ?? "";
    const fecha      = searchParams.get("fecha") ?? "";
    const mes        = searchParams.get("mes") ?? ""; // formato YYYY-MM
    const companyId  = session.companyId ?? "demo-company-id";

    // Employees can only see their own attendance records
    let resolvedEmployeeId = employeeId;
    if (session.role === "EMPLOYEE") {
      resolvedEmployeeId = session.employeeId ?? employeeId;
    }

    let fechaWhere: any = {};
    if (fecha) {
      const d = new Date(fecha);
      fechaWhere = {
        fecha: { gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()), lt: new Date(d.getFullYear(), d.getDate() + 1) },
      };
    } else if (mes) {
      const [year, month] = mes.split("-").map(Number);
      fechaWhere = {
        fecha: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) },
      };
    }

    // Use Prisma findMany for the base query, then supplement with raw columns
    const asistencias = await prisma.asistencia.findMany({
      where: {
        employee: { companyId },
        ...(resolvedEmployeeId ? { employeeId: resolvedEmployeeId } : {}),
        ...fechaWhere,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, jobTitle: true },
        },
      },
      orderBy: [{ fecha: "desc" }, { employee: { firstName: "asc" } }],
    });

    if (asistencias.length === 0) return NextResponse.json([]);

    // Fetch extra columns (ausenciaCode, adjuntos) — resilient if migration hasn't run yet
    const ids = asistencias.map(a => a.id);
    let extrasMap: Record<string, { ausenciaCode: string | null; adjuntos: string }> = {};
    try {
      const extras = await prisma.$queryRawUnsafe(
        `SELECT id, "ausenciaCode", adjuntos FROM "Asistencia" WHERE id = ANY($1::text[])`,
        ids
      ) as { id: string; ausenciaCode: string | null; adjuntos: string }[];
      extrasMap = Object.fromEntries(extras.map(e => [e.id, e]));
    } catch {
      // Columns not yet created — migration pending. Return records without extra fields.
    }

    const result = asistencias.map(a => {
      const ex = extrasMap[a.id];
      let adj: any[] = [];
      try { adj = JSON.parse(ex?.adjuntos ?? "[]"); } catch { adj = []; }
      return {
        ...a,
        ausenciaCode: ex?.ausenciaCode ?? null,
        adjuntos: adj,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/asistencia]", error);
    return NextResponse.json({ error: "Error al obtener asistencias" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden registrar asistencia" }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, fecha, horaEntrada, horaSalida, estado, notas, ausenciaCode, adjuntos } = body;

    if (!employeeId || !fecha) {
      return NextResponse.json({ error: "employeeId y fecha son requeridos" }, { status: 400 });
    }

    // Verify employee belongs to same company
    const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { companyId: true } });
    if (!emp || emp.companyId !== (session.companyId ?? "demo-company-id")) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    const fechaDate = new Date(fecha);
    const adjuntosJson = JSON.stringify(Array.isArray(adjuntos) ? adjuntos : []);
    const codeVal = ausenciaCode?.trim() || null;

    // Upsert via Prisma (standard fields) then update extra columns
    const asistencia = await prisma.asistencia.upsert({
      where: { employeeId_fecha: { employeeId, fecha: fechaDate } },
      update: {
        horaEntrada: horaEntrada ? new Date(horaEntrada) : null,
        horaSalida:  horaSalida  ? new Date(horaSalida)  : null,
        estado:      estado ?? "PRESENTE",
        notas:       notas ?? null,
      },
      create: {
        employeeId,
        fecha:       fechaDate,
        horaEntrada: horaEntrada ? new Date(horaEntrada) : null,
        horaSalida:  horaSalida  ? new Date(horaSalida)  : null,
        estado:      estado ?? "PRESENTE",
        notas:       notas ?? null,
      },
    });

    // Update the extra columns (resilient — columns may not exist yet if migration hasn't run)
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "Asistencia" SET "ausenciaCode" = $1, adjuntos = $2 WHERE id = $3`,
        codeVal, adjuntosJson, asistencia.id
      );
    } catch {
      // Columns don't exist yet — migration pending. Core record was saved successfully.
    }

    return NextResponse.json({
      ...asistencia,
      ausenciaCode: codeVal,
      adjuntos: Array.isArray(adjuntos) ? adjuntos : [],
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/asistencia]", error);
    return NextResponse.json({ error: "Error al registrar asistencia" }, { status: 500 });
  }
}
