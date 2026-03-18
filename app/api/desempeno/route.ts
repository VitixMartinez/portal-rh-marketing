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

    // Employees can only see their own reviews
    if (session.role === "EMPLOYEE") {
      employeeId = session.employeeId ?? employeeId;
    }

    const reviews = await prisma.performanceReview.findMany({
      where: {
        employee: { companyId },
        ...(employeeId ? { employeeId } : {}),
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { fechaReview: "desc" },
    });
    return NextResponse.json(reviews);
  } catch (error) {
    console.error("[GET /api/desempeno]", error);
    return NextResponse.json({ error: "Error al obtener evaluaciones" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden crear evaluaciones" }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, reviewerId, periodo, calificacion, puntuacion, fortalezas, areasEnMejora, comentarios, objetivos } = body;

    if (!employeeId || !periodo) {
      return NextResponse.json({ error: "employeeId y periodo son requeridos" }, { status: 400 });
    }

    // Verify employee belongs to same company
    const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { companyId: true } });
    if (!emp || emp.companyId !== (session.companyId ?? "demo-company-id")) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    const review = await prisma.performanceReview.create({
      data: {
        employeeId,
        reviewerId:    reviewerId    ?? null,
        periodo,
        calificacion:  calificacion  ?? "CUMPLE",
        puntuacion:    puntuacion    ? parseInt(puntuacion)  : null,
        fortalezas:    fortalezas    ?? null,
        areasEnMejora: areasEnMejora ?? null,
        comentarios:   comentarios   ?? null,
        objetivos:     objetivos     ?? null,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error("[POST /api/desempeno]", error);
    return NextResponse.json({ error: "Error al crear evaluación" }, { status: 500 });
  }
}
