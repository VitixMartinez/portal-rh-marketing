import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * GET /api/reconocimientos/aniversarios
 *
 * Revisa todos los empleados y:
 * 1. Detecta aniversarios laborales que ocurren HOY
 * 2. Si el aniversario es múltiplo de 5 años → crea un Reconocimiento automático
 * 3. Si el aniversario es cualquier año → se puede usar para mostrar en el calendario
 *
 * Usa upsert para no crear duplicados si se llama varias veces el mismo día.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const companyId = session.companyId ?? "demo-company-id";
    const hoy = new Date();
    const mesHoy = hoy.getMonth() + 1;  // 1-12
    const diaHoy = hoy.getDate();        // 1-31
    const anioHoy = hoy.getFullYear();

    const empleados = await prisma.employee.findMany({
      where: {
        companyId,
        status: { in: ["ACTIVO", "SUSPENDIDO"] },
        hireDate: { not: null },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        hireDate: true,
      },
    });

    const creados: string[] = [];
    const aniversariosHoy: { nombre: string; anos: number; esMilestone: boolean }[] = [];

    for (const emp of empleados) {
      if (!emp.hireDate) continue;

      const ingreso = new Date(emp.hireDate);
      const mesIngreso = ingreso.getMonth() + 1;
      const diaIngreso = ingreso.getDate();

      // ¿Es hoy el aniversario laboral?
      if (mesIngreso !== mesHoy || diaIngreso !== diaHoy) continue;

      const anos = anioHoy - ingreso.getFullYear();
      if (anos <= 0) continue; // Menos de 1 año, no cuenta

      const nombre = `${emp.firstName} ${emp.lastName}`;
      const esMilestone = anos % 5 === 0; // 5, 10, 15, 20...

      aniversariosHoy.push({ nombre, anos, esMilestone });

      // Solo crear reconocimiento automático en múltiplos de 5 años
      if (!esMilestone) continue;

      const titulo = `${anos} Años de Servicio`;
      const descripcion = `${nombre} cumple hoy ${anos} años siendo parte de nuestro equipo. ¡Gracias por tu dedicación y compromiso!`;

      // Upsert: buscar si ya existe uno para este empleado en este año
      const existente = await prisma.reconocimiento.findFirst({
        where: {
          employeeId: emp.id,
          titulo,
          fecha: {
            gte: new Date(`${anioHoy}-01-01`),
            lte: new Date(`${anioHoy}-12-31`),
          },
        },
      });

      if (!existente) {
        await prisma.reconocimiento.create({
          data: {
            employeeId:  emp.id,
            tipo:        "OTRO",
            titulo,
            descripcion,
            otorgadoPor: "Sistema Automático",
            fecha:       hoy,
            publico:     true,
          },
        });
        creados.push(`${nombre} — ${titulo}`);
      }
    }

    return NextResponse.json({
      ok: true,
      fecha: hoy.toLocaleDateString("es-DO"),
      aniversariosHoy,
      reconocimientosCreados: creados,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error procesando aniversarios" }, { status: 500 });
  }
}
