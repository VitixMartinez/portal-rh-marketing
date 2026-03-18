import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ── Módulos disponibles en el sistema ───────────────────────────────────────
const MODULES = [
  { id: "inicio",          label: "Inicio",           desc: "Dashboard principal",                    href: "/dashboard",       icon: "🏠", tags: ["dashboard", "inicio", "home", "resumen"] },
  { id: "empleados",       label: "Empleados",        desc: "Lista y gestión de empleados",           href: "/empleados",        icon: "👤", tags: ["empleados", "personas", "personal", "staff", "trabajadores"] },
  { id: "organigrama",     label: "Organigrama",      desc: "Estructura organizacional",              href: "/organigrama",      icon: "🏢", tags: ["organigrama", "estructura", "jerarquía", "árbol"] },
  { id: "nomina",          label: "Nómina",           desc: "Gestión de nómina y pagos",              href: "/nomina",           icon: "💵", tags: ["nómina", "nomina", "pago", "salario", "sueldo", "planilla"] },
  { id: "vacaciones",      label: "Vacaciones",       desc: "Solicitudes y aprobación de vacaciones", href: "/vacaciones",       icon: "🏖️", tags: ["vacaciones", "ausencias", "permisos", "licencia", "días libres"] },
  { id: "asistencia",      label: "Asistencia",       desc: "Control de asistencia diaria",           href: "/asistencia",       icon: "📋", tags: ["asistencia", "presencia", "entrada", "salida", "check-in"] },
  { id: "desempeno",       label: "Desempeño",        desc: "Evaluaciones de desempeño",              href: "/desempeno",        icon: "⭐", tags: ["desempeño", "desempeno", "evaluación", "performance", "rendimiento"] },
  { id: "entrenamiento",   label: "Entrenamiento",    desc: "Cursos y asignaciones de formación",     href: "/entrenamiento",    icon: "📚", tags: ["entrenamiento", "cursos", "formación", "capacitación", "training"] },
  { id: "reconocimientos", label: "Reconocimientos",  desc: "Premios y reconocimientos al personal",  href: "/reconocimientos",  icon: "🏆", tags: ["reconocimientos", "premios", "logros", "awards"] },
  { id: "aprobaciones",    label: "Aprobaciones",     desc: "Solicitudes pendientes de aprobación",   href: "/aprobaciones",     icon: "✅", tags: ["aprobaciones", "pendientes", "solicitudes", "aprobar"] },
  { id: "calendario",      label: "Calendario",       desc: "Feriados y eventos de la empresa",       href: "/calendario",       icon: "📅", tags: ["calendario", "feriados", "eventos", "fechas"] },
  { id: "reportes",        label: "Reportes",         desc: "Reportes y exportaciones",               href: "/reportes",         icon: "📊", tags: ["reportes", "informes", "estadísticas", "exportar", "datos"] },
  { id: "configuracion",   label: "Configuración",    desc: "Configuración de la empresa",            href: "/configuracion",    icon: "⚙️", tags: ["configuración", "configuracion", "ajustes", "empresa", "settings"] },
];

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();

    if (q.length < 2) {
      return NextResponse.json({ empleados: [], modulos: [] });
    }

    const companyId = session.companyId ?? "demo-company-id";

    // ── Search employees (first+last name, jobTitle, department) ──────────
    const empleados = await prisma.employee.findMany({
      where: {
        companyId,
        status: { not: "INACTIVO" },
        OR: [
          { firstName:  { contains: q, mode: "insensitive" } },
          { lastName:   { contains: q, mode: "insensitive" } },
          { jobTitle:   { contains: q, mode: "insensitive" } },
          { department: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: {
        id:         true,
        firstName:  true,
        lastName:   true,
        jobTitle:   true,
        photoUrl:   true,
        status:     true,
        hireDate:   true,
        department: { select: { name: true } },
        supervisor: { select: { firstName: true, lastName: true } },
      },
      orderBy: [
        { lastName: "asc" },
        { firstName: "asc" },
      ],
      take: 6,
    });

    // Also search by full name (first + last combined)
    const fullNameMatches = await prisma.employee.findMany({
      where: {
        companyId,
        status: { not: "INACTIVO" },
        AND: [
          { firstName: { not: "" } },
          { lastName:  { not: "" } },
        ],
      },
      select: {
        id:         true,
        firstName:  true,
        lastName:   true,
        jobTitle:   true,
        photoUrl:   true,
        status:     true,
        hireDate:   true,
        department: { select: { name: true } },
        supervisor: { select: { firstName: true, lastName: true } },
      },
    });

    // Filter by full name match, merge without duplicates
    const matchedByFull = fullNameMatches.filter(e =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) &&
      !empleados.find(ex => ex.id === e.id)
    );

    const allEmpleados = [...empleados, ...matchedByFull].slice(0, 6).map(e => ({
      id:         e.id,
      firstName:  e.firstName,
      lastName:   e.lastName,
      jobTitle:   e.jobTitle,
      photoUrl:   e.photoUrl,
      status:     e.status,
      hireDate:   e.hireDate?.toISOString() ?? null,
      department: e.department?.name ?? null,
      supervisor: e.supervisor ? `${e.supervisor.firstName} ${e.supervisor.lastName}` : null,
      initials:   `${e.firstName[0] ?? ""}${e.lastName[0] ?? ""}`.toUpperCase(),
    }));

    // ── Search modules ─────────────────────────────────────────────────────
    const modulos = MODULES.filter(m =>
      m.label.toLowerCase().includes(q) ||
      m.desc.toLowerCase().includes(q)  ||
      m.tags.some(tag => tag.includes(q) || q.includes(tag))
    ).slice(0, 5);

    return NextResponse.json({ empleados: allEmpleados, modulos });
  } catch (error) {
    console.error("[GET /api/search]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
