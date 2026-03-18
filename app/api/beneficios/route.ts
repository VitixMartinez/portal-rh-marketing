import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

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
 * Meses completos trabajados en un año dado.
 * hireDate null → asume enero del año (cuenta año completo).
 */
function mesesTrabajadosEnAnio(hireDate: Date | null, anio: number): number {
  if (!hireDate) return 12;
  const hireY = hireDate.getFullYear();
  const hireM = hireDate.getMonth(); // 0-based
  if (hireY > anio) return 0;       // no trabajó ese año
  if (hireY < anio) return 12;       // trabajó el año completo
  // Mismo año: contar meses desde el mes de contratación
  return 12 - hireM;
}

/**
 * Años completos de antigüedad al 31-dic del año dado.
 */
function aniosAntiguedad(hireDate: Date | null, anio: number): number {
  if (!hireDate) return 0;
  const hireY = hireDate.getFullYear();
  const hireM = hireDate.getMonth();
  const hireD = hireDate.getDate();
  // Al 31 de dic del año
  let years = anio - hireY;
  // Si no llegó al aniversario (mes/dia en ese año)
  if (hireM > 11 || (hireM === 11 && hireD > 31)) years--;
  return Math.max(0, years);
}

/* ── GET /api/beneficios?anio=2026&tipo=regalia|bonificacion ─────────────── */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const anio      = parseInt(searchParams.get("anio") ?? String(new Date().getFullYear()));
    const tipo      = searchParams.get("tipo") ?? "regalia";
    const companyId = session.companyId ?? "";

    // Load company settings for salario mínimo
    const compRows = await prisma.$queryRawUnsafe(
      `SELECT settings FROM "Company" WHERE id = $1`, companyId
    ) as { settings: string | null }[];
    let settings: Record<string, unknown> = {};
    try { settings = compRows[0]?.settings ? JSON.parse(compRows[0].settings) : {}; } catch {}

    const salarioMinimo = Number(settings.salarioMinimo ?? 21000); // default RD$21,000

    const employees = await prisma.employee.findMany({
      where:   { companyId, status: "ACTIVO", salary: { not: null } },
      select:  { id: true, firstName: true, lastName: true, jobTitle: true,
                 salary: true, hireDate: true,
                 department: { select: { name: true } } },
      orderBy: { lastName: "asc" },
    });

    if (tipo === "regalia") {
      // ── Regalía Pascual (Art. 219-222 Código de Trabajo) ─────────────────
      // = salario_mensual × meses_trabajados_en_año / 12
      // Tope: 5 × salario mínimo
      // ISR: EXENTO
      const tope = salarioMinimo * 5;

      const rows = employees.map((emp: any) => {
        const salMensual = parseFloat(String(emp.salary ?? 0));
        const meses      = mesesTrabajadosEnAnio(emp.hireDate, anio);
        const proporcional = meses / 12;
        const montoCalc  = Math.round(salMensual * proporcional);
        const monto      = Math.min(montoCalc, tope);
        const topado     = montoCalc > tope;
        return {
          empId:       emp.id,
          nombre:      `${emp.lastName}, ${emp.firstName}`,
          puesto:      emp.jobTitle ?? "—",
          departamento:emp.department?.name ?? "—",
          salMensual,
          hireDate:    emp.hireDate,
          meses,
          montoCalc,
          monto,
          topado,
          exentoISR:   true,
        };
      }).filter(r => r.meses > 0);

      const total = rows.reduce((s, r) => s + r.monto, 0);
      return NextResponse.json({ tipo: "regalia", anio, tope, salarioMinimo, rows, total });

    } else {
      // ── Bonificación Anual (Art. 223-227 Código de Trabajo) ───────────────
      // = 10% utilidades netas distribuido proporcionalmente por salario
      // Tope individual: 45 días si < 3 años, 60 días si ≥ 3 años
      // ISR: aplica si total (salario + bonif) excede exención
      const utilidades = parseFloat(String(searchParams.get("utilidades") ?? "0"));
      const fondoTotal = Math.round(utilidades * 0.10);

      const rows = employees.map((emp: any) => {
        const salMensual = parseFloat(String(emp.salary ?? 0));
        const anios      = aniosAntiguedad(emp.hireDate, anio);
        const topeDias   = anios >= 3 ? 60 : 45;
        const topeMonto  = Math.round(salMensual / 30 * topeDias);
        const isr        = calcISRMensual(salMensual); // referencia mensual
        return {
          empId:       emp.id,
          nombre:      `${emp.lastName}, ${emp.firstName}`,
          puesto:      emp.jobTitle ?? "—",
          departamento:emp.department?.name ?? "—",
          salMensual,
          hireDate:    emp.hireDate,
          anios,
          topeDias,
          topeMonto,
          // Monto calculado después de distribuir el fondo (calculado en endpoint)
          montoBase:   0,
          monto:       0,
          topado:      false,
          isrEstimado: 0,
        };
      });

      // Distribute fondo proporcionalmente por salario, respetando tope individual
      if (fondoTotal > 0 && rows.length > 0) {
        const salTotal = rows.reduce((s, r) => s + r.salMensual, 0);
        let fondoRestante = fondoTotal;

        // Iterative distribution: apply topes
        let changed = true;
        const capped = new Set<string>();
        while (changed) {
          changed = false;
          const salActivoTotal = rows
            .filter(r => !capped.has(r.empId))
            .reduce((s, r) => s + r.salMensual, 0);

          for (const r of rows) {
            if (capped.has(r.empId)) continue;
            const proporcional = salActivoTotal > 0 ? r.salMensual / salActivoTotal : 0;
            const montoCalc = Math.round(fondoRestante * proporcional);
            if (montoCalc >= r.topeMonto) {
              r.montoBase = montoCalc;
              r.monto     = r.topeMonto;
              r.topado    = true;
              if (!capped.has(r.empId)) {
                capped.add(r.empId);
                fondoRestante -= r.topeMonto;
                changed = true;
                break; // restart loop after change
              }
            }
          }
        }

        // Assign remaining fondo to uncapped employees
        const salUncappedTotal = rows
          .filter(r => !capped.has(r.empId))
          .reduce((s, r) => s + r.salMensual, 0);
        for (const r of rows) {
          if (capped.has(r.empId)) continue;
          const proporcional = salUncappedTotal > 0 ? r.salMensual / salUncappedTotal : 0;
          r.monto     = Math.round(fondoRestante * proporcional);
          r.montoBase = r.monto;
        }
      }

      // Estimate ISR impact for each employee (informational)
      for (const r of rows) {
        const salAnual         = r.salMensual * 12;
        const bonifAnual       = r.monto;
        const baseImponibleAnual = salAnual + bonifAnual;
        let isrConBonif = 0;
        if      (baseImponibleAnual <= 416220) isrConBonif = 0;
        else if (baseImponibleAnual <= 624329) isrConBonif = (baseImponibleAnual - 416220) * 0.15;
        else if (baseImponibleAnual <= 867123) isrConBonif = 31216 + (baseImponibleAnual - 624329) * 0.20;
        else                                   isrConBonif = 79776 + (baseImponibleAnual - 867123) * 0.25;
        const isrSinBonif = r.salMensual * 12 <= 416220 ? 0 :
          r.salMensual * 12 <= 624329 ? (r.salMensual * 12 - 416220) * 0.15 :
          r.salMensual * 12 <= 867123 ? 31216 + (r.salMensual * 12 - 624329) * 0.20 :
          79776 + (r.salMensual * 12 - 867123) * 0.25;
        r.isrEstimado = Math.round(Math.max(0, isrConBonif - isrSinBonif));
      }

      const totalDistribuido = rows.reduce((s, r) => s + r.monto, 0);
      const totalISR         = rows.reduce((s, r) => s + r.isrEstimado, 0);
      return NextResponse.json({
        tipo: "bonificacion", anio, utilidades, fondoTotal,
        totalDistribuido, totalISR,
        rows: rows.filter(r => r.monto > 0),
      });
    }
  } catch (e: any) {
    console.error("[GET /api/beneficios]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
