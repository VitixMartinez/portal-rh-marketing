import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden aprobar/rechazar solicitudes" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();

    const solicitud = await prisma.solicitud.update({
      where: { id },
      data: {
        estado: body.estado ?? undefined,
        notas:  body.notas  ?? undefined,
      },
    });

    return NextResponse.json(solicitud);
  } catch (error) {
    console.error("[PATCH /api/vacaciones/[id]]", error);
    return NextResponse.json({ error: "Error al actualizar solicitud" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden eliminar solicitudes" }, { status: 403 });
    }

    const { id } = await context.params;
    await prisma.solicitud.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
