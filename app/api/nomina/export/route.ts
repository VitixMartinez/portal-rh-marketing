import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";

const AFP_EMPLEADO = 0.0287;
const SFS_EMPLEADO = 0.0304;
const AFP_PATRONAL = 0.0710;
const SFS_PATRONAL = 0.0709;
const SRL_PATRONAL = 0.0120;

const MESES_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function calcISRMensual(salario: number): number {
  const anual = salario * 12;
  let isrAnual = 0;
  if      (anual <= 416220) isrAnual = 0;
  else if (anual <= 624329) isrAnual = (anual - 416220) * 0.15;
  else if (anual <= 867123) isrAnual = 31216 + (anual - 624329) * 0.20;
  else                      isrAnual = 79776 + (anual - 867123) * 0.25;
  return Math.round(isrAnual / 12);
}

function periodoLabel(periodo: string): string {
  const parts = periodo.split("-");
  if (parts.length === 3) {
    const [y, m, q] = parts;
    return `${q === "1" ? "1ra" : "2da"} Quincena ${MESES_ES[parseInt(m) - 1]} ${y}`;
  } else {
    const [y, m] = parts;
    return `${MESES_ES[parseInt(m) - 1]} ${y}`;
  }
}

// Enumerate all quincenal periods from startDate to endDate (inclusive)
function enumPeriods(startDate: Date, endDate: Date): string[] {
  const periods: string[] = [];
  let y = startDate.getUTCFullYear();
  let m = startDate.getUTCMonth() + 1;
  let q: 1 | 2 = startDate.getUTCDate() <= 15 ? 1 : 2;

  const endY = endDate.getUTCFullYear();
  const endM = endDate.getUTCMonth() + 1;
  const endQ: 1 | 2 = endDate.getUTCDate() <= 15 ? 1 : 2;

  while (true) {
    const mm = String(m).padStart(2, "0");
    periods.push(`${y}-${mm}-${q}`);

    // Check if we've reached or passed the end
    if (y > endY || (y === endY && m > endM) || (y === endY && m === endM && q >= endQ)) break;

    if (q === 1) {
      q = 2;
    } else {
      q = 1;
      m++;
      if (m > 12) { m = 1; y++; }
    }
    // Safety: max 60 periods
    if (periods.length >= 60) break;
  }
  return periods;
}

function buildNominaRows(
  employees: any[],
  loanMap: Record<string, number>,
  quincena: 1 | 2,
  comisionMap: Record<string, number> = {},
) {
  return employees.map((emp: any) => {
    const mensual        = parseFloat(String(emp.salary ?? 0));
    const comisionPeriodo = comisionMap[emp.id] ?? 0;
    // Annualise commission for ISR bracket (x2 for the other quincena)
    const comisionMensual = comisionPeriodo * 2;
    const baseCalculo    = mensual + comisionMensual;

    const afpEmp  = Math.round(baseCalculo * AFP_EMPLEADO);
    const sfsEmp  = Math.round(baseCalculo * SFS_EMPLEADO);
    const isr     = calcISRMensual(baseCalculo);
    const afpPat  = Math.round(baseCalculo * AFP_PATRONAL);
    const sfsPat  = Math.round(baseCalculo * SFS_PATRONAL);
    const srl     = Math.round(baseCalculo * SRL_PATRONAL);

    const bruto   = Math.round(mensual / 2) + comisionPeriodo;
    const isrQ    = Math.round(isr / 2);
    const cuota   = loanMap[emp.id] ?? 0;
    const afpQ    = quincena === 2 ? afpEmp : 0;
    const sfsQ    = quincena === 2 ? sfsEmp : 0;
    const afpPatQ = quincena === 2 ? afpPat : 0;
    const sfsPatQ = quincena === 2 ? sfsPat : 0;
    const srlQ    = quincena === 2 ? srl : 0;
    const totalDesc = afpQ + sfsQ + isrQ + cuota;
    const neto      = bruto - totalDesc;
    const costo     = bruto + afpPatQ + sfsPatQ + srlQ;
    return {
      empId: emp.id,
      nombre: `${emp.lastName}, ${emp.firstName}`,
      puesto: emp.jobTitle ?? "—",
      departamento: emp.department?.name ?? "—",
      salMensual: mensual,
      comision: comisionPeriodo,
      bruto,
      afpEmp: afpQ, sfsEmp: sfsQ, isr: isrQ, prestamo: cuota,
      totalDesc, neto,
      afpPat: afpPatQ, sfsPat: sfsPatQ, srl: srlQ, costo,
    };
  });
}

function addNominaSheet(
  wb: any,
  sheetName: string,
  rows: ReturnType<typeof buildNominaRows>,
  label: string,
) {
  type R = typeof rows[0];
  const sum = (k: keyof R) => rows.reduce((s, r) => s + (r[k] as number), 0);
  const hasComisiones = rows.some(r => r.comision > 0);

  if (hasComisiones) {
    const ws = XLSX.utils.aoa_to_sheet([
      [`Nomina - ${label}`],
      ["Portal RH - Legislacion Dominicana (Ley 87-01 / DGII 2024)"],
      [],
      ["Empleado","Puesto","Departamento","Sal. Mensual (RD$)","Comision (RD$)","Bruto (RD$)",
       "AFP 2.87%","SFS 3.04%","ISR (RD$)","Prestamo (RD$)",
       "Total Desc. (RD$)","NETO A PAGAR (RD$)",
       "AFP Pat. 7.10%","SFS Pat. 7.09%","SRL 1.20%","Costo Total (RD$)"],
      ...rows.map(r=>[r.nombre,r.puesto,r.departamento,
        r.salMensual,r.comision,r.bruto,r.afpEmp,r.sfsEmp,r.isr,r.prestamo,
        r.totalDesc,r.neto,r.afpPat,r.sfsPat,r.srl,r.costo]),
      ["TOTALES","","",
        sum("salMensual"),sum("comision"),sum("bruto"),sum("afpEmp"),sum("sfsEmp"),sum("isr"),sum("prestamo"),
        sum("totalDesc"),sum("neto"),sum("afpPat"),sum("sfsPat"),sum("srl"),sum("costo")],
    ]);
    ws["!cols"] = [{wch:28},{wch:22},{wch:18},{wch:16},{wch:16},{wch:16},{wch:13},{wch:13},{wch:12},{wch:13},{wch:13},{wch:16},{wch:13},{wch:13},{wch:11},{wch:16}];
    ws["!merges"] = [{s:{r:0,c:0},e:{r:0,c:15}},{s:{r:1,c:0},e:{r:1,c:15}}];
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  } else {
    const ws = XLSX.utils.aoa_to_sheet([
      [`Nomina - ${label}`],
      ["Portal RH - Legislacion Dominicana (Ley 87-01 / DGII 2024)"],
      [],
      ["Empleado","Puesto","Departamento","Sal. Mensual (RD$)","Bruto (RD$)",
       "AFP 2.87%","SFS 3.04%","ISR (RD$)","Prestamo (RD$)",
       "Total Desc. (RD$)","NETO A PAGAR (RD$)",
       "AFP Pat. 7.10%","SFS Pat. 7.09%","SRL 1.20%","Costo Total (RD$)"],
      ...rows.map(r=>[r.nombre,r.puesto,r.departamento,
        r.salMensual,r.bruto,r.afpEmp,r.sfsEmp,r.isr,r.prestamo,
        r.totalDesc,r.neto,r.afpPat,r.sfsPat,r.srl,r.costo]),
      ["TOTALES","","",
        sum("salMensual"),sum("bruto"),sum("afpEmp"),sum("sfsEmp"),sum("isr"),sum("prestamo"),
        sum("totalDesc"),sum("neto"),sum("afpPat"),sum("sfsPat"),sum("srl"),sum("costo")],
    ]);
    ws["!cols"] = [{wch:28},{wch:22},{wch:18},{wch:16},{wch:16},{wch:13},{wch:13},{wch:12},{wch:13},{wch:13},{wch:16},{wch:13},{wch:13},{wch:11},{wch:16}];
    ws["!merges"] = [{s:{r:0,c:0},e:{r:0,c:14}},{s:{r:1,c:0},e:{r:1,c:14}}];
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  }
}

/* GET /api/nomina/export?mes=2026-03&quincena=1
   OR  /api/nomina/export?fechaInicio=2026-01-01&fechaFin=2026-03-31  */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = session.companyId ?? "demo-company-id";

    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin    = searchParams.get("fechaFin");

    const employees = await prisma.employee.findMany({
      where:   { companyId, status: "ACTIVO", salary: { not: null } },
      select:  {
        id: true, firstName: true, lastName: true,
        jobTitle: true, salary: true,
        department: { select: { name: true } },
      },
      orderBy: { lastName: "asc" },
    });

    const wb = XLSX.utils.book_new();

    if (fechaInicio && fechaFin) {
      // ── DATE RANGE MODE ──────────────────────────────────────────────────
      const startDate = new Date(fechaInicio + "T00:00:00Z");
      const endDate   = new Date(fechaFin   + "T23:59:59Z");
      const periods   = enumPeriods(startDate, endDate);

      if (periods.length === 0) {
        return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
      }

      // Fetch all loan payments for all periods in one query
      const placeholders = periods.map((_, i) => `$${i + 2}`).join(", ");
      const allLoanRows = await prisma.$queryRawUnsafe(
        `SELECT p."employeeId", pg.periodo, SUM(pg.monto) AS total
         FROM "Prestamo" p
         JOIN "PrestamoPago" pg ON pg."prestamoId" = p.id
         WHERE p."companyId" = $1
           AND p.estado = 'ACTIVO'
           AND pg.aplicado = false
           AND pg.periodo IN (${placeholders})
         GROUP BY p."employeeId", pg.periodo`,
        companyId, ...periods,
      ) as { employeeId: string; periodo: string; total: string }[];

      // Fetch all commissions for all periods in one query
      const comPlaceholders = periods.map((_, i) => `$${i + 2}`).join(", ");
      const allComRows = await prisma.$queryRawUnsafe(
        `SELECT "employeeId", periodo, "montoComision"
         FROM "VentaComision"
         WHERE "companyId" = $1
           AND periodo IN (${comPlaceholders})`,
        companyId, ...periods,
      ) as { employeeId: string; periodo: string; montoComision: string }[];

      type TotalsRow = {
        comision: number;
        bruto: number; afpEmp: number; sfsEmp: number; isr: number; prestamo: number;
        totalDesc: number; neto: number; afpPat: number; sfsPat: number; srl: number; costo: number;
      };
      const zero = (): TotalsRow => ({ comision:0,bruto:0,afpEmp:0,sfsEmp:0,isr:0,prestamo:0,totalDesc:0,neto:0,afpPat:0,sfsPat:0,srl:0,costo:0 });
      const addTo = (a: TotalsRow, b: TotalsRow) => {
        a.comision+=b.comision; a.bruto+=b.bruto; a.afpEmp+=b.afpEmp; a.sfsEmp+=b.sfsEmp; a.isr+=b.isr;
        a.prestamo+=b.prestamo; a.totalDesc+=b.totalDesc; a.neto+=b.neto;
        a.afpPat+=b.afpPat; a.sfsPat+=b.sfsPat; a.srl+=b.srl; a.costo+=b.costo;
      };

      // Accumulate: per-employee totals + per-period company totals + per-employee-per-period detail
      const empTotals:      Record<string, TotalsRow> = {};
      const periodTotals:   Record<string, TotalsRow & { empCount: number }> = {};
      const empPeriodData:  Record<string, Record<string, TotalsRow>> = {};

      // Keep employee meta for later
      const empMeta: Record<string, { nombre: string; puesto: string; departamento: string; salMensual: number }> = {};
      for (const emp of employees as any[]) {
        empMeta[emp.id] = {
          nombre: `${emp.lastName}, ${emp.firstName}`,
          puesto: emp.jobTitle ?? "—",
          departamento: emp.department?.name ?? "—",
          salMensual: parseFloat(String(emp.salary ?? 0)),
        };
      }

      for (const periodo of periods) {
        const q = parseInt(periodo.split("-")[2] ?? "1") as 1 | 2;
        const loanMap: Record<string, number> = {};
        for (const r of allLoanRows) {
          if (r.periodo === periodo) loanMap[r.employeeId] = Number(r.total ?? 0);
        }
        // Build commission map for this period
        const comisionMap: Record<string, number> = {};
        for (const r of allComRows) {
          if (r.periodo === periodo) comisionMap[r.employeeId] = Number(r.montoComision ?? 0);
        }
        const rows = buildNominaRows(employees as any[], loanMap, q, comisionMap);

        // Individual period sheet (keep)
        const sheetLabel = periodoLabel(periodo);
        const safeName = sheetLabel.replace(/[:/\\?[\]]/g, "-").slice(0, 31);
        addNominaSheet(wb, safeName, rows, sheetLabel);

        // Accumulate company totals for this period
        const pt: TotalsRow & { empCount: number } = { ...zero(), empCount: 0 };
        for (const r of rows) {
          const rt: TotalsRow = { comision:r.comision,bruto:r.bruto,afpEmp:r.afpEmp,sfsEmp:r.sfsEmp,isr:r.isr,
            prestamo:r.prestamo,totalDesc:r.totalDesc,neto:r.neto,
            afpPat:r.afpPat,sfsPat:r.sfsPat,srl:r.srl,costo:r.costo };

          // Employee total
          if (!empTotals[r.empId]) empTotals[r.empId] = zero();
          addTo(empTotals[r.empId], rt);

          // Per-employee per-period
          if (!empPeriodData[r.empId]) empPeriodData[r.empId] = {};
          empPeriodData[r.empId][periodo] = rt;

          // Period company total
          addTo(pt, rt);
          if (r.bruto > 0) pt.empCount++;
        }
        periodTotals[periodo] = pt;
      }

      const rangeLabel = `${fechaInicio} al ${fechaFin} (${periods.length} períodos)`;
      const hasComisionesRange = Object.values(periodTotals).some(p => p.comision > 0);

      const COLS = hasComisionesRange
        ? ["Comisión","Bruto","AFP Emp.","SFS Emp.","ISR","Prést.","Total Desc.","Neto","AFP Pat.","SFS Pat.","SRL","Costo Emp."]
        : ["Bruto","AFP Emp.","SFS Emp.","ISR","Prést.","Total Desc.","Neto","AFP Pat.","SFS Pat.","SRL","Costo Emp."];

      const pickArr = (t: TotalsRow) => hasComisionesRange
        ? [t.comision,t.bruto,t.afpEmp,t.sfsEmp,t.isr,t.prestamo,t.totalDesc,t.neto,t.afpPat,t.sfsPat,t.srl,t.costo]
        : [t.bruto,t.afpEmp,t.sfsEmp,t.isr,t.prestamo,t.totalDesc,t.neto,t.afpPat,t.sfsPat,t.srl,t.costo];

      // ── Sheet 1: Resumen Empresa (periods as rows, company totals as columns) ──
      const compTotal = zero();
      const compRows = periods.map(p => {
        const pt = periodTotals[p];
        addTo(compTotal, pt);
        return [periodoLabel(p), pt.empCount, ...pickArr(pt)];
      });
      const nCols = COLS.length + 2;
      const wsEmpresa = XLSX.utils.aoa_to_sheet([
        [`Resumen por Empresa — ${rangeLabel}`],
        ["Portal RH - Legislacion Dominicana (Ley 87-01 / DGII 2024)"],
        [],
        ["Período","Empleados",...COLS],
        ...compRows,
        ["TOTAL PERÍODO","", ...pickArr(compTotal)],
      ]);
      wsEmpresa["!cols"] = [{wch:30},{wch:11},...COLS.map(()=>({wch:14}))];
      wsEmpresa["!merges"] = [{s:{r:0,c:0},e:{r:0,c:nCols-1}},{s:{r:1,c:0},e:{r:1,c:nCols-1}}];

      // ── Sheet 2: Resumen Empleados (per-employee breakdown by period) ──
      const detailData: (string | number)[][] = [
        [`Resumen por Empleado — ${rangeLabel}`],
        ["Portal RH - Legislacion Dominicana (Ley 87-01 / DGII 2024)"],
        [],
      ];

      for (const emp of employees as any[]) {
        const meta = empMeta[emp.id];
        const epd  = empPeriodData[emp.id];
        if (!epd) continue; // no activity

        // Employee header
        detailData.push([`${meta.nombre} · ${meta.puesto} · ${meta.departamento} · Sal. Mensual: RD$ ${meta.salMensual.toLocaleString("es-DO")}`, ...Array(COLS.length + 1).fill("")]);
        detailData.push(["Período", "—", ...COLS]);

        for (const periodo of periods) {
          const t = epd[periodo] ?? zero();
          if (t.bruto === 0) continue; // skip inactive periods
          detailData.push([periodoLabel(periodo), "—", ...pickArr(t)]);
        }

        const et = empTotals[emp.id] ?? zero();
        detailData.push(["SUBTOTAL", "—", ...pickArr(et)]);
        detailData.push([]); // blank separator
      }

      // Grand total row
      detailData.push(["TOTAL EMPRESA", "—", ...pickArr(compTotal)]);

      const wsEmpleados = XLSX.utils.aoa_to_sheet(detailData);
      wsEmpleados["!cols"] = [{wch:42},{wch:4},...COLS.map(()=>({wch:14}))];
      wsEmpleados["!merges"] = [{s:{r:0,c:0},e:{r:0,c:nCols-1}},{s:{r:1,c:0},e:{r:1,c:nCols-1}}];

      // Insert both summary sheets FIRST (in order: Empresa, Empleados, then period sheets)
      wb.SheetNames.unshift("Resumen Empleados");
      wb.Sheets["Resumen Empleados"] = wsEmpleados;
      wb.SheetNames.unshift("Resumen Empresa");
      wb.Sheets["Resumen Empresa"] = wsEmpresa;

      const buf = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
      const filename = `nomina_${fechaInicio}_${fechaFin}.xlsx`;
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(buf.length),
        },
      });

    } else {
      // ── SINGLE PERIOD MODE ───────────────────────────────────────────────
      const mes       = searchParams.get("mes") ?? new Date().toISOString().slice(0, 7);
      const quincena  = parseInt(searchParams.get("quincena") ?? "1") as 1 | 2;
      const [yearS, monthS] = mes.split("-");
      const periodo    = `${yearS}-${monthS}-${quincena}`;
      const pLabel     = periodoLabel(periodo);

      const loanRows = await prisma.$queryRawUnsafe(
        `SELECT p."employeeId", SUM(pg.monto) AS total
         FROM "Prestamo" p
         JOIN "PrestamoPago" pg ON pg."prestamoId" = p.id
         WHERE p."companyId" = $1
           AND p.estado = 'ACTIVO'
           AND pg.periodo = $2
           AND pg.aplicado = false
         GROUP BY p."employeeId"`,
        companyId, periodo,
      ) as { employeeId: string; total: string }[];

      const loanMap: Record<string, number> = {};
      for (const r of loanRows) loanMap[r.employeeId] = Number(r.total ?? 0);

      // Fetch commissions for this period
      const comRows = await prisma.$queryRawUnsafe(
        `SELECT "employeeId", "montoComision"
         FROM "VentaComision"
         WHERE "companyId" = $1 AND periodo = $2`,
        companyId, periodo,
      ) as { employeeId: string; montoComision: string }[];

      const comisionMap: Record<string, number> = {};
      for (const r of comRows) comisionMap[r.employeeId] = Number(r.montoComision ?? 0);

      const rows = buildNominaRows(employees, loanMap, quincena, comisionMap);
      type R = typeof rows[0];
      const sum = (k: keyof R) => rows.reduce((s, r) => s + (r[k] as number), 0);
      const hasComisiones = rows.some(r => r.comision > 0);

      addNominaSheet(wb, "Empleados", rows, pLabel);

      // Sheet 2: Patronal
      const ws2 = XLSX.utils.aoa_to_sheet([
        [`Vista Patronal - ${pLabel}`],
        ["Aportes y costos totales de la empresa"],
        [],
        ["Empleado","Puesto","Departamento","Bruto (RD$)",
         "AFP Pat. 7.10%","SFS Pat. 7.09%","SRL 1.20%",
         "Total Aportes Pat. (RD$)","Costo Total Empresa (RD$)"],
        ...rows.map(r=>[r.nombre,r.puesto,r.departamento,
          r.bruto,r.afpPat,r.sfsPat,r.srl,
          r.afpPat+r.sfsPat+r.srl,r.costo]),
        ["TOTALES","","",sum("bruto"),sum("afpPat"),sum("sfsPat"),sum("srl"),
          sum("afpPat")+sum("sfsPat")+sum("srl"),sum("costo")],
      ]);
      ws2["!cols"] = [{wch:28},{wch:22},{wch:18},{wch:16},{wch:16},{wch:16},{wch:14},{wch:20},{wch:20}];
      ws2["!merges"] = [{s:{r:0,c:0},e:{r:0,c:8}},{s:{r:1,c:0},e:{r:1,c:8}}];
      XLSX.utils.book_append_sheet(wb, ws2, "Patronal");

      // Sheet 3: Prestamos
      const loanEmps = rows.filter(r => r.prestamo > 0);
      const ws3 = XLSX.utils.aoa_to_sheet([
        [`Descuentos por Prestamos - ${pLabel}`],
        [],
        ["Empleado","Descuento Este Periodo (RD$)"],
        ...(loanEmps.length > 0
          ? loanEmps.map(r=>[r.nombre, r.prestamo])
          : [["No hay prestamos activos para este periodo.",""]]),
      ]);
      ws3["!cols"] = [{wch:30},{wch:26}];
      ws3["!merges"] = [{s:{r:0,c:0},e:{r:0,c:1}}];
      XLSX.utils.book_append_sheet(wb, ws3, "Prestamos");

      // Sheet 4: Comisiones (only if there are commissions this period)
      if (hasComisiones) {
        const comEmps = rows.filter(r => r.comision > 0);
        const ws4 = XLSX.utils.aoa_to_sheet([
          [`Comisiones por Ventas - ${pLabel}`],
          [],
          ["Empleado","Comision Este Periodo (RD$)"],
          ...comEmps.map(r => [r.nombre, r.comision]),
          ["TOTAL", sum("comision")],
        ]);
        ws4["!cols"] = [{wch:30},{wch:26}];
        ws4["!merges"] = [{s:{r:0,c:0},e:{r:0,c:1}}];
        XLSX.utils.book_append_sheet(wb, ws4, "Comisiones");
      }

      const buf = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
      const filename = `nomina_${periodo}.xlsx`;
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(buf.length),
        },
      });
    }
  } catch (e: any) {
    console.error("[GET /api/nomina/export]", e);
    return NextResponse.json({ error: "Error al generar Excel: " + e.message }, { status: 500 });
  }
}
