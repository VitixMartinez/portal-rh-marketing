import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomUUID } from "crypto";

/* GET /api/feriados?year=2026 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const year = parseInt(req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()));
    const companyId = session.companyId ?? "demo-company-id";
    const rows = await prisma.$queryRawUnsafe(
      `SELECT id, mes, dia, nombre, "createdAt" FROM "FeriadoPersonalizado" WHERE "companyId" = $1 AND year = $2 ORDER BY mes, dia`,
      companyId, year,
    ) as { id: string; mes: number; dia: number; nombre: string; createdAt: Date }[];
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/* POST /api/feriados */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    const { year, mes, dia, nombre } = await req.json();
    if (!year || !mes || !dia || !nombre?.trim()) return NextResponse.json({ error: "year, mes, dia y nombre son requeridos" }, { status: 400 });
    const companyId = session.companyId ?? "demo-company-id";
    const id = randomUUID();
    const now = new Date().toISOString();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "FeriadoPersonalizado" (id, "companyId", year, mes, dia, nombre, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      id, companyId, year, mes, dia, nombre.trim(), now,
    );
    return NextResponse.json({ id, mes, dia, nombre: nombre.trim() }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/* DELETE /api/feriados?id=xxx */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const companyId = session.companyId ?? "demo-company-id";
    await prisma.$executeRawUnsafe(`DELETE FROM "FeriadoPersonalizado" WHERE id = $1 AND "companyId" = $2`, id, companyId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
