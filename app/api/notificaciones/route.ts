import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const companyId = session.companyId ?? "demo-company-id";
    const now       = new Date();
    const in30Days  = new Date(now); in30Days.setDate(now.getDate() + 30);
    const in7Days   = new Date(now); in7Days.setDate(now.getDate() + 7);

    // ── Today's month/day window for birthdays & anniversaries ──────────────
    const todayM = now.getMonth() + 1;
    const todayD = now.getDate();
    // next 7 days (month/day only — we compare later in JS)
    const next7  = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      return { month: d.getMonth() + 1, day: d.getDate() };
    });

    const [
      solicitudesPendientes,
      cambiosPendientes,
      entrenamientosPorVencer,
      contratosTemporales,
      terminacionesPendientes,
      empleadosActivos,
    ] = await Promise.all([
      // 1. Solicitudes de vacaciones / permisos pendientes de aprobación
      prisma.solicitud.findMany({
        where: {
          estado:   "PENDIENTE",
          employee: { companyId },
        },
        include: {
          employee: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "asc" },
      }),

      // 2. Solicitudes de cambio de datos (fotos, campos) pendientes
      (prisma as any).solicitudCambio.findMany({
        where: {
          estado:   "PENDIENTE",
          employee: { companyId },
        },
        include: {
          employee: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "asc" },
      }),

      // 2. Entrenamientos / cursos con fecha límite próxima (7 días) o ya vencidos
      prisma.asignacionCurso.findMany({
        where: {
          estado:      { in: ["PENDIENTE", "EN_PROGRESO"] },
          fechaLimite: { lte: in7Days },
          employee:    { companyId, status: "ACTIVO" },
        },
        include: {
          curso:    { select: { titulo: true } },
          employee: { select: { firstName: true, lastName: true } },
        },
        orderBy: { fechaLimite: "asc" },
      }),

      // 3. Contratos temporales por vencer en 30 días
      prisma.employee.findMany({
        where: {
          companyId,
          status:      "ACTIVO",
          contractType: { in: ["TEMPORAL", "PRUEBA"] },
          contractEnd:  { lte: in30Days, gte: now },
        },
        select: {
          id:          true,
          firstName:   true,
          lastName:    true,
          contractType: true,
          contractEnd:  true,
        },
        orderBy: { contractEnd: "asc" },
      }),

      // 4. Terminaciones pendientes de aprobación (solo admin)
      session.role === "OWNER_ADMIN"
        ? prisma.$queryRawUnsafe(`
            SELECT t."id", t."razonPrimaria", t."fechaTerminacion", t."createdAt",
                   e."firstName" || ' ' || e."lastName" AS "empleadoNombre",
                   e."id" AS "empleadoId",
                   s."firstName" || ' ' || s."lastName" AS "solicitadoPorNombre"
            FROM "Terminacion" t
            LEFT JOIN "Employee" e ON t."employeeId" = e."id"
            LEFT JOIN "Employee" s ON t."solicitadoPorId" = s."id"
            WHERE t."companyId" = $1 AND t."estado" = 'PENDIENTE'
            ORDER BY t."createdAt" ASC
          `, companyId) as Promise<{ id: string; razonPrimaria: string; fechaTerminacion: Date; createdAt: Date; empleadoNombre: string; empleadoId: string; solicitadoPorNombre: string | null }[]>
        : Promise.resolve([] as { id: string; razonPrimaria: string; fechaTerminacion: Date; createdAt: Date; empleadoNombre: string; empleadoId: string; solicitadoPorNombre: string | null }[]),

      // 5. Todos los empleados activos (para birthdays & anniversaries)
      prisma.employee.findMany({
        where: {
          companyId,
          status: "ACTIVO",
          OR: [
            { birthDate: { not: null } },
            { hireDate:  { not: null } },
          ],
        },
        select: {
          id:        true,
          firstName: true,
          lastName:  true,
          birthDate: true,
          hireDate:  true,
        },
      }),
    ]);

    // ── Birthday / anniversary detection (next 7 days, month+day match) ────
    const birthdays: { id: string; firstName: string; lastName: string; daysUntil: number }[] = [];
    const anniversaries: { id: string; firstName: string; lastName: string; years: number; daysUntil: number }[] = [];

    for (const emp of empleadosActivos) {
      if (emp.birthDate) {
        const idx = next7.findIndex(d =>
          d.month === emp.birthDate!.getMonth() + 1 &&
          d.day   === emp.birthDate!.getDate()
        );
        if (idx >= 0) birthdays.push({ ...emp, daysUntil: idx });
      }
      if (emp.hireDate) {
        const idx = next7.findIndex(d =>
          d.month === emp.hireDate!.getMonth() + 1 &&
          d.day   === emp.hireDate!.getDate()
        );
        if (idx >= 0) {
          const years = now.getFullYear() - emp.hireDate.getFullYear();
          if (years > 0) anniversaries.push({ ...emp, years, daysUntil: idx });
        }
      }
    }

    // ── Build notification list ─────────────────────────────────────────────
    type Notif = {
      id:       string;
      tipo:     "aprobacion" | "entrenamiento" | "contrato" | "cumpleanos" | "aniversario" | "terminacion";
      titulo:   string;
      detalle:  string;
      urgente:  boolean;
      href:     string;
    };

    const notifs: Notif[] = [];

    // Aprobaciones pendientes (vacaciones / permisos)
    for (const s of solicitudesPendientes) {
      const TIPO_LABEL: Record<string, string> = {
        VACACIONES:         "Vacaciones",
        PERMISO:            "Permiso",
        LICENCIA_MEDICA:    "Licencia médica",
        LICENCIA_MATERNIDAD:"Licencia maternidad",
        LICENCIA_PATERNIDAD:"Licencia paternidad",
      };
      notifs.push({
        id:      `sol-${s.id}`,
        tipo:    "aprobacion",
        titulo:  `Solicitud de ${TIPO_LABEL[s.tipo] ?? s.tipo} pendiente`,
        detalle: `${s.employee.firstName} ${s.employee.lastName} · ${s.dias} día${s.dias !== 1 ? "s" : ""}`,
        urgente: true,
        href:    "/aprobaciones",
      });
    }

    // Solicitudes de cambio de datos pendientes (fotos, campos)
    for (const c of cambiosPendientes) {
      const campoLabel = c.campoLabel ?? c.campo;
      const esFoto     = c.campo === "photoUrl";
      notifs.push({
        id:      `cambio-${c.id}`,
        tipo:    "aprobacion",
        titulo:  esFoto ? "Cambio de foto pendiente" : `Cambio de ${campoLabel} pendiente`,
        detalle: `${c.employee.firstName} ${c.employee.lastName}`,
        urgente: true,
        href:    "/aprobaciones?tab=cambios",
      });
    }

    // Terminaciones pendientes de aprobación
    for (const t of terminacionesPendientes) {
      const RAZON_LABEL: Record<string, string> = {
        RENUNCIA_VOLUNTARIA:   "Renuncia voluntaria",
        TERMINACION_CAUSA:     "Terminación por causa",
        TERMINACION_SIN_CAUSA: "Desahucio",
        FIN_CONTRATO:          "Fin de contrato",
        JUBILACION:            "Jubilación",
        MUTUO_ACUERDO:         "Mutuo acuerdo",
        ABANDONO:              "Abandono de trabajo",
        FALLECIMIENTO:         "Fallecimiento",
        OTRO:                  "Otro",
      };
      notifs.push({
        id:      `term-${t.id}`,
        tipo:    "terminacion",
        titulo:  "Terminación de empleado pendiente",
        detalle: `${t.empleadoNombre} · ${RAZON_LABEL[t.razonPrimaria] ?? t.razonPrimaria}${t.solicitadoPorNombre ? ` · solicitado por ${t.solicitadoPorNombre}` : ""}`,
        urgente: true,
        href:    `/empleados/${t.empleadoId}`,
      });
    }

    // Entrenamientos por vencer
    for (const a of entrenamientosPorVencer) {
      const vencido = a.fechaLimite && a.fechaLimite < now;
      const diasRestantes = a.fechaLimite
        ? Math.ceil((a.fechaLimite.getTime() - now.getTime()) / 86_400_000)
        : null;
      notifs.push({
        id:      `ent-${a.id}`,
        tipo:    "entrenamiento",
        titulo:  vencido ? "Entrenamiento vencido" : "Entrenamiento por vencer",
        detalle: `${a.employee.firstName} ${a.employee.lastName} · ${a.curso.titulo}${
          diasRestantes !== null
            ? (vencido ? ` · venció hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) !== 1 ? "s" : ""}` : ` · ${diasRestantes} día${diasRestantes !== 1 ? "s" : ""}`)
            : ""
        }`,
        urgente: !!vencido,
        href:    "/entrenamiento",
      });
    }

    // Contratos por vencer
    for (const emp of contratosTemporales) {
      const dias = Math.ceil((emp.contractEnd!.getTime() - now.getTime()) / 86_400_000);
      notifs.push({
        id:      `con-${emp.id}`,
        tipo:    "contrato",
        titulo:  "Contrato por vencer",
        detalle: `${emp.firstName} ${emp.lastName} · vence en ${dias} día${dias !== 1 ? "s" : ""}`,
        urgente: dias <= 7,
        href:    `/empleados/${emp.id}`,
      });
    }

    // Cumpleaños
    for (const b of birthdays) {
      notifs.push({
        id:      `bday-${b.id}`,
        tipo:    "cumpleanos",
        titulo:  b.daysUntil === 0 ? "🎂 Cumpleaños hoy" : `Cumpleaños en ${b.daysUntil} día${b.daysUntil !== 1 ? "s" : ""}`,
        detalle: `${b.firstName} ${b.lastName}`,
        urgente: b.daysUntil === 0,
        href:    `/empleados/${b.id}`,
      });
    }

    // Aniversarios
    for (const a of anniversaries) {
      notifs.push({
        id:      `aniv-${a.id}`,
        tipo:    "aniversario",
        titulo:  a.daysUntil === 0 ? `🏆 Aniversario hoy — ${a.years} año${a.years !== 1 ? "s" : ""}` : `Aniversario laboral en ${a.daysUntil} día${a.daysUntil !== 1 ? "s" : ""}`,
        detalle: `${a.firstName} ${a.lastName} · ${a.years} año${a.years !== 1 ? "s" : ""} en la empresa`,
        urgente: a.daysUntil === 0,
        href:    `/empleados/${a.id}`,
      });
    }

    // Ordenar: urgentes primero, luego por tipo
    notifs.sort((a, b) => {
      if (a.urgente && !b.urgente) return -1;
      if (!a.urgente && b.urgente) return 1;
      return 0;
    });

    return NextResponse.json({ notifs, total: notifs.length });
  } catch (error) {
    console.error("[GET /api/notificaciones]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
