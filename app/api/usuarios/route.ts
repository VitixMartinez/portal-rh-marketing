import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";

/* POST /api/usuarios — crear acceso administrativo para un empleado de RH */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const { employeeId, email, password, role } = await req.json();

    if (!employeeId || !email || !password) {
      return NextResponse.json({ error: "employeeId, email y password son requeridos" }, { status: 400 });
    }

    // Verificar que el empleado existe y pertenece a la misma empresa
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId: session.companyId },
      include: { department: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    // Verificar que no tiene ya un usuario
    const existing = await prisma.user.findFirst({
      where: { employeeId },
    });
    if (existing) {
      return NextResponse.json({ error: "Este empleado ya tiene acceso al portal" }, { status: 409 });
    }

    // Verificar que el email no está en uso
    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) {
      return NextResponse.json({ error: "Este correo ya está registrado en el portal" }, { status: 409 });
    }

    const hashedPassword = hashPassword(password);
    const assignedRole = role === "MANAGER" ? "MANAGER" : "OWNER_ADMIN";

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: `${employee.firstName} ${employee.lastName}`,
        role: assignedRole,
        companyId: session.companyId!,
        employeeId,
      },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      employeeId: user.employeeId,
    }, { status: 201 });

  } catch (e: any) {
    console.error("[POST /api/usuarios]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/* GET /api/usuarios — listar usuarios con acceso */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: { companyId: session.companyId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        employeeId: true,
        createdAt: true,
        employee: {
          select: {
            firstName: true,
            lastName: true,
            jobTitle: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (e: any) {
    console.error("[GET /api/usuarios]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
