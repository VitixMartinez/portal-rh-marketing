import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  sendVacationRequestConfirmation,
  sendVacationRequestToAdmin,
} from "@/lib/email";

// ─── Helper: obtener branding de la empresa ───────────────────────────────────
async function getCompanyBranding(companyId: string) {
  type Row = { name: string; brandName: string | null; primaryColor: string | null; adminEmail: string | null };
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT c."name", c."brandName", c."primaryColor",
            (SELECT u."email" FROM "User" u WHERE u."companyId" = c."id" AND u."role" = 'OWNER_ADMIN' LIMIT 1) AS "adminEmail"
     FROM "Company" c WHERE c."id" = $1 LIMIT 1`,
    companyId,
  );
  const r = rows[0];
  return {
    brandName:    r?.brandName ?? r?.name ?? "Portal RH",
    primaryColor: r?.primaryColor ?? "#2563eb",
    adminEmail:   r?.adminEmail ?? undefined,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const estado = searchParams.get("estado") ?? "";

    let employeeId = searchParams.get("employeeId") ?? "";
    const companyId = session.companyId ?? "demo-company-id";

    if (session.role === "EMPLOYEE") {
      employeeId = session.employeeId ?? employeeId;
    }

    const solicitudes = await prisma.solicitud.findMany({
      where: {
        employee: { companyId },
        ...(employeeId ? { employeeId } : {}),
        ...(estado     ? { estado: estado as never } : {}),
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, jobTitle: true, department: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(solicitudes);
  } catch (error) {
    console.error("[GET /api/vacaciones]", error);
    return NextResponse.json({ error: "Error al obtener solicitudes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { employeeId, tipo, fechaInicio, fechaFin, dias, motivo } = body;

    if (!employeeId || !fechaInicio || !fechaFin || !dias) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    if (session.role === "EMPLOYEE" && session.employeeId !== employeeId) {
      return NextResponse.json({ error: "Solo puedes solicitar vacaciones para ti mismo" }, { status: 403 });
    }

    // Ensure the employee belongs to the same company
    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { companyId: true, firstName: true, lastName: true, email: true },
    });
    const companyId = session.companyId ?? "demo-company-id";
    if (!emp || emp.companyId !== companyId) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    const solicitud = await prisma.solicitud.create({
      data: {
        employeeId,
        tipo:        tipo ?? "VACACIONES",
        fechaInicio: new Date(fechaInicio),
        fechaFin:    new Date(fechaFin),
        dias:        parseInt(dias),
        motivo:      motivo ?? null,
        estado:      "PENDIENTE",
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // ── Notificaciones por email (fire-and-forget) ──────────────────────────
    if (process.env.RESEND_API_KEY) {
      const branding = await getCompanyBranding(companyId);
      const empName  = `${emp.firstName} ${emp.lastName}`;
      const start    = new Date(fechaInicio).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
      const end      = new Date(fechaFin).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
      const numDias  = parseInt(dias);

      // Al empleado
      if (emp.email) {
        sendVacationRequestConfirmation({
          to: emp.email, employeeName: empName,
          startDate: start, endDate: end, days: numDias, branding,
        }).catch(e => console.error("[EMAIL vacation employee]", e));
      }

      // Al admin
      if (branding.adminEmail) {
        sendVacationRequestToAdmin({
          to: branding.adminEmail, employeeName: empName,
          employeeEmail: emp.email ?? "", startDate: start, endDate: end, days: numDias,
          portalUrl: `https://${req.headers.get("host")}`, branding,
        }).catch(e => console.error("[EMAIL vacation admin]", e));
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    return NextResponse.json(solicitud, { status: 201 });
  } catch (error) {
    console.error("[POST /api/vacaciones]", error);
    return NextResponse.json({ error: "Error al crear solicitud" }, { status: 500 });
  }
}
