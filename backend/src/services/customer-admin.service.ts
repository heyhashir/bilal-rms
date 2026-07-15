import { customerRepository } from '../repositories/customer.repository';

export const customerAdminService = {
  async listCustomers(params?: {
    page: number;
    pageSize: number;
    query?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
  }) {
    const [customers, ordersByUserId, ordersByEmail] = await Promise.all([
      customerRepository.listCustomers(params),
      customerRepository.summarizeOrdersByUserId(),
      customerRepository.summarizeGuestOrdersByEmail(),
    ]);

    const userOrderMap = new Map(
      ordersByUserId.map((entry) => [
        entry.userId ?? '',
        {
          count: entry._count._all,
          total: Number(entry._sum.total ?? 0),
        },
      ]),
    );
    const emailOrderMap = new Map(
      ordersByEmail.map((entry) => [
        entry.email.toLowerCase(),
        {
          count: entry._count._all,
          total: Number(entry._sum.total ?? 0),
        },
      ]),
    );

    const items = customers.items.map((customer) => {
      const userSummary = userOrderMap.get(customer.id);
      const emailSummary = emailOrderMap.get(customer.email.toLowerCase());
      const count = userSummary?.count ?? emailSummary?.count ?? 0;
      const totalSpend = userSummary?.total ?? emailSummary?.total ?? 0;

      return {
        customer,
        orderCount: count,
        totalSpend,
      };
    });

    return {
      items,
      total: customers.total,
    };
  },
};
