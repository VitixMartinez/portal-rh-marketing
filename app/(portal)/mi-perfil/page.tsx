"use client";

import { useState, useEffect, FormEvent } from "react";

/* ── Types ─────────────────────────────────────────────────────────────── */
interface Employee {
  id: string; firstName: string; lastName: string; email: string | null;
  phone: string | null; address: string | null; jobTitle: string | null;
  contractType: string | null; hireDate: string | null; salary: number | null;
  department?: { name: string } | null;
  supervisor?: { firstName: string; lastName: string } | null;
  emergencyName: string | null; emergencyPhone: string | null; emergencyRelation: string | null;
  bankName: string | null; bankAccount: string | null;
  afp: string | null; ars: string | null; tssNumber: string | null;
}

interface SolicitudCambio {
  id: string; campo: string; campoLabel: string; valorActual: string | null;
  valorNuevo: string; estado: string; motivo: string | null; notasAdmin: string | null;
  createdAt: string;
}

interface SolicitudTiempo {
  id: string; tipo: string; fechaInicio: string; fechaFin: string;
  dias: number; estado: string; motivo: string | null; notas: string | null;
  createdAt: string;
}

/* ── Constants ─────────────────────────────────────────────────────────── */
const AVATAR_COLORS = ["#3B82F6","#8B5CF6","#10B981","#F59E0B","#EF4444","#0EA5E9","#6366F1","#14B8A6"];
function avatarColor(name: string): string {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const EDITABLE_FIELDS = [
  { campo: "telefono",           campoLabel: "Teléfono",              key: "phone" },
  { campo: "email",              campoLabel: "Correo electrónico",    key: "email" },
  { campo: "direccion",          campoLabel: "Dirección",             key: "address" },
  { campo: "nombreEmergencia",   campoLabel: "Nombre de emergencia",  key: "emergencyName" },
  { campo: "telefonoEmergencia", campoLabel: "Teléfono de emergencia",key: "emergencyPhone" },
  { campo: "numeroCuenta",       campoLabel: "Número de cuenta",      key: "bankAccount" },
];

const TIPO_SOLICITUD: Record<string, { label: string; color: string; icon: "VACACIONES" | "PERMISO" | "LICENCIA_MEDICA" | "LICENCIA_MATERNIDAD" | "LICENCIA_PATERNIDAD" | "OTRO" }> = {
  VACACIONES:          { label: "Vacaciones",          color: "bg-blue-100 text-blue-700",    icon: "VACACIONES" },
  PERMISO:             { label: "Permiso",             color: "bg-amber-100 text-amber-700",  icon: "PERMISO" },
  LICENCIA_MEDICA:     { label: "Licencia Médica",     color: "bg-red-100 text-red-700",      icon: "LICENCIA_MEDICA" },
  LICENCIA_MATERNIDAD: { label: "Lic. Maternidad",     color: "bg-pink-100 text-pink-700",    icon: "LICENCIA_MATERNIDAD" },
  LICENCIA_PATERNIDAD: { label: "Lic. Paternidad",     color: "bg-indigo-100 text-indigo-700",icon: "LICENCIA_PATERNIDAD" },
  OTRO:                { label: "Otro",                color: "bg-gray-100 text-gray-700",    icon: "OTRO" },
};

function getIconSVG(iconType: string) {
  const icons: Record<string, JSX.Element> = {
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
  const map: Record<string, string> = {
    PENDIENTE: "bg-amber-100 text-amber-700",
    APROBADA:  "bg-green-100 text-green-700",
    RECHAZADA: "bg-red-100 text-red-700",
  };
  const label: Record<string, string> = { PENDIENTE: "Pendiente", APROBADA: "Aprobada", RECHAZADA: "Rechazada" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[estado] || "bg-gray-100 text-gray-600"}`}>
      {label[estado] || estado}
    </span>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────── */
export default function MiPerfilPage() {
  const [employee,     setEmployee]     = useState<Employee | null>(null);
  const [cambios,      setCambios]      = useState<SolicitudCambio[]>([]);
  const [tiempos,      setTiempos]      = useState<SolicitudTiempo[]>([]);
  const [tab,          setTab]          = useState<"perfil" | "cambios" | "tiempo">("perfil");
  const [loading,      setLoading]      = useState(true);

  // Modal: solicitud de cambio de datos
  const [modalCambio,  setModalCambio]  = useState<{ campo: string; campoLabel: string; key: string } | null>(null);
  const [newValue,     setNewValue]     = useState("");
  const [motivo,       setMotivo]       = useState("");

  // Modal: solicitud de tiempo
  const [modalTiempo,  setModalTiempo]  = useState(false);
  const [tipoSol,      setTipoSol]      = useState("VACACIONES");
  const [fechaInicio,  setFechaInicio]  = useState("");
  const [fechaFin,     setFechaFin]     = useState("");
  const [motivoTiempo, setMotivoTiempo] = useState("");

  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [empRes, cambiosRes, tiemposRes] = await Promise.all([
        fetch("/api/portal/me"),
        fetch("/api/solicitudes-cambio"),
        fetch("/api/portal/solicitudes"),
      ]);
      if (empRes.ok)     setEmployee(await empRes.json());
      if (cambiosRes.ok) setCambios(await cambiosRes.json());
      if (tiemposRes.ok) setTiempos(await tiemposRes.json());
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  /* Calcular días hábiles en tiempo real */
  function calcDias(inicio: string, fin: string): number {
    if (!inicio || !fin) return 0;
    let dias = 0;
    const cur = new Date(inicio + "T12:00:00");
    const end = new Date(fin + "T12:00:00");
    if (end < cur) return 0;
    while (cur <= end) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) dias++;
      cur.setDate(cur.getDate() + 1);
    }
    return dias;
  }

  /* Submit: cambio de datos */
  async function submitCambio(e: FormEvent) {
    e.preventDefault();
    if (!modalCambio || !employee) return;
    setSaving(true);
    try {
      const valorActual = (employee as any)[modalCambio.key] ?? null;
      const res = await fetch("/api/solicitudes-cambio", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ campo: modalCambio.campo, campoLabel: modalCambio.campoLabel, valorActual, valorNuevo: newValue, motivo }),
      });
      if (res.ok) {
        showToast("Solicitud enviada correctamente", true);
        setModalCambio(null); setNewValue(""); setMotivo("");
        await loadData();
      } else {
        const d = await res.json();
        showToast(d.error || "Error al enviar", false);
      }
    } finally { setSaving(false); }
  }

  /* Submit: solicitud de tiempo libre */
  async function submitTiempo(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/portal/solicitudes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tipo: tipoSol, fechaInicio, fechaFin, motivo: motivoTiempo }),
      });
      if (res.ok) {
        showToast("Solicitud enviada correctamente", true);
        setModalTiempo(false); setFechaInicio(""); setFechaFin(""); setMotivoTiempo(""); setTipoSol("VACACIONES");
        await loadData();
      } else {
        const d = await res.json();
        showToast(d.error || "Error al enviar", false);
      }
    } finally { setSaving(false); }
  }

  async function cancelCambio(id: string) {
    const res = await fetch(`/api/solicitudes-cambio/${id}`, { method: "DELETE" });
    if (res.ok) { showToast("Solicitud cancelada", true); await loadData(); }
  }

  async function cancelTiempo(id: string) {
    const res = await fetch(`/api/portal/solicitudes/${id}`, { method: "DELETE" });
    if (res.ok) { showToast("Solicitud cancelada", true); await loadData(); }
    else { const d = await res.json(); showToast(d.error || "Error", false); }
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
  if (!employee) return <div className="p-6 text-gray-500">No se pudo cargar el perfil.</div>;

  const fullName = `${employee.firstName} ${employee.lastName}`;
  const initials = [employee.firstName, employee.lastName].map(w => w?.[0]).join("").toUpperCase();
  const color    = avatarColor(fullName);
  const diasCalc = calcDias(fechaInicio, fechaFin);

  const pendingCambios  = cambios.filter(s => s.estado === "PENDIENTE").length;
  const pendingTiempos  = tiempos.filter(s => s.estado === "PENDIENTE").length;
  const totalPending    = pendingCambios + pendingTiempos;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${toast.ok ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
        <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600" />
        <div className="px-6 pb-0 relative">
          <div
            className="absolute -top-10 left-6 w-20 h-20 rounded-2xl border-4 border-white flex items-center justify-center text-white font-bold text-xl shadow-sm"
            style={{ backgroundColor: color }}
          >
            {initials}
          </div>
          <div className="pt-12 pb-4">
            <h1 className="text-xl font-bold text-gray-900">{fullName}</h1>
            <p className="text-gray-500 text-sm">{employee.jobTitle || "—"} · {employee.department?.name || "—"}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-t border-gray-100 flex gap-0">
          {([
            { key: "perfil",    label: "Mi Perfil",           count: 0 },
            { key: "cambios",   label: "Cambios de Datos",    count: pendingCambios },
            { key: "tiempo",    label: "Tiempo Libre",        count: pendingTiempos },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: Mi Perfil ── */}
      {tab === "perfil" && (
        <div className="grid md:grid-cols-2 gap-5">
          <Section title="Datos Personales">
            <InfoRow label="Nombre completo" value={fullName} />
            <EditableRow label="Correo electrónico" value={employee.email}   field={EDITABLE_FIELDS[1]} onEdit={setModalCambio} />
            <EditableRow label="Teléfono"           value={employee.phone}   field={EDITABLE_FIELDS[0]} onEdit={setModalCambio} />
            <EditableRow label="Dirección"          value={employee.address} field={EDITABLE_FIELDS[2]} onEdit={setModalCambio} />
          </Section>

          <Section title="Datos Laborales">
            <InfoRow label="Cargo"          value={employee.jobTitle} />
            <InfoRow label="Departamento"   value={employee.department?.name} />
            <InfoRow label="Supervisor"     value={employee.supervisor ? `${employee.supervisor.firstName} ${employee.supervisor.lastName}` : null} />
            <InfoRow label="Tipo contrato"  value={employee.contractType} />
            <InfoRow label="Fecha ingreso"  value={employee.hireDate ? new Date(employee.hireDate).toLocaleDateString("es-DO") : null} />
            {employee.salary != null && (
              <InfoRow label="Salario mensual" value={`RD$ ${Number(employee.salary).toLocaleString("es-DO")}`} />
            )}
          </Section>

          <Section title="Contacto de Emergencia">
            <EditableRow label="Nombre"   value={employee.emergencyName}  field={EDITABLE_FIELDS[3]} onEdit={setModalCambio} />
            <EditableRow label="Teléfono" value={employee.emergencyPhone} field={EDITABLE_FIELDS[4]} onEdit={setModalCambio} />
            <InfoRow     label="Relación" value={employee.emergencyRelation} />
          </Section>

          <Section title="Datos Bancarios">
            <InfoRow     label="Banco"             value={employee.bankName} />
            <EditableRow label="Número de cuenta"  value={employee.bankAccount} field={EDITABLE_FIELDS[5]} onEdit={setModalCambio} />
            <InfoRow     label="AFP"               value={employee.afp} />
            <InfoRow     label="ARS"               value={employee.ars} />
            <InfoRow     label="NSS (TSS)"         value={employee.tssNumber} />
          </Section>
        </div>
      )}

      {/* ── TAB: Cambios de Datos ── */}
      {tab === "cambios" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Solicita correcciones a tus datos personales. Un administrador las revisará.</p>
            <button
              onClick={() => setModalCambio(EDITABLE_FIELDS[0])}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva solicitud
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            {cambios.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No has enviado solicitudes de cambio aún</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {cambios.map(s => (
                  <div key={s.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-800">{s.campoLabel}</span>
                          {estadoBadge(s.estado)}
                        </div>
                        <div className="text-xs text-gray-500 space-y-0.5">
                          <div>Actual: <span className="text-gray-700">{s.valorActual || "—"}</span></div>
                          <div>Solicitado: <span className="font-medium text-blue-700">{s.valorNuevo}</span></div>
                          {s.motivo    && <div>Motivo: {s.motivo}</div>}
                          {s.notasAdmin && <div className="text-amber-600">Nota admin: {s.notasAdmin}</div>}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{new Date(s.createdAt).toLocaleDateString("es-DO")}</p>
                      </div>
                      {s.estado === "PENDIENTE" && (
                        <button onClick={() => cancelCambio(s.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium flex-shrink-0">
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Tiempo Libre ── */}
      {tab === "tiempo" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Solicita vacaciones, permisos o licencias. Aprobación sujeta a revisión del administrador.</p>
            <button
              onClick={() => setModalTiempo(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva solicitud
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            {tiempos.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                No has enviado solicitudes de tiempo libre aún
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {tiempos.map(s => {
                  const tipo = TIPO_SOLICITUD[s.tipo] || { label: s.tipo, color: "bg-gray-100 text-gray-700", icon: "OTRO" };
                  return (
                    <div key={s.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <div className="text-current">{getIconSVG(tipo.icon)}</div>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${tipo.color}`}>{tipo.label}</span>
                            {estadoBadge(s.estado)}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600 mb-1">
                            <span>
                              {new Date(s.fechaInicio).toLocaleDateString("es-DO", { day: "numeric", month: "short" })}
                              {" → "}
                              {new Date(s.fechaFin).toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {s.dias} día{s.dias !== 1 ? "s" : ""} hábil{s.dias !== 1 ? "es" : ""}
                            </span>
                          </div>
                          {s.motivo && <p className="text-xs text-gray-400">Motivo: {s.motivo}</p>}
                          {s.notas  && <p className="text-xs text-amber-600 mt-0.5">Nota admin: {s.notas}</p>}
                          <p className="text-xs text-gray-400 mt-1">{new Date(s.createdAt).toLocaleDateString("es-DO")}</p>
                        </div>
                        {s.estado === "PENDIENTE" && (
                          <button onClick={() => cancelTiempo(s.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium flex-shrink-0">
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: Solicitar cambio de datos ── */}
      {modalCambio && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Solicitar cambio</h3>
                <p className="text-xs text-gray-500 mt-0.5">{modalCambio.campoLabel}</p>
              </div>
              <button onClick={() => { setModalCambio(null); setNewValue(""); setMotivo(""); }}
                className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={submitCambio} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Valor actual</label>
                <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                  {(employee as any)[modalCambio.key] || <span className="italic text-gray-400">Sin datos</span>}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nuevo valor <span className="text-red-500">*</span></label>
                <input type="text" value={newValue} onChange={e => setNewValue(e.target.value)} required
                  placeholder="Ingresa el nuevo valor"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Motivo (opcional)</label>
                <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2}
                  placeholder="¿Por qué solicitas este cambio?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <p className="text-xs text-gray-400">El cambio se aplicará una vez que el administrador lo apruebe.</p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setModalCambio(null); setNewValue(""); setMotivo(""); }}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Enviando..." : "Enviar solicitud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Solicitar tiempo libre ── */}
      {modalTiempo && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Nueva solicitud de tiempo libre</h3>
                <p className="text-xs text-gray-500 mt-0.5">Será revisada por el administrador</p>
              </div>
              <button onClick={() => setModalTiempo(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={submitTiempo} className="px-6 py-5 space-y-4">
              {/* Tipo */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Tipo de solicitud <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TIPO_SOLICITUD).map(([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTipoSol(key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                        tipoSol === key
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <div className="text-current">{getIconSVG(cfg.icon)}</div>
                      <span className="text-xs">{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fecha inicio <span className="text-red-500">*</span></label>
                  <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} required
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fecha fin <span className="text-red-500">*</span></label>
                  <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} required
                    min={fechaInicio || new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Días calculados */}
              {fechaInicio && fechaFin && diasCalc > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm text-blue-700">Días hábiles solicitados:</span>
                  <span className="text-lg font-bold text-blue-700">{diasCalc}</span>
                </div>
              )}

              {/* Motivo */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Motivo (opcional)</label>
                <textarea value={motivoTiempo} onChange={e => setMotivoTiempo(e.target.value)} rows={2}
                  placeholder="Describe el motivo de tu solicitud..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModalTiempo(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Enviando..." : "Enviar solicitud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="px-5 py-4 space-y-3">{children}</div>
    </div>
  );
}
function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value || "—"}</span>
    </div>
  );
}
function EditableRow({ label, value, field, onEdit }: {
  label: string; value: string | null | undefined;
  field: { campo: string; campoLabel: string; key: string };
  onEdit: (f: { campo: string; campoLabel: string; key: string }) => void;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-800">{value || "—"}</span>
        <button onClick={() => onEdit(field)} className="text-blue-500 hover:text-blue-700 p-0.5" title="Solicitar cambio">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
