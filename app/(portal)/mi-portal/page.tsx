import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import ComunicacionesWidget from "@/components/ComunicacionesWidget";

const TIPO_LABEL: Record<string, string> = {
  TIEMPO_COMPLETO: "Tiempo completo",
  MEDIO_TIEMPO:    "Medio tiempo",
  TEMPORAL:        "Temporal",
  CONTRATO:        "Contrato",
};

function diffDays(d1: Date, d2: Date) {
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}
function formatMoney(n: number | null) {
  if (!n) return "—";
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 0 }).format(n);
}

export default async function MiPortalPage() {
  const session = await getSession();
  if (!session?.employeeId) redirect("/login");

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    include: {
      department: true,
      supervisor: { select: { firstName: true, lastName: true } },
    },
  });
  if (!employee) redirect("/login");

  // Pending change requests
  const pendingRequests = await (prisma as any).solicitudCambio.count({
    where: { employeeId: session.employeeId, estado: "PENDIENTE" },
  });

  // Internal vacancies open for this company
  const vacantesInternas = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, titulo, descripcion, ubicacion, tipo, "slugInterno", "createdAt"
     FROM "Vacante"
     WHERE "companyId" = $1
       AND "estado" = 'ABIERTA'
       AND "visibilidad" IN ('INTERNA', 'AMBAS')
     ORDER BY "createdAt" DESC`,
    employee.companyId
  );

  // Active communications for the company
  let comunicaciones: any[] = [];
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
    // Add pdfUrl column if it doesn't exist yet (migration)
    await prisma.$executeRawUnsafe(`ALTER TABLE "Comunicacion" ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT`).catch(() => {});
    comunicaciones = await prisma.$queryRawUnsafe(
      `SELECT "id","titulo","cuerpo","tipo","publicadoPorNombre","fijado","pdfUrl","createdAt"
       FROM "Comunicacion"
       WHERE "companyId" = $1 AND "fechaCaducidad" > CURRENT_TIMESTAMP
       ORDER BY "fijado" DESC, "createdAt" DESC
       LIMIT 6`,
      employee.companyId
    );
  } catch { /* silencioso */ }

  // Training assignments
  const asignaciones = await (prisma as any).asignacionCurso.findMany({
    where: { employeeId: session.employeeId },
    include: { curso: true },
    orderBy: { fechaLimite: "asc" },
  });

  const pendingTraining  = asignaciones.filter((a: any) => a.estado !== "COMPLETADO");
  const completedCount   = asignaciones.filter((a: any) => a.estado === "COMPLETADO").length;
  const overdueTraining  = pendingTraining.filter((a: any) => a.fechaLimite && new Date(a.fechaLimite) < new Date());

  const hireDate     = employee.hireDate ? new Date(employee.hireDate) : null;
  const tenure       = hireDate ? diffDays(hireDate, new Date()) : 0;
  const tenureYears  = Math.floor(tenure / 365);
  const tenureMonths = Math.floor((tenure % 365) / 30);
  const tenureDays   = tenure % 30;

  const firstName = employee.firstName;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hola, {firstName}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString("es-DO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Antigüedad</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 flex items-baseline gap-1">
            {!hireDate ? "—" : tenureYears > 0 ? (
              <>{tenureYears}<span className="text-sm font-semibold text-gray-700"> Años</span></>
            ) : (
              <>{tenureMonths}<span className="text-sm font-semibold text-gray-700"> Meses</span></>
            )}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {!hireDate ? "Sin fecha de ingreso" : tenureYears > 0
              ? `${tenureMonths} meses y ${tenureDays} días`
              : `${tenure} días`}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Salario</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatMoney(employee.salary)}</p>
          <p className="text-xs text-gray-400 mt-0.5"> </p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Entrenamientos</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{completedCount}/{asignaciones.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">completados</p>
        </div>

        <div className={`rounded-2xl p-4 shadow-sm border ${pendingRequests > 0 ? "bg-amber-50 border-amber-100" : "bg-white border-gray-100"}`}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Solicitudes</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{pendingRequests}</p>
          <p className="text-xs text-gray-400 mt-0.5">pendientes de aprobación</p>
        </div>
      </div>

      {/* Vacantes Internas */}
      {vacantesInternas.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
              </svg>
              <h2 className="font-semibold text-gray-800">Oportunidades Internas</h2>
              <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                {vacantesInternas.length}
              </span>
            </div>
            <span className="text-xs text-gray-400">Solo visible para empleados</span>
          </div>
          <div className="divide-y divide-gray-100">
            {vacantesInternas.map((v: any) => (
              <div key={v.id} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 text-sm">{v.titulo}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-400">
                      {TIPO_LABEL[v.tipo as string] ?? v.tipo}
                    </span>
                    {v.ubicacion && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          {v.ubicacion}
                        </span>
                      </>
                    )}
                    {v.descripcion && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="text-xs text-gray-400 truncate max-w-xs">{v.descripcion}</span>
                      </>
                    )}
                  </div>
                </div>
                <Link
                  href={`/apply/interno/${v.slugInterno}`}
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  Aplicar
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Employee summary card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Mi Información</h2>
            <Link href="/mi-perfil" className="text-xs text-blue-600 hover:underline">Ver perfil →</Link>
          </div>
          <div className="px-5 py-4 space-y-3">
            {[
              { label: "Cargo",        value: employee.position },
              { label: "Departamento", value: employee.department?.name },
              { label: "Supervisor",   value: employee.supervisor ? `${employee.supervisor.firstName} ${employee.supervisor.lastName}` : null },
              { label: "Tipo contrato",value: employee.contractType },
              { label: "Fecha ingreso", value: hireDate ? hireDate.toLocaleDateString("es-DO") : null },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{row.label}</span>
                <span className="font-medium text-gray-800">{row.value || "—"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Training summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Mis Entrenamientos</h2>
            <Link href="/mis-entrenamientos" className="text-xs text-blue-600 hover:underline">Ver todos →</Link>
          </div>
          {overdueTraining.length > 0 && (
            <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-sm text-red-700">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{overdueTraining.length} entrenamiento{overdueTraining.length > 1 ? "s" : ""} vencido{overdueTraining.length > 1 ? "s" : ""}</span>
            </div>
          )}
          <div className="px-5 py-4 space-y-3">
            {pendingTraining.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">¡Todo al día con los entrenamientos!</p>
              </div>
            ) : (
              pendingTraining.slice(0, 4).map((a: any) => {
                const overdue = a.fechaLimite && new Date(a.fechaLimite) < new Date();
                const daysLeft = a.fechaLimite ? diffDays(new Date(), new Date(a.fechaLimite)) : null;
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${overdue ? "bg-red-400" : "bg-blue-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{a.curso.titulo}</p>
                      {a.fechaLimite && (
                        <p className={`text-xs ${overdue ? "text-red-500" : "text-gray-400"}`}>
                          {overdue ? `Vencido hace ${Math.abs(daysLeft!)}d` : daysLeft === 0 ? "Vence hoy" : `${daysLeft}d restantes`}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.estado === "EN_PROGRESO" ? "bg-blue-100 text-blue-700" :
                      overdue ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {a.estado === "EN_PROGRESO" ? "En progreso" : a.estado === "PENDIENTE" ? "Pendiente" : a.estado}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Comunicaciones — al final */}
      <ComunicacionesWidget
        comunicaciones={comunicaciones.map((c: any) => ({
          ...c,
          createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
        }))}
      />
    </div>
  );
}
