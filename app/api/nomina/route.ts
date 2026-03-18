import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const AFP_EMPLEADO = 0.0287;
const SFS_EMPLEADO = 0.0304;
const AFP_PATRONAL = 0.0710;
const SFS_PATRONAL = 0.0709;
const SRL_PATRONAL = 0.0120;

function calcISRMensual(salario: number): number {
  const anual = salario * 12;
  let isrAnual = 0;
  if      (anual <= 416220) isrAnual = 0;
  else if (anual <= 624329) isrAnual = (anual - 416220) * 0.15;
  else if (anual <= 867123) isrAnual = 31216 + (anual - 624329) * 0.20;
  else                      isrAnual = 79776 + (anual - 867123) * 0.25;
  return Math.round(isrAnual / 12);
}

/**
 * GET /api/nomina?mes=2026-03
 * Returns monthly payroll data for the Reportes page.
 * All values are monthly (not per quincena) since Reportes shows monthly view.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const mes       = searchParams.get("mes") ?? new Date().toISOString().slice(0, 7);
    const companyId = session.companyId ?? "demo-company-id";

    const employees = await prisma.employee.findMany({
      where:  { companyId, status: "ACTIVO", salary: { not: null } },
      select: {
        id: true, firstName: true, lastName: true,
        jobTitle: true, salary: true, afp: true, ars: true,
        department: { select: { name: true } },
      },
      orderBy: { lastName: "asc" },
    });

    const rows = employees.map((emp: any) => {
      const salario      = parseFloat(String(emp.salary ?? 0));
      const afpEmpleado  = Math.round(salario * AFP_EMPLEADO);
      const sfsEmpleado  = Math.round(salario * SFS_EMPLEADO);
      const isr          = calcISRMensual(salario);
      const totalDesc    = afpEmpleado + sfsEmpleado + isr;
      const salarioNeto  = salario - totalDesc;
      const afpPatronal  = Math.round(salario * AFP_PATRONAL);
      const sfsPatronal  = Math.round(salario * SFS_PATRONAL);
      const srl          = Math.round(salario * SRL_PATRONAL);
      const aportePat    = afpPatronal + sfsPatronal + srl;
      const costoTotal   = salario + aportePat;

      return {
        employee: {
          id:         emp.id,
          firstName:  emp.firstName,
          lastName:   emp.lastName,
          jobTitle:   emp.jobTitle ?? null,
          department: emp.department?.name ?? null,
        },
        salarioBruto:        salario,
        afpEmpleado,
        sfsEmpleado,
        isr,
        totalDescuentos:     totalDesc,
        salarioNeto,
        afpPatronal,
        sfsPatronal,
        srl,
        totalAportePatronal: aportePat,
        costoTotal,
      };
    });

    return NextResponse.json({ rows, mes, total: rows.length });
  } catch (e: any) {
    console.error("[GET /api/nomina]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
