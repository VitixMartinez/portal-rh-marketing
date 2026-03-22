"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LogoIcon from "@/components/LogoIcon";

const ALL_GROUPS = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard",   label: "Inicio",       icon: HomeIcon, ownerOnly: false },
    ],
  },
  {
    label: "Personas",
    items: [
      { href: "/empleados",     label: "Empleados",    icon: PeopleIcon, ownerOnly: false },
      { href: "/organigrama",   label: "Organigrama",  icon: OrgIcon, ownerOnly: false },
      { href: "/terminaciones", label: "Terminaciones",icon: TermIcon, ownerOnly: false },
    ],
  },
  {
    label: "Tiempo y Pago",
    items: [
      { href: "/nomina",      label: "Nómina",       icon: MoneyIcon,    ownerOnly: false },
      { href: "/beneficios",  label: "Beneficios",   icon: GiftIcon,     ownerOnly: false },
      { href: "/vacaciones",  label: "Vacaciones",   icon: SunIcon,      ownerOnly: false },
      { href: "/asistencia",  label: "Asistencia",   icon: ClockIcon,    ownerOnly: false },
    ],
  },
  {
    label: "Talento",
    items: [
      { href: "/reclutamiento",   label: "Reclutamiento",  icon: SearchUserIcon, ownerOnly: false },
      { href: "/desempeno",       label: "Desempeño",      icon: StarIcon, ownerOnly: false },
      { href: "/entrenamiento",   label: "Entrenamiento",  icon: BookIcon, ownerOnly: false },
      { href: "/reconocimientos", label: "Reconocimientos",icon: TrophyIcon, ownerOnly: false },
    ],
  },
  {
    label: "Empresa",
    items: [
      { href: "/comunicaciones", label: "Comunicaciones", icon: MegaphoneIcon, ownerOnly: false },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/aprobaciones",  label: "Aprobaciones", icon: CheckBadgeIcon, ownerOnly: false },
      { href: "/calendario",    label: "Calendario",   icon: CalIcon, ownerOnly: false },
      { href: "/reportes",      label: "Reportes",     icon: ChartIcon, ownerOnly: false },
      { href: "/configuracion", label: "Configuración",icon: GearIcon, ownerOnly: true },
    ],
  },
];

export default function Sidebar({ brandColor }: { brandColor?: string }) {
  const pathname = usePathname();
  const [role, setRole]   = useState<string | null>(null);
  const [name, setName]   = useState<string>("Usuario");
  const [email, setEmail] = useState<string>("");
  void brandColor; // used via CSS variables injected by layout

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.role)  setRole(data.role);
        if (data?.name)  setName(data.name);
        if (data?.email) setEmail(data.email);
      })
      .catch(() => {});
  }, []);

  const groups = ALL_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(item => !item.ownerOnly || role === "OWNER_ADMIN"),
  })).filter(g => g.items.length > 0);

  return (
    <aside className="sticky top-0 h-screen w-60 flex flex-col bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 transition-colors duration-200 z-20">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <LogoIcon size={36} variant="white" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Portal RH</div>
            <div className="text-[11px] text-gray-400 dark:text-zinc-500 leading-tight">Gestión de Recursos Humanos</div>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {groups.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={[
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150 group",
                      active
                        ? "font-semibold"
                        : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white font-medium",
                    ].join(" ")}
                    style={active ? { backgroundColor: "var(--brand-bg)", color: "var(--brand-text)" } : {}}
                  >
                    <Icon
                      className={[
                        "w-4 h-4 flex-shrink-0 transition-colors",
                        active ? "opacity-100" : "text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-zinc-300",
                      ].join(" ")}
                    />
                    <span>{label}</span>
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--brand-text)" }} />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 dark:border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: "var(--brand)" }}>
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{name}</div>
            <div className="text-[10px] text-gray-400 dark:text-zinc-500 truncate">{email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ── Inline SVG icon components ─────────────────────────────────────────── */
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
function PeopleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function OrgIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}
function MoneyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M18.364 18.364l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}
function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}
function CalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function CheckBadgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
  );
}
function GiftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  );
}
function TermIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9l-3 3 3 3" />
    </svg>
  );
}
function SearchUserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 8a2 2 0 100 4 2 2 0 000-4zM7.5 15.5a4 4 0 015 0" />
    </svg>
  );
}
function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  );
}
