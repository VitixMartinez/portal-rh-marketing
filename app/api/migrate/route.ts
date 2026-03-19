import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// One-time migration helper — ensures all DB columns and tables exist.
// All operations use IF NOT EXISTS so it is safe to run multiple times.
// Call from browser: GET /api/migrate
export async function GET() {
  const results: string[] = [];

  try {
    // Drop ALL possible global unique constraints/indexes on User.email
    // (Postgres may have a standalone index instead of a named constraint)
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_key"`
    ).catch(() => {});
    await prisma.$executeRawUnsafe(
      `DROP INDEX IF EXISTS "User_email_key"`
    ).catch(() => {});
    await prisma.$executeRawUnsafe(
      `DROP INDEX IF EXISTS "user_email_key"`
    ).catch(() => {});
    // Ensure per-company unique index exists
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_companyId_key" ON "User"("email", "companyId")`
    );
    results.push('User.email global unique removed, per-company unique ensured ✓');

    // Employee.photoUrl
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT`
    );
    results.push('Employee.photoUrl ✓');

    // Prestamo table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Prestamo" (
        "id"             TEXT NOT NULL PRIMARY KEY,
        "companyId"      TEXT NOT NULL,
        "employeeId"     TEXT NOT NULL,
        "monto"          DECIMAL(12,2) NOT NULL,
        "cuotas"         INTEGER NOT NULL,
        "cuotaMonto"     DECIMAL(12,2) NOT NULL,
        "saldoPendiente" DECIMAL(12,2) NOT NULL,
        "cuotasPagadas"  INTEGER NOT NULL DEFAULT 0,
        "quincenaInicio" TEXT NOT NULL,
        "estado"         TEXT NOT NULL DEFAULT 'ACTIVO',
        "motivo"         TEXT,
        "notas"          TEXT,
        "aprobadoPor"    TEXT,
        "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("companyId")  REFERENCES "Company"("id"),
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
      )
    `);
    results.push('Prestamo table ✓');

    // PrestamoPago table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PrestamoPago" (
        "id"         TEXT NOT NULL PRIMARY KEY,
        "prestamoId" TEXT NOT NULL,
        "cuotaNum"   INTEGER NOT NULL,
        "periodo"    TEXT NOT NULL,
        "monto"      DECIMAL(12,2) NOT NULL,
        "aplicado"   BOOLEAN NOT NULL DEFAULT FALSE,
        "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("prestamoId") REFERENCES "Prestamo"("id") ON DELETE CASCADE
      )
    `);
    results.push('PrestamoPago table ✓');

    // Terminacion table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Terminacion" (
        "id"                     TEXT NOT NULL PRIMARY KEY,
        "companyId"              TEXT NOT NULL,
        "employeeId"             TEXT NOT NULL,
        "razonPrimaria"          TEXT NOT NULL,
        "fechaTerminacion"       TIMESTAMP(3) NOT NULL,
        "ultimoDiaTrabajo"       TIMESTAMP(3),
        "pagoHasta"              TIMESTAMP(3),
        "fechaRenuncia"          TIMESTAMP(3),
        "elegibleRecontratacion" BOOLEAN NOT NULL DEFAULT TRUE,
        "estado"                 TEXT NOT NULL DEFAULT 'PENDIENTE',
        "solicitadoPorId"        TEXT,
        "aprobadoPorId"          TEXT,
        "comentarios"            TEXT,
        "adjuntos"               TEXT NOT NULL DEFAULT '[]',
        "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("companyId")  REFERENCES "Company"("id"),
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
      )
    `);
    results.push('Terminacion table ✓');

    // Employee.city (if not already added)
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "city" TEXT`
    );
    results.push('Employee.city ✓');

    // Company.settings — JSON blob for UI-configurable policies
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "settings" TEXT DEFAULT '{}'`
    );
    results.push('Company.settings ✓');

    // ReviewCalificacion enum (PostgreSQL)
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "ReviewCalificacion" AS ENUM (
          'EXCEPCIONAL','SOBRESALIENTE','CUMPLE','NECESITA_MEJORA','INSATISFACTORIO'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    results.push('ReviewCalificacion enum ✓');

    // PerformanceReview table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PerformanceReview" (
        "id"            TEXT                  NOT NULL PRIMARY KEY,
        "employeeId"    TEXT                  NOT NULL,
        "reviewerId"    TEXT,
        "periodo"       TEXT                  NOT NULL,
        "calificacion"  "ReviewCalificacion"  NOT NULL DEFAULT 'CUMPLE',
        "puntuacion"    INTEGER,
        "fortalezas"    TEXT,
        "areasEnMejora" TEXT,
        "comentarios"   TEXT,
        "objetivos"     TEXT,
        "fechaReview"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE,
        FOREIGN KEY ("reviewerId") REFERENCES "Employee"("id") ON DELETE SET NULL
      )
    `);
    results.push('PerformanceReview ✓');

    // Prestamo: add frecuencia + fechaAcreditacion columns
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Prestamo" ADD COLUMN IF NOT EXISTS "frecuencia" TEXT NOT NULL DEFAULT 'QUINCENAL'`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Prestamo" ADD COLUMN IF NOT EXISTS "fechaAcreditacion" TIMESTAMP(3)`
    );
    results.push('Prestamo.frecuencia + fechaAcreditacion ✓');

    // Vacante table (job postings)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Vacante" (
        "id"          TEXT NOT NULL PRIMARY KEY,
        "companyId"   TEXT NOT NULL,
        "titulo"      TEXT NOT NULL,
        "descripcion" TEXT,
        "requisitos"  TEXT,
        "ubicacion"   TEXT,
        "tipo"        TEXT NOT NULL DEFAULT 'TIEMPO_COMPLETO',
        "preguntas"   TEXT NOT NULL DEFAULT '[]',
        "estado"      TEXT NOT NULL DEFAULT 'ABIERTA',
        "slugExterno" TEXT NOT NULL,
        "slugInterno" TEXT NOT NULL,
        "creadoPorId" TEXT,
        "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("companyId") REFERENCES "Company"("id")
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "Vacante_slugExterno_key" ON "Vacante"("slugExterno")`
    );
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "Vacante_slugInterno_key" ON "Vacante"("slugInterno")`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Vacante" ADD COLUMN IF NOT EXISTS "visibilidad" TEXT NOT NULL DEFAULT 'AMBAS'`
    );
    results.push('Vacante table ✓');

    // Aplicante table (job applications)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Aplicante" (
        "id"         TEXT NOT NULL PRIMARY KEY,
        "vacanteId"  TEXT NOT NULL,
        "companyId"  TEXT NOT NULL,
        "nombre"     TEXT NOT NULL,
        "email"      TEXT NOT NULL,
        "telefono"   TEXT,
        "tipo"       TEXT NOT NULL DEFAULT 'EXTERNO',
        "empleadoId" TEXT,
        "respuestas" TEXT NOT NULL DEFAULT '{}',
        "cvUrl"      TEXT,
        "archivos"   TEXT NOT NULL DEFAULT '[]',
        "estado"     TEXT NOT NULL DEFAULT 'PENDIENTE',
        "notas"      TEXT,
        "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("vacanteId") REFERENCES "Vacante"("id") ON DELETE CASCADE,
        FOREIGN KEY ("companyId") REFERENCES "Company"("id")
      )
    `);
    results.push('Aplicante table ✓');

    // EmpleadoDocumento table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "EmpleadoDocumento" (
        "id"         TEXT NOT NULL PRIMARY KEY,
        "employeeId" TEXT NOT NULL,
        "companyId"  TEXT NOT NULL,
        "nombre"     TEXT NOT NULL,
        "tipo"       TEXT NOT NULL DEFAULT 'OTRO',
        "url"        TEXT NOT NULL,
        "tamano"     INTEGER,
        "notas"      TEXT,
        "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE,
        FOREIGN KEY ("companyId")  REFERENCES "Company"("id")
      )
    `);
    results.push('EmpleadoDocumento table ✓');

    // Notificacion table (in-app notifications)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Notificacion" (
        "id"              TEXT NOT NULL PRIMARY KEY,
        "companyId"       TEXT NOT NULL,
        "paraEmpleadoId"  TEXT NOT NULL,
        "tipo"            TEXT NOT NULL DEFAULT 'GENERAL',
        "titulo"          TEXT NOT NULL,
        "mensaje"         TEXT NOT NULL,
        "leido"           BOOLEAN NOT NULL DEFAULT FALSE,
        "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("companyId")      REFERENCES "Company"("id"),
        FOREIGN KEY ("paraEmpleadoId") REFERENCES "Employee"("id") ON DELETE CASCADE
      )
    `);
    results.push('Notificacion table ✓');

    // Commission fields on Employee
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "comisionActiva" BOOLEAN NOT NULL DEFAULT FALSE`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "comisionPorcentaje" DECIMAL(5,2) NOT NULL DEFAULT 0`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "comisionFrecuencia" TEXT NOT NULL DEFAULT 'QUINCENAL'`
    );
    results.push('Employee commission fields ✓');

    // VentaComision table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "VentaComision" (
        "id"            TEXT NOT NULL PRIMARY KEY,
        "companyId"     TEXT NOT NULL,
        "employeeId"    TEXT NOT NULL,
        "periodo"       TEXT NOT NULL,
        "totalVentas"   DECIMAL(12,2) NOT NULL DEFAULT 0,
        "montoComision" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "notas"         TEXT,
        "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("companyId")  REFERENCES "Company"("id"),
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "VentaComision_emp_periodo_key" ON "VentaComision"("employeeId", "periodo")`
    );
    // Reporte de ventas adjunto (audit trail)
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "VentaComision" ADD COLUMN IF NOT EXISTS "reporteUrl" TEXT`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "VentaComision" ADD COLUMN IF NOT EXISTS "reporteNombre" TEXT`
    );
    results.push('VentaComision table ✓');

    // FeriadoPersonalizado — feriados extra por empresa y año
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "FeriadoPersonalizado" (
        "id"        TEXT NOT NULL PRIMARY KEY,
        "companyId" TEXT NOT NULL,
        "year"      INTEGER NOT NULL,
        "mes"       INTEGER NOT NULL,
        "dia"       INTEGER NOT NULL,
        "nombre"    TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "FeriadoPersonalizado_companyId_year_idx"
       ON "FeriadoPersonalizado"("companyId", "year")`
    );
    results.push('FeriadoPersonalizado table ✓');

    // Asistencia: ausenciaCode + adjuntos
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Asistencia" ADD COLUMN IF NOT EXISTS "ausenciaCode" TEXT`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Asistencia" ADD COLUMN IF NOT EXISTS "adjuntos" TEXT NOT NULL DEFAULT '[]'`
    );
    results.push('Asistencia.ausenciaCode + adjuntos ✓');

    // Curso: materiales, quiz fields
    await prisma.$executeRawUnsafe(`ALTER TABLE "Curso" ADD COLUMN IF NOT EXISTS "materiales" TEXT NOT NULL DEFAULT '[]'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Curso" ADD COLUMN IF NOT EXISTS "preguntas" TEXT NOT NULL DEFAULT '[]'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Curso" ADD COLUMN IF NOT EXISTS "tieneEvaluacion" BOOLEAN NOT NULL DEFAULT FALSE`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Curso" ADD COLUMN IF NOT EXISTS "notaAprobatoria" INTEGER NOT NULL DEFAULT 70`);
    results.push('Curso LMS fields ✓');

    // ResultadoExamen table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ResultadoExamen" (
        "id"          TEXT NOT NULL PRIMARY KEY,
        "cursoId"     TEXT NOT NULL,
        "employeeId"  TEXT NOT NULL,
        "puntaje"     INTEGER NOT NULL,
        "aprobado"    BOOLEAN NOT NULL,
        "respuestas"  TEXT NOT NULL DEFAULT '{}',
        "intento"     INTEGER NOT NULL DEFAULT 1,
        "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("cursoId")    REFERENCES "Curso"("id")    ON DELETE CASCADE,
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ResultadoExamen_curso_emp_idx" ON "ResultadoExamen"("cursoId","employeeId")`);
    results.push('ResultadoExamen table ✓');

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, results }, { status: 500 });
  }
}
