-- Add password and employeeId to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password"   TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;

-- Unique constraint on User.employeeId
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_key" UNIQUE ("employeeId");

-- Foreign key User → Employee
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Enum: SolicitudCambioEstado
CREATE TYPE "SolicitudCambioEstado" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- Table: SolicitudCambio
CREATE TABLE "SolicitudCambio" (
    "id"           TEXT NOT NULL,
    "employeeId"   TEXT NOT NULL,
    "campo"        TEXT NOT NULL,
    "campoLabel"   TEXT NOT NULL,
    "valorActual"  TEXT,
    "valorNuevo"   TEXT NOT NULL,
    "estado"       "SolicitudCambioEstado" NOT NULL DEFAULT 'PENDIENTE',
    "motivo"       TEXT,
    "notasAdmin"   TEXT,
    "aprobadoPor"  TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudCambio_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SolicitudCambio" ADD CONSTRAINT "SolicitudCambio_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
