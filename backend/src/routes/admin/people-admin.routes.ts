import { Router } from 'express';
import { exportCustomers as exportCustomersController, listCustomers as listCustomersController } from '../../controllers/admin/customer.controller';
import {
  archiveEmployee as archiveEmployeeController,
  listEmployees as listEmployeesController,
  saveEmployee as saveEmployeeController,
} from '../../controllers/admin/employee.controller';
import { employeeSchema } from '../../schemas/admin/employee.schemas';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get('/customers', asyncHandler(listCustomersController));
router.get('/customers/export', asyncHandler(exportCustomersController));

router.get('/employees', asyncHandler(listEmployeesController));

router.post(
  '/employees',
  asyncHandler(async (req, res) => {
    req.body = employeeSchema.parse(req.body);
    await saveEmployeeController(req, res);
  }),
);

router.delete('/employees/:id', asyncHandler(archiveEmployeeController));

export default router;
