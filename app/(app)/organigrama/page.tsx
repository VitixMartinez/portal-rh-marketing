"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ── Tipos ────────────────────────────────────────────────────────────────────
type EmpNode = {
  id:          string;
  firstName:   string;
  lastName:    string;
  jobTitle:    string | null;
  department:  string | null;
  status:      string;
  supervisorId: string | null;
  reports:     EmpNode[];  // poblado en cliente
};

// ── Colores por nivel de jerarquía ───────────────────────────────────────────
const LEVEL_STYLES = [
  "bg-indigo-600 text-white border-indigo-700",                          // nivel 0: CEO/Dueño
  "bg-blue-500 text-white border-blue-600",                             // nivel 1: Directores
  "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-700",  // nivel 2: Gerentes
  "bg-white text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700",  // nivel 3+: Empleados
];

function getLevelStyle(depth: number) {
  return LEVEL_STYLES[Math.min(depth, LEVEL_STYLES.length - 1)];
}

// ── Tarjeta de empleado ──────────────────────────────────────────────────────
function EmpCard({ emp, depth }: { emp: EmpNode; depth: number }) {
  const initials = `${emp.firstName[0] ?? ""}${emp.lastName[0] ?? ""}`.toUpperCase();
  const style    = getLevelStyle(depth);
  const isRoot   = depth === 0;

  return (
    <Link href={`/empleados/${emp.id}`}>
      <div className={[
        "group relative rounded-xl border shadow-sm transition-all duration-150",
        "hover:-translate-y-1 hover:shadow-md",
        isRoot ? "w-52" : "w-44",
        style,
      ].join(" ")}>
        <div className="p-3 flex flex-col items-center text-center gap-1.5">
          {/* Avatar */}
          <div className={[
            "rounded-full flex items-center justify-center font-bold shrink-0",
            isRoot ? "w-12 h-12 text-base" : "w-10 h-10 text-sm",
            depth === 0 ? "bg-white/20" : depth === 1 ? "bg-white/20" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
          ].join(" ")}>
            {initials}
          </div>

          {/* Nombre */}
          <div>
            <div className={`font-semibold leading-tight ${isRoot ? "text-sm" : "text-xs"}`}>
              {emp.firstName} {emp.lastName}
            </div>
            {emp.jobTitle && (
              <div className={`mt-0.5 leading-tight ${isRoot ? "text-xs opacity-80" : "text-[11px] opacity-70"}`}>
                {emp.jobTitle}
              </div>
            )}
            {emp.department && (
              <div className={`text-[10px] opacity-60 mt-0.5`}>{emp.department}</div>
            )}
          </div>

          {/* Número de reportes directos */}
          {emp.reports.length > 0 && (
            <div className={[
              "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
              depth === 0 || depth === 1
                ? "bg-white/20"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400",
            ].join(" ")}>
              {emp.reports.length} reporte{emp.reports.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Estado (si no es activo) */}
        {emp.status !== "ACTIVO" && (
          <div className="absolute top-1 right-1 text-[9px] font-medium px-1 py-0.5 rounded bg-yellow-400 text-yellow-900">
            {emp.status === "SUSPENDIDO" ? "SUSP." : "INACT."}
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Nodo recursivo del árbol ─────────────────────────────────────────────────
function OrgNode({ emp, depth }: { emp: EmpNode; depth: number }) {
  const hasChildren = emp.reports.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Tarjeta del empleado */}
      <EmpCard emp={emp} depth={depth} />

      {hasChildren && (
        <div className="flex flex-col items-center">
          {/* Línea vertical bajando */}
          <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-600" />

          {/* Contenedor de hijos con línea horizontal */}
          <div className="relative flex gap-6 items-start">
            {/* Línea horizontal que une a todos los hijos */}
            {emp.reports.length > 1 && (
              <div
                className="absolute top-0 h-px bg-zinc-300 dark:bg-zinc-600"
                style={{
                  left:  "calc(50% / " + emp.reports.length * 2 + " + 22px)",
                  right: "calc(50% / " + emp.reports.length * 2 + " + 22px)",
                }}
              />
            )}

            {emp.reports.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Línea vertical subiendo al conector */}
                <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-600" />
                <OrgNode emp={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function OrganigramaPage() {
  const [allEmps, setAllEmps] = useState<EmpNode[]>([]);
  const [roots,   setRoots]   = useState<EmpNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/employees");
      const data = await res.json();
      if (!Array.isArray(data)) return;

      // Construir mapa id → nodo
      const map = new Map<string, EmpNode>();
      for (const e of data) {
        map.set(e.id, {
          id:           e.id,
          firstName:    e.firstName,
          lastName:     e.lastName,
          jobTitle:     e.jobTitle ?? null,
          department:   e.department?.name ?? null,
          status:       e.status,
          supervisorId: e.supervisorId ?? null,
          reports:      [],
        });
      }

      // Poblar reportes de cada nodo
      for (const node of map.values()) {
        if (node.supervisorId && map.has(node.supervisorId)) {
          map.get(node.supervisorId)!.reports.push(node);
        }
      }

      // Ordenar reportes por apellido
      for (const node of map.values()) {
        node.reports.sort((a, b) =>
          `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
        );
      }

      // Raíces = empleados sin supervisor (o cuyo supervisor no está en el mapa)
      const rootNodes = Array.from(map.values()).filter(
        (n) => !n.supervisorId || !map.has(n.supervisorId)
      );
      rootNodes.sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
      );

      setAllEmps(Array.from(map.values()));
      setRoots(rootNodes);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Estadísticas
  const totalEmps   = allEmps.length;
  const maxDepth    = (() => {
    function depth(node: EmpNode): number {
      if (node.reports.length === 0) return 0;
      return 1 + Math.max(...node.reports.map(depth));
    }
    return roots.length > 0 ? Math.max(...roots.map(depth)) : 0;
  })();
  const avgSpan     = totalEmps > 0
    ? (allEmps.filter(e => e.reports.length > 0).reduce((s, e) => s + e.reports.length, 0) /
       Math.max(allEmps.filter(e => e.reports.length > 0).length, 1)).toFixed(1)
    : "—";

  // Filtro de búsqueda — highlight de coincidencias
  const filtered = search
    ? allEmps.filter(e =>
        `${e.firstName} ${e.lastName} ${e.jobTitle ?? ""} ${e.department ?? ""}`
          .toLowerCase().includes(search.toLowerCase())
      )
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organigrama</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Estructura jerárquica de la empresa. Haz clic en cualquier tarjeta para ver el perfil.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar empleado..."
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-xs text-zinc-400 hover:text-zinc-600">✕ Limpiar</button>
          )}
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total en org",    value: totalEmps,      icon: "👥" },
          { label: "Niveles",         value: maxDepth + 1,   icon: "🏢" },
          { label: "Span promedio",   value: avgSpan,        icon: "↕️" },
          { label: "Sin supervisor",  value: roots.length,   icon: "👑" },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/40 px-4 py-3 flex items-center gap-3">
            <span className="text-xl">{k.icon}</span>
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">{k.label}</div>
              <div className="text-xl font-bold">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Leyenda de niveles */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { style: "bg-indigo-600 text-white",                    label: "CEO / Dueño (nivel 0)" },
          { style: "bg-blue-500 text-white",                      label: "Directores (nivel 1)" },
          { style: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200", label: "Gerentes (nivel 2)" },
          { style: "bg-white text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200", label: "Empleados (nivel 3+)" },
        ].map(l => (
          <span key={l.label} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${l.style}`}>
            <span className="w-2 h-2 rounded-full bg-current opacity-70 inline-block" />
            {l.label}
          </span>
        ))}
      </div>

      {/* Vista de búsqueda */}
      {search && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/40 divide-y divide-zinc-100 dark:divide-zinc-800">
          {filtered && filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-400">No se encontraron coincidencias.</div>
          ) : (
            filtered?.map(e => (
              <Link key={e.id} href={`/empleados/${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0">
                  {e.firstName[0]}{e.lastName[0]}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{e.firstName} {e.lastName}</div>
                  <div className="text-xs text-zinc-400 truncate">
                    {e.jobTitle ?? "Sin cargo"}{e.department ? ` · ${e.department}` : ""}
                  </div>
                </div>
                {e.reports.length > 0 && (
                  <span className="ml-auto text-xs text-zinc-400 shrink-0">{e.reports.length} reporte{e.reports.length !== 1 ? "s" : ""}</span>
                )}
              </Link>
            ))
          )}
        </div>
      )}

      {/* Árbol visual */}
      {!search && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/20 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-zinc-400 text-sm">
              <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Cargando estructura...
            </div>
          ) : roots.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-4xl mb-3">🏢</div>
              <div className="text-sm font-medium text-zinc-600 dark:text-zinc-300">No hay empleados en el organigrama aún</div>
              <div className="text-xs text-zinc-400 mt-1 mb-4">
                Ve a <strong>Empleados</strong>, edita un empleado y asígnale un supervisor en la pestaña <strong>Laboral</strong>.
              </div>
              <Link href="/empleados" className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition">
                Ir a Empleados
              </Link>
            </div>
          ) : (
            <div className="p-8 flex flex-col items-center gap-12 min-w-max">
              {roots.map((root) => (
                <OrgNode key={root.id} emp={root} depth={0} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nota instruccional */}
      {!search && !loading && roots.length > 0 && (
        <p className="text-xs text-zinc-400 text-center">
          💡 Para asignar supervisores, edita cualquier empleado en <Link href="/empleados" className="text-blue-500 hover:underline">Empleados → Laboral → &quot;Reporta a&quot;</Link>
        </p>
      )}
    </div>
  );
}
