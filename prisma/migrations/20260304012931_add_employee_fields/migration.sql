-- CreateEnum
CREATE TYPE "NominaEstado" AS ENUM ('BORRADOR', 'APROBADA', 'PAGADA');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "emergencyName" TEXT,
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "emergencyRelation" TEXT,
ADD COLUMN     "maritalStatus" TEXT,
ADD COLUMN     "nationality" TEXT DEFAULT 'Dominicana';

-- CreateTable
CREATE TABLE "Nomina" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "estado" "NominaEstado" NOT NULL DEFAULT 'BORRADOR',
    "fechaPago" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nomina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NominaItem" (
    "id" TEXT NOT NULL,
    "nominaId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "salarioBruto" DECIMAL(12,2) NOT NULL,
    "otrosIngresos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "afpEmpleado" DECIMAL(12,2) NOT NULL,
    "sfsEmpleado" DECIMAL(12,2) NOT NULL,
    "isr" DECIMAL(12,2) NOT NULL,
    "afpPatronal" DECIMAL(12,2) NOT NULL,
    "sfsPatronal" DECIMAL(12,2) NOT NULL,
    "srl" DECIMAL(12,2) NOT NULL,
    "otrosDescuentos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "salarioNeto" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NominaItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Nomina" ADD CONSTRAINT "Nomina_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NominaItem" ADD CONSTRAINT "NominaItem_nominaId_fkey" FOREIGN KEY ("nominaId") REFERENCES "Nomina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NominaItem" ADD CONSTRAINT "NominaItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
