"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

/* ── Types ───────────────────────────────────────────────────────────────── */
type Pregunta = { id: string; texto: string; requerida: boolean };
type Vacante  = {
  id: string; titulo: string; descripcion: string | null;
  requisitos: string | null; ubicacion: string | null;
  tipo: string; preguntas: Pregunta[];
  estado: "ABIERTA" | "PAUSADA" | "CERRADA";
  visibilidad: "EXTERNA" | "INTERNA" | "AMBAS";
  slugExterno: string; slugInterno: string;
  totalAplicantes: number;
  createdAt: string;
};
type Aplicante = {
  id: string; nombre: string; email: string; telefono: string | null;
  tipo: "EXTERNO" | "INTERNO"; estado: string;
  cvUrl: string | null; archivos: { nombre: string; url: string }[];
  respuestas: Record<string, string>; notas: string | null;
  createdAt: string;
  empleado: { firstName: string; lastName: string; jobTitle: string | null } | null;
};

/* ── Constants ───────────────────────────────────────────────────────────── */
const TIPOS = ["TIEMPO_COMPLETO","MEDIO_TIEMPO","TEMPORAL","CONTRATO"] as const;
const TIPO_LABEL: Record<string, string> = {
  TIEMPO_COMPLETO: "Tiempo completo",
  MEDIO_TIEMPO:    "Medio tiempo",
  TEMPORAL:        "Temporal",
  CONTRATO:        "Contrato",
};
const ESTADO_AP: Record<string, { label: string; color: string }> = {
  PENDIENTE:   { label: "Pendiente",   color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300" },
  REVISADO:    { label: "Revisado",    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300" },
  ENTREVISTA:  { label: "Entrevista",  color: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300" },
  RECHAZADO:   { label: "Rechazado",   color: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300" },
  CONTRATADO:  { label: "Contratado",  color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" },
};

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function ReclutamientoPage() {
  const [view, setView]             = useState<"list" | "vacante">("list");
  const [vacantes, setVacantes]     = useState<Vacante[]>([]);
  const [selected, setSelected]     = useState<Vacante | null>(null);
  const [loadingV, setLoadingV]     = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [filtroEstado, setFiltro]   = useState("all");

  const loadVacantes = useCallback(async () => {
    setLoadingV(true);
    const res = await fetch(`/api/vacantes?estado=${filtroEstado}`);
    setVacantes(res.ok ? await res.json() : []);
    setLoadingV(false);
  }, [filtroEstado]);

  useEffect(() => { loadVacantes(); }, [loadVacantes]);

  function openVacante(v: Vacante) { setSelected(v); setView("vacante"); }
  function backToList() { setSelected(null); setView("list"); loadVacantes(); }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6">
      {view === "list" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reclutamiento</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">Gestiona vacantes y candidatos</p>
            </div>
            <button onClick={() => setShowForm(true)}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition shadow-sm flex items-center gap-2">
              + Nueva vacante
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            {["all","ABIERTA","PAUSADA","CERRADA"].map(e => (
              <button key={e} onClick={() => setFiltro(e)}
                className={["rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  filtroEstado === e
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-700"
                ].join(" ")}>
                {e === "all" ? "Todas" : e.charAt(0) + e.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Vacantes grid */}
          {loadingV ? (
            <div className="text-center py-16 text-sm text-gray-400">Cargando...</div>
          ) : vacantes.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-sm text-gray-400 dark:text-zinc-500">No hay vacantes. Crea la primera.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {vacantes.map(v => (
                <VacanteCard key={v.id} vacante={v} origin={origin}
                  onOpen={() => openVacante(v)}
                  onRefresh={loadVacantes}
                />
              ))}
            </div>
          )}
        </>
      )}

      {view === "vacante" && selected && (
        <VacanteDetail
          vacante={selected}
          origin={origin}
          onBack={backToList}
          onRefresh={() => {
            fetch(`/api/vacantes/${selected.id}`)
              .then(r => r.json())
              .then(data => { setSelected({ ...data, preguntas: data.preguntas ?? [] }); });
          }}
        />
      )}

      {showForm && (
        <VacanteFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadVacantes(); }}
        />
      )}
    </div>
  );
}

/* ── VacanteCard ─────────────────────────────────────────────────────────── */
function VacanteCard({ vacante, origin, onOpen, onRefresh }:
  { vacante: Vacante; origin: string; onOpen: () => void; onRefresh: () => void }) {

  const estadoColor: Record<string, string> = {
    ABIERTA:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
    PAUSADA:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
    CERRADA:  "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400",
  };

  async function toggleEstado() {
    const next = vacante.estado === "ABIERTA" ? "PAUSADA"
               : vacante.estado === "PAUSADA" ? "ABIERTA" : "CERRADA";
    await fetch(`/api/vacantes/${vacante.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: next }),
    });
    onRefresh();
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`${origin}/apply/${slug}`);
    alert("Link copiado al portapapeles");
  }
  function copyInterno(slug: string) {
    navigator.clipboard.writeText(`${origin}/apply/interno/${slug}`);
    alert("Link interno copiado al portapapeles");
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <button onClick={onOpen} className="font-semibold text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left line-clamp-2">
            {vacante.titulo}
          </button>
          {vacante.ubicacion && <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">📍 {vacante.ubicacion}</p>}
        </div>
        <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 flex-shrink-0 ${estadoColor[vacante.estado]}`}>
          {vacante.estado}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
        <span className="bg-gray-100 dark:bg-zinc-800 rounded-md px-2 py-0.5">{TIPO_LABEL[vacante.tipo] ?? vacante.tipo}</span>
        <span className="ml-auto font-medium text-gray-700 dark:text-zinc-300">
          👤 {vacante.totalAplicantes} aplicante{vacante.totalAplicantes !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Link buttons — only show based on visibility */}
      <div className="flex gap-1.5 flex-wrap">
        {(vacante.visibilidad === "EXTERNA" || vacante.visibilidad === "AMBAS") && (
          <button onClick={() => copyLink(vacante.slugExterno)}
            className="flex-1 text-[10px] font-medium rounded-lg border border-gray-200 dark:border-zinc-700 px-2 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition text-gray-500 dark:text-zinc-400">
            🔗 Link externo
          </button>
        )}
        {(vacante.visibilidad === "INTERNA" || vacante.visibilidad === "AMBAS") && (
          <button onClick={() => copyInterno(vacante.slugInterno)}
            className="flex-1 text-[10px] font-medium rounded-lg border border-gray-200 dark:border-zinc-700 px-2 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition text-gray-500 dark:text-zinc-400">
            🏢 Link interno
          </button>
        )}
      </div>

      <div className="flex gap-2 pt-1 border-t border-gray-50 dark:border-zinc-800">
        <button onClick={onOpen}
          className="flex-1 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium py-1.5 transition">
          Ver aplicantes
        </button>
        {vacante.estado !== "CERRADA" && (
          <button onClick={toggleEstado}
            className="text-xs rounded-lg border border-gray-200 dark:border-zinc-700 px-3 py-1.5 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition">
            {vacante.estado === "ABIERTA" ? "Pausar" : "Abrir"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── VacanteDetail ───────────────────────────────────────────────────────── */
function VacanteDetail({ vacante, origin, onBack, onRefresh }:
  { vacante: Vacante; origin: string; onBack: () => void; onRefresh: () => void }) {

  const router = useRouter();
  const [aplicantes, setAplicantes] = useState<Aplicante[]>([]);
  const [loadingA, setLoadingA]     = useState(true);
  const [selected, setSelected]     = useState<Aplicante | null>(null);
  const [hiring, setHiring]         = useState(false);
  const [editing, setEditing]       = useState(false);

  const loadAplicantes = useCallback(async () => {
    setLoadingA(true);
    const res = await fetch(`/api/aplicantes?vacanteId=${vacante.id}`);
    setAplicantes(res.ok ? await res.json() : []);
    setLoadingA(false);
  }, [vacante.id]);

  useEffect(() => { loadAplicantes(); }, [loadAplicantes]);

  async function changeEstado(apId: string, estado: string) {
    await fetch(`/api/aplicantes/${apId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    loadAplicantes();
    if (selected?.id === apId) setSelected(p => p ? { ...p, estado } : null);
  }

  async function contratar(apId: string) {
    if (!confirm("¿Deseas contratar este aplicante y crear su perfil de empleado?")) return;
    setHiring(true);
    try {
      const res  = await fetch(`/api/aplicantes/${apId}/contratar`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Error al contratar"); return; }
      if (data.existing) {
        alert("Este empleado ya existe en el sistema. Redirigiendo a su perfil...");
      } else {
        alert("Empleado creado. Redirigiendo a su perfil para completar la información...");
      }
      router.push(`/empleados/${data.employeeId}`);
    } finally {
      setHiring(false);
    }
  }

  function copyLink(type: "ext" | "int") {
    const url = type === "ext"
      ? `${origin}/apply/${vacante.slugExterno}`
      : `${origin}/apply/interno/${vacante.slugInterno}`;
    navigator.clipboard.writeText(url);
    alert("Link copiado al portapapeles");
  }

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{vacante.titulo}</h1>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
            {TIPO_LABEL[vacante.tipo]} {vacante.ubicacion ? `· ${vacante.ubicacion}` : ""}
          </p>
        </div>
        <button onClick={() => setEditing(true)}
          className="text-xs rounded-lg border border-gray-200 dark:border-zinc-700 px-3 py-1.5 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 transition">
          ✏️ Editar
        </button>
      </div>

      {/* Link sharing — only show links based on visibility */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Links de aplicación</p>
          <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
            vacante.visibilidad === "EXTERNA" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
            : vacante.visibilidad === "INTERNA" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300"
            : "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300"
          }`}>
            {vacante.visibilidad === "EXTERNA" ? "Solo externa"
             : vacante.visibilidad === "INTERNA" ? "Solo interna"
             : "Externa + Interna"}
          </span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {(vacante.visibilidad === "EXTERNA" || vacante.visibilidad === "AMBAS") && (
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800 rounded-xl px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Externo (público)</p>
                <p className="text-xs text-gray-600 dark:text-zinc-300 truncate">{origin}/apply/{vacante.slugExterno}</p>
              </div>
              <button onClick={() => copyLink("ext")} className="flex-shrink-0 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 font-medium transition">
                Copiar
              </button>
            </div>
          )}
          {(vacante.visibilidad === "INTERNA" || vacante.visibilidad === "AMBAS") && (
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800 rounded-xl px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wide">Interno (empleados)</p>
                <p className="text-xs text-gray-600 dark:text-zinc-300 truncate">{origin}/apply/interno/{vacante.slugInterno}</p>
              </div>
              <button onClick={() => copyLink("int")} className="flex-shrink-0 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 font-medium transition">
                Copiar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Applicants */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-gray-900 dark:text-white">
            Aplicantes ({aplicantes.length})
          </h2>
        </div>

        {loadingA ? (
          <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>
        ) : aplicantes.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm text-gray-400">Aún no hay aplicantes para esta vacante.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-zinc-800">
            {aplicantes.map(ap => (
              <div key={ap.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-zinc-800/40 cursor-pointer transition"
                onClick={() => setSelected(ap)}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {ap.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-gray-900 dark:text-zinc-100 truncate">{ap.nombre}</p>
                    {ap.tipo === "INTERNO" && (
                      <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full px-1.5 py-0.5 font-medium flex-shrink-0">
                        Interno
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">{ap.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {ap.cvUrl && (
                    <a href={ap.cvUrl} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-blue-600 hover:underline">CV</a>
                  )}
                  <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${ESTADO_AP[ap.estado]?.color ?? "bg-gray-100 text-gray-500"}`}>
                    {ESTADO_AP[ap.estado]?.label ?? ap.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Applicant detail drawer */}
      {selected && (
        <ApliCanteModal
          ap={selected}
          vacante={vacante}
          hiring={hiring}
          onClose={() => setSelected(null)}
          onChangeEstado={est => changeEstado(selected.id, est)}
          onContratar={() => contratar(selected.id)}
        />
      )}

      {editing && (
        <VacanteFormModal
          vacante={vacante}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

/* ── Applicant modal ─────────────────────────────────────────────────────── */
function ApliCanteModal({ ap, vacante, hiring, onClose, onChangeEstado, onContratar }:
  { ap: Aplicante; vacante: Vacante; hiring: boolean;
    onClose: () => void; onChangeEstado: (e: string) => void; onContratar: () => void }) {

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-zinc-900 px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-gray-900 dark:text-white">{ap.nombre}</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500">{ap.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {ap.telefono && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Teléfono</p>
                <p className="font-medium text-gray-800 dark:text-zinc-200">{ap.telefono}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Tipo</p>
              <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                ap.tipo === "INTERNO"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
              }`}>{ap.tipo}</span>
            </div>
            {ap.empleado && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400 mb-0.5">Empleado actual</p>
                <p className="font-medium text-gray-800 dark:text-zinc-200">
                  {ap.empleado.firstName} {ap.empleado.lastName}
                  {ap.empleado.jobTitle && <span className="text-gray-400"> — {ap.empleado.jobTitle}</span>}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Aplicó el</p>
              <p className="font-medium text-gray-800 dark:text-zinc-200">
                {new Date(ap.createdAt).toLocaleDateString("es-DO")}
              </p>
            </div>
          </div>

          {/* CV + files */}
          {(ap.cvUrl || ap.archivos.length > 0) && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Archivos</p>
              <div className="space-y-1.5">
                {ap.cvUrl && (
                  <a href={ap.cvUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline bg-blue-50 dark:bg-blue-900/10 rounded-lg px-3 py-2">
                    📄 Currículum Vitae
                  </a>
                )}
                {ap.archivos.map((a, i) => (
                  <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline bg-blue-50 dark:bg-blue-900/10 rounded-lg px-3 py-2">
                    📎 {a.nombre}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Answers */}
          {Object.keys(ap.respuestas).length > 0 && vacante.preguntas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Respuestas</p>
              <div className="space-y-3">
                {vacante.preguntas.map(p => ap.respuestas[p.id] && (
                  <div key={p.id}>
                    <p className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-0.5">{p.texto}</p>
                    <p className="text-sm text-gray-800 dark:text-zinc-200 bg-gray-50 dark:bg-zinc-800 rounded-lg px-3 py-2 whitespace-pre-wrap">
                      {ap.respuestas[p.id]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estado selector */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Estado</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ESTADO_AP).map(([key, { label, color }]) => (
                <button key={key} onClick={() => onChangeEstado(key)}
                  className={["text-xs rounded-full px-3 py-1 font-semibold transition border",
                    ap.estado === key
                      ? color + " border-transparent"
                      : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-700"
                  ].join(" ")}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Hire button */}
          {ap.estado !== "CONTRATADO" && ap.estado !== "RECHAZADO" && (
            <button onClick={onContratar} disabled={hiring}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {hiring ? "Contratando..." : "✅ Contratar — crear perfil de empleado"}
            </button>
          )}
          {ap.estado === "CONTRATADO" && (
            <div className="text-center text-sm text-emerald-600 dark:text-emerald-400 font-medium py-2">
              ✅ Este aplicante ya fue contratado
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── VacanteFormModal ────────────────────────────────────────────────────── */
function VacanteFormModal({ vacante, onClose, onSaved }:
  { vacante?: Vacante; onClose: () => void; onSaved: () => void }) {

  const isEdit = !!vacante;
  const [titulo,       setTitulo]       = useState(vacante?.titulo       ?? "");
  const [descripcion,  setDescripcion]  = useState(vacante?.descripcion  ?? "");
  const [requisitos,   setRequisitos]   = useState(vacante?.requisitos   ?? "");
  const [ubicacion,    setUbicacion]    = useState(vacante?.ubicacion    ?? "");
  const [tipo,         setTipo]         = useState(vacante?.tipo         ?? "TIEMPO_COMPLETO");
  const [estado,       setEstado]       = useState(vacante?.estado       ?? "ABIERTA");
  const [visibilidad,  setVisibilidad]  = useState<"EXTERNA"|"INTERNA"|"AMBAS">(vacante?.visibilidad ?? "AMBAS");
  const [preguntas,    setPreguntas]    = useState<Pregunta[]>(vacante?.preguntas ?? []);
  const [saving, setSaving] = useState(false);

  function addPregunta() {
    setPreguntas(p => [...p, { id: Date.now().toString(), texto: "", requerida: false }]);
  }
  function removePregunta(id: string) { setPreguntas(p => p.filter(q => q.id !== id)); }
  function updatePregunta(id: string, key: keyof Pregunta, val: string | boolean) {
    setPreguntas(p => p.map(q => q.id === id ? { ...q, [key]: val } : q));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { titulo, descripcion, requisitos, ubicacion, tipo, estado, visibilidad, preguntas };
      const url    = isEdit ? `/api/vacantes/${vacante.id}` : "/api/vacantes";
      const method = isEdit ? "PATCH" : "POST";
      const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); alert(d.error ?? "Error"); return; }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const inp = "w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const lbl = "block text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-zinc-900 px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="font-bold text-base text-gray-900 dark:text-white">
            {isEdit ? "Editar vacante" : "Nueva vacante"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        <form onSubmit={save} className="p-6 space-y-4">
          <div>
            <label className={lbl}>Título del puesto *</label>
            <input required value={titulo} onChange={e => setTitulo(e.target.value)} className={inp} placeholder="Ej: Analista de Sistemas" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Tipo de contrato</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className={inp}>
                {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Ubicación</label>
              <input value={ubicacion} onChange={e => setUbicacion(e.target.value)} className={inp} placeholder="Santo Domingo / Remoto" />
            </div>
          </div>
          {/* Visibilidad */}
          <div>
            <label className={lbl}>Visibilidad de la vacante</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { val: "EXTERNA",  icon: "🌐", title: "Externa",         desc: "Solo candidatos externos (público)" },
                { val: "INTERNA",  icon: "🏢", title: "Interna",         desc: "Solo empleados actuales" },
                { val: "AMBAS",    icon: "🔀", title: "Externa + Interna", desc: "Ambos tipos de candidatos" },
              ] as const).map(opt => (
                <button key={opt.val} type="button" onClick={() => setVisibilidad(opt.val)}
                  className={["rounded-xl border-2 p-3 text-left transition",
                    visibilidad === opt.val
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600"
                  ].join(" ")}>
                  <div className="text-lg mb-1">{opt.icon}</div>
                  <div className={`text-xs font-bold ${visibilidad === opt.val ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-zinc-300"}`}>
                    {opt.title}
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5 leading-tight">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {isEdit && (
            <div>
              <label className={lbl}>Estado</label>
              <select value={estado} onChange={e => setEstado(e.target.value as any)} className={inp}>
                <option value="ABIERTA">Abierta</option>
                <option value="PAUSADA">Pausada</option>
                <option value="CERRADA">Cerrada</option>
              </select>
            </div>
          )}
          <div>
            <label className={lbl}>Descripción</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} className={inp + " resize-none"} rows={3} placeholder="Describe la posición..." />
          </div>
          <div>
            <label className={lbl}>Requisitos</label>
            <textarea value={requisitos} onChange={e => setRequisitos(e.target.value)} className={inp + " resize-none"} rows={3} placeholder="Educación, experiencia, habilidades..." />
          </div>

          {/* Custom questions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={lbl + " mb-0"}>Preguntas para el aplicante</label>
              <button type="button" onClick={addPregunta} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">+ Agregar</button>
            </div>
            <div className="space-y-2">
              {preguntas.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800 rounded-xl p-3">
                  <span className="text-xs text-gray-400 w-4 flex-shrink-0">{i + 1}.</span>
                  <input
                    value={p.texto}
                    onChange={e => updatePregunta(p.id, "texto", e.target.value)}
                    placeholder="Escribe la pregunta..."
                    className="flex-1 bg-transparent text-sm text-gray-900 dark:text-zinc-100 focus:outline-none"
                  />
                  <label className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0 cursor-pointer">
                    <input type="checkbox" checked={p.requerida}
                      onChange={e => updatePregunta(p.id, "requerida", e.target.checked)}
                      className="rounded" />
                    Req.
                  </label>
                  <button type="button" onClick={() => removePregunta(p.id)}
                    className="text-gray-300 hover:text-red-400 flex-shrink-0">✕</button>
                </div>
              ))}
              {preguntas.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">Sin preguntas. Los aplicantes solo llenarán sus datos básicos.</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-bold text-white transition shadow-sm disabled:opacity-50">
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear vacante"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
