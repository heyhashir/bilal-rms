import { Request } from 'express';

export type ListQuery = {
  page: number;
  pageSize: number;
  query: string;
  sort: string;
  direction: 'asc' | 'desc';
};

type ParseListQueryOptions = {
  defaultSort?: string;
  defaultDirection?: 'asc' | 'desc';
  defaultPageSize?: number;
  maxPageSize?: number;
};

const normalizePositiveInt = (value: unknown, fallback: number) => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
};

export const parseListQuery = (req: Request, options: ParseListQueryOptions = {}): ListQuery => {
  const defaultPageSize = options.defaultPageSize ?? 20;
  const maxPageSize = options.maxPageSize ?? 100;
  const requestedPageSize = normalizePositiveInt(req.query.pageSize, defaultPageSize);
  const pageSize = Math.min(requestedPageSize, maxPageSize);
  const direction = req.query.direction === 'asc' ? 'asc' : options.defaultDirection ?? 'desc';

  return {
    page: normalizePositiveInt(req.query.page, 1),
    pageSize,
    query: typeof req.query.query === 'string' ? req.query.query.trim() : '',
    sort: typeof req.query.sort === 'string' && req.query.sort.trim().length > 0
      ? req.query.sort.trim()
      : options.defaultSort ?? 'createdAt',
    direction,
  };
};

export const buildListMeta = (query: Pick<ListQuery, 'page' | 'pageSize'>, total: number) => ({
  page: query.page,
  pageSize: query.pageSize,
  total,
  pages: Math.max(1, Math.ceil(total / query.pageSize)),
});
