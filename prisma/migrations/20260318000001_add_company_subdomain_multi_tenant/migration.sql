-- Multi-tenant: add subdomain + logoUrl to Company, make User email unique per company

-- Add subdomain column to Company (nullable, unique across all companies)
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "subdomain" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "logoUrl"   TEXT;

-- Unique index on Company.subdomain
CREATE UNIQUE INDEX IF NOT EXISTS "Company_subdomain_key" ON "Company"("subdomain")
  WHERE "subdomain" IS NOT NULL;

-- Drop old global email unique constraint on User
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_key";

-- Add new per-company email uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_companyId_key" ON "User"("email", "companyId");
