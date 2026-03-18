// Public external application endpoint — NO authentication required
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

type Ctx = { params: Promise<{ slug: string }> };

// GET — fetch vacancy info for the public form
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { slug } = await params;

  const [row] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "id","titulo","descripcion","requisitos","ubicacion","tipo","preguntas","estado","companyId"
     FROM "Vacante"
     WHERE "slugExterno" = $1`,
    slug
  );

  if (!row) return NextResponse.json({ error: "Vacante no encontrada" }, { status: 404 });
  if (row.estado !== "ABIERTA") {
    return NextResponse.json({ error: "Esta vacante ya no está disponible" }, { status: 410 });
  }

  // Return company name too
  const [company] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "name" FROM "Company" WHERE "id" = $1`, row.companyId
  );

  return NextResponse.json({
    id:          row.id,
    titulo:      row.titulo,
    descripcion: row.descripcion,
    requisitos:  row.requisitos,
    ubicacion:   row.ubicacion,
    tipo:        row.tipo,
    preguntas:   JSON.parse(row.preguntas ?? "[]"),
    empresa:     company?.name ?? "",
  });
}

// POST — submit an external application
export async function POST(req: NextRequest, { params }: Ctx) {
  const { slug } = await params;

  const [row] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "id","companyId","estado","titulo" FROM "Vacante" WHERE "slugExterno" = $1`, slug
  );

  if (!row) return NextResponse.json({ error: "Vacante no encontrada" }, { status: 404 });
  if (row.estado !== "ABIERTA") {
    return NextResponse.json({ error: "Esta vacante ya no está disponible" }, { status: 410 });
  }

  const body = await req.json();
  const { nombre, email, telefono, respuestas, cvUrl, archivos } = body;

  if (!nombre?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Nombre y email son requeridos" }, { status: 400 });
  }

  // Check for duplicate application
  const [existing] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "id" FROM "Aplicante" WHERE "vacanteId" = $1 AND "email" = $2`, row.id, email.trim()
  );
  if (existing) {
    return NextResponse.json({ error: "Ya existe una aplicación con este email para esta vacante" }, { status: 409 });
  }

  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Aplicante"
      ("id","vacanteId","companyId","nombre","email","telefono","tipo","respuestas","cvUrl","archivos","estado","createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,'EXTERNO',$7,$8,$9,'PENDIENTE',$10)`,
    id,
    row.id,
    row.companyId,
    nombre.trim(),
    email.trim().toLowerCase(),
    telefono ?? null,
    JSON.stringify(respuestas ?? {}),
    cvUrl    ?? null,
    JSON.stringify(archivos  ?? []),
    new Date(),
  );

  // Check if email matches an internal employee → notify their supervisor
  await notifyIfInternal(row.companyId, email.trim(), row.titulo, row.id, "EXTERNO");

  return NextResponse.json({ ok: true, id }, { status: 201 });
}

// Helper: if the applicant email matches an employee, notify supervisor (in-app)
async function notifyIfInternal(companyId: string, email: string, vacanteTitle: string, vacanteId: string, tipo: string) {
  try {
    const [emp] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT e."id", e."firstName", e."lastName", e."supervisorId"
       FROM "Employee" e
       WHERE e."companyId" = $1 AND LOWER(e."email") = LOWER($2) AND e."status" = 'ACTIVE'
       LIMIT 1`,
      companyId, email
    );

    if (emp?.supervisorId) {
      // Log notification in DB (in-app notification system)
      const notifId = randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Notificacion"
          ("id","companyId","paraEmpleadoId","tipo","titulo","mensaje","leido","createdAt")
         VALUES ($1,$2,$3,'APLICACION_INTERNA',$4,$5,FALSE,$6)`,
        notifId,
        companyId,
        emp.supervisorId,
        `Empleado aplicó a vacante interna`,
        `Tu empleado ${emp.firstName} ${emp.lastName} ha aplicado a la posición "${vacanteTitle}".`,
        new Date(),
      );
    }
  } catch {
    // Notificacion table may not exist yet — fail silently
  }
}
