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
    const estado = searchParams.get("estado") ?? "";

    // Determine which employee records the session user can see
    // OWNER_ADMIN sees all of their company; MANAGER sees their subordinates + own;
    // EMPLOYEE sees only their own requests
    let employeeId = searchParams.get("employeeId") ?? "";
    const companyId = session.companyId ?? "demo-company-id";

    if (session.role === "EMPLOYEE") {
      // Force employees to only see their own requests, ignore any param
      employeeId = session.employeeId ?? employeeId;
    }

    const solicitudes = await prisma.solicitud.findMany({
      where: {
        employee: { companyId },
        ...(employeeId ? { employeeId } : {}),
        ...(estado     ? { estado: estado as any } : {}),
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, jobTitle: true, department: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(solicitudes);
  } catch (error) {
    console.error("[GET /api/vacaciones]", error);
    return NextResponse.json({ error: "Error al obtener solicitudes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { employeeId, tipo, fechaInicio, fechaFin, dias, motivo } = body;

    if (!employeeId || !fechaInicio || !fechaFin || !dias) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // Employees can only submit for themselves
    if (session.role === "EMPLOYEE" && session.employeeId !== employeeId) {
      return NextResponse.json({ error: "Solo puedes solicitar vacaciones para ti mismo" }, { status: 403 });
    }

    // Ensure the employee belongs to the same company
    const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { companyId: true } });
    if (!emp || emp.companyId !== (session.companyId ?? "demo-company-id")) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    const solicitud = await prisma.solicitud.create({
      data: {
        employeeId,
        tipo:        tipo ?? "VACACIONES",
        fechaInicio: new Date(fechaInicio),
        fechaFin:    new Date(fechaFin),
        dias:        parseInt(dias),
        motivo:      motivo ?? null,
        estado:      "PENDIENTE",
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(solicitud, { status: 201 });
  } catch (error) {
    console.error("[POST /api/vacaciones]", error);
    return NextResponse.json({ error: "Error al crear solicitud" }, { status: 500 });
  }
}
