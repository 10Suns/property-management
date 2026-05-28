import { cleanTitle } from './utils/title'
import { PAGE1_ROWS, PAGE2_ROWS, BOTTOM_MARGIN, COL_WIDTHS, INFO_COL_WIDTHS, splitItems } from './utils/print-constants'

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
  const chunks = []
  for (let i = 0; i < bytes.length; i += 8192) {
    chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)))
  }
  fontBase64 = btoa(chunks.join(''))
  return fontBase64
}

async function setupPdfMake() {
  await ensurePdfMake()
  const cjkFont = await loadChineseFont()
  pdfMake.vfs = { ...pdfFonts, 'NotoSansSC-Regular.ttf': cjkFont }
  pdfMake.fonts = {
    NotoSansSC: {
      normal: 'NotoSansSC-Regular.ttf',
      bold: 'NotoSansSC-Regular.ttf',
      italics: 'NotoSansSC-Regular.ttf',
      bolditalics: 'NotoSansSC-Regular.ttf',
    },
  }
}

const styles = {
  header: { fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 4] },
  subheader: { fontSize: 11, alignment: 'center', color: '#555', margin: [0, 0, 0, 6] },
  th: { fontSize: 9, bold: true, alignment: 'center', fillColor: '#f0f0f0' },
  td: { fontSize: 9, alignment: 'left' },
  tdCenter: { fontSize: 9, alignment: 'center' },
  footerTH: { fontSize: 9, bold: true, alignment: 'center', fillColor: '#f5f5f5' },
  footerTD: { fontSize: 9, alignment: 'left' },
}

const LINE_LAYOUT = { hLineWidth: 0.5, vLineWidth: 0.5 }
const DOC_CONFIG = {
  pageSize: 'A4',
  pageMargins: [28, 28, 28, BOTTOM_MARGIN],
  styles,
  defaultStyle: { font: 'NotoSansSC' },
}

// Precomputed static footer — reused across all pages
const STATIC_FOOTER = {
  layout: LINE_LAYOUT,
  table: {
    widths: COL_WIDTHS,
    body: [
      [
        { text: '查验意见', colSpan: 2, ...styles.footerTH }, {},
        { text: ' ', colSpan: 2, ...styles.footerTD }, {},
      ],
      [
        { text: '查验人签字：', colSpan: 3, border: [false, true, true, false], ...styles.td, margin: [0, 14, 0, 0] }, {}, {},
        { text: '日期：', border: [false, true, false, false], ...styles.td, margin: [0, 14, 0, 0] },
      ],
    ],
  },
}

function buildInfoTable(projectName, dateStr, locationStr, inspectorName) {
  const L = { ...styles.th, fillColor: '#f5f5f5' }
  const V = styles.td
  return {
    layout: LINE_LAYOUT,
    table: {
      widths: INFO_COL_WIDTHS,
      body: [
        [{ text: '项目名称', ...L }, { text: projectName, ...V },
         { text: '查验日期', ...L }, { text: dateStr, ...V }],
        [{ text: '位置', ...L }, { text: locationStr, ...V },
         { text: '查验人', ...L }, { text: inspectorName, ...V }],
      ],
    },
  }
}

function buildDataRows(items, getName, getStandard, getResult, startSeq) {
  const header = [
    { text: '序号', ...styles.th },
    { text: '检查项目', ...styles.th },
    { text: '检查标准', ...styles.th },
    { text: '查验结果', ...styles.th },
  ]
  const rows = items.map((item, i) => {
    if (!item) {
      return [
        { text: ' ', ...styles.tdCenter },
        { text: ' ', ...styles.td },
        { text: ' ', ...styles.td },
        { text: ' ', ...styles.td },
      ]
    }
    return [
      { text: String(startSeq + i), ...styles.tdCenter },
      { text: getName(item), ...styles.td },
      { text: getStandard(item), ...styles.td },
      getResult ? getResult(item) : { text: ' ', ...styles.td },
    ]
  })
  return [header, ...rows]
}

function buildDataTable(items, getName, getStandard, getResult, startSeq) {
  return {
    layout: LINE_LAYOUT,
    table: {
      headerRows: 1,
      widths: COL_WIDTHS,
      body: buildDataRows(items, getName, getStandard, getResult, startSeq),
    },
  }
}

function buildFormPages({ title, info, items, getName, getStandard, getResult }) {
  const { page1, page2 } = splitItems(items)
  const pn = info.projectName || ''

  return [
    { text: pn + ' 查验记录表', style: 'header' },
    { text: cleanTitle(title), style: 'subheader' },
    buildInfoTable(pn, info.dateStr, info.locationStr, info.inspectorName),
    buildDataTable(page1, getName, getStandard, getResult, 1),

    { text: '', pageBreak: 'before' },
    { text: pn + ' 查验记录表（续）', style: 'header' },
    buildDataTable(page2, getName, getStandard, getResult, PAGE1_ROWS + 1),
  ]
}

export async function buildBlankPdf(templates, projectName) {
  await setupPdfMake()

  const info = {
    projectName: projectName || '____________',
    dateStr: '____年____月____日',
    locationStr: '____栋____层____号',
    inspectorName: '____________',
  }

  const content = []
  for (const tpl of templates) {
    content.push(...buildFormPages({
      title: tpl.title,
      info,
      items: tpl.items || [],
      getName: (i) => i.item_name,
      getStandard: (i) => i.check_standard,
    }))
  }

  if (content.length === 0) {
    content.push(...buildFormPages({
      title: '空白表单',
      info,
      items: [],
      getName: () => ' ',
      getStandard: () => ' ',
    }))
  }

  return pdfMake.createPdf({ ...DOC_CONFIG, footer: () => STATIC_FOOTER, content })
}

export async function buildRecordPdf(records, projectName) {
  await setupPdfMake()

  const content = []
  for (const rec of records) {
    const items = rec.printItems || rec.results || []

    content.push(...buildFormPages({
      title: rec.template_title || '',
      info: {
        projectName: projectName || '____________',
        dateStr: rec.updated_at?.slice(0, 10) || '____年____月____日',
        locationStr: [rec.building_name, rec.house_number, rec.location_info].filter(Boolean).join(' ') || ' ',
        inspectorName: rec.creator_name || '____________',
      },
      items,
      getName: (i) => i.item_name || i.custom_item_name,
      getStandard: (i) => i.check_standard || i.custom_standard,
      getResult: buildResultCell,
    }))

    if (rec.photos?.length) {
      content.push({ text: '', pageBreak: 'before' })
      content.push({ text: '照片附件 — ' + cleanTitle(rec.template_title || ''), style: 'header', margin: [0, 0, 0, 8] })

      const photoRows = rec.photos.map((p) => [
        { image: '/uploads/' + p.filename, width: 280, margin: [4, 4] },
        { text: [{ text: p.original_name + '\n', fontSize: 10 }, { text: p.uploaded_at || '', fontSize: 8, color: '#888' }], ...styles.td },
      ])

      content.push({
        layout: LINE_LAYOUT,
        table: { widths: ['60%', '40%'], body: photoRows },
      })

      content.push({
        layout: LINE_LAYOUT,
        table: {
          widths: ['50%', '50%'],
          body: [[
            { text: '查验人签字：', border: [false, true, false, false], ...styles.td, margin: [0, 20, 0, 0] },
            {},
          ]],
        },
      })
    }
  }

  return pdfMake.createPdf({ ...DOC_CONFIG, footer: () => STATIC_FOOTER, content })
}

function buildResultCell(item) {
  const r = item.result
  if (r === 'pass') return { text: '合格', color: '#188038', bold: true, ...styles.td }
  if (r === 'fail') {
    const parts = [{ text: '不合格', color: '#c5221f', bold: true }]
    if (item.problem_description) parts.push({ text: '\n' + item.problem_description, color: '#c5221f', fontSize: 8 })
    return { text: parts, ...styles.td }
  }
  if (r === 'skip') return { text: '免检', color: '#5f6368', bold: true, ...styles.td }
  return { text: '—', color: '#999', ...styles.td }
}
