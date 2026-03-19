/**
 * Script para crear el usuario administrador inicial.
 * Uso:  npx tsx scripts/create-admin.ts
 *
 * Cambia las variables EMAIL y PASSWORD antes de ejecutar.
 */
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const EMAIL    = "admin@empresa.com";   // ← cambia esto
const PASSWORD = "Admin123";            // ← cambia esto (mínimo 6 caracteres)
const NAME     = "Administrador";       // ← cambia esto
const COMPANY  = "demo-company-id";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const prisma = new PrismaClient();

async function main() {
  // Verificar si ya existe
  const existing = await prisma.user.findFirst({ where: { email: EMAIL } });
  if (existing) {
    console.log(`⚠️  Ya existe un usuario con email: ${EMAIL}`);
    console.log("   Puedes cambiar el EMAIL en este script para crear otro.");
    return;
  }

  const user = await prisma.user.create({
    data: {
      id:        `user-admin-${Date.now()}`,
      name:      NAME,
      email:     EMAIL,
      password:  hashPassword(PASSWORD),
      role:      "OWNER_ADMIN",
      companyId: COMPANY,
    },
  });

  console.log("✅ Usuario administrador creado exitosamente:");
  console.log(`   Nombre:      ${user.name}`);
  console.log(`   Email:       ${user.email}`);
  console.log(`   Contraseña:  ${PASSWORD}`);
  console.log(`   Rol:         ${user.role}`);
  console.log("");
  console.log("🔐 Guarda estas credenciales en un lugar seguro.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
