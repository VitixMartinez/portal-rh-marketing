import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || !session.employeeId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    include: {
      department: { select: { id: true, name: true } },
      supervisor: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!employee) {
    return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
  }

  return NextResponse.json(employee);
}
