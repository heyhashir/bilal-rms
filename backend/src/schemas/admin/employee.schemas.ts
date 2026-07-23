import { z } from 'zod';

export const employeeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  phone: z.string().optional().or(z.literal('')),
  commissionRate: z.coerce.number().min(0).max(100).default(0),
  status: z.enum(['active', 'inactive']).default('active'),
  notes: z.string().optional().or(z.literal('')),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
