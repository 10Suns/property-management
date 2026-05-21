<template>
  <div>
    <div class="page-header">
      <div class="flex items-center gap-8">
        <router-link :to="'/projects/' + projectId" class="btn btn-sm btn-outline">← 返回</router-link>
        <h1 class="page-title">打印表单</h1>
      </div>
      <button class="btn" @click="doPrint" :disabled="selected.length + selectedBlanks.length === 0">打印已选（{{ selected.length + selectedBlanks.length }}）</button>
    </div>

    <p class="text-sm text-secondary mb-12">勾选要打印的查验记录，或从下方「空白表单」区选择模板打印空表。</p>

    <div v-if="loading" class="empty">加载中...</div>
    <template v-else>
      <!-- User forms (blank templates) -->
      <h3 class="mb-8" style="font-size:14px">空白表单（按模板打印）</h3>
      <div v-for="cat in categories" :key="cat.name" class="mb-12">
        <h4 class="text-sm text-secondary mb-8">{{ cat.name }}</h4>
        <div v-for="t in cat.templates" :key="'t_'+t.id" class="card">
          <label class="flex items-center gap-12" style="cursor:pointer">
            <input type="checkbox" :value="'t_'+t.id" v-model="selectedBlanks" style="width:18px;height:18px" />
            <div class="flex-1">
              <div style="font-weight:500">{{ t.form_id }} — {{ t.title }}</div>
              <div class="text-sm text-secondary">{{ t.item_count || 0 }} 个检查项 · 系统模板</div>
            </div>
          </label>
        </div>
      </div>

      <!-- Inspection records -->
      <h3 class="mb-8 mt-16" style="font-size:14px">已填写的查验记录</h3>
      <div class="filter-bar">
        <select v-model="filterTemplate" class="select" @change="loadRecords">
          <option :value="null">全部模板</option>
          <option v-for="t in allTemplates" :key="t.id" :value="t.id">{{ t.form_id }} {{ t.title }}</option>
        </select>
      </div>

      <div v-if="records.length === 0" class="empty">
        <p>暂无查验记录</p>
        <router-link :to="'/projects/' + projectId" class="btn mt-8">去查验</router-link>
      </div>

      <div v-for="r in records" :key="r.id" class="card">
        <label class="flex items-center gap-12" style="cursor:pointer">
          <input type="checkbox" :value="r.id" v-model="selected" style="width:18px;height:18px" />
          <div class="flex-1">
            <div style="font-weight:500">{{ r.template_title }}</div>
            <div class="text-sm text-secondary">
              {{ r.building_name || '' }} {{ r.house_number || '' }} {{ r.location_info || '' }}
              · {{ r.creator_name }} · {{ r.updated_at }}
            </div>
          </div>
          <span class="badge" :class="'badge-' + (r.status==='completed'?'completed':'in_progress')">{{ r.status==='completed'?'已完成':'查验中' }}</span>
        </label>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'

const route = useRoute()
const router = useRouter()
const projectId = route.params.id
const records = ref([])
const allTemplates = ref([])
const selected = ref([])
const selectedBlanks = ref([])
const loading = ref(true)
const filterTemplate = ref(null)

const categories = computed(() => {
  const cats = { 'A': { name: 'A. 设备用房', templates: [] }, 'B': { name: 'B. 公共部位', templates: [] }, 'C': { name: 'C. 室内', templates: [] }, 'D': { name: 'D. 资料', templates: [] } }
  for (const t of allTemplates.value) {
    const prefix = t.form_id.charAt(0)
    if (cats[prefix]) cats[prefix].templates.push(t)
  }
  return Object.values(cats).filter(c => c.templates.length > 0)
})

onMounted(async () => {
  const [{ data: r }, { data: t }] = await Promise.all([
    api.get('/records?project_id=' + projectId),
    api.get('/templates')
  ])
  records.value = r
  allTemplates.value = t
  loading.value = false
})

async function loadRecords() {
  loading.value = true
  let url = '/records?project_id=' + projectId
  if (filterTemplate.value) url += '&template_id=' + filterTemplate.value
  const { data } = await api.get(url)
  records.value = data
  loading.value = false
}

function doPrint() {
  localStorage.setItem('printRecords', JSON.stringify(selected.value))
  localStorage.setItem('printBlankTemplates', JSON.stringify(selectedBlanks.value))
  if (selected.value.length > 0 || selectedBlanks.value.length > 0) {
    router.push('/print-preview')
  }
}
</script>
