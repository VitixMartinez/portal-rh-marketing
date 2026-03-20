import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendVacationDecision } from "@/lib/email";

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
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden aprobar/rechazar solicitudes" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();

    // Fetch the full request before updating (to get employee email)
    const existing = await prisma.solicitud.findUnique({
      where: { id },
      include: {
        employee: { select: { firstName: true, lastName: true, email: true, companyId: true } },
      },
    });

    const solicitud = await prisma.solicitud.update({
      where: { id },
      data: {
        estado: body.estado ?? undefined,
        notas:  body.notas  ?? undefined,
      },
    });

    // ── Notificaciones por email (fire-and-forget) ──────────────────────────
    if (process.env.RESEND_API_KEY && existing && body.estado && body.estado !== "PENDIENTE") {
      const emp     = existing.employee;
      const companyId = emp.companyId;
      const branding  = await getCompanyBranding(companyId);
      const empName   = `${emp.firstName} ${emp.lastName}`;
      const approved  = body.estado === "APROBADA";
      const start = new Date(existing.fechaInicio).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
      const end   = new Date(existing.fechaFin).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

      if (emp.email) {
        sendVacationDecision({
          to: emp.email, employeeName: empName,
          startDate: start, endDate: end, days: existing.dias,
          approved, reason: body.notas ?? undefined, branding,
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
