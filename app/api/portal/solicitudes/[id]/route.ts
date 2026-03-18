/**
 * DELETE /api/portal/solicitudes/[id] — el empleado cancela una solicitud PENDIENTE
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await context.params;

  const solicitud = await prisma.solicitud.findUnique({ where: { id } });
  if (!solicitud) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  if (solicitud.employeeId !== session.employeeId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (solicitud.estado !== "PENDIENTE") {
    return NextResponse.json(
      { error: "Solo puedes cancelar solicitudes pendientes" },
      { status: 400 }
    );
  }

  await prisma.solicitud.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
