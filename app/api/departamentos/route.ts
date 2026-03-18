import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const companyId = session.companyId ?? "demo-company-id";

    const depts = await prisma.department.findMany({
      where: { companyId },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(depts);
  } catch (error) {
    console.error("[GET /api/departamentos]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden crear departamentos" }, { status: 403 });
    }

    const body      = await req.json();
    const companyId = session.companyId ?? "demo-company-id";

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const dept = await prisma.department.create({
      data: { companyId, name: body.name.trim() },
    });

    return NextResponse.json(dept, { status: 201 });
  } catch (error) {
    console.error("[POST /api/departamentos]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
