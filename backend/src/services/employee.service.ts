import bcrypt from 'bcrypt';
import prisma from '../config/prisma';
import { employeeRepository } from '../repositories/employee.repository';
import { EmployeeInput } from '../schemas/admin/employee.schemas';
import { ApiError } from '../types/ApiError';

export const employeeService = {
  listEmployees: () => employeeRepository.listEmployees(),
  async saveEmployee(input: EmployeeInput, actorRole: 'ADMIN' | 'MANAGER') {
    const normalizedEmail = normalizeOptionalString(input.email)?.toLowerCase() ?? null;
    const password = normalizeOptionalString(input.password);
    if (actorRole !== 'ADMIN' && (normalizedEmail || password)) {
      throw new ApiError(403, 'Only administrators can provision or change employee login credentials');
    }
    if (!input.id && normalizedEmail && !password) {
      throw new ApiError(400, 'A password of at least 8 characters is required when creating an employee login');
    }

    const data = {
      name: input.name,
      phone: normalizeOptionalString(input.phone),
      commissionRate: input.commissionRate,
      status: input.status.toUpperCase() as 'ACTIVE' | 'INACTIVE',
      notes: input.notes || '',
    };

    const passwordHash = password ? await bcrypt.hash(password, 12) : null;

    return prisma.$transaction(async (tx) => {
      const existingEmployee = input.id
        ? await tx.employee.findUniqueOrThrow({
            where: { id: input.id },
            include: { loginAccount: true },
          })
        : null;

      if (actorRole !== 'ADMIN' && existingEmployee) {
        if (existingEmployee.loginAccountId) {
          const isActive = input.status === 'active';
          await tx.adminAccount.update({
            where: { id: existingEmployee.loginAccountId },
            data: { name: input.name, phone: normalizeOptionalString(input.phone), isActive },
          });
          if (!isActive) {
            await tx.adminSession.deleteMany({ where: { accountId: existingEmployee.loginAccountId } });
          }
        }
        return tx.employee.update({
          where: { id: existingEmployee.id },
          data,
          include: { loginAccount: { select: { id: true, email: true, role: true, isActive: true } } },
        });
      }

      let loginAccountId = existingEmployee?.loginAccountId ?? null;
      let revokeSessions = false;

      if (normalizedEmail) {
        const emailOwner = await tx.adminAccount.findUnique({ where: { email: normalizedEmail } });
        if (emailOwner && emailOwner.id !== loginAccountId) {
          throw new ApiError(409, 'That login email is already assigned to another account');
        }

        if (existingEmployee?.loginAccount && existingEmployee.loginAccount.role !== 'STAFF') {
          throw new ApiError(409, 'Employee logins can only be linked to STAFF accounts');
        }

        if (loginAccountId) {
          await tx.adminAccount.update({
            where: { id: loginAccountId },
            data: {
              email: normalizedEmail,
              name: input.name,
              phone: normalizeOptionalString(input.phone),
              isActive: input.status === 'active',
              ...(passwordHash ? { passwordHash } : {}),
            },
          });
          revokeSessions = Boolean(passwordHash) || existingEmployee?.loginAccount?.email !== normalizedEmail || input.status !== 'active';
        } else {
          if (!passwordHash) {
            throw new ApiError(400, 'A password of at least 8 characters is required when creating an employee login');
          }
          const account = await tx.adminAccount.create({
            data: {
              email: normalizedEmail,
              name: input.name,
              phone: normalizeOptionalString(input.phone),
              passwordHash,
              role: 'STAFF',
              isActive: input.status === 'active',
            },
          });
          loginAccountId = account.id;
        }
      } else if (loginAccountId) {
        await tx.adminAccount.update({ where: { id: loginAccountId }, data: { isActive: false } });
        revokeSessions = true;
        loginAccountId = null;
      }

      if (revokeSessions && existingEmployee?.loginAccountId) {
        await tx.adminSession.deleteMany({ where: { accountId: existingEmployee.loginAccountId } });
      }

      return existingEmployee
        ? tx.employee.update({
            where: { id: existingEmployee.id },
            data: { ...data, loginAccountId },
            include: { loginAccount: { select: { id: true, email: true, role: true, isActive: true } } },
          })
        : tx.employee.create({
            data: { ...data, loginAccountId },
            include: { loginAccount: { select: { id: true, email: true, role: true, isActive: true } } },
          });
    });
  },
  archiveEmployee: (id: string) =>
    prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUniqueOrThrow({ where: { id } });
      if (employee.loginAccountId) {
        await tx.adminAccount.update({ where: { id: employee.loginAccountId }, data: { isActive: false } });
        await tx.adminSession.deleteMany({ where: { accountId: employee.loginAccountId } });
      }
      return tx.employee.update({
        where: { id },
        data: { status: 'INACTIVE' },
        include: { loginAccount: { select: { id: true, email: true, role: true, isActive: true } } },
      });
    }),
};

const normalizeOptionalString = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
