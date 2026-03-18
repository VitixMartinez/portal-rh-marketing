"use client";

import { useEffect, useState, useMemo } from "react";

/* ── Types ─────────────────────────────────────────────────────────────── */
type DirectoryEmployee = {
  id:         string;
  firstName:  string;
  lastName:   string;
  jobTitle:   string | null;
  hireDate:   string | null;
  email:      string | null;
  phone:      string | null;
  department: { id: string; name: string } | null;
};

/* ── Helpers ────────────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  "#3B82F6","#8B5CF6","#10B981","#F59E0B",
  "#EF4444","#0EA5E9","#6366F1","#14B8A6",
];
function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function tiempoEnEmpresa(hireDateStr: string | null): string {
  if (!hireDateStr) return "—";
  const hire = new Date(hireDateStr);
  const now  = new Date();
  let years  = now.getFullYear() - hire.getFullYear();
  let months = now.getMonth() - hire.getMonth();
  if (now.getDate() < hire.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  if (years === 0 && months === 0) return "Recién ingresado";
  if (years === 0) return `${months} mes${months !== 1 ? "es" : ""}`;
  if (months === 0) return `${years} año${years !== 1 ? "s" : ""}`;
  return `${years} año${years !== 1 ? "s" : ""}, ${months} mes${months !== 1 ? "es" : ""}`;
}

/* ── Component ──────────────────────────────────────────────────────────── */
export default function DirectorioPage() {
  const [employees, setEmployees] = useState<DirectoryEmployee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  useEffect(() => {
    fetch("/api/portal/directorio")
      .then(r => r.json())
      .then(data => { setEmployees(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const departments = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach(e => {
      if (e.department) map.set(e.department.id, e.department.name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return employees.filter(e => {
      const matchSearch = !q ||
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        (e.jobTitle ?? "").toLowerCase().includes(q) ||
        (e.department?.name ?? "").toLowerCase().includes(q);
      const matchDept = deptFilter === "all" || e.department?.id === deptFilter;
      return matchSearch && matchDept;
    });
  }, [employees, search, deptFilter]);

  // Group by department
  const grouped = useMemo(() => {
    const map = new Map<string, { deptName: string; items: DirectoryEmployee[] }>();
    filtered.forEach(e => {
      const key  = e.department?.id ?? "__sin_dept__";
      const name = e.department?.name ?? "Sin Departamento";
      if (!map.has(key)) map.set(key, { deptName: name, items: [] });
      map.get(key)!.items.push(e);
    });
    return Array.from(map.values()).sort((a, b) => a.deptName.localeCompare(b.deptName));
  }, [filtered]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Directorio de Empleados</h1>
        <p className="mt-1 text-sm text-gray-500">
          Conoce a tus compañeros de trabajo
        </p>
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre, cargo o departamento…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todos los departamentos</option>
          {departments.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </div>

      {/* Stats chip */}
      {!loading && (
        <p className="text-xs text-gray-400">
          {filtered.length} empleado{filtered.length !== 1 ? "s" : ""} activo{filtered.length !== 1 ? "s" : ""}
          {search || deptFilter !== "all" ? " (filtrado)" : " en la empresa"}
        </p>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-gray-500 font-medium">No se encontraron empleados</p>
          {(search || deptFilter !== "all") && (
            <button
              onClick={() => { setSearch(""); setDeptFilter("all"); }}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Grouped cards */}
      {!loading && grouped.map(group => (
        <div key={group.deptName} className="space-y-3">
          {/* Department header */}
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              {group.deptName}
            </h2>
            <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-medium">
              {group.items.length}
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Employee cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map(emp => {
              const fullName = `${emp.firstName} ${emp.lastName}`;
              const initials = `${emp.firstName[0]}${emp.lastName[0]}`.toUpperCase();
              const color    = avatarColor(fullName);
              const tenure   = tiempoEnEmpresa(emp.hireDate);

              return (
                <div
                  key={emp.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-200 p-4 group"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-base font-bold flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: color }}
                    >
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{fullName}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{emp.jobTitle ?? "—"}</p>

                      {/* Tenure */}
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs text-gray-400">{tenure}</span>
                      </div>

                      {/* Contact links */}
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {emp.email && (
                          <a
                            href={`mailto:${emp.email}`}
                            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Email
                          </a>
                        )}
                        {emp.phone && (
                          <a
                            href={`tel:${emp.phone}`}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {emp.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
