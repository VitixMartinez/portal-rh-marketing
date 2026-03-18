"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";

type AsistenciaEstado = "PRESENTE" | "AUSENTE" | "TARDANZA" | "PERMISO" | "FERIADO" | "MEDIO_DIA";

// ─── Absence codes per Dominican Labor Law (Ley 16-92) ──────────────────────
export const AUSENCIA_CODES: { code: string; label: string; color: string; bg: string; ley?: string }[] = [
  { code: "V",  label: "Vacaciones",            color: "text-emerald-700 dark:text-emerald-300",  bg: "bg-emerald-100 dark:bg-emerald-700/30",  ley: "Art. 177 – 14 días hábiles/año" },
  { code: "E",  label: "Enfermedad",             color: "text-blue-700 dark:text-blue-300",        bg: "bg-blue-100 dark:bg-blue-700/30" },
  { code: "M",  label: "Maternidad",             color: "text-pink-700 dark:text-pink-300",        bg: "bg-pink-100 dark:bg-pink-700/30",        ley: "Art. 236 – 14 semanas" },
  { code: "P",  label: "Paternidad",             color: "text-indigo-700 dark:text-indigo-300",    bg: "bg-indigo-100 dark:bg-indigo-700/30",    ley: "Art. 54 – 2 días hábiles" },
  { code: "N",  label: "Nacimiento de hijo",     color: "text-cyan-700 dark:text-cyan-300",        bg: "bg-cyan-100 dark:bg-cyan-700/30",        ley: "Art. 54 – 2 días hábiles (padre)" },
  { code: "C",  label: "Matrimonio",             color: "text-violet-700 dark:text-violet-300",    bg: "bg-violet-100 dark:bg-violet-700/30",    ley: "Art. 54 – 5 días con goce" },
  { code: "D",  label: "Duelo / Fallecimiento",  color: "text-zinc-700 dark:text-zinc-300",        bg: "bg-zinc-100 dark:bg-zinc-700/30",        ley: "Art. 54 – 3 días por fallecimiento" },
  { code: "SG", label: "Sin goce de sueldo",     color: "text-orange-700 dark:text-orange-300",    bg: "bg-orange-100 dark:bg-orange-700/30" },
  { code: "LT", label: "Lactancia",              color: "text-rose-700 dark:text-rose-300",        bg: "bg-rose-100 dark:bg-rose-700/30",        ley: "Art. 241 – 2 descansos de 20 min" },
  { code: "AU", label: "Ausencia sin justificar",color: "text-red-700 dark:text-red-300",          bg: "bg-red-100 dark:bg-red-700/30" },
];

export const AUSENCIA_MAP = Object.fromEntries(AUSENCIA_CODES.map(c => [c.code, c]));

type Employee = { id: string; firstName: string; lastName: string; jobTitle: string | null };
type AdjuntoItem = { url: string; nombre: string };
type Asistencia = {
  id:           string;
  employeeId:   string;
  employee:     Employee;
  fecha:        string;
  horaEntrada:  string | null;
  horaSalida:   string | null;
  estado:       AsistenciaEstado;
  notas:        string | null;
  ausenciaCode: string | null;
  adjuntos:     AdjuntoItem[];
};

const ESTADO_LABEL: Record<AsistenciaEstado, string> = {
  PRESENTE:  "Presente",
  AUSENTE:   "Ausente",
  TARDANZA:  "Tardanza",
  PERMISO:   "Permiso",
  FERIADO:   "Feriado",
  MEDIO_DIA: "Medio día",
};

const ESTADO_CLASS: Record<AsistenciaEstado, string> = {
  PRESENTE:  "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-600/20 dark:text-blue-200 dark:border-blue-600/30",
  AUSENTE:   "bg-red-100 text-red-700 border border-red-200 dark:bg-red-600/20 dark:text-red-200 dark:border-red-600/30",
  TARDANZA:  "bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-600/20 dark:text-yellow-200 dark:border-yellow-600/30",
  PERMISO:   "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-600/20 dark:text-purple-200 dark:border-purple-600/30",
  FERIADO:   "bg-zinc-600/40 text-zinc-600 dark:text-zinc-300 border border-zinc-600",
  MEDIO_DIA: "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-600/20 dark:text-orange-200 dark:border-orange-600/30",
};

const inputClass = "w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600";
const labelClass = "block text-xs text-zinc-500 dark:text-zinc-400 mb-1";
const filterClass = "rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600";

const NEEDS_CODE: AsistenciaEstado[] = ["AUSENTE", "PERMISO", "MEDIO_DIA", "TARDANZA"];

function hoy(): string { return new Date().toISOString().slice(0, 10); }
function mesFmt(fecha: string): string { const [y, m] = fecha.split("-"); return `${y}-${m}`; }

export default function AsistenciaPage() {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [employees,   setEmployees]   = useState<Employee[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [mes,         setMes]         = useState(mesFmt(hoy()));
  const [panelOpen,   setPanelOpen]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [filtroEmpleado, setFiltroEmpleado] = useState("");
  const [filtroEstado,   setFiltroEstado]   = useState("");
  const [filtroCodigo,   setFiltroCodigo]   = useState("");

  const [form, setForm] = useState({
    employeeId:   "",
    fecha:        hoy(),
    estado:       "PRESENTE" as AsistenciaEstado,
    horaEntrada:  "08:00",
    horaSalida:   "17:00",
    notas:        "",
    ausenciaCode: "",
    adjuntos:     [] as AdjuntoItem[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [asRes, empRes] = await Promise.all([
        fetch(`/api/asistencia?mes=${mes}`),
        fetch("/api/employees"),
      ]);
      const asData  = await asRes.json();
      const empData = await empRes.json();
      setAsistencias(Array.isArray(asData)  ? asData  : []);
      setEmployees(Array.isArray(empData) ? empData : []);
    } finally { setLoading(false); }
  }, [mes]);

  useEffect(() => { load(); }, [load]);

  // Apply filters
  const filtered = asistencias.filter(a => {
    const empMatch    = !filtroEmpleado || a.employeeId === filtroEmpleado;
    const estadoMatch = !filtroEstado   || a.estado === filtroEstado;
    const codigoMatch = !filtroCodigo   || a.ausenciaCode === filtroCodigo;
    return empMatch && estadoMatch && codigoMatch;
  });

  // Group filtered records by date
  const porFecha = filtered.reduce((acc, a) => {
    const key = a.fecha.slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {} as Record<string, Asistencia[]>);
  const fechas = Object.keys(porFecha).sort().reverse();

  // KPIs from full dataset (not filtered)
  const total     = asistencias.length;
  const presentes = asistencias.filter(a => a.estado === "PRESENTE").length;
  const ausentes  = asistencias.filter(a => a.estado === "AUSENTE").length;
  const tardanzas = asistencias.filter(a => a.estado === "TARDANZA").length;

  const f = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  const showCodeFields = NEEDS_CODE.includes(form.estado);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const nuevos: AdjuntoItem[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (res.ok) {
          const data = await res.json();
          nuevos.push({ url: data.url, nombre: file.name });
        }
      }
      setForm(prev => ({ ...prev, adjuntos: [...prev.adjuntos, ...nuevos] }));
    } catch { alert("Error al subir archivo"); }
    finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeAdjunto(idx: number) {
    setForm(prev => ({ ...prev, adjuntos: prev.adjuntos.filter((_, i) => i !== idx) }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        employeeId:   form.employeeId,
        fecha:        form.fecha,
        estado:       form.estado,
        notas:        form.notas || null,
        ausenciaCode: showCodeFields && form.ausenciaCode ? form.ausenciaCode : null,
        adjuntos:     showCodeFields ? form.adjuntos : [],
      };
      if (form.estado === "PRESENTE" || form.estado === "TARDANZA" || form.estado === "MEDIO_DIA") {
        const d = form.fecha;
        payload.horaEntrada = `${d}T${form.horaEntrada}:00`;
        payload.horaSalida  = `${d}T${form.horaSalida}:00`;
      }
      const res = await fetch("/api/asistencia", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error");
      await load();
      setPanelOpen(false);
    } catch { alert("Error al registrar asistencia"); }
    finally { setSaving(false); }
  }

  // ── Excel export ──────────────────────────────────────────────────────────
  function exportarExcel() {
    const rows = filtered.map(a => ({
      "Fecha":        a.fecha.slice(0, 10),
      "Empleado":     `${a.employee.firstName} ${a.employee.lastName}`,
      "Puesto":       a.employee.jobTitle ?? "",
      "Estado":       ESTADO_LABEL[a.estado],
      "Código":       a.ausenciaCode ?? "",
      "Motivo":       a.ausenciaCode ? (AUSENCIA_MAP[a.ausenciaCode]?.label ?? "") : "",
      "Hora Entrada": a.horaEntrada ? new Date(a.horaEntrada).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" }) : "",
      "Hora Salida":  a.horaSalida  ? new Date(a.horaSalida).toLocaleTimeString("es-DO",  { hour: "2-digit", minute: "2-digit" }) : "",
      "Notas":        a.notas ?? "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 12 }, { wch: 24 }, { wch: 22 }, { wch: 12 }, { wch: 8 }, { wch: 22 }, { wch: 13 }, { wch: 12 }, { wch: 28 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asistencia");

    const mesLabel = new Date(mes + "-01").toLocaleDateString("es-DO", { month: "long", year: "numeric" });
    XLSX.writeFile(wb, `Asistencia_${mes}.xlsx`);
  }

  const hasFilter = filtroEmpleado || filtroEstado || filtroCodigo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Asistencia</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Control de entradas, salidas y ausencias del equipo.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <input
            type="month" value={mes} onChange={e => setMes(e.target.value)}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button onClick={exportarExcel}
            className="flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600/10 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600/20 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Exportar Excel{hasFilter ? " (filtrado)" : ""}
          </button>
          <button
            onClick={() => { setForm({ employeeId: "", fecha: hoy(), estado: "PRESENTE", horaEntrada: "08:00", horaSalida: "17:00", notas: "", ausenciaCode: "", adjuntos: [] }); setPanelOpen(true); }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition">
            + Registrar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Total registros</p>
          <p className="mt-2 text-3xl font-bold">{total}</p>
        </div>
        <div className="rounded-2xl border border-blue-900/40 bg-blue-600/10 p-5">
          <p className="text-xs text-blue-400 uppercase tracking-wider">Presentes</p>
          <p className="mt-2 text-3xl font-bold text-blue-300">{presentes}</p>
        </div>
        <div className="rounded-2xl border border-red-900/40 bg-red-600/10 p-5">
          <p className="text-xs text-red-400 uppercase tracking-wider">Ausentes</p>
          <p className="mt-2 text-3xl font-bold text-red-300">{ausentes}</p>
        </div>
        <div className="rounded-2xl border border-yellow-900/40 bg-yellow-600/10 p-5">
          <p className="text-xs text-yellow-400 uppercase tracking-wider">Tardanzas</p>
          <p className="mt-2 text-3xl font-bold text-yellow-300">{tardanzas}</p>
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
            <option value="">Todos los estados</option>
            {(Object.entries(ESTADO_LABEL) as [AsistenciaEstado, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Código de ausencia</label>
          <select value={filtroCodigo} onChange={e => setFiltroCodigo(e.target.value)} className={filterClass}>
            <option value="">Todos los códigos</option>
            {AUSENCIA_CODES.map(c => (
              <option key={c.code} value={c.code}>{c.code} – {c.label}</option>
            ))}
          </select>
        </div>
        {hasFilter && (
          <button onClick={() => { setFiltroEmpleado(""); setFiltroEstado(""); setFiltroCodigo(""); }}
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline py-2 transition">
            Limpiar filtros
          </button>
        )}
        {hasFilter && (
          <span className="text-xs text-zinc-400 py-2">
            {filtered.length} de {asistencias.length} registros
          </span>
        )}
      </div>

      {/* Lista por fecha */}
      {loading ? (
        <div className="py-16 text-center text-sm text-zinc-500">Cargando...</div>
      ) : fechas.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-sm text-zinc-500">
          {hasFilter ? "No hay registros que coincidan con los filtros." : "No hay registros de asistencia para este mes."}
          {!hasFilter && <><br /><span className="text-xs mt-1 block">Usa el botón "+ Registrar" para agregar asistencias.</span></>}
        </div>
      ) : (
        <div className="space-y-4">
          {fechas.map(fecha => {
            const registros = porFecha[fecha];
            const d = new Date(fecha + "T12:00:00");
            return (
              <div key={fecha} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 overflow-hidden">
                <div className="px-4 py-3 bg-white dark:bg-zinc-950/40 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {d.toLocaleDateString("es-DO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </span>
                  <span className="text-xs text-zinc-500">{registros.length} registros</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {registros.map(a => {
                      const codeInfo = a.ausenciaCode ? AUSENCIA_MAP[a.ausenciaCode] : null;
                      const adjuntos: AdjuntoItem[] = Array.isArray(a.adjuntos) ? a.adjuntos : [];
                      return (
                        <tr key={a.id} className="border-t border-zinc-200 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition">
                          <td className="px-4 py-3">
                            <div className="font-medium">{a.employee.firstName} {a.employee.lastName}</div>
                            <div className="text-xs text-zinc-500">{a.employee.jobTitle ?? "—"}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${ESTADO_CLASS[a.estado]}`}>
                              {ESTADO_LABEL[a.estado]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {codeInfo ? (
                              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${codeInfo.bg} ${codeInfo.color}`}>
                                <span className="font-mono font-bold">{codeInfo.code}</span>
                                <span>{codeInfo.label}</span>
                              </span>
                            ) : <span className="text-xs text-zinc-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 text-xs">
                            {a.horaEntrada
                              ? `${new Date(a.horaEntrada).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })} — ${a.horaSalida ? new Date(a.horaSalida).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" }) : "—"}`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-zinc-500 text-xs max-w-[180px]">
                            {a.notas && <div className="mb-1">{a.notas}</div>}
                            {adjuntos.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {adjuntos.map((adj, i) => (
                                  <a key={i} href={adj.url} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition text-xs">
                                    📎 {adj.nombre}
                                  </a>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* Leyenda de códigos */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Leyenda de Códigos de Ausencia — Ley 16-92</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {AUSENCIA_CODES.map(c => (
            <div key={c.code} className={`flex items-start gap-2 rounded-lg p-2.5 ${c.bg}`}>
              <span className={`font-mono text-sm font-bold w-7 shrink-0 ${c.color}`}>{c.code}</span>
              <div>
                <div className={`text-xs font-medium leading-tight ${c.color}`}>{c.label}</div>
                {c.ley && <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">{c.ley}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel lateral */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${panelOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div onClick={() => setPanelOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className={`fixed right-0 top-0 h-screen w-full max-w-md bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 flex flex-col transform transition-transform duration-300 ${panelOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <h2 className="text-lg font-semibold">Registrar asistencia</h2>
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
                <label className={labelClass}>Fecha *</label>
                <input required type="date" value={form.fecha} onChange={f("fecha")} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Estado</label>
                <select value={form.estado} onChange={f("estado")} className={inputClass}>
                  <option value="PRESENTE">Presente</option>
                  <option value="AUSENTE">Ausente</option>
                  <option value="TARDANZA">Tardanza</option>
                  <option value="PERMISO">Permiso</option>
                  <option value="FERIADO">Feriado</option>
                  <option value="MEDIO_DIA">Medio día</option>
                </select>
              </div>
              {(form.estado === "PRESENTE" || form.estado === "TARDANZA" || form.estado === "MEDIO_DIA") && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Hora entrada</label>
                    <input type="time" value={form.horaEntrada} onChange={f("horaEntrada")} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Hora salida</label>
                    <input type="time" value={form.horaSalida} onChange={f("horaSalida")} className={inputClass} />
                  </div>
                </div>
              )}
              {showCodeFields && (
                <>
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
                    <label className={labelClass}>Código de ausencia (Ley 16-92)</label>
                    <select value={form.ausenciaCode} onChange={f("ausenciaCode")} className={inputClass}>
                      <option value="">— Sin código —</option>
                      {AUSENCIA_CODES.map(c => (
                        <option key={c.code} value={c.code}>{c.code} – {c.label}</option>
                      ))}
                    </select>
                    {form.ausenciaCode && AUSENCIA_MAP[form.ausenciaCode]?.ley && (
                      <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-md px-2 py-1">
                        ⚖️ {AUSENCIA_MAP[form.ausenciaCode].ley}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Documentos adjuntos</label>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Certif. médico, acta de matrimonio, acta de nacimiento, etc.</p>
                    <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 transition"
                      onClick={() => fileInputRef.current?.click()}>
                      <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={handleFileUpload} />
                      {uploading ? <p className="text-xs text-blue-500">Subiendo archivo...</p> : (
                        <>
                          <p className="text-xs text-zinc-500">📎 Haz clic para adjuntar archivo(s)</p>
                          <p className="text-[11px] text-zinc-400 mt-1">PDF, JPG, PNG, DOC</p>
                        </>
                      )}
                    </div>
                    {form.adjuntos.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {form.adjuntos.map((adj, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs">
                            <span className="text-zinc-700 dark:text-zinc-300 truncate">📎 {adj.nombre}</span>
                            <button type="button" onClick={() => removeAdjunto(i)} className="text-red-500 hover:text-red-400 ml-2 shrink-0">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
              <div>
                <label className={labelClass}>Notas</label>
                <textarea value={form.notas} onChange={f("notas")} rows={2} className={inputClass} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0 flex justify-end gap-3">
              <button type="button" onClick={() => setPanelOpen(false)}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                Cancelar
              </button>
              <button type="submit" disabled={saving || uploading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50 transition">
                {saving ? "Guardando..." : "Registrar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
