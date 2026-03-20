import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendVacationDecision } from "@/lib/email";

const TIPO_LABEL: Record<string, string> = {
  VACACIONES:          "Vacaciones",
  PERMISO:             "Permiso",
  LICENCIA_MEDICA:     "Licencia Médica",
  LICENCIA_MATERNIDAD: "Licencia Maternidad",
  LICENCIA_PATERNIDAD: "Licencia Paternidad",
  OTRO:                "Otro",
};

// ─── Helper: obtener branding de la empresa ───────────────────────────────────
async function getCompanyBranding(companyId: string) {
  type Row = { name: string; brandName: string | null; primaryColor: string | null };
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT "name", "brandName", "primaryColor" FROM "Company" WHERE "id" = $1 LIMIT 1`,
    companyId,
  );
  const r = rows[0];
  return {
    brandName:    r?.brandName ?? r?.name ?? "Portal RH",
    primaryColor: r?.primaryColor ?? "#2563eb",
  };
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();

    // Fetch full solicitud to verify permissions
    const existing = await prisma.solicitud.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            firstName: true, lastName: true, email: true,
            companyId: true, supervisorId: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    // Permission check:
    // - OWNER_ADMIN can approve any request in their company
    // - EMPLOYEE with an employeeId can approve if they are the direct supervisor
    const isAdmin = session.role === "OWNER_ADMIN";
    const isSupervisor =
      session.role === "EMPLOYEE" &&
      session.employeeId &&
      existing.employee.supervisorId === session.employeeId;

    if (!isAdmin && !isSupervisor) {
      return NextResponse.json(
        { error: "No tienes permiso para aprobar esta solicitud" },
        { status: 403 }
      );
    }

    const solicitud = await prisma.solicitud.update({
      where: { id },
      data: {
        estado: body.estado ?? undefined,
        notas:  body.notas  ?? undefined,
      },
    });

    // ── Notificaciones por email (fire-and-forget) ──────────────────────────
    if (process.env.RESEND_API_KEY && body.estado && body.estado !== "PENDIENTE") {
      const emp       = existing.employee;
      const companyId = emp.companyId;
      const branding  = await getCompanyBranding(companyId);
      const empName   = `${emp.firstName} ${emp.lastName}`;
      const approved  = body.estado === "APROBADA";
      const tipoLabel = TIPO_LABEL[existing.tipo] ?? existing.tipo;
      const start = new Date(existing.fechaInicio).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
      const end   = new Date(existing.fechaFin).toLocaleDateString("es-MX",   { day: "2-digit", month: "long", year: "numeric" });

      if (emp.email) {
        sendVacationDecision({
          to: emp.email, employeeName: empName,
          startDate: start, endDate: end, days: existing.dias,
          approved, tipo: tipoLabel,
          reason: body.notas ?? undefined, branding,
        }).catch(e => console.error("[EMAIL vacation decision]", e));
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    return NextResponse.json(solicitud);
  } catch (error) {
    console.error("[PATCH /api/vacaciones/[id]]", error);
    return NextResponse.json({ error: "Error al actualizar solicitud" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden eliminar solicitudes" }, { status: 403 });
    }

    const { id } = await context.params;
    await prisma.solicitud.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
