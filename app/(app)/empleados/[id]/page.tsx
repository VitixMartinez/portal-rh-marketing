import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import EmpleadoPerfilClient from "@/components/EmpleadoPerfilClient";

export default async function EmpleadoPerfilPage({ params }: { params: { id: string } }) {
  const { id } = await (params as any);
  const session = await getSession();

  const emp = await prisma.employee.findUnique({
    where: { id },
    include: {
      department:      true,
      supervisor:      { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
      subordinates:    { select: { id: true, firstName: true, lastName: true, jobTitle: true, status: true } },
      reconocimientos: { orderBy: { fecha: "desc" }, take: 15 },
      solicitudes:     { orderBy: { createdAt: "desc" }, take: 20 },
      company:         { select: { name: true } },
    },
  });

  if (!emp) notFound();

  // Portal account for this employee (if any)
  const userAccount = await (prisma as any).user.findFirst({
    where: { employeeId: id },
    select: { id: true, email: true, role: true },
  });

  // Serialize all dates + Decimal fields (server → client boundary)
  const empSerialized = {
    id:                emp.id,
    firstName:         emp.firstName,
    lastName:          emp.lastName,
    jobTitle:          emp.jobTitle,
    employeeCode:      emp.employeeCode,
    cedula:            emp.cedula,
    phone:             emp.phone,
    email:             emp.email,
    address:           emp.address,
    city:              (emp as any).city ?? null,
    gender:            emp.gender,
    nationality:       emp.nationality,
    maritalStatus:     emp.maritalStatus,
    emergencyName:     emp.emergencyName,
    emergencyPhone:    emp.emergencyPhone,
    emergencyRelation: emp.emergencyRelation,
    status:            emp.status,
    contractType:      emp.contractType,
    salary:            emp.salary ? Number(emp.salary) : null,
    payPeriod:         emp.payPeriod,
    bankName:          emp.bankName,
    bankAccount:       emp.bankAccount,
    tssNumber:         emp.tssNumber,
    afp:               emp.afp,
    ars:               emp.ars,
    hireDate:          emp.hireDate?.toISOString()    ?? null,
    birthDate:         emp.birthDate?.toISOString()   ?? null,
    contractEnd:       emp.contractEnd?.toISOString() ?? null,
    photoUrl:          (emp as any).photoUrl           ?? null,
    supervisorId:      emp.supervisorId,
    department:        emp.department
      ? { id: emp.department.id, name: emp.department.name }
      : null,
    supervisor:        emp.supervisor
      ? { id: emp.supervisor.id, firstName: emp.supervisor.firstName, lastName: emp.supervisor.lastName, jobTitle: emp.supervisor.jobTitle }
      : null,
    subordinates:      emp.subordinates.map(s => ({
      id: s.id, firstName: s.firstName, lastName: s.lastName, jobTitle: s.jobTitle, status: s.status,
    })),
    reconocimientos:   emp.reconocimientos.map(r => ({
      id: r.id, titulo: r.titulo, tipo: r.tipo,
      descripcion: r.descripcion, otorgadoPor: r.otorgadoPor,
      fecha: r.fecha.toISOString(),
    })),
    solicitudes:       emp.solicitudes.map(s => ({
      id: s.id, tipo: s.tipo, estado: s.estado,
      fechaInicio: s.fechaInicio.toISOString(),
      fechaFin:    s.fechaFin.toISOString(),
      dias:        s.dias,
      motivo:      s.motivo,
    })),
  };

  return (
    <EmpleadoPerfilClient
      emp={empSerialized}
      userRole={session?.role ?? null}
      isOwnProfile={session?.employeeId === emp.id}
      currentUserEmployeeId={session?.employeeId ?? null}
      userAccount={userAccount}
      companyName={(emp as any).company?.name ?? "Portal RH"}
    />
  );
}
