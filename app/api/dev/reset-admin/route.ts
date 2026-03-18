import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

/**
 * Temporary dev route to reset / create the admin user.
 * Call: GET /api/dev/reset-admin?secret=reset2026
 * DELETE THIS FILE after use.
 */
export async function GET(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (secret !== "reset2026") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email    = "admin@empresa.com";
  const password = "Admin123";
  const hashed   = hashPassword(password);

  try {
    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      // Update password
      await prisma.user.update({
        where: { email },
        data:  { password: hashed },
      });
      return NextResponse.json({
        ok: true,
        action: "updated",
        email,
        message: "Contraseña actualizada. Ya puedes entrar con Admin123",
      });
    } else {
      // Find or create a company first
      let company = await prisma.company.findFirst();
      if (!company) {
        company = await prisma.company.create({
          data: { name: "Mi Empresa" },
        });
      }
      // Create the admin user
      await prisma.user.create({
        data: {
          email,
          name:      "Administrador",
          password:  hashed,
          role:      "OWNER_ADMIN",
          companyId: company.id,
        },
      });
      return NextResponse.json({
        ok: true,
        action: "created",
        email,
        message: "Usuario admin creado. Ya puedes entrar con Admin123",
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
