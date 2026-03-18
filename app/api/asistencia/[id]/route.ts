import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden editar asistencia" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { estado, horaEntrada, horaSalida, notas, ausenciaCode, adjuntos } = body;

    const adjuntosJson = adjuntos !== undefined
      ? JSON.stringify(Array.isArray(adjuntos) ? adjuntos : [])
      : undefined;

    const codeVal = ausenciaCode !== undefined ? (ausenciaCode?.trim() || null) : undefined;

    await prisma.$executeRawUnsafe(
      `UPDATE "Asistencia"
       SET estado = COALESCE($1, estado),
           "horaEntrada" = CASE WHEN $2::text IS NOT NULL THEN $2::timestamp ELSE "horaEntrada" END,
           "horaSalida"  = CASE WHEN $3::text IS NOT NULL THEN $3::timestamp ELSE "horaSalida" END,
           notas = COALESCE($4, notas),
           "ausenciaCode" = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE "ausenciaCode" END,
           adjuntos = COALESCE($6, adjuntos),
           "updatedAt" = NOW()
       WHERE id = $7`,
      estado ?? null,
      horaEntrada ? new Date(horaEntrada).toISOString() : null,
      horaSalida  ? new Date(horaSalida).toISOString()  : null,
      notas ?? null,
      codeVal ?? null,
      adjuntosJson ?? null,
      id
    );

    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "Asistencia" WHERE id = $1`, id
    ) as any[];

    return NextResponse.json(rows[0] ?? { id });
  } catch (error) {
    console.error("[PATCH /api/asistencia/[id]]", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden eliminar registros de asistencia" }, { status: 403 });
    }

    const { id } = await context.params;
    await prisma.asistencia.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
