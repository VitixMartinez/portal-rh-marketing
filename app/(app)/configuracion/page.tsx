"use client";

import { useEffect, useState, useCallback } from "react";

/* ── Types ─────────────────────────────────────────────────────────────── */
type Dept = { id: string; name: string; _count: { employees: number } };
type Feriado = { id: string; nombre: string; fecha: string; tipo: string; recurrente: boolean };

/* ── Constants ─────────────────────────────────────────────────────────── */
const DIAS_SEMANA = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

type Tab = "empresa" | "departamentos" | "feriados" | "politicas";

/* ── Component ─────────────────────────────────────────────────────────── */
export default function ConfiguracionPage() {
  const [tab, setTab] = useState<Tab>("empresa");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "empresa",       label: "Mi Empresa",       icon: "🏢" },
    { id: "departamentos", label: "Departamentos",     icon: "📁" },
    { id: "feriados",      label: "Feriados",          icon: "🗓️" },
    { id: "politicas",     label: "Políticas",          icon: "📋" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuración</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">Administra la información y parámetros de tu empresa</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="border-b border-gray-100 dark:border-zinc-800 px-4 flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={["px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2",
                tab === t.id ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200",
              ].join(" ")}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "empresa"       && <TabEmpresa />}
          {tab === "departamentos" && <TabDepartamentos />}
          {tab === "feriados"      && <TabFeriados />}
          {tab === "politicas"     && <TabPoliticas />}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Tab: Mi Empresa
═══════════════════════════════════════════════════════════════════════════ */
function TabEmpresa() {
  const [form, setForm] = useState({
    nombre:        "",
    rnc:           "",
    direccion:     "",
    telefono:      "",
    email:         "",
    website:       "",
    ciudad:        "",
    sector:        "",
    empleadosMax:  "",
    moneda:        "RD$",
    zonaHoraria:   "America/Santo_Domingo",
    salarioMinimo: "21000",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  // Load company data on mount
  useEffect(() => {
    fetch("/api/company")
      .then(r => r.json())
      .then(data => {
        if (data.error) return;
        const s = data.settings ?? {};
        setForm({
          nombre:        data.name        ?? "",
          rnc:           data.rnc         ?? "",
          direccion:     s.direccion      ?? "",
          telefono:      s.telefono       ?? "",
          email:         s.email          ?? "",
          website:       s.website        ?? "",
          ciudad:        s.ciudad         ?? "",
          sector:        s.sector         ?? "",
          empleadosMax:  s.empleadosMax   ?? "",
          moneda:        s.moneda         ?? "RD$",
          zonaHoraria:   s.zonaHoraria    ?? "America/Santo_Domingo",
          salarioMinimo: String(s.salarioMinimo ?? "21000"),
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.nombre,
          rnc:  form.rnc,
          settings: {
            direccion:     form.direccion,
            telefono:      form.telefono,
            email:         form.email,
            website:       form.website,
            ciudad:        form.ciudad,
            sector:        form.sector,
            empleadosMax:  form.empleadosMax,
            moneda:        form.moneda,
            zonaHoraria:   form.zonaHoraria,
            salarioMinimo: Number(form.salarioMinimo) || 21000,
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error al guardar");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const inp = "w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition";
  const lbl = "block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1";

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Cargando...</div>;

  return (
    <form onSubmit={save} className="max-w-2xl space-y-5">
      <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-sm flex-shrink-0">
          {form.nombre.charAt(0) || "E"}
        </div>
        <div>
          <div className="font-bold text-gray-900 dark:text-white">{form.nombre || "Nombre de empresa"}</div>
          {form.rnc && <div className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">RNC: {form.rnc}</div>}
          <div className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">República Dominicana</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Nombre de la empresa *</label>
          <input required value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} className={inp} />
        </div>
        <div>
          <label className={lbl}>RNC</label>
          <input placeholder="1-23-45678-9" value={form.rnc} onChange={e => setForm(p => ({ ...p, rnc: e.target.value }))} className={inp} />
        </div>
        <div>
          <label className={lbl}>Teléfono</label>
          <input placeholder="809-000-0000" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} className={inp} />
        </div>
        <div>
          <label className={lbl}>Email corporativo</label>
          <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inp} />
        </div>
        <div>
          <label className={lbl}>Ciudad</label>
          <input placeholder="Santo Domingo" value={form.ciudad} onChange={e => setForm(p => ({ ...p, ciudad: e.target.value }))} className={inp} />
        </div>
        <div>
          <label className={lbl}>Sector / Industria</label>
          <select value={form.sector} onChange={e => setForm(p => ({ ...p, sector: e.target.value }))} className={inp}>
            <option value="">Seleccionar</option>
            <option value="tecnologia">Tecnología</option>
            <option value="manufactura">Manufactura</option>
            <option value="servicios">Servicios</option>
            <option value="comercio">Comercio / Retail</option>
            <option value="salud">Salud</option>
            <option value="educacion">Educación</option>
            <option value="construccion">Construcción</option>
            <option value="turismo">Turismo / Hotelería</option>
            <option value="financiero">Financiero / Seguros</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Dirección</label>
          <input value={form.direccion} onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))} placeholder="Calle, No., Sector, Ciudad" className={inp} />
        </div>
        <div>
          <label className={lbl}>Sitio web</label>
          <input placeholder="https://miempresa.com.do" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} className={inp} />
        </div>
        <div>
          <label className={lbl}>Moneda</label>
          <select value={form.moneda} onChange={e => setForm(p => ({ ...p, moneda: e.target.value }))} className={inp}>
            <option value="RD$">RD$ — Peso dominicano</option>
            <option value="US$">US$ — Dólar americano</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Zona horaria</label>
          <select value={form.zonaHoraria} onChange={e => setForm(p => ({ ...p, zonaHoraria: e.target.value }))} className={inp}>
            <option value="America/Santo_Domingo">América/Santo Domingo (AST, UTC-4)</option>
          </select>
        </div>
      </div>

      {/* Nómina y beneficios */}
      <div className="pt-2 border-t border-gray-100 dark:border-zinc-800">
        <h3 className="text-sm font-bold text-gray-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-base">💰</span>
          Nómina y Beneficios
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Salario Mínimo Nacional (RD$)</label>
            <input
              type="number"
              min="0"
              step="100"
              placeholder="21000"
              value={form.salarioMinimo}
              onChange={e => setForm(p => ({ ...p, salarioMinimo: e.target.value }))}
              className={inp}
            />
            <p className="mt-1 text-[11px] text-gray-400 dark:text-zinc-500">
              Usado para calcular el tope de Regalía Pascual (5× salario mínimo). Varía según sector y tamaño de empresa.
            </p>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition shadow-sm disabled:opacity-50">
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
        {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">✓ Guardado</span>}
      </div>
    </form>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Tab: Departamentos
═══════════════════════════════════════════════════════════════════════════ */
function TabDepartamentos() {
  const [depts, setDepts]     = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editId, setEditId]   = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/departamentos");
    setDepts(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addDept(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/departamentos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName }) });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewName(""); await load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function saveName(id: string) {
    setSaving(true);
    await fetch(`/api/departamentos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName }) });
    setEditId(null); setSaving(false); await load();
  }

  async function deleteDept(id: string, empCount: number) {
    if (empCount > 0) { alert(`No se puede eliminar: hay ${empCount} empleado${empCount !== 1 ? "s" : ""} en este departamento.`); return; }
    if (!confirm("¿Eliminar este departamento?")) return;
    await fetch(`/api/departamentos/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="max-w-xl space-y-5">
      <form onSubmit={addDept} className="flex gap-2">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre del nuevo departamento..."
          className="flex-1 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" disabled={saving || !newName.trim()}
          className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50">
          + Agregar
        </button>
      </form>
      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>
      ) : depts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📁</div>
          <p className="text-sm text-gray-400">Sin departamentos creados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {depts.map(d => (
            <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-800/40">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-bold flex-shrink-0">
                {d.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                {editId === d.id ? (
                  <div className="flex gap-2">
                    <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                      className="flex-1 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-zinc-800 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button onClick={() => saveName(d.id)} className="text-xs text-blue-600 font-semibold hover:underline">Guardar</button>
                    <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:underline">Cancelar</button>
                  </div>
                ) : (
                  <div>
                    <div className="font-semibold text-sm text-gray-900 dark:text-zinc-100">{d.name}</div>
                    <div className="text-xs text-gray-400 dark:text-zinc-500">{d._count.employees} empleado{d._count.employees !== 1 ? "s" : ""}</div>
                  </div>
                )}
              </div>
              {editId !== d.id && (
                <div className="flex gap-1">
                  <button onClick={() => { setEditId(d.id); setEditName(d.name); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-400 transition">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => deleteDept(d.id, d._count.employees)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-400 transition">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Tab: Feriados
═══════════════════════════════════════════════════════════════════════════ */
function TabFeriados() {
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState({ nombre: "", fecha: "", tipo: "EMPRESA" });
  const [saving, setSaving]     = useState(false);
  const [precargando, setPrecargando] = useState(false);
  const year = new Date().getFullYear();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/feriados?year=${year}`);
    setFeriados(res.ok ? await res.json() : []);
    setLoading(false);
  }, [year]);

  useEffect(() => { load(); }, [load]);

  async function precargar() {
    setPrecargando(true);
    try {
      await fetch("/api/feriados", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "precargar_rd", year }) });
      await load();
    } finally { setPrecargando(false); }
  }

  async function addFeriado(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/feriados", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form }) });
      if (!res.ok) throw new Error((await res.json()).error);
      setForm({ nombre: "", fecha: "", tipo: "EMPRESA" });
      await load();
    } finally { setSaving(false); }
  }

  async function deleteFeriado(id: string) {
    await fetch(`/api/feriados/${id}`, { method: "DELETE" });
    await load();
  }

  const nacionales = feriados.filter(f => f.tipo === "NACIONAL");
  const empresa    = feriados.filter(f => f.tipo !== "NACIONAL");

  return (
    <div className="max-w-2xl space-y-6">
      {/* Pre-cargar RD */}
      <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">Feriados nacionales República Dominicana {year}</div>
          <div className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">12 feriados oficiales según calendario RD</div>
        </div>
        <button onClick={precargar} disabled={precargando || nacionales.length > 0}
          className="flex-shrink-0 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 shadow-sm">
          {precargando ? "Cargando..." : nacionales.length > 0 ? "✓ Cargados" : "Pre-cargar feriados RD"}
        </button>
      </div>

      {/* Feriados nacionales */}
      {nacionales.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-3">Feriados Nacionales ({nacionales.length})</h3>
          <div className="space-y-1.5">
            {nacionales.map(f => {
              const d   = new Date(f.fecha);
              const dia = DIAS_SEMANA[d.getUTCDay()];
              return (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-800/40">
                  <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-red-600 dark:text-red-400">{MESES[d.getUTCMonth()]}</span>
                    <span className="text-lg font-black text-red-600 dark:text-red-400 leading-none">{d.getUTCDate()}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900 dark:text-zinc-100">{f.nombre}</div>
                    <div className="text-xs text-gray-400 dark:text-zinc-500">{dia}</div>
                  </div>
                  <button onClick={() => deleteFeriado(f.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-400 transition">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Agregar feriado empresa */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-3">Agregar feriado de empresa</h3>
        <form onSubmit={addFeriado} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-1">
            <label className="text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1 block">Nombre</label>
            <input required value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Fundación de empresa"
              className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1 block">Fecha</label>
            <input required type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" disabled={saving}
            className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 shadow-sm">
            + Agregar
          </button>
        </form>

        {empresa.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {empresa.map(f => {
              const d = new Date(f.fecha);
              return (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-800/40">
                  <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-900/30 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{MESES[d.getUTCMonth()]}</span>
                    <span className="text-lg font-black text-violet-600 dark:text-violet-400 leading-none">{d.getUTCDate()}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900 dark:text-zinc-100">{f.nombre}</div>
                    <div className="text-xs text-violet-500 dark:text-violet-400">Feriado de empresa</div>
                  </div>
                  <button onClick={() => deleteFeriado(f.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-400 transition">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Tab: Políticas
═══════════════════════════════════════════════════════════════════════════ */
const DEFAULT_POLITICAS = {
  horaEntrada:       "08:00",
  horaSalida:        "17:00",
  horaAlmuerzo:      "12:00",
  durAlmuerzo:       "60",
  diasLaborales:     "Lunes a Viernes",
  preaviso:          "28",
  vacBase:           "14",
  vacMax:            "18",
  srlRate:           "1.20",
  afpRate:           "2.87",
  afpPatRate:        "7.10",
  sfsRate:           "3.04",
  sfsPatRate:        "7.09",
  periodoEvaluacion: "Semestral",
  recordatorioAniv:  "30",
};

function TabPoliticas() {
  const [form, setForm]       = useState(DEFAULT_POLITICAS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  // Load policies from company settings on mount
  useEffect(() => {
    fetch("/api/company")
      .then(r => r.json())
      .then(data => {
        if (data.error) return;
        const s = data.settings ?? {};
        setForm({
          horaEntrada:       s.horaEntrada       ?? DEFAULT_POLITICAS.horaEntrada,
          horaSalida:        s.horaSalida        ?? DEFAULT_POLITICAS.horaSalida,
          horaAlmuerzo:      s.horaAlmuerzo      ?? DEFAULT_POLITICAS.horaAlmuerzo,
          durAlmuerzo:       s.durAlmuerzo       ?? DEFAULT_POLITICAS.durAlmuerzo,
          diasLaborales:     s.diasLaborales     ?? DEFAULT_POLITICAS.diasLaborales,
          preaviso:          s.preaviso          ?? DEFAULT_POLITICAS.preaviso,
          vacBase:           s.vacBase           ?? DEFAULT_POLITICAS.vacBase,
          vacMax:            s.vacMax            ?? DEFAULT_POLITICAS.vacMax,
          srlRate:           s.srlRate           ?? DEFAULT_POLITICAS.srlRate,
          afpRate:           s.afpRate           ?? DEFAULT_POLITICAS.afpRate,
          afpPatRate:        s.afpPatRate        ?? DEFAULT_POLITICAS.afpPatRate,
          sfsRate:           s.sfsRate           ?? DEFAULT_POLITICAS.sfsRate,
          sfsPatRate:        s.sfsPatRate        ?? DEFAULT_POLITICAS.sfsPatRate,
          periodoEvaluacion: s.periodoEvaluacion ?? DEFAULT_POLITICAS.periodoEvaluacion,
          recordatorioAniv:  s.recordatorioAniv  ?? DEFAULT_POLITICAS.recordatorioAniv,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: form }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error al guardar");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const inp = "w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const lbl = "block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1";

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Cargando...</div>;

  return (
    <form onSubmit={save} className="max-w-2xl space-y-8">

      {/* Marco Legal */}
      <div className="rounded-2xl border border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/10 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0 mt-0.5">⚖️</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-gray-900 dark:text-white mb-0.5">
              Código de Trabajo — Ley 16-92
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">
              Consulta la legislación laboral dominicana vigente en las fuentes oficiales del Estado.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://mt.gob.do/wp-content/uploads/2024/07/codigo_de_trabajo.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-800 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-700 transition shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Ministerio de Trabajo (PDF)
              </a>
              <a
                href="https://poderjudicial.gob.do/wp-content/uploads/2021/06/Codigo_Trabajo.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-800 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-700 transition shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Poder Judicial (PDF)
              </a>
              <a
                href="https://ojd.org.do/documentos/ley-num-16-92-codigo-de-trabajo-de-la-republica-dominicana/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-800 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-700 transition shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Observatorio Judicial
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Horario laboral */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-base">🕐</span>
          Horario laboral
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Hora de entrada</label>
            <input type="time" value={form.horaEntrada} onChange={e => setForm(p => ({ ...p, horaEntrada: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>Hora de salida</label>
            <input type="time" value={form.horaSalida} onChange={e => setForm(p => ({ ...p, horaSalida: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>Inicio almuerzo</label>
            <input type="time" value={form.horaAlmuerzo} onChange={e => setForm(p => ({ ...p, horaAlmuerzo: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>Duración almuerzo (min)</label>
            <input type="number" min="30" max="120" value={form.durAlmuerzo} onChange={e => setForm(p => ({ ...p, durAlmuerzo: e.target.value }))} className={inp} />
          </div>
          <div className="col-span-2">
            <label className={lbl}>Días laborales</label>
            <select value={form.diasLaborales} onChange={e => setForm(p => ({ ...p, diasLaborales: e.target.value }))} className={inp}>
              <option value="Lunes a Viernes">Lunes a Viernes (5 días)</option>
              <option value="Lunes a Sábado">Lunes a Sábado (6 días)</option>
              <option value="Lunes a Domingo">Lunes a Domingo (7 días)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vacaciones (Ley 16-92) */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 dark:text-zinc-300 mb-1 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-base">🏖️</span>
          Política de vacaciones — Ley 16-92
        </h3>
        <p className="text-xs text-gray-400 dark:text-zinc-500 mb-4 ml-9">Según la ley laboral dominicana</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Días año 1–4</label>
            <div className="flex items-center gap-2">
              <input type="number" min="14" value={form.vacBase} onChange={e => setForm(p => ({ ...p, vacBase: e.target.value }))} className={inp} />
              <span className="text-xs text-gray-400 flex-shrink-0">días</span>
            </div>
          </div>
          <div>
            <label className={lbl}>Días año 5+</label>
            <div className="flex items-center gap-2">
              <input type="number" min="18" value={form.vacMax} onChange={e => setForm(p => ({ ...p, vacMax: e.target.value }))} className={inp} />
              <span className="text-xs text-gray-400 flex-shrink-0">días</span>
            </div>
          </div>
          <div>
            <label className={lbl}>Preaviso de desahucio</label>
            <div className="flex items-center gap-2">
              <input type="number" value={form.preaviso} onChange={e => setForm(p => ({ ...p, preaviso: e.target.value }))} className={inp} />
              <span className="text-xs text-gray-400 flex-shrink-0">días</span>
            </div>
          </div>
        </div>
      </div>

      {/* TSS */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 dark:text-zinc-300 mb-1 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-base">🏥</span>
          Tasas TSS vigentes
        </h3>
        <p className="text-xs text-gray-400 dark:text-zinc-500 mb-4 ml-9">AFP, SFS y SRL según normativa SIPEN/SISALRIL</p>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "AFP empleado",  key: "afpRate",    note: "% del salario" },
            { label: "AFP patronal",  key: "afpPatRate", note: "% del salario" },
            { label: "SFS empleado",  key: "sfsRate",    note: "% del salario" },
            { label: "SFS patronal",  key: "sfsPatRate", note: "% del salario" },
            { label: "SRL (patronal)",key: "srlRate",    note: "% del salario" },
          ].map(f => (
            <div key={f.key}>
              <label className={lbl}>{f.label}</label>
              <div className="flex items-center gap-2">
                <input type="number" step="0.01" min="0" value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className={inp} />
                <span className="text-xs text-gray-400 flex-shrink-0">{f.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desempeño y aniversarios */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-base">⭐</span>
          Desempeño y reconocimientos
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Período de evaluación</label>
            <select value={form.periodoEvaluacion} onChange={e => setForm(p => ({ ...p, periodoEvaluacion: e.target.value }))} className={inp}>
              <option value="Mensual">Mensual</option>
              <option value="Trimestral">Trimestral</option>
              <option value="Semestral">Semestral</option>
              <option value="Anual">Anual</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Aviso previo aniversario</label>
            <div className="flex items-center gap-2">
              <input type="number" min="1" max="60" value={form.recordatorioAniv} onChange={e => setForm(p => ({ ...p, recordatorioAniv: e.target.value }))} className={inp} />
              <span className="text-xs text-gray-400 flex-shrink-0">días antes</span>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition shadow-sm disabled:opacity-50">
          {saving ? "Guardando..." : "Guardar políticas"}
        </button>
        {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">✓ Guardado</span>}
      </div>
    </form>
  );
}
