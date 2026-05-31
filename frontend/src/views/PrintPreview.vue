<template>
  <div>
    <div class="page-header no-print">
      <h1 class="page-title">打印预览<span class="vi-inline">Xem trước khi in</span></h1>
      <div class="flex gap-8">
        <button class="btn" @click="printPdf">浏览器打印<span class="vi-inline">In trình duyệt</span></button>
        <button class="btn btn-outline" @click="router.back()">返回<span class="vi-inline">Quay lại</span></button>
      </div>
    </div>

    <div v-if="loading" class="empty no-print">正在生成预览...<span class="vi-inline">Đang tạo bản xem trước...</span></div>
    <div v-else-if="error" class="empty no-print" style="color:#c5221f">{{ error }}</div>

    <iframe
      v-show="!loading && !error"
      ref="pdfFrame"
      :src="pdfUrl"
      class="pdf-preview-frame"
      frameborder="0"
    ></iframe>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import { cleanTitle } from '../utils/title'
import { RESULT_MAP } from '../utils/translations'
import { buildPreviewPdf } from '../pdf-builder'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const pdfUrl = ref('')
const pdfFrame = ref(null)

function normalizeItem(item) {
  if (!item) return null
  const r = RESULT_MAP[item.result]
  return {
    name: item.item_name || item.custom_item_name || '',
    nameVi: item.item_name_vi || item.name_vi || item.custom_item_name_vi || '',
    standard: item.check_standard || item.custom_standard || '',
    standardVi: item.check_standard_vi || item.standard_vi || item.custom_standard_vi || '',
    result: item.result,
    resultLabel: r ? r.label : '—',
    resultLabelVi: r ? r.labelVi : '—',
    resultClass: item.result ? (r ? r.cls : 'result-pending') : null,
    problem_description: item.problem_description || null,
  }
}

onMounted(async () => {
  try {
    const recordIds = JSON.parse(localStorage.getItem('printRecords') || '[]')
    const blankIds = JSON.parse(localStorage.getItem('printBlankTemplates') || '[]')
    let projectName = ''

    // Fetch blank templates (from templates API or forms API)
    const blankPromises = blankIds.map(async (id) => {
      if (id.startsWith('f_')) {
        const { data: f } = await api.get('/forms/' + id.replace('f_', ''))
        return { ...f, _type: 'form' }
      }
      const { data: t } = await api.get('/templates/' + id.replace('t_', ''))
      return { ...t, _type: 'template' }
    })

    // Fetch records
    const recordPromises = recordIds.map(async (id) => {
      const { data } = await api.get('/records/' + id)
      return data
    })

    const [loadedBlanks, loadedRecords] = await Promise.all([
      Promise.all(blankPromises),
      Promise.all(recordPromises),
    ])

    // Build documents array for pdf-builder
    const documents = []

    for (const b of loadedBlanks) {
      const items = (b.items || []).map(normalizeItem).filter(Boolean)
      documents.push({
        title: b.title || b.form_id || '',
        dateStr: '____年____月____日',
        locationStr: '____栋____层____号',
        inspectorName: '____________',
        items,
        hasResults: false,
      })
      if (b.projectId && !projectName) {
        try {
          const { data: p } = await api.get('/projects/' + b.projectId)
          projectName = p.name
        } catch (_) {}
      }
    }

    for (const rec of loadedRecords) {
      const items = (rec.results || rec.printItems || []).map(normalizeItem).filter(Boolean)
      documents.push({
        title: rec.template_title || '',
        dateStr: rec.updated_at?.slice(0, 10) || '____年____月____日',
        locationStr: [rec.building_name, rec.house_number, rec.location_info].filter(Boolean).join(' ') || ' ',
        inspectorName: rec.creator_name || '____________',
        items,
        hasResults: true,
        photos: rec.photos || null,
        comment: rec.inspector_comment || '',
      })
      if (!projectName && rec.project_id) {
        try {
          const { data: p } = await api.get('/projects/' + rec.project_id)
          projectName = p.name
        } catch (_) {}
      }
    }

    // Fallback: try loading any project
    if (!projectName) {
      try {
        const { data: projects } = await api.get('/projects')
        if (projects.length > 0) projectName = projects[0].name
      } catch (_) {}
    }
    if (!projectName) projectName = '____________'

    // Generate PDF via pdfmake (handles pagination, fonts, bilingual, repeating footer)
    const pdfDoc = await buildPreviewPdf(documents, projectName)
    const blob = await new Promise((resolve) => pdfDoc.getBlob(resolve))
    pdfUrl.value = URL.createObjectURL(blob)
  } catch (e) {
    console.error('Print preview error:', e)
    error.value = '生成预览失败: ' + (e.message || '未知错误')
  } finally {
    loading.value = false
  }
})

function printPdf() {
  if (pdfFrame.value) {
    pdfFrame.value.contentWindow?.print()
  }
}
</script>

<style scoped>
.pdf-preview-frame {
  width: 100%;
  height: calc(100vh - 80px);
  border: none;
  background: #525659;
}

@media print {
  .no-print { display: none; }
  .pdf-preview-frame {
    position: fixed;
    top: 0; left: 0;
    width: 100vw;
    height: 100vh;
  }
}
</style>
