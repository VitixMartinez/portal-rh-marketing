import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Allow both authenticated users and public applicants (no session required for apply forms)
  const session = await getSession();

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const context = (form.get("context") as string) ?? "general"; // "apply" | "doc" | "general"

  if (!file) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }

  // Validate size: max 10 MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "El archivo no puede superar 10 MB" }, { status: 400 });
  }

  // Validate extension
  const ALLOWED_EXT = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".webp"];
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return NextResponse.json({ error: `Tipo de archivo no permitido (${ext})` }, { status: 400 });
  }

  const companyId = session?.companyId ?? "public";
  const uploadDir = path.join(process.cwd(), "public", "uploads", companyId, context);
  await mkdir(uploadDir, { recursive: true });

  const uniqueName = `${randomUUID()}${ext}`;
  const filePath   = path.join(uploadDir, uniqueName);
  const buffer     = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const url = `/uploads/${companyId}/${context}/${uniqueName}`;
  return NextResponse.json({ url, nombre: file.name, tamano: file.size });
}
