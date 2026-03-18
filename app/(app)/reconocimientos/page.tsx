"use client";

import { useEffect, useState, useCallback } from "react";

type ReconocimientoTipo = "EMPLEADO_MES" | "MEJOR_DESEMPENO" | "INNOVACION" | "TRABAJO_EQUIPO" | "LIDERAZGO" | "PUNTUALIDAD" | "OTRO";

type Employee = { id: string; firstName: string; lastName: string; jobTitle: string | null };
type Reconocimiento = {
  id:          string;
  employeeId:  string;
  employee:    Employee;
  tipo:        ReconocimientoTipo;
  titulo:      string;
  descripcion: string | null;
  otorgadoPor: string | null;
  fecha:       string;
  publico:     boolean;
};

const TIPO_LABEL: Record<ReconocimientoTipo, string> = {
  EMPLEADO_MES:    "Empleado del Mes",
  MEJOR_DESEMPENO: "Mejor Desempeño",
  INNOVACION:      "Innovación",
  TRABAJO_EQUIPO:  "Trabajo en Equipo",
  LIDERAZGO:       "Liderazgo",
  PUNTUALIDAD:     "Puntualidad",
  OTRO:            "Otro",
};

const TIPO_ICON: Record<ReconocimientoTipo, string> = {
  EMPLEADO_MES:    "🏆",
  MEJOR_DESEMPENO: "⭐",
  INNOVACION:      "💡",
  TRABAJO_EQUIPO:  "🤝",
  LIDERAZGO:       "🎯",
  PUNTUALIDAD:     "⏰",
  OTRO:            "🎖️",
};

const TIPO_COLOR: Record<ReconocimientoTipo, string> = {
  EMPLEADO_MES:    "border-yellow-600/40 bg-yellow-600/10",
  MEJOR_DESEMPENO: "border-blue-600/40 bg-blue-600/10",
  INNOVACION:      "border-purple-600/40 bg-purple-600/10",
  TRABAJO_EQUIPO:  "border-green-600/40 bg-green-600/10",
  LIDERAZGO:       "border-orange-600/40 bg-orange-600/10",
  PUNTUALIDAD:     "border-cyan-600/40 bg-cyan-600/10",
  OTRO:            "border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/40",
};

const EMPTY_FORM = {
  employeeId:  "",
  tipo:        "OTRO" as ReconocimientoTipo,
  titulo:      "",
  descripcion: "",
  otorgadoPor: "",
  fecha:       new Date().toISOString().slice(0, 10),
  publico:     true,
};

const inputClass = "w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600";
const labelClass = "block text-xs text-zinc-500 dark:text-zinc-400 mb-1";

export default function ReconocimientosPage() {
  const [items,     setItems]     = useState<Reconocimiento[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [filtroTipo, setFiltroTipo] = useState("Todos");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, empRes] = await Promise.all([
        fetch("/api/reconocimientos"),
        fetch("/api/employees"),
      ]);
      const recData = await recRes.json();
      const empData = await empRes.json();
      setItems(Array.isArray(recData) ? recData : []);
      setEmployees(Array.isArray(empData) ? empData : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filtroTipo === "Todos" ? items : items.filter(i => i.tipo === filtroTipo);

  const f = (key: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/reconocimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Error");
      await load();
      setPanelOpen(false);
      setForm(EMPTY_FORM);
    } catch {
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar este reconocimiento?")) return;
    await fetch(`/api/reconocimientos/${id}`, { method: "DELETE" });
    await load();
  }

  // Ranking de empleados más reconocidos
  const ranking = Object.entries(
    items.reduce((acc, r) => {
      const key = r.employeeId;
      if (!acc[key]) acc[key] = { emp: r.employee, count: 0 };
      acc[key].count++;
      return acc;
    }, {} as Record<string, { emp: Employee; count: number }>)
  ).sort((a, b) => b[1].count - a[1].count).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reconocimientos</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Celebra los logros del equipo.</p>
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setPanelOpen(true); }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition">
          + Otorgar reconocimiento
        </button>
      </div>

      {/* Ranking + Total */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-4">🏅 Más reconocidos</h2>
          {ranking.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin reconocimientos aún.</p>
          ) : (
            <div className="space-y-3">
              {ranking.map(([, { emp, count }], i) => (
                <div key={emp.id} className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-yellow-500 text-black" : i === 1 ? "bg-zinc-400 text-black" : i === 2 ? "bg-orange-700 text-white" : "bg-zinc-700 text-white"}`}>
                    {i + 1}
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 text-xs font-medium">
                    {emp.firstName[0]}{emp.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-zinc-500">{emp.jobTitle ?? "—"}</p>
                  </div>
                  <span className="text-sm font-semibold text-yellow-400">{count} 🏆</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-4">Por categoría</h2>
          <div className="space-y-2">
            {Object.entries(TIPO_LABEL).map(([tipo, label]) => {
              const count = items.filter(i => i.tipo === tipo).length;
              return (
                <div key={tipo} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{TIPO_ICON[tipo as ReconocimientoTipo]} {label}</span>
                  <span className="text-xs font-semibold">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFiltroTipo("Todos")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filtroTipo === "Todos" ? "bg-blue-600 text-white" : "border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}>
          Todos
        </button>
        {Object.entries(TIPO_LABEL).map(([tipo, label]) => (
          <button key={tipo} onClick={() => setFiltroTipo(tipo)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filtroTipo === tipo ? "bg-blue-600 text-white" : "border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}>
            {TIPO_ICON[tipo as ReconocimientoTipo]} {label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="py-16 text-center text-sm text-zinc-500">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-sm text-zinc-500">
          No hay reconocimientos para mostrar.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(r => (
            <div key={r.id} className={`rounded-2xl border p-5 ${TIPO_COLOR[r.tipo]}`}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{TIPO_ICON[r.tipo]}</span>
                <button onClick={() => onDelete(r.id)} className="text-zinc-600 hover:text-red-400 text-xs transition">✕</button>
              </div>
              <h3 className="font-semibold text-sm">{r.titulo}</h3>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs">
                  {r.employee.firstName[0]}{r.employee.lastName[0]}
                </div>
                <div>
                  <p className="text-xs font-medium">{r.employee.firstName} {r.employee.lastName}</p>
                  <p className="text-xs text-zinc-500">{r.employee.jobTitle ?? "—"}</p>
                </div>
              </div>
              {r.descripcion && (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{r.descripcion}</p>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                <span>{new Date(r.fecha).toLocaleDateString("es-DO")}</span>
                {r.otorgadoPor && <span>por {r.otorgadoPor}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Panel lateral */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${panelOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div onClick={() => setPanelOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className={`fixed right-0 top-0 h-screen w-full max-w-md bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 flex flex-col transform transition-transform duration-300 ${panelOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <h2 className="text-lg font-semibold">Otorgar reconocimiento</h2>
          </div>
          <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className={labelClass}>Empleado *</label>
                <select required value={form.employeeId} onChange={f("employeeId")} className={inputClass}>
                  <option value="">Seleccionar empleado</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Categoría</label>
                <select value={form.tipo} onChange={f("tipo")} className={inputClass}>
                  {Object.entries(TIPO_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{TIPO_ICON[k as ReconocimientoTipo]} {v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Título *</label>
                <input required value={form.titulo} onChange={f("titulo")} placeholder="Ej: Empleado del mes de enero" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Descripción</label>
                <textarea value={form.descripcion} onChange={f("descripcion")} rows={3}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                  placeholder="¿Por qué merece este reconocimiento?" />
              </div>
              <div>
                <label className={labelClass}>Otorgado por</label>
                <input value={form.otorgadoPor} onChange={f("otorgadoPor")} placeholder="Nombre del supervisor o empresa" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Fecha</label>
                <input type="date" value={form.fecha} onChange={f("fecha")} className={inputClass} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0 flex justify-end gap-3">
              <button type="button" onClick={() => setPanelOpen(false)}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-50 dark:bg-zinc-900 transition">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50 transition flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/><path d="M7 4H17L19 8C19 11.3 15.9 14 12 14C8.1 14 5 11.3 5 8L7 4Z"/><path d="M5 8H3C3 11 4 13 7 14"/><path d="M19 8H21C21 11 20 13 17 14"/></svg>
                {saving ? "Guardando..." : "Otorgar reconocimiento"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
