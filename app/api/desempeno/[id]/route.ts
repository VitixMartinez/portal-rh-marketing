import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden editar evaluaciones" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();

    const review = await prisma.performanceReview.update({
      where: { id },
      data: {
        calificacion:  body.calificacion  ?? undefined,
        puntuacion:    body.puntuacion    ? parseInt(body.puntuacion) : undefined,
        fortalezas:    body.fortalezas    ?? undefined,
        areasEnMejora: body.areasEnMejora ?? undefined,
        comentarios:   body.comentarios   ?? undefined,
        objetivos:     body.objetivos     ?? undefined,
      },
    });
    return NextResponse.json(review);
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden eliminar evaluaciones" }, { status: 403 });
    }

    const { id } = await context.params;
    await prisma.performanceReview.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
