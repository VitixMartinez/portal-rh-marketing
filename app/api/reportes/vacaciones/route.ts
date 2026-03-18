import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Ley 16-92 (RD): 14 días laborables/año (1-5 años), 18 días (5+ años)
function calcularDiasAcumulados(fechaIngreso: Date, hoy: Date): number {
  const msPerMonth = 1000 * 60 * 60 * 24 * 30.44;
  const mesesTrabajados = Math.max(0, (hoy.getTime() - fechaIngreso.getTime()) / msPerMonth);
  const anosTrabajados = mesesTrabajados / 12;

  // Días proporcionales acumulados total desde ingreso
  let diasAcumulados = 0;
  const anosCompletos = Math.floor(anosTrabajados);
  const fraccionAno = anosTrabajados - anosCompletos;

  for (let ano = 0; ano < anosCompletos; ano++) {
    diasAcumulados += ano >= 4 ? 18 : 14; // 14 primeros 5 años, 18 de ahí en adelante
  }
  // Fracción del año en curso
  const diasEsteAno = anosCompletos >= 4 ? 18 : 14;
  diasAcumulados += Math.floor(fraccionAno * diasEsteAno);

  return diasAcumulados;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden ver reportes de vacaciones" }, { status: 403 });
    }

    const companyId = session.companyId ?? "demo-company-id";
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") ?? new Date().getFullYear().toString();

    const [empleados, solicitudesAprobadas] = await Promise.all([
      prisma.employee.findMany({
        where: { companyId, status: "ACTIVO" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          jobTitle: true,
          department: true,
          hireDate: true,
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      prisma.solicitud.findMany({
        where: {
          employee: { companyId },
          tipo: { in: ["VACACIONES", "PERMISO"] },
          estado: "APROBADA",
        },
        select: {
          employeeId: true,
          fechaInicio: true,
          dias: true,
        },
      }),
    ]);

    const hoy = new Date();
    const inicioAno = new Date(`${year}-01-01`);
    const finAno = new Date(`${year}-12-31`);

    // Agrupar días usados por empleado (en el año seleccionado)
    const diasUsadosPorEmpleado: Record<string, number> = {};
    for (const s of solicitudesAprobadas) {
      const fechaSol = new Date(s.fechaInicio);
      if (fechaSol >= inicioAno && fechaSol <= finAno) {
        diasUsadosPorEmpleado[s.employeeId] = (diasUsadosPorEmpleado[s.employeeId] ?? 0) + s.dias;
      }
    }

    const balances = empleados.map((emp) => {
      const hireDate = emp.hireDate ? new Date(emp.hireDate) : null;
      const mesesTrabajados = hireDate
        ? Math.max(0, (hoy.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
        : 0;
      const anosTrabajados = mesesTrabajados / 12;

      const diasAcumulados = hireDate ? calcularDiasAcumulados(hireDate, hoy) : 0;
      const diasUsadosTotal = solicitudesAprobadas
        .filter((s) => s.employeeId === emp.id)
        .reduce((sum, s) => sum + s.dias, 0);
      const diasUsadosAno = diasUsadosPorEmpleado[emp.id] ?? 0;
      const diasDisponibles = Math.max(0, diasAcumulados - diasUsadosTotal);

      return {
        id: emp.id,
        nombre: `${emp.firstName} ${emp.lastName}`,
        puesto: emp.jobTitle ?? "—",
        departamento: emp.department ?? "—",
        fechaIngreso: emp.hireDate
          ? new Date(emp.hireDate).toLocaleDateString("es-DO")
          : "—",
        anosTrabajados: Math.floor(anosTrabajados * 10) / 10,
        diasPorAno: anosTrabajados >= 5 ? 18 : 14,
        diasAcumulados,
        diasUsadosAno,
        diasUsadosTotal,
        diasDisponibles,
      };
    });

    return NextResponse.json({ balances, year });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al calcular balance de vacaciones" }, { status: 500 });
  }
}
