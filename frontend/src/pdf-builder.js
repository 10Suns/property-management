import { cleanTitle } from './utils/title'
import { RESULT_MAP } from './utils/translations'
import { PAGE1_ROWS, PAGE2_ROWS, PAGE3_ROWS, BOTTOM_MARGIN, COL_WIDTHS, INFO_COL_WIDTHS, splitItems } from './utils/print-constants'

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
    RobotoVI: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  }
}

const VI_LABEL = { fontSize: 8, color: '#666', italics: true, font: 'RobotoVI' }

// Bilingual helper: [中文, '\n', Tiếng Việt]
function bilingual(cnText, viText, cnStyle = {}, viStyle = VI_LABEL) {
  if (!viText) return { text: cnText, font: 'NotoSansSC', ...cnStyle }
  return { text: [
    { text: cnText, font: 'NotoSansSC', ...cnStyle },
    { text: '\n', fontSize: 5 },
    { text: viText, font: 'RobotoVI', ...viStyle },
  ]}
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
const COMMENT_LABEL = bilingual('查验意见', 'Ý kiến kiểm tra', { bold: true, fontSize: 9 }, { fontSize: 8, color: '#666', italics: true })
const INSPECTOR_LABEL = bilingual('查验人签字：', 'Người kiểm tra ký tên:', {}, { fontSize: 8, color: '#666', italics: true })
const DATE_LABEL = bilingual('日期：', 'Ngày:', {}, { fontSize: 8, color: '#666', italics: true })

const STATIC_FOOTER = {
  layout: LINE_LAYOUT,
  table: {
    widths: COL_WIDTHS,
    body: [
      [
        { ...COMMENT_LABEL, colSpan: 2, ...styles.footerTH }, {},
        { text: ' ', colSpan: 2, ...styles.footerTD }, {},
      ],
      [
        { ...INSPECTOR_LABEL, colSpan: 3, border: [false, true, true, false], ...styles.td, margin: [0, 14, 0, 0] }, {}, {},
        { ...DATE_LABEL, border: [false, true, false, false], ...styles.td, margin: [0, 14, 0, 0] },
      ],
    ],
  },
}

function buildInfoTable(projectName, dateStr, locationStr, inspectorName) {
  const L = { ...styles.th, fillColor: '#f5f5f5', alignment: 'center' }
  const V = styles.td
  return {
    layout: LINE_LAYOUT,
    table: {
      widths: INFO_COL_WIDTHS,
      body: [
        [bilingual('项目名称', 'Tên dự án', { bold: true, fontSize: 9 }, { fontSize: 8, color: '#666', italics: true }), { text: projectName, font: 'NotoSansSC', ...V },
         bilingual('查验日期', 'Ngày kiểm tra', { bold: true, fontSize: 9 }, { fontSize: 8, color: '#666', italics: true }), { text: dateStr, font: 'NotoSansSC', ...V }],
        [bilingual('位置', 'Vị trí', { bold: true, fontSize: 9 }, { fontSize: 8, color: '#666', italics: true }), { text: locationStr, font: 'NotoSansSC', ...V },
         bilingual('查验人', 'Người kiểm tra', { bold: true, fontSize: 9 }, { fontSize: 8, color: '#666', italics: true }), { text: inspectorName, font: 'NotoSansSC', ...V }],
      ],
    },
  }
}

function buildDataRows(items, getName, getStandard, getResult, startSeq) {
  const header = [
    bilingual('序号', 'STT', { bold: true, fontSize: 9 }, { fontSize: 7, color: '#666', italics: true }),
    bilingual('检查项目', 'Hạng mục kiểm tra', { bold: true, fontSize: 9 }, { fontSize: 7, color: '#666', italics: true }),
    bilingual('检查标准', 'Tiêu chuẩn kiểm tra', { bold: true, fontSize: 9 }, { fontSize: 7, color: '#666', italics: true }),
    bilingual('查验结果', 'Kết quả kiểm tra', { bold: true, fontSize: 9 }, { fontSize: 7, color: '#666', italics: true }),
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
      bilingual(getName(item), getName(item, true), { fontSize: 9 }, VI_LABEL),
      bilingual(getStandard(item), getStandard(item, true), { fontSize: 9 }, VI_LABEL),
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
  const { page1, page2, page3 } = splitItems(items)
  const pn = info.projectName || ''

  const pages = [
    bilingual(pn + ' 查验记录表', pn + ' Phiếu kiểm tra', { bold: true, fontSize: 16, alignment: 'center' }, { fontSize: 11, color: '#555', italics: true, alignment: 'center' }),
    bilingual(cleanTitle(title), '', { fontSize: 11, alignment: 'center', color: '#555' }, {}),
    buildInfoTable(pn, info.dateStr, info.locationStr, info.inspectorName),
    buildDataTable(page1, getName, getStandard, getResult, 1),
  ]

  if (page2.length) {
    pages.push(
      { text: '', pageBreak: 'before' },
      bilingual(pn + ' 查验记录表（续）', pn + ' Phiếu kiểm tra (tiếp theo)', { bold: true, fontSize: 16, alignment: 'center' }, { fontSize: 11, color: '#555', italics: true, alignment: 'center' }),
      buildDataTable(page2, getName, getStandard, getResult, PAGE1_ROWS + 1),
    )
  }

  if (page3.length) {
    pages.push(
      { text: '', pageBreak: 'before' },
      bilingual(pn + ' 查验记录表（续二）', pn + ' Phiếu kiểm tra (tiếp theo 2)', { bold: true, fontSize: 16, alignment: 'center' }, { fontSize: 11, color: '#555', italics: true, alignment: 'center' }),
      buildDataTable(page3, getName, getStandard, getResult, PAGE1_ROWS + PAGE2_ROWS + 1),
    )
  }

  return pages
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
      getName: (i, vi) => vi ? (i.name_vi || '') : i.item_name,
      getStandard: (i, vi) => vi ? (i.standard_vi || '') : i.check_standard,
    }))
  }

  if (content.length === 0) {
    content.push(...buildFormPages({
      title: '空白表单',
      info,
      items: [],
      getName: (i, vi) => ' ',
      getStandard: (i, vi) => ' ',
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
      getName: (i, vi) => vi ? (i.item_name_vi || i.custom_item_name_vi || '') : (i.item_name || i.custom_item_name),
      getStandard: (i, vi) => vi ? (i.check_standard_vi || i.custom_standard_vi || '') : (i.check_standard || i.custom_standard),
      getResult: buildResultCell,
    }))

    if (rec.photos?.length) {
      content.push({ text: '', pageBreak: 'before' })
      content.push(bilingual('照片附件 — ' + cleanTitle(rec.template_title || ''), 'Ảnh đính kèm — ' + cleanTitle(rec.template_title || ''), { bold: true, fontSize: 14, alignment: 'center', margin: [0, 0, 0, 8] }, { fontSize: 10, color: '#555', italics: true }))

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
            { ...INSPECTOR_LABEL, border: [false, true, false, false], ...styles.td, margin: [0, 20, 0, 0] },
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
  const m = RESULT_MAP[r]
  if (m) {
    if (r === 'fail' && item.problem_description) {
      const parts = [
        { text: m.label, font: 'NotoSansSC', color: m.color, bold: true, fontSize: 9 },
        { text: '\n', fontSize: 4 },
        { text: m.labelVi, font: 'RobotoVI', color: m.color, fontSize: 8, italics: true },
        { text: '\n' + item.problem_description, font: 'NotoSansSC', color: m.color, fontSize: 8 },
      ]
      return { text: parts, ...styles.td }
    }
    return bilingual(m.label, m.labelVi, { bold: true, color: m.color, fontSize: 9 }, { fontSize: 8, color: m.color, italics: true })
  }
  return { text: '—', color: '#999', ...styles.td }
}
