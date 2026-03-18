"use client";

import { useState, useEffect, useCallback } from "react";

interface Pago {
  id:       string;
  cuotaNum: number;
  periodo:  string;
  monto:    number;
  aplicado: boolean;
}

interface Prestamo {
  id:                string;
  monto:             number;
  cuotas:            number;
  cuotaMonto:        number;
  saldoPendiente:    number;
  cuotasPagadas:     number;
  quincenaInicio:    string;
  frecuencia:        "QUINCENAL" | "MENSUAL";
  fechaAcreditacion: string | null;
  estado:            "ACTIVO" | "PAGADO" | "CANCELADO";
  motivo:            string | null;
  notas:             string | null;
  aprobadoPor:       string | null;
  createdAt:         string;
  pagos:             Pago[];
}

interface Props {
  employeeId: string;
  userRole:   string | null;
}

const fmt = (n: number) =>
  `RD$ ${Math.round(Number(n)).toLocaleString("es-DO")}`;

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function periodoLabel(p: string) {
  const parts = p.split("-");
  if (parts.length === 3) {
    // QUINCENAL: "YYYY-MM-Q"
    const [y, m, q] = parts;
    return `${q === "1" ? "1ra" : "2da"} Quincena ${MESES[parseInt(m) - 1]} ${y}`;
  } else {
    // MENSUAL: "YYYY-MM"
    const [y, m] = parts;
    return `${MESES[parseInt(m) - 1]} ${y}`;
  }
}

// Calcula el primer periodo de descuento dado una fecha y frecuencia
function primerPeriodo(fecha: Date, frecuencia: "QUINCENAL" | "MENSUAL"): string {
  const d = fecha.getDate();
  const m = fecha.getMonth() + 1;
  const y = fecha.getFullYear();
  if (frecuencia === "QUINCENAL") {
    if (d <= 15) return `${y}-${String(m).padStart(2,"0")}-2`;
    const nm = m === 12 ? 1 : m + 1;
    const ny = m === 12 ? y + 1 : y;
    return `${ny}-${String(nm).padStart(2,"0")}-1`;
  } else {
    const nm = m === 12 ? 1 : m + 1;
    const ny = m === 12 ? y + 1 : y;
    return `${ny}-${String(nm).padStart(2,"0")}`;
  }
}

export default function PrestamosSection({ employeeId, userRole }: Props) {
  const isAdmin = userRole === "OWNER_ADMIN";

  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  // New loan form
  const [form, setForm] = useState({
    monto: "", cuotas: "12",
    frecuencia: "QUINCENAL" as "QUINCENAL" | "MENSUAL",
    fechaAcreditacion: "",
    motivo: "", notas: "",
  });

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 5000);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prestamos?employeeId=${employeeId}`);
      if (res.ok) setPrestamos(await res.json());
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.monto || parseFloat(form.monto) <= 0) {
      showToast("Ingresa un monto válido", false); return;
    }
    setSaving(true);
    try {
      const res  = await fetch("/api/prestamos", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, employeeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      setPrestamos(prev => [data, ...prev]);
      setShowForm(false);
      setForm({ monto: "", cuotas: "12", frecuencia: "QUINCENAL", fechaAcreditacion: "", motivo: "", notas: "" });
      showToast("Préstamo registrado correctamente", true);
    } catch (err: any) {
      showToast(err.message, false);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("¿Cancelar este préstamo? Esta acción no se puede deshacer.")) return;
    try {
      await fetch(`/api/prestamos/${id}`, { method: "DELETE" });
      setPrestamos(prev => prev.map(p => p.id === id ? { ...p, estado: "CANCELADO" } : p));
      showToast("Préstamo cancelado", true);
    } catch {
      showToast("Error al cancelar", false);
    }
  }

  const activos    = prestamos.filter(p => p.estado === "ACTIVO");
  const historicos = prestamos.filter(p => p.estado !== "ACTIVO");

  // ── Cuota preview helper ──────────────────────────────────────────────────
  const montoNum  = parseFloat(form.monto) || 0;
  const cuotasNum = parseInt(form.cuotas) || 1;
  const cuotaCalc = montoNum > 0 ? Math.ceil(montoNum / cuotasNum) : 0;

  // Compute first deduction period preview
  const primerPeriodoPreview = form.fechaAcreditacion
    ? periodoLabel(primerPeriodo(new Date(form.fechaAcreditacion + "T12:00:00"), form.frecuencia))
    : null;

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9998,
          padding: "12px 18px", borderRadius: 12,
          background: toast.ok ? "#16a34a" : "#dc2626",
          color: "white", fontWeight: 500, fontSize: 14,
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          display: "flex", gap: 10, alignItems: "center",
        }}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500">Préstamos</p>
          {activos.length > 0 && (
            <p className="text-xs text-amber-500 mt-0.5">{activos.length} préstamo{activos.length !== 1 ? "s" : ""} activo{activos.length !== 1 ? "s" : ""}</p>
          )}
        </div>
        {isAdmin && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Registrar préstamo
          </button>
        )}
      </div>

      {/* New loan form */}
      {showForm && isAdmin && (
        <div className="rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-900/10 p-5">
          <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-4">Nuevo préstamo</p>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Monto total (RD$) *</label>
                <input
                  type="number"
                  value={form.monto}
                  onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                  placeholder="50,000"
                  min="1"
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Número de cuotas ({form.frecuencia === "MENSUAL" ? "meses" : "quincenas"}) *</label>
                <input
                  type="number"
                  value={form.cuotas}
                  onChange={e => setForm(f => ({ ...f, cuotas: e.target.value }))}
                  min="1" max="60"
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
            </div>

            {/* Frecuencia de pago */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Frecuencia de pago *</label>
              <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, frecuencia: "QUINCENAL" }))}
                  className={`flex-1 px-4 py-2 font-medium transition ${form.frecuencia === "QUINCENAL" ? "bg-blue-600 text-white" : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50"}`}
                >
                  Quincenal
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, frecuencia: "MENSUAL" }))}
                  className={`flex-1 px-4 py-2 border-l border-zinc-200 dark:border-zinc-700 font-medium transition ${form.frecuencia === "MENSUAL" ? "bg-blue-600 text-white" : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50"}`}
                >
                  Mensual
                </button>
              </div>
            </div>

            {/* Fecha acreditación */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Fecha de acreditación del préstamo *</label>
              <input
                type="date"
                value={form.fechaAcreditacion}
                onChange={e => setForm(f => ({ ...f, fechaAcreditacion: e.target.value }))}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
              {primerPeriodoPreview && (
                <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-medium">
                  📅 Primer descuento: {primerPeriodoPreview}
                </p>
              )}
            </div>

            {/* Cuota preview */}
            {cuotaCalc > 0 && (
              <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500">Cuota {form.frecuencia === "MENSUAL" ? "mensual" : "quincenal"} estimada</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-300 mt-0.5">{fmt(cuotaCalc)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Duración</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 mt-0.5">
                    {cuotasNum} {form.frecuencia === "MENSUAL" ? "meses" : `quincenas ≈ ${Math.ceil(cuotasNum / 2)} ${Math.ceil(cuotasNum / 2) === 1 ? "mes" : "meses"}`}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Motivo / Propósito</label>
              <input
                type="text"
                value={form.motivo}
                onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
                placeholder="Emergencia médica, compra de vehículo, etc."
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Notas internas</label>
              <textarea
                value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                rows={2}
                placeholder="Condiciones especiales, referencias del acuerdo..."
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition"
              >
                {saving ? "Guardando..." : "Registrar préstamo"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active loans */}
      {loading ? (
        <p className="text-sm text-zinc-400 text-center py-4">Cargando préstamos...</p>
      ) : activos.length === 0 && historicos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 p-6 text-center">
          <p className="text-sm text-zinc-400">No hay préstamos registrados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activos.map(p => (
            <PrestamoCard
              key={p.id}
              prestamo={p}
              isAdmin={isAdmin}
              expanded={expanded === p.id}
              onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
              onCancel={() => handleCancel(p.id)}
            />
          ))}

          {historicos.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-600 py-2">
                Ver historial ({historicos.length} préstamo{historicos.length !== 1 ? "s" : ""})
              </summary>
              <div className="space-y-2 mt-2">
                {historicos.map(p => (
                  <PrestamoCard
                    key={p.id}
                    prestamo={p}
                    isAdmin={false}
                    expanded={expanded === p.id}
                    onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

/* ── PrestamoCard ─────────────────────────────────────────────────────────── */
function PrestamoCard({
  prestamo,
  isAdmin,
  expanded,
  onToggle,
  onCancel,
}: {
  prestamo: Prestamo;
  isAdmin:  boolean;
  expanded: boolean;
  onToggle: () => void;
  onCancel?: () => void;
}) {
  const pct     = prestamo.cuotas > 0
    ? Math.round((prestamo.cuotasPagadas / prestamo.cuotas) * 100)
    : 0;
  const saldo   = Number(prestamo.saldoPendiente);
  const cuota   = Number(prestamo.cuotaMonto);
  const monto   = Number(prestamo.monto);
  const pagadas = prestamo.cuotasPagadas;
  const totales = prestamo.cuotas;

  const ESTADO_CFG = {
    ACTIVO:    { label: "Activo",    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
    PAGADO:    { label: "Pagado",    cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
    CANCELADO: { label: "Cancelado", cls: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" },
  };
  const cfg = ESTADO_CFG[prestamo.estado];

  return (
    <div className={`rounded-xl border ${prestamo.estado === "ACTIVO" ? "border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-900/10" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40"} overflow-hidden`}>
      {/* Summary row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-black/5 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{fmt(monto)}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
                {prestamo.frecuencia === "MENSUAL" ? "Mensual" : "Quincenal"}
              </span>
              {prestamo.motivo && (
                <span className="text-xs text-zinc-400">· {prestamo.motivo}</span>
              )}
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">
              {fmt(cuota)}/{prestamo.frecuencia === "MENSUAL" ? "mes" : "quincena"} · {pagadas}/{totales} cuotas · Saldo: {fmt(saldo)}
            </div>
            {prestamo.fechaAcreditacion && (
              <div className="text-xs text-zinc-400 mt-0.5">
                Acreditado: {new Date(prestamo.fechaAcreditacion).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Progress bar */}
          <div className="hidden sm:flex flex-col items-end gap-1">
            <span className="text-[10px] text-zinc-400">{pct}% pagado</span>
            <div className="w-24 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <svg className={`w-4 h-4 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </button>

      {/* Expanded: cronograma */}
      {expanded && (
        <div className="border-t border-amber-100 dark:border-amber-900/30 px-4 pb-4">
          <div className="flex items-center justify-between py-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cronograma de pagos</p>
            {isAdmin && prestamo.estado === "ACTIVO" && onCancel && (
              <button
                onClick={onCancel}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Cancelar préstamo
              </button>
            )}
          </div>

          {prestamo.notas && (
            <p className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 mb-3">
              📋 {prestamo.notas}
            </p>
          )}
          {prestamo.aprobadoPor && (
            <p className="text-xs text-zinc-400 mb-3">Autorizado por: <span className="font-medium">{prestamo.aprobadoPor}</span></p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="pb-2 text-left pr-4">Cuota</th>
                  <th className="pb-2 text-left pr-4">Período</th>
                  <th className="pb-2 text-right pr-4">Monto</th>
                  <th className="pb-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {prestamo.pagos.map(pago => (
                  <tr key={pago.id} className="border-b border-zinc-50 dark:border-zinc-800/50">
                    <td className="py-1.5 pr-4 font-medium text-zinc-600 dark:text-zinc-400">#{pago.cuotaNum}</td>
                    <td className="py-1.5 pr-4 text-zinc-500">{periodoLabel(pago.periodo)}</td>
                    <td className="py-1.5 pr-4 text-right font-medium text-gray-900 dark:text-zinc-200">{fmt(Number(pago.monto))}</td>
                    <td className="py-1.5 text-center">
                      {pago.aplicado ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                          </svg>
                          Pagado
                        </span>
                      ) : (
                        <span className="text-zinc-400">Pendiente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
