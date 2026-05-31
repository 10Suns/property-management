export const BOTTOM_MARGIN = 38
export const COL_WIDTHS = ['4%', '22%', '40%', '34%']
export const INFO_COL_WIDTHS = ['18%', '32%', '18%', '32%']

// Page capacity in mm for data rows (A4=297mm minus header/footer overhead)
// Page 1: info table (~35mm) + comment (~28mm) → less room
// Page 2/3: no info table → more room
const PAGE1_CAPACITY_MM = 157
const PAGE2_CAPACITY_MM = 197

// ~40 Chinese chars or ~75 Latin chars per line in 40%-wide standard column at 9pt
function estimateRowHeight(item) {
  if (!item) return 0
  let h = 8 // base: one line Chinese + cell padding + border (mm)
  const hasVi = !!(item.nameVi || item.standardVi)
  if (hasVi) h += 3 // stacked Vietnamese line
  const stdCn = (item.standard || '').length
  const stdVi = (item.standardVi || '').length
  if (stdCn > 25) h += 4 // Chinese wraps to 2nd line
  if (stdVi > 50) h += 3 // Vietnamese wraps
  if (stdCn > 50) h += 4 // Chinese wraps to 3rd line
  if (item.problem) h += 5 // problem description line
  return h
}

// Dynamic split: greedily pack items by estimated row height, not fixed counts
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
    // If no page has room, dump into last page so content is never silently dropped
    if (pi >= pages.length) pi = pages.length - 1
    pages[pi].push(item)
    used += h
  }

  const start2 = pages[0].length + 1
  const start3 = start2 + pages[1].length
  return { page1: pages[0], page2: pages[1], page3: pages[2], start2, start3 }
}
