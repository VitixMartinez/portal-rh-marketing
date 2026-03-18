import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Genera el periodo en formato "YYYY-MM-Q" (ej: "2026-03-2") o "YYYY-MM" para mensual
function periodoStr(year: number, month: number, quincena: 1 | 2 | null) {
  const mm = String(month).padStart(2, "0");
  return quincena ? `${year}-${mm}-${quincena}` : `${year}-${mm}`;
}

// Calcula el primer periodo de descuento a partir de una fecha de acreditación
function primerPeriodoDesde(fecha: Date, frecuencia: "QUINCENAL" | "MENSUAL"): string {
  const d = fecha.getUTCDate();
  const m = fecha.getUTCMonth() + 1; // 1-12
  const y = fecha.getUTCFullYear();

  if (frecuencia === "QUINCENAL") {
    // Si acreditado en 1ra mitad (1-15) → primera descuento: 2da quincena mismo mes
    // Si acreditado en 2da mitad (16-31) → primera descuento: 1ra quincena mes siguiente
    if (d <= 15) {
      return `${y}-${String(m).padStart(2, "0")}-2`;
    } else {
      const nextM = m === 12 ? 1 : m + 1;
      const nextY = m === 12 ? y + 1 : y;
      return `${nextY}-${String(nextM).padStart(2, "0")}-1`;
    }
  } else {
    // MENSUAL: próximo mes
    const nextM = m === 12 ? 1 : m + 1;
    const nextY = m === 12 ? y + 1 : y;
    return `${nextY}-${String(nextM).padStart(2, "0")}`;
  }
}

// Genera el cronograma de pagos a partir del periodo de inicio
function generarCronograma(
  prestamoId: string,
  cuotas: number,
  cuotaMonto: number,
  periodoInicio: string,
  frecuencia: "QUINCENAL" | "MENSUAL",
): { id: string; prestamoId: string; cuotaNum: number; periodo: string; monto: number; aplicado: boolean }[] {
  const pagos = [];

  if (frecuencia === "MENSUAL") {
    // periodoInicio = "YYYY-MM"
    const [yearS, monthS] = periodoInicio.split("-");
    let year  = parseInt(yearS);
    let month = parseInt(monthS);
    for (let i = 1; i <= cuotas; i++) {
      pagos.push({
        id:         `pago_${prestamoId}_${i}`,
        prestamoId,
        cuotaNum:   i,
        periodo:    periodoStr(year, month, null),
        monto:      cuotaMonto,
        aplicado:   false,
      });
      month++;
      if (month > 12) { month = 1; year++; }
    }
  } else {
    // QUINCENAL — periodoInicio = "YYYY-MM-Q"
    const [yearS, monthS, qS] = periodoInicio.split("-");
    let year  = parseInt(yearS);
    let month = parseInt(monthS);
    let q     = parseInt(qS) as 1 | 2;
    for (let i = 1; i <= cuotas; i++) {
      pagos.push({
        id:         `pago_${prestamoId}_${i}`,
        prestamoId,
        cuotaNum:   i,
        periodo:    periodoStr(year, month, q),
        monto:      cuotaMonto,
        aplicado:   false,
      });
      if (q === 1) {
        q = 2;
      } else {
        q = 1;
        month++;
        if (month > 12) { month = 1; year++; }
      }
    }
  }
  return pagos;
}

/* GET /api/prestamos?employeeId=...&estado=... */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const companyId  = session.companyId ?? "demo-company-id";
    const estado     = searchParams.get("estado");

    // Build dynamic WHERE
    const conditions: string[] = [`p."companyId" = $1`];
    const params: unknown[]    = [companyId];
    let idx = 2;

    if (employeeId) { conditions.push(`p."employeeId" = $${idx++}`); params.push(employeeId); }
    if (estado)     { conditions.push(`p."estado" = $${idx++}`);     params.push(estado); }

    const where = conditions.join(" AND ");

    const prestamos = await prisma.$queryRawUnsafe(`
      SELECT
        p.*,
        e."id"         AS "emp_id",
        e."firstName"  AS "emp_firstName",
        e."lastName"   AS "emp_lastName",
        e."jobTitle"   AS "emp_jobTitle",
        e."photoUrl"   AS "emp_photoUrl"
      FROM "Prestamo" p
      LEFT JOIN "Employee" e ON p."employeeId" = e."id"
      WHERE ${where}
      ORDER BY p."createdAt" DESC
    `, ...params) as any[];

    // Fetch pagos for each prestamo
    const ids = prestamos.map(pr => pr.id);
    let pagos: any[] = [];
    if (ids.length > 0) {
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
      pagos = await prisma.$queryRawUnsafe(
        `SELECT * FROM "PrestamoPago" WHERE "prestamoId" IN (${placeholders}) ORDER BY "cuotaNum" ASC`,
        ...ids,
      ) as any[];
    }

    // Shape response
    const result = prestamos.map(pr => ({
      id:                pr.id,
      companyId:         pr.companyId,
      employeeId:        pr.employeeId,
      monto:             Number(pr.monto),
      cuotas:            Number(pr.cuotas),
      cuotaMonto:        Number(pr.cuotaMonto),
      saldoPendiente:    Number(pr.saldoPendiente),
      cuotasPagadas:     Number(pr.cuotasPagadas),
      quincenaInicio:    pr.quincenaInicio,
      frecuencia:        pr.frecuencia ?? "QUINCENAL",
      fechaAcreditacion: pr.fechaAcreditacion ?? null,
      estado:            pr.estado,
      motivo:            pr.motivo,
      notas:             pr.notas,
      aprobadoPor:       pr.aprobadoPor,
      createdAt:         pr.createdAt,
      updatedAt:         pr.updatedAt,
      employee: {
        id:        pr.emp_id,
        firstName: pr.emp_firstName,
        lastName:  pr.emp_lastName,
        jobTitle:  pr.emp_jobTitle,
        photoUrl:  pr.emp_photoUrl,
      },
      pagos: pagos
        .filter(pg => pg.prestamoId === pr.id)
        .map(pg => ({ ...pg, monto: Number(pg.monto) })),
    }));

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[GET /api/prestamos]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/* POST /api/prestamos — create new loan */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden registrar préstamos" }, { status: 403 });
    }

    const body = await req.json();
    const {
      employeeId, monto, cuotas, motivo, notas,
      frecuencia: frecuenciaRaw,
      fechaAcreditacion: fechaAcreditacionRaw,
      quincenaInicio: quincenaInicioOverride,
    } = body;

    if (!employeeId || !monto || !cuotas) {
      return NextResponse.json({ error: "Faltan campos obligatorios (empleado, monto, cuotas)" }, { status: 400 });
    }

    const montoNum    = parseFloat(monto);
    const cuotasNum   = parseInt(cuotas);
    const cuotaMonto  = Math.ceil(montoNum / cuotasNum);
    const companyId   = session.companyId ?? "demo-company-id";
    const id          = `prs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const frecuencia  = (frecuenciaRaw === "MENSUAL" ? "MENSUAL" : "QUINCENAL") as "QUINCENAL" | "MENSUAL";

    // Determine the first period for deductions
    let periodoInicio: string;
    let fechaAcreditacion: Date | null = null;

    if (fechaAcreditacionRaw) {
      fechaAcreditacion = new Date(fechaAcreditacionRaw);
      periodoInicio = primerPeriodoDesde(fechaAcreditacion, frecuencia);
    } else if (quincenaInicioOverride) {
      periodoInicio = quincenaInicioOverride;
    } else {
      // Default: next period from today
      periodoInicio = primerPeriodoDesde(new Date(), frecuencia);
    }

    // For backward compat, quincenaInicio stores the first period string
    const quincenaInicio = periodoInicio;

    // Verify employee belongs to this company
    const emp = await prisma.employee.findUnique({
      where:  { id: employeeId },
      select: { companyId: true },
    });
    if (!emp || emp.companyId !== companyId) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    // Insert Prestamo
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Prestamo" (
         "id","companyId","employeeId","monto","cuotas","cuotaMonto",
         "saldoPendiente","cuotasPagadas","quincenaInicio","estado",
         "motivo","notas","aprobadoPor",
         "frecuencia","fechaAcreditacion",
         "createdAt","updatedAt"
       ) VALUES (
         $1,$2,$3,$4,$5,$6,
         $7,$8,$9,$10,
         $11,$12,$13,
         $14,$15,
         CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
       )`,
      id, companyId, employeeId, montoNum, cuotasNum, cuotaMonto,
      montoNum, 0, quincenaInicio, "ACTIVO",
      motivo ?? null, notas ?? null, session.name ?? null,
      frecuencia, fechaAcreditacion ?? null,
    );

    // Insert payment schedule
    const cronograma = generarCronograma(id, cuotasNum, cuotaMonto, quincenaInicio, frecuencia);
    for (const pago of cronograma) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "PrestamoPago" ("id","prestamoId","cuotaNum","periodo","monto","aplicado","createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)`,
        pago.id, pago.prestamoId, pago.cuotaNum, pago.periodo, pago.monto, pago.aplicado,
      );
    }

    // Return the created prestamo with schedule
    const rows = await prisma.$queryRawUnsafe(`
      SELECT p.*, e."firstName", e."lastName", e."jobTitle"
      FROM "Prestamo" p
      LEFT JOIN "Employee" e ON p."employeeId" = e."id"
      WHERE p."id" = $1
    `, id) as any[];

    const pagosRows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "PrestamoPago" WHERE "prestamoId" = $1 ORDER BY "cuotaNum" ASC`,
      id,
    ) as any[];

    const row = rows[0];
    return NextResponse.json({
      id:                row.id,
      companyId:         row.companyId,
      employeeId:        row.employeeId,
      monto:             Number(row.monto),
      cuotas:            Number(row.cuotas),
      cuotaMonto:        Number(row.cuotaMonto),
      saldoPendiente:    Number(row.saldoPendiente),
      cuotasPagadas:     Number(row.cuotasPagadas),
      quincenaInicio:    row.quincenaInicio,
      frecuencia:        row.frecuencia ?? "QUINCENAL",
      fechaAcreditacion: row.fechaAcreditacion ?? null,
      estado:            row.estado,
      motivo:            row.motivo,
      notas:             row.notas,
      aprobadoPor:       row.aprobadoPor,
      createdAt:         row.createdAt,
      employee: { firstName: row.firstName, lastName: row.lastName, jobTitle: row.jobTitle },
      pagos: pagosRows.map(pg => ({ ...pg, monto: Number(pg.monto) })),
    }, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/prestamos]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
