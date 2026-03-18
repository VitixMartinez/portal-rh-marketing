/*
  Warnings:

  - You are about to drop the column `active` on the `Employee` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVO', 'INACTIVO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('INDEFINIDO', 'TEMPORAL', 'POR_OBRA', 'PRUEBA');

-- CreateEnum
CREATE TYPE "AFP" AS ENUM ('SIEMBRA', 'POPULAR', 'RESERVAS', 'CRECER', 'FUTURO', 'PROFUTURO');

-- CreateEnum
CREATE TYPE "ARS" AS ENUM ('ARS_HUMANO', 'ARS_SENASA', 'ARS_RESERVAS', 'ARS_MAPFRE', 'ARS_UNIVERSAL', 'ARS_PRIMERA', 'ARS_METASALUD', 'OTRO');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "rnc" TEXT;

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "active",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "afp" "AFP",
ADD COLUMN     "ars" "ARS",
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "cedula" TEXT,
ADD COLUMN     "contractEnd" TIMESTAMP(3),
ADD COLUMN     "contractType" "ContractType" NOT NULL DEFAULT 'INDEFINIDO',
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "payPeriod" TEXT DEFAULT 'MENSUAL',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "salary" DECIMAL(12,2),
ADD COLUMN     "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVO',
ADD COLUMN     "supervisorId" TEXT,
ADD COLUMN     "tssNumber" TEXT;

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
