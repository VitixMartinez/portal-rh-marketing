import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/apply"];
const ADMIN_PATHS  = ["/empleados", "/nomina", "/tiempo", "/reconocimientos",
                      "/entrenamiento", "/configuracion", "/aprobaciones",
                      "/reportes", "/dashboard", "/organigrama", "/calendario",
                      "/vacaciones", "/asistencia", "/desempeno", "/reclutamiento",
                      "/beneficios"];
const PORTAL_PATHS = ["/mi-portal", "/mi-perfil", "/mis-entrenamientos", "/directorio"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and Next.js / API internals
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  // Read session token from cookie
  const token   = req.cookies.get("hr-session")?.value;
  const session = token ? await verifyToken(token) : null;

  // Not logged in → redirect to login
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isEmployeeRole = session.role === "EMPLOYEE";
  const isManager      = session.role === "MANAGER";

  // Employee trying to access admin-only area
  if (isEmployeeRole && ADMIN_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.redirect(new URL("/mi-portal", req.url));
  }

  // Manager trying to access OWNER_ADMIN-only area (configuracion)
  const OWNER_ONLY_PATHS = ["/configuracion"];
  if (isManager && OWNER_ONLY_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Admin trying to access employee portal
  if (!isEmployeeRole && PORTAL_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Root redirect based on role
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(isEmployeeRole ? "/mi-portal" : "/dashboard", req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
