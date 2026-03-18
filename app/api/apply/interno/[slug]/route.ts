// Internal application endpoint — requires active Portal RH session
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomUUID } from "crypto";

type Ctx = { params: Promise<{ slug: string }> };

// GET — fetch vacancy info + pre-fill employee data
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Debes iniciar sesión para aplicar" }, { status: 401 });

  const { slug } = await params;

  const [row] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "id","titulo","descripcion","requisitos","ubicacion","tipo","preguntas","estado","companyId"
     FROM "Vacante"
     WHERE "slugInterno" = $1 AND "companyId" = $2`,
    slug, session.companyId
  );

  if (!row) return NextResponse.json({ error: "Vacante no encontrada" }, { status: 404 });
  if (row.estado !== "ABIERTA") {
    return NextResponse.json({ error: "Esta vacante ya no está disponible" }, { status: 410 });
  }

  // Pre-fill employee data if they have an employeeId
  let empleado = null;
  if (session.employeeId) {
    const [emp] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "firstName","lastName","email","phone" FROM "Employee" WHERE "id" = $1`,
      session.employeeId
    );
    if (emp) {
      empleado = {
        nombre:   `${emp.firstName} ${emp.lastName}`,
        email:    emp.email ?? session.email,
        telefono: emp.phone ?? "",
      };
    }
  }

  return NextResponse.json({
    id:          row.id,
    titulo:      row.titulo,
    descripcion: row.descripcion,
    requisitos:  row.requisitos,
    ubicacion:   row.ubicacion,
    tipo:        row.tipo,
    preguntas:   JSON.parse(row.preguntas ?? "[]"),
    empleado,
  });
}

// POST — submit internal application
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Debes iniciar sesión para aplicar" }, { status: 401 });

  const { slug } = await params;

  const [row] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "id","companyId","estado","titulo" FROM "Vacante" WHERE "slugInterno" = $1 AND "companyId" = $2`,
    slug, session.companyId
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

  // Check for duplicate
  const [existing] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "id" FROM "Aplicante"
     WHERE "vacanteId" = $1 AND ("email" = $2 OR "empleadoId" = $3)`,
    row.id, email.trim(), session.employeeId ?? "NONE"
  );
  if (existing) {
    return NextResponse.json({ error: "Ya aplicaste a esta vacante" }, { status: 409 });
  }

  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Aplicante"
      ("id","vacanteId","companyId","nombre","email","telefono","tipo","empleadoId","respuestas","cvUrl","archivos","estado","createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,'INTERNO',$7,$8,$9,$10,'PENDIENTE',$11)`,
    id,
    row.id,
    row.companyId,
    nombre.trim(),
    email.trim().toLowerCase(),
    telefono ?? null,
    session.employeeId ?? null,
    JSON.stringify(respuestas ?? {}),
    cvUrl ?? null,
    JSON.stringify(archivos ?? []),
    new Date(),
  );

  // Notify supervisor of the internal employee
  if (session.employeeId) {
    try {
      const [emp] = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "firstName","lastName","supervisorId" FROM "Employee" WHERE "id" = $1`,
        session.employeeId
      );
      if (emp?.supervisorId) {
        const notifId = randomUUID();
        await prisma.$executeRawUnsafe(
          `INSERT INTO "Notificacion"
            ("id","companyId","paraEmpleadoId","tipo","titulo","mensaje","leido","createdAt")
           VALUES ($1,$2,$3,'APLICACION_INTERNA',$4,$5,FALSE,$6)`,
          notifId,
          row.companyId,
          emp.supervisorId,
          `Empleado aplicó a vacante interna`,
          `Tu empleado ${emp.firstName} ${emp.lastName} ha aplicado a la posición "${row.titulo}".`,
          new Date(),
        );
      }
    } catch {
      // Notificacion table not yet created — fail silently
    }
  }

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
