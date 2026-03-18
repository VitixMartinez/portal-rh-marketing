import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/* ─── PATCH — aprobar o rechazar una terminación pendiente ──────────────── */
export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden aprobar o rechazar terminaciones" }, { status: 403 });
    }

    const { id }    = await context.params;
    const body      = await req.json();
    const nuevoEstado: string = body.estado; // "APROBADA" | "RECHAZADA"

    if (!["APROBADA", "RECHAZADA"].includes(nuevoEstado)) {
      return NextResponse.json({ error: "Estado inválido. Use APROBADA o RECHAZADA" }, { status: 400 });
    }

    // Fetch the terminacion to get the employeeId
    const rows = await prisma.$queryRawUnsafe(
      `SELECT "id","employeeId","estado" FROM "Terminacion" WHERE "id" = $1`,
      id,
    ) as { id: string; employeeId: string; estado: string }[];

    if (!rows.length) {
      return NextResponse.json({ error: "Terminación no encontrada" }, { status: 404 });
    }

    const terminacion = rows[0];

    if (terminacion.estado !== "PENDIENTE") {
      return NextResponse.json({ error: "Esta terminación ya fue procesada" }, { status: 409 });
    }

    // Update the terminacion record
    await prisma.$executeRawUnsafe(
      `UPDATE "Terminacion"
          SET "estado" = $1, "aprobadoPorId" = $2, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $3`,
      nuevoEstado,
      session.employeeId ?? null,
      id,
    );

    // If approved: mark employee INACTIVO
    if (nuevoEstado === "APROBADA") {
      await prisma.employee.update({
        where: { id: terminacion.employeeId },
        data:  { status: "INACTIVO" },
      });
    }

    return NextResponse.json({ id, estado: nuevoEstado });
  } catch (error) {
    console.error("[PATCH /api/terminaciones/:id]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/* ─── DELETE — eliminar terminación (solo PENDIENTE) ────────────────────── */
export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden eliminar terminaciones" }, { status: 403 });
    }

    const { id } = await context.params;

    await prisma.$executeRawUnsafe(
      `DELETE FROM "Terminacion" WHERE "id" = $1`,
      id,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/terminaciones/:id]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
