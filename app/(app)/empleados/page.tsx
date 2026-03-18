"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type EmployeeStatus = "ACTIVO" | "INACTIVO" | "SUSPENDIDO";
type ContractType   = "INDEFINIDO" | "TEMPORAL" | "POR_OBRA" | "PRUEBA";

type Employee = {
  id:                string;
  firstName:         string;
  lastName:          string;
  cedula:            string | null;
  jobTitle:          string | null;
  hireDate:          string | null;
  status:            EmployeeStatus;
  contractType:      ContractType;
  salary:            number | null;
  phone:             string | null;
  email:             string | null;
  address:           string | null;
  birthDate:         string | null;
  gender:            string | null;
  nationality:       string | null;
  maritalStatus:     string | null;
  emergencyName:     string | null;
  emergencyPhone:    string | null;
  emergencyRelation: string | null;
  payPeriod:         string | null;
  bankName:          string | null;
  bankAccount:       string | null;
  tssNumber:         string | null;
  afp:               string | null;
  ars:               string | null;
  supervisorId:      string | null;
  photoUrl:          string | null;
  supervisor:        { id: string; firstName: string; lastName: string } | null;
  department:        { id: string; name: string } | null;
};

const EMPTY_FORM = {
  firstName:         "",
  lastName:          "",
  cedula:            "",
  phone:             "",
  email:             "",
  address:           "",
  birthDate:         "",
  gender:            "",
  nationality:       "Dominicana",
  maritalStatus:     "",
  emergencyName:     "",
  emergencyPhone:    "",
  emergencyRelation: "",
  jobTitle:          "",
  hireDate:          "",
  status:            "ACTIVO"     as EmployeeStatus,
  contractType:      "INDEFINIDO" as ContractType,
  salary:            "",
  payPeriod:         "MENSUAL",
  bankName:          "",
  bankAccount:       "",
  tssNumber:         "",
  afp:               "",
  ars:               "",
  supervisorId:      "",
  departmentName:    "",
  // Commission fields (not sent to main employee API — handled separately)
  comisionActiva:     false as boolean,
  comisionPorcentaje: "",
  comisionFrecuencia: "QUINCENAL",
};

const EMPTY_ACCESO_FORM = {
  email:           "",
  password:        "",
  confirmPassword: "",
  role:            "OWNER_ADMIN",
};

function isRRHH(dept: string): boolean {
  const d = dept.toLowerCase().trim();
  return d.includes("recurso") || d.includes("rrhh") || d === "rh" || d.includes("human");
}

const STATUS_LABEL: Record<EmployeeStatus, string> = {
  ACTIVO: "Activo", INACTIVO: "Inactivo", SUSPENDIDO: "Suspendido",
};
const STATUS_CLASS: Record<EmployeeStatus, string> = {
  ACTIVO:     "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-600/20 dark:text-blue-200 dark:border-blue-600/30",
  INACTIVO:   "bg-zinc-100 text-zinc-600 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700",
  SUSPENDIDO: "bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-600/20 dark:text-yellow-200 dark:border-yellow-600/30",
};
const CONTRACT_LABEL: Record<ContractType, string> = {
  INDEFINIDO: "Indefinido", TEMPORAL: "Temporal", POR_OBRA: "Por Obra", PRUEBA: "Prueba",
};

const inputClass   = "w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition";
const labelClass   = "block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1";
const sectionClass = "border-t border-gray-100 dark:border-zinc-800 pt-4 mt-4";
const sectionTitle = "text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-3";

const AVATAR_COLORS = [
  "bg-blue-500","bg-violet-500","bg-emerald-500","bg-amber-500",
  "bg-rose-500","bg-sky-500","bg-indigo-500","bg-teal-500",
];
function getAvatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

type Department = { id: string; name: string };

export default function EmpleadosPage() {
  const [employees,    setEmployees]    = useState<Employee[]>([]);
  const [departments,  setDepartments]  = useState<Department[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [query,        setQuery]        = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [panelOpen,    setPanelOpen]    = useState(false);
  const [editId,       setEditId]       = useState<string | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState<string | null>(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [error,        setError]        = useState("");
  const [tab,          setTab]          = useState<"personal" | "laboral" | "seguridad">("personal");

  // Acceso administrativo RH
  const [accesoModal,     setAccesoModal]     = useState(false);
  const [accesoEmpId,     setAccesoEmpId]     = useState<string | null>(null);
  const [accesoEmpName,   setAccesoEmpName]   = useState("");
  const [accesoForm,      setAccesoForm]      = useState(EMPTY_ACCESO_FORM);
  const [accesoSaving,    setAccesoSaving]    = useState(false);
  const [accesoError,     setAccesoError]     = useState("");
  const [accesoExisting,  setAccesoExisting]  = useState<{ email: string; role: string; createdAt: string } | null>(null);
  const [accesoStep,      setAccesoStep]      = useState<"ask" | "form" | "done">("ask");

  const searchParams = useSearchParams();

  // Load departments once on mount
  useEffect(() => {
    fetch("/api/departamentos")
      .then(r => r.ok ? r.json() : [])
      .then(data => setDepartments(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query)                    params.set("q",      query);
      if (statusFilter !== "Todos") params.set("status", statusFilter);
      const res  = await fetch(`/api/employees?${params}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message ?? "Error al cargar empleados");
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Abrir panel de edición si viene ?edit=id en la URL
  useEffect(() => {
    const editIdParam = searchParams.get("edit");
    if (editIdParam && employees.length > 0) {
      const emp = employees.find(e => e.id === editIdParam);
      if (emp) openEdit(emp);
    }
  }, [searchParams, employees]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setTab("personal");
    setPanelOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditId(emp.id);
    setForm({
      firstName:         emp.firstName         ?? "",
      lastName:          emp.lastName          ?? "",
      cedula:            emp.cedula            ?? "",
      phone:             emp.phone             ?? "",
      email:             emp.email             ?? "",
      address:           emp.address           ?? "",
      birthDate:         emp.birthDate         ? emp.birthDate.slice(0, 10) : "",
      gender:            emp.gender            ?? "",
      nationality:       emp.nationality       ?? "Dominicana",
      maritalStatus:     emp.maritalStatus     ?? "",
      emergencyName:     emp.emergencyName     ?? "",
      emergencyPhone:    emp.emergencyPhone    ?? "",
      emergencyRelation: emp.emergencyRelation ?? "",
      jobTitle:          emp.jobTitle          ?? "",
      hireDate:          emp.hireDate          ? emp.hireDate.slice(0, 10) : "",
      status:            emp.status            ?? "ACTIVO",
      contractType:      emp.contractType      ?? "INDEFINIDO",
      salary:            emp.salary != null    ? String(emp.salary) : "",
      payPeriod:         emp.payPeriod         ?? "MENSUAL",
      bankName:          emp.bankName          ?? "",
      bankAccount:       emp.bankAccount       ?? "",
      tssNumber:         emp.tssNumber         ?? "",
      afp:               emp.afp               ?? "",
      ars:               emp.ars               ?? "",
      supervisorId:      emp.supervisorId      ?? "",
      departmentName:    emp.department?.name  ?? "",
      comisionActiva:    false,
      comisionPorcentaje: "",
      comisionFrecuencia: "QUINCENAL",
    });
    // Load commission settings for this employee
    fetch(`/api/empleados/${emp.id}/comision`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setForm(prev => ({
          ...prev,
          comisionActiva:     d.comisionActiva,
          comisionPorcentaje: d.comisionPorcentaje > 0 ? String(d.comisionPorcentaje) : "",
          comisionFrecuencia: d.comisionFrecuencia ?? "QUINCENAL",
        }));
      });
    // Load existing user account info if this is an RH employee
    if (emp.department && isRRHH(emp.department.name)) {
      fetch(`/api/empleados/${emp.id}/usuario`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          setAccesoExisting(d?.hasAccess ? d.user : null);
        })
        .catch(() => setAccesoExisting(null));
    } else {
      setAccesoExisting(null);
    }
    setTab("personal");
    setPanelOpen(true);
  }

  const f = (key: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const isNew = !editId;
      const url    = editId ? `/api/employees/${editId}` : "/api/employees";
      const method = editId ? "PATCH" : "POST";
      // Strip commission fields — they go to a separate endpoint
      const { comisionActiva, comisionPorcentaje, comisionFrecuencia, ...empFields } = form;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...empFields, salary: empFields.salary || null }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const saved = await res.json();
      const empId = editId ?? saved.id;

      // Save commission settings if employee has an ID
      if (empId) {
        await fetch(`/api/empleados/${empId}/comision`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            comisionActiva,
            comisionPorcentaje: parseFloat(comisionPorcentaje as string) || 0,
            comisionFrecuencia,
          }),
        });
      }

      await load();
      setPanelOpen(false);

      // Si es nuevo y es de Recursos Humanos, preguntar sobre acceso administrativo
      if (isNew && isRRHH(form.departmentName)) {
        setAccesoEmpId(empId);
        setAccesoEmpName(`${form.firstName} ${form.lastName}`);
        setAccesoForm({ ...EMPTY_ACCESO_FORM, email: form.email ?? "" });
        setAccesoError("");
        setAccesoStep("ask");
        setAccesoModal(true);
      }
    } catch (e: any) {
      alert("Error al guardar: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function onGrantAcceso() {
    if (!accesoEmpId) return;
    if (accesoForm.password !== accesoForm.confirmPassword) {
      setAccesoError("Las contraseñas no coinciden");
      return;
    }
    if (accesoForm.password.length < 6) {
      setAccesoError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (!accesoForm.email) {
      setAccesoError("El correo es requerido");
      return;
    }
    setAccesoSaving(true);
    setAccesoError("");
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: accesoEmpId,
          email: accesoForm.email,
          password: accesoForm.password,
          role: accesoForm.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setAccesoStep("done");
    } catch (e: any) {
      setAccesoError(e.message);
    } finally {
      setAccesoSaving(false);
    }
  }

  async function onRevokeAcceso(empId: string) {
    if (!confirm("¿Revocar el acceso al portal de este empleado? No podrá iniciar sesión.")) return;
    try {
      const res = await fetch(`/api/empleados/${empId}/usuario`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setAccesoExisting(null);
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar este empleado?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/employees/${id}`, { method: "DELETE" });
      setEmployees(prev => prev.filter(e => e.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Colaboradores</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            {loading ? "Cargando..." : `${employees.length} colaborador${employees.length !== 1 ? "es" : ""} registrado${employees.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`/api/empleados/export${statusFilter !== "Todos" ? `?status=${statusFilter}` : ""}`}
            download
            className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 transition shadow-sm"
          >
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar Excel
          </a>
          <button onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Agregar colaborador
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error} — <button onClick={load} className="underline font-medium">Reintentar</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre, puesto o cédula..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-gray-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        >
          <option value="Todos">Estado: Todos</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
          <option value="SUSPENDIDO">Suspendido</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Cargando...</div>
        ) : employees.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-sm text-gray-400">No se encontraron empleados.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-zinc-800/60 border-b border-gray-100 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Colaborador</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Cédula</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Puesto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Contrato</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Salario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Ingreso</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
              {employees.map(emp => {
                const initials   = `${emp.firstName[0]}${emp.lastName[0]}`.toUpperCase();
                const avatarCls  = getAvatarColor(emp.firstName + emp.lastName);
                return (
                  <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group">
                    <td className="px-4 py-3">
                      <Link href={`/empleados/${emp.id}`} className="flex items-center gap-3 group/link">
                        <div className={`w-9 h-9 rounded-xl flex-shrink-0 shadow-sm overflow-hidden ${emp.photoUrl ? "" : avatarCls + " flex items-center justify-center text-white text-xs font-bold"}`}>
                          {emp.photoUrl
                            ? <img src={`/uploads/photos/${emp.photoUrl}`} alt={initials} className="w-full h-full object-cover" />
                            : initials
                          }
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-zinc-100 group-hover/link:text-blue-600 dark:group-hover/link:text-blue-400 transition-colors">
                            {emp.firstName} {emp.lastName}
                          </div>
                          {emp.department && (
                            <div className="text-xs text-gray-400 dark:text-zinc-500">{emp.department.name}</div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400 dark:text-zinc-500">{emp.cedula ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-zinc-300">{emp.jobTitle ?? <span className="text-gray-300 dark:text-zinc-600">—</span>}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-zinc-300">{CONTRACT_LABEL[emp.contractType]}</td>
                    <td className="px-4 py-3 font-medium text-gray-700 dark:text-zinc-200">
                      {emp.salary ? `RD$ ${Number(emp.salary).toLocaleString("es-DO")}` : <span className="text-gray-300 dark:text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-zinc-400 text-xs">{emp.hireDate ? emp.hireDate.slice(0, 10) : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[emp.status]}`}>
                        {STATUS_LABEL[emp.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => openEdit(emp)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition">
                          Editar
                        </button>
                        <button onClick={() => onDelete(emp.id)} disabled={deleting === emp.id}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                          {deleting === emp.id ? "..." : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Panel lateral */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${panelOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div onClick={() => setPanelOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className={`fixed right-0 top-0 h-screen w-full max-w-lg bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-zinc-800 flex flex-col transform transition-transform duration-300 shadow-2xl ${panelOpen ? "translate-x-0" : "translate-x-full"}`}>

          <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editId ? "Editar colaborador" : "Nuevo colaborador"}</h2>
              <button onClick={() => setPanelOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-zinc-800 rounded-xl p-1">
              {(["personal", "laboral", "seguridad"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${tab === t ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"}`}>
                  {t === "personal" ? "Personal" : t === "laboral" ? "Laboral" : "Seg. Social"}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

              {tab === "personal" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Nombre *</label>
                      <input required value={form.firstName} onChange={f("firstName")} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Apellido *</label>
                      <input required value={form.lastName} onChange={f("lastName")} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Cédula</label>
                    <input placeholder="000-0000000-0" value={form.cedula} onChange={f("cedula")} className={`${inputClass} font-mono`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Teléfono</label>
                      <input placeholder="809-000-0000" value={form.phone} onChange={f("phone")} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Email</label>
                      <input type="email" value={form.email} onChange={f("email")} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Dirección</label>
                    <input value={form.address} onChange={f("address")} placeholder="Calle, sector, ciudad..." className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Fecha de nacimiento</label>
                      <input type="date" value={form.birthDate} onChange={f("birthDate")} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Género</label>
                      <select value={form.gender} onChange={f("gender")} className={inputClass}>
                        <option value="">Seleccionar</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Nacionalidad</label>
                      <input value={form.nationality} onChange={f("nationality")} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Estado civil</label>
                      <select value={form.maritalStatus} onChange={f("maritalStatus")} className={inputClass}>
                        <option value="">Seleccionar</option>
                        <option value="SOLTERO">Soltero/a</option>
                        <option value="CASADO">Casado/a</option>
                        <option value="DIVORCIADO">Divorciado/a</option>
                        <option value="VIUDO">Viudo/a</option>
                        <option value="UNION_LIBRE">Unión libre</option>
                      </select>
                    </div>
                  </div>
                  <div className={sectionClass}>
                    <p className={sectionTitle}>🚨 Contacto de emergencia</p>
                    <div className="space-y-3">
                      <div>
                        <label className={labelClass}>Nombre completo</label>
                        <input value={form.emergencyName} onChange={f("emergencyName")} className={inputClass} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>Teléfono</label>
                          <input placeholder="809-000-0000" value={form.emergencyPhone} onChange={f("emergencyPhone")} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Relación</label>
                          <select value={form.emergencyRelation} onChange={f("emergencyRelation")} className={inputClass}>
                            <option value="">Seleccionar</option>
                            <option value="Esposo/a">Esposo/a</option>
                            <option value="Madre">Madre</option>
                            <option value="Padre">Padre</option>
                            <option value="Hermano/a">Hermano/a</option>
                            <option value="Hijo/a">Hijo/a</option>
                            <option value="Amigo/a">Amigo/a</option>
                            <option value="Otro">Otro</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {tab === "laboral" && (
                <>
                  <div>
                    <label className={labelClass}>Puesto / Cargo</label>
                    <input value={form.jobTitle} onChange={f("jobTitle")} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Departamento</label>
                    <input
                      list="dept-list"
                      value={form.departmentName}
                      onChange={f("departmentName")}
                      placeholder="Ej: Ventas, Contabilidad..."
                      className={inputClass}
                    />
                    <datalist id="dept-list">
                      {departments.map(d => (
                        <option key={d.id} value={d.name} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className={labelClass}>Reporta a (supervisor directo)</label>
                    <select value={form.supervisorId} onChange={f("supervisorId")} className={inputClass}>
                      <option value="">— Sin supervisor (nivel raíz) —</option>
                      {employees
                        .filter(e => e.id !== editId && e.status !== "INACTIVO")
                        .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`))
                        .map(e => (
                          <option key={e.id} value={e.id}>
                            {e.lastName}, {e.firstName}{e.jobTitle ? ` — ${e.jobTitle}` : ""}
                          </option>
                        ))
                      }
                    </select>
                    <p className="mt-1 text-xs text-zinc-400">Deja vacío para el CEO/dueño y los que no reportan a nadie.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Fecha de ingreso</label>
                      <input type="date" value={form.hireDate} onChange={f("hireDate")} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Estado</label>
                      <select value={form.status} onChange={f("status")} className={inputClass}>
                        <option value="ACTIVO">Activo</option>
                        <option value="INACTIVO">Inactivo</option>
                        <option value="SUSPENDIDO">Suspendido</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Tipo de contrato</label>
                      <select value={form.contractType} onChange={f("contractType")} className={inputClass}>
                        <option value="INDEFINIDO">Indefinido</option>
                        <option value="TEMPORAL">Temporal</option>
                        <option value="POR_OBRA">Por Obra</option>
                        <option value="PRUEBA">Período de Prueba</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Salario mensual (RD$)</label>
                      <input type="number" placeholder="Ej: 35000" value={form.salary} onChange={f("salary")} className={inputClass} />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400">💡 El salario se registra en base mensual. Los pagos se realizan quincenalmente (salario ÷ 2).</p>

                  {/* Commission toggle */}
                  <div className={`rounded-xl border px-4 py-3 transition-colors ${form.comisionActiva ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-900/10" : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30"}`}>
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <div className="relative flex-shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={form.comisionActiva}
                          onChange={e => setForm(prev => ({ ...prev, comisionActiva: e.target.checked }))}
                        />
                        <div className={`w-10 h-6 rounded-full transition-colors ${form.comisionActiva ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"}`} />
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.comisionActiva ? "translate-x-4" : ""}`} />
                      </div>
                      <div>
                        <span className={`text-sm font-semibold ${form.comisionActiva ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-600 dark:text-zinc-400"}`}>
                          Empleado recibe comisión por ventas
                        </span>
                        <p className="text-xs text-zinc-400 mt-0.5">Activa si trabaja en ventas o recibe un % sobre sus resultados</p>
                      </div>
                    </label>

                    {form.comisionActiva && (
                      <div className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t border-emerald-100 dark:border-emerald-800/40">
                        <div>
                          <label className={labelClass}>Porcentaje de comisión (%)</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="Ej: 5.00"
                              value={form.comisionPorcentaje}
                              onChange={f("comisionPorcentaje")}
                              className={`${inputClass} pr-8`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-medium pointer-events-none">%</span>
                          </div>
                          {form.comisionPorcentaje && Number(form.comisionPorcentaje) > 0 && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                              RD$ 100,000 en ventas → RD$ {(100000 * Number(form.comisionPorcentaje) / 100).toLocaleString("es-DO")}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className={labelClass}>Frecuencia de pago</label>
                          <select value={form.comisionFrecuencia} onChange={f("comisionFrecuencia")} className={inputClass}>
                            <option value="QUINCENAL">Quincenal (cada 15 días)</option>
                            <option value="MENSUAL">Mensual (una vez al mes)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Acceso Portal RH — solo visible cuando el departamento es Recursos Humanos */}
                  {isRRHH(form.departmentName) && editId && (
                    <div className={`rounded-xl border px-4 py-3 ${accesoExisting ? "border-indigo-200 bg-indigo-50 dark:border-indigo-800/50 dark:bg-indigo-900/10" : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accesoExisting ? "bg-indigo-100 dark:bg-indigo-900/40" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                            <svg className={`w-4 h-4 ${accesoExisting ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${accesoExisting ? "text-indigo-700 dark:text-indigo-400" : "text-zinc-600 dark:text-zinc-400"}`}>
                              Acceso administrativo Portal RH
                            </p>
                            {accesoExisting ? (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {accesoExisting.email} · {accesoExisting.role === "OWNER_ADMIN" ? "Admin completo" : "Manager"}
                              </p>
                            ) : (
                              <p className="text-xs text-zinc-400">Sin acceso al portal</p>
                            )}
                          </div>
                        </div>
                        {accesoExisting ? (
                          <button
                            type="button"
                            onClick={() => onRevokeAcceso(editId)}
                            className="text-xs font-medium text-red-500 hover:text-red-700 dark:hover:text-red-400 transition shrink-0"
                          >
                            Revocar acceso
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setAccesoEmpId(editId);
                              setAccesoEmpName(`${form.firstName} ${form.lastName}`);
                              setAccesoForm({ ...EMPTY_ACCESO_FORM, email: form.email ?? "" });
                              setAccesoError("");
                              setAccesoStep("form");
                              setAccesoModal(true);
                            }}
                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition shrink-0"
                          >
                            + Dar acceso
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={sectionClass}>
                    <p className={sectionTitle}>🏦 Datos bancarios</p>
                    <div className="space-y-3">
                      <div>
                        <label className={labelClass}>Banco</label>
                        <select value={form.bankName} onChange={f("bankName")} className={inputClass}>
                          <option value="">Seleccionar</option>
                          <option value="Banreservas">Banreservas</option>
                          <option value="BHD León">BHD León</option>
                          <option value="Popular">Banco Popular</option>
                          <option value="Scotia">Scotiabank</option>
                          <option value="Santa Cruz">Banco Santa Cruz</option>
                          <option value="Caribe">Banco Caribe</option>
                          <option value="Lafise">Banco Lafise</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Número de cuenta</label>
                        <input value={form.bankAccount} onChange={f("bankAccount")} className={`${inputClass} font-mono`} />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {tab === "seguridad" && (
                <>
                  <div>
                    <label className={labelClass}>Número TSS</label>
                    <input value={form.tssNumber} onChange={f("tssNumber")} className={`${inputClass} font-mono`} />
                  </div>
                  <div>
                    <label className={labelClass}>AFP</label>
                    <select value={form.afp} onChange={f("afp")} className={inputClass}>
                      <option value="">Seleccionar</option>
                      <option value="SIEMBRA">AFP Siembra</option>
                      <option value="POPULAR">AFP Popular</option>
                      <option value="RESERVAS">AFP Reservas</option>
                      <option value="CRECER">AFP Crecer</option>
                      <option value="FUTURO">AFP Futuro</option>
                      <option value="PROFUTURO">AFP Profuturo</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>ARS (Seguro médico)</label>
                    <select value={form.ars} onChange={f("ars")} className={inputClass}>
                      <option value="">Seleccionar</option>
                      <option value="ARS_HUMANO">ARS Humano</option>
                      <option value="ARS_SENASA">SENASA</option>
                      <option value="ARS_RESERVAS">ARS Reservas</option>
                      <option value="ARS_MAPFRE">ARS MAPFRE</option>
                      <option value="ARS_UNIVERSAL">ARS Universal</option>
                      <option value="ARS_PRIMERA">ARS Primera</option>
                      <option value="ARS_METASALUD">ARS Metasalud</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800 shrink-0 flex justify-between items-center bg-gray-50 dark:bg-zinc-800/30">
              <div className="flex gap-1.5">
                {(["personal", "laboral", "seguridad"] as const).map(t => (
                  <button key={t} type="button" onClick={() => setTab(t)}
                    className={`h-1.5 rounded-full transition-all ${tab === t ? "w-6 bg-blue-500" : "w-3 bg-gray-300 dark:bg-zinc-600"}`} />
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPanelOpen(false)}
                  className="rounded-xl border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 transition shadow-sm">
                  {saving ? "Guardando..." : editId ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      {/* ── Modal acceso administrativo RH ─────────────────────────────── */}
      {accesoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { if (accesoStep !== "form" || !accesoSaving) setAccesoModal(false); }}
          />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden">

            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {accesoStep === "done" ? "Acceso creado" : "Acceso administrativo Portal RH"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
                    {accesoEmpName}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              {/* Step: ask */}
              {accesoStep === "ask" && (
                <>
                  <p className="text-sm text-gray-700 dark:text-zinc-300 leading-relaxed">
                    Este empleado pertenece al departamento de <strong>Recursos Humanos</strong>.
                    ¿Deseas darle acceso administrativo al Portal RH para que pueda gestionar nómina, empleados y reportes?
                  </p>
                  <div className="mt-5 flex gap-3 justify-end">
                    <button
                      onClick={() => setAccesoModal(false)}
                      className="rounded-xl border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition"
                    >
                      No, omitir
                    </button>
                    <button
                      onClick={() => setAccesoStep("form")}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-sm font-semibold text-white transition shadow-sm"
                    >
                      Sí, dar acceso
                    </button>
                  </div>
                </>
              )}

              {/* Step: form */}
              {accesoStep === "form" && (
                <>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">
                    Define las credenciales de acceso. El empleado usará estos datos para iniciar sesión.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Correo de acceso</label>
                      <input
                        type="email"
                        value={accesoForm.email}
                        onChange={e => setAccesoForm(p => ({ ...p, email: e.target.value }))}
                        placeholder="correo@empresa.com"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Contraseña temporal</label>
                      <input
                        type="password"
                        value={accesoForm.password}
                        onChange={e => setAccesoForm(p => ({ ...p, password: e.target.value }))}
                        placeholder="Mín. 6 caracteres"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Confirmar contraseña</label>
                      <input
                        type="password"
                        value={accesoForm.confirmPassword}
                        onChange={e => setAccesoForm(p => ({ ...p, confirmPassword: e.target.value }))}
                        placeholder="Repetir contraseña"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Nivel de acceso</label>
                      <select
                        value={accesoForm.role}
                        onChange={e => setAccesoForm(p => ({ ...p, role: e.target.value }))}
                        className={inputClass}
                      >
                        <option value="OWNER_ADMIN">Admin completo (nómina, empleados, reportes)</option>
                        <option value="MANAGER">Manager (acceso de solo lectura + algunas funciones)</option>
                      </select>
                    </div>
                    {accesoError && (
                      <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                        {accesoError}
                      </p>
                    )}
                  </div>
                  <div className="mt-5 flex gap-3 justify-end">
                    <button
                      onClick={() => setAccesoModal(false)}
                      disabled={accesoSaving}
                      className="rounded-xl border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={onGrantAcceso}
                      disabled={accesoSaving}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-sm font-semibold text-white transition shadow-sm disabled:opacity-50"
                    >
                      {accesoSaving ? "Creando acceso..." : "Crear acceso"}
                    </button>
                  </div>
                </>
              )}

              {/* Step: done */}
              {accesoStep === "done" && (
                <>
                  <div className="flex flex-col items-center text-center gap-3 py-2">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                      <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">¡Acceso creado exitosamente!</p>
                      <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                        <strong>{accesoEmpName}</strong> ya puede iniciar sesión en Portal RH con el correo <strong>{accesoForm.email}</strong>.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex justify-center">
                    <button
                      onClick={() => setAccesoModal(false)}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition shadow-sm"
                    >
                      Listo
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}