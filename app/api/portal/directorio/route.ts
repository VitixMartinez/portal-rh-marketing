/**
 * GET /api/portal/directorio
 * Returns public employee info for the company directory.
 * Accessible to all authenticated portal users (EMPLOYEE role).
 * No salary or sensitive financial data is exposed.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const employees = await prisma.employee.findMany({
      where: {
        companyId: session.companyId,
        status:    "ACTIVO",
      },
      select: {
        id:         true,
        firstName:  true,
        lastName:   true,
        jobTitle:   true,
        hireDate:   true,
        email:      true,
        phone:      true,
        department: { select: { id: true, name: true } },
      },
      orderBy: [
        { lastName:  "asc" },
        { firstName: "asc" },
      ],
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error("[DIRECTORIO GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
