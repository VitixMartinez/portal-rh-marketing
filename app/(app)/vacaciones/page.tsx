"use client";

import { useEffect, useState, useCallback } from "react";
import * as XLSX from "xlsx";

type SolicitudEstado = "PENDIENTE" | "APROBADA" | "RECHAZADA";
type SolicitudTipo   = "VACACIONES" | "PERMISO" | "LICENCIA_MEDICA" | "LICENCIA_MATERNIDAD" | "LICENCIA_PATERNIDAD" | "OTRO";

type Employee = { id: string; firstName: string; lastName: string; jobTitle: string | null };
type Solicitud = {
  id:          string;
  employeeId:  string;
  employee:    { id: string; firstName: string; lastName: string; jobTitle: string | null; department: { name: string } | null };
  tipo:        SolicitudTipo;
  fechaInicio: string;
  fechaFin:    string;
  dias:        number;
  estado:      SolicitudEstado;
  motivo:      string | null;
  notas:       string | null;
  createdAt:   string;
};

const TIPO_LABEL: Record<SolicitudTipo, string> = {
  VACACIONES:          "Vacaciones",
  PERMISO:             "Permiso",
  LICENCIA_MEDICA:     "Licencia Médica",
  LICENCIA_MATERNIDAD: "Licencia Maternidad",
  LICENCIA_PATERNIDAD: "Licencia Paternidad",
  OTRO:                "Otro",
};

const ESTADO_LABEL: Record<SolicitudEstado, string> = {
  PENDIENTE: "Pendiente",
  APROBADA:  "Aprobada",
  RECHAZADA: "Rechazada",
};

const ESTADO_CLASS: Record<SolicitudEstado, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-600/20 dark:text-yellow-200 dark:border-yellow-600/30",
  APROBADA:  "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-600/20 dark:text-blue-200 dark:border-blue-600/30",
  RECHAZADA: "bg-red-100 text-red-700 border border-red-200 dark:bg-red-600/20 dark:text-red-200 dark:border-red-600/30",
};

const EMPTY_FORM = {
  employeeId:  "",
  tipo:        "VACACIONES" as SolicitudTipo,
  fechaInicio: "",
  fechaFin:    "",
  motivo:      "",
};

function calcDias(inicio: string, fin: string): number {
  if (!inicio || !fin) return 0;
  const diff = Math.ceil((new Date(fin).getTime() - new Date(inicio).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(0, diff);
}

const inputClass  = "w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600";
const labelClass  = "block text-xs text-zinc-500 dark:text-zinc-400 mb-1";
const filterClass = "rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600";

export default function VacacionesPage() {
  const [solicitudes,    setSolicitudes]    = useState<Solicitud[]>([]);
  const [employees,      setEmployees]      = useState<Employee[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [panelOpen,      setPanelOpen]      = useState(false);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [saving,         setSaving]         = useState(false);
  const [notas,          setNotas]          = useState("");
  const [approveId,      setApproveId]      = useState<string | null>(null);

  // Filters
  const [filtroEmpleado, setFiltroEmpleado] = useState("");
  const [filtroEstado,   setFiltroEstado]   = useState("");
  const [filtroTipo,     setFiltroTipo]     = useState("");
  const [filtroDesde,    setFiltroDesde]    = useState("");
  const [filtroHasta,    setFiltroHasta]    = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [solRes, empRes] = await Promise.all([
        fetch("/api/vacaciones"),
        fetch("/api/employees"),
      ]);
      setSolicitudes(solRes.ok ? await solRes.json() : []);
      setEmployees(empRes.ok   ? await empRes.json() : []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Apply filters
  const filtered = solicitudes.filter(s => {
    const empMatch   = !filtroEmpleado || s.employeeId === filtroEmpleado;
    const statMatch  = !filtroEstado   || s.estado === filtroEstado;
    const tipoMatch  = !filtroTipo     || s.tipo === filtroTipo;
    const desdeMatch = !filtroDesde    || new Date(s.fechaInicio) >= new Date(filtroDesde);
    const hastaMatch = !filtroHasta    || new Date(s.fechaInicio) <= new Date(filtroHasta);
    return empMatch && statMatch && tipoMatch && desdeMatch && hastaMatch;
  });

  const hasFilter = !!(filtroEmpleado || filtroEstado || filtroTipo || filtroDesde || filtroHasta);
  const today = new Date().toISOString().split("T")[0];

  const dias = calcDias(form.fechaInicio, form.fechaFin);

  const f = (key: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/vacaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, dias }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      await load();
      setPanelOpen(false);
      setForm(EMPTY_FORM);
    } catch { alert("Error al guardar la solicitud"); }
    finally { setSaving(false); }
  }

  async function cambiarEstado(id: string, estado: SolicitudEstado) {
    try {
      await fetch(`/api/vacaciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado, notas }),
      });
      setApproveId(null);
      setNotas("");
      await load();
    } catch { alert("Error al actualizar"); }
  }

  // KPIs from full dataset
  const pendientes = solicitudes.filter(s => s.estado === "PENDIENTE").length;
  const aprobadas  = solicitudes.filter(s => s.estado === "APROBADA").length;
  const totalDias  = solicitudes.filter(s => s.estado === "APROBADA").reduce((a, s) => a + s.dias, 0);

  // ── Excel export ─────────────────────────────────────────────────────────
  function exportarExcel() {
    const rows = filtered.map(s => ({
      "Empleado":     `${s.employee.firstName} ${s.employee.lastName}`,
      "Puesto":       s.employee.jobTitle ?? "",
      "Departamento": s.employee.department?.name ?? "",
      "Tipo":         TIPO_LABEL[s.tipo],
      "Estado":       ESTADO_LABEL[s.estado],
      "Fecha Inicio": new Date(s.fechaInicio).toLocaleDateString("es-DO"),
      "Fecha Fin":    new Date(s.fechaFin).toLocaleDateString("es-DO"),
      "Días":         s.dias,
      "Motivo":       s.motivo ?? "",
      "Notas":        s.notas ?? "",
      "Solicitado":   new Date(s.createdAt).toLocaleDateString("es-DO"),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 24 }, { wch: 22 }, { wch: 18 }, { wch: 20 },
      { wch: 12 }, { wch: 13 }, { wch: 12 }, { wch: 6 },
      { wch: 28 }, { wch: 28 }, { wch: 13 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vacaciones");
    XLSX.writeFile(wb, `Vacaciones_${new Date().toISOString().slice(0, 7)}.xlsx`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vacaciones & Permisos</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Control de solicitudes según la Ley Laboral Dominicana (14 días/año).</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={exportarExcel}
            className="flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600/10 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600/20 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Exportar Excel{hasFilter ? " (filtrado)" : ""}
          </button>
          <button onClick={() => { setForm(EMPTY_FORM); setPanelOpen(true); }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition">
            + Nueva solicitud
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-yellow-900/40 bg-yellow-600/10 p-5">
          <p className="text-xs text-yellow-400 uppercase tracking-wider">Pendientes</p>
          <p className="mt-2 text-3xl font-bold text-yellow-300">{pendientes}</p>
          <p className="mt-1 text-xs text-zinc-500">por aprobar</p>
        </div>
        <div className="rounded-2xl border border-blue-900/40 bg-blue-600/10 p-5">
          <p className="text-xs text-blue-400 uppercase tracking-wider">Aprobadas</p>
          <p className="mt-2 text-3xl font-bold text-blue-300">{aprobadas}</p>
          <p className="mt-1 text-xs text-zinc-500">este período</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Días aprobados</p>
          <p className="mt-2 text-3xl font-bold">{totalDias}</p>
          <p className="mt-1 text-xs text-zinc-500">días calendario</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-end rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Empleado</label>
          <select value={filtroEmpleado} onChange={e => setFiltroEmpleado(e.target.value)} className={filterClass}>
            <option value="">Todos los empleados</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Estado</label>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className={filterClass}>
            <option value="">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="APROBADA">Aprobada</option>
            <option value="RECHAZADA">Rechazada</option>
          </select>
        </div>
        <div className="min-w-[170px]">
          <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Tipo</label>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className={filterClass}>
            <option value="">Todos los tipos</option>
            {(Object.entries(TIPO_LABEL) as [SolicitudTipo, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Desde</label>
          <input type="date" value={filtroDesde} max={filtroHasta || today}
            onChange={e => setFiltroDesde(e.target.value)} className={filterClass} />
        </div>
        <div className="min-w-[140px]">
          <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Hasta</label>
          <input type="date" value={filtroHasta} min={filtroDesde} max={today}
            onChange={e => setFiltroHasta(e.target.value)} className={filterClass} />
        </div>
        {hasFilter && (
          <button onClick={() => { setFiltroEmpleado(""); setFiltroEstado(""); setFiltroTipo(""); setFiltroDesde(""); setFiltroHasta(""); }}
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline py-2 transition">
            Limpiar filtros
          </button>
        )}
        {hasFilter && (
          <span className="text-xs text-zinc-400 py-2">
            {filtered.length} de {solicitudes.length} registros
          </span>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-500">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-500">
            {hasFilter ? "No hay solicitudes que coincidan con los filtros." : "No hay solicitudes."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-white dark:bg-zinc-950/40 text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Empleado</th>
                <th className="px-4 py-3 text-left font-medium">Tipo</th>
                <th className="px-4 py-3 text-left font-medium">Desde</th>
                <th className="px-4 py-3 text-left font-medium">Hasta</th>
                <th className="px-4 py-3 text-center font-medium">Días</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-left font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-t border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.employee.firstName} {s.employee.lastName}</div>
                    <div className="text-xs text-zinc-500">{s.employee.jobTitle ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{TIPO_LABEL[s.tipo]}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                    {new Date(s.fechaInicio).toLocaleDateString("es-DO")}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                    {new Date(s.fechaFin).toLocaleDateString("es-DO")}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">{s.dias}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${ESTADO_CLASS[s.estado]}`}>
                      {ESTADO_LABEL[s.estado]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {s.estado === "PENDIENTE" && (
                      <div className="flex gap-2">
                        <button onClick={() => cambiarEstado(s.id, "APROBADA")}
                          className="rounded px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition font-medium">
                          Aprobar
                        </button>
                        <button onClick={() => cambiarEstado(s.id, "RECHAZADA")}
                          className="rounded px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition font-medium">
                          Rechazar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        * Código de Trabajo RD: 14 días/año (1er año), 18 días (5+ años), 21 días (10+ años).
      </p>

      {/* Panel lateral */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${panelOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div onClick={() => setPanelOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className={`fixed right-0 top-0 h-screen w-full max-w-md bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 flex flex-col transform transition-transform duration-300 ${panelOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <h2 className="text-lg font-semibold">Nueva solicitud</h2>
          </div>
          <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className={labelClass}>Empleado *</label>
                <select required value={form.employeeId} onChange={f("employeeId")} className={inputClass}>
                  <option value="">Seleccionar empleado</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Tipo de solicitud</label>
                <select value={form.tipo} onChange={f("tipo")} className={inputClass}>
                  <option value="VACACIONES">Vacaciones</option>
                  <option value="PERMISO">Permiso</option>
                  <option value="LICENCIA_MEDICA">Licencia Médica</option>
                  <option value="LICENCIA_MATERNIDAD">Licencia Maternidad</option>
                  <option value="LICENCIA_PATERNIDAD">Licencia Paternidad</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Fecha inicio *</label>
                  <input required type="date" value={form.fechaInicio} onChange={f("fechaInicio")} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Fecha fin *</label>
                  <input required type="date" value={form.fechaFin} onChange={f("fechaFin")} className={inputClass} />
                </div>
              </div>
              {dias > 0 && (
                <div className="rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-600/10 px-4 py-3 text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Total: <strong>{dias} día{dias !== 1 ? "s" : ""}</strong> calendario
                </div>
              )}
              <div>
                <label className={labelClass}>Motivo / Notas</label>
                <textarea value={form.motivo} onChange={f("motivo")} rows={3} className={inputClass} placeholder="Descripción opcional..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0 flex justify-end gap-3">
              <button type="button" onClick={() => setPanelOpen(false)}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50 transition">
                {saving ? "Guardando..." : "Crear solicitud"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
