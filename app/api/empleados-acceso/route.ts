/**
 * POST /api/empleados-acceso
 * Crea o actualiza el acceso (User) de un empleado.
 * Body: { employeeId, email, password }
 * Solo admins.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, getSession, isAdmin } from "@/lib/auth";
import { sendWelcomeEmail, sendPasswordReset } from "@/lib/email";

// ─── Helper: obtener branding de la empresa ───────────────────────────────────
async function getCompanyBranding(companyId: string) {
  type Row = { name: string; brandName: string | null; primaryColor: string | null };
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT "name", "brandName", "primaryColor" FROM "Company" WHERE "id" = $1 LIMIT 1`,
    companyId,
  );
  const r = rows[0];
  return {
    brandName:    r?.brandName ?? r?.name ?? "Portal RH",
    primaryColor: r?.primaryColor ?? "#2563eb",
  };
}

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

    const hashed   = hashPassword(password);
    const empName  = `${employee.firstName} ${employee.lastName}`;
    const host     = req.headers.get("host") ?? "";
    const loginUrl = `https://${host}/login`;

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
          name:     empName,
        },
      });

      // Send password reset notification
      if (process.env.RESEND_API_KEY) {
        const branding = await getCompanyBranding(session.companyId);
        sendPasswordReset({
          to: email.toLowerCase().trim(),
          employeeName: empName,
          newPassword: password,
          loginUrl,
          branding,
        }).catch(e => console.error("[EMAIL password reset]", e));
      }

      return NextResponse.json({ ok: true, userId: updated.id, created: false });
    }

    // Create new user account linked to employee
    const user = await (prisma as any).user.create({
      data: {
        id:         `user-emp-${employeeId}`,
        name:       empName,
        email:      email.toLowerCase().trim(),
        password:   hashed,
        role:       "EMPLOYEE",
        companyId:  session.companyId,
        employeeId: employeeId,
      },
    });

    // Send welcome email with credentials
    if (process.env.RESEND_API_KEY) {
      const branding = await getCompanyBranding(session.companyId);
      sendWelcomeEmail({
        to: email.toLowerCase().trim(),
        employeeName: empName,
        tempPassword: password,
        loginUrl,
        branding,
      }).catch(e => console.error("[EMAIL welcome]", e));
    }

    return NextResponse.json({ ok: true, userId: user.id, created: true });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Ese email ya está en uso" }, { status: 409 });
    }
    console.error("[EMPLEADOS-ACCESO]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
