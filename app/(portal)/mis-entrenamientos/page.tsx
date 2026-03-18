"use client";

import { useState, useEffect } from "react";

/* ── Types ─────────────────────────────────────────────────────────────────── */
type TipoPregunta = "seleccion" | "poll" | "abierta" | "escala";

interface Opcion   { id: string; texto: string; correcta?: boolean }
interface Pregunta { id: string; tipo?: TipoPregunta; pregunta: string; opciones: Opcion[] }
interface Material { tipo: "pdf" | "pptx" | "video" | "enlace"; nombre: string; url: string }

interface Asignacion {
  id: string;
  estado: string;
  fechaLimite: string | null;
  fechaCompletado: string | null;
  createdAt: string;
  curso: {
    id: string; titulo: string; descripcion: string | null;
    categoria: string; modalidad: string | null;
    duracionHrs: number | null; obligatorio: boolean;
    recurrencia: string;
    materiales:      Material[];
    preguntas:       Pregunta[];
    tieneEvaluacion: boolean;
    notaAprobatoria: number;
  };
}

type ExamenResult = {
  puntaje: number; aprobado: boolean; correctas: number; total: number;
  totalPreguntas: number; intento: number; notaAprobatoria: number;
};

/* ── Constants ──────────────────────────────────────────────────────────────── */
const CATEGORIA_LABELS: Record<string, string> = {
  SEGURIDAD_INFO:  "Seguridad Info", SEGURIDAD_OCUP: "Seguridad Ocup.",
  POLITICAS:       "Políticas",      LIDERAZGO:      "Liderazgo",
  TECNICO:         "Técnico",        COMPLIANCE:     "Compliance",
  SOFT_SKILLS:     "Soft Skills",    INDUCCION:      "Inducción",
  OTRO:            "Otro",
};
const CATEGORIA_COLORS: Record<string, string> = {
  SEGURIDAD_INFO:  "bg-red-100 text-red-700",
  SEGURIDAD_OCUP:  "bg-orange-100 text-orange-700",
  POLITICAS:       "bg-blue-100 text-blue-700",
  LIDERAZGO:       "bg-purple-100 text-purple-700",
  TECNICO:         "bg-sky-100 text-sky-700",
  COMPLIANCE:      "bg-yellow-100 text-yellow-700",
  SOFT_SKILLS:     "bg-teal-100 text-teal-700",
  INDUCCION:       "bg-emerald-100 text-emerald-700",
  OTRO:            "bg-gray-100 text-gray-700",
};
const TIPO_COLOR: Record<string, string> = {
  pdf:    "bg-red-50 text-red-600 border-red-200",
  pptx:   "bg-orange-50 text-orange-600 border-orange-200",
  video:  "bg-blue-50 text-blue-600 border-blue-200",
  enlace: "bg-gray-50 text-gray-600 border-gray-200",
};

function TipoIconSVG({ tipo }: { tipo: string }) {
  const s = "w-3.5 h-3.5 shrink-0";
  if (tipo === "pdf") return (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
  if (tipo === "pptx") return (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
    </svg>
  );
  if (tipo === "video") return (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  );
  if (tipo === "enlace") return (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );
  return (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
    </svg>
  );
}

function diffDays(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/* ── Certificate helper ─────────────────────────────────────────────────────── */
function openCertificate(a: Asignacion, employeeName = "Empleado") {
  const name  = employeeName;
  const fecha = a.fechaCompletado
    ? new Date(a.fechaCompletado).toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric" });
  const hrs  = a.curso.duracionHrs ? `${a.curso.duracionHrs} hora${a.curso.duracionHrs !== 1 ? "s" : ""}` : null;
  const modal = a.curso.modalidad ?? "Virtual";

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Certificado — ${a.curso.titulo}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 297mm; height: 210mm; display: flex; align-items: center; justify-content: center;
    background: #fff; font-family: Georgia, serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .cert { width: 277mm; height: 190mm; border: 3px solid #2563EB; border-radius: 12px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 14mm 16mm; position: relative; overflow: hidden; }
  .corner { position: absolute; width: 40mm; height: 40mm; }
  .corner.tl { top: 4mm; left: 4mm; border-top: 4px solid #2563EB; border-left: 4px solid #2563EB; border-radius: 6px 0 0 0; }
  .corner.tr { top: 4mm; right: 4mm; border-top: 4px solid #2563EB; border-right: 4px solid #2563EB; border-radius: 0 6px 0 0; }
  .corner.bl { bottom: 4mm; left: 4mm; border-bottom: 4px solid #2563EB; border-left: 4px solid #2563EB; border-radius: 0 0 0 6px; }
  .corner.br { bottom: 4mm; right: 4mm; border-bottom: 4px solid #2563EB; border-right: 4px solid #2563EB; border-radius: 0 0 6px 0; }
  .logo { margin-bottom: 4mm; display:flex; align-items:center; justify-content:center; }
  .org { font-family: Arial, sans-serif; font-size: 10pt; color: #64748b; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 5mm; }
  .cert-title { font-size: 26pt; color: #2563EB; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 5mm; }
  .presented { font-family: Arial, sans-serif; font-size: 10pt; color: #64748b; margin-bottom: 3mm; }
  .emp-name { font-size: 30pt; color: #1e293b; font-style: italic; margin-bottom: 6mm; }
  .divider { width: 50mm; height: 2px; background: #2563EB; margin-bottom: 6mm; }
  .course-label { font-family: Arial, sans-serif; font-size: 9pt; color: #64748b; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 2mm; }
  .course-name { font-size: 16pt; color: #1e40af; font-weight: bold; text-align: center; margin-bottom: 6mm; }
  .meta { display: flex; gap: 12mm; font-family: Arial, sans-serif; font-size: 9pt; color: #475569; }
  .meta span { text-align: center; }
  .meta strong { display: block; font-size: 11pt; color: #1e293b; margin-top: 1mm; }
  .print-btn { position: fixed; bottom: 20px; right: 20px; padding: 10px 22px; background: #2563EB;
    color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; z-index: 999;
    display:flex; align-items:center; gap:8px; }
  @media print { .print-btn { display: none; } }
</style></head><body>
<div class="cert">
  <div class="corner tl"></div><div class="corner tr"></div>
  <div class="corner bl"></div><div class="corner br"></div>
  <div class="logo"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>
  <div class="org">Portal de Recursos Humanos</div>
  <div class="cert-title">Certificado de Completación</div>
  <div class="presented">Se certifica que</div>
  <div class="emp-name">${name}</div>
  <div class="divider"></div>
  <div class="course-label">ha completado satisfactoriamente</div>
  <div class="course-name">${a.curso.titulo}</div>
  <div class="meta">
    <span>Fecha<strong>${fecha}</strong></span>
    ${hrs ? `<span>Duración<strong>${hrs}</strong></span>` : ""}
    <span>Modalidad<strong>${modal}</strong></span>
  </div>
</div>
<button class="print-btn" onclick="window.print()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Imprimir / Guardar PDF</button>
</body></html>`;

  const w = window.open("", "_blank", "width=1060,height=780");
  if (w) { w.document.write(html); w.document.close(); }
}

/* ── Component ──────────────────────────────────────────────────────────────── */
export default function MisEntrenamientosPage() {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState<"TODOS" | "PENDIENTE" | "EN_PROGRESO" | "COMPLETADO">("TODOS");
  const [starting,     setStarting]     = useState<string | null>(null);
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null);
  const [myName,       setMyName]       = useState("Empleado");

  // Track which assignment is "expanded" (opened/started)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Quiz state
  const [quizAsig,   setQuizAsig]   = useState<Asignacion | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [resultado,  setResultado]  = useState<ExamenResult | null>(null);

  // Post-quiz certificate state
  const [certAsig,   setCertAsig]   = useState<Asignacion | null>(null);

  useEffect(() => { loadData(); loadMe(); }, []);

  async function loadMe() {
    try {
      const res = await fetch("/api/portal/me");
      if (res.ok) {
        const emp = await res.json();
        setMyName(`${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim() || "Empleado");
      }
    } catch { /* ignore */ }
  }

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/entrenamientos");
      if (res.ok) setAsignaciones(await res.json());
    } finally { setLoading(false); }
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function iniciar(a: Asignacion) {
    setStarting(a.id);
    try {
      const res = await fetch(`/api/asignaciones/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "EN_PROGRESO" }),
      });
      if (res.ok) {
        showToast("¡Curso iniciado! Ahora puedes acceder a los materiales.", true);
        // Switch to TODOS filter so the course stays visible, and expand it
        setFilter("TODOS");
        setExpandedId(a.id);
        await loadData();
      } else {
        const data = await res.json();
        showToast(data.error ?? "Error al iniciar", false);
      }
    } finally { setStarting(null); }
  }

  function openQuiz(a: Asignacion) {
    setQuizAsig(a);
    setRespuestas({});
    setResultado(null);
  }

  function closeQuiz() {
    setQuizAsig(null);
    setResultado(null);
    setRespuestas({});
    setCertAsig(null);
  }

  async function submitQuiz() {
    if (!quizAsig) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cursos/${quizAsig.curso.id}/examen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respuestas }),
      });
      if (res.ok) {
        const data: ExamenResult = await res.json();
        setResultado(data);
        if (data.aprobado) {
          showToast("¡Felicidades! Aprobaste la evaluación.", true);
          setCertAsig(quizAsig); // save for certificate
          await loadData();      // refresh to show COMPLETADO
        }
      } else {
        const data = await res.json();
        showToast(data.error ?? "Error al enviar evaluación", false);
      }
    } finally { setSubmitting(false); }
  }

  // allAnswered: every question must have a response (even open/scale)
  const allAnswered = quizAsig
    ? quizAsig.curso.preguntas.every(p => {
        const r = respuestas[p.id];
        return r !== undefined && r !== "";
      })
    : false;

  const filtered  = filter === "TODOS" ? asignaciones : asignaciones.filter(a => a.estado === filter);
  const total     = asignaciones.length;
  const completed = asignaciones.filter(a => a.estado === "COMPLETADO").length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${toast.ok ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Mis Entrenamientos</h1>
      <p className="text-gray-500 text-sm mb-6">Cursos y capacitaciones asignados a ti</p>

      {/* Progress summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Progreso general</p>
            <p className="text-xs text-gray-400">{completed} de {total} completados</p>
          </div>
          <span className="text-2xl font-bold text-blue-600">{pct}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg, #3B82F6, #6366F1)" }} />
        </div>
        <div className="flex gap-4 mt-4 text-sm">
          {[
            { label: "Total",       count: total,                                                          color: "text-gray-800" },
            { label: "Pendientes",  count: asignaciones.filter(a => a.estado === "PENDIENTE").length,      color: "text-gray-500" },
            { label: "En progreso", count: asignaciones.filter(a => a.estado === "EN_PROGRESO").length,    color: "text-blue-600" },
            { label: "Completados", count: completed,                                                      color: "text-green-600" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={`font-bold text-lg ${s.color}`}>{s.count}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["TODOS", "PENDIENTE", "EN_PROGRESO", "COMPLETADO"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}>
            {f === "TODOS" ? "Todos" : f === "PENDIENTE" ? "Pendientes" : f === "EN_PROGRESO" ? "En progreso" : "Completados"}
            {f !== "TODOS" && (
              <span className="ml-1.5 opacity-70">{asignaciones.filter(a => a.estado === f).length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Courses list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400">
          <div className="text-5xl mb-3">📚</div>
          <p className="text-sm">No hay entrenamientos en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => {
            const overdue   = a.estado !== "COMPLETADO" && a.fechaLimite && new Date(a.fechaLimite) < new Date();
            const daysLeft  = a.fechaLimite && a.estado !== "COMPLETADO"
              ? diffDays(new Date(), new Date(a.fechaLimite)) : null;
            const isExpanded = expandedId === a.id || a.estado === "EN_PROGRESO" || a.estado === "COMPLETADO";

            return (
              <div key={a.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${
                overdue          ? "border-red-200"
                : a.estado === "COMPLETADO" ? "border-emerald-200"
                : isExpanded     ? "border-blue-300 shadow-md"
                : "border-gray-100"
              }`}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-900">{a.curso.titulo}</h3>
                        {a.curso.obligatorio && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Obligatorio</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORIA_COLORS[a.curso.categoria] ?? "bg-gray-100 text-gray-700"}`}>
                          {CATEGORIA_LABELS[a.curso.categoria] ?? a.curso.categoria}
                        </span>
                        {a.curso.tieneEvaluacion && a.estado !== "COMPLETADO" && (
                          <span className="inline-flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                            Evaluación requerida
                          </span>
                        )}
                      </div>
                      {a.curso.descripcion && (
                        <p className="text-sm text-gray-500 mb-2 line-clamp-2">{a.curso.descripcion}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                        {a.curso.duracionHrs && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            {a.curso.duracionHrs}h
                          </span>
                        )}
                        {a.curso.modalidad && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            {a.curso.modalidad}
                          </span>
                        )}
                        {a.fechaLimite && (
                          <span className={`flex items-center gap-1 ${overdue ? "text-red-500 font-medium" : daysLeft !== null && daysLeft <= 3 ? "text-amber-600 font-medium" : ""}`}>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            {overdue ? `Venció hace ${Math.abs(daysLeft!)}d` : daysLeft === 0 ? "Vence hoy" : `Vence en ${daysLeft}d`}
                          </span>
                        )}
                        {a.fechaCompletado && (
                          <span className="flex items-center gap-1 text-green-600">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            Completado el {new Date(a.fechaCompletado).toLocaleDateString("es-DO")}
                          </span>
                        )}
                      </div>

                      {/* Materials — always shown when expanded/EN_PROGRESO/COMPLETADO */}
                      {isExpanded && (a.curso.materiales ?? []).length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Materiales del curso</p>
                          <div className="flex flex-wrap gap-1.5">
                            {a.curso.materiales.map((m, i) => (
                              <a key={i} href={m.url} target="_blank" rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium border transition hover:opacity-80 ${TIPO_COLOR[m.tipo] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
                                <TipoIconSVG tipo={m.tipo} /> {m.nombre}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex-shrink-0 flex flex-col gap-2 items-end">
                      {a.estado === "COMPLETADO" ? (
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Completado
                          </div>
                          <button onClick={() => openCertificate(a, myName)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                            Ver certificado
                          </button>
                        </div>
                      ) : (
                        <>
                          {a.estado === "PENDIENTE" && (
                            <button onClick={() => iniciar(a)} disabled={starting === a.id}
                              className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
                              {starting === a.id ? "..." : (
                                <span className="inline-flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                  Iniciar curso
                                </span>
                              )}
                            </button>
                          )}
                          {a.estado === "EN_PROGRESO" && (
                            <div className="flex flex-col gap-2 items-end">
                              <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />
                                En progreso
                              </span>
                              {a.curso.tieneEvaluacion && (
                                <button onClick={() => openQuiz(a)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                                  Tomar evaluación
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progress bar for in-progress */}
                  {a.estado === "EN_PROGRESO" && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full w-1/3 bg-blue-500 rounded-full animate-pulse" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Quiz Modal ── */}
      {quizAsig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeQuiz} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-gray-200 max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-3 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  Evaluación
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{quizAsig.curso.titulo}</p>
                {quizAsig.curso.preguntas.some(p => !p.tipo || p.tipo === "seleccion") && (
                  <p className="text-xs text-indigo-600 mt-1 font-medium">
                    Nota mínima para aprobar: {quizAsig.curso.notaAprobatoria}%
                  </p>
                )}
              </div>
              <button onClick={closeQuiz} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {resultado ? (
              /* ── Results ── */
              <div className="flex-1 overflow-y-auto p-6">
                <div className={`rounded-2xl p-6 text-center mb-5 ${resultado.aprobado
                  ? "bg-emerald-50 border-2 border-emerald-200"
                  : "bg-red-50 border-2 border-red-200"}`}>
                  <div className="mb-3 flex justify-center">
                    {resultado.aprobado ? (
                      <svg className="w-14 h-14 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                    ) : (
                      <svg className="w-14 h-14 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    )}
                  </div>
                  {resultado.total > 0 && (
                    <>
                      <p className={`text-3xl font-bold ${resultado.aprobado ? "text-emerald-600" : "text-red-600"}`}>
                        {resultado.puntaje}%
                      </p>
                      <p className={`text-lg font-semibold mt-1 ${resultado.aprobado ? "text-emerald-700" : "text-red-700"}`}>
                        {resultado.aprobado ? "¡Aprobado! ✓" : "No aprobado"}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        {resultado.correctas} de {resultado.total} preguntas correctas
                      </p>
                    </>
                  )}
                  {resultado.total === 0 && (
                    <>
                      <p className="text-3xl font-bold text-emerald-600">✓</p>
                      <p className="text-lg font-semibold mt-1 text-emerald-700">¡Completado!</p>
                      <p className="text-sm text-gray-500 mt-2">Tus respuestas han sido registradas</p>
                    </>
                  )}
                  {!resultado.aprobado && resultado.total > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      Necesitabas {resultado.notaAprobatoria}% · Puedes intentarlo nuevamente
                    </p>
                  )}
                </div>

                {resultado.aprobado ? (
                  <div className="space-y-3">
                    <p className="text-center text-sm text-gray-500">
                      El curso ha sido marcado como completado.
                    </p>
                    {certAsig && (
                      <button
                        onClick={() => { closeQuiz(); openCertificate(certAsig, myName); }}
                        className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-3 transition flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                        Ver e imprimir mi certificado
                      </button>
                    )}
                  </div>
                ) : (
                  <button onClick={() => { setResultado(null); setRespuestas({}); }}
                    className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2.5 transition">
                    Intentar de nuevo
                  </button>
                )}
              </div>
            ) : (
              /* ── Questions ── */
              <>
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                  {quizAsig.curso.preguntas.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">Este curso no tiene preguntas configuradas aún.</p>
                  ) : (
                    quizAsig.curso.preguntas.map((p, idx) => {
                      const tipo = p.tipo ?? "seleccion";
                      return (
                        <div key={p.id}>
                          <div className="flex items-start gap-2 mb-3">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0 mt-0.5">{idx + 1}</span>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{p.pregunta}</p>
                              {tipo === "escala" && (
                                <p className="text-xs text-gray-400 mt-0.5">Elige un valor del 0 al 10</p>
                              )}
                              {tipo === "poll" && (
                                <p className="text-xs text-gray-400 mt-0.5">Selecciona una opción</p>
                              )}
                              {tipo === "abierta" && (
                                <p className="text-xs text-gray-400 mt-0.5">Responde con tus palabras</p>
                              )}
                            </div>
                          </div>

                          {/* Selección múltiple */}
                          {tipo === "seleccion" && (
                            <div className="space-y-2 pl-8">
                              {p.opciones.filter(opt => opt.texto.trim()).map(opt => {
                                const selected = respuestas[p.id] === opt.id;
                                return (
                                  <label key={opt.id}
                                    className={`flex items-center gap-3 rounded-xl p-3 border cursor-pointer transition ${
                                      selected
                                        ? "bg-indigo-50 border-indigo-300 text-indigo-900"
                                        : "border-gray-100 hover:bg-gray-50"
                                    }`}>
                                    <input type="radio" name={p.id} value={opt.id} checked={selected}
                                      onChange={() => setRespuestas(r => ({ ...r, [p.id]: opt.id }))}
                                      className="accent-indigo-600 shrink-0" />
                                    <span className="text-sm text-gray-700">{opt.texto}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {/* Poll (encuesta) */}
                          {tipo === "poll" && (
                            <div className="space-y-2 pl-8">
                              {p.opciones.filter(opt => opt.texto.trim()).map(opt => {
                                const selected = respuestas[p.id] === opt.id;
                                return (
                                  <label key={opt.id}
                                    className={`flex items-center gap-3 rounded-xl p-3 border cursor-pointer transition ${
                                      selected
                                        ? "bg-blue-50 border-blue-300 text-blue-900"
                                        : "border-gray-100 hover:bg-gray-50"
                                    }`}>
                                    <input type="radio" name={p.id} value={opt.id} checked={selected}
                                      onChange={() => setRespuestas(r => ({ ...r, [p.id]: opt.id }))}
                                      className="accent-blue-500 shrink-0" />
                                    <span className="text-sm text-gray-700">{opt.texto}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {/* Respuesta abierta */}
                          {tipo === "abierta" && (
                            <div className="pl-8">
                              <textarea
                                rows={3}
                                placeholder="Escribe tu respuesta aquí..."
                                value={respuestas[p.id] ?? ""}
                                onChange={e => setRespuestas(r => ({ ...r, [p.id]: e.target.value }))}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
                              />
                            </div>
                          )}

                          {/* Escala 0–10 (NPS) */}
                          {tipo === "escala" && (
                            <div className="pl-8">
                              <div className="flex gap-1 flex-wrap">
                                {[0,1,2,3,4,5,6,7,8,9,10].map(n => {
                                  const val = String(n);
                                  const selected = respuestas[p.id] === val;
                                  const color = n <= 6
                                    ? (selected ? "bg-red-500 text-white border-red-500" : "border-red-200 text-red-500 hover:bg-red-50")
                                    : n <= 8
                                    ? (selected ? "bg-amber-500 text-white border-amber-500" : "border-amber-200 text-amber-600 hover:bg-amber-50")
                                    : (selected ? "bg-emerald-500 text-white border-emerald-500" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50");
                                  return (
                                    <button key={n} type="button"
                                      onClick={() => setRespuestas(r => ({ ...r, [p.id]: val }))}
                                      className={`w-9 h-9 rounded-lg border text-sm font-bold transition ${color}`}>
                                      {n}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="flex justify-between text-xs text-gray-400 mt-1.5 px-1">
                                <span>Nada probable</span>
                                <span>Muy probable</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-400">
                      {Object.keys(respuestas).length} de {quizAsig.curso.preguntas.length} respondidas
                    </p>
                    {!allAnswered && quizAsig.curso.preguntas.length > 0 && (
                      <p className="text-xs text-amber-600">Responde todas las preguntas para continuar</p>
                    )}
                  </div>
                  <button onClick={submitQuiz} disabled={submitting || !allAnswered || quizAsig.curso.preguntas.length === 0}
                    className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2.5 transition disabled:opacity-40">
                    {submitting ? "Enviando..." : "Enviar evaluación"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
