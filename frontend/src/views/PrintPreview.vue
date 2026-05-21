<template>
  <div>
    <div class="page-header no-print">
      <h1 class="page-title">打印预览</h1>
      <div class="flex gap-8">
        <button class="btn" @click="window.print()">开始打印</button>
        <button class="btn btn-outline" @click="router.back()">返回</button>
      </div>
    </div>

    <div v-if="loading" class="empty no-print">加载中...</div>

    <!-- Blank template pages -->
    <div v-for="(tpl, ti) in blankTemplates" :key="'bt_'+ti" class="print-page">
      <div class="print-form">
        <table class="print-table">
          <thead>
            <tr><th colspan="4" class="print-title">物业承接查验记录表 <span style="font-weight:400;font-size:13px">{{ tpl.form_id }} {{ tpl.title }}</span></th></tr>
            <tr>
              <th style="width:15%">项目名称</th><td style="width:35%">{{ projectName }}</td>
              <th style="width:15%">查验日期</th><td style="width:35%">____年____月____日</td>
            </tr>
            <tr>
              <th>位置</th><td>____栋____层____号</td>
              <th>查验人</th><td>____________</td>
            </tr>
            <tr>
              <th style="width:8%">序号</th>
              <th style="width:18%">检查项目</th>
              <th style="width:40%">检查标准</th>
              <th style="width:34%">查验结果</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, ii) in tpl.items" :key="ii">
              <td class="text-center">{{ ii+1 }}</td>
              <td class="cell-top">{{ item.item_name }}</td>
              <td class="cell-top text-sm">{{ item.check_standard }}</td>
              <td class="cell-top"></td>
            </tr>
            <tr v-for="_ in paddingRows(tpl.items?.length || 0)" :key="'pad_'+_">
              <td class="text-center">&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
            </tr>
          </tbody>
          <tfoot>
            <tr><th style="width:15%">查验意见</th><td colspan="3" style="min-height:50px">&nbsp;</td></tr>
            <tr class="signature-row">
              <td colspan="2" class="signature-cell"><div>查验人签字：</div><div class="signature-line"></div></td>
              <td colspan="2" class="signature-cell"><div>日期：</div><div class="signature-line"></div></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Filled record pages -->
    <div v-for="(record, ri) in printRecords" :key="'r_'+record.id" class="print-page">
      <div class="print-form">
        <table class="print-table">
          <thead>
            <tr><th colspan="4" class="print-title">物业承接查验记录表 <span style="font-weight:400;font-size:13px">{{ record.template_form_id }} {{ record.template_title }}</span></th></tr>
            <tr>
              <th style="width:15%">项目名称</th><td style="width:35%">{{ projectName }}</td>
              <th style="width:15%">查验日期</th><td style="width:35%">{{ record.updated_at?.slice(0,10) }}</td>
            </tr>
            <tr>
              <th>位置</th><td>{{ record.building_name || '' }} {{ record.house_number || '' }} {{ record.location_info || '' }}</td>
              <th>查验人</th><td>{{ record.creator_name }}</td>
            </tr>
            <tr>
              <th style="width:8%">序号</th>
              <th style="width:18%">检查项目</th>
              <th style="width:40%">检查标准</th>
              <th style="width:34%">查验结果</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, ii) in record.printItems" :key="ii">
              <td class="text-center">{{ ii+1 }}</td>
              <td class="cell-top">{{ item.item_name || item.custom_item_name }}</td>
              <td class="cell-top text-sm">{{ item.check_standard || item.custom_standard }}</td>
              <td class="cell-top">
                <span v-if="item.result==='pass'" class="badge badge-pass">合格</span>
                <span v-else-if="item.result==='fail'">不合格
                  <div v-if="item.problem_description" class="text-sm" style="color:#c5221f;margin-top:4px">{{ item.problem_description }}</div>
                </span>
                <span v-else-if="item.result==='skip'" class="badge badge-skip">免检</span>
                <span v-else>—</span>
              </td>
            </tr>
            <tr v-for="_ in paddingRows(record.printItems?.length || 0)" :key="'pad_'+_">
              <td class="text-center">&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
            </tr>
          </tbody>
          <tfoot>
            <tr><th style="width:15%">查验意见</th><td colspan="3">{{ record.inspector_comment || '' }}</td></tr>
            <tr class="signature-row">
              <td colspan="2" class="signature-cell"><div>查验人签字：</div><div class="signature-line"></div></td>
              <td colspan="2" class="signature-cell"><div>日期：</div><div class="signature-line"></div></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Photos page -->
      <div v-if="record.photos?.length" class="print-form print-photo-page">
        <table class="print-table">
          <thead><tr><th colspan="2" class="print-title">照片附件 — {{ record.template_title }}</th></tr></thead>
          <tbody>
            <tr v-for="(p, pi) in record.photos" :key="pi">
              <td style="width:60%"><img :src="'/uploads/' + p.filename" class="print-photo" /></td>
              <td style="width:40%" class="text-sm">
                <div>{{ p.original_name }}</div>
                <div class="text-secondary mt-8">{{ p.uploaded_at }}</div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="signature-row">
              <td colspan="2" class="signature-cell"><div>查验人签字：</div><div class="signature-line"></div></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'

const route = useRoute()
const router = useRouter()
const printRecords = ref([])
const blankTemplates = ref([])
const projectName = ref('')
const loading = ref(true)
const window = globalThis

function paddingRows(count) {
  return Math.max(0, 15 - count)
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
.print-page { page-break-after: always; margin-bottom: 24px; }
.print-form { background: #fff; padding: 0; }
.print-title { text-align: center; font-size: 16px; font-weight: 700; padding: 12px !important; background: #f0f0f0 !important; }
.print-table { border: 2px solid #333; width: 100%; }
.print-table th, .print-table td { border: 1px solid #999; padding: 6px 8px; }
.print-table th { background: #f5f5f5; font-weight: 600; }
.cell-top { vertical-align: top; text-align: left; }
.signature-row td { border: none; padding: 20px 12px; }
.signature-cell { text-align: left; }
.signature-line { margin-top: 24px; border-bottom: 1px solid #333; height: 1px; }
.print-photo { max-width: 100%; max-height: 200px; display: block; }
.print-photo-page { page-break-before: always; }

@media print {
  .print-page { margin-bottom: 0; }
  .print-form { box-shadow: none; }
  @page { margin: 12mm; size: A4; }
}
</style>
