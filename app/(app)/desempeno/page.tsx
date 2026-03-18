"use client";

import { useEffect, useState, useCallback } from "react";

type Calificacion = "EXCEPCIONAL" | "SOBRESALIENTE" | "CUMPLE" | "NECESITA_MEJORA" | "INSATISFACTORIO";

type Employee = { id: string; firstName: string; lastName: string; jobTitle: string | null };
type Review = {
  id:            string;
  employeeId:    string;
  employee:      Employee;
  reviewer:      Employee | null;
  periodo:       string;
  calificacion:  Calificacion;
  puntuacion:    number | null;
  fortalezas:    string | null;
  areasEnMejora: string | null;
  comentarios:   string | null;
  objetivos:     string | null;
  fechaReview:   string;
};

const CAL_LABEL: Record<Calificacion, string> = {
  EXCEPCIONAL:      "Excepcional",
  SOBRESALIENTE:    "Sobresaliente",
  CUMPLE:           "Cumple expectativas",
  NECESITA_MEJORA:  "Necesita mejora",
  INSATISFACTORIO:  "Insatisfactorio",
};

const CAL_CLASS: Record<Calificacion, string> = {
  EXCEPCIONAL:     "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-600/20 dark:text-blue-200 dark:border-blue-600/30",
  SOBRESALIENTE:   "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-600/20 dark:text-purple-200 dark:border-purple-600/30",
  CUMPLE:          "bg-zinc-700/40 text-zinc-700 dark:text-zinc-200 border border-zinc-600",
  NECESITA_MEJORA: "bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-600/20 dark:text-yellow-200 dark:border-yellow-600/30",
  INSATISFACTORIO: "bg-red-100 text-red-700 border border-red-200 dark:bg-red-600/20 dark:text-red-200 dark:border-red-600/30",
};

const CAL_STARS: Record<Calificacion, number> = {
  EXCEPCIONAL: 5, SOBRESALIENTE: 4, CUMPLE: 3, NECESITA_MEJORA: 2, INSATISFACTORIO: 1,
};

const EMPTY_FORM = {
  employeeId:    "",
  reviewerId:    "",
  periodo:       "",
  calificacion:  "CUMPLE" as Calificacion,
  puntuacion:    "",
  fortalezas:    "",
  areasEnMejora: "",
  comentarios:   "",
  objetivos:     "",
};

const inputClass    = "w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600";
const labelClass    = "block text-xs text-zinc-500 dark:text-zinc-400 mb-1";
const textareaClass = `${inputClass} resize-none`;

function Stars({ n }: { n: number }) {
  return (
    <span className="text-sm">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < n ? "text-yellow-400" : "text-zinc-700"}>★</span>
      ))}
    </span>
  );
}

export default function DesempenoPage() {
  const [reviews,   setReviews]   = useState<Review[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [detalle,   setDetalle]   = useState<Review | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rvRes, empRes] = await Promise.all([
        fetch("/api/desempeno"),
        fetch("/api/employees"),
      ]);
      const rvData  = await rvRes.json();
      const empData = await empRes.json();
      setReviews(Array.isArray(rvData)  ? rvData  : []);
      setEmployees(Array.isArray(empData) ? empData : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_FORM, periodo: new Date().getFullYear().toString() });
    setPanelOpen(true);
  }

  function openEdit(r: Review) {
    setEditId(r.id);
    setForm({
      employeeId:    r.employeeId,
      reviewerId:    r.reviewer?.id ?? "",
      periodo:       r.periodo,
      calificacion:  r.calificacion,
      puntuacion:    r.puntuacion ? String(r.puntuacion) : "",
      fortalezas:    r.fortalezas    ?? "",
      areasEnMejora: r.areasEnMejora ?? "",
      comentarios:   r.comentarios   ?? "",
      objetivos:     r.objetivos     ?? "",
    });
    setPanelOpen(true);
  }

  const f = (key: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url    = editId ? `/api/desempeno/${editId}` : "/api/desempeno";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al guardar");
      }
      await load();
      setPanelOpen(false);
    } catch (err: any) {
      alert(err.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar esta evaluación?")) return;
    await fetch(`/api/desempeno/${id}`, { method: "DELETE" });
    await load();
  }

  // Estadísticas
  const promCalif = reviews.reduce((a, r) => a + CAL_STARS[r.calificacion], 0) / (reviews.length || 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Desempeño</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Evaluaciones de rendimiento del equipo.</p>
        </div>
        <button onClick={openCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition">
          + Nueva evaluación
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Total evaluaciones</p>
          <p className="mt-2 text-3xl font-bold">{reviews.length}</p>
        </div>
        <div className="rounded-2xl border border-blue-900/40 bg-blue-600/10 p-5">
          <p className="text-xs text-blue-400 uppercase tracking-wider">Excepcional</p>
          <p className="mt-2 text-3xl font-bold text-blue-300">
            {reviews.filter(r => r.calificacion === "EXCEPCIONAL").length}
          </p>
        </div>
        <div className="rounded-2xl border border-yellow-900/40 bg-yellow-600/10 p-5">
          <p className="text-xs text-yellow-400 uppercase tracking-wider">Necesitan mejora</p>
          <p className="mt-2 text-3xl font-bold text-yellow-300">
            {reviews.filter(r => r.calificacion === "NECESITA_MEJORA" || r.calificacion === "INSATISFACTORIO").length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Promedio</p>
          <Stars n={Math.round(promCalif)} />
          <p className="mt-1 text-xs text-zinc-500">{promCalif.toFixed(1)} / 5.0</p>
        </div>
      </div>

      {/* Lista */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-500">Cargando...</div>
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-500">No hay evaluaciones registradas.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-white dark:bg-zinc-950/40 text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left">Empleado</th>
                <th className="px-4 py-3 text-left">Período</th>
                <th className="px-4 py-3 text-left">Calificación</th>
                <th className="px-4 py-3 text-left">Puntuación</th>
                <th className="px-4 py-3 text-left">Evaluador</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map(r => (
                <tr key={r.id} className="border-t border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-50 dark:bg-zinc-900/30 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.employee.firstName} {r.employee.lastName}</div>
                    <div className="text-xs text-zinc-500">{r.employee.jobTitle ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 font-mono">{r.periodo}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${CAL_CLASS[r.calificacion]}`}>
                      {CAL_LABEL[r.calificacion]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.puntuacion !== null ? (
                      <div>
                        <div className="text-sm font-semibold">{r.puntuacion}/100</div>
                        <div className="mt-1 h-1.5 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800">
                          <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${r.puntuacion}%` }} />
                        </div>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 text-xs">
                    {r.reviewer ? `${r.reviewer.firstName} ${r.reviewer.lastName}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 text-xs">
                    {new Date(r.fechaReview).toLocaleDateString("es-DO")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setDetalle(r)} className="rounded px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-200 dark:bg-zinc-800 transition">Ver</button>
                      <button onClick={() => openEdit(r)} className="rounded px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-200 dark:bg-zinc-800 transition">Editar</button>
                      <button onClick={() => onDelete(r.id)} className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-900/20 transition">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de detalle */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setDetalle(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{detalle.employee.firstName} {detalle.employee.lastName}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Período: {detalle.periodo}</p>
              </div>
              <button onClick={() => setDetalle(null)} className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xl">✕</button>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${CAL_CLASS[detalle.calificacion]}`}>
                {CAL_LABEL[detalle.calificacion]}
              </span>
              <Stars n={CAL_STARS[detalle.calificacion]} />
              {detalle.puntuacion !== null && <span className="text-sm font-semibold">{detalle.puntuacion}/100</span>}
            </div>
            {detalle.fortalezas && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Fortalezas</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{detalle.fortalezas}</p>
              </div>
            )}
            {detalle.areasEnMejora && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Áreas de mejora</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{detalle.areasEnMejora}</p>
              </div>
            )}
            {detalle.comentarios && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Comentarios</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{detalle.comentarios}</p>
              </div>
            )}
            {detalle.objetivos && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Objetivos próximo período</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{detalle.objetivos}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Panel lateral */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${panelOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div onClick={() => setPanelOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className={`fixed right-0 top-0 h-screen w-full max-w-md bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 flex flex-col transform transition-transform duration-300 ${panelOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <h2 className="text-lg font-semibold">{editId ? "Editar evaluación" : "Nueva evaluación"}</h2>
          </div>
          <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className={labelClass}>Empleado *</label>
                <select required value={form.employeeId} onChange={f("employeeId")} className={inputClass} disabled={!!editId}>
                  <option value="">Seleccionar</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Evaluador</label>
                <select value={form.reviewerId} onChange={f("reviewerId")} className={inputClass}>
                  <option value="">Sin asignar</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Período * (ej: 2024, 2024-Q1, 2024-S1)</label>
                <input required value={form.periodo} onChange={f("periodo")} placeholder="2024" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Calificación general</label>
                <select value={form.calificacion} onChange={f("calificacion")} className={inputClass}>
                  <option value="EXCEPCIONAL">⭐⭐⭐⭐⭐ Excepcional</option>
                  <option value="SOBRESALIENTE">⭐⭐⭐⭐ Sobresaliente</option>
                  <option value="CUMPLE">⭐⭐⭐ Cumple expectativas</option>
                  <option value="NECESITA_MEJORA">⭐⭐ Necesita mejora</option>
                  <option value="INSATISFACTORIO">⭐ Insatisfactorio</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Puntuación (1-100)</label>
                <input type="number" min="1" max="100" value={form.puntuacion} onChange={f("puntuacion")} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Fortalezas</label>
                <textarea value={form.fortalezas} onChange={f("fortalezas")} rows={3} className={textareaClass} />
              </div>
              <div>
                <label className={labelClass}>Áreas de mejora</label>
                <textarea value={form.areasEnMejora} onChange={f("areasEnMejora")} rows={3} className={textareaClass} />
              </div>
              <div>
                <label className={labelClass}>Comentarios</label>
                <textarea value={form.comentarios} onChange={f("comentarios")} rows={3} className={textareaClass} />
              </div>
              <div>
                <label className={labelClass}>Objetivos próximo período</label>
                <textarea value={form.objetivos} onChange={f("objetivos")} rows={3} className={textareaClass} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0 flex justify-end gap-3">
              <button type="button" onClick={() => setPanelOpen(false)}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-50 dark:bg-zinc-900 transition">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50 transition">
                {saving ? "Guardando..." : editId ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
