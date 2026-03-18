import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomUUID } from "crypto";

// GET — list results for a course (admin only)
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { id } = await context.params;

    const rows = await prisma.$queryRawUnsafe(
      `SELECT r.id, r."cursoId", r."employeeId", r.puntaje, r.aprobado, r.respuestas, r.intento, r."createdAt",
              e."firstName", e."lastName", e."jobTitle"
       FROM "ResultadoExamen" r
       JOIN "Employee" e ON e.id = r."employeeId"
       WHERE r."cursoId" = $1
       ORDER BY r."createdAt" DESC`,
      id
    ) as any[];

    return NextResponse.json(rows.map(r => ({
      id: r.id, cursoId: r.cursoId, employeeId: r.employeeId,
      puntaje: r.puntaje, aprobado: r.aprobado, intento: r.intento,
      createdAt: r.createdAt,
      respuestas: (() => { try { return JSON.parse(r.respuestas); } catch { return {}; } })(),
      employee: { firstName: r.firstName, lastName: r.lastName, jobTitle: r.jobTitle },
    })));
  } catch (error) {
    console.error("[GET /api/cursos/:id/examen]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST — submit an exam (portal employee submits for themselves, or admin submits for any employee)
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id: cursoId } = await context.params;
    const body = await req.json();

    // Determine employeeId
    let employeeId: string;
    if (session.role === "OWNER_ADMIN") {
      // Admin can submit for any employee
      employeeId = body.employeeId;
      if (!employeeId) return NextResponse.json({ error: "employeeId requerido" }, { status: 400 });
    } else {
      // Portal employee submits for themselves
      if (!session.employeeId) {
        return NextResponse.json({ error: "Sin autorización" }, { status: 403 });
      }
      employeeId = session.employeeId;
    }

    const { respuestas } = body; // respuestas: { [preguntaId]: opcionId }
    if (!respuestas) {
      return NextResponse.json({ error: "respuestas son requeridas" }, { status: 400 });
    }

    // Load curso preguntas and notaAprobatoria
    const cursoRows = await prisma.$queryRawUnsafe(
      `SELECT preguntas, "notaAprobatoria" FROM "Curso" WHERE id=$1`, cursoId
    ) as any[];
    if (!cursoRows.length) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

    const preguntas: any[] = (() => { try { return JSON.parse(cursoRows[0].preguntas ?? "[]"); } catch { return []; } })();
    const notaAprobatoria = cursoRows[0].notaAprobatoria ?? 70;

    // Calculate score — only "seleccion" questions are graded
    const seleccionPreguntas = preguntas.filter((p: any) => !p.tipo || p.tipo === "seleccion");
    let correctas = 0;
    for (const p of seleccionPreguntas) {
      const respuestaEmpleado = respuestas[p.id];
      const opcionCorrecta = p.opciones?.find((o: any) => o.correcta);
      if (opcionCorrecta && respuestaEmpleado === opcionCorrecta.id) correctas++;
    }
    const total    = seleccionPreguntas.length;
    // If there are no seleccion questions (only poll/abierta/escala), auto-pass at 100%
    const puntaje  = total > 0 ? Math.round((correctas / total) * 100) : 100;
    const aprobado = puntaje >= notaAprobatoria;

    // Count previous attempts
    const prevRows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as cnt FROM "ResultadoExamen" WHERE "cursoId"=$1 AND "employeeId"=$2`, cursoId, employeeId
    ) as any[];
    const intento = Number(prevRows[0]?.cnt ?? 0) + 1;

    const id = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ResultadoExamen" (id,"cursoId","employeeId",puntaje,aprobado,respuestas,intento,"createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      id, cursoId, employeeId, puntaje, aprobado, JSON.stringify(respuestas), intento
    );

    // If approved, auto-mark assignment as COMPLETADO
    if (aprobado) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "AsignacionCurso" SET estado='COMPLETADO', "fechaCompletado"=NOW()
           WHERE "cursoId"=$1 AND "employeeId"=$2 AND estado != 'COMPLETADO'`,
          cursoId, employeeId
        );
      } catch (e) {
        console.error("Error auto-completing assignment:", e);
      }
    }

    return NextResponse.json({ id, puntaje, aprobado, correctas, total, totalPreguntas: preguntas.length, intento, notaAprobatoria }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/cursos/:id/examen]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
