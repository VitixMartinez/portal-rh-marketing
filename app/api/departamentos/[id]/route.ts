import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden editar departamentos" }, { status: 403 });
    }

    const { id } = await context.params;
    const body    = await req.json();

    const dept = await prisma.department.update({
      where: { id },
      data:  { name: body.name.trim() },
    });

    return NextResponse.json(dept);
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden eliminar departamentos" }, { status: 403 });
    }

    const { id } = await context.params;
    await prisma.department.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Foreign key constraint: department has employees
    if (error.code === "P2003") {
      return NextResponse.json({ error: "No se puede eliminar un departamento con empleados asignados" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
