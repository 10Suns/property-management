<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">🔧 设备档案</h1>
      <button v-if="auth.isManager" class="btn btn-sm" @click="openAdd">+ 添加设备</button>
    </div>

    <div class="filter-bar">
      <select v-model="filter.category" class="select" @change="load">
        <option value="">全部分类</option>
        <option value="配电">配电</option><option value="消防">消防</option><option value="电梯">电梯</option>
        <option value="给排水">给排水</option><option value="暖通">暖通</option><option value="弱电">弱电</option><option value="其他">其他</option>
      </select>
      <select v-model="filter.status" class="select" @change="load">
        <option value="">全部状态</option>
        <option value="normal">正常</option><option value="maintenance">保养中</option>
        <option value="repair">待修</option><option value="scrapped">已报废</option>
      </select>
    </div>

    <div v-if="error" class="empty">{{ error }}</div>
    <div v-else class="data-grid">
      <div v-for="eq in list" :key="eq.id" class="data-grid-item clickable" @click="goDetail(eq)">
        <div class="item-main">
          <div class="item-title-row">
            <span v-if="eq.next_maintenance_date" class="maint-dot" :class="maintDotClass(eq)"></span>
            <span v-if="eq.category" class="badge badge-pass">{{ eq.category }}</span>
            <span class="cell-title">{{ eq.name }}</span>
          </div>
          <span class="cell-meta">型号：{{ eq.model || '-' }} · 编号：{{ eq.serial_number || '-' }} · 位置：{{ [eq.building_name, eq.house_number, eq.location].filter(Boolean).join(' ') || '-' }} · 安装：{{ eq.install_date || '-' }} · 备注：{{ eq.notes || '-' }}</span>
        </div>
        <div class="item-actions">
          <span class="badge" :class="statusClass(eq.status)">{{ statusLabel(eq.status) }}</span>
          <button class="action-btn primary" @click.stop="goDetail(eq)">查看</button>
          <button v-if="auth.isManager" class="action-btn" @click.stop="edit(eq)">编辑</button>
          <button v-if="auth.isManager" class="action-btn danger" @click.stop="del(eq)">删除</button>
        </div>
      </div>
      <div v-if="list.length === 0" class="data-grid-empty">
        <div class="empty-icon">🔧</div>
        <div class="empty-title">暂无设备档案</div>
        <div class="empty-desc">点击右上角「+ 添加设备」录入设备信息</div>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal" v-if="showModal" @click.self="showModal=false">
      <div class="modal-card modal-card-sm">
        <h3>{{ editingId ? '编辑设备' : '添加设备' }}</h3>
        <div class="form-group"><label class="form-label">设备名称 *</label><input v-model="form.name" class="input" /></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">分类</label><select v-model="form.category" class="select"><option value="">选择</option><option value="配电">配电</option><option value="消防">消防</option><option value="电梯">电梯</option><option value="给排水">给排水</option><option value="暖通">暖通</option><option value="弱电">弱电</option><option value="其他">其他</option></select></div>
          <div class="form-group"><label class="form-label">状态</label><select v-model="form.status" class="select"><option value="normal">正常</option><option value="maintenance">保养中</option><option value="repair">待修</option><option value="scrapped">已报废</option></select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">型号</label><input v-model="form.model" class="input" /></div>
          <div class="form-group"><label class="form-label">编号</label><input v-model="form.serial_number" class="input" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">安装日期</label><input v-model="form.install_date" type="date" class="input" /></div>
          <div class="form-group"><label class="form-label">位置</label><input v-model="form.location" class="input" /></div>
        </div>
        <div class="form-group"><label class="form-label">备注</label><textarea v-model="form.notes" class="textarea" rows="2"></textarea></div>
        <div class="modal-actions">
          <button class="btn" @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
          <button class="btn btn-outline" @click="showModal=false">取消</button>
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

const list = ref([])
const error = ref('')
const filter = ref({ category: '', status: '' })
const showModal = ref(false)
const form = ref({})
const editingId = ref(null)
const saving = ref(false)

const statusClassMap = { normal: 'badge-pass', maintenance: 'badge-in_progress', repair: 'badge-fail', scrapped: 'badge-skip' }
const statusLabelMap = { normal: '正常', maintenance: '保养中', repair: '待修', scrapped: '已报废' }
function statusClass(s) { return statusClassMap[s] || 'badge-skip' }
function statusLabel(s) { return statusLabelMap[s] || s }

onMounted(() => { load() })

async function load() {
  error.value = ''
  let url = '/equipment?project_id=' + route.params.id
  if (filter.value.category) url += '&category=' + filter.value.category
  if (filter.value.status) url += '&status=' + filter.value.status
  try {
    const { data } = await api.get(url)
    list.value = data
  } catch (e) {
    list.value = []
    error.value = e.response?.data?.error || '加载失败'
  }
}

function openAdd() {
  editingId.value = null
  form.value = { name: '', category: '', status: 'normal', model: '', serial_number: '', install_date: '', location: '', notes: '' }
  showModal.value = true
}

function edit(eq) {
  editingId.value = eq.id
  form.value = { ...eq }
  showModal.value = true
}

async function save() {
  if (!form.value.name?.trim()) return
  saving.value = true
  try {
    const body = { ...form.value, project_id: parseInt(route.params.id) }
    if (editingId.value) { await api.put('/equipment/' + editingId.value, body) }
    else { await api.post('/equipment', body) }
    showModal.value = false
    load()
  } finally { saving.value = false }
}

function goDetail(eq) {
  router.push(`/projects/${route.params.id}/equipment/${eq.id}`)
}

function maintDotClass(eq) {
  if (!eq.next_maintenance_date) return 'maint-dot-ok'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const next = new Date(eq.next_maintenance_date); next.setHours(0, 0, 0, 0)
  const diff = Math.floor((next - today) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'maint-dot-overdue'
  if (diff <= 7) return 'maint-dot-soon'
  return 'maint-dot-ok'
}

async function del(eq) {
  if (!confirm('确定删除设备 "' + eq.name + '"？')) return
  try {
    await api.delete('/equipment/' + eq.id)
    load()
  } catch (e) {
    alert('删除失败：' + (e.response?.data?.error || '未知错误'))
  }
}
</script>

