import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query     = searchParams.get("q")      ?? "";
    const status    = searchParams.get("status") ?? "";
    const companyId = session.companyId ?? "demo-company-id";

    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        ...(status && status !== "Todos" ? { status: status as any } : {}),
        ...(query ? {
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName:  { contains: query, mode: "insensitive" } },
            { jobTitle:  { contains: query, mode: "insensitive" } },
            { cedula:    { contains: query, mode: "insensitive" } },
          ],
        } : {}),
      },
      include: {
        department: { select: { id: true, name: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(employees);
  } catch (error: any) {
    console.error("[GET /api/employees]", error);
    return NextResponse.json({ error: error?.message ?? "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden registrar empleados" }, { status: 403 });
    }

    const body = await req.json();

    if (!body.firstName || !body.lastName) {
      return NextResponse.json({ error: "Nombre y apellido requeridos" }, { status: 400 });
    }

    const cId = session.companyId ?? "demo-company-id";

    // Resolve departmentName → find or create department
    let deptId: string | null = null;
    if (body.departmentName?.trim()) {
      let dept = await prisma.department.findFirst({
        where: { name: body.departmentName.trim(), companyId: cId },
      });
      if (!dept) {
        dept = await prisma.department.create({
          data: { name: body.departmentName.trim(), companyId: cId },
        });
      }
      deptId = dept.id;
    }

    const employee = await prisma.employee.create({
      data: {
        companyId:    cId,
        employeeCode: body.employeeCode ?? null,
        firstName:    body.firstName,
        lastName:     body.lastName,
        cedula:       body.cedula       ?? null,
        phone:        body.phone        ?? null,
        email:        body.email        ?? null,
        address:           body.address           ?? null,
        gender:            body.gender            ?? null,
        nationality:       body.nationality        ?? null,
        maritalStatus:     body.maritalStatus      ?? null,
        emergencyName:     body.emergencyName      ?? null,
        emergencyPhone:    body.emergencyPhone     ?? null,
        emergencyRelation: body.emergencyRelation  ?? null,
        jobTitle:          body.jobTitle           ?? null,
        status:       body.status       ?? "ACTIVO",
        contractType: body.contractType ?? "INDEFINIDO",
        salary:       body.salary       ? parseFloat(body.salary) : null,
        payPeriod:    body.payPeriod    ?? "MENSUAL",
        bankName:     body.bankName     || null,
        bankAccount:  body.bankAccount  || null,
        tssNumber:    body.tssNumber    || null,
        afp:          body.afp          || null,
        ars:          body.ars          || null,
        departmentId: deptId,
        supervisorId: body.supervisorId || null,
        hireDate:     body.hireDate     ? new Date(body.hireDate)     : null,
        birthDate:    body.birthDate    ? new Date(body.birthDate)    : null,
        contractEnd:  body.contractEnd  ? new Date(body.contractEnd)  : null,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error("[POST /api/employees]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
