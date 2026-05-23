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

    <template v-for="(doc, di) in allDocuments" :key="di">
      <div class="print-document">
        <!-- Page 1 -->
        <div class="print-page">
          <div class="print-company">瑞界物业 查验记录表</div>
          <div v-if="doc.subtitle" class="print-form-title">{{ doc.subtitle }}</div>
          <table class="print-info-table">
            <colgroup><col class="col-seq"><col class="col-item"><col class="col-standard"><col class="col-result"></colgroup>
            <tr><th colspan="2">项目名称</th><td colspan="2">{{ doc.projectName }}</td></tr>
            <tr><th colspan="2">查验日期</th><td colspan="2">{{ doc.dateStr }}</td></tr>
            <tr><th colspan="2">位置</th><td colspan="2">{{ doc.locationStr }}</td></tr>
            <tr><th colspan="2">查验人</th><td colspan="2">{{ doc.inspectorName }}</td></tr>
          </table>
          <table class="print-data-table">
            <colgroup><col class="col-seq"><col class="col-item"><col class="col-standard"><col class="col-result"></colgroup>
            <thead><tr><th>序号</th><th>检查项目</th><th>检查标准</th><th>查验结果</th></tr></thead>
            <tbody>
              <tr v-for="(item, ii) in doc.page1" :key="ii">
                <td class="cell-center">{{ item ? (ii + 1) : '&nbsp;' }}</td>
                <td class="cell-top">{{ item ? item.name : '' }}</td>
                <td class="cell-top">{{ item ? item.standard : '' }}</td>
                <td class="cell-top">
                  <template v-if="item">
                    <span v-if="item.resultClass" :class="item.resultClass">{{ item.resultLabel }}</span>
                    <div v-if="item.problem" class="problem-desc">{{ item.problem }}</div>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="print-footer">
            <table class="print-footer-table">
              <colgroup><col class="col-seq"><col class="col-item"><col class="col-standard"><col class="col-result"></colgroup>
              <tr><th colspan="2">查验意见</th><td colspan="2" class="comment-cell">{{ doc.comment || '' }}</td></tr>
              <tr class="signature-row">
                <td colspan="3" class="signature-cell">查验人签字：<div class="signature-line"></div></td>
                <td class="signature-cell">日期：<div class="signature-line"></div></td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Page 2 -->
        <div class="print-page">
          <div class="print-company">瑞界物业 查验记录表（续）</div>
          <table class="print-data-table">
            <colgroup><col class="col-seq"><col class="col-item"><col class="col-standard"><col class="col-result"></colgroup>
            <thead><tr><th>序号</th><th>检查项目</th><th>检查标准</th><th>查验结果</th></tr></thead>
            <tbody>
              <tr v-for="(item, ii) in doc.page2" :key="ii">
                <td class="cell-center">{{ item ? (PAGE1_ROWS + ii + 1) : '&nbsp;' }}</td>
                <td class="cell-top">{{ item ? item.name : '' }}</td>
                <td class="cell-top">{{ item ? item.standard : '' }}</td>
                <td class="cell-top">
                  <template v-if="item">
                    <span v-if="item.resultClass" :class="item.resultClass">{{ item.resultLabel }}</span>
                    <div v-if="item.problem" class="problem-desc">{{ item.problem }}</div>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="print-footer">
            <table class="print-footer-table">
              <colgroup><col class="col-seq"><col class="col-item"><col class="col-standard"><col class="col-result"></colgroup>
              <tr><th colspan="2">查验意见</th><td colspan="2" class="comment-cell">&nbsp;</td></tr>
              <tr class="signature-row">
                <td colspan="3" class="signature-cell">查验人签字：<div class="signature-line"></div></td>
                <td class="signature-cell">日期：<div class="signature-line"></div></td>
              </tr>
            </table>
          </div>
        </div>
      </div>

      <!-- Photos: separate page -->
      <div v-if="doc.photos?.length" class="print-document">
        <div class="print-page">
          <div class="print-company" style="font-size:14pt">照片附件 — {{ doc.subtitle }}</div>
          <table class="print-photo-table">
            <tbody>
              <tr v-for="(p, pi) in doc.photos" :key="pi">
                <td class="photo-img-cell"><img :src="'/uploads/' + p.filename" class="print-photo" /></td>
                <td class="photo-info-cell">
                  <div class="photo-name">{{ p.original_name }}</div>
                  <div class="photo-date">{{ p.uploaded_at }}</div>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="print-footer">
            <table class="print-footer-table">
              <tr class="signature-row">
                <td class="signature-cell">查验人签字：<div class="signature-line"></div></td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'
import { cleanTitle } from '../utils/title'
import { PAGE1_ROWS, PAGE2_ROWS, splitItems } from '../utils/print-constants'

const RESULT_MAP = {
  pass: { label: '合格', cls: 'result-pass' },
  fail: { label: '不合格', cls: 'result-fail' },
  skip: { label: '免检', cls: 'result-skip' },
}

const route = useRoute()
const router = useRouter()
const printRecords = ref([])
const blankTemplates = ref([])
const projectName = ref('')
const loading = ref(true)
const pdfLoading = ref(false)
const window = globalThis

function normalizeItem(item) {
  if (!item) return null
  const r = RESULT_MAP[item.result]
  return {
    name: item.item_name || item.custom_item_name,
    standard: item.check_standard || item.custom_standard,
    resultLabel: r ? r.label : '—',
    resultClass: item.result ? (r ? r.cls : 'result-pending') : null,
    problem: item.problem_description || null,
  }
}

// Pre-compute all documents as a flat list
const allDocuments = computed(() => {
  const docs = []

  for (const tpl of blankTemplates.value) {
    const items = (tpl.items || []).map(normalizeItem)
    const { page1, page2 } = splitItems(items)
    docs.push({
      subtitle: cleanTitle(tpl.title),
      projectName: projectName.value,
      dateStr: '____年____月____日',
      locationStr: '____栋____层____号',
      inspectorName: '____________',
      comment: '',
      page1,
      page2,
    })
  }

  for (const rec of printRecords.value) {
    const items = (rec.printItems || rec.results || []).map(normalizeItem)
    const { page1, page2 } = splitItems(items)
    docs.push({
      subtitle: cleanTitle(rec.template_title),
      projectName: projectName.value,
      dateStr: rec.updated_at?.slice(0, 10) || '____年____月____日',
      locationStr: [rec.building_name, rec.house_number, rec.location_info].filter(Boolean).join(' ') || ' ',
      inspectorName: rec.creator_name || '____________',
      comment: rec.inspector_comment || '',
      photos: rec.photos,
      page1,
      page2,
    })
  }

  return docs
})

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
.print-document {
  page-break-after: always;
  margin-bottom: 24px;
}

.print-page {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto 16px;
  background: #fff;
  border: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  page-break-after: always;
}

.print-company {
  text-align: center;
  font-size: 16pt;
  font-weight: 700;
  padding: 8px 0;
  background: #f0f0f0;
  letter-spacing: 2px;
  flex-shrink: 0;
}

.print-form-title {
  text-align: center;
  font-size: 11pt;
  padding: 5px 0;
  background: #f8f8f8;
  color: #555;
  flex-shrink: 0;
}

.print-info-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  flex-shrink: 0;
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

.print-data-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  flex-shrink: 0;
}

.print-data-table th,
.print-data-table td {
  border: 1px solid #999;
  padding: 5px 6px;
  font-size: 9.5pt;
  line-height: 1.4;
}

.print-data-table thead th {
  background: #f5f5f5;
  font-weight: 600;
  font-size: 9pt;
  text-align: center;
}

.col-seq { width: 4%; }
.col-item { width: 15%; }
.col-standard { width: 45%; }
.col-result { width: 36%; }

.cell-center { text-align: center; vertical-align: middle; }
.cell-top { vertical-align: top; text-align: left; }

.result-pass { font-weight: 600; color: #188038; }
.result-fail { font-weight: 600; color: #c5221f; }
.result-skip { font-weight: 600; color: var(--text-light); }
.result-pending { color: #999; }
.problem-desc { font-size: 8.5pt; color: #c5221f; margin-top: 2px; line-height: 1.3; font-weight: normal; }

.print-footer {
  flex-shrink: 0;
}

.print-footer-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}

.print-footer-table th {
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
  height: 200px;
  vertical-align: top;
}

.signature-row td {
  border: none;
  padding: 16px 12px 4px;
}

.signature-cell {
  text-align: left;
  font-size: 10.5pt;
}

.signature-line {
  margin-top: 24px;
  border-bottom: 1px solid #333;
  width: 70%;
  min-width: 140px;
}

.print-photo-table {
  width: 100%;
  border-collapse: collapse;
  flex-shrink: 0;
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
  max-height: 160px;
  display: block;
  object-fit: contain;
}

.photo-name { font-size: 10pt; }
.photo-date { font-size: 9pt; color: #888; margin-top: 4px; }

@media print {
  .no-print { display: none; }
  .print-document { margin-bottom: 0; }
  .print-page {
    width: auto;
    min-height: auto;
    margin: 0;
    border: none;
    page-break-after: always;
  }
  @page { margin: 8mm; size: A4; }
}
</style>
