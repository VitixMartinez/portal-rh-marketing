/**
 * PATCH /api/admin/usuarios/[id]
 * OWNER_ADMIN puede cambiar el rol de cualquier usuario.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "OWNER_ADMIN") {
    return NextResponse.json({ error: "Solo el administrador puede cambiar roles" }, { status: 403 });
  }

  const { id }   = await context.params;
  const { role } = await req.json();

  if (!["EMPLOYEE", "MANAGER", "OWNER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  // Cannot downgrade yourself
  if (id === session.userId) {
    return NextResponse.json({ error: "No puedes cambiar tu propio rol" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where:  { id },
    data:   { role },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(user);
}
