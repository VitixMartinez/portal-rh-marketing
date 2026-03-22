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

  const brandCss = `
    :root {
      --brand: ${primaryColor};
      --brand-bg: rgba(${rgb.r},${rgb.g},${rgb.b},0.08);
      --brand-text: ${primaryColor};
    }
    .dark {
      --brand-bg: rgba(${rgb.r},${rgb.g},${rgb.b},0.18);
    }
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
