<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">✅ 检查记录</h1>
      <button class="btn btn-sm" @click="showCreate=true">+ 新增记录</button>
    </div>

    <div class="filter-bar">
      <select v-model="filters.template_id" class="select" style="width:auto" @change="loadRecords">
        <option :value="null">全部表单</option>
        <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.form_id }} {{ t.title }}</option>
      </select>
      <select v-model="filters.building_id" class="select" style="width:auto" @change="loadRecords">
        <option :value="null">全部楼栋</option>
        <option v-for="b in buildings" :key="b.id" :value="b.id">{{ b.name }}</option>
      </select>
      <select v-model="filters.status" class="select" style="width:auto" @change="loadRecords">
        <option value="">全部状态</option>
        <option value="pending">待查验</option>
        <option value="in_progress">查验中</option>
        <option value="completed">已完成</option>
      </select>
    </div>

    <div v-if="loading" class="empty">加载中...</div>
    <div v-else-if="records.length === 0" class="empty" style="padding:60px 16px">
      <div style="font-size:48px;margin-bottom:12px">✅</div>
      <p style="font-weight:600;font-size:15px;margin-bottom:6px">暂无检查记录</p>
      <p class="text-sm">点击右上角「+ 新增记录」开始<br>选择表单和位置，即可逐项录入检查结果</p>
    </div>
    <div v-for="r in records" :key="r.id" class="card" style="cursor:pointer" @click="openRecord(r)">
      <div class="flex justify-between items-start">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px;margin-bottom:4px">{{ r.template_title || r.form_title || '未命名记录' }}</div>
          <div class="flex gap-12 text-sm text-secondary" style="flex-wrap:wrap">
            <span>{{ r.creator_name }}</span>
            <span v-if="r.building_name || r.location_info">{{ r.building_name }} {{ r.location_info || '' }}</span>
            <span>{{ formatDate(r.updated_at || r.created_at) }}</span>
            <span>{{ r.item_count || 0 }} 项</span>
            <span v-if="r.fail_count" style="color:var(--danger)">{{ r.fail_count }} 不合格</span>
          </div>
        </div>
        <div class="flex gap-8 items-center" style="flex-shrink:0;margin-left:12px">
          <span class="badge" :class="statusBadgeMap[r.status] || 'badge-pending'">{{ statusLabelMap[r.status] || r.status }}</span>
          <button v-if="canDelete(r)" class="btn btn-sm btn-danger-outline" @click.stop="del(r)">删除</button>
          <span class="text-secondary" style="font-size:18px">›</span>
        </div>
      </div>
    </div>

    <!-- Create record modal: select form -->
    <div class="modal" v-if="showCreate" @click.self="showCreate=false">
      <div class="modal-card" style="max-width:500px;max-height:70vh;overflow-y:auto">
        <h3>新增检查记录</h3>
        <p class="text-sm text-secondary">选择要检查的表单模板</p>
        <div v-if="templates.length === 0" class="empty text-sm">暂无可用的表单模板</div>
        <div v-for="t in templates" :key="t.id" class="card" style="cursor:pointer;padding:12px 16px;margin-bottom:6px" @click="createRecord(t)">
          <div style="font-weight:500;font-size:14px">{{ t.form_id }} {{ t.title }}</div>
          <div class="text-sm text-secondary">{{ t.item_count || 0 }} 项</div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showCreate=false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const projectId = route.params.id
const records = ref([])
const templates = ref([])
const buildings = ref([])
const loading = ref(true)
const filters = ref({ template_id: null, building_id: null, status: '' })
const showCreate = ref(false)

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

const statusBadgeMap = { completed: 'badge-completed', in_progress: 'badge-in_progress', pending: 'badge-pending' }
const statusLabelMap = { completed: '已完成', in_progress: '查验中', pending: '待查验' }

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('zh-CN')
}

function canDelete(r) {
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

async function createRecord(t) {
  showCreate.value = false
  try {
    const formTitle = t.title + ' - ' + (auth.user?.display_name || '用户')
    const { data: form } = await api.post('/forms', {
      project_id: parseInt(projectId),
      template_id: t.id,
      title: formTitle
    })
    router.push('/projects/' + projectId + '/template/' + t.id + '?form=' + form.id + '&inspect=1')
  } catch (e) {
    alert('创建失败：' + (e.response?.data?.error || '未知错误'))
  }
}
</script>
