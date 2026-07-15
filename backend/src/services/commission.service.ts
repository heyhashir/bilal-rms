import { commissionRepository } from '../repositories/commission.repository';

export const commissionService = {
  listCommissions: (params?: {
    page: number;
    pageSize: number;
    query?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
  }) => commissionRepository.list(params),
  listCommissionsForExport: (query?: string) => commissionRepository.listForExport(query),
  updateCommissionStatus: (id: string, status: string, note: string) =>
    commissionRepository.updateStatus(id, status, note),
};
