"use client";

import { useState, useEffect } from "react";
import React from "react";

/* ── Types ─────────────────────────────────────────────────────────────── */
interface SolicitudCambio {
  id: string; campo: string; campoLabel: string;
  valorActual: string | null; valorNuevo: string;
  estado: string; motivo: string | null; notasAdmin: string | null;
  createdAt: string;
  employee: { id: string; firstName: string; lastName: string };
}

interface SolicitudTiempo {
  id: string; tipo: string; fechaInicio: string; fechaFin: string;
  dias: number; estado: string; motivo: string | null; notas: string | null;
  createdAt: string;
  employee: { id: string; firstName: string; lastName: string };
}

/* ── Helpers ───────────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  "bg-blue-500","bg-violet-500","bg-emerald-500","bg-amber-500",
  "bg-rose-500","bg-sky-500","bg-indigo-500","bg-teal-500"
];
function getAvatarColor(name: string): string {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const TIPO_TIEMPO: Record<string, { label: string; icon: "VACACIONES" | "PERMISO" | "LICENCIA_MEDICA" | "LICENCIA_MATERNIDAD" | "LICENCIA_PATERNIDAD" | "OTRO"; color: string }> = {
  VACACIONES:          { label: "Vacaciones",      icon: "VACACIONES", color: "bg-blue-100 text-blue-700"    },
  PERMISO:             { label: "Permiso",         icon: "PERMISO", color: "bg-amber-100 text-amber-700"  },
  LICENCIA_MEDICA:     { label: "Lic. Médica",     icon: "LICENCIA_MEDICA", color: "bg-red-100 text-red-700"      },
  LICENCIA_MATERNIDAD: { label: "Lic. Maternidad", icon: "LICENCIA_MATERNIDAD", color: "bg-pink-100 text-pink-700"    },
  LICENCIA_PATERNIDAD: { label: "Lic. Paternidad", icon: "LICENCIA_PATERNIDAD", color: "bg-indigo-100 text-indigo-700"},
  OTRO:                { label: "Otro",            icon: "OTRO", color: "bg-gray-100 text-gray-700"    },
};

function getIconSVG(iconType: string) {
  const icons: Record<string, React.JSX.Element> = {
    VACACIONES: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    PERMISO: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    LICENCIA_MEDICA: <span className="text-lg">🏥</span>,
    LICENCIA_MATERNIDAD: <span className="text-lg">👶</span>,
    LICENCIA_PATERNIDAD: <span className="text-lg">👨‍👧</span>,
    OTRO: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
  };
  return icons[iconType] || icons.OTRO;
}

function estadoBadge(estado: string) {
  const map: Record<string,string> = {
    PENDIENTE: "bg-amber-100 text-amber-700 border border-amber-200",
    APROBADA:  "bg-green-100 text-green-700 border border-green-200",
    RECHAZADA: "bg-red-100 text-red-700 border border-red-200",
  };
  const labels: Record<string,string> = { PENDIENTE:"Pendiente", APROBADA:"Aprobada", RECHAZADA:"Rechazada" };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${map[estado] || "bg-gray-100 text-gray-600"}`}>
      {labels[estado] || estado}
    </span>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function AprobacionesPage() {
  const [cambios,    setCambios]    = useState<SolicitudCambio[]>([]);
  const [tiempos,    setTiempos]    = useState<SolicitudTiempo[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState<"tiempo" | "cambios">("tiempo");
  const [filter,     setFilter]     = useState<"PENDIENTE" | "APROBADA" | "RECHAZADA" | "TODOS">("PENDIENTE");

  // Modal
  const [modalCambio,  setModalCambio]  = useState<SolicitudCambio | null>(null);
  const [modalTiempo,  setModalTiempo]  = useState<SolicitudTiempo | null>(null);
  const [accion,       setAccion]       = useState<"APROBADA" | "RECHAZADA">("APROBADA");
  const [notas,        setNotas]        = useState("");
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [c, t] = await Promise.all([
        fetch("/api/solicitudes-cambio"),
        fetch("/api/admin/solicitudes-tiempo"),
      ]);
      if (c.ok) setCambios(await c.json());
      if (t.ok) setTiempos(await t.json());
    } finally { setLoading(false); }
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function resolverCambio() {
    if (!modalCambio) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/solicitudes-cambio/${modalCambio.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: accion, notasAdmin: notas || null }),
      });
      if (res.ok) {
        showToast(accion === "APROBADA" ? "Cambio aprobado y aplicado" : "Solicitud rechazada", accion === "APROBADA");
        setModalCambio(null); setNotas("");
        await loadData();
      } else { const d = await res.json(); showToast(d.error || "Error", false); }
    } finally { setSaving(false); }
  }

  async function resolverTiempo() {
    if (!modalTiempo) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/solicitudes-tiempo/${modalTiempo.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: accion, notas: notas || null }),
      });
      if (res.ok) {
        showToast(accion === "APROBADA" ? "Solicitud aprobada" : "Solicitud rechazada", accion === "APROBADA");
        setModalTiempo(null); setNotas("");
        await loadData();
      } else { const d = await res.json(); showToast(d.error || "Error", false); }
    } finally { setSaving(false); }
  }

  const currentList  = tab === "cambios" ? cambios : tiempos;
  const filteredList = filter === "TODOS" ? currentList : currentList.filter(s => s.estado === filter);

  const pendingCambios = cambios.filter(s => s.estado === "PENDIENTE").length;
  const pendingTiempos = tiempos.filter(s => s.estado === "PENDIENTE").length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${toast.ok ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aprobaciones</h1>
          <p className="text-gray-500 text-sm mt-0.5">Solicitudes pendientes de revisión</p>
        </div>
        {(pendingCambios + pendingTiempos) > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm font-medium text-amber-700">{pendingCambios + pendingTiempos} pendiente{(pendingCambios + pendingTiempos) > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4 w-fit">
        {([
          { key: "tiempo",  label: "Tiempo Libre",    count: pendingTiempos },
          { key: "cambios", label: "Cambios de Datos", count: pendingCambios },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t.label}
            {t.count > 0 && <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 w-fit">
        {([
          { key: "PENDIENTE", label: "Pendientes" },
          { key: "APROBADA",  label: "Aprobadas"  },
          { key: "RECHAZADA", label: "Rechazadas" },
          { key: "TODOS",     label: "Todos"       },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {f.label}
            {f.key !== "TODOS" && (
              <span className="ml-1 opacity-60">{currentList.filter(s => s.estado === f.key).length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : filteredList.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-400 text-sm">No hay solicitudes en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* ── Solicitudes de TIEMPO ── */}
          {tab === "tiempo" && (filteredList as SolicitudTiempo[]).map(s => {
            const tipo     = TIPO_TIEMPO[s.tipo] || { label: s.tipo, icon: "📋", color: "bg-gray-100 text-gray-700" };
            const empName  = `${s.employee.firstName} ${s.employee.lastName}`;
            const initials = [s.employee.firstName, s.employee.lastName].map(w => w?.[0]).join("").toUpperCase();
            const color    = getAvatarColor(empName);
            return (
              <div key={s.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${s.estado === "PENDIENTE" ? "border-amber-100" : "border-gray-100"}`}>
                <div className="p-5 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${color}`}>{initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-semibold text-gray-900">{empName}</span>
                      {estadoBadge(s.estado)}
                      <span className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleDateString("es-DO")}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="text-current">{getIconSVG(tipo.icon)}</div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${tipo.color}`}>{tipo.label}</span>
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                          {new Date(s.fechaInicio).toLocaleDateString("es-DO", { day: "numeric", month: "short" })}
                          {" — "}
                          {new Date(s.fechaFin).toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{s.dias}d hábiles</span>
                      </div>
                    </div>
                    {s.motivo && <p className="text-xs text-gray-500 mt-1.5">Motivo: {s.motivo}</p>}
                    {s.notas  && <p className="text-xs text-amber-600 mt-1">Nota: {s.notas}</p>}
                  </div>
                  {s.estado === "PENDIENTE" && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button onClick={() => { setModalTiempo(s); setAccion("APROBADA"); setNotas(""); }}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">Aprobar</button>
                      <button onClick={() => { setModalTiempo(s); setAccion("RECHAZADA"); setNotas(""); }}
                        className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50">Rechazar</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* ── Solicitudes de CAMBIOS ── */}
          {tab === "cambios" && (filteredList as SolicitudCambio[]).map(s => {
            const empName  = `${s.employee.firstName} ${s.employee.lastName}`;
            const initials = [s.employee.firstName, s.employee.lastName].map(w => w?.[0]).join("").toUpperCase();
            const color    = getAvatarColor(empName);
            return (
              <div key={s.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${s.estado === "PENDIENTE" ? "border-amber-100" : "border-gray-100"}`}>
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${color}`}>{initials}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-semibold text-gray-900">{empName}</span>
                        {estadoBadge(s.estado)}
                        <span className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleDateString("es-DO")}</span>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 mb-2">
                        <p className="text-xs font-medium text-gray-500 mb-2">Campo: <span className="text-gray-700">{s.campoLabel}</span></p>
                        {s.campo === "photoUrl" ? (
                          /* ── Photo preview ── */
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-xs text-gray-400 mb-1.5">Actual</p>
                              {s.valorActual ? (
                                <img src={`/uploads/photos/${s.valorActual}`} alt="Actual"
                                  className="w-16 h-16 rounded-xl object-cover border border-gray-200 shadow-sm" />
                              ) : (
                                <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-lg ${getAvatarColor(`${s.employee.firstName} ${s.employee.lastName}`)}`}>
                                  {[s.employee.firstName, s.employee.lastName].map(w => w?.[0]).join("").toUpperCase()}
                                </div>
                              )}
                            </div>
                            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            <div className="text-center">
                              <p className="text-xs text-blue-400 mb-1.5">Nueva foto</p>
                              <img src={`/uploads/photos/${s.valorNuevo}`} alt="Nueva foto"
                                className="w-16 h-16 rounded-xl object-cover border-2 border-blue-300 shadow-sm" />
                            </div>
                          </div>
                        ) : (
                          /* ── Text field diff ── */
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2">
                              <p className="text-xs text-gray-400 mb-0.5">Actual</p>
                              <p className="text-sm text-gray-700">{s.valorActual || <span className="italic text-gray-400">Sin datos</span>}</p>
                            </div>
                            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                              <p className="text-xs text-blue-400 mb-0.5">Nuevo</p>
                              <p className="text-sm font-medium text-blue-800">{s.valorNuevo}</p>
                            </div>
                          </div>
                        )}
                        {s.motivo && <p className="text-xs text-gray-500 mt-2">Motivo: {s.motivo}</p>}
                      </div>
                      {s.notasAdmin && <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5">Nota: {s.notasAdmin}</p>}
                    </div>
                    {s.estado === "PENDIENTE" && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => { setModalCambio(s); setAccion("APROBADA"); setNotas(""); }}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">Aprobar</button>
                        <button onClick={() => { setModalCambio(s); setAccion("RECHAZADA"); setNotas(""); }}
                          className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50">Rechazar</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: resolver solicitud de TIEMPO ── */}
      {modalTiempo && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className={`px-6 py-5 border-b border-gray-100 ${accion === "APROBADA" ? "bg-green-50" : "bg-red-50"}`}>
              <h3 className={`font-semibold text-lg ${accion === "APROBADA" ? "text-green-800" : "text-red-800"}`}>
                {accion === "APROBADA" ? "Aprobar solicitud" : "Rechazar solicitud"}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {modalTiempo.employee.firstName} {modalTiempo.employee.lastName} — {TIPO_TIEMPO[modalTiempo.tipo]?.label || modalTiempo.tipo}
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm text-gray-700">
                <span>
                  {new Date(modalTiempo.fechaInicio).toLocaleDateString("es-DO", { day: "numeric", month: "long" })}
                  {" al "}
                  {new Date(modalTiempo.fechaFin).toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric" })}
                </span>
                <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{modalTiempo.dias} días hábiles</span>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">Nota al empleado (opcional)</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
                  placeholder="Explica el motivo de tu decisión..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setModalTiempo(null); setNotas(""); }}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button onClick={resolverTiempo} disabled={saving}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${accion === "APROBADA" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
                  {saving ? "Procesando..." : accion === "APROBADA" ? "Confirmar aprobación" : "Confirmar rechazo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: resolver CAMBIO DE DATOS ── */}
      {modalCambio && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className={`px-6 py-5 border-b border-gray-100 ${accion === "APROBADA" ? "bg-green-50" : "bg-red-50"}`}>
              <h3 className={`font-semibold text-lg ${accion === "APROBADA" ? "text-green-800" : "text-red-800"}`}>
                {accion === "APROBADA" ? "Aprobar cambio" : "Rechazar cambio"}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{modalCambio.employee.firstName} {modalCambio.employee.lastName} — {modalCambio.campoLabel}</p>
            </div>
            <div className="px-6 py-5">
              {accion === "APROBADA" && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 text-sm text-blue-700">
                  <strong>Este cambio se aplicará automáticamente</strong> al perfil del empleado.
                </div>
              )}
              {modalCambio.campo === "photoUrl" ? (
                <div className="flex items-center justify-center gap-6 mb-4 py-2">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-2">Foto actual</p>
                    {modalCambio.valorActual ? (
                      <img src={`/uploads/photos/${modalCambio.valorActual}`} alt="Actual"
                        className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                    ) : (
                      <div className={`w-20 h-20 rounded-xl flex items-center justify-center text-white font-bold text-xl ${getAvatarColor(`${modalCambio.employee.firstName} ${modalCambio.employee.lastName}`)}`}>
                        {[modalCambio.employee.firstName, modalCambio.employee.lastName].map(w => w?.[0]).join("").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <div className="text-center">
                    <p className="text-xs text-blue-400 mb-2">Nueva foto</p>
                    <img src={`/uploads/photos/${modalCambio.valorNuevo}`} alt="Nueva"
                      className="w-20 h-20 rounded-xl object-cover border-2 border-blue-300" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">{modalCambio.valorActual || "—"}</div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <div className="flex-1 bg-blue-50 rounded-lg px-3 py-2 text-sm font-medium text-blue-800">{modalCambio.valorNuevo}</div>
                </div>
              )}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">Nota al empleado (opcional)</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
                  placeholder="Explica el motivo de tu decisión..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setModalCambio(null); setNotas(""); }}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button onClick={resolverCambio} disabled={saving}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${accion === "APROBADA" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
                  {saving ? "Procesando..." : accion === "APROBADA" ? "Confirmar aprobación" : "Confirmar rechazo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
