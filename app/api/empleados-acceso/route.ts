/**
 * POST /api/empleados-acceso
 * Crea o actualiza el acceso (User) de un empleado.
 * Body: { employeeId, email, password }
 * Solo admins.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, getSession, isAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session.role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { employeeId, email, password } = await req.json();

    if (!employeeId || !email || !password) {
      return NextResponse.json({ error: "employeeId, email y password son requeridos" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    // Verify employee exists and belongs to this company
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId: session.companyId },
    });
    if (!employee) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    const hashed = hashPassword(password);

    // Check if employee already has a user account
    const existing = await prisma.user.findFirst({
      where: { employeeId },
    });

    if (existing) {
      // Update credentials
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          email:    email.toLowerCase().trim(),
          password: hashed,
          name:     `${employee.firstName} ${employee.lastName}`,
        },
      });
      return NextResponse.json({ ok: true, userId: updated.id, created: false });
    }

    // Create new user account linked to employee
    const user = await (prisma as any).user.create({
      data: {
        id:         `user-emp-${employeeId}`,
        name:       `${employee.firstName} ${employee.lastName}`,
        email:      email.toLowerCase().trim(),
        password:   hashed,
        role:       "EMPLOYEE",
        companyId:  session.companyId,
        employeeId: employeeId,
      },
    });

    return NextResponse.json({ ok: true, userId: user.id, created: true });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Ese email ya está en uso" }, { status: 409 });
    }
    console.error("[EMPLEADOS-ACCESO]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
