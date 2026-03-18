import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const isAdmin   = session.role === "OWNER_ADMIN";
    const isManager = session.role === "MANAGER";
    if (!isAdmin && !isManager) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Solo se permiten archivos PDF" }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "El PDF no puede superar 20 MB" }, { status: 400 });
    }

    const dir = join(process.cwd(), "public", "uploads", "comunicaciones");
    await mkdir(dir, { recursive: true });

    const filename = `${randomUUID()}.pdf`;
    const bytes = await file.arrayBuffer();
    await writeFile(join(dir, filename), Buffer.from(bytes));

    const url = `/uploads/comunicaciones/${filename}`;
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[POST /api/comunicaciones/upload-pdf]", error);
    return NextResponse.json({ error: "Error al subir archivo" }, { status: 500 });
  }
}
