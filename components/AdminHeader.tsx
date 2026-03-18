"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";

interface Props {
  userName?:    string;
  userRole?:    string;
  userInitial?: string;
}

type NotifTipo = "aprobacion" | "entrenamiento" | "contrato" | "cumpleanos" | "aniversario" | "terminacion";

type Notif = {
  id:      string;
  tipo:    NotifTipo;
  titulo:  string;
  detalle: string;
  urgente: boolean;
  href:    string;
};

type SearchEmpleado = {
  id:         string;
  firstName:  string;
  lastName:   string;
  jobTitle:   string | null;
  photoUrl:   string | null;
  status:     string;
  department: string | null;
  supervisor: string | null;
  initials:   string;
};

type SearchModulo = {
  id:    string;
  label: string;
  desc:  string;
  href:  string;
  icon:  string;
};

const TIPO_ICON: Record<NotifTipo, string> = {
  aprobacion:   "📋",
  entrenamiento:"📚",
  contrato:     "📄",
  cumpleanos:   "🎂",
  aniversario:  "🏆",
  terminacion:  "🔴",
};

const TIPO_COLOR: Record<NotifTipo, string> = {
  aprobacion:    "bg-blue-100   text-blue-600   dark:bg-blue-900/30   dark:text-blue-400",
  entrenamiento: "bg-amber-100  text-amber-600  dark:bg-amber-900/30  dark:text-amber-400",
  contrato:      "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  cumpleanos:    "bg-pink-100   text-pink-600   dark:bg-pink-900/30   dark:text-pink-400",
  aniversario:   "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  terminacion:   "bg-red-100   text-red-600   dark:bg-red-900/30   dark:text-red-400",
};

// Avatar color by initials
const AVATAR_COLORS = [
  "bg-violet-500","bg-blue-500","bg-emerald-500","bg-orange-500",
  "bg-pink-500","bg-teal-500","bg-indigo-500","bg-rose-500",
];
function avatarColor(initials: string) {
  const n = (initials.charCodeAt(0) ?? 0) + (initials.charCodeAt(1) ?? 0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

export default function AdminHeader({
  userName    = "Admin",
  userRole    = "Administrador",
  userInitial = "A",
}: Props) {
  const router = useRouter();

  // ── Notifications ────────────────────────────────────────────────────────
  const [notifs,       setNotifs]       = useState<Notif[]>([]);
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [seen,         setSeen]         = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const loadNotifs = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await fetch("/api/notificaciones");
      if (res.ok) {
        const data = await res.json();
        setNotifs(Array.isArray(data.notifs) ? data.notifs : []);
      }
    } catch {}
    finally { setNotifLoading(false); }
  }, []);

  useEffect(() => { loadNotifs(); }, [loadNotifs]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggleNotif() {
    setNotifOpen(v => !v);
    if (!notifOpen) setSeen(true);
  }

  const hasUnseen = !seen && notifs.length > 0;

  // ── Search ───────────────────────────────────────────────────────────────
  const [query,         setQuery]         = useState("");
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [empleados,     setEmpleados]     = useState<SearchEmpleado[]>([]);
  const [modulos,       setModulos]       = useState<SearchModulo[]>([]);
  const searchRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close search panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard shortcut: / or cmd+k opens search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "/" || (e.metaKey && e.key === "k")) && !e.defaultPrevented) {
        const active = document.activeElement?.tagName;
        if (active === "INPUT" || active === "TEXTAREA") return;
        e.preventDefault();
        inputRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  function handleQueryChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.trim().length < 2) {
      setEmpleados([]);
      setModulos([]);
      setSearchOpen(val.length > 0);
      return;
    }

    setSearchOpen(true);
    setSearchLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(val.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setEmpleados(data.empleados ?? []);
          setModulos(data.modulos ?? []);
        }
      } catch {}
      finally { setSearchLoading(false); }
    }, 280);
  }

  function clearSearch() {
    setQuery("");
    setEmpleados([]);
    setModulos([]);
    setSearchOpen(false);
    inputRef.current?.focus();
  }

  function handleResultClick() {
    setSearchOpen(false);
    setQuery("");
    setEmpleados([]);
    setModulos([]);
  }

  // ── Logout ───────────────────────────────────────────────────────────────
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const hasResults = empleados.length > 0 || modulos.length > 0;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm transition-colors duration-200">

      {/* ── Search bar ─────────────────────────────────────────────────── */}
      <div ref={searchRef} className="relative w-80">
        {/* Input */}
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onFocus={() => { if (query.length >= 2) setSearchOpen(true); }}
          placeholder="Buscar empleados, módulos..."
          className="w-full pl-9 pr-8 py-2 text-sm bg-gray-100 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-lg text-gray-700 dark:text-zinc-200 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition-all"
        />
        {/* Clear / loading indicator */}
        {query && (
          <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition-colors">
            {searchLoading
              ? <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            }
          </button>
        )}

        {/* ── Results dropdown ─────────────────────────────────────────── */}
        {searchOpen && (
          <div className="absolute left-0 top-full mt-2 w-[420px] max-h-[520px] overflow-y-auto rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl z-50">

            {/* Typing but too short */}
            {query.length > 0 && query.length < 2 && (
              <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-zinc-500">
                Escribe al menos 2 caracteres para buscar…
              </div>
            )}

            {/* Loading */}
            {query.length >= 2 && searchLoading && (
              <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-zinc-500">
                Buscando…
              </div>
            )}

            {/* No results */}
            {query.length >= 2 && !searchLoading && !hasResults && (
              <div className="px-4 py-8 text-center">
                <div className="text-3xl mb-2">🔍</div>
                <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Sin resultados para &ldquo;{query}&rdquo;</p>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Intenta con otro nombre o módulo</p>
              </div>
            )}

            {/* ── Employees section ───────────────────────────────────── */}
            {empleados.length > 0 && (
              <div>
                <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500">Personas</p>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500">{empleados.length} resultado{empleados.length !== 1 ? "s" : ""}</span>
                </div>

                <div className="divide-y divide-gray-50 dark:divide-zinc-800">
                  {empleados.map(emp => (
                    <Link
                      key={emp.id}
                      href={`/empleados/${emp.id}`}
                      onClick={handleResultClick}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors group"
                    >
                      {/* Avatar */}
                      {emp.photoUrl ? (
                        <img src={emp.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-gray-100 dark:ring-zinc-700" />
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(emp.initials)}`}>
                          {emp.initials}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight truncate">
                          {emp.firstName} {emp.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                          {emp.jobTitle ?? "—"}
                          {emp.department ? ` · ${emp.department}` : ""}
                        </p>
                        {emp.supervisor && (
                          <p className="text-[11px] text-gray-400 dark:text-zinc-500 truncate">
                            Supervisor: {emp.supervisor}
                          </p>
                        )}
                      </div>

                      {/* Status + arrow */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          emp.status === "ACTIVO"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-gray-100 text-gray-500 dark:bg-zinc-700 dark:text-zinc-400"
                        }`}>
                          {emp.status === "ACTIVO" ? "Activo" : emp.status}
                        </span>
                        <svg className="w-3.5 h-3.5 text-gray-300 dark:text-zinc-600 group-hover:text-gray-500 dark:group-hover:text-zinc-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── Modules section ─────────────────────────────────────── */}
            {modulos.length > 0 && (
              <div className={empleados.length > 0 ? "border-t border-gray-100 dark:border-zinc-800" : ""}>
                <div className="px-4 pt-3 pb-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500">Módulos y Reportes</p>
                </div>

                <div className="divide-y divide-gray-50 dark:divide-zinc-800 pb-1">
                  {modulos.map(mod => (
                    <Link
                      key={mod.id}
                      href={mod.href}
                      onClick={handleResultClick}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-base flex-shrink-0">
                        {mod.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200 leading-tight">{mod.label}</p>
                        <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">{mod.desc}</p>
                      </div>
                      <svg className="w-3.5 h-3.5 text-gray-300 dark:text-zinc-600 group-hover:text-gray-500 dark:group-hover:text-zinc-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Footer hint */}
            {hasResults && (
              <div className="px-4 py-2 border-t border-gray-50 dark:border-zinc-800 flex items-center gap-3 text-[10px] text-gray-400 dark:text-zinc-600">
                <span><kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 font-mono text-gray-500 dark:text-zinc-400">↵</kbd> abrir</span>
                <span><kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 font-mono text-gray-500 dark:text-zinc-400">Esc</kbd> cerrar</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Right side ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">

        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={toggleNotif}
            className="relative p-2 text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title="Notificaciones"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notifs.length > 0 && (
              <span className={`absolute top-1 right-1 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full text-[9px] font-bold text-white ring-2 ring-white dark:ring-zinc-900 ${hasUnseen ? "bg-red-500" : "bg-blue-500"}`}>
                {notifs.length > 9 ? "9+" : notifs.length}
              </span>
            )}
          </button>

          {/* Notifications panel */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notificaciones</h3>
                  {notifs.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {notifs.length}
                    </span>
                  )}
                </div>
                <button onClick={loadNotifs} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  Actualizar
                </button>
              </div>

              <div className="overflow-y-auto max-h-[420px]">
                {notifLoading ? (
                  <div className="py-10 text-center text-sm text-gray-400">Cargando...</div>
                ) : notifs.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="text-3xl mb-2">✅</div>
                    <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Todo al día</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">No hay pendientes en este momento</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-zinc-800">
                    {notifs.map(n => (
                      <Link key={n.id} href={n.href} onClick={() => setNotifOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors group"
                      >
                        <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${TIPO_COLOR[n.tipo] ?? "bg-gray-100 text-gray-500"}`}>
                          {TIPO_ICON[n.tipo] ?? "📌"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200 leading-tight">{n.titulo}</p>
                            {n.urgente && <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" title="Urgente" />}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 leading-tight truncate">{n.detalle}</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-300 dark:text-zinc-600 group-hover:text-gray-500 dark:group-hover:text-zinc-400 flex-shrink-0 mt-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {notifs.filter(n => n.tipo === "aprobacion" || n.tipo === "terminacion").length > 0 && (
                <div className="px-4 py-3 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/40">
                  <Link href="/aprobaciones" onClick={() => setNotifOpen(false)}
                    className="flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Ver todas las aprobaciones pendientes
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-gray-200 dark:bg-zinc-700" />
        <ThemeToggle />
        <div className="w-px h-5 bg-gray-200 dark:bg-zinc-700" />

        {/* User menu */}
        <div className="relative group">
          <button className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {userInitial}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-gray-800 dark:text-zinc-200 leading-tight">{userName}</div>
              <div className="text-[10px] text-gray-400 dark:text-zinc-500 leading-tight">{userRole}</div>
            </div>
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-gray-100 dark:border-zinc-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
            <div className="p-1">
              <button onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
