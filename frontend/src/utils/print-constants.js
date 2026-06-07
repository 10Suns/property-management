// Shared print layout constants — consumed by PrintPreview.vue
export const BOTTOM_MARGIN = 38
export const COL_WIDTHS = ['4%', '22%', '40%', '34%']
export const INFO_COL_WIDTHS = ['18%', '32%', '18%', '32%']

// Actual usable data-area heights per page (mm), measured from layout
// Page 1: 297 - title(12) - info-table(22) - thead(10) - comment(18) - filler(0) - footer(20) ≈ 205
// Page 2-3: 297 - cont-title(10) - thead(10) - comment(18) - filler(0) - footer(20) ≈ 235
export const PAGE_HEIGHTS_MM = {
  0: 205,
  1: 235,
  2: 235,
}

// Page capacity for greedy packing (mm) — 10mm safety margin below actual page height
const PAGE1_CAPACITY_MM = 195
const PAGE2_CAPACITY_MM = 225

/**
 * Calculate text "width units" — CJK full-width = 2, Latin/half-width = 1
 * Covers: CJK Unified (4E00-9FFF), Ext-A (3400-4DBF), CJK punctuation (3000-303F),
 *         fullwidth ASCII (FF00-FF60), Ext-B (20000-2A6DF via surrogate pairs)
 */
function calcWidthUnits(text) {
  if (!text) return 0
  let units = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    // Skip low surrogates already handled in previous iteration
    if (code >= 0xDC00 && code <= 0xDFFF) continue
    // Check for surrogate pair (Ext-B CJK U+20000–U+2A6DF)
    if (code >= 0xD840 && code <= 0xD869 && i + 1 < text.length) {
      const lo = text.charCodeAt(i + 1)
      if (lo >= 0xDC00 && lo <= 0xDFFF) {
        units += 2 // CJK Ext-B = full-width
        i++ // skip low surrogate
        continue
      }
    }
    units += (code >= 0x4E00 && code <= 0x9FFF) ||
             (code >= 0x3400 && code <= 0x4DBF) ||
             (code >= 0x3000 && code <= 0x303F) ||
             (code >= 0xFF00 && code <= 0xFF60)
             ? 2 : 1
  }
  return units
}

// Column capacities (width units per line)
// Verified against actual column widths at 9pt font:
//   Name col: 22% × 210mm = 46mm, ~43mm usable → ~27 CJK width units/line
//   Std col:  40% × 210mm = 84mm, ~81mm usable → ~51 CJK width units/line
const NAME_CAP_CN = 27, NAME_CAP_VI = 35
const STD_CAP_CN  = 51, STD_CAP_VI  = 68
const PROB_CAP    = 22

// Line heights (mm)
const CN_LINE = 4.3   // 9pt × 1.35
const VI_LINE = 3.0   // 7pt × 1.25
const BASE    = 2.5   // padding 2.1mm + border 0.3mm

/**
 * Estimate row height in mm using width-aware calculation.
 * Name col and standard col are same-row cells — row height = max(nameCell, stdCell).
 */
function estimateRowHeight(item) {
  if (!item) return 0

  // --- Width units per field ---
  const nameW    = calcWidthUnits(item.name)
  const nameViW  = calcWidthUnits(item.nameVi)
  const stdW     = calcWidthUnits(item.standard)
  const stdViW   = calcWidthUnits(item.standardVi)
  const problemW = calcWidthUnits(item.problem)

  // --- Line counts per column ---
  const nameCnLines = Math.ceil(nameW / NAME_CAP_CN) || 0
  const nameViLines = Math.ceil(nameViW / NAME_CAP_VI) || 0
  const nameLines   = Math.max(1, nameCnLines, nameViLines)
  const nameViExtra = nameViW > 0 ? 1 : 0

  const stdCnLines  = Math.ceil(stdW / STD_CAP_CN) || 0
  const stdViLines  = Math.ceil(stdViW / STD_CAP_VI) || 0
  const stdLines    = Math.max(1, stdCnLines, stdViLines)
  const stdViExtra  = stdViW > 0 ? 1 : 0

  const probLines   = problemW > 0 ? Math.max(1, Math.ceil(problemW / PROB_CAP)) : 0

  // --- Height aggregation (mm) ---
  const nameCellH = nameLines * CN_LINE + nameViExtra * VI_LINE
  const stdCellH  = stdLines * CN_LINE + stdViExtra * VI_LINE
  const contentH  = Math.max(nameCellH, stdCellH)
  const problemH  = probLines * 3.5 + (probLines > 0 ? 1.0 : 0)

  return Math.round((BASE + contentH + problemH) * 10) / 10
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

  // Balance: if last used page has ≤3 items and total ≥ 6,
  // redistribute by height to avoid a near-empty trailing page
  const lastUsed = pages[2].length > 0 ? 2 : pages[1].length > 0 ? 1 : 0
  if (lastUsed > 0 && pages[lastUsed].length <= 3 && arr.length >= 6) {
    const prev = lastUsed - 1
    const allItems = [...pages[prev], ...pages[lastUsed]]
    let hA = 0, hB = 0
    const redistributed = [[], []]
    for (const it of allItems) {
      const h = estimateRowHeight(it)
      if (hA <= hB) {
        redistributed[0].push(it)
        hA += h
      } else {
        redistributed[1].push(it)
        hB += h
      }
    }
    pages[prev] = redistributed[0]
    pages[lastUsed] = redistributed[1]
  }

  // Compute per-page estimated heights for overflow detection
  const pageHeights = [0, 1, 2].map(p =>
    pages[p].reduce((sum, it) => sum + estimateRowHeight(it), 0)
  )

  const start2 = pages[0].length + 1
  const start3 = start2 + pages[1].length
  return { page1: pages[0], page2: pages[1], page3: pages[2], start2, start3, pageHeights }
}
