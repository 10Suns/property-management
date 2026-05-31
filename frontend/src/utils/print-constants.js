// Row counts tuned for bilingual content (~12mm/row: Chinese 9.5pt + Vietnamese 0.82em + padding)
// Page 1 has info table overhead (~40mm) → fewer rows; page 2/3 have more space (~195mm available)
export const PAGE1_ROWS = 12
export const PAGE2_ROWS = 16
export const PAGE3_ROWS = 16
export const BOTTOM_MARGIN = 38
// Wider inspection-item column (22%) for bilingual names; standard column (40%) for bilingual standards
export const COL_WIDTHS = ['4%', '22%', '40%', '34%']
export const INFO_COL_WIDTHS = ['18%', '32%', '18%', '32%']

// Split items array into pages — no padding, flex filler pushes footer to bottom
export function splitItems(items) {
  const arr = items || []
  return {
    page1: arr.slice(0, PAGE1_ROWS),
    page2: arr.slice(PAGE1_ROWS, PAGE1_ROWS + PAGE2_ROWS),
    page3: arr.slice(PAGE1_ROWS + PAGE2_ROWS, PAGE1_ROWS + PAGE2_ROWS + PAGE3_ROWS),
  }
}
