import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/* GET /api/prestamos/[id] */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = await context.params;

    const rows = await prisma.$queryRawUnsafe(`
      SELECT p.*, e."firstName", e."lastName", e."jobTitle"
      FROM "Prestamo" p
      LEFT JOIN "Employee" e ON p."employeeId" = e."id"
      WHERE p."id" = $1
    `, id) as any[];

    if (!rows.length) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const pagos = await prisma.$queryRawUnsafe(
      `SELECT * FROM "PrestamoPago" WHERE "prestamoId" = $1 ORDER BY "cuotaNum" ASC`,
      id,
    ) as any[];

    const row = rows[0];
    return NextResponse.json({
      id:             row.id,
      companyId:      row.companyId,
      employeeId:     row.employeeId,
      monto:          Number(row.monto),
      cuotas:         Number(row.cuotas),
      cuotaMonto:     Number(row.cuotaMonto),
      saldoPendiente: Number(row.saldoPendiente),
      cuotasPagadas:  Number(row.cuotasPagadas),
      quincenaInicio: row.quincenaInicio,
      estado:         row.estado,
      motivo:         row.motivo,
      notas:          row.notas,
      aprobadoPor:    row.aprobadoPor,
      createdAt:      row.createdAt,
      employee: { firstName: row.firstName, lastName: row.lastName, jobTitle: row.jobTitle },
      pagos: pagos.map(pg => ({ ...pg, monto: Number(pg.monto) })),
    });
  } catch (e: any) {
    console.error("[GET /api/prestamos/:id]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/* PATCH /api/prestamos/[id] — update estado or notas */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const { id } = await context.params;
    const body   = await req.json();

    // Build SET clause dynamically
    const allowed = ["estado", "notas", "motivo", "saldoPendiente", "cuotasPagadas"];
    const sets: string[]  = [];
    const params: unknown[] = [];
    let idx = 1;

    for (const key of allowed) {
      if (body[key] !== undefined) {
        sets.push(`"${key}" = $${idx++}`);
        params.push(body[key]);
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 });
    }

    sets.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    params.push(id);

    await prisma.$executeRawUnsafe(
      `UPDATE "Prestamo" SET ${sets.join(", ")} WHERE "id" = $${idx}`,
      ...params,
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[PATCH /api/prestamos/:id]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/* DELETE /api/prestamos/[id] — cancel (soft: estado → CANCELADO) */
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const { id } = await context.params;
    await prisma.$executeRawUnsafe(
      `UPDATE "Prestamo" SET "estado" = 'CANCELADO', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
      id,
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[DELETE /api/prestamos/:id]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
