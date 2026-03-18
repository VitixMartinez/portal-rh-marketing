"use client";

import { useState, useRef, useEffect, useCallback, FormEvent } from "react";
import Link from "next/link";
import AvatarUpload from "./AvatarUpload";
import PrestamosSection from "./PrestamosSection";
import AccesoEmpleadoBtn from "./AccesoEmpleadoBtn";
import CambiarRolBtn from "./CambiarRolBtn";

// ── Types ──────────────────────────────────────────────────────────────────
export type EmpData = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  employeeCode: string | null;
  cedula: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  gender: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRelation: string | null;
  status: string;
  contractType: string;
  salary: number | null;
  payPeriod: string | null;
  bankName: string | null;
  bankAccount: string | null;
  tssNumber: string | null;
  afp: string | null;
  ars: string | null;
  hireDate: string | null;
  birthDate: string | null;
  contractEnd: string | null;
  photoUrl: string | null;
  supervisorId: string | null;
  department: { id: string; name: string } | null;
  supervisor: { id: string; firstName: string; lastName: string; jobTitle: string | null } | null;
  subordinates: Array<{ id: string; firstName: string; lastName: string; jobTitle: string | null; status: string }>;
  reconocimientos: Array<{ id: string; titulo: string; tipo: string; descripcion: string | null; otorgadoPor: string | null; fecha: string }>;
  solicitudes: Array<{ id: string; tipo: string; estado: string; fechaInicio: string; fechaFin: string; dias: number; motivo: string | null }>;
};

export type Props = {
  emp: EmpData;
  userRole: string | null;
  isOwnProfile: boolean;
  currentUserEmployeeId: string | null;
  userAccount: { id: string; email: string; role: string } | null;
  companyName?: string;
};

// ── Label maps ─────────────────────────────────────────────────────────────
const CONTRACT_LABEL: Record<string, string> = {
  INDEFINIDO: "Indefinido", TEMPORAL: "Temporal", POR_OBRA: "Por Obra", PRUEBA: "Período de Prueba",
};
const AFP_LABEL: Record<string, string> = {
  SIEMBRA: "AFP Siembra", POPULAR: "AFP Popular", RESERVAS: "AFP Reservas",
  CRECER: "AFP Crecer", FUTURO: "AFP Futuro", PROFUTURO: "AFP Profuturo",
};
const ARS_LABEL: Record<string, string> = {
  ARS_HUMANO: "ARS Humano", ARS_SENASA: "SENASA", ARS_RESERVAS: "ARS Reservas",
  ARS_MAPFRE: "ARS MAPFRE", ARS_UNIVERSAL: "ARS Universal", ARS_PRIMERA: "ARS Primera",
  ARS_METASALUD: "ARS Metasalud", OTRO: "Otro",
};
const MARITAL_LABEL: Record<string, string> = {
  SOLTERO: "Soltero/a", CASADO: "Casado/a", DIVORCIADO: "Divorciado/a",
  VIUDO: "Viudo/a", UNION_LIBRE: "Unión libre",
};
const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  ACTIVO:     { label: "Activo",     bg: "bg-emerald-100", text: "text-emerald-700" },
  INACTIVO:   { label: "Inactivo",   bg: "bg-gray-100",    text: "text-gray-600"   },
  SUSPENDIDO: { label: "Suspendido", bg: "bg-amber-100",   text: "text-amber-700"  },
  TERMINADO:  { label: "Terminado",  bg: "bg-red-100",     text: "text-red-700"    },
};
const SOL_TIPO: Record<string, string> = {
  VACACIONES: "Vacaciones", PERMISO: "Permiso", LICENCIA_MEDICA: "Lic. Médica",
  LICENCIA_MATERNIDAD: "Maternidad", LICENCIA_PATERNIDAD: "Paternidad", OTRO: "Otro",
};
const SOL_STATUS: Record<string, { label: string; cls: string }> = {
  PENDIENTE: { label: "Pendiente", cls: "bg-amber-100 text-amber-700" },
  APROBADA:  { label: "Aprobada",  cls: "bg-emerald-100 text-emerald-700" },
  RECHAZADA: { label: "Rechazada", cls: "bg-red-100 text-red-600" },
};
const TIPO_REC: Record<string, string> = {
  EMPLEADO_MES: "Empleado del Mes", MEJOR_DESEMPENO: "Mejor Desempeño",
  INNOVACION: "Innovación", TRABAJO_EQUIPO: "Trabajo en Equipo",
  LIDERAZGO: "Liderazgo", PUNTUALIDAD: "Puntualidad", OTRO: "Otro",
};
const RAZONES_VOLUNTARIAS = [
  "Renuncia por mejor oferta laboral",
  "Renuncia por motivos personales/familiares",
  "Renuncia para continuar estudios",
  "Jubilación voluntaria",
  "Mutuo acuerdo entre las partes",
  "Fin de contrato temporal",
  "Otra razón voluntaria",
];
const RAZONES_INVOLUNTARIAS = [
  "Terminación por causa justificada (Art. 88 CT)",
  "Terminación sin causa (Desahucio)",
  "Reducción de personal / reestructuración",
  "Abandono de trabajo",
  "Bajo desempeño reiterado",
  "Violación de políticas de la empresa",
  "Fallecimiento",
  "Otra razón involuntaria",
];
const AVATAR_COLORS = ["#3B82F6","#8B5CF6","#10B981","#F59E0B","#EF4444","#0EA5E9","#6366F1","#14B8A6"];
function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric" });
}
function tiempoEn(hireDate: string | null): string {
  if (!hireDate) return "—";
  const now = new Date(); const hire = new Date(hireDate);
  let years = now.getFullYear() - hire.getFullYear();
  let months = now.getMonth() - hire.getMonth();
  if (now.getDate() < hire.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  if (years === 0) return `${months} mes${months !== 1 ? "es" : ""}`;
  if (months === 0) return `${years} año${years !== 1 ? "s" : ""}`;
  return `${years} año${years !== 1 ? "s" : ""}, ${months} mes${months !== 1 ? "es" : ""}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────
function Field({ label, value, mono, link }: { label: string; value?: string | null; mono?: boolean; link?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 shrink-0 w-44">{label}</span>
      {link && value ? (
        <a href={link} className="text-sm text-right font-medium text-indigo-600 hover:underline">{value}</a>
      ) : (
        <span className={`text-sm text-right font-medium text-gray-800 ${mono ? "font-mono text-xs" : ""}`}>
          {value ?? <span className="text-gray-300 font-normal">—</span>}
        </span>
      )}
    </div>
  );
}
function STitle({ title }: { title: string }) {
  return <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 pb-2 border-b border-gray-100">{title}</h3>;
}

// ── Nav sections ──────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: "resumen",         label: "Resumen",         icon: "⊞" },
  { id: "trabajo",         label: "Trabajo",          icon: "💼" },
  { id: "contacto",        label: "Contacto",         icon: "📞" },
  { id: "personal",        label: "Personal",         icon: "👤" },
  { id: "compensacion",    label: "Compensación",     icon: "💵" },
  { id: "desempeno",       label: "Desempeño",        icon: "⭐" },
  { id: "reconocimientos", label: "Reconocimientos",  icon: "🏆" },
  { id: "ausencias",       label: "Ausencias",        icon: "📅" },
  { id: "prestamos",       label: "Préstamos",        icon: "💳" },
  { id: "documentos",      label: "Documentos",       icon: "📂" },
];

// ── Section Panels ─────────────────────────────────────────────────────────
function ResumenPanel({ emp }: { emp: EmpData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <STitle title="Detalles del cargo" />
        <Field label="ID de empleado"     value={emp.employeeCode} mono />
        <Field label="Cargo / Posición"   value={emp.jobTitle} />
        <Field label="Departamento"       value={emp.department?.name} />
        <Field label="Supervisor directo" value={emp.supervisor ? `${emp.supervisor.firstName} ${emp.supervisor.lastName}` : null} />
        <Field label="Tipo de contrato"   value={CONTRACT_LABEL[emp.contractType] ?? emp.contractType} />
        <Field label="Fecha de ingreso"   value={fmtDate(emp.hireDate)} />
        <Field label="Antigüedad"         value={tiempoEn(emp.hireDate)} />
        <Field label="Período de pago"    value={emp.payPeriod ?? null} />
        {emp.contractEnd && <Field label="Vence contrato" value={fmtDate(emp.contractEnd)} />}
      </div>
      <div>
        <STitle title="Información de contacto" />
        <Field label="Teléfono"           value={emp.phone} link={emp.phone ? `tel:${emp.phone}` : undefined} />
        <Field label="Correo electrónico" value={emp.email} link={emp.email ? `mailto:${emp.email}` : undefined} />
        {emp.address && <Field label="Dirección de trabajo" value={`${emp.address}${emp.city ? `, ${emp.city}` : ""}`} />}
        {/* Subordinates quick list */}
        {emp.subordinates.length > 0 && (
          <div className="mt-6">
            <STitle title={`Equipo a cargo (${emp.subordinates.length})`} />
            <div className="space-y-1.5">
              {emp.subordinates.slice(0, 5).map(s => {
                const bc = avatarColor(s.firstName + s.lastName);
                return (
                  <Link key={s.id} href={`/empleados/${s.id}`}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition group">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: bc }}>
                      {s.firstName[0]}{s.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 group-hover:text-indigo-600 transition-colors truncate">{s.firstName} {s.lastName}</p>
                      <p className="text-[10px] text-gray-400 truncate">{s.jobTitle ?? "—"}</p>
                    </div>
                    <svg className="w-3 h-3 text-gray-300 group-hover:text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                );
              })}
              {emp.subordinates.length > 5 && (
                <p className="text-xs text-gray-400 text-center pt-1">+{emp.subordinates.length - 5} más</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TrabajoPanel({ emp }: { emp: EmpData }) {
  return (
    <div className="max-w-xl">
      <STitle title="Datos laborales completos" />
      <Field label="Código de empleado"   value={emp.employeeCode} mono />
      <Field label="Cargo / Posición"     value={emp.jobTitle} />
      <Field label="Departamento"         value={emp.department?.name} />
      <Field label="Supervisor directo"   value={emp.supervisor ? `${emp.supervisor.firstName} ${emp.supervisor.lastName}` : null} />
      <Field label="Tipo de contrato"     value={CONTRACT_LABEL[emp.contractType] ?? emp.contractType} />
      <Field label="Estado"               value={STATUS_CFG[emp.status]?.label ?? emp.status} />
      <Field label="Período de pago"      value={emp.payPeriod ?? null} />
      <Field label="Fecha de ingreso"     value={fmtDate(emp.hireDate)} />
      <Field label="Antigüedad"           value={tiempoEn(emp.hireDate)} />
      {emp.contractEnd && <Field label="Vencimiento contrato" value={fmtDate(emp.contractEnd)} />}
    </div>
  );
}

function ContactoPanel({ emp }: { emp: EmpData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <STitle title="Contacto directo" />
        <Field label="Teléfono"           value={emp.phone} link={emp.phone ? `tel:${emp.phone}` : undefined} />
        <Field label="Correo electrónico" value={emp.email} link={emp.email ? `mailto:${emp.email}` : undefined} />
        <Field label="Dirección"          value={emp.address} />
        <Field label="Ciudad"             value={emp.city} />
      </div>
      <div>
        <STitle title="Contacto de emergencia" />
        {emp.emergencyName ? (
          <>
            <Field label="Nombre"   value={emp.emergencyName} />
            <Field label="Teléfono" value={emp.emergencyPhone} />
            <Field label="Relación" value={emp.emergencyRelation} />
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">No registrado</p>
            <p className="text-xs text-gray-300 mt-1">Edita el perfil para añadir un contacto de emergencia</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PersonalPanel({ emp }: { emp: EmpData }) {
  const edad = emp.birthDate
    ? (() => { const d = new Date(emp.birthDate!); const now = new Date(); let a = now.getFullYear() - d.getFullYear(); if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--; return `${a} años`; })()
    : null;
  return (
    <div className="max-w-xl">
      <STitle title="Datos personales" />
      <Field label="Nombre completo"  value={`${emp.firstName} ${emp.lastName}`} />
      <Field label="Cédula"           value={emp.cedula} mono />
      <Field label="Fecha de nac."    value={fmtDate(emp.birthDate)} />
      {edad && <Field label="Edad"    value={edad} />}
      <Field label="Género"           value={emp.gender} />
      <Field label="Nacionalidad"     value={emp.nationality} />
      <Field label="Estado civil"     value={emp.maritalStatus ? MARITAL_LABEL[emp.maritalStatus] ?? emp.maritalStatus : null} />
      <Field label="Dirección"        value={emp.address} />
      {emp.city && <Field label="Ciudad" value={emp.city} />}
    </div>
  );
}

function CompensacionPanel({ emp, isAdmin }: { emp: EmpData; isAdmin: boolean }) {
  const salary = emp.salary ? `RD$ ${Number(emp.salary).toLocaleString("es-DO")}` : null;

  // Commission settings state
  const [comisionActiva,     setComisionActiva]     = useState(false);
  const [comisionPorcentaje, setComisionPorcentaje] = useState("0");
  const [comisionFrecuencia, setComisionFrecuencia] = useState<"MENSUAL" | "QUINCENAL">("QUINCENAL");
  const [comLoading,   setComLoading]   = useState(true);
  const [comSaving,    setComSaving]    = useState(false);
  const [comSaved,     setComSaved]     = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    fetch(`/api/empleados/${emp.id}/comision`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setComisionActiva(d.comisionActiva);
        setComisionPorcentaje(String(d.comisionPorcentaje ?? "0"));
        setComisionFrecuencia(d.comisionFrecuencia ?? "QUINCENAL");
      })
      .finally(() => setComLoading(false));
  }, [emp.id, isAdmin]);

  async function saveComision() {
    setComSaving(true);
    try {
      const res = await fetch(`/api/empleados/${emp.id}/comision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comisionActiva,
          comisionPorcentaje: parseFloat(comisionPorcentaje) || 0,
          comisionFrecuencia,
        }),
      });
      if (res.ok) {
        setComSaved(true);
        setTimeout(() => setComSaved(false), 2500);
      }
    } finally {
      setComSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-5xl mb-4">🔒</span>
        <h3 className="text-base font-semibold text-gray-700">Información confidencial</h3>
        <p className="text-sm text-gray-400 mt-2 max-w-xs">Solo los administradores pueden ver los datos de compensación y seguridad social.</p>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <STitle title="Compensación" />
          <Field label="Salario mensual"  value={salary} />
          <Field label="Período de pago"  value={emp.payPeriod ?? null} />
          <Field label="Banco"            value={emp.bankName} />
          <Field label="Cuenta bancaria"  value={emp.bankAccount} mono />
        </div>
        <div>
          <STitle title="Seguridad social (TSS)" />
          <Field label="NSS / Número TSS"  value={emp.tssNumber} mono />
          <Field label="AFP"               value={emp.afp ? AFP_LABEL[emp.afp] ?? emp.afp : null} />
          <Field label="ARS"               value={emp.ars ? ARS_LABEL[emp.ars] ?? emp.ars : null} />
        </div>
      </div>

      {/* Commission settings */}
      <div className="border-t border-gray-100 pt-6">
        <STitle title="Comisiones por ventas" />
        {comLoading ? (
          <p className="text-sm text-gray-400 animate-pulse">Cargando...</p>
        ) : (
          <div className="space-y-4 max-w-lg">
            {/* Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 bg-gray-50">
              <div>
                <p className="text-sm font-semibold text-gray-800">Comisión activa</p>
                <p className="text-xs text-gray-400 mt-0.5">El empleado recibe comisión sobre ventas</p>
              </div>
              <button
                type="button"
                onClick={() => setComisionActiva(p => !p)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${comisionActiva ? "bg-emerald-500" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${comisionActiva ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {comisionActiva && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Porcentaje de comisión (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={comisionPorcentaje}
                      onChange={e => setComisionPorcentaje(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="5.00"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {comisionPorcentaje && Number(comisionPorcentaje) > 0
                      ? `Ejemplo: RD$ 100,000 en ventas → RD$ ${(100000 * Number(comisionPorcentaje) / 100).toLocaleString("es-DO")} comisión`
                      : "Ej: 5% = RD$ 5,000 por cada RD$ 100,000"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Frecuencia de pago</label>
                  <select
                    value={comisionFrecuencia}
                    onChange={e => setComisionFrecuencia(e.target.value as "MENSUAL" | "QUINCENAL")}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="QUINCENAL">Quincenal (cada 15 días)</option>
                    <option value="MENSUAL">Mensual (una vez al mes)</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Cuándo se paga la comisión al empleado</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={saveComision}
                disabled={comSaving}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
              >
                {comSaving ? "Guardando..." : "Guardar configuración"}
              </button>
              {comSaved && (
                <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                  ✓ Guardado
                </span>
              )}
            </div>
            {comisionActiva && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-xs text-emerald-700">
                💡 Las comisiones se registran en <strong>Nómina → Ventas y Comisiones</strong> cada período. Están sujetas a AFP (2.87%), SFS (3.04%) e ISR según la legislación dominicana.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DesempenoPanel({ employeeId }: { employeeId: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`/api/desempeno?employeeId=${employeeId}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setReviews(d); })
      .finally(() => setLoading(false));
  }, [employeeId]);

  const CAL: Record<string, { label: string; cls: string }> = {
    SOBRESALIENTE:    { label: "Sobresaliente",    cls: "bg-emerald-100 text-emerald-700" },
    CUMPLE:           { label: "Cumple",           cls: "bg-indigo-100 text-indigo-700" },
    NECESITA_MEJORAR: { label: "Necesita mejorar", cls: "bg-amber-100 text-amber-700" },
    INSATISFACTORIO:  { label: "Insatisfactorio",  cls: "bg-red-100 text-red-600" },
  };

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center animate-pulse">Cargando evaluaciones...</div>;
  if (reviews.length === 0) return (
    <div className="text-center py-14">
      <div className="text-5xl mb-3">⭐</div>
      <p className="text-sm font-medium text-gray-600">Sin evaluaciones registradas</p>
      <p className="text-xs text-gray-400 mt-1">Las evaluaciones de desempeño aparecerán aquí</p>
    </div>
  );
  return (
    <div className="space-y-4">
      <STitle title={`Evaluaciones de desempeño (${reviews.length})`} />
      {reviews.map(r => {
        const cal = CAL[r.calificacion] ?? { label: r.calificacion, cls: "bg-gray-100 text-gray-600" };
        return (
          <div key={r.id} className="border border-gray-100 rounded-xl p-4 hover:border-indigo-100 transition">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-semibold text-gray-900">{r.periodo}</p>
                {r.reviewer && <p className="text-xs text-gray-400 mt-0.5">Evaluador: {r.reviewer.firstName} {r.reviewer.lastName}</p>}
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cal.cls}`}>{cal.label}</span>
            </div>
            {r.puntuacion != null && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Puntuación</span>
                  <span className="font-semibold text-gray-800">{r.puntuacion}/100</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${r.puntuacion}%` }} />
                </div>
              </div>
            )}
            {r.fortalezas && <p className="text-xs text-gray-600 mt-1"><span className="font-medium text-gray-700">Fortalezas:</span> {r.fortalezas}</p>}
            {r.areasEnMejora && <p className="text-xs text-gray-600 mt-1"><span className="font-medium text-gray-700">Áreas de mejora:</span> {r.areasEnMejora}</p>}
            {r.comentarios && <p className="text-xs text-gray-500 mt-2 italic">{r.comentarios}</p>}
          </div>
        );
      })}
    </div>
  );
}

function ReconocimientosPanel({ reconocimientos }: { reconocimientos: EmpData["reconocimientos"] }) {
  if (reconocimientos.length === 0) return (
    <div className="text-center py-14">
      <div className="text-5xl mb-3">🏆</div>
      <p className="text-sm font-medium text-gray-600">Sin reconocimientos registrados</p>
    </div>
  );
  return (
    <div className="space-y-3">
      <STitle title={`Reconocimientos (${reconocimientos.length})`} />
      {reconocimientos.map(r => (
        <div key={r.id} className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100 hover:border-amber-200 transition">
          <span className="text-2xl leading-none flex-shrink-0">🏆</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">{r.titulo}</span>
              <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">{TIPO_REC[r.tipo] ?? r.tipo}</span>
            </div>
            {r.descripcion && <p className="text-xs text-gray-500 mt-1">{r.descripcion}</p>}
            <p className="text-xs text-gray-400 mt-1">
              {new Date(r.fecha).toLocaleDateString("es-DO")}{r.otorgadoPor && ` · Por: ${r.otorgadoPor}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function AusenciasPanel({ solicitudes }: { solicitudes: EmpData["solicitudes"] }) {
  if (solicitudes.length === 0) return (
    <div className="text-center py-14">
      <div className="text-5xl mb-3">📅</div>
      <p className="text-sm font-medium text-gray-600">Sin solicitudes registradas</p>
    </div>
  );
  return (
    <div>
      <STitle title={`Historial de ausencias (${solicitudes.length})`} />
      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Período</th>
              <th className="px-4 py-3 text-center">Días</th>
              <th className="px-4 py-3 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.map(s => {
              const sc = SOL_STATUS[s.estado] ?? { label: s.estado, cls: "" };
              return (
                <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{SOL_TIPO[s.tipo] ?? s.tipo}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">
                    {new Date(s.fechaInicio).toLocaleDateString("es-DO", { day: "2-digit", month: "short" })} – {new Date(s.fechaFin).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-500">{s.dias}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sc.cls}`}>{sc.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Termination Modal ──────────────────────────────────────────────────────
function TerminacionModal({ emp, isAdmin, onClose, onSuccess }: {
  emp: EmpData; isAdmin: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [tipoTerminacion, setTipoTerminacion] = useState<"VOLUNTARIA"|"INVOLUNTARIA"|"">("");
  const [razonBase, setRazonBase]           = useState("");
  const [razonDetalle, setRazonDetalle]     = useState("");
  const [fechaTerminacion, setFechaTermin]  = useState("");
  const [ultimoDia, setUltimoDia]           = useState("");
  const [pagoHasta, setPagoHasta]           = useState("");
  const [fechaRenuncia, setFechaRenuncia]   = useState("");
  const [elegible, setElegible]             = useState(true);
  const [comentarios, setComentarios]       = useState("");
  const [archivos, setArchivos]             = useState<File[]>([]);
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const fullName = `${emp.firstName} ${emp.lastName}`;
  const opcionesRazon = tipoTerminacion === "VOLUNTARIA" ? RAZONES_VOLUNTARIAS : tipoTerminacion === "INVOLUNTARIA" ? RAZONES_INVOLUNTARIAS : [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const razonFinal = tipoTerminacion && razonBase ? `${tipoTerminacion}: ${razonBase}${razonDetalle ? ` — ${razonDetalle}` : ""}` : "";
    if (!razonFinal || !fechaTerminacion || !ultimoDia || !pagoHasta) {
      setError("Complete todos los campos requeridos (*)");
      return;
    }
    setSaving(true); setError("");
    try {
      const fd = new FormData();
      fd.append("employeeId", emp.id);
      fd.append("razonPrimaria", razonFinal);
      fd.append("fechaTerminacion", fechaTerminacion);
      fd.append("ultimoDiaTrabajo", ultimoDia);
      fd.append("pagoHasta", pagoHasta);
      if (fechaRenuncia) fd.append("fechaRenuncia", fechaRenuncia);
      fd.append("elegibleRecontratacion", String(elegible));
      if (comentarios) fd.append("comentarios", comentarios);
      archivos.forEach(f => fd.append("adjuntos", f));

      const res = await fetch("/api/terminaciones", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar la solicitud");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 to-red-500 rounded-t-2xl px-6 py-5 flex items-start justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">Terminar Empleado</h2>
            <p className="text-red-200 text-sm mt-0.5">{fullName} · {emp.jobTitle ?? emp.department?.name ?? ""}</p>
          </div>
          <button onClick={onClose} className="text-red-300 hover:text-white transition mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Warning */}
        <div className="mx-6 mt-5 bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-2.5 text-sm text-amber-800">
          <span className="text-lg leading-none flex-shrink-0">⚠️</span>
          <span>
            {isAdmin
              ? "Esta acción marcará al empleado como terminado de forma inmediata y notificará al sistema."
              : "Esta solicitud será enviada al administrador para su revisión y aprobación antes de hacerse efectiva."}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Tipo de terminación */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Tipo de terminación <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => { setTipoTerminacion("VOLUNTARIA"); setRazonBase(""); }}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition flex flex-col items-center gap-1 ${tipoTerminacion === "VOLUNTARIA" ? "bg-blue-50 border-blue-500 text-blue-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Voluntaria
              </button>
              <button type="button" onClick={() => { setTipoTerminacion("INVOLUNTARIA"); setRazonBase(""); }}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition flex flex-col items-center gap-1 ${tipoTerminacion === "INVOLUNTARIA" ? "bg-red-50 border-red-500 text-red-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                Involuntaria
              </button>
            </div>
          </div>

          {/* Razón específica (aparece al elegir tipo) */}
          {tipoTerminacion && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Razón específica <span className="text-red-500">*</span>
                </label>
                <select value={razonBase} onChange={e => setRazonBase(e.target.value)} required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400">
                  <option value="">Seleccionar razón...</option>
                  {opcionesRazon.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Detalle adicional <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <textarea value={razonDetalle} onChange={e => setRazonDetalle(e.target.value)} rows={2}
                  placeholder="Agrega detalles específicos sobre la razón de terminación..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                Fecha de terminación <span className="text-red-500">*</span>
              </label>
              <input type="date" value={fechaTerminacion} required
                onChange={e => { setFechaTermin(e.target.value); if (!ultimoDia) setUltimoDia(e.target.value); if (!pagoHasta) setPagoHasta(e.target.value); }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                Último día de trabajo <span className="text-red-500">*</span>
              </label>
              <input type="date" value={ultimoDia} required onChange={e => setUltimoDia(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                Pago hasta <span className="text-red-500">*</span>
              </label>
              <input type="date" value={pagoHasta} required onChange={e => setPagoHasta(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                Fecha de renuncia <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input type="date" value={fechaRenuncia} onChange={e => setFechaRenuncia(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
          </div>

          {/* Elegible */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Elegible para recontratación <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setElegible(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${elegible ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                ✓ Sí, elegible
              </button>
              <button type="button" onClick={() => setElegible(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${!elegible ? "bg-red-50 border-red-400 text-red-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                ✗ No elegible
              </button>
            </div>
          </div>

          {/* Comentarios */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Comentarios adicionales</label>
            <textarea value={comentarios} onChange={e => setComentarios(e.target.value)} rows={3} placeholder="Detalles sobre la terminación, acuerdos, etc."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
          </div>

          {/* File upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Documentos adjuntos
              <span className="text-gray-400 font-normal ml-1">(carta de despido, disciplinas, acuerdos…)</span>
            </label>
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/20 transition">
              <svg className="w-8 h-8 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {archivos.length > 0 ? (
                <div className="space-y-1">
                  {archivos.map((f, i) => <p key={i} className="text-xs text-gray-600">📎 {f.name} <span className="text-gray-400">({(f.size / 1024).toFixed(0)} KB)</span></p>)}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Haz clic para adjuntar documentos</p>
              )}
              <p className="text-xs text-gray-300 mt-1">PDF, DOC, DOCX, JPG, PNG</p>
            </div>
            <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden"
              onChange={e => setArchivos(Array.from(e.target.files ?? []))} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {saving ? "Procesando..." : isAdmin ? "Confirmar terminación" : "Enviar para aprobación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function EmpleadoPerfilClient({
  emp, userRole, isOwnProfile, currentUserEmployeeId, userAccount, companyName
}: Props) {
  const [section, setSection]         = useState("resumen");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [showTermModal, setShowTermModal] = useState(false);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const isAdmin            = userRole === "OWNER_ADMIN";
  const isManager          = userRole === "MANAGER";
  const isDirectSupervisor = currentUserEmployeeId !== null && emp.supervisorId === currentUserEmployeeId;
  const canActOnEmployee   = isAdmin || (isManager && isDirectSupervisor);
  const canTerminate       = canActOnEmployee && emp.status !== "INACTIVO" && emp.status !== "TERMINADO";

  const initials   = `${emp.firstName[0]}${emp.lastName[0]}`.toUpperCase();
  const bgColor    = avatarColor(emp.firstName + emp.lastName);
  const statusCfg  = STATUS_CFG[emp.status] ?? STATUS_CFG.ACTIVO;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setActionsOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 5000);
  }

  return (
    <div className="space-y-3">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 transition-all ${toast.ok ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400">
        <Link href="/empleados" className="hover:text-indigo-600 transition-colors">Empleados</Link>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-600 font-medium">{emp.firstName} {emp.lastName}</span>
      </nav>

      {/* ── Main card ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex" style={{ minHeight: "600px" }}>

        {/* ── LEFT SIDEBAR ───────────────────────────────────────────────── */}
        <aside className="w-60 flex-shrink-0 flex flex-col border-r border-gray-100">

          {/* Gradient header */}
          <div className="relative bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-600 h-24 flex-shrink-0">
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "14px 14px" }} />
            {/* Avatar overlapping gradient bottom */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10 ring-4 ring-white rounded-full">
              <AvatarUpload employeeId={emp.id} initials={initials} bgColor={bgColor}
                photoUrl={emp.photoUrl} userRole={userRole} isOwnProfile={isOwnProfile} />
            </div>
          </div>

          {/* Name + title + status */}
          <div className="pt-14 pb-4 px-4 text-center border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 leading-tight">
              {emp.firstName} {emp.lastName}
            </h2>
            {emp.jobTitle && (
              <p className="text-xs text-gray-500 mt-0.5 leading-tight">{emp.jobTitle}</p>
            )}
            {emp.employeeCode && (
              <p className="text-[10px] text-gray-300 mt-0.5 font-mono">{emp.employeeCode}</p>
            )}
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold mt-2 ${statusCfg.bg} ${statusCfg.text}`}>
              {statusCfg.label}
            </span>
          </div>

          {/* Actions dropdown */}
          {canActOnEmployee && (
            <div className="px-3 py-3 border-b border-gray-100 relative" ref={actionsRef}>
              <button onClick={() => setActionsOpen(!actionsOpen)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-sm">
                Acciones
                <svg className={`w-3 h-3 transition-transform ${actionsOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {actionsOpen && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-gray-400 font-bold border-b border-gray-50">Opciones</p>

                  {isAdmin && (
                    <>
                      <Link href={`/empleados?edit=${emp.id}`} onClick={() => setActionsOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition">
                        <span>✏️</span> Editar empleado
                      </Link>
                      <button onClick={() => { setActionsOpen(false); setSection("compensacion"); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition text-left">
                        <span>💵</span> Ver compensación
                      </button>
                    </>
                  )}

                  <Link href="/organigrama" onClick={() => setActionsOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition">
                    <span>🏢</span> Ver en organigrama
                  </Link>

                  <button onClick={() => { setActionsOpen(false); setSection("ausencias"); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition text-left">
                    <span>📅</span> Ver historial ausencias
                  </button>

                  {canTerminate && (
                    <>
                      <div className="border-t border-gray-100 my-1" />
                      <button onClick={() => { setActionsOpen(false); setShowTermModal(true); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-red-600 hover:bg-red-50 transition text-left font-semibold">
                        <span>🔴</span>
                        <span>Terminar empleado</span>
                        {!isAdmin && <span className="ml-auto text-red-400 font-normal text-[10px]">(solicitud)</span>}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Admin tools: portal access + role */}
          {isAdmin && (
            <div className="px-3 py-3 border-b border-gray-100 space-y-2">
              <AccesoEmpleadoBtn employeeId={emp.id} employeeName={`${emp.firstName} ${emp.lastName}`}
                hasAccess={!!userAccount} currentEmail={userAccount?.email} />
              {userAccount && (
                <CambiarRolBtn userId={userAccount.id} currentRole={userAccount.role}
                  employeeName={`${emp.firstName} ${emp.lastName}`} />
              )}
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
            {NAV_SECTIONS.map(s => (
              <button key={s.id} onClick={() => setSection(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-xs ${
                  section === s.id
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}>
                <span className="text-sm leading-none">{s.icon}</span>
                {s.label}
                {section === s.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── RIGHT CONTENT ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Info bar */}
          <div className="flex-shrink-0 border-b border-gray-100 px-6 py-3 flex items-center gap-6 flex-wrap bg-gray-50/50">
            <InfoChip icon="🏢" label="Empresa"     value={companyName ?? "Portal RH"} />
            {emp.supervisor && (
              <InfoChip icon="👤" label="Supervisor"
                value={`${emp.supervisor.firstName} ${emp.supervisor.lastName}`}
                href={`/empleados/${emp.supervisor.id}`} />
            )}
            {emp.department && <InfoChip icon="🏛️" label="Departamento" value={emp.department.name} />}
            {emp.hireDate   && <InfoChip icon="📆" label="Antigüedad"   value={tiempoEn(emp.hireDate)} />}
          </div>

          {/* Section content */}
          <div className="flex-1 p-6 overflow-auto">
            {section === "resumen"         && <ResumenPanel emp={emp} />}
            {section === "trabajo"         && <TrabajoPanel emp={emp} />}
            {section === "contacto"        && <ContactoPanel emp={emp} />}
            {section === "personal"        && <PersonalPanel emp={emp} />}
            {section === "compensacion"    && <CompensacionPanel emp={emp} isAdmin={isAdmin} />}
            {section === "desempeno"       && <DesempenoPanel employeeId={emp.id} />}
            {section === "reconocimientos" && <ReconocimientosPanel reconocimientos={emp.reconocimientos} />}
            {section === "ausencias"       && <AusenciasPanel solicitudes={emp.solicitudes} />}
            {section === "prestamos"       && <PrestamosSection employeeId={emp.id} userRole={userRole} />}
            {section === "documentos"      && <DocumentosPanel employeeId={emp.id} isAdmin={isAdmin} />}
          </div>
        </div>
      </div>

      {/* Termination Modal */}
      {showTermModal && (
        <TerminacionModal emp={emp} isAdmin={isAdmin}
          onClose={() => setShowTermModal(false)}
          onSuccess={() => showToast(
            isAdmin
              ? "Empleado marcado como terminado"
              : "Solicitud enviada al administrador para aprobación",
            true
          )} />
      )}
    </div>
  );
}

// ── Documentos Panel ──────────────────────────────────────────────────────
type EmpDoc = { id: string; nombre: string; tipo: string; url: string; tamano: number | null; notas: string | null; createdAt: string };
const DOC_TIPOS = ["CV","CERTIFICADO","CONTRATO","IDENTIFICACION","OTRO"];
const DOC_TIPO_LABEL: Record<string, string> = {
  CV: "Currículum Vitae", CERTIFICADO: "Certificado / Diploma",
  CONTRATO: "Contrato", IDENTIFICACION: "Identificación", OTRO: "Otro",
};

function DocumentosPanel({ employeeId, isAdmin }: { employeeId: string; isAdmin: boolean }) {
  const [docs, setDocs]           = useState<EmpDoc[]>([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [nombre, setNombre]       = useState("");
  const [tipo, setTipo]           = useState("OTRO");
  const [notas, setNotas]         = useState("");
  const [showAdd, setShowAdd]     = useState(false);
  const [pendingUrl, setPendingUrl] = useState("");
  const [pendingTamano, setPendingTamano] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/empleados/${employeeId}/documentos`);
    setDocs(res.ok ? await res.json() : []);
    setLoading(false);
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", file); fd.append("context", "doc");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) { const j = await res.json(); alert(j.error ?? "Error al subir"); return; }
    const { url, tamano } = await res.json();
    setPendingUrl(url); setPendingTamano(tamano ?? null);
    if (!nombre) setNombre(file.name.replace(/\.[^.]+$/, ""));
    setShowAdd(true);
  }

  async function saveDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingUrl || !nombre.trim()) return;
    const res = await fetch(`/api/empleados/${employeeId}/documentos`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre.trim(), tipo, url: pendingUrl, tamano: pendingTamano, notas: notas || null }),
    });
    if (!res.ok) { alert("Error al guardar"); return; }
    setNombre(""); setTipo("OTRO"); setNotas(""); setPendingUrl(""); setPendingTamano(null); setShowAdd(false);
    load();
  }

  async function deleteDoc(id: string) {
    if (!confirm("¿Eliminar este documento?")) return;
    await fetch(`/api/empleados/${employeeId}/documentos/${id}`, { method: "DELETE" });
    load();
  }

  function formatBytes(b: number | null) {
    if (!b) return ""; if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  }

  const inp = "w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const lbl = "block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1";

  const grouped = DOC_TIPOS.reduce<Record<string, EmpDoc[]>>((acc, t) => {
    acc[t] = docs.filter(d => d.tipo === t);
    return acc;
  }, {});

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 dark:text-zinc-300">Documentos del empleado</h3>
        {isAdmin && (
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="rounded-xl bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition shadow-sm disabled:opacity-50">
            {uploading ? "Subiendo..." : "+ Subir documento"}
          </button>
        )}
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* Add form (shows after upload) */}
      {showAdd && pendingUrl && (
        <form onSubmit={saveDoc} className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 p-4 space-y-3">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">✓ Archivo subido. Completa la información:</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Nombre del documento *</label>
              <input required value={nombre} onChange={e => setNombre(e.target.value)} className={inp} placeholder="Ej: Certificado de Excel" />
            </div>
            <div>
              <label className={lbl}>Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className={inp}>
                {DOC_TIPOS.map(t => <option key={t} value={t}>{DOC_TIPO_LABEL[t]}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Notas (opcional)</label>
              <input value={notas} onChange={e => setNotas(e.target.value)} className={inp} placeholder="Ej: Curso completado en Coursera, 2024" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowAdd(false); setPendingUrl(""); }} className="rounded-xl border border-gray-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition">Cancelar</button>
            <button type="submit" className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-1.5 text-xs font-semibold text-white transition">Guardar</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>
      ) : docs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-2">📂</div>
          <p className="text-sm text-gray-400">No hay documentos registrados.</p>
          {isAdmin && <p className="text-xs text-gray-300 mt-1">Sube certificados, CV, contratos u otros archivos.</p>}
        </div>
      ) : (
        <div className="space-y-5">
          {DOC_TIPOS.filter(t => grouped[t].length > 0).map(t => (
            <div key={t}>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-2">{DOC_TIPO_LABEL[t]} ({grouped[t].length})</h4>
              <div className="space-y-2">
                {grouped[t].map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-800/40 hover:shadow-sm transition">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 text-base">
                      {doc.tipo === "CV" ? "📄" : doc.tipo === "CERTIFICADO" ? "🏅" : doc.tipo === "CONTRATO" ? "📝" : doc.tipo === "IDENTIFICACION" ? "🪪" : "📎"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium text-gray-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition truncate block">
                        {doc.nombre}
                      </a>
                      <div className="flex items-center gap-2 mt-0.5">
                        {doc.notas && <span className="text-xs text-gray-400 truncate">{doc.notas}</span>}
                        <span className="text-[10px] text-gray-300 dark:text-zinc-600 flex-shrink-0">
                          {new Date(doc.createdAt).toLocaleDateString("es-DO")}
                          {doc.tamano ? ` · ${formatBytes(doc.tamano)}` : ""}
                        </span>
                      </div>
                    </div>
                    {isAdmin && (
                      <button onClick={() => deleteDoc(doc.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-400 transition flex-shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Info chip (info bar) ───────────────────────────────────────────────────
function InfoChip({ icon, label, value, href }: { icon: string; label: string; value: string; href?: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-base leading-none text-gray-300">{icon}</span>
      <div>
        <div className="text-[10px] text-gray-400 uppercase tracking-wide leading-none mb-0.5">{label}</div>
        {href ? (
          <Link href={href} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition">{value}</Link>
        ) : (
          <div className="text-xs font-semibold text-gray-700">{value}</div>
        )}
      </div>
    </div>
  );
}
