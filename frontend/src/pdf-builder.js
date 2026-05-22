import { cleanTitle } from './utils/title'

let pdfMake = null
let pdfFonts = null
let fontBase64 = null

async function ensurePdfMake() {
  if (pdfMake && pdfFonts) return
  const [pm, pf] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])
  pdfMake = pm.default
  pdfFonts = pf.default
}

async function loadChineseFont() {
  if (fontBase64) return fontBase64
  const resp = await fetch('/fonts/NotoSansSC-Regular.ttf')
  const buffer = await resp.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const chunkSize = 8192
  const chunks = []
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize)))
  }
  fontBase64 = btoa(chunks.join(''))
  return fontBase64
}

async function setupPdfMake() {
  await ensurePdfMake()
  const cjkFont = await loadChineseFont()

  pdfMake.vfs = {
    ...pdfFonts,
    'NotoSansSC-Regular.ttf': cjkFont,
  }

  pdfMake.fonts = {
    NotoSansSC: {
      normal: 'NotoSansSC-Regular.ttf',
      bold: 'NotoSansSC-Regular.ttf',
      italics: 'NotoSansSC-Regular.ttf',
      bolditalics: 'NotoSansSC-Regular.ttf',
    },
  }
}

// ---- Styles ----
const styles = {
  header: { fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
  subheader: { fontSize: 11, alignment: 'center', color: '#555', margin: [0, 0, 0, 8] },
  th: { fontSize: 9, bold: true, alignment: 'center', fillColor: '#f0f0f0' },
  td: { fontSize: 9, alignment: 'left' },
  tdCenter: { fontSize: 9, alignment: 'center' },
  footerTH: { fontSize: 9, bold: true, alignment: 'center', fillColor: '#f0f0f0' },
  footerTD: { fontSize: 9, alignment: 'left' },
}

// ---- Helper: build info table rows ----
function buildInfoRows(projectName, dateStr, locationStr, inspectorName) {
  const labelStyle = { ...styles.th, fillColor: '#f5f5f5' }
  const valStyle = styles.td
  return [
    [
      { text: '项目名称', ...labelStyle },
      { text: projectName, ...valStyle },
      { text: '查验日期', ...labelStyle },
      { text: dateStr, ...valStyle },
    ],
    [
      { text: '位置', ...labelStyle },
      { text: locationStr, ...valStyle },
      { text: '查验人', ...labelStyle },
      { text: inspectorName, ...valStyle },
    ],
  ]
}

// ---- Helper: build data table body (with header row) ----
function buildDataBody(items, getItemName, getStandard, getResultCell, padCount) {
  const headerRow = [
    { text: '序号', ...styles.th },
    { text: '检查项目', ...styles.th },
    { text: '检查标准', ...styles.th },
    { text: '查验结果', ...styles.th },
  ]

  const rows = items.map((item, i) => [
    { text: String(i + 1), ...styles.tdCenter },
    { text: getItemName(item), ...styles.td },
    { text: getStandard(item), ...styles.td },
    getResultCell(item),
  ])

  // Padding rows
  for (let n = 0; n < padCount; n++) {
    rows.push([
      { text: ' ', ...styles.tdCenter },
      { text: ' ', ...styles.td },
      { text: ' ', ...styles.td },
      { text: ' ', ...styles.td },
    ])
  }

  return [headerRow, ...rows]
}

// ---- Helper: build footer (inspector comment + signatures) ----
function buildFooter(inspectorComment) {
  const labelStyle = { ...styles.footerTH, fillColor: '#f5f5f5' }
  return [
    [
      { text: '查验意见', colSpan: 1, ...labelStyle, margin: [0, 30, 0, 30] },
      { text: inspectorComment || ' ', colSpan: 3, ...styles.footerTD, margin: [0, 30, 0, 30] },
      {}, {},
    ],
    [
      {
        text: '查验人签字：                            ',
        colSpan: 2,
        border: [false, true, true, false],
        ...styles.td,
        margin: [0, 30, 0, 0],
      },
      {},
      {
        text: '日期：                            ',
        colSpan: 2,
        border: [false, true, false, false],
        ...styles.td,
        margin: [0, 30, 0, 0],
      },
      {},
    ],
  ]
}

// ---- Public: build blank template PDF ----
export async function buildBlankPdf(templates, projectName) {
  await setupPdfMake()

  const ROWS_PER_PAGE = 22
  const content = []

  for (const tpl of templates) {
    if (content.length > 0) content.push({ text: '', pageBreak: 'before' })

    content.push({ text: '瑞界物业 查验记录表', style: 'header' })
    content.push({ text: cleanTitle(tpl.title), style: 'subheader' })

    // Info table
    content.push({
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
      table: {
        widths: ['14%', '36%', '14%', '36%'],
        body: buildInfoRows(projectName, '____年____月____日', '____栋____层____号', '____________'),
      },
    })

    const items = tpl.items || []
    const pad = items.length <= 10 ? 0 : (ROWS_PER_PAGE - (items.length % ROWS_PER_PAGE)) % ROWS_PER_PAGE

    // Data table
    content.push({
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
      table: {
        headerRows: 1,
        widths: ['5%', '14%', '45%', '36%'],
        body: buildDataBody(
          items,
          i => i.item_name,
          i => i.check_standard,
          _ => ({ text: ' ', ...styles.td }),
          pad
        ),
      },
    })

    // Footer
    content.push({
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
      table: {
        widths: ['14%', '36%', '14%', '36%'],
        body: buildFooter(''),
      },
    })
  }

  return pdfMake.createPdf({ pageSize: 'A4', pageMargins: [28, 28, 28, 28], content, styles, defaultStyle: { font: 'NotoSansSC' } })
}

// ---- Public: build filled record PDF ----
export async function buildRecordPdf(records, projectName) {
  await setupPdfMake()

  const ROWS_PER_PAGE = 22
  const content = []

  for (const rec of records) {
    if (content.length > 0) content.push({ text: '', pageBreak: 'before' })

    const title = cleanTitle(rec.template_title || '')
    content.push({ text: '瑞界物业 查验记录表', style: 'header' })
    content.push({ text: title, style: 'subheader' })

    const dateStr = rec.updated_at?.slice(0, 10) || '____年____月____日'
    const locationStr = [rec.building_name, rec.house_number, rec.location_info].filter(Boolean).join(' ')
    const inspector = rec.creator_name || '____________'

    content.push({
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
      table: {
        widths: ['14%', '36%', '14%', '36%'],
        body: buildInfoRows(projectName, dateStr, locationStr, inspector),
      },
    })

    const items = rec.printItems || rec.results || []
    const pad = items.length <= 10 ? 0 : (ROWS_PER_PAGE - (items.length % ROWS_PER_PAGE)) % ROWS_PER_PAGE

    content.push({
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
      table: {
        headerRows: 1,
        widths: ['5%', '14%', '45%', '36%'],
        body: buildDataBody(
          items,
          i => i.item_name || i.custom_item_name,
          i => i.check_standard || i.custom_standard,
          i => buildResultCell(i),
          pad
        ),
      },
    })

    content.push({
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
      table: {
        widths: ['14%', '36%', '14%', '36%'],
        body: buildFooter(rec.inspector_comment || ''),
      },
    })

    // Photos on separate page
    if (rec.photos?.length) {
      content.push({ text: '', pageBreak: 'before' })
      content.push({ text: `照片附件 — ${title}`, style: 'header', margin: [0, 0, 0, 8] })

      const photoRows = rec.photos.map(p => [
        { image: '/uploads/' + p.filename, width: 280, margin: [4, 4] },
        { text: [{ text: p.original_name + '\n', fontSize: 10 }, { text: p.uploaded_at || '', fontSize: 8, color: '#888' }], ...styles.td },
      ])

      content.push({
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
        table: { widths: ['60%', '40%'], body: photoRows },
      })

      content.push({
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
        table: {
          widths: ['50%', '50%'],
          body: [[
            { text: '查验人签字：                            ', border: [false, true, false, false], ...styles.td, margin: [0, 20, 0, 0] },
            {},
          ]],
        },
      })
    }
  }

  return pdfMake.createPdf({ pageSize: 'A4', pageMargins: [28, 28, 28, 28], content, styles, defaultStyle: { font: 'NotoSansSC' } })
}

// ---- Internal helpers ----
function buildResultCell(item) {
  const result = item.result
  if (result === 'pass') {
    return { text: '合格', color: '#188038', bold: true, ...styles.td }
  }
  if (result === 'fail') {
    const parts = [{ text: '不合格', color: '#c5221f', bold: true }]
    if (item.problem_description) {
      parts.push({ text: '\n' + item.problem_description, color: '#c5221f', fontSize: 8 })
    }
    return { text: parts, ...styles.td }
  }
  if (result === 'skip') {
    return { text: '免检', color: '#5f6368', bold: true, ...styles.td }
  }
  return { text: '—', color: '#999', ...styles.td }
}
