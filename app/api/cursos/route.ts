import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const companyId   = session.companyId ?? "demo-company-id";
    const soloActivos = searchParams.get("activo") !== "false";

    const cursos = await (prisma as any).curso.findMany({
      where: { companyId, ...(soloActivos ? { activo: true } : {}) },
      include: {
        _count: { select: { asignaciones: true } },
        asignaciones: { select: { estado: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Attach extra columns from raw SQL (resilient if migration not run yet)
    if (cursos.length === 0) return NextResponse.json([]);
    const ids = cursos.map((c: any) => c.id);
    let extrasMap: Record<string, any> = {};
    try {
      const extras = await prisma.$queryRawUnsafe(
        `SELECT id, materiales, preguntas, "tieneEvaluacion", "notaAprobatoria" FROM "Curso" WHERE id = ANY($1::text[])`,
        ids
      ) as any[];
      extrasMap = Object.fromEntries(extras.map(e => [e.id, e]));
    } catch { /* migration pending */ }

    const result = cursos.map((c: any) => {
      const ex = extrasMap[c.id] ?? {};
      return {
        ...c,
        materiales:      safeJson(ex.materiales, []),
        preguntas:       safeJson(ex.preguntas, []),
        tieneEvaluacion: ex.tieneEvaluacion ?? false,
        notaAprobatoria: ex.notaAprobatoria ?? 70,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/cursos]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden crear cursos" }, { status: 403 });
    }

    const body      = await req.json();
    const companyId = session.companyId ?? "demo-company-id";
    if (!body.titulo) return NextResponse.json({ error: "Título requerido" }, { status: 400 });

    const curso = await (prisma as any).curso.create({
      data: {
        companyId,
        titulo:      body.titulo,
        descripcion: body.descripcion || null,
        categoria:   body.categoria   || "OTRO",
        modalidad:   body.modalidad   || "Virtual",
        duracionHrs: body.duracionHrs ? parseInt(body.duracionHrs) : null,
        recurrencia: body.recurrencia || "UNA_VEZ",
        obligatorio: body.obligatorio !== false,
        activo:      true,
      },
    });

    // Save extra columns
    await saveExtras(curso.id, body);
    return NextResponse.json({ ...curso, ...extraDefaults(body) }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/cursos]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function safeJson(val: any, fallback: any) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

function extraDefaults(body: any) {
  return {
    materiales:      Array.isArray(body.materiales) ? body.materiales : [],
    preguntas:       Array.isArray(body.preguntas)  ? body.preguntas  : [],
    tieneEvaluacion: body.tieneEvaluacion === true,
    notaAprobatoria: Number(body.notaAprobatoria) || 70,
  };
}

async function saveExtras(id: string, body: any) {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "Curso" SET materiales=$1, preguntas=$2, "tieneEvaluacion"=$3, "notaAprobatoria"=$4 WHERE id=$5`,
      JSON.stringify(Array.isArray(body.materiales) ? body.materiales : []),
      JSON.stringify(Array.isArray(body.preguntas)  ? body.preguntas  : []),
      body.tieneEvaluacion === true,
      Number(body.notaAprobatoria) || 70,
      id
    );
  } catch { /* migration pending */ }
}
