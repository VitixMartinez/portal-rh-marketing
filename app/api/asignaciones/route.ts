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
    const companyId  = session.companyId ?? "demo-company-id";
    const cursoId    = searchParams.get("cursoId");
    const estado     = searchParams.get("estado");

    // Employees can only see their own assignments
    let employeeId = searchParams.get("employeeId");
    if (session.role === "EMPLOYEE") {
      employeeId = session.employeeId ?? employeeId;
    }

    const asignaciones = await (prisma as any).asignacionCurso.findMany({
      where: {
        ...(employeeId ? { employeeId } : {}),
        ...(cursoId    ? { cursoId }    : {}),
        ...(estado     ? { estado }     : {}),
        curso: { companyId },
      },
      include: {
        curso:    { select: { id: true, titulo: true, categoria: true, obligatorio: true, recurrencia: true } },
        employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true, department: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(asignaciones);
  } catch (error) {
    console.error("[GET /api/asignaciones]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden asignar cursos" }, { status: 403 });
    }

    const body = await req.json();

    if (!body.cursoId || (!body.employeeId && !Array.isArray(body.employeeIds))) {
      return NextResponse.json({ error: "cursoId y employeeId son requeridos" }, { status: 400 });
    }

    // Asignación masiva: array de employeeIds
    if (Array.isArray(body.employeeIds)) {
      const results = await Promise.allSettled(
        body.employeeIds.map((empId: string) =>
          (prisma as any).asignacionCurso.upsert({
            where:  { cursoId_employeeId: { cursoId: body.cursoId, employeeId: empId } },
            create: {
              cursoId:     body.cursoId,
              employeeId:  empId,
              estado:      "PENDIENTE",
              fechaLimite: body.fechaLimite ? new Date(body.fechaLimite) : null,
            },
            update: {
              estado:      "PENDIENTE",
              fechaLimite: body.fechaLimite ? new Date(body.fechaLimite) : undefined,
            },
          })
        )
      );
      const created = results.filter(r => r.status === "fulfilled").length;
      return NextResponse.json({ created }, { status: 201 });
    }

    // Asignación individual
    const asignacion = await (prisma as any).asignacionCurso.upsert({
      where:  { cursoId_employeeId: { cursoId: body.cursoId, employeeId: body.employeeId } },
      create: {
        cursoId:     body.cursoId,
        employeeId:  body.employeeId,
        estado:      body.estado      || "PENDIENTE",
        fechaLimite: body.fechaLimite ? new Date(body.fechaLimite) : null,
        notas:       body.notas       || null,
      },
      update: {
        estado:      body.estado      ?? undefined,
        fechaLimite: body.fechaLimite ? new Date(body.fechaLimite) : undefined,
        notas:       body.notas       ?? undefined,
      },
    });

    return NextResponse.json(asignacion, { status: 201 });
  } catch (error) {
    console.error("[POST /api/asignaciones]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
