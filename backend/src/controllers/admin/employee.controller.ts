import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { serializeEmployee } from '../../utils/serializers';
import { employeeService } from '../../services/employee.service';
import { logAdminAudit } from '../../utils/adminAudit';

export const listEmployees = async (_req: Request, res: Response) => {
  const employees = await employeeService.listEmployees();
  res.status(200).json(ApiResponse.success('Employees loaded', { employees: employees.map(serializeEmployee) }));
};

export const saveEmployee = async (req: Request, res: Response) => {
  const input = req.body as {
    id?: string;
    name: string;
    phone?: string;
    commissionRate: number;
    status: 'active' | 'inactive';
    notes?: string;
  };
  const employee = await employeeService.saveEmployee(input);

  logAdminAudit(req, {
    action: input.id ? 'employee.updated' : 'employee.created',
    targetType: 'employee',
    targetId: employee.id,
    details: {
      status: employee.status,
      name: employee.name,
    },
  });

  res.status(201).json(ApiResponse.success('Employee saved', { employee: serializeEmployee(employee) }));
};

export const archiveEmployee = async (req: Request, res: Response) => {
  await employeeService.archiveEmployee(req.params.id);
  logAdminAudit(req, {
    action: 'employee.archived',
    targetType: 'employee',
    targetId: req.params.id,
  });

  res.status(200).json(ApiResponse.success('Employee archived', { ok: true }));
};
