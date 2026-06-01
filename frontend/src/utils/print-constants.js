// Shared print layout constants — consumed by PrintPreview.vue
export const BOTTOM_MARGIN = 38
export const COL_WIDTHS = ['4%', '22%', '40%', '34%']
export const INFO_COL_WIDTHS = ['18%', '32%', '18%', '32%']

// Page capacity in mm for data rows (A4=297mm)
// Measured overhead: page1 ~77mm (title+info+header+footer), page2 ~50mm (title+header+footer)
// Remaining space with 10mm filler margin: page1 ≈ 210mm, page2 ≈ 237mm
const PAGE1_CAPACITY_MM = 195
const PAGE2_CAPACITY_MM = 225

// Estimate row height in mm. Actual CSS: 9pt×1.35 CN (~4.3mm) + 7pt×1.25 VI (~3.1mm)
// + 8px vertical padding (~2.1mm) + 2px border (~0.5mm) ≈ 10mm per short bilingual row
function estimateRowHeight(item) {
  if (!item) return 0
  let h = 7 // single-language base: CN line (4.3mm) + padding (2.1mm) + border (0.5mm)
  const hasVi = !!(item.nameVi || item.standardVi)
  if (hasVi) h += 3 // Vietnamese line ≈ 3.1mm
  // Column wrap thresholds (accounting for cell padding ~5px per side):
  // Standard col 40% of 210mm = 84mm, usable ~81mm → ~25 CJK @9pt, ~40 Latin @7pt
  // Name col 22% of 210mm = 46mm, usable ~43mm → ~14 CJK, ~23 Latin
  const stdCn = (item.standard || '').length
  const stdVi = (item.standardVi || '').length
  if (stdCn > 25) h += 4 // Chinese standard wraps
  if (stdVi > 38) h += 3 // Vietnamese standard wraps (key: B9 溢出根因)
  if (stdCn > 50) h += 4 // Chinese standard wraps to 3rd line
  if (stdVi > 76) h += 3 // Vietnamese standard wraps to 3rd line
  const nameCn = (item.name || '').length
  const nameVi = (item.nameVi || '').length
  if (nameCn > 14) h += 3
  if (nameVi > 24) h += 3
  if (item.problem) h += 5 // problem description
  return h
}

// Dynamic split: greedily pack items by estimated row height, then balance
export function splitItems(items) {
  const arr = items || []
  const capacities = [PAGE1_CAPACITY_MM, PAGE2_CAPACITY_MM, PAGE2_CAPACITY_MM]
  const pages = [[], [], []]
  let pi = 0
  let used = 0

  for (const item of arr) {
    const h = estimateRowHeight(item)
    while (pi < pages.length && used + h > capacities[pi]) {
      pi++
      used = 0
    }
    if (pi >= pages.length) pi = pages.length - 1
    pages[pi].push(item)
    used += h
  }

  // Balance: if last used page has ≤2 items and total items ≥ 10,
  // redistribute to avoid a near-empty trailing page
  const lastUsed = pages[2].length > 0 ? 2 : pages[1].length > 0 ? 1 : 0
  if (lastUsed > 0 && pages[lastUsed].length <= 2 && arr.length >= 10) {
    const prev = lastUsed - 1
    const total = pages[prev].length + pages[lastUsed].length
    const half = Math.ceil(total / 2)
    const allItems = [...pages[prev], ...pages[lastUsed]]
    pages[prev] = allItems.slice(0, half)
    pages[lastUsed] = allItems.slice(half)
  }

  const start2 = pages[0].length + 1
  const start3 = start2 + pages[1].length
  return { page1: pages[0], page2: pages[1], page3: pages[2], start2, start3 }
}
