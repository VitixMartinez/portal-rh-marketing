"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// ── Tipos ──────────────────────────────────────────────────────
type ReportType = "nomina" | "costo" | "vacaciones" | "tss";

interface NominaRow {
  employee: { id: string; firstName: string; lastName: string; jobTitle?: string; department?: string };
  salarioBruto: number;
  afpEmpleado: number;
  sfsEmpleado: number;
  isr: number;
  totalDescuentos: number;
  salarioNeto: number;
  afpPatronal: number;
  sfsPatronal: number;
  srl: number;
  totalAportePatronal: number;
  costoTotal: number;
}

interface VacacionesRow {
  id: string;
  nombre: string;
  puesto: string;
  departamento: string;
  fechaIngreso: string;
  anosTrabajados: number;
  diasPorAno: number;
  diasAcumulados: number;
  diasUsadosAno: number;
  diasUsadosTotal: number;
  diasDisponibles: number;
}

// ── Utilidades ──────────────────────────────────────────────────
const fmt = (n: number) =>
  "RD$ " + Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtNum = (n: number) =>
  Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const REPORTS: { id: ReportType; icon: string; label: string; desc: string }[] = [
  { id: "nomina",    icon: "nomina", label: "Nómina Mensual",    desc: "Salario bruto, deducciones y neto por empleado" },
  { id: "costo",     icon: "costo", label: "Costo Laboral",     desc: "Costo real de cada empleado incluyendo aportes patronales" },
  { id: "vacaciones",icon: "vacaciones", label: "Balance Vacaciones", desc: "Días acumulados, usados y disponibles por empleado (Ley 16-92)" },
  { id: "tss",       icon: "tss", label: "Planilla TSS",      desc: "AFP, SFS y SRL para envío a la TSS y retención ISR para DGII" },
];

function getReportIcon(reportType: string) {
  const icons: Record<string, JSX.Element> = {
    nomina: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    costo: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    vacaciones: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    tss: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
  };
  return icons[reportType] || icons.tss;
}

// ── Componente principal ────────────────────────────────────────
export default function ReportesPage() {
  const now = new Date();
  const [reportType, setReportType] = useState<ReportType>("nomina");
  const [mes, setMes]   = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [rows, setRows]  = useState<NominaRow[]>([]);
  const [vacRows, setVacRows] = useState<VacacionesRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("Mi Empresa");
  const printRef = useRef<HTMLDivElement>(null);

  // Load company name for print header
  useEffect(() => {
    fetch("/api/company")
      .then(r => r.json())
      .then(d => { if (d.name) setCompanyName(d.name); })
      .catch(() => {});
  }, []);

  const mesStr = `${year}-${String(mes).padStart(2, "0")}`;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (reportType === "vacaciones") {
        const res = await fetch(`/api/reportes/vacaciones?year=${year}`);
        if (!res.ok) throw new Error("Error cargando vacaciones");
        const data = await res.json();
        setVacRows(data.balances ?? []);
      } else {
        const res = await fetch(`/api/nomina?mes=${mesStr}`);
        if (!res.ok) throw new Error("Error cargando nómina");
        const data = await res.json();
        setRows(data.rows ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [reportType, mesStr, year]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePrint = () => window.print();

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const currentReport = REPORTS.find((r) => r.id === reportType)!;

  // ── Cálculo de totales nómina ──
  const totales = rows.reduce(
    (acc, r) => ({
      bruto: acc.bruto + r.salarioBruto,
      afpEmp: acc.afpEmp + r.afpEmpleado,
      sfsEmp: acc.sfsEmp + r.sfsEmpleado,
      isr: acc.isr + r.isr,
      desc: acc.desc + r.totalDescuentos,
      neto: acc.neto + r.salarioNeto,
      afpPat: acc.afpPat + r.afpPatronal,
      sfsPat: acc.sfsPat + r.sfsPatronal,
      srl: acc.srl + r.srl,
      aportePat: acc.aportePat + r.totalAportePatronal,
      costo: acc.costo + r.costoTotal,
    }),
    { bruto:0, afpEmp:0, sfsEmp:0, isr:0, desc:0, neto:0, afpPat:0, sfsPat:0, srl:0, aportePat:0, costo:0 }
  );

  const vacTotales = vacRows.reduce(
    (acc, r) => ({
      acumulados: acc.acumulados + r.diasAcumulados,
      usadosAno: acc.usadosAno + r.diasUsadosAno,
      usadosTotal: acc.usadosTotal + r.diasUsadosTotal,
      disponibles: acc.disponibles + r.diasDisponibles,
    }),
    { acumulados: 0, usadosAno: 0, usadosTotal: 0, disponibles: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Reportes financieros, laborales y legales de tu empresa.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="print:hidden flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir / PDF
        </button>
      </div>

      {/* Tipo de reporte */}
      <div className="print:hidden grid grid-cols-2 lg:grid-cols-4 gap-3">
        {REPORTS.map((r) => (
          <button
            key={r.id}
            onClick={() => setReportType(r.id)}
            className={[
              "rounded-xl border p-4 text-left transition",
              reportType === r.id
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/30"
                : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-600",
            ].join(" ")}
          >
            <div className="mb-1">{getReportIcon(r.id)}</div>
            <div className={`text-sm font-semibold ${reportType === r.id ? "text-blue-700 dark:text-blue-300" : "text-zinc-800 dark:text-zinc-200"}`}>
              {r.label}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">{r.desc}</div>
          </button>
        ))}
      </div>

      {/* Filtros de período */}
      <div className="print:hidden flex items-center gap-3 flex-wrap">
        {reportType !== "vacaciones" ? (
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">Mes:</label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-1.5 text-sm"
              >
                {MONTHS_ES.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">Año:</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-1.5 text-sm"
              >
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-600 dark:text-zinc-400">Año:</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-1.5 text-sm"
            >
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
        <button
          onClick={loadData}
          className="rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 text-sm font-medium transition"
        >
          Actualizar
        </button>
      </div>

      {/* Contenido del reporte */}
      <div ref={printRef} className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/40 overflow-hidden">
        {/* Encabezado del reporte (visible al imprimir) */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-current">{getReportIcon(currentReport.id)}</div>
              <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">{currentReport.label}</h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {reportType !== "vacaciones"
                ? `Período: ${MONTHS_ES[mes - 1]} ${year}`
                : `Año: ${year} — Calculado según Ley 16-92`}
            </p>
          </div>
          <div className="print:block hidden text-right text-xs text-zinc-400">
            <div className="font-semibold text-zinc-700">{companyName}</div>
            <div>Generado: {new Date().toLocaleDateString("es-DO")}</div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-400">
            <div className="flex items-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Cargando reporte...
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-red-500 text-sm">{error}</div>
        ) : (
          <>
            {/* ── Reporte: Nómina Mensual ── */}
            {reportType === "nomina" && (
              <div className="overflow-x-auto">
                {rows.length === 0 ? (
                  <div className="py-16 text-center text-sm text-zinc-400">
                    No hay empleados con nómina en {MONTHS_ES[mes - 1]} {year}.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 text-left">Empleado</th>
                        <th className="px-4 py-3 text-right">Salario Bruto</th>
                        <th className="px-4 py-3 text-right text-red-500">AFP (2.87%)</th>
                        <th className="px-4 py-3 text-right text-red-500">SFS (3.04%)</th>
                        <th className="px-4 py-3 text-right text-red-500">ISR</th>
                        <th className="px-4 py-3 text-right text-red-500">Total Desc.</th>
                        <th className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-semibold">Salario Neto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {rows.map((r) => (
                        <tr key={r.employee.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-zinc-800 dark:text-zinc-200">{r.employee.firstName} {r.employee.lastName}</div>
                            <div className="text-xs text-zinc-400">{r.employee.jobTitle ?? "—"} {r.employee.department ? `· ${r.employee.department}` : ""}</div>
                          </td>
                          <td className="px-4 py-3 text-right">{fmtNum(r.salarioBruto)}</td>
                          <td className="px-4 py-3 text-right text-red-500">-{fmtNum(r.afpEmpleado)}</td>
                          <td className="px-4 py-3 text-right text-red-500">-{fmtNum(r.sfsEmpleado)}</td>
                          <td className="px-4 py-3 text-right text-red-500">-{fmtNum(r.isr)}</td>
                          <td className="px-4 py-3 text-right text-red-500">-{fmtNum(r.totalDescuentos)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-blue-600 dark:text-blue-400">{fmtNum(r.salarioNeto)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-zinc-50 dark:bg-zinc-800/60 font-semibold border-t-2 border-zinc-200 dark:border-zinc-700">
                      <tr>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">TOTALES ({rows.length} empleados)</td>
                        <td className="px-4 py-3 text-right">{fmtNum(totales.bruto)}</td>
                        <td className="px-4 py-3 text-right text-red-500">-{fmtNum(totales.afpEmp)}</td>
                        <td className="px-4 py-3 text-right text-red-500">-{fmtNum(totales.sfsEmp)}</td>
                        <td className="px-4 py-3 text-right text-red-500">-{fmtNum(totales.isr)}</td>
                        <td className="px-4 py-3 text-right text-red-500">-{fmtNum(totales.desc)}</td>
                        <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">{fmtNum(totales.neto)}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}

            {/* ── Reporte: Costo Laboral ── */}
            {reportType === "costo" && (
              <div className="overflow-x-auto">
                {rows.length === 0 ? (
                  <div className="py-16 text-center text-sm text-zinc-400">
                    No hay empleados con nómina en {MONTHS_ES[mes - 1]} {year}.
                  </div>
                ) : (
                  <>
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 text-left">Empleado</th>
                          <th className="px-4 py-3 text-right">Salario Bruto</th>
                          <th className="px-4 py-3 text-right text-orange-500">AFP Pat. (7.10%)</th>
                          <th className="px-4 py-3 text-right text-orange-500">SFS Pat. (7.09%)</th>
                          <th className="px-4 py-3 text-right text-orange-500">SRL (1.20%)</th>
                          <th className="px-4 py-3 text-right text-orange-500">Total Aportes</th>
                          <th className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">Costo Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {rows.map((r) => (
                          <tr key={r.employee.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-zinc-800 dark:text-zinc-200">{r.employee.firstName} {r.employee.lastName}</div>
                              <div className="text-xs text-zinc-400">{r.employee.jobTitle ?? "—"} {r.employee.department ? `· ${r.employee.department}` : ""}</div>
                            </td>
                            <td className="px-4 py-3 text-right">{fmtNum(r.salarioBruto)}</td>
                            <td className="px-4 py-3 text-right text-orange-500">+{fmtNum(r.afpPatronal)}</td>
                            <td className="px-4 py-3 text-right text-orange-500">+{fmtNum(r.sfsPatronal)}</td>
                            <td className="px-4 py-3 text-right text-orange-500">+{fmtNum(r.srl)}</td>
                            <td className="px-4 py-3 text-right text-orange-500">+{fmtNum(r.totalAportePatronal)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{fmtNum(r.costoTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-zinc-50 dark:bg-zinc-800/60 font-semibold border-t-2 border-zinc-200 dark:border-zinc-700">
                        <tr>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">TOTALES ({rows.length} empleados)</td>
                          <td className="px-4 py-3 text-right">{fmtNum(totales.bruto)}</td>
                          <td className="px-4 py-3 text-right text-orange-500">+{fmtNum(totales.afpPat)}</td>
                          <td className="px-4 py-3 text-right text-orange-500">+{fmtNum(totales.sfsPat)}</td>
                          <td className="px-4 py-3 text-right text-orange-500">+{fmtNum(totales.srl)}</td>
                          <td className="px-4 py-3 text-right text-orange-500">+{fmtNum(totales.aportePat)}</td>
                          <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{fmtNum(totales.costo)}</td>
                        </tr>
                      </tfoot>
                    </table>
                    {/* Resumen visual */}
                    <div className="grid grid-cols-3 gap-4 p-6 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="text-center">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider">Masa Salarial</div>
                        <div className="text-xl font-bold text-zinc-800 dark:text-zinc-100 mt-1">{fmt(totales.bruto)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider">Aportes Patronales</div>
                        <div className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">+{fmt(totales.aportePat)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider">Costo Total Empresa</div>
                        <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{fmt(totales.costo)}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Reporte: Balance de Vacaciones ── */}
            {reportType === "vacaciones" && (
              <div className="overflow-x-auto">
                {vacRows.length === 0 ? (
                  <div className="py-16 text-center text-sm text-zinc-400">
                    No hay empleados activos.
                  </div>
                ) : (
                  <>
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 text-left">Empleado</th>
                          <th className="px-4 py-3 text-left">Puesto</th>
                          <th className="px-4 py-3 text-right">Fecha Ingreso</th>
                          <th className="px-4 py-3 text-right">Años</th>
                          <th className="px-4 py-3 text-right">Días/Año</th>
                          <th className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">Acumulados</th>
                          <th className="px-4 py-3 text-right text-red-500">Usados ({year})</th>
                          <th className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">Disponibles</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {vacRows.map((r) => (
                          <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                            <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">{r.nombre}</td>
                            <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{r.puesto}</td>
                            <td className="px-4 py-3 text-right text-zinc-500">{r.fechaIngreso}</td>
                            <td className="px-4 py-3 text-right">{r.anosTrabajados}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${r.diasPorAno === 18 ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                                {r.diasPorAno} días
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-blue-600 dark:text-blue-400">{r.diasAcumulados}</td>
                            <td className="px-4 py-3 text-right text-red-500">{r.diasUsadosAno > 0 ? `-${r.diasUsadosAno}` : "—"}</td>
                            <td className="px-4 py-3 text-right font-semibold">
                              <span className={r.diasDisponibles === 0 ? "text-red-500" : r.diasDisponibles <= 5 ? "text-yellow-600 dark:text-yellow-400" : "text-emerald-600 dark:text-emerald-400"}>
                                {r.diasDisponibles}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-zinc-50 dark:bg-zinc-800/60 font-semibold border-t-2 border-zinc-200 dark:border-zinc-700">
                        <tr>
                          <td colSpan={5} className="px-4 py-3 text-zinc-600 dark:text-zinc-400">TOTALES ({vacRows.length} empleados)</td>
                          <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">{vacTotales.acumulados}</td>
                          <td className="px-4 py-3 text-right text-red-500">{vacTotales.usadosAno > 0 ? `-${vacTotales.usadosAno}` : "—"}</td>
                          <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{vacTotales.disponibles}</td>
                        </tr>
                      </tfoot>
                    </table>
                    <div className="px-6 py-3 bg-amber-50 dark:bg-amber-900/10 border-t border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
                      ⚖️ Según <strong>Ley 16-92 Art. 177</strong>: 14 días hábiles de vacaciones al año (1-5 años de servicio) · 18 días (más de 5 años).
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Reporte: Planilla TSS / DGII ── */}
            {reportType === "tss" && (
              <div className="overflow-x-auto">
                {rows.length === 0 ? (
                  <div className="py-16 text-center text-sm text-zinc-400">
                    No hay empleados con nómina en {MONTHS_ES[mes - 1]} {year}.
                  </div>
                ) : (
                  <>
                    <div className="px-6 pt-4 pb-2">
                      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-0.5">
                        Aportes TSS — Período {MONTHS_ES[mes - 1]} {year}
                      </h3>
                      <p className="text-xs text-zinc-400">AFP: Administradora de Fondos de Pensiones · SFS: Seguro Familiar de Salud · SRL: Seguro de Riesgos Laborales</p>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 text-left">Empleado</th>
                          <th className="px-4 py-3 text-right">Salario Cotizable</th>
                          {/* AFP */}
                          <th className="px-4 py-3 text-right bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">AFP Emp.</th>
                          <th className="px-4 py-3 text-right bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">AFP Pat.</th>
                          <th className="px-4 py-3 text-right bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold">AFP Total</th>
                          {/* SFS */}
                          <th className="px-4 py-3 text-right bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">SFS Emp.</th>
                          <th className="px-4 py-3 text-right bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">SFS Pat.</th>
                          <th className="px-4 py-3 text-right bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-semibold">SFS Total</th>
                          {/* SRL + ISR */}
                          <th className="px-4 py-3 text-right text-orange-500">SRL Pat.</th>
                          <th className="px-4 py-3 text-right text-purple-600 dark:text-purple-400">ISR (DGII)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {rows.map((r) => (
                          <tr key={r.employee.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-zinc-800 dark:text-zinc-200">{r.employee.firstName} {r.employee.lastName}</div>
                              <div className="text-xs text-zinc-400">{r.employee.jobTitle ?? "—"}</div>
                            </td>
                            <td className="px-4 py-3 text-right">{fmtNum(r.salarioBruto)}</td>
                            <td className="px-4 py-3 text-right bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400">{fmtNum(r.afpEmpleado)}</td>
                            <td className="px-4 py-3 text-right bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400">{fmtNum(r.afpPatronal)}</td>
                            <td className="px-4 py-3 text-right bg-blue-50/50 dark:bg-blue-900/10 font-semibold text-blue-700 dark:text-blue-300">{fmtNum(r.afpEmpleado + r.afpPatronal)}</td>
                            <td className="px-4 py-3 text-right bg-green-50/50 dark:bg-green-900/10 text-green-600 dark:text-green-400">{fmtNum(r.sfsEmpleado)}</td>
                            <td className="px-4 py-3 text-right bg-green-50/50 dark:bg-green-900/10 text-green-600 dark:text-green-400">{fmtNum(r.sfsPatronal)}</td>
                            <td className="px-4 py-3 text-right bg-green-50/50 dark:bg-green-900/10 font-semibold text-green-700 dark:text-green-300">{fmtNum(r.sfsEmpleado + r.sfsPatronal)}</td>
                            <td className="px-4 py-3 text-right text-orange-500">{fmtNum(r.srl)}</td>
                            <td className="px-4 py-3 text-right text-purple-600 dark:text-purple-400">{fmtNum(r.isr)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-zinc-50 dark:bg-zinc-800/60 font-semibold border-t-2 border-zinc-200 dark:border-zinc-700">
                        <tr>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">TOTALES</td>
                          <td className="px-4 py-3 text-right">{fmtNum(totales.bruto)}</td>
                          <td className="px-4 py-3 text-right bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400">{fmtNum(totales.afpEmp)}</td>
                          <td className="px-4 py-3 text-right bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400">{fmtNum(totales.afpPat)}</td>
                          <td className="px-4 py-3 text-right bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300">{fmtNum(totales.afpEmp + totales.afpPat)}</td>
                          <td className="px-4 py-3 text-right bg-green-50/50 dark:bg-green-900/10 text-green-600 dark:text-green-400">{fmtNum(totales.sfsEmp)}</td>
                          <td className="px-4 py-3 text-right bg-green-50/50 dark:bg-green-900/10 text-green-600 dark:text-green-400">{fmtNum(totales.sfsPat)}</td>
                          <td className="px-4 py-3 text-right bg-green-50/50 dark:bg-green-900/10 text-green-700 dark:text-green-300">{fmtNum(totales.sfsEmp + totales.sfsPat)}</td>
                          <td className="px-4 py-3 text-right text-orange-500">{fmtNum(totales.srl)}</td>
                          <td className="px-4 py-3 text-right text-purple-600 dark:text-purple-400">{fmtNum(totales.isr)}</td>
                        </tr>
                      </tfoot>
                    </table>
                    {/* Resumen TSS */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
                        <div className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">Total AFP</div>
                        <div className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1">{fmt(totales.afpEmp + totales.afpPat)}</div>
                        <div className="text-xs text-blue-500 dark:text-blue-500 mt-0.5">Emp: {fmt(totales.afpEmp)} · Pat: {fmt(totales.afpPat)}</div>
                      </div>
                      <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-3 text-center">
                        <div className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wider">Total SFS</div>
                        <div className="text-lg font-bold text-green-700 dark:text-green-300 mt-1">{fmt(totales.sfsEmp + totales.sfsPat)}</div>
                        <div className="text-xs text-green-500 dark:text-green-500 mt-0.5">Emp: {fmt(totales.sfsEmp)} · Pat: {fmt(totales.sfsPat)}</div>
                      </div>
                      <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 p-3 text-center">
                        <div className="text-xs text-orange-600 dark:text-orange-400 uppercase tracking-wider">SRL Patronal</div>
                        <div className="text-lg font-bold text-orange-700 dark:text-orange-300 mt-1">{fmt(totales.srl)}</div>
                        <div className="text-xs text-orange-500 mt-0.5">1.20% sobre nómina</div>
                      </div>
                      <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-3 text-center">
                        <div className="text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wider">ISR Retenido (DGII)</div>
                        <div className="text-lg font-bold text-purple-700 dark:text-purple-300 mt-1">{fmt(totales.isr)}</div>
                        <div className="text-xs text-purple-500 mt-0.5">Tabla DGII 2024</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
