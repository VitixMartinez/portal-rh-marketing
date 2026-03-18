/**
 * Portal layout for employees.
 * Minimal sidebar with only employee-relevant sections.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import PortalNav from "@/components/PortalNav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) redirect("/login");
  if (session.role !== "EMPLOYEE") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <PortalNav session={session} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
