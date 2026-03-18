import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden editar cursos" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();

    const curso = await (prisma as any).curso.update({
      where: { id },
      data: {
        titulo:      body.titulo      ?? undefined,
        descripcion: body.descripcion ?? undefined,
        categoria:   body.categoria   ?? undefined,
        modalidad:   body.modalidad   ?? undefined,
        duracionHrs: body.duracionHrs !== undefined ? (body.duracionHrs ? parseInt(body.duracionHrs) : null) : undefined,
        recurrencia: body.recurrencia ?? undefined,
        obligatorio: body.obligatorio !== undefined ? body.obligatorio : undefined,
        activo:      body.activo      !== undefined ? body.activo      : undefined,
      },
    });

    // Save extra columns (resilient)
    try {
      const updates: string[] = [];
      const vals: any[] = [];
      let idx = 1;
      if (body.materiales      !== undefined) { updates.push(`materiales=$${idx++}`);          vals.push(JSON.stringify(body.materiales)); }
      if (body.preguntas       !== undefined) { updates.push(`preguntas=$${idx++}`);            vals.push(JSON.stringify(body.preguntas)); }
      if (body.tieneEvaluacion !== undefined) { updates.push(`"tieneEvaluacion"=$${idx++}`);   vals.push(body.tieneEvaluacion === true); }
      if (body.notaAprobatoria !== undefined) { updates.push(`"notaAprobatoria"=$${idx++}`);   vals.push(Number(body.notaAprobatoria) || 70); }
      if (updates.length > 0) {
        vals.push(id);
        await prisma.$executeRawUnsafe(`UPDATE "Curso" SET ${updates.join(", ")} WHERE id=$${idx}`, ...vals);
      }
    } catch { /* migration pending */ }

    return NextResponse.json(curso);
  } catch (error) {
    console.error("[PATCH /api/cursos/:id]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden eliminar cursos" }, { status: 403 });
    }
    const { id } = await context.params;
    await (prisma as any).curso.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
