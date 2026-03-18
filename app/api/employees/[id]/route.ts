import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ── helper: can this user see/edit this employee? ────────────────────────────
async function canAccess(
  session: Awaited<ReturnType<typeof getSession>>,
  employeeId: string,
  requireEdit = false
): Promise<{ allowed: boolean; isDirectReport: boolean }> {
  if (!session) return { allowed: false, isDirectReport: false };
  if (session.role === "OWNER_ADMIN") return { allowed: true, isDirectReport: true };

  if (session.role === "MANAGER") {
    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { supervisorId: true, companyId: true },
    });
    const isDirectReport =
      !!emp && emp.companyId === session.companyId && emp.supervisorId === session.employeeId;
    if (requireEdit) return { allowed: isDirectReport, isDirectReport };
    return { allowed: !!emp && emp.companyId === session.companyId, isDirectReport };
  }

  // EMPLOYEE: only themselves
  const isSelf = session.employeeId === employeeId;
  return { allowed: isSelf, isDirectReport: isSelf };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await context.params;

    const { allowed, isDirectReport } = await canAccess(session, id, false);
    if (!allowed) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        supervisor: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!employee) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    if (session?.role === "MANAGER" && !isDirectReport) {
      const { salary, bankAccount, bankName, tssNumber, afp, ars, ...safe } = employee as any;
      return NextResponse.json({ ...safe, salary: null, bankAccount: null, bankName: null, tssNumber: null, afp: null, ars: null });
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("[GET employee]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await context.params;

    const { allowed } = await canAccess(session, id, true);
    if (!allowed) return NextResponse.json({ error: "No autorizado para editar este empleado" }, { status: 403 });

    const body = await req.json();

    // Resolve departmentName → find or create department
    const companyId = session?.companyId ?? "demo-company-id";
    let deptId: string | null | undefined = undefined;
    if (body.departmentName !== undefined) {
      if (body.departmentName?.trim()) {
        let dept = await prisma.department.findFirst({
          where: { name: body.departmentName.trim(), companyId },
        });
        if (!dept) {
          dept = await prisma.department.create({
            data: { name: body.departmentName.trim(), companyId },
          });
        }
        deptId = dept.id;
      } else {
        deptId = null;
      }
    }

    const isManager = session?.role === "MANAGER";
    const employee  = await prisma.employee.update({
      where: { id },
      data: {
        firstName:         body.firstName         ?? undefined,
        lastName:          body.lastName          ?? undefined,
        cedula:            body.cedula            ?? undefined,
        phone:             body.phone             ?? undefined,
        email:             body.email             ?? undefined,
        address:           body.address           ?? undefined,
        gender:            body.gender            ?? undefined,
        nationality:       body.nationality       ?? undefined,
        maritalStatus:     body.maritalStatus     ?? undefined,
        birthDate:         body.birthDate         ? new Date(body.birthDate) : undefined,
        emergencyName:     body.emergencyName     ?? undefined,
        emergencyPhone:    body.emergencyPhone    ?? undefined,
        emergencyRelation: body.emergencyRelation ?? undefined,
        jobTitle:          body.jobTitle          ?? undefined,
        status:            body.status            ?? undefined,
        contractType:      body.contractType      ?? undefined,
        hireDate:          body.hireDate          ? new Date(body.hireDate) : undefined,
        departmentId:      deptId,
        supervisorId:      body.supervisorId      || null,
        ...(!isManager && {
          salary:      body.salary      ? parseFloat(body.salary) : undefined,
          payPeriod:   body.payPeriod   ?? undefined,
          bankName:    body.bankName    ?? undefined,
          bankAccount: body.bankAccount ?? undefined,
          tssNumber:   body.tssNumber   ?? undefined,
          afp:         body.afp         || null,
          ars:         body.ars         || null,
        }),
      },
    });
    return NextResponse.json(employee);
  } catch (error) {
    console.error("[PATCH employee]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER_ADMIN") {
      return NextResponse.json({ error: "Solo el administrador puede eliminar empleados" }, { status: 403 });
    }
    const { id } = await context.params;
    await prisma.employee.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
