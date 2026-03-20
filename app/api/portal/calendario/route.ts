/**
 * GET /api/portal/calendario
 * Returns approved (and optionally pending) vacation requests for the company,
 * so employees can see when their teammates are out.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const COLORS = [
  "#3B82F6","#8B5CF6","#10B981","#F59E0B",
  "#EF4444","#0EA5E9","#6366F1","#14B8A6",
  "#EC4899","#84CC16","#F97316","#06B6D4",
];

function employeeColor(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return COLORS[h % COLORS.length];
}

export async function GET() {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const companyId = session.companyId;

  const solicitudes = await prisma.solicitud.findMany({
    where: {
      employee: { companyId },
      estado: { in: ["APROBADA", "PENDIENTE"] },
      fechaFin: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
      },
    },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, jobTitle: true,
          department: { select: { name: true } } },
      },
    },
    orderBy: { fechaInicio: "asc" },
  });

  const result = solicitudes.map(s => ({
    id:          s.id,
    employeeId:  s.employeeId,
    firstName:   s.employee.firstName,
    lastName:    s.employee.lastName,
    jobTitle:    s.employee.jobTitle,
    department:  s.employee.department?.name ?? null,
    tipo:        s.tipo,
    estado:      s.estado,
    fechaInicio: s.fechaInicio.toISOString().slice(0, 10),
    fechaFin:    s.fechaFin.toISOString().slice(0, 10),
    dias:        s.dias,
    color:       employeeColor(s.employeeId),
    isMe:        s.employeeId === session.employeeId,
  }));

  return NextResponse.json(result);
}
