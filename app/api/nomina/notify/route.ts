/**
 * POST /api/nomina/notify
 * Envía notificaciones de nómina a todos los empleados de una quincena/mes.
 * Body: { mes: "2026-03", period: "Marzo 2026 (1ra quincena)" }
 * Solo OWNER_ADMIN.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendPayrollNotification } from "@/lib/email";

const AFP_EMPLEADO = 0.0287;
const SFS_EMPLEADO = 0.0304;

function calcISRMensual(salario: number): number {
  const anual = salario * 12;
  let isrAnual = 0;
  if      (anual <= 416220) isrAnual = 0;
  else if (anual <= 624329) isrAnual = (anual - 416220) * 0.15;
  else if (anual <= 867123) isrAnual = 31216 + (anual - 624329) * 0.20;
  else                      isrAnual = 79776 + (anual - 867123) * 0.25;
  return Math.round(isrAnual / 12);
}

function formatDOP(amount: number): string {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 0 }).format(amount);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Email no configurado (RESEND_API_KEY faltante)" }, { status: 503 });
    }

    const body   = await req.json();
    const period = body.period ?? body.mes ?? "Este período";
    const companyId = session.companyId;
    const host   = req.headers.get("host") ?? "";
    const portalUrl = `https://${host}`;

    // Get company branding
    type BrandRow = { name: string; brandName: string | null; primaryColor: string | null };
    const brandRows = await prisma.$queryRawUnsafe<BrandRow[]>(
      `SELECT "name", "brandName", "primaryColor" FROM "Company" WHERE "id" = $1 LIMIT 1`,
      companyId,
    );
    const br = brandRows[0];
    const branding = {
      brandName:    br?.brandName ?? br?.name ?? "Portal RH",
      primaryColor: br?.primaryColor ?? "#2563eb",
    };

    // Get active employees with salary and email
    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        status: "ACTIVO",
        salary: { not: null },
        email:  { not: null },
      },
      select: { id: true, firstName: true, lastName: true, salary: true, email: true },
    });

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const emp of employees) {
      if (!emp.email) continue;
      const salario     = parseFloat(String(emp.salary ?? 0));
      const afpEmp      = Math.round(salario * AFP_EMPLEADO);
      const sfsEmp      = Math.round(salario * SFS_EMPLEADO);
      const isr         = calcISRMensual(salario);
      const salarioNeto = salario - afpEmp - sfsEmp - isr;

      const result = await sendPayrollNotification({
        to:           emp.email,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        period,
        netPay:    formatDOP(salarioNeto),
        portalUrl,
        branding,
      });

      if (result.ok) sent++;
      else { failed++; errors.push(`${emp.email}: ${result.error}`); }
    }

    return NextResponse.json({ ok: true, sent, failed, total: employees.length, errors });
  } catch (error: any) {
    console.error("[POST /api/nomina/notify]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
