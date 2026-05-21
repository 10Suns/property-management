<template>
  <div>
    <div class="page-header">
      <div class="flex items-center gap-8">
        <router-link :to="'/projects/' + projectId" class="btn btn-sm btn-outline">← 返回</router-link>
        <h1 class="page-title">查验记录</h1>
      </div>
      <router-link :to="'/projects/' + projectId + '/print'" class="btn btn-sm">打印表单</router-link>
    </div>

    <div class="filter-bar">
      <select v-model="filters.template_id" class="select" @change="loadRecords">
        <option :value="null">全部模板</option>
        <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.form_id }} {{ t.title }}</option>
      </select>
      <select v-model="filters.building_id" class="select" @change="loadRecords">
        <option :value="null">全部楼栋</option>
        <option v-for="b in buildings" :key="b.id" :value="b.id">{{ b.name }}</option>
      </select>
      <select v-model="filters.status" class="select" @change="loadRecords">
        <option value="">全部状态</option>
        <option value="pending">待查验</option>
        <option value="in_progress">查验中</option>
        <option value="completed">已完成</option>
      </select>
    </div>

    <div v-if="loading" class="empty">加载中...</div>
    <div v-else-if="records.length === 0" class="empty">
      <p>暂无查验记录</p>
      <p class="text-sm mt-8">请在项目详情页选择一个模板开始查验</p>
    </div>

    <div v-for="r in records" :key="r.id" class="list-item" @click="openRecord(r)">
      <div class="list-item-body">
        <div class="list-item-title">{{ r.template_title }}</div>
        <div class="list-item-sub">
          {{ r.creator_name }} · {{ r.building_name || r.house_number || r.location_info || '未指定位置' }}
          · {{ r.updated_at }}
        </div>
      </div>
      <span class="badge" :class="'badge-' + (r.status === 'completed' ? 'completed' : r.status === 'in_progress' ? 'in_progress' : 'pending')">{{ r.status === 'completed' ? '已完成' : r.status === 'in_progress' ? '查验中' : '待查验' }}</span>
      <span class="list-item-arrow">›</span>
    </div>
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
const templates = ref([])
const buildings = ref([])
const loading = ref(true)
const filters = ref({ template_id: null, building_id: null, status: '' })

onMounted(async () => {
  const [{ data: r }, { data: t }, { data: b }] = await Promise.all([
    api.get('/records?project_id=' + projectId),
    api.get('/templates'),
    api.get('/projects/' + projectId + '/buildings')
  ])
  records.value = r
  templates.value = t
  buildings.value = b
  loading.value = false
})

async function loadRecords() {
  loading.value = true
  let url = '/records?project_id=' + projectId
  if (filters.value.template_id) url += '&template_id=' + filters.value.template_id
  if (filters.value.building_id) url += '&building_id=' + filters.value.building_id
  if (filters.value.status) url += '&status=' + filters.value.status
  const { data } = await api.get(url)
  records.value = data
  loading.value = false
}

function openRecord(r) {
  router.push('/projects/' + projectId + '/template/' + r.template_id + '?record=' + r.id)
}
</script>
