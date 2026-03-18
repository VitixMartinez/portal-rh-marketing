import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isAdmin } from "@/lib/auth";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "photos");

// PATCH /api/solicitudes-cambio/[id] — admin approves or rejects
export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session.role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await context.params;
    const body   = await req.json();
    const { estado, notasAdmin } = body; // estado: APROBADA | RECHAZADA

    if (!["APROBADA", "RECHAZADA"].includes(estado)) {
      return NextResponse.json({ error: "estado debe ser APROBADA o RECHAZADA" }, { status: 400 });
    }

    // Load the solicitud
    const solicitud = await (prisma as any).solicitudCambio.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!solicitud) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    // Apply change to Employee if approved
    if (estado === "APROBADA") {
      if (solicitud.campo === "photoUrl") {
        // Photo approval: apply filename, remove old photo file
        const emp = await prisma.employee.findUnique({
          where: { id: solicitud.employeeId },
          select: { photoUrl: true },
        });
        if (emp?.photoUrl && emp.photoUrl !== solicitud.valorNuevo) {
          const oldPath = path.join(UPLOAD_DIR, emp.photoUrl);
          if (existsSync(oldPath)) await unlink(oldPath).catch(() => {});
        }
        await prisma.employee.update({
          where: { id: solicitud.employeeId },
          data:  { photoUrl: solicitud.valorNuevo },
        });
      } else {
        const campoMap: Record<string, string> = {
          telefono:          "phone",
          email:             "email",
          direccion:         "address",
          nombreEmergencia:  "emergencyName",
          telefonoEmergencia:"emergencyPhone",
          relacionEmergencia:"emergencyRelation",
          numeroCuenta:      "bankAccount",
          banco:             "bankName",
        };
        const prismaField = campoMap[solicitud.campo] ?? solicitud.campo;
        await prisma.employee.update({
          where: { id: solicitud.employeeId },
          data:  { [prismaField]: solicitud.valorNuevo },
        });
      }
    } else if (estado === "RECHAZADA" && solicitud.campo === "photoUrl") {
      // Delete the pending file on rejection
      const pendingPath = path.join(UPLOAD_DIR, solicitud.valorNuevo);
      if (existsSync(pendingPath)) await unlink(pendingPath).catch(() => {});
    }

    const updated = await (prisma as any).solicitudCambio.update({
      where: { id },
      data: {
        estado,
        notasAdmin:  notasAdmin ?? null,
        aprobadoPor: session.userId,
        updatedAt:   new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[SOLICITUDES PATCH]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE — employee cancels a pending request
export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = await context.params;

    const solicitud = await (prisma as any).solicitudCambio.findUnique({ where: { id } });
    if (!solicitud) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    // Employee can only cancel their own pending requests
    if (session.role === "EMPLOYEE") {
      if (solicitud.employeeId !== session.employeeId || solicitud.estado !== "PENDIENTE") {
        return NextResponse.json({ error: "No permitido" }, { status: 403 });
      }
    }

    await (prisma as any).solicitudCambio.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[SOLICITUDES DELETE]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
