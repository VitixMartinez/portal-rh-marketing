"use client";

import { useEffect, useState } from "react";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
               "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_SEMANA = ["Do","Lu","Ma","Mi","Ju","Vi","Sa"];

const TIPO_LABEL: Record<string, string> = {
  VACACIONES:          "Vacaciones",
  PERMISO:             "Permiso",
  LICENCIA_MEDICA:     "Lic. Médica",
  LICENCIA_MATERNIDAD: "Lic. Maternidad",
  LICENCIA_PATERNIDAD: "Lic. Paternidad",
  OTRO:                "Otro",
};

type Entry = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  department: string | null;
  tipo: string;
  estado: "APROBADA" | "PENDIENTE";
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  color: string;
  isMe: boolean;
};

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function CalendarioEquipoPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  useEffect(() => {
    fetch("/api/portal/calendario")
      .then(r => r.ok ? r.json() : [])
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  // Days in current month
  const firstDay  = new Date(year, month, 1);
  const lastDay   = new Date(year, month + 1, 0);
  const startPad  = firstDay.getDay(); // 0=Sun
  const totalCells = startPad + lastDay.getDate();
  const rows = Math.ceil(totalCells / 7);

  // Build map: dateStr → entries
  const dayMap = new Map<string, Entry[]>();
  for (const e of entries) {
    let cur = new Date(e.fechaInicio + "T12:00:00");
    const end = new Date(e.fechaFin + "T12:00:00");
    while (cur <= end) {
      const k = ymd(cur);
      if (!dayMap.has(k)) dayMap.set(k, []);
      dayMap.get(k)!.push(e);
      cur = addDays(cur, 1);
    }
  }

  // List view — entries in current month
  const monthEntries = entries.filter(e => {
    const s = new Date(e.fechaInicio + "T12:00:00");
    const f = new Date(e.fechaFin + "T12:00:00");
    const mStart = new Date(year, month, 1);
    const mEnd   = new Date(year, month + 1, 0);
    return s <= mEnd && f >= mStart;
  }).sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const todayStr = ymd(today);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendario del Equipo</h1>
        <p className="text-sm text-gray-500 mt-1">
          Vacaciones y permisos aprobados — planifica con tu equipo.
        </p>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-4">
        <button onClick={prevMonth}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-lg font-semibold text-gray-800 min-w-[180px] text-center">
          {MESES[month]} {year}
        </span>
        <button onClick={nextMonth}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
          className="ml-2 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 transition">
          Hoy
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando...</div>
      ) : (
        <>
          {/* Calendar grid */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7">
              {Array.from({ length: rows * 7 }).map((_, i) => {
                const dayNum = i - startPad + 1;
                const isValid = dayNum >= 1 && dayNum <= lastDay.getDate();
                const dateStr = isValid ? `${year}-${String(month + 1).padStart(2,"0")}-${String(dayNum).padStart(2,"0")}` : "";
                const dayEntries = dateStr ? (dayMap.get(dateStr) ?? []) : [];
                const isToday = dateStr === todayStr;
                const isWeekend = (i % 7 === 0 || i % 7 === 6);

                return (
                  <div key={i}
                    className={`min-h-[80px] border-b border-r border-gray-100 p-1.5
                      ${!isValid ? "bg-gray-50/50" : isWeekend ? "bg-gray-50/30" : "bg-white"}`}>
                    {isValid && (
                      <>
                        <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1
                          ${isToday ? "bg-blue-600 text-white" : "text-gray-700"}`}>
                          {dayNum}
                        </div>
                        <div className="space-y-0.5">
                          {dayEntries.slice(0, 3).map(e => (
                            <div key={e.id}
                              title={`${e.firstName} ${e.lastName} — ${TIPO_LABEL[e.tipo] ?? e.tipo}${e.estado === "PENDIENTE" ? " (pendiente)" : ""}`}
                              className="truncate rounded px-1.5 py-0.5 text-white text-[10px] font-medium leading-tight"
                              style={{
                                backgroundColor: e.color,
                                opacity: e.estado === "PENDIENTE" ? 0.6 : 1,
                                border: e.isMe ? "1.5px solid rgba(0,0,0,0.3)" : "none",
                              }}
                            >
                              {e.isMe ? "📌 " : ""}{e.firstName}
                              {e.estado === "PENDIENTE" && " ⋯"}
                            </div>
                          ))}
                          {dayEntries.length > 3 && (
                            <div className="text-[10px] text-gray-400 pl-1">+{dayEntries.length - 3} más</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend / list for the month */}
          {monthEntries.length > 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">
                  Ausencias en {MESES[month]}
                  <span className="ml-2 text-sm font-normal text-gray-400">({monthEntries.length})</span>
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {monthEntries.map(e => (
                  <div key={e.id} className="flex items-center gap-4 px-5 py-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: e.color, opacity: e.estado === "PENDIENTE" ? 0.5 : 1 }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {e.firstName} {e.lastName}
                        {e.isMe && <span className="ml-1.5 text-xs text-blue-600">(yo)</span>}
                      </p>
                      <p className="text-xs text-gray-400">
                        {e.jobTitle ?? ""}{e.department ? ` · ${e.department}` : ""}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-medium text-gray-700">
                        {new Date(e.fechaInicio + "T12:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "short" })}
                        {" → "}
                        {new Date(e.fechaFin + "T12:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "short" })}
                      </p>
                      <p className="text-xs text-gray-400">{TIPO_LABEL[e.tipo] ?? e.tipo} · {e.dias}d</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      e.estado === "APROBADA"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {e.estado === "APROBADA" ? "Aprobada" : "Pendiente"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-12 text-center">
              <p className="text-gray-400 text-sm">No hay ausencias registradas para {MESES[month]}.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
