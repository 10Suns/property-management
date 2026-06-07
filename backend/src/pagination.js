// Shared pagination helper — consumed by routes with list endpoints
export function parsePagination(query, { defaultSize = 50, maxSize = 200 } = {}) {
  const page = Math.max(parseInt(query.page) || 1, 1)
  const pageSize = Math.min(Math.max(parseInt(query.page_size) || defaultSize, 1), maxSize)
  const offset = (page - 1) * pageSize
  return { page, pageSize, offset }
}
