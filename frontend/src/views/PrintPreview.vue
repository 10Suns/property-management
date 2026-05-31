<template>
  <div>
    <div class="page-header no-print">
      <h1 class="page-title">打印预览<span class="vi-print-inline">Xem trước khi in</span></h1>
      <div class="flex gap-8">
        <button class="btn" @click="window.print()">浏览器打印<span class="vi-print-inline">In trình duyệt</span></button>
        <button class="btn btn-outline" @click="router.back()">返回<span class="vi-print-inline">Quay lại</span></button>
      </div>
    </div>

    <div v-if="loading" class="empty no-print">加载中...</div>

    <template v-for="(doc, di) in allDocuments" :key="di">
      <!-- Page 1 -->
      <div class="print-document">
        <div class="print-page">
          <div class="print-company">{{ projectName }} 查验记录表<span class="vi-print">Phiếu kiểm tra</span></div>
          <div v-if="doc.subtitle" class="print-form-title">{{ doc.subtitle }}</div>
          <table class="print-info-table">
            <colgroup><col class="col-seq"><col class="col-item"><col class="col-standard"><col class="col-result"></colgroup>
            <tr><th colspan="2">项目名称<span class="vi-print-th">Tên dự án</span></th><td colspan="2">{{ doc.projectName }}</td></tr>
            <tr><th colspan="2">查验日期<span class="vi-print-th">Ngày kiểm tra</span></th><td colspan="2">{{ doc.dateStr }}</td></tr>
            <tr><th colspan="2">位置<span class="vi-print-th">Vị trí</span></th><td colspan="2">{{ doc.locationStr }}</td></tr>
            <tr><th colspan="2">查验人<span class="vi-print-th">Người kiểm tra</span></th><td colspan="2">{{ doc.inspectorName }}</td></tr>
          </table>
          <table class="print-data-table">
            <colgroup><col class="col-seq"><col class="col-item"><col class="col-standard"><col class="col-result"></colgroup>
            <thead><tr><th>序号<span class="vi-print-th">STT</span></th><th>检查项目<span class="vi-print-th">Hạng mục kiểm tra</span></th><th>检查标准<span class="vi-print-th">Tiêu chuẩn kiểm tra</span></th><th>查验结果<span class="vi-print-th">Kết quả kiểm tra</span></th></tr></thead>
            <tbody>
              <tr v-for="(item, ii) in doc.page1" :key="ii">
                <td class="cell-center">{{ item ? (ii + 1) : '&nbsp;' }}</td>
                <td class="cell-top">{{ item ? item.name : '' }}<span v-if="item && item.nameVi" class="vi-print">{{ item.nameVi }}</span></td>
                <td class="cell-top">{{ item ? item.standard : '' }}<span v-if="item && item.standardVi" class="vi-print">{{ item.standardVi }}</span></td>
                <td class="cell-top">
                  <template v-if="item">
                    <span v-if="item.resultClass" :class="item.resultClass">{{ item.resultLabel }}</span>
                    <span v-if="item.resultLabelVi" class="vi-print-inline">{{ item.resultLabelVi }}</span>
                    <div v-if="item.problem" class="problem-desc">{{ item.problem }}</div>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="print-comment">
            <table class="print-footer-table">
              <colgroup><col class="col-seq"><col class="col-item"><col class="col-standard"><col class="col-result"></colgroup>
              <tr><th colspan="2">查验意见<span class="vi-print-th">Ý kiến kiểm tra</span></th><td colspan="2" class="comment-cell">{{ doc.comment || '' }}</td></tr>
            </table>
          </div>
          <div class="print-page-filler"></div>
          <div class="print-signature">
            <div class="signature-item">
              <div class="signature-label">查验人签字：<span class="vi-print-inline">Người kiểm tra ký tên</span></div>
              <div class="signature-line"></div>
            </div>
            <div class="signature-item">
              <div class="signature-label">日期：<span class="vi-print-inline">Ngày</span></div>
              <div class="signature-line"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Page 2 -->
      <div v-if="doc.page2.length" class="print-document">
        <div class="print-page">
          <div class="print-company">{{ projectName }} 查验记录表（续）<span class="vi-print">Phiếu kiểm tra (tiếp theo)</span></div>
          <table class="print-data-table">
            <colgroup><col class="col-seq"><col class="col-item"><col class="col-standard"><col class="col-result"></colgroup>
            <thead><tr><th>序号<span class="vi-print-th">STT</span></th><th>检查项目<span class="vi-print-th">Hạng mục kiểm tra</span></th><th>检查标准<span class="vi-print-th">Tiêu chuẩn kiểm tra</span></th><th>查验结果<span class="vi-print-th">Kết quả kiểm tra</span></th></tr></thead>
            <tbody>
              <tr v-for="(item, ii) in doc.page2" :key="ii">
                <td class="cell-center">{{ PAGE1_ROWS + ii + 1 }}</td>
                <td class="cell-top">{{ item.name }}<span v-if="item.nameVi" class="vi-print">{{ item.nameVi }}</span></td>
                <td class="cell-top">{{ item.standard }}<span v-if="item.standardVi" class="vi-print">{{ item.standardVi }}</span></td>
                <td class="cell-top">
                  <span v-if="item.resultClass" :class="item.resultClass">{{ item.resultLabel }}</span>
                  <span v-if="item.resultLabelVi" class="vi-print-inline">{{ item.resultLabelVi }}</span>
                  <div v-if="item.problem" class="problem-desc">{{ item.problem }}</div>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="doc.photos?.length" class="print-photo-strip">
            <div class="photo-strip-label">照片附件：<span class="vi-print-inline">Ảnh đính kèm</span></div>
            <div class="photo-strip-items">
              <div v-for="(p, pi) in doc.photos.slice(0, 4)" :key="pi" class="photo-strip-item">
                <img :src="'/uploads/' + p.filename" class="print-photo-thumb" />
                <div class="photo-strip-name">{{ p.original_name }}</div>
              </div>
              <div v-if="doc.photos.length > 4" class="photo-strip-more">等{{ doc.photos.length }}张照片<span class="vi-print-inline">tổng {{ doc.photos.length }} ảnh</span></div>
            </div>
          </div>
          <div class="print-comment">
            <table class="print-footer-table">
              <colgroup><col class="col-seq"><col class="col-item"><col class="col-standard"><col class="col-result"></colgroup>
              <tr><th colspan="2">查验意见<span class="vi-print-th">Ý kiến kiểm tra</span></th><td colspan="2" class="comment-cell">&nbsp;</td></tr>
            </table>
          </div>
          <div class="print-page-filler"></div>
          <div class="print-signature">
            <div class="signature-item">
              <div class="signature-label">查验人签字：<span class="vi-print-inline">Người kiểm tra ký tên</span></div>
              <div class="signature-line"></div>
            </div>
            <div class="signature-item">
              <div class="signature-label">日期：<span class="vi-print-inline">Ngày</span></div>
              <div class="signature-line"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Page 3 -->
      <div v-if="doc.page3.length" class="print-document">
        <div class="print-page">
          <div class="print-company">{{ projectName }} 查验记录表（续二）<span class="vi-print">Phiếu kiểm tra (tiếp theo 2)</span></div>
          <table class="print-data-table">
            <colgroup><col class="col-seq"><col class="col-item"><col class="col-standard"><col class="col-result"></colgroup>
            <thead><tr><th>序号<span class="vi-print-th">STT</span></th><th>检查项目<span class="vi-print-th">Hạng mục kiểm tra</span></th><th>检查标准<span class="vi-print-th">Tiêu chuẩn kiểm tra</span></th><th>查验结果<span class="vi-print-th">Kết quả kiểm tra</span></th></tr></thead>
            <tbody>
              <tr v-for="(item, ii) in doc.page3" :key="ii">
                <td class="cell-center">{{ PAGE1_ROWS + PAGE2_ROWS + ii + 1 }}</td>
                <td class="cell-top">{{ item.name }}<span v-if="item.nameVi" class="vi-print">{{ item.nameVi }}</span></td>
                <td class="cell-top">{{ item.standard }}<span v-if="item.standardVi" class="vi-print">{{ item.standardVi }}</span></td>
                <td class="cell-top">
                  <span v-if="item.resultClass" :class="item.resultClass">{{ item.resultLabel }}</span>
                  <span v-if="item.resultLabelVi" class="vi-print-inline">{{ item.resultLabelVi }}</span>
                  <div v-if="item.problem" class="problem-desc">{{ item.problem }}</div>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="print-comment">
            <table class="print-footer-table">
              <colgroup><col class="col-seq"><col class="col-item"><col class="col-standard"><col class="col-result"></colgroup>
              <tr><th colspan="2">查验意见<span class="vi-print-th">Ý kiến kiểm tra</span></th><td colspan="2" class="comment-cell">&nbsp;</td></tr>
            </table>
          </div>
          <div class="print-page-filler"></div>
          <div class="print-signature">
            <div class="signature-item">
              <div class="signature-label">查验人签字：<span class="vi-print-inline">Người kiểm tra ký tên</span></div>
              <div class="signature-line"></div>
            </div>
            <div class="signature-item">
              <div class="signature-label">日期：<span class="vi-print-inline">Ngày</span></div>
              <div class="signature-line"></div>
            </div>
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
import { PAGE1_ROWS, PAGE2_ROWS, PAGE3_ROWS, splitItems } from '../utils/print-constants'
import { RESULT_MAP } from '../utils/translations'

const route = useRoute()
const router = useRouter()
const printRecords = ref([])
const blankTemplates = ref([])
const projectName = ref('')
const loading = ref(true)
const window = globalThis

function normalizeItem(item) {
  if (!item) return null
  const r = RESULT_MAP[item.result]
  return {
    name: item.item_name || item.custom_item_name,
    nameVi: item.item_name_vi || item.name_vi || item.custom_item_name_vi || '',
    standard: item.check_standard || item.custom_standard,
    standardVi: item.check_standard_vi || item.standard_vi || item.custom_standard_vi || '',
    resultLabel: r ? r.label : '—',
    resultLabelVi: r ? r.labelVi : '—',
    resultClass: item.result ? (r ? r.cls : 'result-pending') : null,
    problem: item.problem_description || null,
  }
}

// Pre-compute all documents as a flat list
const allDocuments = computed(() => {
  const docs = []

  for (const tpl of blankTemplates.value) {
    const items = (tpl.items || []).map(normalizeItem)
    const { page1, page2, page3 } = splitItems(items)
    docs.push({
      subtitle: cleanTitle(tpl.title),
      projectName: projectName.value,
      dateStr: '____年____月____日',
      locationStr: '____栋____层____号',
      inspectorName: '____________',
      comment: '',
      page1,
      page2,
      page3,
    })
  }

  for (const rec of printRecords.value) {
    const items = (rec.printItems || rec.results || []).map(normalizeItem)
    const { page1, page2, page3 } = splitItems(items)
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
      page3,
    })
  }

  return docs
})

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
      try {
        const { data: p } = await api.get('/projects/' + projectId)
        projectName.value = p.name
      } catch (_) {}
    }
  }

  printRecords.value = loadedRecords

  if (!projectName.value && loadedRecords.length > 0) {
    try {
      const { data: p } = await api.get('/projects/' + loadedRecords[0].project_id)
      projectName.value = p.name
    } catch (_) {}
  }

  // Fallback: load first available project
  if (!projectName.value) {
    try {
      const { data: projects } = await api.get('/projects')
      if (projects.length > 0) projectName.value = projects[0].name
    } catch (_) {}
  }

  if (!projectName.value) projectName.value = '____________'

  loading.value = false
})
</script>

<style scoped>
.print-document {
  margin-bottom: 24px;
}

.print-page {
  width: 210mm;
  height: 297mm;
  margin: 0 auto 16px;
  background: #fff;
  border: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  overflow: hidden;
  max-height: 2.8em;
}

.print-data-table thead th {
  background: #f5f5f5;
  font-weight: 600;
  font-size: 9pt;
  text-align: center;
}

.print-page-filler {
  flex: 1;
  min-height: 0;
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

.vi-print { display: block; font-size: 0.82em; color: #666; font-style: italic; }
.vi-print-inline { font-size: 0.82em; color: #666; font-style: italic; }
.vi-print-th { display: block; font-size: 0.75em; color: #888; font-style: italic; font-weight: normal; }

.print-comment {
  flex-shrink: 0;
}

.print-signature {
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
  height: 100px;
  vertical-align: top;
}

.print-signature {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.signature-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.signature-label {
  font-size: 10.5pt;
}

.signature-line {
  border-bottom: 1px solid #333;
  width: 60%;
  min-width: 200px;
}

.print-photo-strip {
  flex-shrink: 0;
  padding: 6px 8px;
  border-top: 1px solid #ccc;
}

.photo-strip-label {
  font-size: 9pt;
  font-weight: 600;
  margin-bottom: 4px;
  color: #555;
}

.photo-strip-items {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.photo-strip-item {
  text-align: center;
  max-width: 80px;
}

.print-photo-thumb {
  width: 72px;
  height: 54px;
  object-fit: cover;
  border: 1px solid #ddd;
  display: block;
}

.photo-strip-name {
  font-size: 7.5pt;
  color: #888;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 72px;
}

.photo-strip-more {
  font-size: 8pt;
  color: #999;
  display: flex;
  align-items: center;
}

@media print {
  .no-print { display: none; }
  html, body {
    margin: 0;
    padding: 0;
  }
  .print-document {
    margin: 0;
    padding: 0;
    break-inside: avoid;
  }
  .print-document + .print-document {
    break-before: page;
    page-break-before: always;
  }
  .print-page {
    width: 210mm;
    height: 297mm;
    margin: 0;
    border: none;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: none;
  }
  @page {
    margin: 0;
    size: A4;
  }
}
</style>
