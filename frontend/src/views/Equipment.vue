<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">🔧 设备档案</h1>
      <button v-if="auth.isManager" class="btn btn-sm" @click="openAdd">+ 添加设备</button>
    </div>

    <div class="filter-bar">
      <select v-model="filter.category" class="select" style="width:auto" @change="load">
        <option value="">全部分类</option>
        <option value="配电">配电</option><option value="消防">消防</option><option value="电梯">电梯</option>
        <option value="给排水">给排水</option><option value="暖通">暖通</option><option value="弱电">弱电</option><option value="其他">其他</option>
      </select>
      <select v-model="filter.status" class="select" style="width:auto" @change="load">
        <option value="">全部状态</option>
        <option value="normal">正常</option><option value="maintenance">保养中</option>
        <option value="repair">待修</option><option value="scrapped">已报废</option>
      </select>
    </div>

    <div v-if="error" class="empty">{{ error }}</div>
    <div v-else-if="list.length === 0" class="empty">暂无设备档案</div>
    <div v-for="eq in list" :key="eq.id" class="card">
      <div class="card-header">
        <span class="card-title" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:8px">{{ eq.name }}</span>
        <div class="flex gap-8" style="flex-shrink:0">
          <span class="badge" :class="statusClass(eq.status)">{{ statusLabel(eq.status) }}</span>
          <button v-if="auth.isManager" class="btn btn-sm btn-outline" @click="edit(eq)">编辑</button>
          <button v-if="auth.isManager" class="btn btn-sm btn-danger-outline" @click="del(eq)">删除</button>
        </div>
      </div>
      <div class="equip-info">
        <div><span class="text-secondary">分类：</span>{{ eq.category || '-' }}</div>
        <div><span class="text-secondary">型号：</span>{{ eq.model || '-' }}</div>
        <div><span class="text-secondary">编号：</span>{{ eq.serial_number || '-' }}</div>
        <div><span class="text-secondary">安装日期：</span>{{ eq.install_date || '-' }}</div>
        <div><span class="text-secondary">位置：</span>{{ [eq.building_name, eq.house_number, eq.location].filter(Boolean).join(' ') || '-' }}</div>
        <div><span class="text-secondary">备注：</span>{{ eq.notes || '-' }}</div>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal" v-if="showModal" @click.self="showModal=false">
      <div class="modal-card" style="max-width:500px">
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
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api'

const route = useRoute()
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

async function del(eq) {
  if (!confirm('确定删除设备 "' + eq.name + '"？')) return
  await api.delete('/equipment/' + eq.id)
  load()
}
</script>

<style scoped>
.equip-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 12px; font-size: 12px; color: var(--text); }
@media (max-width: 768px) { .equip-info { grid-template-columns: 1fr 1fr; } }
</style>
