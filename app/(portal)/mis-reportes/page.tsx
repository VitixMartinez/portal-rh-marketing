"use client";

import { useEffect, useState, useCallback } from "react";

const TIPO_LABEL: Record<string, string> = {
  VACACIONES:          "Vacaciones",
  PERMISO:             "Permiso",
  LICENCIA_MEDICA:     "Licencia Médica",
  LICENCIA_MATERNIDAD: "Lic. Maternidad",
  LICENCIA_PATERNIDAD: "Lic. Paternidad",
  OTRO:                "Otro",
};

type Solicitud = {
  id: string;
  tipo: string;
  estado: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  motivo: string | null;
  notas: string | null;
  createdAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    jobTitle: string | null;
    department: { name: string } | null;
  };
};

export default function MisReportesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState<string | null>(null);
  const [notasMap,    setNotasMap]    = useState<Record<string, string>>({});
  const [expanded,    setExpanded]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/portal/mis-reportes");
    setSolicitudes(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pendientes  = solicitudes.filter(s => s.estado === "PENDIENTE");
  const historial   = solicitudes.filter(s => s.estado !== "PENDIENTE");

  async function cambiarEstado(id: string, estado: "APROBADA" | "RECHAZADA") {
    setSaving(id);
    try {
      const res = await fetch(`/api/vacaciones/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ estado, notas: notasMap[id] ?? "" }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Error al actualizar");
        return;
      }
      await load();
      setExpanded(null);
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-24 text-gray-400">
        Cargando solicitudes...
      </div>
    );
  }

  if (solicitudes.length === 0) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">Mis Reportes Directos</h1>
        <p className="text-sm text-gray-500 mt-1 mb-8">Solicitudes de tiempo libre de tu equipo.</p>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-16 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No tienes reportes directos asignados.</p>
          <p className="text-gray-400 text-xs mt-1">Las solicitudes de tu equipo aparecerán aquí.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Reportes Directos</h1>
        <p className="text-sm text-gray-500 mt-1">Revisa y aprueba las solicitudes de tiempo libre de tu equipo.</p>
      </div>

      {/* Pendientes */}
      {pendientes.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
            Pendientes de revisión
            <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {pendientes.length}
            </span>
          </h2>
          <div className="space-y-3">
            {pendientes.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-yellow-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                    {s.employee.firstName[0]}{s.employee.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {s.employee.firstName} {s.employee.lastName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {s.employee.jobTitle ?? ""}
                          {s.employee.department ? ` · ${s.employee.department.name}` : ""}
                        </p>
                      </div>
                      <span className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-1 rounded-full flex-shrink-0">
                        ⏳ Pendiente
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { l: "Tipo",    v: TIPO_LABEL[s.tipo] ?? s.tipo },
                        { l: "Días",    v: `${s.dias} día${s.dias !== 1 ? "s" : ""}` },
                        { l: "Desde",   v: new Date(s.fechaInicio + "T12:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" }) },
                        { l: "Hasta",   v: new Date(s.fechaFin    + "T12:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" }) },
                      ].map(r => (
                        <div key={r.l} className="bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">{r.l}</p>
                          <p className="text-sm font-semibold text-gray-800 mt-0.5">{r.v}</p>
                        </div>
                      ))}
                    </div>

                    {s.motivo && (
                      <p className="mt-2 text-xs text-gray-500 italic">
                        Motivo: {s.motivo}
                      </p>
                    )}

                    {/* Notas + action buttons */}
                    <div className="mt-3 space-y-2">
                      {expanded === s.id && (
                        <textarea
                          value={notasMap[s.id] ?? ""}
                          onChange={e => setNotasMap(n => ({ ...n, [s.id]: e.target.value }))}
                          placeholder="Comentario opcional (se enviará al empleado)..."
                          rows={2}
                          className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => cambiarEstado(s.id, "APROBADA")}
                          disabled={saving === s.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition disabled:opacity-50"
                        >
                          {saving === s.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-30" cx="12" cy="12" r="10" stroke="white" strokeWidth="3"/>
                              <path fill="white" className="opacity-80" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          Aprobar
                        </button>
                        <button
                          onClick={() => cambiarEstado(s.id, "RECHAZADA")}
                          disabled={saving === s.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Rechazar
                        </button>
                        <button
                          onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition"
                        >
                          {expanded === s.id ? "Sin comentario" : "Añadir comentario"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Historial */}
      {historial.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Historial
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {historial.map(s => (
                <div key={s.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-semibold flex-shrink-0">
                    {s.employee.firstName[0]}{s.employee.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {s.employee.firstName} {s.employee.lastName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {TIPO_LABEL[s.tipo] ?? s.tipo} ·{" "}
                      {new Date(s.fechaInicio + "T12:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "short" })}
                      {" → "}
                      {new Date(s.fechaFin    + "T12:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "short" })}
                      {" · "}{s.dias}d
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    s.estado === "APROBADA"  ? "bg-green-100 text-green-700" :
                    s.estado === "RECHAZADA" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {s.estado === "APROBADA" ? "Aprobada" : s.estado === "RECHAZADA" ? "Rechazada" : "Pendiente"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
