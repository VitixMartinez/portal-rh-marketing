import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/* GET /api/company — returns current company data + settings */
export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const companyId = session.companyId ?? "demo-company-id";

    const rows = await prisma.$queryRawUnsafe(
      `SELECT id, name, rnc, settings FROM "Company" WHERE id = $1`,
      companyId,
    ) as { id: string; name: string; rnc: string | null; settings: string | null }[];

    if (!rows.length) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
    }

    const row = rows[0];
    let settings: Record<string, unknown> = {};
    try { settings = row.settings ? JSON.parse(row.settings) : {}; } catch { /* ignore */ }

    return NextResponse.json({
      id:       row.id,
      name:     row.name,
      rnc:      row.rnc ?? "",
      settings,
    });
  } catch (e: any) {
    console.error("[GET /api/company]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/* PATCH /api/company — update name, rnc, and/or settings */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const companyId = session.companyId ?? "demo-company-id";
    const body = await req.json();

    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (body.name !== undefined) {
      sets.push(`"name" = $${idx++}`);
      params.push(body.name);
    }
    if (body.rnc !== undefined) {
      sets.push(`"rnc" = $${idx++}`);
      params.push(body.rnc || null);
    }
    if (body.settings !== undefined) {
      sets.push(`"settings" = $${idx++}`);
      params.push(JSON.stringify(body.settings));
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 });
    }

    sets.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    params.push(companyId);

    await prisma.$executeRawUnsafe(
      `UPDATE "Company" SET ${sets.join(", ")} WHERE id = $${idx}`,
      ...params,
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[PATCH /api/company]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
