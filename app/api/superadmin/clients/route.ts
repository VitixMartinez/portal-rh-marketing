import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { randomUUID } from "crypto";

const SUPERADMIN_PASSWORD = (process.env.SUPERADMIN_PASSWORD ?? "superadmin-2026").trim();
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID ?? "prj_XLoIekGQDxw6ljTYuhHqUvjGTbI4";

function checkAuth(req: NextRequest): boolean {
  const key = (req.headers.get("x-superadmin-key") ?? "").trim();
  return key === SUPERADMIN_PASSWORD;
}

async function addDomainToVercel(subdomain: string): Promise<{ ok: boolean; error?: string }> {
  if (!VERCEL_TOKEN) return { ok: false, error: "No VERCEL_TOKEN configured" };
  const domain = `${subdomain}.portal-hr.com`;
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, error: JSON.stringify(err) };
  }
  return { ok: true };
}

/* ─── GET — list all clients ──────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  type CompanyRow = {
    id: string;
    name: string;
    subdomain: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
    brandName: string | null;
    tagline: string | null;
    createdAt: Date;
  };
  type CountRow = { companyId: string; count: bigint };

  let companies: CompanyRow[];
  try {
    companies = await prisma.$queryRawUnsafe<CompanyRow[]>(
      `SELECT "id","name","subdomain","logoUrl","primaryColor","brandName","createdAt",
              COALESCE("settings"->>'tagline', NULL) as "tagline"
       FROM "Company" ORDER BY "createdAt" DESC`
    );
  } catch {
    // Fallback if settings column doesn't exist yet in production DB
    companies = await prisma.$queryRawUnsafe<CompanyRow[]>(
      `SELECT "id","name","subdomain","logoUrl","primaryColor","brandName","createdAt",
              NULL::text as "tagline"
       FROM "Company" ORDER BY "createdAt" DESC`
    );
  }

  const counts = await prisma.$queryRawUnsafe<CountRow[]>(
    `SELECT "companyId", COUNT(*) as count FROM "Employee" GROUP BY "companyId"`
  );

  const countMap: Record<string, number> = {};
  for (const c of counts) countMap[c.companyId] = Number(c.count);

  const clients = companies.map((c) => ({
    id: c.id,
    name: c.name,
    subdomain: c.subdomain,
    logoUrl: c.logoUrl,
    primaryColor: c.primaryColor,
    brandName: c.brandName,
    tagline: c.tagline ?? null,
    createdAt: c.createdAt,
    employeeCount: countMap[c.id] ?? 0,
    url: c.subdomain ? `https://${c.subdomain}.portal-hr.com` : null,
  }));

  return NextResponse.json({ ok: true, clients });
}

/* ─── POST — create new client ────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { companyName, subdomain, adminEmail, adminPassword, adminName, contactEmail, plan } = body;

  if (!companyName || !subdomain || !adminEmail || !adminPassword) {
    return NextResponse.json(
      { error: "companyName, subdomain, adminEmail y adminPassword son requeridos" },
      { status: 400 }
    );
  }

  const sub = (subdomain as string).toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
  const email = (adminEmail as string).toLowerCase().trim();

  // Check if subdomain already exists
  type Row = { id: string };
  const existing = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT "id" FROM "Company" WHERE "subdomain" = $1 LIMIT 1`, sub
  );
  if (existing.length) {
    return NextResponse.json({ error: `El subdominio "${sub}" ya existe` }, { status: 409 });
  }

  // Create company
  const companyId = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Company"("id","name","subdomain","createdAt","updatedAt")
     VALUES ($1,$2,$3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
    companyId, companyName, sub
  );

  // Create admin user
  const userId = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "User"("id","name","email","password","role","companyId","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,'OWNER_ADMIN',$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
    userId,
    adminName ?? "Administrador",
    email,
    hashPassword(adminPassword),
    companyId
  );

  // Add domain to Vercel
  const vercelResult = await addDomainToVercel(sub);

  return NextResponse.json({
    ok: true,
    companyId,
    userId,
    subdomain: sub,
    url: `https://${sub}.portal-hr.com`,
    vercelDomain: vercelResult,
    message: `Cliente "${companyName}" creado. Login: ${email}`,
  });
}
