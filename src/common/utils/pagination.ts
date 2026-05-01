export type PaginationQuery = Record<string, unknown>;

export type PaginationOptions = {
  defaultLimit?: number;
  maxLimit?: number;
};

export type PaginationResult = {
  page: number;
  limit: number;
  skip: number;
};

const toPositiveInteger = (value: unknown, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getPagination = (
  query: PaginationQuery,
  options: PaginationOptions = {}
): PaginationResult => {
  const defaultLimit = options.defaultLimit ?? 25;
  const maxLimit = options.maxLimit ?? 100;

  const page = Math.max(toPositiveInteger(query.page, 1), 1);
  const requestedLimit = toPositiveInteger(query.limit, defaultLimit);
  const limit = Math.min(Math.max(requestedLimit, 1), maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const getPaginationMeta = (total: number, page: number, limit: number) => ({
  total,
  page,
  perPage: limit,
  totalPages: Math.ceil(total / limit),
});
