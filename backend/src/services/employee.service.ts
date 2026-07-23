import { employeeRepository } from '../repositories/employee.repository';
import { EmployeeInput } from '../schemas/admin/employee.schemas';

export const employeeService = {
  listEmployees: () => employeeRepository.listEmployees(),
  saveEmployee(input: EmployeeInput) {
    const data = {
      name: input.name,
      phone: normalizeOptionalString(input.phone),
      commissionRate: input.commissionRate,
      status: input.status.toUpperCase() as 'ACTIVE' | 'INACTIVE',
      notes: input.notes || '',
    };

    return input.id
      ? employeeRepository.updateEmployee(input.id, data)
      : employeeRepository.createEmployee(data);
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
