/**
 * GET /api/admin/solicitudes-tiempo
 * OWNER_ADMIN: ve todas las solicitudes de la empresa.
 * MANAGER: ve solo las de su equipo directo (supervisorId = su employeeId).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");

  const employeeFilter =
    session.role === "MANAGER"
      ? { companyId: session.companyId, supervisorId: session.employeeId ?? "__none__" }
      : { companyId: session.companyId };

  const solicitudes = await prisma.solicitud.findMany({
    where: {
      ...(estado ? { estado: estado as any } : {}),
      employee: employeeFilter,
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(solicitudes);
}
