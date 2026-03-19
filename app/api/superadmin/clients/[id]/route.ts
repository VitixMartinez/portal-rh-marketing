import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD ?? "superadmin-2026";

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-superadmin-key");
  return key === SUPERADMIN_PASSWORD;
}

/* ─── PATCH — update client info ──────────────────────────────────────────── */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await req.json();
  const { name, logoUrl } = body;

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (name) { fields.push(`"name" = $${idx++}`); values.push(name); }
  if (logoUrl !== undefined) { fields.push(`"logoUrl" = $${idx++}`); values.push(logoUrl); }

  if (fields.length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  fields.push(`"updatedAt" = CURRENT_TIMESTAMP`);
  values.push(id);

  await prisma.$executeRawUnsafe(
    `UPDATE "Company" SET ${fields.join(", ")} WHERE "id" = $${idx}`,
    ...values
  );

  return NextResponse.json({ ok: true });
}

/* ─── DELETE — remove client ──────────────────────────────────────────────── */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  // Delete in order to respect FK constraints
  await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE "companyId" = $1`, id);
  await prisma.$executeRawUnsafe(`DELETE FROM "Employee" WHERE "companyId" = $1`, id);
  await prisma.$executeRawUnsafe(`DELETE FROM "Company" WHERE "id" = $1`, id);

  return NextResponse.json({ ok: true });
}
