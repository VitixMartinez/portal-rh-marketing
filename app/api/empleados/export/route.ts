import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const CONTRACT_LABELS: Record<string, string> = {
  INDEFINIDO: "Indefinido",
  TEMPORAL:   "Temporal",
  POR_OBRA:   "Por Obra",
  PRUEBA:     "Prueba",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVO:     "Activo",
  INACTIVO:   "Inactivo",
  SUSPENDIDO: "Suspendido",
};

const DEPT_LABELS: Record<string, string> = {
  GERENCIA:      "Gerencia",
  RRHH:          "Recursos Humanos",
  FINANZAS:      "Finanzas",
  VENTAS:        "Ventas",
  MARKETING:     "Marketing",
  OPERACIONES:   "Operaciones",
  TI:            "Tecnología",
  LEGAL:         "Legal",
  ADMINISTRACION:"Administración",
  PRODUCCION:    "Producción",
  LOGISTICA:     "Logística",
  OTRO:          "Otro",
};

function formatDate(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("es-DO");
}

function calcAntiguedad(hireDate: Date | null | undefined): string {
  if (!hireDate) return "";
  const years = (Date.now() - new Date(hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  const y = Math.floor(years);
  const m = Math.floor((years - y) * 12);
  if (y === 0) return `${m} mes${m !== 1 ? "es" : ""}`;
  return `${y} año${y !== 1 ? "s" : ""}${m > 0 ? ` ${m} mes${m !== 1 ? "es" : ""}` : ""}`;
}

// Escape CSV value
function csv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden exportar empleados" }, { status: 403 });
    }

    const companyId = session.companyId ?? "demo-company-id";
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // optional filter

    const whereClause: Record<string, unknown> = { companyId };
    if (status) whereClause.status = status;

    const empleados = await prisma.employee.findMany({
      where: whereClause,
      orderBy: [
        { hireDate: "asc" },   // Ordenado por fecha de contratación
        { lastName: "asc" },
      ],
      select: {
        firstName:    true,
        lastName:     true,
        email:        true,
        phone:        true,
        cedula:       true,
        nss:          true,
        birthDate:    true,
        gender:       true,
        department:   true,
        jobTitle:     true,
        salary:       true,
        status:       true,
        contractType: true,
        hireDate:     true,
        address:      true,
        city:         true,
      },
    });

    // Encabezados
    const headers = [
      "Apellidos",
      "Nombres",
      "Cédula",
      "Email",
      "Teléfono",
      "Fecha Nacimiento",
      "Género",
      "Cargo",
      "Departamento",
      "Fecha Ingreso",
      "Antigüedad",
      "Tipo Contrato",
      "Salario",
      "Estado",
      "NSS",
      "Dirección",
      "Ciudad",
    ].map(csv).join(",");

    const rows = empleados.map((e) => [
      csv(e.lastName),
      csv(e.firstName),
      csv(e.cedula),
      csv(e.email),
      csv(e.phone),
      csv(formatDate(e.birthDate)),
      csv(e.gender === "M" ? "Masculino" : e.gender === "F" ? "Femenino" : e.gender ?? ""),
      csv(e.jobTitle),
      csv(DEPT_LABELS[e.department ?? ""] ?? e.department ?? ""),
      csv(formatDate(e.hireDate)),
      csv(calcAntiguedad(e.hireDate)),
      csv(CONTRACT_LABELS[e.contractType ?? ""] ?? e.contractType ?? ""),
      csv(e.salary ? Number(e.salary).toFixed(2) : ""),
      csv(STATUS_LABELS[e.status ?? ""] ?? e.status ?? ""),
      csv(e.nss),
      csv(e.address),
      csv(e.city),
    ].join(","));

    // BOM para que Excel abra UTF-8 correctamente en Windows/Mac
    const BOM = "\uFEFF";
    const csvContent = BOM + [headers, ...rows].join("\n");

    const fileName = `empleados_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al exportar empleados" }, { status: 500 });
  }
}
