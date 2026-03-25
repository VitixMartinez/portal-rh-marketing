CREATE TABLE "MoodEntry" (
  "id"         TEXT NOT NULL,
  "companyId"  TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "mood"       INTEGER NOT NULL,
  "nota"       TEXT,
  "fecha"      TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MoodEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MoodEntry_employeeId_fecha_key" UNIQUE ("employeeId", "fecha")
);

CREATE INDEX "MoodEntry_companyId_fecha_idx" ON "MoodEntry"("companyId", "fecha");
