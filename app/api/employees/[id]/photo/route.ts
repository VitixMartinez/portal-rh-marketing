import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { writeFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "photos");
const MAX_SIZE   = 5 * 1024 * 1024; // 5 MB

// POST /api/employees/[id]/photo — upload & create approval request
export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = await context.params;

    // Permission: only admin (any employee) OR the employee themselves (own profile)
    // Managers cannot initiate changes for other employees — they can only approve/reject
    const isAdmin    = session.role === "OWNER_ADMIN";
    const isOwnProfile = session.employeeId === id;

    if (!isAdmin && !isOwnProfile) {
      return NextResponse.json(
        { error: "Solo puedes cambiar tu propia foto. Los administradores pueden cambiar cualquier foto." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file     = formData.get("photo") as File | null;

    if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "Máximo 5 MB" }, { status: 400 });

    const mime = file.type;
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
      return NextResponse.json({ error: "Solo JPG, PNG o WebP" }, { status: 400 });
    }

    // Determine extension
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";

    // Save pending file: pending_{id}_{timestamp}.{ext}
    const pendingName = `pending_${id}_${Date.now()}.${ext}`;
    const pendingPath = path.join(UPLOAD_DIR, pendingName);

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(pendingPath, buffer);

    // Fetch employee + supervisor info
    const emp = await prisma.employee.findUnique({
      where:  { id },
      select: {
        photoUrl:    true,
        firstName:   true,
        lastName:    true,
        supervisorId: true,
      },
    });

    // Delete any previous pending request for this employee (replace with newer one)
    const previousPending = await (prisma as any).solicitudCambio.findFirst({
      where: { employeeId: id, campo: "photoUrl", estado: "PENDIENTE" },
    });
    if (previousPending) {
      const oldFile = path.join(UPLOAD_DIR, previousPending.valorNuevo);
      if (existsSync(oldFile)) {
        await unlink(oldFile).catch(() => {});
      }
      await (prisma as any).solicitudCambio.delete({ where: { id: previousPending.id } });
    }

    // If admin → apply immediately, no approval needed
    if (isAdmin) {
      if (emp?.photoUrl) {
        const oldApproved = path.join(UPLOAD_DIR, emp.photoUrl);
        if (existsSync(oldApproved) && emp.photoUrl !== pendingName) {
          await unlink(oldApproved).catch(() => {});
        }
      }
      await (prisma as any).solicitudCambio.create({
        data: {
          employeeId:  id,
          campo:       "photoUrl",
          campoLabel:  "Foto de perfil",
          valorActual: emp?.photoUrl ?? null,
          valorNuevo:  pendingName,
          motivo:      "Actualización de foto de perfil",
          estado:      "APROBADA",
        },
      });
      await prisma.employee.update({
        where: { id },
        data:  { photoUrl: pendingName },
      });
      return NextResponse.json({ ok: true, applied: true, photoUrl: `/uploads/photos/${pendingName}` });
    }

    // Employee submitting own photo → goes to supervisor, or admin if no supervisor
    await (prisma as any).solicitudCambio.create({
      data: {
        employeeId:  id,
        campo:       "photoUrl",
        campoLabel:  "Foto de perfil",
        valorActual: emp?.photoUrl ?? null,
        valorNuevo:  pendingName,
        motivo:      "Actualización de foto de perfil",
        estado:      "PENDIENTE",
      },
    });

    const msg = emp?.supervisorId
      ? "Solicitud enviada a tu supervisor para aprobación."
      : "Solicitud enviada al administrador para aprobación.";

    return NextResponse.json({ ok: true, applied: false, message: msg });
  } catch (error: any) {
    console.error("[POST photo]", error);
    return NextResponse.json({ error: "Error interno: " + error.message }, { status: 500 });
  }
}

// DELETE /api/employees/[id]/photo — remove approved photo (admin only)
export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }
    const { id } = await context.params;
    const emp    = await prisma.employee.findUnique({ where: { id }, select: { photoUrl: true } });
    if (emp?.photoUrl) {
      const filePath = path.join(UPLOAD_DIR, emp.photoUrl);
      if (existsSync(filePath)) await unlink(filePath).catch(() => {});
    }
    await prisma.employee.update({ where: { id }, data: { photoUrl: null } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
