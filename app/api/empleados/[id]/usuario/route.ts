import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/* GET /api/empleados/[id]/usuario — verificar si el empleado tiene cuenta de usuario */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const { id } = await params;

    const user = await prisma.user.findFirst({
      where: { employeeId: id, companyId: session.companyId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ hasAccess: false });
    }

    return NextResponse.json({
      hasAccess: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (e: any) {
    console.error("[GET /api/empleados/[id]/usuario]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/* DELETE /api/empleados/[id]/usuario — revocar acceso al portal */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const { id } = await params;

    const user = await prisma.user.findFirst({
      where: { employeeId: id, companyId: session.companyId },
    });

    if (!user) {
      return NextResponse.json({ error: "Este empleado no tiene acceso al portal" }, { status: 404 });
    }

    // No se puede revocar el acceso del propio usuario que está haciendo la acción
    if (user.id === session.userId) {
      return NextResponse.json({ error: "No puedes revocar tu propio acceso" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: user.id } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[DELETE /api/empleados/[id]/usuario]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
