import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string; docId: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, docId } = await params;

  await prisma.$executeRawUnsafe(
    `DELETE FROM "EmpleadoDocumento"
     WHERE "id" = $1 AND "employeeId" = $2 AND "companyId" = $3`,
    docId, id, session.companyId
  );

  return NextResponse.json({ ok: true });
}
