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
    let employeeId   = searchParams.get("employeeId") ?? "";

    // Employees can only see their own recognitions
    if (session.role === "EMPLOYEE") {
      employeeId = session.employeeId ?? employeeId;
    }

    const reconocimientos = await prisma.reconocimiento.findMany({
      where: {
        employee: { companyId },
        ...(employeeId ? { employeeId } : {}),
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
      },
      orderBy: { fecha: "desc" },
    });
    return NextResponse.json(reconocimientos);
  } catch (error) {
    console.error("[GET /api/reconocimientos]", error);
    return NextResponse.json({ error: "Error al obtener reconocimientos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden crear reconocimientos" }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, tipo, titulo, descripcion, otorgadoPor, fecha, publico } = body;

    if (!employeeId || !titulo) {
      return NextResponse.json({ error: "employeeId y titulo son requeridos" }, { status: 400 });
    }

    // Verify employee belongs to same company
    const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { companyId: true } });
    if (!emp || emp.companyId !== (session.companyId ?? "demo-company-id")) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    const reconocimiento = await prisma.reconocimiento.create({
      data: {
        employeeId,
        tipo:        tipo        ?? "OTRO",
        titulo,
        descripcion: descripcion ?? null,
        otorgadoPor: otorgadoPor ?? null,
        fecha:       fecha       ? new Date(fecha) : new Date(),
        publico:     publico     ?? true,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(reconocimiento, { status: 201 });
  } catch (error) {
    console.error("[POST /api/reconocimientos]", error);
    return NextResponse.json({ error: "Error al crear reconocimiento" }, { status: 500 });
  }
}
