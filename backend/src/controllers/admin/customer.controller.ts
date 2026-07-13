import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { serializeAdminCustomer } from '../../utils/serializers';
import { customerAdminService } from '../../services/customer-admin.service';
import { buildListMeta, parseListQuery } from '../../utils/list-query';
import { toCsv } from '../../utils/csv';

export const listCustomers = async (req: Request, res: Response) => {
  const query = parseListQuery(req, { defaultSort: 'createdAt', defaultPageSize: 20 });
  const customers = await customerAdminService.listCustomers(query);
  res.status(200).json(
    ApiResponse.success('Customers loaded', {
      customers: customers.items.map(serializeAdminCustomer),
      meta: buildListMeta(query, customers.total),
    }),
  );
};

export const exportCustomers = async (req: Request, res: Response) => {
  const customers = await customerAdminService.listCustomers({
    page: 1,
    pageSize: 10000,
    query: typeof req.query.query === 'string' ? req.query.query.trim() : '',
    sort: 'createdAt',
    direction: 'desc',
  });

  const csv = toCsv(
    ['name', 'email', 'phone', 'orderCount', 'totalSpend', 'joinedAt'],
    customers.items.map((entry) => ({
      name: entry.customer.name,
      email: entry.customer.email,
      phone: entry.customer.phone ?? '',
      orderCount: entry.orderCount,
      totalSpend: entry.totalSpend,
      joinedAt: entry.customer.createdAt.toISOString(),
    })),
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
  res.status(200).send(csv);
};
