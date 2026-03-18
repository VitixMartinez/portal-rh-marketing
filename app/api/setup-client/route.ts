/**
 * POST /api/setup-client
 *
 * One-time endpoint to provision a new tenant (company + admin user).
 * Protected by SETUP_SECRET env var (default: "portalrh-setup-2026").
 *
 * Body:
 *   {
 *     secret: string,
 *     companyName: string,     // e.g. "KM Destinos"
 *     subdomain: string,       // e.g. "kmdestinos"
 *     adminEmail: string,      // e.g. "vitix@me.com"
 *     adminPassword: string,
 *     adminName?: string
 *   }
 *
 * GET /api/setup-client?secret=... → runs the multi-tenant DB migration.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { randomUUID } from "crypto";

const SETUP_SECRET = process.env.SETUP_SECRET ?? "portalrh-setup-2026";

/* ─── GET — apply multi-tenant schema migration ──────────────────────────── */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== SETUP_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const done: string[] = [];

  // Add subdomain column
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "subdomain" TEXT`
  );
  done.push("Company.subdomain ✓");

  // Add logoUrl column
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT`
  );
  done.push("Company.logoUrl ✓");

  // Unique index on subdomain (partial, skips NULLs)
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Company_subdomain_key"
    ON "Company"("subdomain") WHERE "subdomain" IS NOT NULL
  `);
  done.push("Company.subdomain unique index ✓");

  // Drop old global email unique on User (safe if already gone)
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_key"`
  ).catch(() => {/* noop */});
  done.push("User.email global unique dropped ✓");

  // Per-company email unique index
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "User_email_companyId_key"
    ON "User"("email", "companyId")
  `);
  done.push("User(email, companyId) unique index ✓");

  return NextResponse.json({ ok: true, migration: done });
}

/* ─── POST — create company + admin user ─────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { secret, companyName, subdomain, adminEmail, adminPassword, adminName } = body;

    if (secret !== SETUP_SECRET) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!companyName || !subdomain || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "companyName, subdomain, adminEmail y adminPassword son requeridos" },
        { status: 400 },
      );
    }

    const email = (adminEmail as string).toLowerCase().trim();
    const sub   = (subdomain as string).toLowerCase().trim();

    // 1. Find or create company
    type CompanyRow = { id: string };
    const existing = await prisma.$queryRawUnsafe<CompanyRow[]>(
      `SELECT "id" FROM "Company" WHERE "subdomain" = $1 LIMIT 1`, sub,
    );

    let companyId: string;

    if (existing.length) {
      companyId = existing[0].id;
    } else {
      companyId = randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Company"("id","name","subdomain","createdAt","updatedAt")
         VALUES ($1,$2,$3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
        companyId, companyName, sub,
      );
    }

    // 2. Find or create admin user
    type UserRow = { id: string };
    const existingUser = await prisma.$queryRawUnsafe<UserRow[]>(
      `SELECT "id" FROM "User" WHERE "email" = $1 AND "companyId" = $2 LIMIT 1`,
      email, companyId,
    );

    let userId: string;

    if (existingUser.length) {
      userId = existingUser[0].id;
    } else {
      userId = randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "User"("id","name","email","password","role","companyId","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,'OWNER_ADMIN',$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
        userId,
        adminName ?? "Administrador",
        email,
        hashPassword(adminPassword),
        companyId,
      );
    }

    return NextResponse.json({
      ok:        true,
      companyId,
      userId,
      url:       `https://${sub}.portal-hr.com`,
      message:   `Cliente "${companyName}" listo. Login: ${email}`,
    });
  } catch (error) {
    console.error("[setup-client POST]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
