import { Router } from 'express';
import { exportCustomers as exportCustomersController, listCustomers as listCustomersController } from '../../controllers/admin/customer.controller';
import {
  archiveStaffAccount as archiveStaffAccountController,
  listStaffAccounts as listStaffAccountsController,
  saveStaffAccount as saveStaffAccountController,
} from '../../controllers/admin/backoffice.controller';
import {
  archiveEmployee as archiveEmployeeController,
  listEmployees as listEmployeesController,
  saveEmployee as saveEmployeeController,
} from '../../controllers/admin/employee.controller';
import { employeeSchema } from '../../schemas/admin/employee.schemas';
import { asyncHandler } from '../../utils/asyncHandler';
import { z } from 'zod';

const router = Router();

const staffAccountSchema = z.object({
  id: z.string().optional(),
  email: z.string().email(),
  name: z.string().min(2),
  phone: z.string().optional().or(z.literal('')),
  role: z.enum(['admin', 'manager', 'staff']),
  password: z.string().min(8).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

router.get('/customers', asyncHandler(listCustomersController));
router.get('/customers/export', asyncHandler(exportCustomersController));

router.get('/employees', asyncHandler(listEmployeesController));
router.get('/staff-accounts', asyncHandler(listStaffAccountsController));

router.post(
  '/employees',
  asyncHandler(async (req, res) => {
    req.body = employeeSchema.parse(req.body);
    await saveEmployeeController(req, res);
  }),
);

router.delete('/employees/:id', asyncHandler(archiveEmployeeController));

router.post(
  '/staff-accounts',
  asyncHandler(async (req, res) => {
    req.body = staffAccountSchema.parse(req.body);
    await saveStaffAccountController(req, res);
  }),
);

router.delete('/staff-accounts/:id', asyncHandler(archiveStaffAccountController));

export default router;
