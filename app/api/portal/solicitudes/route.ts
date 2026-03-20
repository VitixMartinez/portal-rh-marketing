/**
 * GET  /api/portal/solicitudes  — lista solicitudes del empleado autenticado
 * POST /api/portal/solicitudes  — crea una nueva solicitud de tiempo
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  sendVacationRequestConfirmation,
  sendVacationRequestToAdmin,
} from "@/lib/email";

const TIPO_LABEL: Record<string, string> = {
  VACACIONES:          "Vacaciones",
  PERMISO:             "Permiso",
  LICENCIA_MEDICA:     "Licencia Médica",
  LICENCIA_MATERNIDAD: "Licencia Maternidad",
  LICENCIA_PATERNIDAD: "Licencia Paternidad",
  OTRO:                "Otro",
};

// ─── Helper: branding + adminEmail de la empresa ─────────────────────────────
async function getCompanyBranding(companyId: string) {
  type Row = { name: string; brandName: string | null; primaryColor: string | null; adminEmail: string | null };
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT c."name", c."brandName", c."primaryColor",
            (SELECT u."email" FROM "User" u
             WHERE u."companyId" = c."id" AND u."role" = 'OWNER_ADMIN'
             LIMIT 1) AS "adminEmail"
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

export async function GET() {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const solicitudes = await prisma.solicitud.findMany({
    where:   { employeeId: session.employeeId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(solicitudes);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const { tipo, fechaInicio, fechaFin, motivo } = body;

  if (!tipo || !fechaInicio || !fechaFin) {
    return NextResponse.json(
      { error: "Tipo, fecha inicio y fecha fin son requeridos" },
      { status: 400 }
    );
  }

  const inicio = new Date(fechaInicio);
  const fin    = new Date(fechaFin);

  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
    return NextResponse.json({ error: "Fechas inválidas" }, { status: 400 });
  }
  if (fin < inicio) {
    return NextResponse.json(
      { error: "La fecha de fin debe ser mayor o igual a la de inicio" },
      { status: 400 }
    );
  }

  // Calculate business days (Mon-Fri)
  let dias = 0;
  const cur = new Date(inicio);
  while (cur <= fin) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) dias++;
    cur.setDate(cur.getDate() + 1);
  }

  const solicitud = await prisma.solicitud.create({
    data: {
      employeeId:  session.employeeId,
      tipo,
      fechaInicio: inicio,
      fechaFin:    fin,
      dias,
      motivo:      motivo || null,
      estado:      "PENDIENTE",
    },
  });

  // ── Notificaciones por email (fire-and-forget) ────────────────────────────
  if (process.env.RESEND_API_KEY && session.companyId) {
    // Get employee with supervisor info
    const emp = await prisma.employee.findUnique({
      where:  { id: session.employeeId },
      select: {
        firstName: true, lastName: true, email: true,
        supervisor: {
          select: {
            email: true, firstName: true, lastName: true,
            userAccount: { select: { email: true } },
          },
        },
      },
    });

    if (emp) {
      const branding   = await getCompanyBranding(session.companyId);
      const empName    = `${emp.firstName} ${emp.lastName}`;
      const tipoLabel  = TIPO_LABEL[tipo] ?? tipo;
      const startStr   = inicio.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
      const endStr     = fin.toLocaleDateString("es-MX",   { day: "2-digit", month: "long", year: "numeric" });
      const portalUrl  = `https://${req.headers.get("host")}`;

      // 1. Al empleado
      if (emp.email) {
        sendVacationRequestConfirmation({
          to: emp.email, employeeName: empName, tipo: tipoLabel,
          startDate: startStr, endDate: endStr, days: dias, branding,
        }).catch(e => console.error("[EMAIL portal vacation employee]", e));
      }

      // 2. Al supervisor directo (si existe y tiene email)
      const supervisorEmail = emp.supervisor?.email ?? emp.supervisor?.userAccount?.email ?? null;
      if (supervisorEmail) {
        sendVacationRequestToAdmin({
          to: supervisorEmail,
          employeeName: empName,
          employeeEmail: emp.email ?? "",
          tipo: tipoLabel,
          startDate: startStr, endDate: endStr, days: dias,
          motivo: motivo || undefined,
          portalUrl, branding,
        }).catch(e => console.error("[EMAIL portal vacation supervisor]", e));
      }

      // 3. Al admin OWNER_ADMIN (si es diferente al supervisor)
      if (branding.adminEmail && branding.adminEmail !== supervisorEmail) {
        sendVacationRequestToAdmin({
          to: branding.adminEmail,
          employeeName: empName,
          employeeEmail: emp.email ?? "",
          tipo: tipoLabel,
          startDate: startStr, endDate: endStr, days: dias,
          motivo: motivo || undefined,
          portalUrl, branding,
        }).catch(e => console.error("[EMAIL portal vacation admin]", e));
      }
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  return NextResponse.json(solicitud, { status: 201 });
}
