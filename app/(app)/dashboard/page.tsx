import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import MoodDashboard from "@/components/MoodDashboard";

/* ─── Helpers de saludo ──────────────────────────────────────────────────── */
function getSaludo(nombre: string | undefined): string {
  const hora = new Date().toLocaleString("es-DO", { timeZone: "America/Santo_Domingo", hour: "numeric", hour12: false });
  const h = parseInt(hora, 10);
  const momento = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  const primerNombre = nombre?.split(" ")[0] ?? "";
  return primerNombre ? `${momento}, ${primerNombre}` : momento;
}

/* ─── Tipos comunicación ─────────────────────────────────────────────────── */
type ComDash = {
  id: string;
  titulo: string;
  cuerpo: string;
  tipo: string;
  publicadoPorNombre: string | null;
  fijado: boolean;
  pdfUrl: string | null;
  createdAt: Date;
};

async function getComunicaciones(companyId: string): Promise<ComDash[]> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Comunicacion" (
        "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "titulo" TEXT NOT NULL,
        "cuerpo" TEXT NOT NULL, "tipo" TEXT NOT NULL DEFAULT 'GENERAL',
        "publicadoPorId" TEXT, "publicadoPorNombre" TEXT, "duracionDias" INTEGER NOT NULL DEFAULT 7,
        "fechaCaducidad" TIMESTAMP NOT NULL, "fijado" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Comunicacion" ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT`).catch(() => {});
    const rows = await prisma.$queryRawUnsafe(
      `SELECT "id","titulo","cuerpo","tipo","publicadoPorNombre","fijado","pdfUrl","createdAt"
       FROM "Comunicacion"
       WHERE "companyId" = $1 AND "fechaCaducidad" > CURRENT_TIMESTAMP
       ORDER BY "fijado" DESC, "createdAt" DESC
       LIMIT 5`,
      companyId,
    ) as ComDash[];
    return rows;
  } catch {
    return [];
  }
}

// Verificar aniversarios laborales al cargar el dashboard.
// Si un empleado cumple hoy un múltiplo de 5 años → crea reconocimiento automático.
async function checkAniversarios(companyId: string) {
  try {
    const hoy = new Date();
    const mesHoy  = hoy.getMonth() + 1;
    const diaHoy  = hoy.getDate();
    const anioHoy = hoy.getFullYear();

    const empleados = await prisma.employee.findMany({
      where: { companyId, status: { in: ["ACTIVO", "SUSPENDIDO"] }, hireDate: { not: null } },
      select: { id: true, firstName: true, lastName: true, hireDate: true },
    });

    for (const emp of empleados) {
      if (!emp.hireDate) continue;
      const ingreso = new Date(emp.hireDate);
      if (ingreso.getMonth() + 1 !== mesHoy || ingreso.getDate() !== diaHoy) continue;
      const anos = anioHoy - ingreso.getFullYear();
      if (anos <= 0 || anos % 5 !== 0) continue; // Solo 5, 10, 15, 20...

      const titulo = `${anos} Años de Servicio`;
      const existe = await prisma.reconocimiento.findFirst({
        where: { employeeId: emp.id, titulo, fecha: { gte: new Date(`${anioHoy}-01-01`) } },
      });
      if (!existe) {
        await prisma.reconocimiento.create({
          data: {
            employeeId: emp.id,
            tipo:        "OTRO",
            titulo,
            descripcion: `${emp.firstName} ${emp.lastName} cumple hoy ${anos} años siendo parte de nuestro equipo. ¡Gracias por tu dedicación!`,
            otorgadoPor: "Sistema Automático",
            fecha:       hoy,
            publico:     true,
          },
        });
      }
    }
  } catch {
    // Silencioso — no interrumpir el dashboard si falla
  }
}

type EventoFecha = {
  key: string;
  nombre: string;
  tipo: "cumpleanos" | "aniversario";
  diasRestantes: number;
  fecha: string; // "DD MMM"
  anios?: number;
};

async function getFechasImportantes(companyId: string): Promise<EventoFecha[]> {
  const empleados = await prisma.employee.findMany({
    where: {
      companyId,
      status: { in: ["ACTIVO", "SUSPENDIDO"] },
      OR: [{ birthDate: { not: null } }, { hireDate: { not: null } }],
    },
    select: { id: true, firstName: true, lastName: true, birthDate: true, hireDate: true },
  });

  const DIAS_VENTANA = 30;
  const hoy = new Date();
  const hoyStart = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  const eventos: EventoFecha[] = [];

  for (const emp of empleados) {
    const nombre = `${emp.firstName} ${emp.lastName}`;

    const procesar = (fecha: Date, tipo: "cumpleanos" | "aniversario") => {
      let proximo = new Date(hoyStart.getFullYear(), fecha.getMonth(), fecha.getDate());
      if (proximo < hoyStart) proximo = new Date(hoyStart.getFullYear() + 1, fecha.getMonth(), fecha.getDate());
      const dias = Math.round((proximo.getTime() - hoyStart.getTime()) / (1000 * 60 * 60 * 24));
      if (dias > DIAS_VENTANA) return;
      const anios = tipo === "aniversario" ? proximo.getFullYear() - fecha.getFullYear() : undefined;
      if (tipo === "aniversario" && (!anios || anios <= 0)) return;
      eventos.push({
        key: emp.id + "-" + tipo,
        nombre,
        tipo,
        diasRestantes: dias,
        fecha: proximo.toLocaleDateString("es-DO", { day: "numeric", month: "short" }),
        anios,
      });
    };

    if (emp.birthDate) procesar(new Date(emp.birthDate), "cumpleanos");
    if (emp.hireDate)  procesar(new Date(emp.hireDate),  "aniversario");
  }

  eventos.sort((a, b) => a.diasRestantes - b.diasRestantes);
  return eventos.slice(0, 10);
}

async function getMetrics(companyId: string) {

  const [
    totalEquipo,      // ACTIVO + SUSPENDIDO (el equipo actual)
    activos,
    suspendidos,
    exEmpleados,      // INACTIVO — ex-empleados, fuera del dashboard
    porContrato,
    recientes,
  ] = await Promise.all([
    // El equipo actual = activos + suspendidos (no se cuentan los inactivos/despedidos)
    prisma.employee.count({ where: { companyId, status: { in: ["ACTIVO", "SUSPENDIDO"] } } }),
    prisma.employee.count({ where: { companyId, status: "ACTIVO" } }),
    prisma.employee.count({ where: { companyId, status: "SUSPENDIDO" } }),
    prisma.employee.count({ where: { companyId, status: "INACTIVO" } }),
    prisma.employee.groupBy({
      by: ["contractType"],
      where: { companyId, status: { in: ["ACTIVO", "SUSPENDIDO"] } },
      _count: { contractType: true },
    }),
    // Incorporaciones recientes: solo activos/suspendidos
    prisma.employee.findMany({
      where: { companyId, status: { in: ["ACTIVO", "SUSPENDIDO"] } },
      orderBy: { hireDate: "desc" },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        status: true,
        hireDate: true,
      },
    }),
  ]);

  const salarios = await prisma.employee.aggregate({
    where: { companyId, status: "ACTIVO" },
    _sum: { salary: true },
    _avg: { salary: true },
  });

  return {
    totalEquipo,
    activos,
    suspendidos,
    exEmpleados,
    porContrato,
    recientes,
    masaSalarial: salarios._sum.salary ?? 0,
    salarioPromedio: salarios._avg.salary ?? 0,
  };
}

const CONTRACT_LABELS: Record<string, string> = {
  INDEFINIDO: "Indefinido",
  TEMPORAL:   "Temporal",
  POR_OBRA:   "Por Obra",
  PRUEBA:     "Prueba",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVO:     "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-600/20 dark:text-blue-200 dark:border-blue-600/30",
  SUSPENDIDO: "bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-600/20 dark:text-yellow-200 dark:border-yellow-600/30",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVO:     "Activo",
  SUSPENDIDO: "Suspendido",
};

export default async function DashboardPage() {
  const session = await getSession();
  const companyId = session?.companyId ?? "demo-company-id";

  // Ejecutar en paralelo: métricas + check de aniversarios + fechas próximas + comunicaciones
  const [[m, fechas, comunicaciones]] = await Promise.all([
    Promise.all([getMetrics(companyId), getFechasImportantes(companyId), getComunicaciones(companyId)]),
    checkAniversarios(companyId),
  ]);

  const tasaActividad = m.totalEquipo > 0
    ? Math.round((m.activos / m.totalEquipo) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* ── Saludo ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {getSaludo(session?.name ?? undefined)}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Resumen general de tu equipo activo.</p>
        </div>
        {/* Indicador de ex-empleados */}
        {m.exEmpleados > 0 && (
          <a
            href="/empleados?status=INACTIVO"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600 inline-block" />
            {m.exEmpleados} ex-empleado{m.exEmpleados !== 1 ? "s" : ""}
          </a>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Equipo Actual</p>
          <p className="mt-2 text-3xl font-bold">{m.totalEquipo}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {m.suspendidos > 0 ? `${m.suspendidos} suspendido${m.suspendidos !== 1 ? "s" : ""}` : "100% activos"}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-600/10 p-5">
          <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">Activos</p>
          <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-300">{m.activos}</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-blue-100 dark:bg-zinc-800">
            <div
              className="h-1.5 rounded-full bg-blue-500 transition-all"
              style={{ width: `${tasaActividad}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Masa Salarial</p>
          <p className="mt-2 text-2xl font-bold">
            RD$ {Number(m.masaSalarial).toLocaleString("es-DO")}
          </p>
          <p className="mt-1 text-xs text-zinc-500">empleados activos</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Salario Promedio</p>
          <p className="mt-2 text-2xl font-bold">
            RD$ {Number(m.salarioPromedio).toLocaleString("es-DO", { maximumFractionDigits: 0 })}
          </p>
          <p className="mt-1 text-xs text-zinc-500">por empleado activo</p>
        </div>
      </div>

      {/* Sección inferior */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <MoodDashboard />

        {/* Estado del equipo: solo activos y suspendidos */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Estado del equipo</h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">Empleados en la empresa actualmente</p>
          <div className="space-y-3">
            {[
              { label: "Trabajando",   value: m.activos,     color: "bg-blue-500",   dot: "bg-blue-500" },
              { label: "Suspendidos",  value: m.suspendidos, color: "bg-yellow-500", dot: "bg-yellow-500" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                    <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                    {item.label}
                  </span>
                  <span className="font-medium">{item.value}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-1.5 rounded-full ${item.color}`}
                    style={{ width: m.totalEquipo > 0 ? `${(item.value / m.totalEquipo) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
          {/* Nota sobre ex-empleados */}
          {m.exEmpleados > 0 && (
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
              <span>Ex-empleados (inactivos)</span>
              <span className="font-medium">{m.exEmpleados}</span>
            </div>
          )}
        </div>

        {/* Tipos de contrato: solo equipo activo */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Tipos de contrato</h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">Distribución del equipo actual</p>
          {m.porContrato.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {m.porContrato.map((c) => (
                <div key={String(c.contractType)} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {CONTRACT_LABELS[(c.contractType ?? "") as keyof typeof CONTRACT_LABELS] ?? c.contractType ?? "—"}
                  </span>
                  <span className="text-sm font-semibold">{c._count.contractType}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incorporaciones recientes: solo equipo activo */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Incorporaciones recientes</h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">Últimas contrataciones</p>
          {m.recientes.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin empleados aún</p>
          ) : (
            <div className="space-y-3">
              {m.recientes.map((emp) => (
                <div key={emp.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                      {emp.firstName?.[0]}{emp.lastName?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {emp.firstName} {emp.lastName}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {emp.jobTitle ?? "—"}
                        {emp.hireDate ? ` · ${new Date(emp.hireDate).toLocaleDateString("es-DO", { month: "short", year: "numeric" })}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[(emp.status ?? "") as keyof typeof STATUS_COLORS] ?? ""}`}>
                    {STATUS_LABELS[(emp.status ?? "") as keyof typeof STATUS_LABELS] ?? emp.status ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Fechas Importantes */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Fechas Importantes</h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Cumpleaños y aniversarios — próximos 30 días</p>
          </div>
          <a
            href="/calendario"
            className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors group"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Ir al Calendario
            <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </a>
        </div>

        {fechas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <svg className="w-10 h-10 text-zinc-200 dark:text-zinc-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p className="text-sm text-zinc-400">No hay fechas especiales en los próximos 30 días</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {fechas.map((ev) => {
              const esCumple = ev.tipo === "cumpleanos";
              const esHoy    = ev.diasRestantes === 0;
              const esMañana = ev.diasRestantes === 1;
              return (
                <div
                  key={ev.key}
                  className={[
                    "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                    esHoy
                      ? esCumple
                        ? "border-pink-200 bg-pink-50 dark:border-pink-800/40 dark:bg-pink-900/10"
                        : "border-blue-200 bg-blue-50 dark:border-blue-800/40 dark:bg-blue-900/10"
                      : "border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20",
                  ].join(" ")}
                >
                  {/* Fecha (mes/día) */}
                  <div className={[
                    "flex-shrink-0 w-10 text-center rounded-lg py-1",
                    esCumple
                      ? "bg-pink-100 dark:bg-pink-900/30"
                      : "bg-blue-100 dark:bg-blue-900/30",
                  ].join(" ")}>
                    <p className={`text-[10px] font-semibold uppercase leading-none ${esCumple ? "text-pink-500 dark:text-pink-400" : "text-blue-500 dark:text-blue-400"}`}>
                      {ev.fecha.split(" ")[1]}
                    </p>
                    <p className={`text-base font-bold leading-tight ${esCumple ? "text-pink-700 dark:text-pink-300" : "text-blue-700 dark:text-blue-300"}`}>
                      {ev.fecha.split(" ")[0]}
                    </p>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{ev.nombre}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {esCumple ? "Cumpleaños" : `Aniversario${ev.anios ? ` · ${ev.anios} ${ev.anios === 1 ? "año" : "años"}` : ""}`}
                    </p>
                  </div>

                  {/* Badge días */}
                  <span className={[
                    "flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                    esHoy
                      ? esCumple
                        ? "bg-pink-200 text-pink-700 dark:bg-pink-800/40 dark:text-pink-300"
                        : "bg-blue-200 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300"
                      : esMañana
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
                  ].join(" ")}>
                    {esHoy ? "Hoy" : esMañana ? "Mañana" : `${ev.diasRestantes}d`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Comunicaciones ──────────────────────────────────────────────── */}
      {comunicaciones.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Comunicaciones</h2>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Anuncios activos de la empresa</p>
            </div>
            <a
              href="/comunicaciones"
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium transition-colors group"
            >
              Ver todas
              <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </a>
          </div>
          <div className="space-y-3">
            {comunicaciones.map(c => {
              const tipoMeta: Record<string, { label: string; color: string; bg: string }> = {
                GENERAL:  { label: "General",  color: "text-blue-700 dark:text-blue-300",   bg: "bg-blue-50 dark:bg-blue-900/20"   },
                URGENTE:  { label: "Urgente",  color: "text-red-700 dark:text-red-300",     bg: "bg-red-50 dark:bg-red-900/20"     },
                EVENTO:   { label: "Evento",   color: "text-green-700 dark:text-green-300", bg: "bg-green-50 dark:bg-green-900/20" },
                POLITICA: { label: "Política", color: "text-purple-700 dark:text-purple-300",bg:"bg-purple-50 dark:bg-purple-900/20"},
              };
              const meta = tipoMeta[c.tipo] ?? tipoMeta.GENERAL;
              return (
                <a
                  key={c.id}
                  href="/comunicaciones"
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 hover:shadow-sm transition-shadow ${
                    c.fijado
                      ? "border-l-4 border-l-amber-400 border-zinc-200 dark:border-zinc-700"
                      : "border-zinc-100 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      {c.fijado && (
                        <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                        </svg>
                      )}
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.bg} ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{c.titulo}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">{c.cuerpo}</p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400 whitespace-nowrap">
                    {new Date(c.createdAt).toLocaleDateString("es-DO", { day: "numeric", month: "short" })}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
