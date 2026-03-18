import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

/* ─── POST — registrar terminación ──────────────────────────────────────────
   Admin  → estado = APROBADA, employee.status → INACTIVO inmediatamente
   Manager → estado = PENDIENTE, notificación al admin (via table)
   ────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const isAdmin   = session.role === "OWNER_ADMIN";
    const isManager = session.role === "MANAGER";

    if (!isAdmin && !isManager) {
      return NextResponse.json({ error: "Sin permisos para registrar terminaciones" }, { status: 403 });
    }

    const formData = await req.formData();

    const employeeId            = formData.get("employeeId")            as string;
    const razonPrimaria         = formData.get("razonPrimaria")         as string;
    const fechaTerminacionRaw   = formData.get("fechaTerminacion")      as string;
    const ultimoDiaTrabajoRaw   = formData.get("ultimoDiaTrabajo")      as string | null;
    const pagoHastaRaw          = formData.get("pagoHasta")             as string | null;
    const fechaRenunciaRaw      = formData.get("fechaRenuncia")         as string | null;
    const elegibleStr           = formData.get("elegibleRecontratacion") as string;
    const comentarios           = formData.get("comentarios")           as string | null;

    if (!employeeId || !razonPrimaria || !fechaTerminacionRaw) {
      return NextResponse.json({ error: "Faltan campos requeridos (employeeId, razonPrimaria, fechaTerminacion)" }, { status: 400 });
    }

    // Verify employee belongs to this company
    const companyId = session.companyId ?? "demo-company-id";
    const emp = await prisma.employee.findUnique({
      where:  { id: employeeId },
      select: { companyId: true, supervisorId: true },
    });

    if (!emp || emp.companyId !== companyId) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    // Manager must be the direct supervisor
    if (isManager && emp.supervisorId !== session.employeeId) {
      return NextResponse.json({ error: "Solo el supervisor directo puede iniciar una terminación" }, { status: 403 });
    }

    // ── Save uploaded files ─────────────────────────────────────────────────
    const adjuntos: string[] = [];
    const files = formData.getAll("adjuntos") as File[];

    if (files.length > 0) {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "terminaciones");
      await mkdir(uploadDir, { recursive: true });

      for (const file of files) {
        if (file.size > 0) {
          const ext      = (file.name.split(".").pop() ?? "bin").toLowerCase();
          const filename = `${randomUUID()}.${ext}`;
          const bytes    = await file.arrayBuffer();
          await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));
          adjuntos.push(`/uploads/terminaciones/${filename}`);
        }
      }
    }

    // ── Insert Terminacion record ────────────────────────────────────────────
    const estado         = isAdmin ? "APROBADA" : "PENDIENTE";
    const terminacionId  = randomUUID();
    const fechaTerminacion  = new Date(fechaTerminacionRaw);
    const ultimoDiaTrabajo  = ultimoDiaTrabajoRaw  ? new Date(ultimoDiaTrabajoRaw)  : null;
    const pagoHasta         = pagoHastaRaw         ? new Date(pagoHastaRaw)         : null;
    const fechaRenuncia     = fechaRenunciaRaw     ? new Date(fechaRenunciaRaw)     : null;
    const elegible          = elegibleStr !== "false";

    await prisma.$executeRawUnsafe(
      `INSERT INTO "Terminacion" (
         "id","companyId","employeeId","razonPrimaria",
         "fechaTerminacion","ultimoDiaTrabajo","pagoHasta","fechaRenuncia",
         "elegibleRecontratacion","estado","solicitadoPorId",
         "comentarios","adjuntos","createdAt","updatedAt"
       ) VALUES (
         $1,$2,$3,$4,
         $5,$6,$7,$8,
         $9,$10,$11,
         $12,$13,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
       )`,
      terminacionId,
      companyId,
      employeeId,
      razonPrimaria,
      fechaTerminacion,
      ultimoDiaTrabajo,
      pagoHasta,
      fechaRenuncia,
      elegible,
      estado,
      session.employeeId ?? null,
      comentarios ?? null,
      JSON.stringify(adjuntos),
    );

    // ── If admin: mark employee INACTIVO immediately ──────────────────────
    if (isAdmin) {
      await prisma.employee.update({
        where: { id: employeeId },
        data:  { status: "INACTIVO" },
      });
    }

    return NextResponse.json({ id: terminacionId, estado }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/terminaciones]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/* ─── GET — listar terminaciones (admin) ─────────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden ver terminaciones" }, { status: 403 });
    }

    const companyId    = session.companyId ?? "demo-company-id";
    const { searchParams } = new URL(req.url);
    const employeeId   = searchParams.get("employeeId");
    const estadoFilter = searchParams.get("estado");

    let query  = `
      SELECT
        t.*,
        e."firstName" || ' ' || e."lastName" AS "empleadoNombre",
        e."jobTitle"                          AS "empleadoPuesto",
        sol."firstName" || ' ' || sol."lastName" AS "solicitadoPorNombre"
      FROM "Terminacion" t
      LEFT JOIN "Employee" e   ON t."employeeId"     = e."id"
      LEFT JOIN "Employee" sol ON t."solicitadoPorId" = sol."id"
      WHERE t."companyId" = $1
    `;
    const params: unknown[] = [companyId];
    let idx = 2;

    if (employeeId) {
      query += ` AND t."employeeId" = $${idx++}`;
      params.push(employeeId);
    }
    if (estadoFilter) {
      query += ` AND t."estado" = $${idx++}`;
      params.push(estadoFilter);
    }
    query += ` ORDER BY t."createdAt" DESC`;

    const terminaciones = await prisma.$queryRawUnsafe(query, ...params);
    return NextResponse.json({ terminaciones });
  } catch (error) {
    console.error("[GET /api/terminaciones]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
