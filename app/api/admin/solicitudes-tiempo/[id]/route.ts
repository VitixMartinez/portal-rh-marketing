/**
 * PATCH /api/admin/solicitudes-tiempo/[id]
 * Admin aprueba o rechaza una solicitud de tiempo libre.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isAdmin } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } },
) {
  const session = await getSession();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id }          = await context.params;
  const { estado, notas } = await req.json();

  if (!["APROBADA", "RECHAZADA"].includes(estado)) {
    return NextResponse.json({ error: "estado debe ser APROBADA o RECHAZADA" }, { status: 400 });
  }

  const solicitud = await prisma.solicitud.findUnique({ where: { id } });
  if (!solicitud) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const updated = await prisma.solicitud.update({
    where: { id },
    data:  { estado, notas: notas ?? null },
  });

  return NextResponse.json(updated);
}
