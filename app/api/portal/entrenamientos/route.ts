import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || !session.employeeId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");

  const asignaciones = await (prisma as any).asignacionCurso.findMany({
    where: { employeeId: session.employeeId },
    include: { curso: true },
    orderBy: [{ estado: "asc" }, { fechaLimite: "asc" }],
  });

  // Enrich cursos with extra fields (materiales, preguntas, tieneEvaluacion, notaAprobatoria)
  const cursoIds: string[] = [...new Set(asignaciones.map((a: any) => a.cursoId as string))];
  const extraMap = new Map<string, any>();

  try {
    if (cursoIds.length > 0) {
      const placeholders = cursoIds.map((_: any, i: number) => `$${i + 1}`).join(",");
      const extras = await prisma.$queryRawUnsafe(
        `SELECT id, materiales, preguntas, "tieneEvaluacion", "notaAprobatoria" FROM "Curso" WHERE id IN (${placeholders})`,
        ...cursoIds
      ) as any[];
      extras.forEach((e: any) => extraMap.set(e.id, e));
    }
  } catch {
    // Migration not run yet — skip extra fields
  }

  const safeJson = (str: string | null, fallback: any) => {
    try { return JSON.parse(str ?? "null") ?? fallback; } catch { return fallback; }
  };

  const enriched = asignaciones.map((a: any) => {
    const extra = extraMap.get(a.cursoId) ?? {};
    return {
      ...a,
      curso: {
        ...a.curso,
        materiales:      safeJson(extra.materiales, []),
        preguntas:       safeJson(extra.preguntas, []),
        tieneEvaluacion: extra.tieneEvaluacion ?? false,
        notaAprobatoria: extra.notaAprobatoria ?? 70,
      },
    };
  });

  return NextResponse.json(enriched);
}
