import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";

/**
 * Extracts the subdomain from the Host header.
 * e.g. "kmdestinos.portal-hr.com" → "kmdestinos"
 *      "portal-hr.com" | "localhost" → null
 */
function extractSubdomain(req: NextRequest): string | null {
  const host = req.headers.get("host") ?? "";
  const hostname = host.split(":")[0]; // remove port
  const parts = hostname.split(".");

  // Needs at least 3 parts: sub.domain.tld  — ignore "www"
  if (parts.length >= 3 && parts[0] !== "www") {
    return parts[0];
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const subdomain = extractSubdomain(req);

    type UserRow = {
      id: string; email: string; name: string | null;
      password: string | null; role: string;
      companyId: string; employeeId: string | null;
    };

    let user: UserRow | null = null;

    if (subdomain) {
      // Multi-tenant: find company by subdomain (raw SQL — new column not in Prisma client yet)
      type CompanyRow = { id: string };
      const companies = await prisma.$queryRawUnsafe<CompanyRow[]>(
        `SELECT "id" FROM "Company" WHERE "subdomain" = $1 LIMIT 1`,
        subdomain,
      );

      if (!companies.length) {
        return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
      }

      const companyId = companies[0].id;
      const users = await prisma.$queryRawUnsafe<UserRow[]>(
        `SELECT "id","email","name","password","role","companyId","employeeId"
         FROM "User" WHERE "email" = $1 AND "companyId" = $2 LIMIT 1`,
        normalizedEmail,
        companyId,
      );
      user = users[0] ?? null;
    } else {
      // Root domain — find first matching user by email
      const users = await prisma.$queryRawUnsafe<UserRow[]>(
        `SELECT "id","email","name","password","role","companyId","employeeId"
         FROM "User" WHERE "email" = $1 LIMIT 1`,
        normalizedEmail,
      );
      user = users[0] ?? null;
    }

    if (!user || !user.password) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    const valid = verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    await setSessionCookie({
      userId:     user.id,
      email:      user.email,
      name:       user.name ?? "",
      role:       user.role as "OWNER_ADMIN" | "MANAGER" | "EMPLOYEE",
      companyId:  user.companyId,
      employeeId: user.employeeId ?? null,
    });

    return NextResponse.json({
      id:         user.id,
      name:       user.name,
      email:      user.email,
      role:       user.role,
      employeeId: user.employeeId ?? null,
    });
  } catch (error) {
    console.error("[AUTH LOGIN]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
