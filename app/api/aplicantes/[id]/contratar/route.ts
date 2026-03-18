import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/aplicantes/[id]/contratar
// Converts an applicant into an Employee pre-populated with their data.
// Returns the new employeeId so the UI can redirect to their profile.
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  // Fetch applicant
  const [ap] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT a.*, v."titulo" AS "vacanteTitle"
     FROM "Aplicante" a
     JOIN "Vacante" v ON v."id" = a."vacanteId"
     WHERE a."id" = $1 AND a."companyId" = $2`,
    id, session.companyId
  );
  if (!ap) return NextResponse.json({ error: "Aplicante no encontrado" }, { status: 404 });

  // If already an internal employee just return their id
  if (ap.empleadoId) {
    // Mark as hired
    await prisma.$executeRawUnsafe(
      `UPDATE "Aplicante" SET "estado" = 'CONTRATADO' WHERE "id" = $1`, ap.id
    );
    return NextResponse.json({ employeeId: ap.empleadoId, existing: true });
  }

  // Parse name
  const parts     = (ap.nombre as string).trim().split(/\s+/);
  const firstName = parts[0] ?? ap.nombre;
  const lastName  = parts.slice(1).join(" ") || "";

  // Create new Employee record pre-populated from application
  const { randomUUID } = await import("crypto");
  const empId = randomUUID();

  // Generate a simple employee code
  const [countRow] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) AS cnt FROM "Employee" WHERE "companyId" = $1`, session.companyId
  );
  const empCode = `EMP-${String(Number(countRow.cnt) + 1).padStart(4, "0")}`;

  await prisma.$executeRawUnsafe(
    `INSERT INTO "Employee"
      ("id","companyId","employeeCode","firstName","lastName","email","phone",
       "status","contractType","payPeriod","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,'ACTIVE','INDEFINIDO','QUINCENAL',$8,$8)`,
    empId,
    session.companyId,
    empCode,
    firstName,
    lastName,
    ap.email,
    ap.telefono ?? null,
    new Date(),
  );

  // If CV exists, copy as document
  if (ap.cvUrl) {
    const { randomUUID: uuid2 } = await import("crypto");
    await prisma.$executeRawUnsafe(
      `INSERT INTO "EmpleadoDocumento"
        ("id","employeeId","companyId","nombre","tipo","url","createdAt")
       VALUES ($1,$2,$3,'Currículum Vitae','CV',$4,$5)`,
      uuid2(),
      empId,
      session.companyId,
      ap.cvUrl,
      new Date(),
    );
  }

  // Mark applicant as hired
  await prisma.$executeRawUnsafe(
    `UPDATE "Aplicante" SET "estado" = 'CONTRATADO' WHERE "id" = $1`, ap.id
  );

  return NextResponse.json({ employeeId: empId, existing: false }, { status: 201 });
}
