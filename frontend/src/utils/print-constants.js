// Shared print layout constants — kept in sync between PDF builder and browser preview
// Row counts tuned for bilingual content (~12mm/row including stacked Chinese + Vietnamese text)

export const PAGE1_ROWS = 18
export const PAGE2_ROWS = 22
export const PAGE3_ROWS = 22
export const BOTTOM_MARGIN = 38
export const COL_WIDTHS = ['4%', '15%', '45%', '36%']
export const INFO_COL_WIDTHS = ['14%', '36%', '14%', '36%']

// Split items array into pages — no padding, flex filler pushes footer to bottom
export function splitItems(items) {
  const arr = items || []
  return {
    page1: arr.slice(0, PAGE1_ROWS),
    page2: arr.slice(PAGE1_ROWS, PAGE1_ROWS + PAGE2_ROWS),
    page3: arr.slice(PAGE1_ROWS + PAGE2_ROWS, PAGE1_ROWS + PAGE2_ROWS + PAGE3_ROWS),
  }
}
