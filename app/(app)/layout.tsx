import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import AdminHeader from "@/components/AdminHeader";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function toHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}

/** Generate a 10-step palette (50→900) from a base hex color */
function buildPalette(hex: string): Record<string, string> {
  const rgb = hexToRgb(hex);
  if (!rgb) return {};
  const { r, g, b } = rgb;
  // Mix toward white (lighten) or black (darken)
  const mix = (t: number, toward: number) => ({
    r: r + (toward - r) * t,
    g: g + (toward - g) * t,
    b: b + (toward - b) * t,
  });
  const steps: [string, number, number][] = [
    ["50",  0.93, 255], ["100", 0.85, 255], ["200", 0.70, 255],
    ["300", 0.50, 255], ["400", 0.25, 255], ["500", 0.08, 255],
    ["600", 0,    0],   // ← base color
    ["700", 0.15, 0],   ["800", 0.30, 0],   ["900", 0.45, 0],
  ];
  const palette: Record<string, string> = {};
  steps.forEach(([key, t, toward]) => {
    if (key === "600") { palette[key] = hex; return; }
    const c = mix(t, toward);
    palette[key] = toHex(c.r, c.g, c.b);
  });
  return palette;
}

async function getBrandColor(): Promise<string> {
  try {
    const headersList = await headers();
    const host = headersList.get("host") ?? "";
    const hostname = host.split(":")[0];
    if (!hostname.endsWith(".portal-hr.com")) return "#2563eb";
    const sub = hostname.slice(0, hostname.length - ".portal-hr.com".length);
    if (!sub || sub === "www") return "#2563eb";
    type Row = { primaryColor: string | null };
    const rows = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT "primaryColor" FROM "Company" WHERE "subdomain" = $1 LIMIT 1`, sub
    );
    return rows[0]?.primaryColor ?? "#2563eb";
  } catch {
    return "#2563eb";
  }
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "EMPLOYEE") redirect("/mi-portal");

  const userInitial  = session.name?.[0]?.toUpperCase() || "A";
  const roleLabel    = session.role === "OWNER_ADMIN" ? "Administrador" : "Gerente";
  const primaryColor = await getBrandColor();
  const rgb          = hexToRgb(primaryColor) ?? { r: 37, g: 99, b: 235 };
  const p            = buildPalette(primaryColor);

  const brandCss = `
    :root {
      --brand:    ${primaryColor};
      --brand-bg: rgba(${rgb.r},${rgb.g},${rgb.b},0.08);
      --brand-text: ${primaryColor};
      --brand-50:  ${p["50"]};  --brand-100: ${p["100"]};
      --brand-200: ${p["200"]}; --brand-300: ${p["300"]};
      --brand-400: ${p["400"]}; --brand-500: ${p["500"]};
      --brand-600: ${p["600"]}; --brand-700: ${p["700"]};
      --brand-800: ${p["800"]}; --brand-900: ${p["900"]};
    }
    .dark { --brand-bg: rgba(${rgb.r},${rgb.g},${rgb.b},0.18); }

    /* ── Override Tailwind blue classes with brand palette ── */
    .bg-blue-50  { background-color: var(--brand-50)  !important; }
    .bg-blue-100 { background-color: var(--brand-100) !important; }
    .bg-blue-200 { background-color: var(--brand-200) !important; }
    .bg-blue-300 { background-color: var(--brand-300) !important; }
    .bg-blue-400 { background-color: var(--brand-400) !important; }
    .bg-blue-500 { background-color: var(--brand-500) !important; }
    .bg-blue-600 { background-color: var(--brand-600) !important; }
    .bg-blue-700 { background-color: var(--brand-700) !important; }
    .bg-blue-800 { background-color: var(--brand-800) !important; }
    .bg-blue-900 { background-color: var(--brand-900) !important; }
    .hover\\:bg-blue-500:hover { background-color: var(--brand-500) !important; }
    .hover\\:bg-blue-600:hover { background-color: var(--brand-600) !important; }
    .hover\\:bg-blue-700:hover { background-color: var(--brand-700) !important; }

    .text-blue-400 { color: var(--brand-400) !important; }
    .text-blue-500 { color: var(--brand-500) !important; }
    .text-blue-600 { color: var(--brand-600) !important; }
    .text-blue-700 { color: var(--brand-700) !important; }
    .hover\\:text-blue-300:hover { color: var(--brand-300) !important; }
    .hover\\:text-blue-400:hover { color: var(--brand-400) !important; }

    .border-blue-200 { border-color: var(--brand-200) !important; }
    .border-blue-500 { border-color: var(--brand-500) !important; }
    .border-blue-600 { border-color: var(--brand-600) !important; }
    .border-blue-700 { border-color: var(--brand-700) !important; }
    .border-blue-800 { border-color: var(--brand-800) !important; }

    .ring-blue-500  { --tw-ring-color: var(--brand-500) !important; }
    .focus\\:ring-blue-500:focus { --tw-ring-color: var(--brand-500) !important; }

    .dark .dark\\:bg-blue-600\\/20  { background-color: rgba(${rgb.r},${rgb.g},${rgb.b},0.20) !important; }
    .dark .dark\\:bg-blue-900\\/20  { background-color: rgba(${rgb.r},${rgb.g},${rgb.b},0.20) !important; }
    .dark .dark\\:bg-blue-900\\/30  { background-color: rgba(${rgb.r},${rgb.g},${rgb.b},0.30) !important; }
    .dark .dark\\:text-blue-200     { color: var(--brand-200) !important; }
    .dark .dark\\:text-blue-300     { color: var(--brand-300) !important; }
    .dark .dark\\:text-blue-400     { color: var(--brand-400) !important; }
    .dark .dark\\:border-blue-600\\/30 { border-color: rgba(${rgb.r},${rgb.g},${rgb.b},0.30) !important; }
    .dark .dark\\:border-blue-700   { border-color: var(--brand-700) !important; }
    .dark .dark\\:border-blue-800   { border-color: var(--brand-800) !important; }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: brandCss }} />
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 transition-colors duration-200">
        <div className="flex">
          <Sidebar brandColor={primaryColor} />
          <div className="flex-1 flex flex-col min-h-screen">
            <AdminHeader
              userName={session.name}
              userRole={roleLabel}
              userInitial={userInitial}
            />
            <main className="flex-1">
              <div className="mx-auto max-w-7xl px-6 py-7">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
