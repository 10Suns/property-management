<template>
  <div>
    <div class="page-header">
      <div class="flex items-center gap-8">
        <router-link :to="'/projects/' + projectId" class="btn btn-sm btn-outline">← 返回</router-link>
        <h1 class="page-title">打印表单</h1>
      </div>
      <button class="btn" @click="doPrint" :disabled="selected.length + selectedForms.length === 0">打印已选（{{ selected.length + selectedForms.length }}）</button>
    </div>

    <p class="text-sm text-secondary mb-12">选择要打印的查验记录，或从下方「我的表单」打印空白表。</p>

    <div v-if="loading" class="empty">加载中...</div>
    <template v-else>
      <!-- My forms for blank printing -->
      <div class="flex items-center gap-8 mb-8">
        <h3 style="font-size:14px">我的表单（空白表）</h3>
        <button class="btn btn-sm btn-outline" @click="selectedForms = myForms.map(f => 'f_' + f.id)">全选</button>
        <button class="btn btn-sm btn-outline" @click="selectedForms = []">取消全选</button>
      </div>
      <div v-if="myForms.length === 0" class="empty text-sm">暂无个人表单，请在项目详情页创建</div>
      <div v-for="f in myForms" :key="'f_'+f.id" class="card">
        <label class="flex items-center gap-12" style="cursor:pointer">
          <input type="checkbox" :value="'f_'+f.id" v-model="selectedForms" style="width:18px;height:18px" />
          <div class="flex-1">
            <div style="font-weight:500">{{ f.title }}</div>
            <div class="text-sm text-secondary">{{ f.template_form_id || '自定义' }} · {{ f.item_count || 0 }} 个检查项 · {{ f.creator_name }}</div>
          </div>
        </label>
      </div>

      <!-- Inspection records -->
      <div class="flex items-center gap-8 mb-8 mt-16">
        <h3 style="font-size:14px">已填写的查验记录</h3>
        <button class="btn btn-sm btn-outline" @click="selected = records.map(r => r.id)">全选</button>
        <button class="btn btn-sm btn-outline" @click="selected = []">取消全选</button>
      </div>
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
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'

const route = useRoute()
const router = useRouter()
const projectId = route.params.id
const records = ref([])
const myForms = ref([])
const allTemplates = ref([])
const selected = ref([])
const selectedForms = ref([])
const loading = ref(true)
const filterTemplate = ref(null)

onMounted(async () => {
  const [{ data: r }, { data: f }, { data: t }] = await Promise.all([
    api.get('/records?project_id=' + projectId),
    api.get('/forms?project_id=' + projectId),
    api.get('/templates')
  ])
  records.value = r
  myForms.value = f
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
  localStorage.setItem('printBlankTemplates', JSON.stringify(selectedForms.value))
  router.push('/print-preview')
}
</script>
