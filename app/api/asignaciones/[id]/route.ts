import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();

    // Portal employees can only set their OWN assignment to EN_PROGRESO
    if (session.role !== "OWNER_ADMIN") {
      if (!session.employeeId) {
        return NextResponse.json({ error: "Sin autorización" }, { status: 403 });
      }
      const existing = await (prisma as any).asignacionCurso.findFirst({
        where: { id, employeeId: session.employeeId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Sin autorización" }, { status: 403 });
      }
      if (body.estado !== "EN_PROGRESO") {
        return NextResponse.json({ error: "Solo puedes marcar como en progreso" }, { status: 403 });
      }
    }

    const asignacion = await (prisma as any).asignacionCurso.update({
      where: { id },
      data: {
        estado:          body.estado          ?? undefined,
        fechaLimite:     body.fechaLimite     ? new Date(body.fechaLimite)     : undefined,
        fechaCompletado: body.fechaCompletado ? new Date(body.fechaCompletado) : undefined,
        notas:           body.notas           ?? undefined,
      },
    });

    return NextResponse.json(asignacion);
  } catch (error) {
    console.error("[PATCH /api/asignaciones/:id]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden eliminar asignaciones" }, { status: 403 });
    }

    const { id } = await context.params;
    await (prisma as any).asignacionCurso.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
