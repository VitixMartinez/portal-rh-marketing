"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* ── Types ─────────────────────────────────────────────────────────────── */
interface Terminacion {
  id: string;
  employeeId: string;
  empleadoNombre: string;
  empleadoPuesto: string | null;
  solicitadoPorNombre: string | null;
  razonPrimaria: string;
  fechaTerminacion: string;
  ultimoDiaTrabajo: string | null;
  pagoHasta: string | null;
  fechaRenuncia: string | null;
  elegibleRecontratacion: boolean;
  estado: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  comentarios: string | null;
  adjuntos: string;
  createdAt: string;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function parseTipo(razon: string): { tipo: string; detalle: string } {
  if (razon.startsWith("VOLUNTARIA:")) {
    return { tipo: "VOLUNTARIA", detalle: razon.replace("VOLUNTARIA:", "").trim() };
  }
  if (razon.startsWith("INVOLUNTARIA:")) {
    return { tipo: "INVOLUNTARIA", detalle: razon.replace("INVOLUNTARIA:", "").trim() };
  }
  return { tipo: "—", detalle: razon };
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
}

const ESTADO_STYLES: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-700 border border-amber-200",
  APROBADA:  "bg-emerald-100 text-emerald-700 border border-emerald-200",
  RECHAZADA: "bg-red-100 text-red-600 border border-red-200",
};
const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APROBADA:  "Aprobada",
  RECHAZADA: "Rechazada",
};

/* ── Main Component ─────────────────────────────────────────────────────── */
export default function TerminacionesPage() {
  const [lista, setLista]           = useState<Terminacion[]>([]);
  const [filtro, setFiltro]         = useState<"TODOS"|"PENDIENTE"|"APROBADA"|"RECHAZADA">("TODOS");
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Terminacion | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
  const [notasRechazo, setNotas]    = useState("");

  async function cargar() {
    setLoading(true);
    try {
      const url = filtro === "TODOS" ? "/api/terminaciones" : `/api/terminaciones?estado=${filtro}`;
      const res = await fetch(url);
      const data = await res.json();
      setLista(data.terminaciones ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, [filtro]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleDecision(id: string, estado: "APROBADA" | "RECHAZADA") {
    setProcesando(true);
    try {
      const res = await fetch(`/api/terminaciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar");
      showToast(estado === "APROBADA" ? "Terminación aprobada. El empleado fue marcado como inactivo." : "Terminación rechazada.", estado === "APROBADA");
      setSelected(null);
      cargar();
    } catch (err: any) {
      showToast(err.message, false);
    } finally {
      setProcesando(false);
    }
  }

  const pendientes = lista.filter(t => t.estado === "PENDIENTE").length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Terminaciones</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
            Gestiona y aprueba las solicitudes de terminación de empleados
          </p>
        </div>
        {pendientes > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold px-4 py-2 rounded-xl">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            {pendientes} pendiente{pendientes > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(["TODOS","PENDIENTE","APROBADA","RECHAZADA"] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filtro === f
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700"
            }`}>
            {f === "TODOS" ? "Todos" : ESTADO_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
            Cargando terminaciones...
          </div>
        ) : lista.length === 0 ? (
          <div className="p-16 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-200 dark:text-zinc-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-400 dark:text-zinc-500 text-sm">No hay terminaciones {filtro !== "TODOS" ? `con estado "${ESTADO_LABELS[filtro]}"` : "registradas"}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">Empleado</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">Tipo</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">Solicitado por</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">Fecha terminación</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
              {lista.map(t => {
                const { tipo } = parseTipo(t.razonPrimaria);
                return (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition group">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-gray-900 dark:text-white">{t.empleadoNombre}</div>
                      <div className="text-xs text-gray-400">{t.empleadoPuesto ?? "—"}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        tipo === "VOLUNTARIA" ? "bg-blue-50 text-blue-700" : tipo === "INVOLUNTARIA" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {tipo}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-zinc-300">{t.solicitadoPorNombre ?? "Sistema"}</td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-zinc-300">{fmtDate(t.fechaTerminacion)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${ESTADO_STYLES[t.estado]}`}>
                        {ESTADO_LABELS[t.estado]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => setSelected(t)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition">
                        Ver detalle →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8">

            {/* Modal Header */}
            <div className={`rounded-t-2xl px-6 py-5 flex items-start justify-between ${
              selected.estado === "PENDIENTE" ? "bg-gradient-to-r from-amber-600 to-amber-400" :
              selected.estado === "APROBADA"  ? "bg-gradient-to-r from-emerald-700 to-emerald-500" :
              "bg-gradient-to-r from-red-700 to-red-500"
            }`}>
              <div>
                <h2 className="text-white font-bold text-lg">Solicitud de Terminación</h2>
                <p className="text-white/80 text-sm mt-0.5">{selected.empleadoNombre} · {selected.empleadoPuesto ?? ""}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/70 hover:text-white transition mt-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="p-6 space-y-5">

              {/* Status */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${ESTADO_STYLES[selected.estado]}`}>
                  {ESTADO_LABELS[selected.estado]}
                </span>
                <span className="text-xs text-gray-400">Solicitado el {fmtDate(selected.createdAt)}</span>
              </div>

              {/* Tipo & Razón */}
              {(() => {
                const { tipo, detalle } = parseTipo(selected.razonPrimaria);
                return (
                  <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        tipo === "VOLUNTARIA" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                      }`}>{tipo}</span>
                      <span className="text-sm font-semibold text-gray-700 dark:text-zinc-200">{detalle}</span>
                    </div>
                    {selected.comentarios && (
                      <p className="text-sm text-gray-500 dark:text-zinc-400 italic">"{selected.comentarios}"</p>
                    )}
                  </div>
                );
              })()}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Fecha de terminación", value: fmtDate(selected.fechaTerminacion), required: true },
                  { label: "Último día de trabajo", value: fmtDate(selected.ultimoDiaTrabajo), required: true },
                  { label: "Pago hasta",            value: fmtDate(selected.pagoHasta),        required: true },
                  { label: "Fecha de renuncia",     value: fmtDate(selected.fechaRenuncia),    required: false },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 dark:bg-zinc-800 rounded-xl px-4 py-3">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-zinc-100">{value}</div>
                  </div>
                ))}
              </div>

              {/* Rehire & Requested by */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl px-4 py-3">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Elegible para recontratación</div>
                  <div className={`text-sm font-bold ${selected.elegibleRecontratacion ? "text-emerald-600" : "text-red-500"}`}>
                    {selected.elegibleRecontratacion ? "✓ Sí" : "✗ No"}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl px-4 py-3">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Solicitado por</div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-zinc-100">{selected.solicitadoPorNombre ?? "Sistema"}</div>
                </div>
              </div>

              {/* Documents */}
              {(() => {
                let docs: string[] = [];
                try { docs = JSON.parse(selected.adjuntos); } catch {}
                return docs.length > 0 ? (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Documentos adjuntos</div>
                    <div className="space-y-1.5">
                      {docs.map((url, i) => {
                        const name = url.split("/").pop() ?? `documento-${i+1}`;
                        const ext = name.split(".").pop()?.toUpperCase() ?? "FILE";
                        return (
                          <a key={i} href={url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2.5 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition text-sm text-blue-700 dark:text-blue-300">
                            <span className="text-xs font-bold bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-100 px-1.5 py-0.5 rounded">{ext}</span>
                            <span className="flex-1 truncate font-medium">{name}</span>
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Employee profile link */}
              <Link href={`/empleados/${selected.employeeId}`}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                Ver perfil del empleado
              </Link>

              {/* Actions — only for PENDIENTE */}
              {selected.estado === "PENDIENTE" && (
                <div className="border-t border-gray-100 dark:border-zinc-800 pt-4 space-y-3">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Decisión</p>
                  <div className="flex gap-3">
                    <button onClick={() => handleDecision(selected.id, "RECHAZADA")} disabled={procesando}
                      className="flex-1 py-2.5 border-2 border-red-300 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50">
                      {procesando ? "..." : "✗ Rechazar"}
                    </button>
                    <button onClick={() => handleDecision(selected.id, "APROBADA")} disabled={procesando}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
                      {procesando && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>}
                      {procesando ? "Procesando..." : "✓ Aprobar terminación"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 text-center">Al aprobar, el empleado será marcado como inactivo en el sistema de forma inmediata.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] px-5 py-3.5 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2.5 transition ${
          toast.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        }`}>
          <span>{toast.ok ? "✓" : "✗"}</span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
