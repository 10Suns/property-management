<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">📁 参考表单</h1>
    </div>
    <p class="text-sm text-secondary mb-16">{{ templates.length }} 套系统预设模板。点击「+ 创建」直接生成个人表单。</p>

    <div v-if="loading" class="empty">加载中...</div>
    <template v-else>
      <div v-for="cat in categories" :key="cat.name" class="mb-16">
        <h3 class="text-sm text-secondary mb-8" style="font-weight:600;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border);padding-bottom:6px">{{ cat.name }}</h3>
        <div class="template-grid">
          <div v-for="t in cat.templates" :key="t.id" class="card" style="padding:12px 16px;cursor:pointer" @click="createFromTemplate(t)">
            <div class="flex items-center justify-between">
              <div style="min-width:0">
                <span class="badge badge-pass" style="margin-right:8px;flex-shrink:0">{{ t.form_id }}</span>
                <span style="font-weight:500;font-size:14px">{{ t.title }}</span>
                <span class="text-sm text-secondary" style="margin-left:8px">{{ t.item_count || 0 }}项</span>
              </div>
              <span style="color:var(--primary);font-weight:500;font-size:12px;flex-shrink:0;margin-left:12px">+ 创建</span>
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

const route = useRoute()
const router = useRouter()
const templates = ref([])
const loading = ref(true)

const categories = computed(() => {
  const cats = {
    A: { name: 'A. 设备用房查验', templates: [] },
    B: { name: 'B. 公共部位查验', templates: [] },
    C: { name: 'C. 室内专有部分查验', templates: [] },
    D: { name: 'D. 资料与物品移交', templates: [] }
  }
  for (const t of templates.value) {
    const prefix = t.form_id ? t.form_id.charAt(0) : ''
    if (cats[prefix]) cats[prefix].templates.push(t)
  }
  return Object.values(cats).filter(c => c.templates.length > 0)
})

onMounted(async () => {
  try {
    const { data } = await api.get('/projects/' + route.params.id + '/my-templates')
    templates.value = data
  } catch (_) {
    templates.value = []
  } finally {
    loading.value = false
  }
})

function createFromTemplate(t) {
  router.push('/projects/' + route.params.id + '/template/' + t.id)
}
</script>

<style scoped>
.template-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
@media (max-width: 900px) { .template-grid { grid-template-columns: 1fr; } }
</style>
