import prisma from '../config/prisma';

export const employeeRepository = {
  listEmployees: () =>
    prisma.employee.findMany({
      orderBy: { name: 'asc' },
    }),
  createEmployee: (data: {
    name: string;
    phone?: string | null;
    commissionRate: number;
    status: 'ACTIVE' | 'INACTIVE';
    notes: string;
  }) =>
    prisma.employee.create({
      data,
    }),
  updateEmployee: (
    id: string,
    data: {
      name: string;
      phone?: string | null;
      commissionRate: number;
      status: 'ACTIVE' | 'INACTIVE';
      notes: string;
    },
  ) =>
    prisma.employee.update({
      where: { id },
      data,
    }),
  archiveEmployee: (id: string) =>
    prisma.employee.update({
      where: { id },
      data: { status: 'INACTIVE' },
    }),
};
