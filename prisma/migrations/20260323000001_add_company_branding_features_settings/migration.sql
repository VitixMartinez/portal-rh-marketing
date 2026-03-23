-- Add branding fields (brandName, primaryColor) and config fields (features, settings) to Company
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "brandName"    TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "features"     JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "settings"     JSONB NOT NULL DEFAULT '{}';
