import bcrypt from 'bcrypt';
import prisma from '../config/prisma';
import { employeeRepository } from '../repositories/employee.repository';
import { EmployeeInput } from '../schemas/admin/employee.schemas';

export const employeeService = {
  listEmployees: () => employeeRepository.listEmployees(),
  async saveEmployee(input: EmployeeInput) {
    const data = {
      name: input.name,
      phone: normalizeOptionalString(input.phone),
      commissionRate: input.commissionRate,
      status: input.status.toUpperCase() as 'ACTIVE' | 'INACTIVE',
      notes: input.notes || '',
    };

    const employee = input.id
      ? await employeeRepository.updateEmployee(input.id, data)
      : await employeeRepository.createEmployee(data);

    // If an email is provided, create or sync their login AdminAccount with STAFF role
    const normalizedEmail = normalizeOptionalString(input.email)?.toLowerCase();
    if (normalizedEmail) {
      const existingAccount = await prisma.adminAccount.findUnique({
        where: { email: normalizedEmail },
      });

      const isActive = input.status === 'active';

      if (existingAccount) {
        const updateData: {
          name: string;
          phone?: string | null;
          isActive: boolean;
          passwordHash?: string;
        } = {
          name: input.name,
          phone: normalizeOptionalString(input.phone),
          isActive,
        };

        if (input.password && input.password.trim().length >= 6) {
          updateData.passwordHash = await bcrypt.hash(input.password.trim(), 12);
        }

        await prisma.adminAccount.update({
          where: { id: existingAccount.id },
          data: updateData,
        });
      } else if (input.password && input.password.trim().length >= 6) {
        const passwordHash = await bcrypt.hash(input.password.trim(), 12);
        await prisma.adminAccount.create({
          data: {
            email: normalizedEmail,
            name: input.name,
            phone: normalizeOptionalString(input.phone),
            passwordHash,
            role: 'STAFF',
            isActive,
          },
        });
      }
    }

    return employee;
  },
  archiveEmployee: (id: string) => employeeRepository.archiveEmployee(id),
};

const normalizeOptionalString = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
