<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">{{ recordTypeLabel }}</h1>
      <button class="btn btn-sm" @click="showCreate=true">+ 新增记录</button>
    </div>

    <div class="filter-bar">
      <select v-model="filters.template_id" class="select" @change="loadRecords">
        <option :value="null">全部表单</option>
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
    <div v-else class="data-grid">
      <div v-for="r in records" :key="r.id" class="data-grid-item clickable" @click="openRecord(r)">
        <div class="item-main">
          <div class="item-title-row">
            <span v-if="r.template_form_id" class="badge badge-pass">{{ r.template_form_id }}</span>
            <span class="cell-title">{{ r.template_title || r.form_title || '未命名记录' }}</span>
          </div>
          <span class="cell-meta">{{ r.creator_name }} · {{ r.building_name || '' }} {{ r.location_info || '' }} · {{ formatDate(r.updated_at || r.created_at) }} · {{ r.item_count || 0 }} 项<span v-if="r.fail_count" class="cell-fail"> · {{ r.fail_count }} 不合格</span></span>
        </div>
        <div class="item-actions">
          <span class="badge" :class="statusBadgeMap[r.status] || 'badge-pending'">{{ statusLabelMap[r.status] || r.status }}</span>
          <span v-if="r.submitted" class="badge badge-submitted">已提交</span>
          <button v-if="canDelete(r)" class="action-btn danger" @click.stop="del(r)">删除</button>
        </div>
      </div>
      <div v-if="records.length === 0" class="data-grid-empty">
        <div class="empty-icon">{{ recordTypeEmoji }}</div>
        <div class="empty-title">暂无检查记录</div>
        <div class="empty-desc">点击右上角「+ 新增记录」开始录入</div>
      </div>
    </div>

    <!-- Create record modal: select form -->
    <div class="modal" v-if="showCreate" @click.self="showCreate=false">
      <div class="modal-card modal-card-sm modal-scroll">
        <h3>新增检查记录</h3>
        <p class="text-sm text-secondary">选择要检查的表单</p>
        <div v-if="myForms.length === 0" class="empty text-sm">暂无可用表单，请先在「我的表单」中创建</div>
        <div v-for="f in myForms" :key="f.id" class="card form-select-item" @click="createRecord(f)">
          <div style="font-weight:500;font-size:14px">
            <span v-if="f.template_form_id" class="badge badge-pass mr-4">{{ f.template_form_id }}</span>
            {{ f.title }}
          </div>
          <div class="text-sm text-secondary">{{ f.item_count || 0 }} 项 · {{ f.creator_name }}</div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showCreate=false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api'
import { formatDate } from '../utils/format'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const projectId = route.params.id
const records = ref([])
const templates = ref([])
const myForms = ref([])
const buildings = ref([])
const loading = ref(true)
const filters = ref({ template_id: null, building_id: null, status: '' })
const recordType = computed(() => route.meta.recordType || 'routine')
const recordTypeLabel = computed(() => recordType.value === 'acceptance' ? '🏗 承接查验' : '📝 日常巡检')
const recordTypeEmoji = computed(() => recordType.value === 'acceptance' ? '🏗' : '📝')
const recordsUrl = () => '/records?project_id=' + projectId + '&record_type=' + recordType.value
const showCreate = ref(false)

async function fetchData() {
  loading.value = true
  const [{ data: r }, { data: t }, { data: f }, { data: b }] = await Promise.all([
    api.get(recordsUrl()),
    api.get('/templates'),
    api.get('/forms?project_id=' + route.params.id),
    api.get('/projects/' + route.params.id + '/buildings')
  ])
  records.value = r
  templates.value = t
  myForms.value = f
  buildings.value = b
  loading.value = false
}

onMounted(fetchData)

watch(() => [route.params.id, route.meta.recordType], () => {
  if (route.params.id) fetchData()
})

async function loadRecords() {
  loading.value = true
  let url = recordsUrl()
  if (filters.value.template_id) url += '&template_id=' + filters.value.template_id
  if (filters.value.building_id) url += '&building_id=' + filters.value.building_id
  if (filters.value.status) url += '&status=' + filters.value.status
  const { data } = await api.get(url)
  records.value = data
  loading.value = false
}

const statusBadgeMap = { completed: 'badge-completed', in_progress: 'badge-in_progress', pending: 'badge-pending' }
const statusLabelMap = { completed: '已完成', in_progress: '查验中', pending: '待查验' }

function canDelete(r) {
  if (r.submitted) return false
  return auth.isAdmin || r.created_by === auth.user?.id
}

function openRecord(r) {
  router.push('/projects/' + projectId + '/template/' + r.template_id + '?record=' + r.id)
}

async function del(r) {
  if (!confirm('确定删除此查验记录 "' + (r.template_title || '') + '"？\n此操作不可恢复，照片等数据将一并删除。')) return
  try {
    await api.delete('/records/' + r.id)
    records.value = records.value.filter(x => x.id !== r.id)
  } catch (e) {
    alert('删除失败：' + (e.response?.data?.error || '未知错误'))
  }
}

async function createRecord(f) {
  showCreate.value = false
  const tid = f.template_id || 0
  router.push('/projects/' + projectId + '/template/' + tid + '?form=' + f.id + '&inspect=1&record_type=' + recordType.value)
}
</script>
