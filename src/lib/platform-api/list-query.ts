/**
 * List/filter query parsing — kept separate from NextResponse helpers for tests.
 */

export type ListQuery = {
  page: number;
  pageSize: number;
  sort: string;
  order: "asc" | "desc";
  q?: string;
  status?: string;
  country?: string;
  industry?: string;
  ownerId?: string;
  tag?: string;
  leadScoreMin?: number;
  leadScoreMax?: number;
  createdAfter?: string;
  createdBefore?: string;
  cursor?: string;
};

export function parseListQuery(url: URL): ListQuery {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("pageSize") ?? "25") || 25),
  );
  const order =
    url.searchParams.get("order") === "asc" ? ("asc" as const) : ("desc" as const);
  const leadScoreMinRaw = url.searchParams.get("leadScoreMin");
  const leadScoreMaxRaw = url.searchParams.get("leadScoreMax");
  return {
    page,
    pageSize,
    sort: url.searchParams.get("sort") ?? "created_at",
    order,
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    country: url.searchParams.get("country") ?? undefined,
    industry: url.searchParams.get("industry") ?? undefined,
    ownerId: url.searchParams.get("ownerId") ?? undefined,
    tag: url.searchParams.get("tag") ?? undefined,
    leadScoreMin: leadScoreMinRaw ? Number(leadScoreMinRaw) : undefined,
    leadScoreMax: leadScoreMaxRaw ? Number(leadScoreMaxRaw) : undefined,
    createdAfter: url.searchParams.get("createdAfter") ?? undefined,
    createdBefore: url.searchParams.get("createdBefore") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  };
}

export function paginationMeta(input: {
  page: number;
  pageSize: number;
  total: number;
  nextCursor?: string | null;
}) {
  const totalPages = Math.max(1, Math.ceil(input.total / input.pageSize));
  return {
    page: input.page,
    pageSize: input.pageSize,
    total: input.total,
    totalPages,
    hasMore: input.page < totalPages,
    nextCursor: input.nextCursor ?? null,
  };
}
