/**
 * GET  /api/portal/solicitudes  — lista solicitudes de tiempo del empleado autenticado
 * POST /api/portal/solicitudes  — crea una nueva solicitud de vacaciones/permiso
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const solicitudes = await prisma.solicitud.findMany({
    where:   { employeeId: session.employeeId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(solicitudes);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const { tipo, fechaInicio, fechaFin, motivo } = body;

  if (!tipo || !fechaInicio || !fechaFin) {
    return NextResponse.json(
      { error: "Tipo, fecha inicio y fecha fin son requeridos" },
      { status: 400 }
    );
  }

  const inicio = new Date(fechaInicio);
  const fin    = new Date(fechaFin);

  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
    return NextResponse.json({ error: "Fechas inválidas" }, { status: 400 });
  }
  if (fin < inicio) {
    return NextResponse.json(
      { error: "La fecha de fin debe ser mayor o igual a la de inicio" },
      { status: 400 }
    );
  }

  // Calculate business days (Mon-Fri)
  let dias = 0;
  const cur = new Date(inicio);
  while (cur <= fin) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) dias++;
    cur.setDate(cur.getDate() + 1);
  }

  const solicitud = await prisma.solicitud.create({
    data: {
      employeeId:  session.employeeId,
      tipo,
      fechaInicio: inicio,
      fechaFin:    fin,
      dias,
      motivo:      motivo || null,
      estado:      "PENDIENTE",
    },
  });

  return NextResponse.json(solicitud, { status: 201 });
}
