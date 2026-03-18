/**
 * Script para crear un nuevo cliente (empresa) en PortalRH.
 *
 * Uso desde el servidor de producción:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/setup-client.ts
 *
 * O simplemente llama al endpoint:
 *   POST https://portal-hr.com/api/setup-client
 *   { "secret": "portalrh-setup-2026", "companyName": "KM Destinos",
 *     "subdomain": "kmdestinos", "adminEmail": "vitix@me.com",
 *     "adminPassword": "Katherine11", "adminName": "Vitix Martinez" }
 */

import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes, randomUUID } from "crypto";

const CLIENT_NAME      = "KM Destinos";
const CLIENT_SUBDOMAIN = "kmdestinos";
const ADMIN_EMAIL      = "vitix@me.com";
const ADMIN_PASSWORD   = "Katherine11";
const ADMIN_NAME       = "Vitix Martinez";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Configurando cliente:", CLIENT_NAME);
  console.log("   Subdominio: " + CLIENT_SUBDOMAIN + ".portal-hr.com\n");

  // Use raw SQL since Prisma client types may not include new columns yet
  type CompanyRow = { id: string };

  const existing = await prisma.$queryRawUnsafe<CompanyRow[]>(
    `SELECT "id" FROM "Company" WHERE "subdomain" = $1 LIMIT 1`,
    CLIENT_SUBDOMAIN,
  );

  let companyId: string;

  if (existing.length) {
    companyId = existing[0].id;
    console.log("⚠️  La empresa ya existe:", companyId);
  } else {
    companyId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Company"("id","name","subdomain","createdAt","updatedAt")
       VALUES ($1,$2,$3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      companyId, CLIENT_NAME, CLIENT_SUBDOMAIN,
    );
    console.log("✅ Empresa creada:", companyId);
  }

  type UserRow = { id: string };
  const existingUser = await prisma.$queryRawUnsafe<UserRow[]>(
    `SELECT "id" FROM "User" WHERE "email" = $1 AND "companyId" = $2 LIMIT 1`,
    ADMIN_EMAIL, companyId,
  );

  if (existingUser.length) {
    console.log("⚠️  El usuario ya existe:", existingUser[0].id);
  } else {
    const userId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "User"("id","name","email","password","role","companyId","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,'OWNER_ADMIN',$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      userId, ADMIN_NAME, ADMIN_EMAIL, hashPassword(ADMIN_PASSWORD), companyId,
    );
    console.log("✅ Usuario admin creado:", userId);
  }

  console.log("\n─────────────────────────────────────────");
  console.log("✅ Cliente listo\n");
  console.log("  URL:         https://" + CLIENT_SUBDOMAIN + ".portal-hr.com");
  console.log("  Email:       " + ADMIN_EMAIL);
  console.log("  Contraseña:  " + ADMIN_PASSWORD);
  console.log("  CompanyId:   " + companyId);
  console.log("─────────────────────────────────────────\n");
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
