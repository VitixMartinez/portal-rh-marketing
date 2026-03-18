import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/* ─── PATCH — editar una comunicación ───────────────────────────────────── */
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const isAdmin   = session.role === "OWNER_ADMIN";
    const isManager = session.role === "MANAGER";

    if (!isAdmin && !isManager) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id } = await context.params;
    const companyId = session.companyId ?? "demo-company-id";

    // Verify ownership
    const rows = await prisma.$queryRawUnsafe(
      `SELECT "id","companyId","publicadoPorId" FROM "Comunicacion" WHERE "id" = $1 AND "companyId" = $2`,
      id,
      companyId,
    ) as { id: string; companyId: string; publicadoPorId: string | null }[];

    if (!rows.length) {
      return NextResponse.json({ error: "Comunicación no encontrada" }, { status: 404 });
    }

    // Managers can only edit their own communications
    const com = rows[0];
    if (isManager && com.publicadoPorId !== session.employeeId) {
      return NextResponse.json({ error: "Solo puedes editar tus propias comunicaciones" }, { status: 403 });
    }

    const body = await req.json();
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (body.titulo !== undefined) {
      updates.push(`"titulo" = $${idx++}`);
      params.push(body.titulo);
    }
    if (body.cuerpo !== undefined) {
      updates.push(`"cuerpo" = $${idx++}`);
      params.push(body.cuerpo);
    }
    if (body.tipo !== undefined) {
      updates.push(`"tipo" = $${idx++}`);
      params.push(body.tipo);
    }
    if (body.fijado !== undefined) {
      updates.push(`"fijado" = $${idx++}`);
      params.push(Boolean(body.fijado));
    }
    if ("pdfUrl" in body) {
      updates.push(`"pdfUrl" = $${idx++}`);
      params.push(body.pdfUrl ?? null);
    }
    if (body.duracionDias !== undefined) {
      const dias = Math.max(1, Math.min(365, Number(body.duracionDias) || 7));
      updates.push(`"duracionDias" = $${idx++}`);
      updates.push(`"fechaCaducidad" = "createdAt" + ($${idx++} || ' days')::INTERVAL`);
      params.push(dias);
      params.push(dias);
    }

    if (!updates.length) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }

    updates.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    params.push(id);

    await prisma.$executeRawUnsafe(
      `UPDATE "Comunicacion" SET ${updates.join(", ")} WHERE "id" = $${idx}`,
      ...params,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/comunicaciones/:id]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/* ─── DELETE — eliminar una comunicación ────────────────────────────────── */
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const isAdmin   = session.role === "OWNER_ADMIN";
    const isManager = session.role === "MANAGER";

    if (!isAdmin && !isManager) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id } = await context.params;
    const companyId = session.companyId ?? "demo-company-id";

    // Verify ownership
    const rows = await prisma.$queryRawUnsafe(
      `SELECT "id","publicadoPorId" FROM "Comunicacion" WHERE "id" = $1 AND "companyId" = $2`,
      id,
      companyId,
    ) as { id: string; publicadoPorId: string | null }[];

    if (!rows.length) {
      return NextResponse.json({ error: "Comunicación no encontrada" }, { status: 404 });
    }

    // Managers can only delete their own communications
    if (isManager && rows[0].publicadoPorId !== session.employeeId) {
      return NextResponse.json({ error: "Solo puedes eliminar tus propias comunicaciones" }, { status: 403 });
    }

    await prisma.$executeRawUnsafe(`DELETE FROM "Comunicacion" WHERE "id" = $1`, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/comunicaciones/:id]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
