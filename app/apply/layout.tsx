import type { ReactNode } from "react";

// Minimal layout for public apply forms — no sidebar, no auth required
export default function ApplyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-zinc-950 dark:to-zinc-900">
      {children}
    </div>
  );
}
