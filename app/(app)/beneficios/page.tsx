"use client";

import { useState, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";

/* ── Types ─────────────────────────────────────────────────────────────────── */
type RegaliaRow = {
  empId: string; nombre: string; puesto: string; departamento: string;
  salMensual: number; hireDate: string | null; meses: number;
  montoCalc: number; monto: number; topado: boolean; exentoISR: boolean;
};
type BonifRow = {
  empId: string; nombre: string; puesto: string; departamento: string;
  salMensual: number; hireDate: string | null; anios: number;
  topeDias: number; topeMonto: number; montoBase: number;
  monto: number; topado: boolean; isrEstimado: number;
};

const fmt = (n: number) => `RD$ ${Math.round(n).toLocaleString("es-DO")}`;
const fmtN = (n: number) => Math.round(n).toLocaleString("es-DO");

/* ═══════════════════════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════════════════════ */
export default function BeneficiosPage() {
  const [tab, setTab] = useState<"regalia" | "bonificacion">("regalia");
  const currentYear = new Date().getFullYear();
  const [anio, setAnio] = useState(currentYear);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Beneficios Anuales</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Regalía Pascual y Bonificación según Código de Trabajo dominicano.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500 font-medium">Año fiscal</label>
          <select
            value={anio}
            onChange={e => setAnio(parseInt(e.target.value))}
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Legal notice */}
      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-4 py-3">
        <p className="text-xs text-amber-800 dark:text-amber-200 font-medium flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v18M3 9l9-6 9 6"/><path d="M5 9l-2 5a5 5 0 0010 0L11 9"/><path d="M13 9l-2 5a5 5 0 0010 0L19 9"/><line x1="5" y1="21" x2="19" y2="21"/>
          </svg>
          Marco legal — Código de Trabajo de la República Dominicana:
          <span className="font-normal ml-1">
            Art. 219-222 (Regalía Pascual / Salario de Navidad) · Art. 223-227 (Bonificación / Participación en Beneficios)
          </span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {[
          { id: "regalia" as const, label: "Regalía Pascual", sub: "Art. 219-222", icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
            </svg>
          )},
          { id: "bonificacion" as const, label: "Bonificación Anual", sub: "Art. 223-227", icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          )},
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              "px-5 py-3 text-sm font-medium border-b-2 transition flex flex-col items-start",
              tab === t.id
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
            ].join(" ")}
          >
            <span className="flex items-center gap-1.5">{t.icon}{t.label}</span>
            <span className="text-[10px] font-normal text-zinc-400 mt-0.5">{t.sub}</span>
          </button>
        ))}
      </div>

      {tab === "regalia"       && <TabRegalia anio={anio} />}
      {tab === "bonificacion"  && <TabBonificacion anio={anio} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Tab: Regalía Pascual
═══════════════════════════════════════════════════════════════════════════ */
function TabRegalia({ anio }: { anio: number }) {
  const [loading,    setLoading]    = useState(false);
  const [rows,       setRows]       = useState<RegaliaRow[]>([]);
  const [total,      setTotal]      = useState(0);
  const [tope,       setTope]       = useState(0);
  const [salMin,     setSalMin]     = useState(0);
  const [exporting,  setExporting]  = useState(false);
  const [error,      setError]      = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch(`/api/beneficios?tipo=regalia&anio=${anio}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setTope(data.tope ?? 0);
      setSalMin(data.salarioMinimo ?? 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [anio]);

  useEffect(() => { load(); }, [load]);

  function handleExport() {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        [`Regalía Pascual ${anio} — Portal RH`],
        [`Art. 219-222 Código de Trabajo · Salario Mínimo: RD$ ${fmtN(salMin)} · Tope (5x sal. mín.): RD$ ${fmtN(tope)}`],
        [`Fecha límite de pago: 20 de diciembre ${anio} · EXENTO de ISR`],
        [],
        ["Empleado","Puesto","Departamento","Sal. Mensual (RD$)","Meses Trabajados","Monto Calculado (RD$)","Monto a Pagar (RD$)","Topado","ISR"],
        ...rows.map(r => [r.nombre, r.puesto, r.departamento,
          r.salMensual, r.meses, r.montoCalc, r.monto,
          r.topado ? "SÍ (tope 5x sal.mín.)" : "NO", "EXENTO"]),
        [],
        ["TOTAL","","","","",
          rows.reduce((s,r)=>s+r.montoCalc,0),
          total, "", ""],
      ]);
      ws["!cols"] = [{wch:28},{wch:22},{wch:18},{wch:16},{wch:16},{wch:20},{wch:20},{wch:14},{wch:10}];
      ws["!merges"] = [{s:{r:0,c:0},e:{r:0,c:8}},{s:{r:1,c:0},e:{r:1,c:8}},{s:{r:2,c:0},e:{r:2,c:8}}];
      XLSX.utils.book_append_sheet(wb, ws, `Regalía Pascual ${anio}`);
      const buf      = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
      const blob     = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement("a");
      a.href         = url;
      a.download     = `regalia_pascual_${anio}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const topados = rows.filter(r => r.topado).length;

  return (
    <div className="space-y-5">
      {/* Info cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard label="Fórmula" value="Salario mensual ÷ 12" sub="× meses trabajados en el año" color="blue" />
        <InfoCard label="Fecha límite" value="20 de diciembre" sub={`${anio}`} color="amber" />
        <InfoCard label="Tope legal" value={fmt(tope)} sub={`5 × sal. mínimo (RD$ ${fmtN(salMin)})`} color="zinc" />
        <InfoCard label="Tributación" value="EXENTO de ISR" sub="Art. 222 Cód. Trabajo + Art. 299 Cód. Tributario" color="emerald" />
      </div>

      {/* Alert: December reminder */}
      {new Date().getMonth() === 10 && ( // November warning
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-4 py-3 flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Recordatorio:</strong> La Regalía Pascual debe pagarse a más tardar el <strong>20 de diciembre {anio}</strong>.
          </p>
        </div>
      )}
      {new Date().getMonth() === 11 && ( // December urgency
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-4 py-3 flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
          <p className="text-sm text-red-800 dark:text-red-200">
            <strong>¡Mes de pago!</strong> Estamos en diciembre — el pago debe realizarse antes del <strong>20 de diciembre {anio}</strong>.
          </p>
        </div>
      )}

      {/* Totals bar */}
      {!loading && rows.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 px-5 py-3 flex-wrap">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-xs text-blue-500 font-medium uppercase tracking-wider">Total a pagar</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{fmt(total)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Empleados</p>
              <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">{rows.length}</p>
            </div>
            {topados > 0 && (
              <div>
                <p className="text-xs text-amber-600">Topados (5× sal.mín.)</p>
                <p className="text-lg font-semibold text-amber-600">{topados}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
            Exportar Excel
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-sm text-zinc-500">Calculando...</div>
      ) : error ? (
        <div className="py-8 text-center text-sm text-red-500">{error}</div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-400">No hay empleados activos con salario registrado.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-950/40 text-xs text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left">Empleado</th>
                <th className="px-4 py-3 text-left">Departamento</th>
                <th className="px-4 py-3 text-right">Sal. Mensual</th>
                <th className="px-4 py-3 text-center">Meses {anio}</th>
                <th className="px-4 py-3 text-right">Monto Calculado</th>
                <th className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">A Pagar</th>
                <th className="px-4 py-3 text-center">ISR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.empId} className="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-zinc-100">{r.nombre}</p>
                    <p className="text-xs text-zinc-400">{r.puesto}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{r.departamento}</td>
                  <td className="px-4 py-3 text-right text-zinc-400 text-xs">{fmt(r.salMensual)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${r.meses === 12 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}>
                      {r.meses} {r.meses === 1 ? "mes" : "meses"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-500">{fmt(r.montoCalc)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-600 dark:text-blue-300">
                    {fmt(r.monto)}
                    {r.topado && <span className="ml-1 text-[10px] text-amber-500 font-normal">(topado)</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">EXENTO</span>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/40 font-semibold">
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">TOTALES</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right text-zinc-400 text-xs">{fmt(rows.reduce((s,r)=>s+r.salMensual,0))}</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right text-zinc-500">{fmt(rows.reduce((s,r)=>s+r.montoCalc,0))}</td>
                <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-300">{fmt(total)}</td>
                <td className="px-4 py-3"></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-zinc-400">
        * <strong>Regalía Pascual</strong> = Suma del salario ordinario devengado en el año ÷ 12. No incluye horas extras ni participación en beneficios.
        Si el empleado trabajó menos de 12 meses en el año, el monto es proporcional al tiempo trabajado.
        Tope: 5 salarios mínimos. <strong>Completamente exento de ISR.</strong> — Art. 219-222 Código de Trabajo.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Tab: Bonificación Anual
═══════════════════════════════════════════════════════════════════════════ */
function TabBonificacion({ anio }: { anio: number }) {
  const [loading,     setLoading]     = useState(false);
  const [rows,        setRows]        = useState<BonifRow[]>([]);
  const [fondoTotal,  setFondoTotal]  = useState(0);
  const [totalDist,   setTotalDist]   = useState(0);
  const [totalISR,    setTotalISR]    = useState(0);
  const [utilidades,  setUtilidades]  = useState("");
  const [exporting,   setExporting]   = useState(false);
  const [error,       setError]       = useState("");
  const [calculated,  setCalculated]  = useState(false);

  async function handleCalcular() {
    const util = parseFloat(utilidades.replace(/,/g, ""));
    if (!util || util < 0) { setError("Ingresa las utilidades netas del año."); return; }
    setLoading(true); setError(""); setCalculated(false);
    try {
      const res  = await fetch(`/api/beneficios?tipo=bonificacion&anio=${anio}&utilidades=${util}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRows(data.rows ?? []);
      setFondoTotal(data.fondoTotal ?? 0);
      setTotalDist(data.totalDistribuido ?? 0);
      setTotalISR(data.totalISR ?? 0);
      setCalculated(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    if (!calculated || rows.length === 0) return;
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        [`Bonificación Anual ${anio} — Portal RH`],
        [`Art. 223-227 Código de Trabajo · 10% Utilidades Netas · Fondo: RD$ ${fmtN(fondoTotal)}`],
        [`Tope: 45 días (< 3 años) / 60 días (≥ 3 años) · ISR puede aplicar`],
        [],
        ["Empleado","Puesto","Departamento","Sal. Mensual (RD$)","Antigüedad (años)","Tope (días)","Tope Monto (RD$)","Monto a Pagar (RD$)","Topado","ISR Estimado (RD$)"],
        ...rows.map(r => [r.nombre, r.puesto, r.departamento,
          r.salMensual, r.anios, r.topeDias, r.topeMonto, r.monto,
          r.topado ? "SÍ" : "NO", r.isrEstimado]),
        [],
        ["TOTAL","","","","","","",totalDist,"",totalISR],
      ]);
      ws["!cols"] = [{wch:28},{wch:22},{wch:18},{wch:16},{wch:16},{wch:12},{wch:18},{wch:18},{wch:10},{wch:18}];
      ws["!merges"] = [{s:{r:0,c:0},e:{r:0,c:9}},{s:{r:1,c:0},e:{r:1,c:9}},{s:{r:2,c:0},e:{r:2,c:9}}];
      XLSX.utils.book_append_sheet(wb, ws, `Bonificación ${anio}`);
      const buf  = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `bonificacion_${anio}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const topados = rows.filter(r => r.topado).length;

  return (
    <div className="space-y-5">
      {/* Info cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard label="Base de cálculo" value="10% utilidades netas" sub="Distribuido proporcional al salario" color="blue" />
        <InfoCard label="Plazo de pago" value="90–120 días" sub="Después del cierre fiscal" color="amber" />
        <InfoCard
          label="Tope por empleado"
          value="45 ó 60 días"
          sub="< 3 años: 45 días · ≥ 3 años: 60 días"
          color="zinc"
        />
        <InfoCard label="Tributación" value="ISR puede aplicar" sub="Si salario + bonif. excede exención anual" color="orange" />
      </div>

      {/* Input utilidades */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-3">Calcular bonificación para {anio}</p>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-52">
            <label className="block text-xs text-zinc-500 mb-1">Utilidades netas de la empresa en {anio} (RD$) *</label>
            <input
              type="text"
              value={utilidades}
              onChange={e => setUtilidades(e.target.value)}
              placeholder="5,000,000"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              onKeyDown={e => e.key === "Enter" && handleCalcular()}
            />
            <p className="text-[10px] text-zinc-400 mt-1">El 10% de este monto se distribuirá entre los empleados (Art. 223).</p>
          </div>
          <button
            onClick={handleCalcular}
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition"
          >
            {loading ? "Calculando..." : "Calcular"}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

        {calculated && (
          <div className="mt-4 flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-xs text-zinc-500">Fondo 10% utilidades</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-300">{fmt(fondoTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Total distribuido</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-300">{fmt(totalDist)}</p>
            </div>
            {totalISR > 0 && (
              <div>
                <p className="text-xs text-orange-500">ISR adicional estimado</p>
                <p className="text-lg font-bold text-orange-500">{fmt(totalISR)}</p>
              </div>
            )}
            {topados > 0 && (
              <div>
                <p className="text-xs text-amber-600">Empleados topados</p>
                <p className="text-lg font-bold text-amber-600">{topados}</p>
              </div>
            )}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              </svg>
              Exportar Excel
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {calculated && rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-950/40 text-xs text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left">Empleado</th>
                <th className="px-4 py-3 text-left">Depto.</th>
                <th className="px-4 py-3 text-right">Sal. Mensual</th>
                <th className="px-4 py-3 text-center">Antigüedad</th>
                <th className="px-4 py-3 text-center">Tope</th>
                <th className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">Bonificación</th>
                <th className="px-4 py-3 text-right text-orange-500">ISR est.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.empId} className="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-zinc-100">{r.nombre}</p>
                    <p className="text-xs text-zinc-400">{r.puesto}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{r.departamento}</td>
                  <td className="px-4 py-3 text-right text-zinc-400 text-xs">{fmt(r.salMensual)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.anios >= 3 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                      {r.anios} {r.anios === 1 ? "año" : "años"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium ${r.anios >= 3 ? "text-blue-600 dark:text-blue-400" : "text-zinc-500"}`}>
                      {r.topeDias} días
                      <span className="ml-1 text-zinc-400 font-normal">({fmt(r.topeMonto)})</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-600 dark:text-blue-300">
                    {fmt(r.monto)}
                    {r.topado && <span className="ml-1 text-[10px] text-amber-500 font-normal">(topado)</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.isrEstimado > 0
                      ? <span className="text-orange-500 font-medium">{fmt(r.isrEstimado)}</span>
                      : <span className="text-emerald-600 text-xs">EXENTO</span>
                    }
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/40 font-semibold">
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">TOTALES</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right text-zinc-400 text-xs">{fmt(rows.reduce((s,r)=>s+r.salMensual,0))}</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-300">{fmt(totalDist)}</td>
                <td className="px-4 py-3 text-right text-orange-500">{totalISR > 0 ? fmt(totalISR) : "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-zinc-400">
        * <strong>Bonificación Anual</strong>: El empleador debe otorgar el equivalente al 10% de las utilidades o beneficios netos anuales.
        La participación individual no excede de <strong>45 días de salario</strong> para empleados con menos de 3 años, ni de <strong>60 días</strong> para los de 3 o más años.
        El pago debe realizarse entre <strong>90 y 120 días después del cierre fiscal</strong>.
        ISR aplica si el salario anual más la bonificación excede el umbral de exención. — Art. 223-227 Código de Trabajo.
      </p>
    </div>
  );
}

/* ── Shared InfoCard ────────────────────────────────────────────────────────── */
function InfoCard({ label, value, sub, color }: {
  label: string; value: string; sub: string;
  color: "blue" | "amber" | "zinc" | "emerald" | "orange";
}) {
  const colors = {
    blue:    "border-blue-100 dark:border-blue-800/40 bg-blue-50/60 dark:bg-blue-900/10",
    amber:   "border-amber-100 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-900/10",
    zinc:    "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40",
    emerald: "border-emerald-100 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-900/10",
    orange:  "border-orange-100 dark:border-orange-800/40 bg-orange-50/60 dark:bg-orange-900/10",
  };
  const valColors = {
    blue:    "text-blue-700 dark:text-blue-300",
    amber:   "text-amber-700 dark:text-amber-300",
    zinc:    "text-zinc-700 dark:text-zinc-200",
    emerald: "text-emerald-700 dark:text-emerald-300",
    orange:  "text-orange-700 dark:text-orange-300",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{label}</p>
      <p className={`text-base font-bold mt-1 ${valColors[color]}`}>{value}</p>
      <p className="text-[11px] text-zinc-400 mt-0.5 leading-tight">{sub}</p>
    </div>
  );
}
