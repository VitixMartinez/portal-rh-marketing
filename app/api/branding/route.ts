import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Returns the branding (name, logo, color) for the current subdomain.
// Called by the login page on load.
export async function GET(req: NextRequest) {
  try {
    const host = req.headers.get("host") ?? "";
    const hostname = host.split(":")[0];

    let subdomain: string | null = null;
    if (hostname.endsWith(".portal-hr.com")) {
      const sub = hostname.slice(0, hostname.length - ".portal-hr.com".length);
      if (sub && sub !== "www") subdomain = sub;
    }

    if (!subdomain) {
      return NextResponse.json({ branding: null });
    }

    type BrandingRow = {
      name: string;
      brandName: string | null;
      logoUrl: string | null;
      primaryColor: string | null;
      settings: Record<string, unknown> | null;
    };

    const rows = await prisma.$queryRawUnsafe<BrandingRow[]>(
      `SELECT "name","brandName","logoUrl","primaryColor","settings"
       FROM "Company" WHERE "subdomain" = $1 LIMIT 1`,
      subdomain
    );

    if (!rows.length) {
      return NextResponse.json({ branding: null });
    }

    const settings = (rows[0].settings ?? {}) as Record<string, unknown>;

    return NextResponse.json({
      branding: {
        name: rows[0].name,
        brandName: rows[0].brandName,
        logoUrl: rows[0].logoUrl,
        primaryColor: rows[0].primaryColor ?? "#2563eb",
        tagline: (settings.tagline as string) ?? null,
      },
    });
  } catch {
    return NextResponse.json({ branding: null });
  }
}
