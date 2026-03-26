import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const hostname = host.split(":")[0];

  let name = "Portal RH";
  let shortName = "Portal RH";
  let themeColor = "#0f172a";
  let backgroundColor = "#0f172a";

  // Try to get branding from subdomain
  if (hostname.endsWith(".portal-hr.com")) {
    const sub = hostname.slice(0, hostname.length - ".portal-hr.com".length);
    if (sub && sub !== "www") {
      try {
        type Row = { name: string; brandName: string | null; primaryColor: string | null };
        const rows = await prisma.$queryRawUnsafe<Row[]>(
          `SELECT "name","brandName","primaryColor" FROM "Company" WHERE "subdomain" = $1 LIMIT 1`,
          sub
        );
        if (rows[0]) {
          const displayName = rows[0].brandName ?? rows[0].name;
          name = displayName;
          shortName = displayName.length > 12 ? displayName.split(" ")[0] : displayName;
          if (rows[0].primaryColor) {
            themeColor = rows[0].primaryColor;
            backgroundColor = rows[0].primaryColor;
          }
        }
      } catch { /* use defaults */ }
    }
  }

  const manifest = {
    name,
    short_name: shortName,
    description: "Sistema de gestión de Recursos Humanos",
    start_url: "/login",
    display: "standalone",
    orientation: "portrait",
    theme_color: themeColor,
    background_color: backgroundColor,
    scope: "/",
    icons: [
      { src: "/icons/icon-72x72.png",   sizes: "72x72",   type: "image/png" },
      { src: "/icons/icon-96x96.png",   sizes: "96x96",   type: "image/png" },
      { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
      { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
      { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "Ver el dashboard principal",
        url: "/dashboard",
        icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }],
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
