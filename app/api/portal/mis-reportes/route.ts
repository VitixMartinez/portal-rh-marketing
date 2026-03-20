/**
 * GET /api/portal/mis-reportes
 * Returns pending vacation/time-off requests from the current user's direct reports.
 * Only useful for employees who are supervisors.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // All time-off requests from direct reports (all statuses so supervisor sees history)
  const solicitudes = await prisma.solicitud.findMany({
    where: {
      employee: {
        supervisorId: session.employeeId,
        companyId:    session.companyId,
      },
    },
    include: {
      employee: {
        select: {
          id: true, firstName: true, lastName: true,
          jobTitle: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { estado: "asc" },   // PENDIENTE first
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json(solicitudes);
}
