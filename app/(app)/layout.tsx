import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import AdminHeader from "@/components/AdminHeader";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "EMPLOYEE") redirect("/mi-portal");

  const userInitial = session.name?.[0]?.toUpperCase() || "A";
  const roleLabel   = session.role === "OWNER_ADMIN" ? "Administrador" : "Gerente";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 transition-colors duration-200">
      <div className="flex">
        <Sidebar />
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
  );
}
