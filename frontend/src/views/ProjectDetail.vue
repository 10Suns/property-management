<template>
  <div>
    <div class="page-header">
      <button class="btn btn-sm btn-outline" @click="router.push('/projects')">← 返回</button>
    </div>

    <div v-if="loading" class="empty">加载中...</div>
    <template v-else-if="project">
      <div class="page-header">
        <h1 class="page-title">{{ project.name }}</h1>
        <div class="flex gap-8">
          <button v-if="auth.isManager" class="btn btn-sm" @click="router.push('/projects/' + project.id + '/dashboard')">仪表盘</button>
          <button v-if="auth.isManager" class="btn btn-sm" @click="router.push('/projects/' + project.id + '/settings')">配置</button>
          <button class="btn btn-sm" @click="router.push('/projects/' + project.id + '/print')">打印</button>
          <button v-if="auth.isAdmin" class="btn btn-sm" @click="showEdit=true">编辑</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title mb-8">基本信息</div>
        <div class="form-row text-sm">
          <div><span class="text-secondary">类型：</span>{{ typeLabel }}</div>
          <div><span class="text-secondary">地址：</span>{{ project.address || '-' }}</div>
          <div><span class="text-secondary">面积：</span>{{ project.area || '-' }}</div>
          <div><span class="text-secondary">开发商：</span>{{ project.developer || '-' }}</div>
          <div><span class="text-secondary">交接日期：</span>{{ project.handover_date || '-' }}</div>
          <div><span class="text-secondary">物业经理：</span>{{ project.manager_name || '-' }} {{ project.manager_phone }}</div>
        </div>
      </div>

      <div class="tabs">
        <div class="tab" :class="{ active: tab === 'reference' }" @click="tab='reference'">参考表单</div>
        <div class="tab" :class="{ active: tab === 'myForms' }" @click="tab='myForms'; loadMyForms()">我的表单</div>
        <div class="tab" :class="{ active: tab === 'equipment' }" @click="tab='equipment'; loadEquipment()">设备档案</div>
      </div>

      <!-- 参考表单 -->
      <div v-if="tab === 'reference'">
        <p class="text-sm text-secondary mb-8">选择系统模板查看和创建个人表单，可自定义检查项后保存。</p>
        <div v-if="refTemplates.length === 0" class="empty">暂无可用模板</div>
        <div v-for="cat in refCategories" :key="cat.name" class="mb-16">
          <h3 class="text-sm text-secondary mb-8">{{ cat.name }}</h3>
          <div v-for="t in cat.templates" :key="t.id" class="list-item" @click="openTemplate(t)">
            <div class="list-item-body">
              <div class="list-item-title">{{ t.form_id }} — {{ t.title }}</div>
              <div class="list-item-sub">{{ t.item_count || 0 }} 个检查项</div>
            </div>
            <span class="list-item-arrow">›</span>
          </div>
        </div>
      </div>

      <!-- 我的表单 -->
      <div v-if="tab === 'myForms'">
        <div class="flex gap-8 mb-12">
          <button class="btn btn-sm" @click="showCreateBlank=true">+ 创建空白表单</button>
        </div>
        <div v-if="myForms.length === 0" class="empty">
          <p>暂无个人表单</p>
          <p class="text-sm mt-8">在「参考表单」中选择模板创建，或点击上方创建空白表单</p>
        </div>
        <div v-for="f in myForms" :key="f.id" class="card">
          <div class="card-header">
            <div>
              <span class="card-title">{{ f.title }}</span>
              <span class="text-sm text-secondary ml-8">{{ f.template_form_id || '' }} · {{ f.creator_name }}</span>
            </div>
            <div class="flex gap-8">
              <button class="btn btn-sm" @click="printBlank(f)">打印空白表</button>
              <button class="btn btn-sm" @click="startInspection(f)">开始查验</button>
              <button class="btn btn-sm btn-outline" @click="editMyForm(f)">编辑</button>
              <button class="btn btn-sm btn-outline" style="color:var(--danger);border-color:var(--danger)" @click="deleteForm(f)">删除</button>
            </div>
          </div>
          <div class="text-sm text-secondary">{{ f.item_count || 0 }} 个检查项</div>
        </div>
      </div>

      <!-- 设备档案 -->
      <div v-if="tab === 'equipment'">
        <div class="flex gap-8 mb-12 flex-wrap">
          <button v-if="auth.isManager" class="btn btn-sm" @click="showEquipAdd=true">+ 添加设备</button>
          <select v-model="equipFilter.category" class="select" style="width:auto" @change="loadEquipment">
            <option value="">全部分类</option>
            <option value="配电">配电</option><option value="消防">消防</option><option value="电梯">电梯</option>
            <option value="给排水">给排水</option><option value="暖通">暖通</option><option value="弱电">弱电</option><option value="其他">其他</option>
          </select>
          <select v-model="equipFilter.status" class="select" style="width:auto" @change="loadEquipment">
            <option value="">全部状态</option>
            <option value="normal">正常</option><option value="maintenance">保养中</option>
            <option value="repair">待修</option><option value="scrapped">已报废</option>
          </select>
        </div>
        <div v-if="equipError" class="empty">{{ equipError }}</div>
        <div v-else-if="equipment.length === 0" class="empty">暂无设备档案</div>
        <div v-for="eq in equipment" :key="eq.id" class="card">
          <div class="card-header">
            <span class="card-title">{{ eq.name }}</span>
            <div class="flex gap-8">
              <span class="badge" :class="statusClass(eq.status)">{{ statusLabel(eq.status) }}</span>
              <button v-if="auth.isManager" class="btn btn-sm btn-outline" @click="editEquipment(eq)">编辑</button>
              <button v-if="auth.isManager" class="btn btn-sm btn-outline" style="color:var(--danger);border-color:var(--danger)" @click="deleteEquipment(eq)">删除</button>
            </div>
          </div>
          <div class="form-row text-sm">
            <div><span class="text-secondary">分类：</span>{{ eq.category || '-' }}</div>
            <div><span class="text-secondary">型号：</span>{{ eq.model || '-' }}</div>
            <div><span class="text-secondary">编号：</span>{{ eq.serial_number || '-' }}</div>
            <div><span class="text-secondary">安装日期：</span>{{ eq.install_date || '-' }}</div>
            <div><span class="text-secondary">位置：</span>{{ eq.building_name || '' }} {{ eq.house_number || '' }} {{ eq.location || '' }}</div>
            <div><span class="text-secondary">备注：</span>{{ eq.notes || '-' }}</div>
          </div>
        </div>
      </div>
    </template>
  </div>

  <!-- Edit project modal -->
  <div class="modal" v-if="showEdit" @click.self="showEdit=false">
    <div class="modal-card">
      <h3>编辑项目</h3>
      <div class="form-group"><label class="form-label">项目名称</label><input v-model="editForm.name" class="input" /></div>
      <div class="form-group"><label class="form-label">地址</label><input v-model="editForm.address" class="input" /></div>
      <div class="form-group"><label class="form-label">面积</label><input v-model="editForm.area" class="input" /></div>
      <div class="form-group"><label class="form-label">开发商</label><input v-model="editForm.developer" class="input" /></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">物业经理</label><input v-model="editForm.manager_name" class="input" /></div>
        <div class="form-group"><label class="form-label">联系电话</label><input v-model="editForm.manager_phone" class="input" /></div>
      </div>
      <p class="error-msg" v-if="editError">{{ editError }}</p>
      <div class="modal-actions">
        <button class="btn" @click="doEdit" :disabled="editLoading">保存</button>
        <button class="btn btn-outline" @click="showEdit=false">取消</button>
      </div>
    </div>
  </div>

  <!-- Equipment modal -->
  <div class="modal" v-if="showEquipModal" @click.self="showEquipModal=false">
    <div class="modal-card" style="max-width:500px">
      <h3>{{ equipEditingId ? '编辑设备' : '添加设备' }}</h3>
      <div class="form-group"><label class="form-label">设备名称 *</label><input v-model="equipForm.name" class="input" /></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">分类</label><select v-model="equipForm.category" class="select"><option value="">选择</option><option value="配电">配电</option><option value="消防">消防</option><option value="电梯">电梯</option><option value="给排水">给排水</option><option value="暖通">暖通</option><option value="弱电">弱电</option><option value="其他">其他</option></select></div>
        <div class="form-group"><label class="form-label">状态</label><select v-model="equipForm.status" class="select"><option value="normal">正常</option><option value="maintenance">保养中</option><option value="repair">待修</option><option value="scrapped">已报废</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">型号</label><input v-model="equipForm.model" class="input" /></div>
        <div class="form-group"><label class="form-label">编号</label><input v-model="equipForm.serial_number" class="input" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">安装日期</label><input v-model="equipForm.install_date" type="date" class="input" /></div>
        <div class="form-group"><label class="form-label">位置</label><input v-model="equipForm.location" class="input" /></div>
      </div>
      <div class="form-group"><label class="form-label">备注</label><textarea v-model="equipForm.notes" class="textarea" rows="2"></textarea></div>
      <div class="modal-actions">
        <button class="btn" @click="saveEquipment" :disabled="equipSaving">{{ equipSaving ? '保存中...' : '保存' }}</button>
        <button class="btn btn-outline" @click="showEquipModal=false">取消</button>
      </div>
    </div>
  </div>

  <!-- Create blank form modal -->
  <div class="modal" v-if="showCreateBlank" @click.self="showCreateBlank=false">
    <div class="modal-card">
      <h3>创建空白表单</h3>
      <div class="form-group">
        <label class="form-label">表单标题 *</label>
        <input v-model="blankForm.title" class="input" placeholder="如：自建检查表" @keyup.enter="doCreateBlank" />
      </div>
      <p class="error-msg" v-if="blankError">{{ blankError }}</p>
      <div class="modal-actions">
        <button class="btn" @click="doCreateBlank" :disabled="blankLoading">创建</button>
        <button class="btn btn-outline" @click="showCreateBlank=false">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const project = ref(null)
const loading = ref(true)
const tab = ref('reference')
const refTemplates = ref([])
const myForms = ref([])
const showEdit = ref(false)
const editError = ref('')
const editLoading = ref(false)
const editForm = ref({})

// Equipment
const equipment = ref([])
const equipError = ref('')
const equipFilter = ref({ category: '', status: '' })
const showEquipAdd = ref(false)
const showEquipModal = ref(false)
const equipForm = ref({})
const equipEditingId = ref(null)
const equipSaving = ref(false)

// Create blank form
const showCreateBlank = ref(false)
const blankForm = ref({ title: '' })
const blankError = ref('')
const blankLoading = ref(false)

const typeLabel = computed(() => {
  const m = { industrial: '工业', commercial: '商业', residential: '住宅', other: '其他' }
  return m[project.value?.type] || project.value?.type
})

const refCategories = computed(() => {
  const cats = { 'A': { name: 'A. 设备用房', templates: [] }, 'B': { name: 'B. 公共部位', templates: [] }, 'C': { name: 'C. 室内', templates: [] }, 'D': { name: 'D. 资料', templates: [] } }
  for (const t of refTemplates.value) {
    const prefix = t.form_id.charAt(0)
    if (cats[prefix]) cats[prefix].templates.push(t)
  }
  return Object.values(cats).filter(c => c.templates.length > 0)
})

function statusClass(s) { return s === 'normal' ? 'badge-pass' : s === 'maintenance' ? 'badge-in_progress' : s === 'repair' ? 'badge-fail' : 'badge-skip' }
function statusLabel(s) { return s === 'normal' ? '正常' : s === 'maintenance' ? '保养中' : s === 'repair' ? '待修' : '已报废' }

onMounted(async () => {
  const pid = route.params.id
  const [{ data: p }, { data: t }] = await Promise.all([
    api.get('/projects/' + pid),
    api.get('/projects/' + pid + '/my-templates')
  ])
  project.value = p
  refTemplates.value = t
  loading.value = false
})

function openTemplate(t) {
  router.push('/projects/' + route.params.id + '/template/' + t.id)
}

// My forms
async function loadMyForms() {
  const { data } = await api.get('/forms?project_id=' + route.params.id)
  myForms.value = data
}

function editMyForm(f) {
  router.push('/projects/' + route.params.id + '/template/' + (f.template_id || 0) + '?form=' + f.id)
}

function startInspection(f) {
  router.push('/projects/' + route.params.id + '/template/' + (f.template_id || 0) + '?form=' + f.id)
}

function printBlank(f) {
  localStorage.setItem('printBlankTemplates', JSON.stringify(['f_' + f.id]))
  localStorage.setItem('printRecords', JSON.stringify([]))
  router.push('/print-preview')
}

async function deleteForm(f) {
  try {
    await api.delete('/forms/' + f.id)
    myForms.value = myForms.value.filter(x => x.id !== f.id)
  } catch (e) {
    alert('删除失败：' + (e.response?.data?.error || '未知错误'))
  }
}

async function doCreateBlank() {
  blankError.value = ''
  if (!blankForm.value.title.trim()) { blankError.value = '请输入标题'; return }
  blankLoading.value = true
  try {
    const { data } = await api.post('/forms', {
      project_id: parseInt(route.params.id),
      template_id: null,
      title: blankForm.value.title.trim(),
      items: []
    })
    showCreateBlank.value = false
    blankForm.value = { title: '' }
    await loadMyForms()
    tab.value = 'myForms'
    router.push('/projects/' + route.params.id + '/template/0?form=' + data.id)
  } catch (e) {
    blankError.value = e.response?.data?.error || '创建失败'
  } finally { blankLoading.value = false }
}

async function doEdit() {
  editError.value = ''
  editLoading.value = true
  try {
    const { data } = await api.put('/projects/' + route.params.id, editForm.value)
    project.value = data
    showEdit.value = false
  } catch (e) { editError.value = e.response?.data?.error || '保存失败' } finally { editLoading.value = false }
}
watch(showEdit, (v) => { if (v) editForm.value = { ...project.value } })

// Equipment
async function loadEquipment() {
  equipError.value = ''
  let url = '/equipment?project_id=' + route.params.id
  if (equipFilter.value.category) url += '&category=' + equipFilter.value.category
  if (equipFilter.value.status) url += '&status=' + equipFilter.value.status
  try {
    const { data } = await api.get(url)
    equipment.value = data
  } catch (e) {
    equipment.value = []
    equipError.value = e.response?.data?.error || '加载失败'
  }
}
function editEquipment(eq) { equipEditingId.value = eq.id; equipForm.value = { ...eq }; showEquipModal.value = true }
watch(showEquipAdd, (v) => {
  if (v) { equipEditingId.value = null; equipForm.value = { name: '', category: '', status: 'normal', model: '', serial_number: '', install_date: '', location: '', notes: '' }; showEquipModal.value = true }
})
async function saveEquipment() {
  if (!equipForm.value.name?.trim()) return
  equipSaving.value = true
  try {
    const body = { ...equipForm.value, project_id: parseInt(route.params.id) }
    if (equipEditingId.value) { await api.put('/equipment/' + equipEditingId.value, body) }
    else { await api.post('/equipment', body) }
    showEquipModal.value = false; showEquipAdd.value = false; loadEquipment()
  } finally { equipSaving.value = false }
}
async function deleteEquipment(eq) {
  if (!confirm('确定删除设备 "' + eq.name + '"？')) return
  await api.delete('/equipment/' + eq.id)
  loadEquipment()
}
</script>

<style scoped>
.ml-8 { margin-left: 8px; }
</style>
