"use client";

import { useEffect, useState, useCallback } from "react";

type EventoTipo = "cumpleanos" | "aniversario" | "vacacion" | "feriado";

type Evento = {
  id:        string;
  fecha:     Date;
  titulo:    string;
  subtitulo?: string;
  tipo:      EventoTipo;
  custom?:   boolean;
};

type FeriadoCustom = { id: string; mes: number; dia: number; nombre: string };

// ── Absence codes (shared definition, same as asistencia page) ──────────────
const AUSENCIA_CODES_CAL = [
  { code: "V",  label: "Vacaciones",           bgClass: "bg-emerald-500", textClass: "text-white" },
  { code: "E",  label: "Enfermedad",            bgClass: "bg-blue-500",    textClass: "text-white" },
  { code: "M",  label: "Maternidad",            bgClass: "bg-pink-500",    textClass: "text-white" },
  { code: "P",  label: "Paternidad",            bgClass: "bg-indigo-500",  textClass: "text-white" },
  { code: "N",  label: "Nacimiento",            bgClass: "bg-cyan-500",    textClass: "text-white" },
  { code: "C",  label: "Matrimonio",            bgClass: "bg-violet-500",  textClass: "text-white" },
  { code: "D",  label: "Duelo",                 bgClass: "bg-zinc-500",    textClass: "text-white" },
  { code: "SG", label: "Sin goce",              bgClass: "bg-orange-500",  textClass: "text-white" },
  { code: "LT", label: "Lactancia",             bgClass: "bg-rose-500",    textClass: "text-white" },
  { code: "AU", label: "Ausencia injustificada",bgClass: "bg-red-600",     textClass: "text-white" },
] as const;
const AUSENCIA_MAP_CAL = Object.fromEntries(AUSENCIA_CODES_CAL.map(c => [c.code, c]));

/* ── Easter (Meeus/Jones/Butcher) ──────────────────────────────────────── */
function calcEaster(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/* ── Ley 139-97: traslado a lunes ──────────────────────────────────────── */
function lunes139(year: number, mes: number, dia: number): { mes: number; dia: number } {
  const d = new Date(year, mes - 1, dia);
  const dow = d.getDay();
  if (dow === 1) return { mes, dia };
  const offset = dow >= 2 && dow <= 4 ? -(dow - 1) : (8 - dow) % 7;
  const t = new Date(d); t.setDate(d.getDate() + offset);
  return { mes: t.getMonth() + 1, dia: t.getDate() };
}

/* ── Feriados estándar por año ─────────────────────────────────────────── */
function getFeriadosEstandar(year: number): Array<{ mes: number; dia: number; nombre: string }> {
  const easter   = calcEaster(year);
  const viernesD = new Date(easter); viernesD.setDate(easter.getDate() - 2);
  const corpusD  = new Date(easter); corpusD.setDate(easter.getDate() + 60);
  const reyes    = lunes139(year, 1, 6);
  const trabajo  = lunes139(year, 5, 1);
  const constit  = lunes139(year, 11, 6);
  return [
    { mes: 1, dia: 1,  nombre: "Año Nuevo" },
    { mes: reyes.mes,  dia: reyes.dia,  nombre: "Día de Reyes" },
    { mes: 1, dia: 21, nombre: "Día de la Altagracia" },
    { mes: 1, dia: 26, nombre: "Día de Duarte" },
    { mes: 2, dia: 27, nombre: "Día de la Independencia" },
    { mes: viernesD.getMonth() + 1, dia: viernesD.getDate(), nombre: "Viernes Santo" },
    { mes: trabajo.mes, dia: trabajo.dia, nombre: "Día del Trabajo" },
    { mes: corpusD.getMonth() + 1,  dia: corpusD.getDate(),  nombre: "Corpus Christi" },
    { mes: 8,  dia: 16, nombre: "Restauración" },
    { mes: 9,  dia: 24, nombre: "Día de las Mercedes" },
    { mes: constit.mes, dia: constit.dia, nombre: "Día de la Constitución" },
    { mes: 12, dia: 25, nombre: "Navidad" },
  ];
}

const TIPO_COLOR: Record<EventoTipo, string> = {
  cumpleanos:  "bg-pink-100 text-pink-800 border border-pink-200 dark:bg-pink-900/40 dark:text-pink-200 dark:border-pink-700/40",
  aniversario: "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700/40",
  vacacion:    "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700/40",
  feriado:     "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700/40",
};

const TIPO_ICON: Record<EventoTipo, string> = {
  cumpleanos:  "🎂",
  aniversario: "🎉",
  vacacion:    "🏖️",
  feriado:     "🇩🇴",
};

const MESES_LABEL = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_SEMANA = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

// Type for calendar absence entries
type CalAusencia = {
  employeeId:   string;
  firstName:    string;
  lastName:     string;
  ausenciaCode: string;
  estado:       string;
};

export default function CalendarioPage() {
  const [eventos,          setEventos]          = useState<Evento[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [mesActual,        setMesActual]        = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [diaSeleccionado,  setDiaSeleccionado]  = useState<Date | null>(null);
  const [customFeriados,   setCustomFeriados]   = useState<FeriadoCustom[]>([]);
  const [ausenciasMes,     setAusenciasMes]     = useState<Record<string, CalAusencia[]>>({}); // key: "YYYY-MM-DD"

  // Panel gestionar feriados
  const [gestionPanel,     setGestionPanel]     = useState(false);
  const [gestionFeriados,  setGestionFeriados]  = useState<Array<{ id?: string; mes: number; dia: number; nombre: string; estandar: boolean }>>([]);
  const [nuevoNombre,      setNuevoNombre]      = useState("");
  const [nuevoMes,         setNuevoMes]         = useState(1);
  const [nuevoDia,         setNuevoDia]         = useState(1);
  const [savingFeriado,    setSavingFeriado]     = useState(false);

  const loadCustomFeriados = useCallback(async (year: number) => {
    try {
      const res = await fetch(`/api/feriados?year=${year}`);
      const data = await res.json();
      setCustomFeriados(Array.isArray(data) ? data : []);
    } catch { setCustomFeriados([]); }
  }, []);

  const loadAusencias = useCallback(async (year: number, month: number) => {
    try {
      const mes = `${year}-${String(month + 1).padStart(2, "0")}`;
      const res = await fetch(`/api/asistencia?mes=${mes}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      // Group by date, only include records with an ausenciaCode
      const grouped: Record<string, CalAusencia[]> = {};
      for (const a of data) {
        if (!a.ausenciaCode) continue;
        const key = a.fecha?.slice?.(0, 10) ?? new Date(a.fecha).toISOString().slice(0, 10);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({
          employeeId:   a.employeeId,
          firstName:    a.employee?.firstName ?? "",
          lastName:     a.employee?.lastName  ?? "",
          ausenciaCode: a.ausenciaCode,
          estado:       a.estado,
        });
      }
      setAusenciasMes(grouped);
    } catch { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, solRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/vacaciones?estado=APROBADA"),
      ]);
      const employees   = empRes.ok ? await empRes.json() : [];
      const solicitudes = solRes.ok ? await solRes.json() : [];
      const year = mesActual.year;

      await loadCustomFeriados(year);
      await loadAusencias(year, mesActual.month);

      const ev: Evento[] = [];

      if (Array.isArray(employees)) {
        employees.forEach((emp: any) => {
          if (emp.birthDate) {
            const bd = new Date(emp.birthDate);
            ev.push({ id: `bday-${emp.id}`, fecha: new Date(year, bd.getMonth(), bd.getDate()),
              titulo: `${emp.firstName} ${emp.lastName}`, subtitulo: "Cumpleaños", tipo: "cumpleanos" });
          }
          if (emp.hireDate) {
            const hd = new Date(emp.hireDate);
            if (hd.getFullYear() < year) {
              const anios = year - hd.getFullYear();
              ev.push({ id: `aniv-${emp.id}`, fecha: new Date(year, hd.getMonth(), hd.getDate()),
                titulo: `${emp.firstName} ${emp.lastName}`,
                subtitulo: anios % 5 === 0 ? `¡${anios} años en la empresa! 🏆` : `${anios} año${anios !== 1 ? "s" : ""} en la empresa`,
                tipo: "aniversario" });
            }
          }
        });
      }

      if (Array.isArray(solicitudes)) {
        solicitudes.forEach((s: any) => {
          const inicio = new Date(s.fechaInicio);
          if (inicio.getFullYear() === year) {
            ev.push({ id: `vac-${s.id}`, fecha: inicio,
              titulo: `${s.employee.firstName} ${s.employee.lastName}`,
              subtitulo: `Vacaciones (${s.dias} días)`, tipo: "vacacion" });
          }
        });
      }

      getFeriadosEstandar(year).forEach(f => {
        ev.push({ id: `feriado-${f.mes}-${f.dia}`, fecha: new Date(year, f.mes - 1, f.dia),
          titulo: f.nombre, subtitulo: "Feriado nacional 🇩🇴", tipo: "feriado" });
      });

      setEventos(ev);
    } finally { setLoading(false); }
  }, [mesActual.year, mesActual.month, loadCustomFeriados, loadAusencias]);

  useEffect(() => { load(); }, [load]);

  // Construir eventos combinados (estándar + custom)
  const year = mesActual.year;
  const eventosConCustom: Evento[] = [
    ...eventos,
    ...customFeriados.map(f => ({
      id: `custom-${f.id}`,
      fecha: new Date(year, f.mes - 1, f.dia),
      titulo: f.nombre,
      subtitulo: "Feriado adicional 🇩🇴",
      tipo: "feriado" as EventoTipo,
      custom: true,
    })),
  ];

  // Grid del mes
  const primerDia = new Date(mesActual.year, mesActual.month, 1);
  const ultimoDia = new Date(mesActual.year, mesActual.month + 1, 0);
  const startPad  = primerDia.getDay();
  const diasGrid: Array<Date | null> = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: ultimoDia.getDate() }, (_, i) => new Date(mesActual.year, mesActual.month, i + 1)),
  ];
  while (diasGrid.length % 7 !== 0) diasGrid.push(null);

  function eventosDia(dia: Date): Evento[] {
    return eventosConCustom.filter(e =>
      e.fecha.getDate()     === dia.getDate() &&
      e.fecha.getMonth()    === dia.getMonth() &&
      e.fecha.getFullYear() === dia.getFullYear()
    );
  }

  function ausenciasDia(dia: Date): CalAusencia[] {
    const key = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}-${String(dia.getDate()).padStart(2, "0")}`;
    return ausenciasMes[key] ?? [];
  }

  const hoy = new Date();

  const proximos = eventosConCustom
    .filter(e =>
      e.fecha.getMonth()    === mesActual.month &&
      e.fecha.getFullYear() === mesActual.year
    )
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  function mesAnterior() {
    setDiaSeleccionado(null);
    setMesActual(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 });
  }
  function mesSiguiente() {
    setDiaSeleccionado(null);
    setMesActual(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 });
  }

  function openGestion() {
    const estandar = getFeriadosEstandar(mesActual.year).map(f => ({ mes: f.mes, dia: f.dia, nombre: f.nombre, estandar: true }));
    const custom   = customFeriados.map(f => ({ id: f.id, mes: f.mes, dia: f.dia, nombre: f.nombre, estandar: false }));
    setGestionFeriados([...estandar, ...custom].sort((a, b) => a.mes - b.mes || a.dia - b.dia));
    setNuevoNombre(""); setNuevoMes(1); setNuevoDia(1);
    setGestionPanel(true);
  }

  async function addFeriado() {
    if (!nuevoNombre.trim()) return;
    setSavingFeriado(true);
    try {
      const res = await fetch("/api/feriados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: mesActual.year, mes: nuevoMes, dia: nuevoDia, nombre: nuevoNombre.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      setCustomFeriados(prev => [...prev, data]);
      setGestionFeriados(prev => [...prev, { id: data.id, mes: nuevoMes, dia: nuevoDia, nombre: nuevoNombre.trim(), estandar: false }]
        .sort((a, b) => a.mes - b.mes || a.dia - b.dia));
      setNuevoNombre(""); setNuevoMes(1); setNuevoDia(1);
    } finally { setSavingFeriado(false); }
  }

  async function deleteFeriado(id: string) {
    try {
      await fetch(`/api/feriados?id=${id}`, { method: "DELETE" });
      setCustomFeriados(prev => prev.filter(f => f.id !== id));
      setGestionFeriados(prev => prev.filter(f => f.id !== id));
    } catch (e: any) { alert(e.message); }
  }

  const diaEv  = diaSeleccionado ? eventosDia(diaSeleccionado) : [];
  const diaAus = diaSeleccionado ? ausenciasDia(diaSeleccionado) : [];

  // Collect which absence codes are used this month for the legend
  const usedCodes = new Set(
    Object.values(ausenciasMes).flat().map(a => a.ausenciaCode)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendario</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Cumpleaños, aniversarios, vacaciones, feriados y ausencias.</p>
        </div>
        <button
          onClick={openGestion}
          className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition shadow-sm"
        >
          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Gestionar feriados {mesActual.year}
        </button>
      </div>

      {/* Leyenda eventos */}
      <div className="flex gap-2 flex-wrap">
        {(Object.entries(TIPO_ICON) as [EventoTipo, string][]).map(([tipo, icon]) => (
          <span key={tipo} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${TIPO_COLOR[tipo]}`}>
            {icon} {tipo === "cumpleanos" ? "Cumpleaños" : tipo === "aniversario" ? "Aniversario" : tipo === "vacacion" ? "Vacaciones" : "Feriado"}
          </span>
        ))}
      </div>

      {/* ── Calendario — ancho completo ─────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6">
        <div className="flex items-center justify-between mb-5">
          <button onClick={mesAnterior} className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">← Anterior</button>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{MESES_LABEL[mesActual.month]} {mesActual.year}</h2>
          <button onClick={mesSiguiente} className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">Siguiente →</button>
        </div>

        {/* Cabecera días */}
        <div className="grid grid-cols-7 mb-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide py-1">{d}</div>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-500">Cargando...</div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {diasGrid.map((dia, i) => {
              if (!dia) return <div key={`pad-${i}`} className="min-h-[90px]" />;
              const ev             = eventosDia(dia);
              const aus            = ausenciasDia(dia);
              const esHoy          = dia.toDateString() === hoy.toDateString();
              const esSeleccionado = diaSeleccionado?.toDateString() === dia.toDateString();
              const feriado        = ev.find(e => e.tipo === "feriado");
              const cumples        = ev.filter(e => e.tipo === "cumpleanos");
              const anivs          = ev.filter(e => e.tipo === "aniversario");
              const vacs           = ev.filter(e => e.tipo === "vacacion");

              /* ── Feriado: celda roja con nombre ── */
              if (feriado && !esSeleccionado) {
                return (
                  <button key={dia.toISOString()} onClick={() => setDiaSeleccionado(dia)}
                    className="min-h-[90px] rounded-xl p-2 text-left transition-opacity hover:opacity-85 flex flex-col"
                    style={{ backgroundColor: feriado.custom ? "#b91c1c" : "#dc2626" }}>
                    <span className="text-sm font-bold text-white leading-none">{dia.getDate()}</span>
                    <span className="text-[10px] font-semibold text-white leading-snug mt-1.5 line-clamp-3 opacity-95 break-words w-full">{feriado.titulo}</span>
                    {cumples.length > 0 && <span className="text-base mt-auto leading-none">🎂</span>}
                  </button>
                );
              }

              /* ── Día normal ── */
              return (
                <button key={dia.toISOString()} onClick={() => setDiaSeleccionado(dia)}
                  className={`min-h-[90px] rounded-xl p-2 transition flex flex-col items-start border ${
                    esSeleccionado
                      ? "bg-blue-600 border-blue-600 text-white"
                      : esHoy
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60 border-transparent text-zinc-700 dark:text-zinc-300"
                  }`}>
                  <span className={`font-bold text-sm leading-none mb-1.5 ${esHoy && !esSeleccionado ? "text-blue-600 dark:text-blue-400" : ""}`}>
                    {dia.getDate()}
                  </span>
                  <div className="flex flex-col gap-1 w-full">
                    {/* Cumpleaños */}
                    {cumples.slice(0, 2).map(e => (
                      <div key={e.id} className={`rounded-md px-1.5 py-0.5 flex items-center gap-1 ${esSeleccionado ? "bg-white/25 text-white" : "bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-200"}`}>
                        <span className="text-xs leading-none flex-shrink-0">🎂</span>
                        <span className="text-[9px] font-semibold leading-tight truncate">{e.titulo.split(" ")[0]}</span>
                      </div>
                    ))}
                    {cumples.length > 2 && (
                      <span className={`text-[9px] font-semibold px-1 ${esSeleccionado ? "text-white/80" : "text-pink-600 dark:text-pink-400"}`}>
                        +{cumples.length - 2} 🎂
                      </span>
                    )}
                    {/* Aniversarios */}
                    {anivs.slice(0, 2).map(e => (
                      <div key={e.id} className={`rounded-md px-1.5 py-0.5 flex items-center gap-1 ${esSeleccionado ? "bg-white/25 text-white" : "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200"}`}>
                        <span className="text-xs leading-none flex-shrink-0">🎉</span>
                        <span className="text-[9px] font-semibold leading-tight truncate">{e.titulo.split(" ")[0]}</span>
                      </div>
                    ))}
                    {/* Vacaciones */}
                    {vacs.slice(0, 1).map(e => (
                      <div key={e.id} className={`rounded-md px-1.5 py-0.5 flex items-center gap-1 ${esSeleccionado ? "bg-white/25 text-white" : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200"}`}>
                        <span className="text-xs leading-none flex-shrink-0">🏖️</span>
                        <span className="text-[9px] font-semibold leading-tight truncate">{e.titulo.split(" ")[0]}</span>
                      </div>
                    ))}
                    {/* Absence code badges */}
                    {aus.slice(0, 2).map((a, idx) => {
                      const cInfo = AUSENCIA_MAP_CAL[a.ausenciaCode];
                      if (!cInfo) return null;
                      return (
                        <div key={idx} className={`rounded-md px-1.5 py-0.5 flex items-center gap-1 ${esSeleccionado ? "bg-white/25 text-white" : `${cInfo.bgClass} ${cInfo.textClass}`}`}>
                          <span className="text-[9px] font-bold font-mono leading-none">{cInfo.code}</span>
                          <span className="text-[9px] font-semibold leading-tight truncate">{a.firstName}</span>
                        </div>
                      );
                    })}
                    {aus.length > 2 && (
                      <span className={`text-[9px] font-semibold px-1 ${esSeleccionado ? "text-white/80" : "text-zinc-500"}`}>
                        +{aus.length - 2} aus.
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Detalle día seleccionado */}
        {diaSeleccionado && (diaEv.length > 0 || diaAus.length > 0) && (
          <div className="mt-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-4">
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
              {diaSeleccionado.toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {diaEv.map(e => (
                <div key={e.id} className={`rounded-lg px-3 py-2.5 flex items-start gap-2 ${TIPO_COLOR[e.tipo]}`}>
                  <span className="text-base leading-none mt-0.5 flex-shrink-0">{TIPO_ICON[e.tipo]}</span>
                  <div>
                    <div className="text-sm font-semibold leading-tight">{e.titulo}</div>
                    {e.subtitulo && <div className="text-xs mt-0.5 opacity-75">{e.subtitulo}</div>}
                  </div>
                </div>
              ))}
              {diaAus.map((a, idx) => {
                const cInfo = AUSENCIA_MAP_CAL[a.ausenciaCode];
                return (
                  <div key={idx} className={`rounded-lg px-3 py-2.5 flex items-start gap-2 ${cInfo ? `${cInfo.bgClass} ${cInfo.textClass}` : "bg-zinc-200 text-zinc-700"}`}>
                    <span className="font-mono text-base font-bold leading-none mt-0.5 flex-shrink-0">{a.ausenciaCode}</span>
                    <div>
                      <div className="text-sm font-semibold leading-tight">{a.firstName} {a.lastName}</div>
                      <div className="text-xs mt-0.5 opacity-85">{cInfo?.label ?? a.ausenciaCode} · {a.estado}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Leyenda de Códigos de Ausencia ─────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-blue-600 rounded-full" />
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Códigos de Ausencia — Ley 16-92 del Código de Trabajo</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {([
            { code: "V",  label: "Vacaciones",            ley: "Art. 177 – 14 días/año",      bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800", codeBg: "bg-emerald-500", codeText: "text-white" },
            { code: "E",  label: "Enfermedad",             ley: "",  bg: "bg-blue-50 dark:bg-blue-900/20",     border: "border-blue-200 dark:border-blue-800",     codeBg: "bg-blue-500",    codeText: "text-white" },
            { code: "M",  label: "Maternidad",             ley: "Art. 236 – 14 semanas",        bg: "bg-pink-50 dark:bg-pink-900/20",     border: "border-pink-200 dark:border-pink-800",     codeBg: "bg-pink-500",    codeText: "text-white" },
            { code: "P",  label: "Paternidad",             ley: "Art. 54 – 2 días hábiles",     bg: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-200 dark:border-indigo-800", codeBg: "bg-indigo-500",  codeText: "text-white" },
            { code: "N",  label: "Nacimiento de hijo",     ley: "Art. 54 – 2 días (padre)",     bg: "bg-cyan-50 dark:bg-cyan-900/20",     border: "border-cyan-200 dark:border-cyan-800",     codeBg: "bg-cyan-500",    codeText: "text-white" },
            { code: "C",  label: "Matrimonio",             ley: "Art. 54 – 5 días con goce",    bg: "bg-violet-50 dark:bg-violet-900/20", border: "border-violet-200 dark:border-violet-800", codeBg: "bg-violet-500",  codeText: "text-white" },
            { code: "D",  label: "Duelo / Fallecimiento",  ley: "Art. 54 – 3 días",             bg: "bg-zinc-100 dark:bg-zinc-800/50",    border: "border-zinc-300 dark:border-zinc-700",     codeBg: "bg-zinc-500",    codeText: "text-white" },
            { code: "SG", label: "Sin goce de sueldo",     ley: "Permiso sin remuneración",     bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800", codeBg: "bg-orange-500",  codeText: "text-white" },
            { code: "LT", label: "Lactancia",              ley: "Art. 241 – descansos diarios", bg: "bg-rose-50 dark:bg-rose-900/20",     border: "border-rose-200 dark:border-rose-800",     codeBg: "bg-rose-500",    codeText: "text-white" },
            { code: "AU", label: "Ausencia injustificada", ley: "Sin documentación",            bg: "bg-red-50 dark:bg-red-900/20",       border: "border-red-200 dark:border-red-800",       codeBg: "bg-red-600",     codeText: "text-white" },
          ] as const).map(c => (
            <div key={c.code} className={`flex items-start gap-2 rounded-xl p-3 border ${c.bg} ${c.border} ${usedCodes.has(c.code) ? "ring-2 ring-offset-1 ring-blue-400 dark:ring-blue-600" : ""}`}>
              <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded-md shrink-0 mt-0.5 ${c.codeBg} ${c.codeText}`}>
                {c.code}
              </span>
              <div>
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 leading-tight">{c.label}</div>
                {c.ley && <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">{c.ley}</div>}
              </div>
            </div>
          ))}
        </div>
        {usedCodes.size > 0 && (
          <p className="text-xs text-zinc-400 mt-3">
            💡 Los códigos con borde azul tienen registros en el mes seleccionado.
          </p>
        )}
      </div>

      {/* ── Eventos del mes — tira horizontal ──────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
          Eventos de {MESES_LABEL[mesActual.month]}
        </h2>
        {loading ? (
          <p className="text-sm text-zinc-500 mt-3">Cargando...</p>
        ) : proximos.length === 0 ? (
          <p className="text-sm text-zinc-400 mt-3">Sin eventos registrados este mes.</p>
        ) : (
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {proximos.map(e => {
              const diff = Math.ceil((e.fecha.getTime() - hoy.getTime()) / 86400000);
              const isPast = e.fecha < hoy && e.fecha.toDateString() !== hoy.toDateString();
              return (
                <div key={e.id}
                  className={`shrink-0 rounded-xl p-3 w-44 transition-opacity ${isPast ? "opacity-50" : ""} ${TIPO_COLOR[e.tipo]}`}>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-lg leading-none">{TIPO_ICON[e.tipo]}</span>
                    <span className="text-xs font-bold whitespace-nowrap">
                      {diff === 0 ? "Hoy" : diff === 1 ? "Mañana" : diff < 0 ? `hace ${Math.abs(diff)}d` : `en ${diff}d`}
                    </span>
                  </div>
                  <p className="text-xs font-semibold leading-snug line-clamp-2">{e.titulo}</p>
                  {e.subtitulo && <p className="text-xs opacity-70 mt-0.5 line-clamp-1">{e.subtitulo}</p>}
                  <p className="text-xs opacity-60 mt-1.5 font-medium">
                    {e.fecha.toLocaleDateString("es-DO", { weekday: "short", day: "numeric" })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Panel gestionar feriados ──────────────────────────────────────── */}
      {gestionPanel && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setGestionPanel(false)} />
          <div className="fixed right-0 top-0 h-screen w-full max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">Feriados {mesActual.year}</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Los estándar se calculan automáticamente · Puedes añadir feriados extra
                </p>
              </div>
              <button onClick={() => setGestionPanel(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1.5">
              {gestionFeriados.map((f, idx) => (
                <div key={f.id ?? `std-${idx}`}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${f.estandar ? "bg-zinc-50 dark:bg-zinc-800/50" : "bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30"}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-center shrink-0">
                      <div className="text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase leading-none">
                        {MESES_LABEL[f.mes - 1].slice(0, 3)}
                      </div>
                      <div className="text-lg font-extrabold text-zinc-800 dark:text-white leading-tight">{f.dia}</div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{f.nombre}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{f.estandar ? "🔒 Calculado automáticamente" : "✏️ Feriado adicional"}</p>
                    </div>
                  </div>
                  {!f.estandar && f.id && (
                    <button onClick={() => deleteFeriado(f.id!)}
                      className="shrink-0 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium transition px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                      Eliminar
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Añadir feriado */}
            <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 shrink-0 bg-zinc-50 dark:bg-zinc-800/30">
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">+ Añadir feriado adicional</p>
              <div className="flex gap-2 mb-2">
                <div className="w-24 shrink-0">
                  <label className="block text-xs text-zinc-500 mb-1">Mes</label>
                  <select value={nuevoMes} onChange={e => setNuevoMes(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {MESES_LABEL.map((m, i) => <option key={i} value={i + 1}>{m.slice(0, 3)}</option>)}
                  </select>
                </div>
                <div className="w-16 shrink-0">
                  <label className="block text-xs text-zinc-500 mb-1">Día</label>
                  <input type="number" min={1} max={31} value={nuevoDia} onChange={e => setNuevoDia(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addFeriado()}
                  placeholder="Nombre del feriado..."
                  className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={addFeriado} disabled={savingFeriado || !nuevoNombre.trim()}
                  className="rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition shrink-0">
                  {savingFeriado ? "..." : "Añadir"}
                </button>
              </div>
              <p className="text-xs text-zinc-400 mt-2">
                💡 Los feriados estándar se recalculan automáticamente cada año nuevo.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
