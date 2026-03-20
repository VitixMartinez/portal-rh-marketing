"use client";

import { useEffect, useState, useCallback } from "react";

/* ── Constantes TSS (Ley 87-01) ─────────────────────────────────────────── */
const AFP_EMPLEADO = 0.0287;
const SFS_EMPLEADO = 0.0304;
const AFP_PATRONAL = 0.0710;
const SFS_PATRONAL = 0.0709;
const SRL_PATRONAL = 0.0120;

/* ── ISR mensual (tabla DGII 2024) ─────────────────────────────────────── */
function calcularISRMensual(salarioMensual: number): number {
  const anual = salarioMensual * 12;
  let isrAnual = 0;
  if      (anual <= 416220) isrAnual = 0;
  else if (anual <= 624329) isrAnual = (anual - 416220) * 0.15;
  else if (anual <= 867123) isrAnual = 31216 + (anual - 624329) * 0.20;
  else                      isrAnual = 79776 + (anual - 867123) * 0.25;
  return Math.round(isrAnual / 12);
}

type Employee = {
  id: string; firstName: string; lastName: string;
  salary: any; jobTitle: string | null;
  afp: string | null; ars: string | null;
};

type ComisionEmpleado = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  departamento: string | null;
  comisionPorcentaje: number;
  comisionFrecuencia: string;
  entrada: {
    totalVentas: number;
    montoComision: number;
    notas: string | null;
    reporteUrl: string | null;
    reporteNombre: string | null;
  } | null;
};

type NominaRow = {
  employee:         Employee;
  salarioMensual:   number;
  comision:         number;   // commission for this period
  brutoQuincenal:   number;
  afpEmpMensual:    number;
  sfsEmpMensual:    number;
  isrQuincenal:     number;
  afpEmpQ:          number;
  sfsEmpQ:          number;
  cuotaPrestamo:    number;
  totalDescQ:       number;
  netoQuincenal:    number;
  afpPatMensual:    number;
  sfsPatMensual:    number;
  srlMensual:       number;
  afpPatQ:          number;
  sfsPatQ:          number;
  srlQ:             number;
  costoQuincenal:   number;
};

/**
 * calcularFila now accepts an optional commission amount.
 * Commission is added to the bruto, and AFP/SFS/ISR are calculated
 * on the enhanced base (salary + annualized commission), per DR law.
 */
function calcularFila(
  emp: Employee,
  quincena: 1 | 2,
  cuotaPrestamo: number,
  comisionPeriodo: number = 0
): NominaRow {
  const mensual = parseFloat(String(emp.salary ?? 0));

  // Annualize commission for ISR bracket purposes (assume quincenal × 2 = monthly)
  const comisionMensual = comisionPeriodo * 2;
  const baseCalculo     = mensual + comisionMensual;

  const afpEmp = Math.round(baseCalculo * AFP_EMPLEADO);
  const sfsEmp = Math.round(baseCalculo * SFS_EMPLEADO);
  const isr    = calcularISRMensual(baseCalculo);
  const afpPat = Math.round(baseCalculo * AFP_PATRONAL);
  const sfsPat = Math.round(baseCalculo * SFS_PATRONAL);
  const srl    = Math.round(baseCalculo * SRL_PATRONAL);

  const bruto = Math.round(mensual / 2) + comisionPeriodo;
  const isrQ  = Math.round(isr / 2);

  // TSS solo en 2da quincena
  const afpEmpQ = quincena === 2 ? afpEmp : 0;
  const sfsEmpQ = quincena === 2 ? sfsEmp : 0;
  const afpPatQ = quincena === 2 ? afpPat : 0;
  const sfsPatQ = quincena === 2 ? sfsPat : 0;
  const srlQ    = quincena === 2 ? srl : 0;

  const totalDesc = afpEmpQ + sfsEmpQ + isrQ + cuotaPrestamo;
  const neto      = bruto - totalDesc;
  const costo     = bruto + afpPatQ + sfsPatQ + srlQ;

  return {
    employee:       emp,
    salarioMensual: mensual,
    comision:       comisionPeriodo,
    brutoQuincenal: bruto,
    afpEmpMensual:  afpEmp,
    sfsEmpMensual:  sfsEmp,
    isrQuincenal:   isrQ,
    afpEmpQ,
    sfsEmpQ,
    cuotaPrestamo,
    totalDescQ:     totalDesc,
    netoQuincenal:  neto,
    afpPatMensual:  afpPat,
    sfsPatMensual:  sfsPat,
    srlMensual:     srl,
    afpPatQ,
    sfsPatQ,
    srlQ,
    costoQuincenal: costo,
  };
}

const fmt  = (n: number) => `RD$ ${Math.round(n).toLocaleString("es-DO")}`;

const MESES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function periodoStr(mes: string, quincena: 1 | 2) {
  const [y, m] = mes.split("-");
  return `${y}-${m}-${quincena}`;
}

/* ── Ventas y Comisiones panel ──────────────────────────────────────────── */
function ComisionesPanel({
  periodo,
  periodoLabel,
  onUpdate,
}: {
  periodo: string;
  periodoLabel: string;
  onUpdate: (map: Record<string, number>) => void;
}) {
  const [empleados, setEmpleados] = useState<ComisionEmpleado[]>([]);
  const [loading,   setLoading]   = useState(true);
  // Local edit state: employeeId → { totalVentas, comision, notas, reporteUrl, reporteNombre }
  const [edits, setEdits] = useState<Record<string, {
    ventas: string; comision: string; notas: string;
    reporteUrl: string; reporteNombre: string;
  }>>({});
  const [saving,     setSaving]     = useState<Record<string, boolean>>({});
  const [saved,      setSaved]      = useState<Record<string, boolean>>({});
  const [uploading,  setUploading]  = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/comisiones?periodo=${encodeURIComponent(periodo)}`);
      const data = res.ok ? await res.json() : [];
      setEmpleados(Array.isArray(data) ? data : []);

      // Initialize local edit state from existing entries
      const initialEdits: Record<string, { ventas: string; comision: string; notas: string; reporteUrl: string; reporteNombre: string }> = {};
      for (const emp of (Array.isArray(data) ? data : [])) {
        initialEdits[emp.id] = {
          ventas:        String(emp.entrada?.totalVentas ?? ""),
          comision:      String(emp.entrada?.montoComision ?? ""),
          notas:         emp.entrada?.notas ?? "",
          reporteUrl:    emp.entrada?.reporteUrl ?? "",
          reporteNombre: emp.entrada?.reporteNombre ?? "",
        };
      }
      setEdits(initialEdits);

      // Notify parent of current commission map
      const map: Record<string, number> = {};
      for (const emp of (Array.isArray(data) ? data : [])) {
        if (emp.entrada?.montoComision) {
          map[emp.id] = Number(emp.entrada.montoComision);
        }
      }
      onUpdate(map);
    } finally {
      setLoading(false);
    }
  }, [periodo, onUpdate]);

  useEffect(() => { load(); }, [load]);

  function handleVentasChange(empId: string, val: string) {
    const emp = empleados.find(e => e.id === empId);
    const ventas = parseFloat(val) || 0;
    const auto   = emp ? Math.round(ventas * emp.comisionPorcentaje / 100) : 0;
    setEdits(prev => ({
      ...prev,
      [empId]: { ...prev[empId], ventas: val, comision: auto > 0 ? String(auto) : prev[empId]?.comision ?? "" },
    }));
  }

  function handleComisionChange(empId: string, val: string) {
    setEdits(prev => ({ ...prev, [empId]: { ...prev[empId], comision: val } }));
    // Notify parent immediately
    const updated: Record<string, number> = {};
    for (const [id, e] of Object.entries({ ...edits, [empId]: { ...edits[empId], comision: val } })) {
      const v = parseFloat(e.comision) || 0;
      if (v > 0) updated[id] = v;
    }
    onUpdate(updated);
  }

  async function handleReporteUpload(empId: string, file: File) {
    setUploading(u => ({ ...u, [empId]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("context", "comision");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) { const j = await res.json(); alert(j.error ?? "Error al subir"); return; }
      const { url } = await res.json();
      setEdits(prev => ({
        ...prev,
        [empId]: { ...prev[empId], reporteUrl: url, reporteNombre: file.name },
      }));
    } finally {
      setUploading(u => ({ ...u, [empId]: false }));
    }
  }

  async function saveRow(empId: string) {
    setSaving(s => ({ ...s, [empId]: true }));
    try {
      const e = edits[empId] ?? {};
      await fetch("/api/comisiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId:    empId,
          periodo,
          totalVentas:   parseFloat(e.ventas)  || 0,
          montoComision: parseFloat(e.comision) || 0,
          notas:         e.notas || null,
          reporteUrl:    e.reporteUrl || null,
          reporteNombre: e.reporteNombre || null,
        }),
      });
      setSaved(s => ({ ...s, [empId]: true }));
      setTimeout(() => setSaved(s => ({ ...s, [empId]: false })), 2500);

      // Refresh commission map
      const map: Record<string, number> = {};
      for (const [id, ed] of Object.entries(edits)) {
        const v = id === empId ? parseFloat(e.comision) || 0 : parseFloat(ed.comision) || 0;
        if (v > 0) map[id] = v;
      }
      onUpdate(map);
    } finally {
      setSaving(s => ({ ...s, [empId]: false }));
    }
  }

  if (loading) return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6">
      <p className="text-sm text-zinc-500 animate-pulse">Cargando comisiones...</p>
    </div>
  );

  if (empleados.length === 0) return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-8 text-center">
      <div className="text-4xl mb-3">💰</div>
      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Sin empleados con comisión activa</p>
      <p className="text-xs text-zinc-400 mt-1">
        Activa las comisiones en el perfil de empleado → pestaña Compensación.
      </p>
    </div>
  );

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
        <span className="text-xl">💰</span>
        <div>
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Ventas y Comisiones</h3>
          <p className="text-xs text-zinc-400">{periodoLabel}</p>
        </div>
        <span className="ml-auto text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-full px-2.5 py-1">
          {empleados.length} empleado{empleados.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-950/40 text-zinc-500 dark:text-zinc-400 text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Empleado</th>
              <th className="px-4 py-3 text-right">% Comisión</th>
              <th className="px-4 py-3 text-right">Total Ventas (RD$)</th>
              <th className="px-4 py-3 text-right">Comisión a Pagar (RD$)</th>
              <th className="px-4 py-3 text-left">Notas</th>
              <th className="px-4 py-3 text-center">Reporte de ventas</th>
              <th className="px-4 py-3 text-center">Guardar</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map(emp => {
              const edit      = edits[emp.id] ?? { ventas: "", comision: "", notas: "", reporteUrl: "", reporteNombre: "" };
              const isSaving  = saving[emp.id];
              const wasSaved  = saved[emp.id];
              const isUploading = uploading[emp.id];
              return (
                <tr key={emp.id} className="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{emp.firstName} {emp.lastName}</div>
                    <div className="text-xs text-zinc-400">{emp.jobTitle ?? emp.departamento ?? "—"}</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {emp.comisionFrecuencia === "QUINCENAL" ? "Pago quincenal" : "Pago mensual"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {emp.comisionPorcentaje}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={edit.ventas}
                      onChange={e => handleVentasChange(emp.id, e.target.value)}
                      placeholder="0"
                      className="w-32 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={edit.comision}
                        onChange={e => handleComisionChange(emp.id, e.target.value)}
                        placeholder="0"
                        className="w-32 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1.5 text-right text-sm font-medium text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    {edit.ventas && Number(edit.ventas) > 0 && emp.comisionPorcentaje > 0 && (
                      <p className="text-xs text-zinc-400 mt-1 text-right">
                        Auto: {fmt(Number(edit.ventas) * emp.comisionPorcentaje / 100)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={edit.notas}
                      onChange={e => setEdits(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], notas: e.target.value } }))}
                      placeholder="Observaciones..."
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                    />
                  </td>

                  {/* Reporte de ventas (audit trail) */}
                  <td className="px-4 py-3 text-center">
                    {edit.reporteUrl ? (
                      <div className="flex flex-col items-center gap-1">
                        <a
                          href={edit.reporteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline max-w-[120px] truncate"
                          title={edit.reporteNombre}
                        >
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <span className="truncate">{edit.reporteNombre || "Ver reporte"}</span>
                        </a>
                        <label className="text-[10px] text-zinc-400 cursor-pointer hover:text-zinc-600 transition">
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleReporteUpload(emp.id, f); }}
                          />
                          {isUploading ? "Subiendo..." : "Cambiar"}
                        </label>
                      </div>
                    ) : (
                      <label className={`inline-flex flex-col items-center gap-1 cursor-pointer rounded-lg border border-dashed px-3 py-2 transition ${isUploading ? "border-zinc-200 opacity-50" : "border-zinc-300 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"}`}>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
                          disabled={isUploading}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleReporteUpload(emp.id, f); }}
                        />
                        {isUploading ? (
                          <span className="text-xs text-zinc-400">Subiendo...</span>
                        ) : (
                          <>
                            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                            <span className="text-xs text-zinc-400">Importar reporte</span>
                          </>
                        )}
                      </label>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {wasSaved ? (
                      <span className="text-xs text-emerald-600 font-semibold">✓ Guardado</span>
                    ) : (
                      <button
                        onClick={() => saveRow(emp.id)}
                        disabled={isSaving}
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
                      >
                        {isSaving ? "..." : "Guardar"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/30 flex items-start gap-2">
        <span className="text-base leading-none flex-shrink-0">💡</span>
        <p className="text-xs text-zinc-400">
          Las comisiones ingresadas aquí se incluyen automáticamente en la nómina de arriba y están sujetas a AFP, SFS e ISR (Ley 87-01).
          El <strong className="text-zinc-500">reporte de ventas</strong> adjunto sirve como respaldo documental para auditorías — acepta PDF, Excel, CSV e imágenes.
        </p>
      </div>
    </div>
  );
}

export default function NominaPage() {
  const [loading,     setLoading]     = useState(true);
  const [rows,        setRows]        = useState<NominaRow[]>([]);
  const [employees,   setEmployees]   = useState<Employee[]>([]);
  const [loanMap,     setLoanMap]     = useState<Record<string, number>>({});
  const [comisionMap, setComisionMap] = useState<Record<string, number>>({});
  const [view,        setView]        = useState<"empleado" | "patronal">("empleado");
  const [exporting,   setExporting]   = useState(false);
  const [exportMode,  setExportMode]  = useState<"periodo" | "rango">("periodo");
  const [notifying,   setNotifying]   = useState(false);
  const [notifyMsg,   setNotifyMsg]   = useState<string | null>(null);

  const [mes, setMes] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [quincena, setQuincena] = useState<1 | 2>(() =>
    new Date().getDate() <= 15 ? 1 : 2
  );

  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().slice(0, 10));

  // Recalculate rows whenever employees, loanMap, quincena, or comisionMap changes
  useEffect(() => {
    if (!employees.length) return;
    setRows(
      employees.map((e: Employee) =>
        calcularFila(e, quincena, loanMap[e.id] ?? 0, comisionMap[e.id] ?? 0)
      )
    );
  }, [employees, loanMap, quincena, comisionMap]);

  const loadEmployeesAndLoans = useCallback(async () => {
    setLoading(true);
    try {
      const periodo = periodoStr(mes, quincena);
      const [empRes, loanRes] = await Promise.all([
        fetch("/api/employees"),
        fetch(`/api/prestamos?estado=ACTIVO`),
      ]);
      const emps  = await empRes.json();
      const loans = loanRes.ok ? await loanRes.json() : [];

      const activeEmps = (Array.isArray(emps) ? emps : []).filter(
        (e: any) => e.status === "ACTIVO" && e.salary
      );

      const map: Record<string, number> = {};
      for (const loan of loans) {
        const pago = loan.pagos?.find((p: any) => p.periodo === periodo && !p.aplicado);
        if (pago) {
          map[loan.employeeId] = (map[loan.employeeId] ?? 0) + Number(pago.monto);
        }
      }

      setEmployees(activeEmps);
      setLoanMap(map);
    } finally {
      setLoading(false);
    }
  }, [mes, quincena]);

  useEffect(() => { loadEmployeesAndLoans(); }, [loadEmployeesAndLoans]);

  const handleComisionUpdate = useCallback((map: Record<string, number>) => {
    setComisionMap(map);
  }, []);

  /* ── Totals ── */
  const tot = rows.reduce((acc, r) => ({
    mensual:   acc.mensual   + r.salarioMensual,
    bruto:     acc.bruto     + r.brutoQuincenal,
    comision:  acc.comision  + r.comision,
    afpEmp:    acc.afpEmp    + r.afpEmpQ,
    sfsEmp:    acc.sfsEmp    + r.sfsEmpQ,
    isr:       acc.isr       + r.isrQuincenal,
    prestamo:  acc.prestamo  + r.cuotaPrestamo,
    desc:      acc.desc      + r.totalDescQ,
    neto:      acc.neto      + r.netoQuincenal,
    afpPat:    acc.afpPat    + r.afpPatQ,
    sfsPat:    acc.sfsPat    + r.sfsPatQ,
    srl:       acc.srl       + r.srlQ,
    costo:     acc.costo     + r.costoQuincenal,
  }), { mensual: 0, bruto: 0, comision: 0, afpEmp: 0, sfsEmp: 0, isr: 0, prestamo: 0, desc: 0, neto: 0, afpPat: 0, sfsPat: 0, srl: 0, costo: 0 });

  const hasComisiones = rows.some(r => r.comision > 0);

  const [y, m]   = mes.split("-");
  const mesLabel = MESES_ES[parseInt(m) - 1] ?? m;
  const periodoLabel = `${quincena === 1 ? "1ra" : "2da"} Quincena — ${mesLabel} ${y}`;
  const periodo      = periodoStr(mes, quincena);

  async function handleExport() {
    setExporting(true);
    try {
      let url: string;
      let filename: string;
      if (exportMode === "rango") {
        if (!fechaInicio || !fechaFin || fechaInicio > fechaFin) {
          alert("Selecciona un rango de fechas válido.");
          return;
        }
        url = `/api/nomina/export?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
        filename = `nomina_${fechaInicio}_${fechaFin}.xlsx`;
      } else {
        url = `/api/nomina/export?mes=${mes}&quincena=${quincena}`;
        filename = `nomina_${mes}-${quincena}.xlsx`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Error al exportar");
        return;
      }
      const blob    = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a       = document.createElement("a");
      a.href        = blobUrl;
      a.download    = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } finally {
      setExporting(false);
    }
  }

  async function handleNotifyPayroll() {
    if (!confirm(`¿Enviar notificaciones de nómina a todos los empleados para ${periodoLabel}?`)) return;
    setNotifying(true);
    setNotifyMsg(null);
    try {
      const res  = await fetch("/api/nomina/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: periodoLabel, mes }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotifyMsg(`✅ Notificaciones enviadas: ${data.sent} de ${data.total} empleados.`);
      } else {
        setNotifyMsg(`❌ Error: ${data.error}`);
      }
    } catch {
      setNotifyMsg("❌ Error de conexión al enviar notificaciones.");
    } finally {
      setNotifying(false);
    }
  }

  const tssNote = quincena === 1
    ? "1ra Quincena: Solo ISR descontado. AFP y SFS se aplican en la 2da quincena."
    : "2da Quincena: AFP + SFS + ISR descontados (retención mensual completa de TSS).";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nómina</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Cálculo quincenal según legislación dominicana (Ley 87-01 / DGII 2024).
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="month"
            value={mes}
            onChange={e => setMes(e.target.value)}
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden text-sm font-medium">
            <button
              onClick={() => setQuincena(1)}
              className={`px-4 py-2 transition ${quincena === 1 ? "bg-blue-600 text-white" : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50"}`}
            >
              1ra Quincena
            </button>
            <button
              onClick={() => setQuincena(2)}
              className={`px-4 py-2 border-l border-zinc-200 dark:border-zinc-700 transition ${quincena === 2 ? "bg-blue-600 text-white" : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50"}`}
            >
              2da Quincena
            </button>
          </div>
        </div>
      </div>

      {/* Export panel */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Exportar Excel</span>
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden text-xs font-medium">
            <button
              onClick={() => setExportMode("periodo")}
              className={`px-3 py-1.5 transition ${exportMode === "periodo" ? "bg-emerald-600 text-white" : "bg-white dark:bg-zinc-900 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
            >
              Período actual
            </button>
            <button
              onClick={() => setExportMode("rango")}
              className={`px-3 py-1.5 border-l border-zinc-200 dark:border-zinc-700 transition ${exportMode === "rango" ? "bg-emerald-600 text-white" : "bg-white dark:bg-zinc-900 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
            >
              Rango de fechas
            </button>
          </div>
        </div>

        {exportMode === "rango" && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500 whitespace-nowrap">Desde</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500 whitespace-nowrap">Hasta</label>
              <input
                type="date"
                value={fechaFin}
                min={fechaInicio}
                onChange={e => setFechaFin(e.target.value)}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
        )}

        {exportMode === "periodo" && (
          <p className="text-xs text-zinc-400">
            Exportará la nómina del período visible: <strong className="text-zinc-600 dark:text-zinc-300">{periodoLabel}</strong>
          </p>
        )}

        <button
          onClick={handleExport}
          disabled={exporting || loading || (exportMode === "periodo" && rows.length === 0)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium transition w-fit"
        >
          {exporting ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-30" cx="12" cy="12" r="10" stroke="white" strokeWidth="3"/>
              <path fill="white" className="opacity-80" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
          )}
          {exporting ? "Generando..." : exportMode === "rango" ? "Exportar rango consolidado" : "Exportar Excel"}
        </button>
      </div>

      {/* Email notifications panel */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4 flex flex-col gap-3">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Notificar empleados</span>
        <p className="text-xs text-zinc-400">
          Envía un correo con el resumen de nómina a cada empleado activo con email registrado.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleNotifyPayroll}
            disabled={notifying || loading || rows.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition w-fit"
          >
            {notifying ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-30" cx="12" cy="12" r="10" stroke="white" strokeWidth="3"/>
                <path fill="white" className="opacity-80" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            )}
            {notifying ? "Enviando..." : `Enviar notificaciones — ${periodoLabel}`}
          </button>
          {notifyMsg && (
            <span className={`text-sm font-medium ${notifyMsg.startsWith("✅") ? "text-emerald-600" : "text-red-600"}`}>
              {notifyMsg}
            </span>
          )}
        </div>
      </div>

      {/* Period banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-xl px-4 py-3 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">{periodoLabel}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Días: {quincena === 1 ? `1–15 ${mesLabel}` : `16–último día ${mesLabel}`} · {tssNote}
          </p>
        </div>
      </div>

      {/* Tasas TSS */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: "AFP Empleado", value: "2.87%", note: quincena === 1 ? "2da quincena" : "aplicado" },
          { label: "SFS Empleado", value: "3.04%", note: quincena === 1 ? "2da quincena" : "aplicado" },
          { label: "AFP Patronal", value: "7.10%", note: quincena === 1 ? "2da quincena" : "aplicado" },
          { label: "SFS Patronal", value: "7.09%", note: quincena === 1 ? "2da quincena" : "aplicado" },
          { label: "SRL Patronal", value: "1.20%", note: quincena === 1 ? "2da quincena" : "aplicado" },
        ].map(t => (
          <div key={t.label} className={`rounded-xl border bg-white dark:bg-zinc-900/40 px-4 py-3 ${quincena === 1 ? "border-zinc-200 dark:border-zinc-800 opacity-60" : "border-zinc-200 dark:border-zinc-800"}`}>
            <p className="text-xs text-zinc-500">{t.label}</p>
            <p className={`mt-1 text-lg font-semibold ${quincena === 1 ? "text-zinc-400" : "text-blue-500"}`}>{t.value}</p>
            <p className="text-[10px] text-zinc-400">{t.note}</p>
          </div>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Empleados en nómina</p>
          <p className="mt-2 text-3xl font-bold">{rows.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Masa salarial mensual</p>
          <p className="mt-2 text-base font-bold">{fmt(tot.mensual)}</p>
          <p className="text-xs text-zinc-400 mt-0.5">Bruto quincenal: {fmt(tot.bruto)}</p>
        </div>
        {hasComisiones ? (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/10 p-5">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Comisiones este período</p>
            <p className="mt-2 text-base font-bold text-emerald-700 dark:text-emerald-300">{fmt(tot.comision)}</p>
            <p className="text-xs text-emerald-500/60 mt-0.5">Incluidas en neto a pagar</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-blue-900/40 bg-blue-600/10 p-5">
            <p className="text-xs text-blue-400 uppercase tracking-wider">Neto a pagar esta quincena</p>
            <p className="mt-2 text-lg font-bold text-blue-300">{fmt(tot.neto)}</p>
          </div>
        )}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            {hasComisiones ? "Neto total a pagar" : "Costo empresa esta quincena"}
          </p>
          <p className="mt-2 text-base font-bold">
            {hasComisiones ? fmt(tot.neto) : fmt(tot.costo)}
          </p>
          {hasComisiones && (
            <p className="text-xs text-zinc-400 mt-0.5">Costo empresa: {fmt(tot.costo)}</p>
          )}
        </div>
      </div>

      {/* Vista toggle */}
      <div className="flex gap-2">
        <button onClick={() => setView("empleado")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${view === "empleado" ? "bg-blue-600 text-white" : "border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-900"}`}>
          Vista empleado
        </button>
        <button onClick={() => setView("patronal")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${view === "patronal" ? "bg-blue-600 text-white" : "border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-900"}`}>
          Vista patronal
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-500">Cargando...</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-500">No hay empleados activos con salario registrado.</div>
        ) : view === "empleado" ? (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-950/40 text-zinc-500 dark:text-zinc-400 text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Empleado</th>
                <th className="px-4 py-3 text-right">Sal. Mensual</th>
                <th className="px-4 py-3 text-right">Bruto Quincenal</th>
                {hasComisiones && <th className="px-4 py-3 text-right text-emerald-500 dark:text-emerald-400">Comisión</th>}
                <th className={`px-4 py-3 text-right ${quincena === 1 ? "text-zinc-300 dark:text-zinc-600" : ""}`}>AFP (2.87%)</th>
                <th className={`px-4 py-3 text-right ${quincena === 1 ? "text-zinc-300 dark:text-zinc-600" : ""}`}>SFS (3.04%)</th>
                <th className="px-4 py-3 text-right">ISR</th>
                <th className="px-4 py-3 text-right text-amber-500">Préstamo</th>
                <th className="px-4 py-3 text-right">Total Desc.</th>
                <th className="px-4 py-3 text-right text-blue-600 dark:text-blue-300">Neto Quincenal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.employee.id} className="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-zinc-100">{r.employee.firstName} {r.employee.lastName}</div>
                    <div className="text-xs text-zinc-400">{r.employee.jobTitle ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400 text-xs">{fmt(r.salarioMensual)}</td>
                  <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-300 font-medium">
                    {fmt(r.brutoQuincenal)}
                    {r.comision > 0 && (
                      <div className="text-xs text-emerald-500">+{fmt(r.comision)} comisión</div>
                    )}
                  </td>
                  {hasComisiones && (
                    <td className={`px-4 py-3 text-right ${r.comision > 0 ? "text-emerald-500 font-medium" : "text-zinc-300 dark:text-zinc-700"}`}>
                      {r.comision > 0 ? `+${fmt(r.comision)}` : "—"}
                    </td>
                  )}
                  <td className={`px-4 py-3 text-right ${r.afpEmpQ > 0 ? "text-red-400" : "text-zinc-300 dark:text-zinc-700"}`}>
                    {r.afpEmpQ > 0 ? `-${fmt(r.afpEmpQ)}` : "—"}
                  </td>
                  <td className={`px-4 py-3 text-right ${r.sfsEmpQ > 0 ? "text-red-400" : "text-zinc-300 dark:text-zinc-700"}`}>
                    {r.sfsEmpQ > 0 ? `-${fmt(r.sfsEmpQ)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-red-400">-{fmt(r.isrQuincenal)}</td>
                  <td className={`px-4 py-3 text-right ${r.cuotaPrestamo > 0 ? "text-amber-500 font-medium" : "text-zinc-300 dark:text-zinc-700"}`}>
                    {r.cuotaPrestamo > 0 ? `-${fmt(r.cuotaPrestamo)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-red-400">-{fmt(r.totalDescQ)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-600 dark:text-blue-300">{fmt(r.netoQuincenal)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/40 font-semibold text-sm">
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">TOTALES</td>
                <td className="px-4 py-3 text-right text-zinc-400 text-xs">{fmt(tot.mensual)}</td>
                <td className="px-4 py-3 text-right">{fmt(tot.bruto)}</td>
                {hasComisiones && (
                  <td className="px-4 py-3 text-right text-emerald-500">+{fmt(tot.comision)}</td>
                )}
                <td className={`px-4 py-3 text-right ${tot.afpEmp > 0 ? "text-red-400" : "text-zinc-300 dark:text-zinc-700"}`}>
                  {tot.afpEmp > 0 ? `-${fmt(tot.afpEmp)}` : "—"}
                </td>
                <td className={`px-4 py-3 text-right ${tot.sfsEmp > 0 ? "text-red-400" : "text-zinc-300 dark:text-zinc-700"}`}>
                  {tot.sfsEmp > 0 ? `-${fmt(tot.sfsEmp)}` : "—"}
                </td>
                <td className="px-4 py-3 text-right text-red-400">-{fmt(tot.isr)}</td>
                <td className={`px-4 py-3 text-right ${tot.prestamo > 0 ? "text-amber-500" : "text-zinc-300 dark:text-zinc-700"}`}>
                  {tot.prestamo > 0 ? `-${fmt(tot.prestamo)}` : "—"}
                </td>
                <td className="px-4 py-3 text-right text-red-400">-{fmt(tot.desc)}</td>
                <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-300">{fmt(tot.neto)}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-950/40 text-zinc-500 dark:text-zinc-400 text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Empleado</th>
                <th className="px-4 py-3 text-right">Sal. Mensual</th>
                <th className="px-4 py-3 text-right">Bruto Quincenal</th>
                <th className={`px-4 py-3 text-right ${quincena === 1 ? "text-zinc-300 dark:text-zinc-600" : ""}`}>AFP Pat. (7.10%)</th>
                <th className={`px-4 py-3 text-right ${quincena === 1 ? "text-zinc-300 dark:text-zinc-600" : ""}`}>SFS Pat. (7.09%)</th>
                <th className={`px-4 py-3 text-right ${quincena === 1 ? "text-zinc-300 dark:text-zinc-600" : ""}`}>SRL (1.20%)</th>
                <th className="px-4 py-3 text-right text-blue-600 dark:text-blue-300">Costo Empresa</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.employee.id} className="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-zinc-100">{r.employee.firstName} {r.employee.lastName}</div>
                    <div className="text-xs text-zinc-400">{r.employee.jobTitle ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400 text-xs">{fmt(r.salarioMensual)}</td>
                  <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-300 font-medium">
                    {fmt(r.brutoQuincenal)}
                    {r.comision > 0 && (
                      <div className="text-xs text-emerald-500">+{fmt(r.comision)} comisión</div>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right ${r.afpPatQ > 0 ? "text-orange-400" : "text-zinc-300 dark:text-zinc-700"}`}>
                    {r.afpPatQ > 0 ? `+${fmt(r.afpPatQ)}` : "—"}
                  </td>
                  <td className={`px-4 py-3 text-right ${r.sfsPatQ > 0 ? "text-orange-400" : "text-zinc-300 dark:text-zinc-700"}`}>
                    {r.sfsPatQ > 0 ? `+${fmt(r.sfsPatQ)}` : "—"}
                  </td>
                  <td className={`px-4 py-3 text-right ${r.srlQ > 0 ? "text-orange-400" : "text-zinc-300 dark:text-zinc-700"}`}>
                    {r.srlQ > 0 ? `+${fmt(r.srlQ)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-600 dark:text-blue-300">{fmt(r.costoQuincenal)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/40 font-semibold text-sm">
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">TOTALES</td>
                <td className="px-4 py-3 text-right text-zinc-400 text-xs">{fmt(tot.mensual)}</td>
                <td className="px-4 py-3 text-right">{fmt(tot.bruto)}</td>
                <td className={`px-4 py-3 text-right ${tot.afpPat > 0 ? "text-orange-400" : "text-zinc-300 dark:text-zinc-700"}`}>
                  {tot.afpPat > 0 ? `+${fmt(tot.afpPat)}` : "—"}
                </td>
                <td className={`px-4 py-3 text-right ${tot.sfsPat > 0 ? "text-orange-400" : "text-zinc-300 dark:text-zinc-700"}`}>
                  {tot.sfsPat > 0 ? `+${fmt(tot.sfsPat)}` : "—"}
                </td>
                <td className={`px-4 py-3 text-right ${tot.srl > 0 ? "text-orange-400" : "text-zinc-300 dark:text-zinc-700"}`}>
                  {tot.srl > 0 ? `+${fmt(tot.srl)}` : "—"}
                </td>
                <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-300">{fmt(tot.costo)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Ventas y Comisiones panel */}
      <ComisionesPanel
        periodo={periodo}
        periodoLabel={periodoLabel}
        onUpdate={handleComisionUpdate}
      />

      <p className="text-xs text-zinc-500">
        * El salario se almacena como <strong>mensual</strong>. Cada quincena = salario ÷ 2.
        <strong> AFP y SFS se descuentan únicamente en la 2da quincena</strong> (monto mensual completo).
        El ISR se divide en 2 pagos quincenales. Las comisiones se suman al bruto y se incluyen en la base de cálculo de TSS e ISR.
        Tasas según Ley 87-01 y tabla ISR DGII 2024.
      </p>
    </div>
  );
}
