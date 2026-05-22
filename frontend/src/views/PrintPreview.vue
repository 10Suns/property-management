<template>
  <div>
    <div class="page-header no-print">
      <h1 class="page-title">打印预览</h1>
      <div class="flex gap-8">
        <button class="btn" @click="downloadPdf" :disabled="pdfLoading">{{ pdfLoading ? '生成中...' : '下载 PDF' }}</button>
        <button class="btn btn-outline" @click="window.print()">浏览器打印</button>
        <button class="btn btn-outline" @click="router.back()">返回</button>
      </div>
    </div>

    <div v-if="loading" class="empty no-print">加载中...</div>

    <!-- Blank template documents -->
    <div v-for="(tpl, ti) in blankTemplates" :key="'bt_'+ti" class="print-document">
      <div class="print-frame">
        <div class="print-company">瑞界物业 查验记录表</div>
        <div class="print-form-title">{{ cleanTitle(tpl.title) }}</div>
        <table class="print-info-table">
          <colgroup>
            <col class="info-label-col"><col class="info-value-col">
            <col class="info-label-col"><col class="info-value-col">
          </colgroup>
          <tr>
            <th>项目名称</th><td>{{ projectName }}</td>
            <th>查验日期</th><td>____年____月____日</td>
          </tr>
          <tr>
            <th>位置</th><td>____栋____层____号</td>
            <th>查验人</th><td>____________</td>
          </tr>
        </table>

        <table class="print-data-table">
          <colgroup>
            <col class="col-seq">
            <col class="col-item">
            <col class="col-standard">
            <col class="col-result">
          </colgroup>
          <thead>
            <tr>
              <th>序号</th>
              <th>检查项目</th>
              <th>检查标准</th>
              <th>查验结果</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, ii) in tpl.items" :key="ii">
              <td class="cell-center">{{ ii+1 }}</td>
              <td class="cell-top">{{ item.item_name }}</td>
              <td class="cell-top">{{ item.check_standard }}</td>
              <td class="cell-top"></td>
            </tr>
            <tr v-for="n in paddingRows(tpl.items?.length || 0)" :key="'pad_'+n" class="row-pad">
              <td class="cell-center">&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
            </tr>
          </tbody>
        </table>

        <table class="print-footer-table">
          <tr><th>查验意见</th><td class="comment-cell">&nbsp;</td></tr>
          <tr class="signature-row">
            <td class="signature-cell">查验人签字：<div class="signature-line"></div></td>
            <td class="signature-cell">日期：<div class="signature-line"></div></td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Filled record documents -->
    <div v-for="(record, ri) in printRecords" :key="'r_'+record.id" class="print-document">
      <div class="print-frame">
          <div class="print-company">瑞界物业 查验记录表</div>
          <div class="print-form-title">{{ cleanTitle(record.template_title) }}</div>
          <table class="print-info-table">
            <colgroup>
              <col class="info-label-col"><col class="info-value-col">
              <col class="info-label-col"><col class="info-value-col">
            </colgroup>
            <tr>
              <th>项目名称</th><td>{{ projectName }}</td>
              <th>查验日期</th><td>{{ record.updated_at?.slice(0,10) }}</td>
            </tr>
            <tr>
              <th>位置</th><td>{{ record.building_name || '' }} {{ record.house_number || '' }} {{ record.location_info || '' }}</td>
              <th>查验人</th><td>{{ record.creator_name }}</td>
            </tr>
          </table>

        <table class="print-data-table">
          <colgroup>
            <col class="col-seq">
            <col class="col-item">
            <col class="col-standard">
            <col class="col-result">
          </colgroup>
          <thead>
            <tr>
              <th>序号</th>
              <th>检查项目</th>
              <th>检查标准</th>
              <th>查验结果</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, ii) in record.printItems" :key="ii">
              <td class="cell-center">{{ ii+1 }}</td>
              <td class="cell-top">{{ item.item_name || item.custom_item_name }}</td>
              <td class="cell-top">{{ item.check_standard || item.custom_standard }}</td>
              <td class="cell-top">
                <span v-if="item.result==='pass'" class="result-pass">合格</span>
                <span v-else-if="item.result==='fail'" class="result-fail">不合格
                  <div v-if="item.problem_description" class="problem-desc">{{ item.problem_description }}</div>
                </span>
                <span v-else-if="item.result==='skip'" class="result-skip">免检</span>
                <span v-else class="result-pending">—</span>
              </td>
            </tr>
            <tr v-for="n in paddingRows(record.printItems?.length || 0)" :key="'pad_'+n" class="row-pad">
              <td class="cell-center">&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
            </tr>
          </tbody>
        </table>

        <table class="print-footer-table">
          <tr><th>查验意见</th><td class="comment-cell">{{ record.inspector_comment || '' }}</td></tr>
          <tr class="signature-row">
            <td class="signature-cell">查验人签字：<div class="signature-line"></div></td>
            <td class="signature-cell">日期：<div class="signature-line"></div></td>
          </tr>
        </table>
      </div>

      <!-- Photos: always on a new page -->
      <div v-if="record.photos?.length" class="print-photo-section">
        <div class="print-frame">
          <div class="print-company" style="font-size:14pt">照片附件 — {{ cleanTitle(record.template_title) }}</div>
          <table class="print-photo-table">
            <tbody>
              <tr v-for="(p, pi) in record.photos" :key="pi">
                <td class="photo-img-cell"><img :src="'/uploads/' + p.filename" class="print-photo" /></td>
                <td class="photo-info-cell">
                  <div class="photo-name">{{ p.original_name }}</div>
                  <div class="photo-date">{{ p.uploaded_at }}</div>
                </td>
              </tr>
            </tbody>
          </table>
          <table class="print-footer-table">
            <tr class="signature-row">
              <td class="signature-cell">查验人签字：<div class="signature-line"></div></td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'
import { cleanTitle } from '../utils/title'
// pdf-builder is loaded dynamically to avoid bloating initial bundle

const route = useRoute()
const router = useRouter()
const printRecords = ref([])
const blankTemplates = ref([])
const projectName = ref('')
const loading = ref(true)
const pdfLoading = ref(false)
const window = globalThis

const ROWS_PER_PAGE = 20

function paddingRows(count) {
  if (count <= 10) return 0
  const remainder = count % ROWS_PER_PAGE
  return remainder === 0 ? 0 : ROWS_PER_PAGE - remainder
}

async function downloadPdf() {
  pdfLoading.value = true
  try {
    const { buildBlankPdf, buildRecordPdf } = await import('../pdf-builder.js')
    let pdf
    if (printRecords.value.length > 0) {
      pdf = await buildRecordPdf(printRecords.value, projectName.value)
    } else {
      pdf = await buildBlankPdf(blankTemplates.value, projectName.value)
    }
    pdf.download('查验记录表.pdf')
  } catch (e) {
    console.error('PDF generation failed:', e)
    alert('PDF生成失败：' + e.message)
  } finally {
    pdfLoading.value = false
  }
}

onMounted(async () => {
  const recordIds = JSON.parse(localStorage.getItem('printRecords') || '[]')
  const blankIds = JSON.parse(localStorage.getItem('printBlankTemplates') || '[]')

  const blankPromises = blankIds.map(async (id) => {
    if (id.startsWith('f_')) {
      const { data: f } = await api.get('/forms/' + id.replace('f_', ''))
      return { form_id: f.form_id || f.template_form_id || '', title: f.title, items: f.items || [], projectId: f.project_id, type: 'form' }
    }
    const { data: t } = await api.get('/templates/' + id.replace('t_', ''))
    return { ...t, type: 'template' }
  })

  const recordPromises = recordIds.map(async (id) => {
    const { data } = await api.get('/records/' + id)
    return { ...data, printItems: data.results || [], projectId: data.project_id, template_form_id: data.form_id || '' }
  })

  const [loadedBlanks, loadedRecords] = await Promise.all([
    Promise.all(blankPromises),
    Promise.all(recordPromises)
  ])

  for (const b of loadedBlanks) {
    const { type, projectId, ...rest } = b
    blankTemplates.value.push(rest)
    if (projectId && !projectName.value) {
      const { data: p } = await api.get('/projects/' + projectId)
      projectName.value = p.name
    }
  }

  printRecords.value = loadedRecords

  if (!projectName.value && loadedRecords.length > 0) {
    const { data: p } = await api.get('/projects/' + loadedRecords[0].project_id)
    projectName.value = p.name
  }

  if (!projectName.value) projectName.value = '____________'

  loading.value = false
})
</script>

<style scoped>
/* === Document: one per form/record === */
.print-document {
  page-break-after: always;
  margin-bottom: 24px;
  background: #fff;
}

/* === Unified outer frame — single 2px border around all content === */
.print-frame {
  border: 2px solid #333;
}

.print-company {
  text-align: center;
  font-size: 16pt;
  font-weight: 700;
  padding: 8px 0;
  background: #f0f0f0;
  letter-spacing: 2px;
}

.print-form-title {
  text-align: center;
  font-size: 11pt;
  padding: 5px 0;
  background: #f8f8f8;
  color: #555;
}

/* === Info table: only cell borders === */
.print-info-table {
  width: 100%;
  border-collapse: collapse;
}

.print-info-table th,
.print-info-table td {
  border: 1px solid #999;
  padding: 5px 8px;
  font-size: 10pt;
}

.print-info-table th {
  background: #f5f5f5;
  font-weight: 600;
  font-size: 9.5pt;
  text-align: center;
}

.info-label-col { width: 14%; }
.info-value-col { width: 36%; }

/* === Data table: only cell borders, header row repeats on each page === */
.print-data-table {
  width: 100%;
  border-collapse: collapse;
}

.print-data-table th,
.print-data-table td {
  border: 1px solid #999;
  padding: 6px 8px;
  font-size: 10pt;
  line-height: 1.5;
}

.print-data-table thead th {
  background: #f5f5f5;
  font-weight: 600;
  font-size: 9.5pt;
  text-align: center;
}

.col-seq { width: 3.5%; }
.col-item { width: 10%; }
.col-standard { width: 48%; }
.col-result { width: 38.5%; }

/* === Cells === */
.cell-center { text-align: center; vertical-align: middle; }
.cell-top { vertical-align: top; text-align: left; }

/* === Result indicators === */
.result-pass { font-weight: 600; color: #188038; }
.result-fail { font-weight: 600; color: #c5221f; }
.result-skip { font-weight: 600; color: #5f6368; }
.result-pending { color: #999; }
.problem-desc { font-size: 9pt; color: #c5221f; margin-top: 2px; line-height: 1.4; font-weight: normal; }

/* === Footer table === */
.print-footer-table {
  width: 100%;
  border-collapse: collapse;
  break-inside: avoid;
}

.print-footer-table th {
  width: 14%;
  background: #f5f5f5;
  font-weight: 600;
  font-size: 9.5pt;
  text-align: center;
  border: 1px solid #999;
  padding: 5px 8px;
}

.print-footer-table td {
  border: 1px solid #999;
  padding: 5px 8px;
  font-size: 10pt;
}

.comment-cell {
  height: 80px;
  vertical-align: top;
}

/* === Signature === */
.signature-row td {
  border: none;
  padding: 24px 12px 8px;
}

.signature-cell {
  text-align: left;
  font-size: 10.5pt;
}

.signature-line {
  margin-top: 32px;
  border-bottom: 1px solid #333;
  width: 70%;
  min-width: 160px;
}

/* === Photos === */
.print-photo-section {
  page-break-before: always;
  margin-top: 16px;
}

.print-photo-table {
  width: 100%;
  border-collapse: collapse;
}

.print-photo-table td {
  border: 1px solid #999;
  padding: 8px;
  font-size: 10pt;
}

.photo-img-cell { width: 60%; }
.photo-info-cell { width: 40%; }

.print-photo {
  max-width: 100%;
  max-height: 180px;
  display: block;
  object-fit: contain;
}

.photo-name { font-size: 10pt; }
.photo-date { font-size: 9pt; color: #888; margin-top: 4px; }

/* === Print media === */
@media print {
  .print-document { margin-bottom: 0; }
  @page { margin: 10mm; size: A4; }
}
</style>
