import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomUUID } from "crypto";

/* ─── GET — listar comunicaciones activas ────────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const companyId = session.companyId ?? "demo-company-id";
    const { searchParams } = new URL(req.url);
    const incluirVencidas = searchParams.get("incluirVencidas") === "true";
    const tipo = searchParams.get("tipo");

    // Ensure table exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Comunicacion" (
        "id"                TEXT PRIMARY KEY,
        "companyId"         TEXT NOT NULL,
        "titulo"            TEXT NOT NULL,
        "cuerpo"            TEXT NOT NULL,
        "tipo"              TEXT NOT NULL DEFAULT 'GENERAL',
        "publicadoPorId"    TEXT,
        "publicadoPorNombre" TEXT,
        "pdfUrl"            TEXT,
        "duracionDias"      INTEGER NOT NULL DEFAULT 7,
        "fechaCaducidad"    TIMESTAMP NOT NULL,
        "fijado"            BOOLEAN NOT NULL DEFAULT false,
        "createdAt"         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    let query = `
      SELECT * FROM "Comunicacion"
      WHERE "companyId" = $1
    `;
    const params: unknown[] = [companyId];
    let idx = 2;

    if (!incluirVencidas) {
      query += ` AND "fechaCaducidad" > CURRENT_TIMESTAMP`;
    }

    if (tipo) {
      query += ` AND "tipo" = $${idx++}`;
      params.push(tipo);
    }

    query += ` ORDER BY "fijado" DESC, "createdAt" DESC`;

    const comunicaciones = await prisma.$queryRawUnsafe(query, ...params);
    return NextResponse.json({ comunicaciones });
  } catch (error) {
    console.error("[GET /api/comunicaciones]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/* ─── POST — crear comunicación ──────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const isAdmin   = session.role === "OWNER_ADMIN";
    const isManager = session.role === "MANAGER";

    if (!isAdmin && !isManager) {
      return NextResponse.json({ error: "Sin permisos para publicar comunicaciones" }, { status: 403 });
    }

    const body = await req.json();
    const { titulo, cuerpo, tipo = "GENERAL", duracionDias = 7, fijado = false, pdfUrl = null } = body;

    if (!titulo || !cuerpo) {
      return NextResponse.json({ error: "Título y cuerpo son requeridos" }, { status: 400 });
    }

    const companyId = session.companyId ?? "demo-company-id";
    const id = randomUUID();
    const dias = Math.max(1, Math.min(365, Number(duracionDias) || 7));
    const publicadoPorNombre = session.name ?? "Administrador";

    // Ensure table exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Comunicacion" (
        "id"                TEXT PRIMARY KEY,
        "companyId"         TEXT NOT NULL,
        "titulo"            TEXT NOT NULL,
        "cuerpo"            TEXT NOT NULL,
        "tipo"              TEXT NOT NULL DEFAULT 'GENERAL',
        "publicadoPorId"    TEXT,
        "publicadoPorNombre" TEXT,
        "pdfUrl"            TEXT,
        "duracionDias"      INTEGER NOT NULL DEFAULT 7,
        "fechaCaducidad"    TIMESTAMP NOT NULL,
        "fijado"            BOOLEAN NOT NULL DEFAULT false,
        "createdAt"         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add pdfUrl column if it doesn't exist yet
    await prisma.$executeRawUnsafe(`ALTER TABLE "Comunicacion" ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT`).catch(() => {});

    await prisma.$executeRawUnsafe(
      `INSERT INTO "Comunicacion" (
         "id","companyId","titulo","cuerpo","tipo",
         "publicadoPorId","publicadoPorNombre","pdfUrl",
         "duracionDias","fechaCaducidad","fijado",
         "createdAt","updatedAt"
       ) VALUES (
         $1,$2,$3,$4,$5,
         $6,$7,$8,
         $9, CURRENT_TIMESTAMP + ($9 || ' days')::INTERVAL, $10,
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       )`,
      id,
      companyId,
      titulo,
      cuerpo,
      tipo,
      session.employeeId ?? null,
      publicadoPorNombre,
      pdfUrl ?? null,
      dias,
      Boolean(fijado),
    );

    return NextResponse.json({ id, titulo, tipo }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/comunicaciones]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
