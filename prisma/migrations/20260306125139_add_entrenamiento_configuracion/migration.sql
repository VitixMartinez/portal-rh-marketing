-- AddEnum: CursoCategoria
CREATE TYPE "CursoCategoria" AS ENUM ('SEGURIDAD_INFO', 'SEGURIDAD_OCUP', 'POLITICAS', 'LIDERAZGO', 'TECNICO', 'COMPLIANCE', 'SOFT_SKILLS', 'INDUCCION', 'OTRO');

-- AddEnum: CursoRecurrencia
CREATE TYPE "CursoRecurrencia" AS ENUM ('UNA_VEZ', 'ANUAL', 'SEMESTRAL', 'TRIMESTRAL');

-- AddEnum: AsignacionEstado
CREATE TYPE "AsignacionEstado" AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADO', 'VENCIDO', 'EXCUSADO');

-- CreateTable: Curso
CREATE TABLE "Curso" (
    "id"          TEXT NOT NULL,
    "companyId"   TEXT NOT NULL,
    "titulo"      TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria"   "CursoCategoria"   NOT NULL DEFAULT 'OTRO',
    "modalidad"   TEXT DEFAULT 'Virtual',
    "duracionHrs" INTEGER,
    "recurrencia" "CursoRecurrencia" NOT NULL DEFAULT 'UNA_VEZ',
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "activo"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AsignacionCurso
CREATE TABLE "AsignacionCurso" (
    "id"              TEXT NOT NULL,
    "cursoId"         TEXT NOT NULL,
    "employeeId"      TEXT NOT NULL,
    "estado"          "AsignacionEstado" NOT NULL DEFAULT 'PENDIENTE',
    "fechaLimite"     TIMESTAMP(3),
    "fechaCompletado" TIMESTAMP(3),
    "notas"           TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsignacionCurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Feriado
CREATE TABLE "Feriado" (
    "id"         TEXT NOT NULL,
    "companyId"  TEXT NOT NULL,
    "nombre"     TEXT NOT NULL,
    "fecha"      TIMESTAMP(3) NOT NULL,
    "tipo"       TEXT NOT NULL DEFAULT 'NACIONAL',
    "recurrente" BOOLEAN NOT NULL DEFAULT true,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feriado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AsignacionCurso_cursoId_employeeId_key" ON "AsignacionCurso"("cursoId", "employeeId");
CREATE UNIQUE INDEX "Feriado_companyId_fecha_key" ON "Feriado"("companyId", "fecha");

-- AddForeignKey
ALTER TABLE "Curso" ADD CONSTRAINT "Curso_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AsignacionCurso" ADD CONSTRAINT "AsignacionCurso_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AsignacionCurso" ADD CONSTRAINT "AsignacionCurso_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Feriado" ADD CONSTRAINT "Feriado_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
