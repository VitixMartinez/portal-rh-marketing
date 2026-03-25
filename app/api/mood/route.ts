import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/* ── GET — clima del equipo (admin) o mi entrada de hoy (empleado) ── */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dias = parseInt(searchParams.get("dias") ?? "7");
  const hoy  = new Date().toISOString().slice(0, 10);

  if (session.role === "EMPLOYEE") {
    // Devuelve solo la entrada de hoy del empleado
    type Row = { id: string; mood: number; nota: string | null; fecha: string };
    const rows = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT "id","mood","nota","fecha" FROM "MoodEntry"
       WHERE "employeeId" = $1 AND "fecha" = $2 LIMIT 1`,
      session.employeeId, hoy
    );
    return NextResponse.json({ entry: rows[0] ?? null, hoy });
  }

  // Admin/Manager: resumen del equipo últimos N días
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  const desdeStr = desde.toISOString().slice(0, 10);

  type SummaryRow = { fecha: string; avg: string; total: bigint; mood1: bigint; mood2: bigint; mood3: bigint; mood4: bigint; mood5: bigint };
  const rows = await prisma.$queryRawUnsafe<SummaryRow[]>(
    `SELECT
       "fecha",
       ROUND(AVG("mood")::numeric, 2)::text as avg,
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE "mood"=1) as mood1,
       COUNT(*) FILTER (WHERE "mood"=2) as mood2,
       COUNT(*) FILTER (WHERE "mood"=3) as mood3,
       COUNT(*) FILTER (WHERE "mood"=4) as mood4,
       COUNT(*) FILTER (WHERE "mood"=5) as mood5
     FROM "MoodEntry"
     WHERE "companyId" = $1 AND "fecha" >= $2
     GROUP BY "fecha"
     ORDER BY "fecha" DESC`,
    session.companyId, desdeStr
  );

  // Entrada de hoy del admin si es empleado también
  const summary = rows.map(r => ({
    fecha: r.fecha,
    avg: parseFloat(r.avg ?? "0"),
    total: Number(r.total),
    breakdown: [Number(r.mood1), Number(r.mood2), Number(r.mood3), Number(r.mood4), Number(r.mood5)],
  }));

  return NextResponse.json({ summary, hoy });
}

/* ── POST — registrar/actualizar mi estado de hoy ── */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { mood, nota } = await req.json();
  if (!mood || mood < 1 || mood > 5) {
    return NextResponse.json({ error: "mood debe ser 1-5" }, { status: 400 });
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const empId = session.role === "EMPLOYEE" ? session.employeeId : null;
  if (!empId) return NextResponse.json({ error: "Solo empleados pueden registrar su estado" }, { status: 403 });

  await prisma.$executeRawUnsafe(
    `INSERT INTO "MoodEntry" ("id","companyId","employeeId","mood","nota","fecha","createdAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW())
     ON CONFLICT ("employeeId","fecha") DO UPDATE SET "mood"=$3, "nota"=$4`,
    session.companyId, empId, mood, nota ?? null, hoy
  );

  return NextResponse.json({ ok: true });
}
