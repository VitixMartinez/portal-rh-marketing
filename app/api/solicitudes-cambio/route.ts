import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/solicitudes-cambio
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const estado = searchParams.get("estado");
    const empId  = searchParams.get("employeeId");

    let whereClause: any = {
      ...(estado ? { estado } : {}),
      employee: { companyId: session.companyId },
    };

    if (session.role === "EMPLOYEE") {
      // Empleado: solo ve las suyas
      whereClause.employeeId = session.employeeId ?? "__none__";
    } else if (session.role === "MANAGER") {
      // Manager: solo ve las de su equipo directo (empleados cuyo supervisor es él)
      whereClause.employee = {
        companyId:    session.companyId,
        supervisorId: session.employeeId ?? "__none__",
      };
    } else {
      // OWNER_ADMIN: ve todas; puede filtrar por empId
      if (empId) whereClause.employeeId = empId;
    }

    const solicitudes = await (prisma as any).solicitudCambio.findMany({
      where: whereClause,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(solicitudes);
  } catch (error) {
    console.error("[SOLICITUDES GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST — empleado envía solicitud de cambio de datos
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "EMPLOYEE") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    if (!session.employeeId) {
      return NextResponse.json({ error: "Cuenta no vinculada a empleado" }, { status: 400 });
    }

    const body = await req.json();
    const { campo, campoLabel, valorActual, valorNuevo, motivo } = body;

    if (!campo || !campoLabel || !valorNuevo) {
      return NextResponse.json(
        { error: "Campos requeridos: campo, campoLabel, valorNuevo" },
        { status: 400 }
      );
    }

    const solicitud = await (prisma as any).solicitudCambio.create({
      data: {
        id:          `sc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        employeeId:  session.employeeId,
        campo,
        campoLabel,
        valorActual: valorActual ?? null,
        valorNuevo,
        motivo:      motivo ?? null,
        estado:      "PENDIENTE",
      },
    });

    return NextResponse.json(solicitud, { status: 201 });
  } catch (error) {
    console.error("[SOLICITUDES POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
