// Shared print layout constants — kept in sync between PDF builder and browser preview

export const PAGE1_ROWS = 22
export const PAGE2_ROWS = 26
export const BOTTOM_MARGIN = 38
export const COL_WIDTHS = ['4%', '15%', '45%', '36%']
export const INFO_COL_WIDTHS = ['14%', '36%', '14%', '36%']

// Split items array into two pages, padding each to fill
export function splitItems(items) {
  const page1 = (items || []).slice(0, PAGE1_ROWS)
  const page2 = (items || []).slice(PAGE1_ROWS, PAGE1_ROWS + PAGE2_ROWS)
  while (page1.length < PAGE1_ROWS) page1.push(null)
  while (page2.length < PAGE2_ROWS) page2.push(null)
  return { page1, page2 }
}
