<template>
  <div>
    <div class="page-header">
      <button class="btn btn-outline btn-sm" @click="$router.back()">&larr; 返回</button>
      <h1 class="page-title">🔧 {{ eq.name }}</h1>
      <span></span>
    </div>

    <div class="tabs">
      <div class="tab" :class="{ active: tab === 'info' }" @click="tab = 'info'">基本信息</div>
      <div class="tab" :class="{ active: tab === 'maintenance' }" @click="tab = 'maintenance'">维护计划</div>
      <div class="tab" :class="{ active: tab === 'manuals' }" @click="tab = 'manuals'">说明书</div>
    </div>

    <!-- Tab: 基本信息 -->
    <div v-if="tab === 'info'" class="card">
      <div class="form-row">
        <div class="form-group"><label class="form-label">设备名称 *</label><input v-model="form.name" class="input" /></div>
        <div class="form-group"><label class="form-label">分类</label><select v-model="form.category" class="select"><option value="">选择</option><option value="配电">配电</option><option value="消防">消防</option><option value="电梯">电梯</option><option value="给排水">给排水</option><option value="暖通">暖通</option><option value="弱电">弱电</option><option value="其他">其他</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">型号</label><input v-model="form.model" class="input" /></div>
        <div class="form-group"><label class="form-label">编号</label><input v-model="form.serial_number" class="input" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">安装日期</label><input v-model="form.install_date" type="date" class="input" /></div>
        <div class="form-group"><label class="form-label">位置</label><input v-model="form.location" class="input" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">状态</label><select v-model="form.status" class="select"><option value="normal">正常</option><option value="maintenance">保养中</option><option value="repair">待修</option><option value="scrapped">已报废</option></select></div>
        <div class="form-group"><label class="form-label">所属楼栋 / 房屋</label><span class="text-sm text-secondary">{{ eq.building_name || '-' }} / {{ eq.house_number || '-' }}</span></div>
      </div>
      <div class="form-group"><label class="form-label">备注</label><textarea v-model="form.notes" class="textarea" rows="2"></textarea></div>
      <button v-if="auth.isManager" class="btn" @click="saveInfo" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
    </div>

    <!-- Tab: 维护计划 -->
    <div v-if="tab === 'maintenance'">
      <!-- 添加计划 -->
      <div v-if="auth.isManager" class="card">
        <div class="card-header">
          <h3 class="card-title">添加计划</h3>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">计划日期 *</label>
            <input v-model="planForm.scheduled_date" type="date" class="input" />
          </div>
          <div class="form-group">
            <label class="form-label">维护内容</label>
            <input v-model="planForm.content" class="input" placeholder="如：检查润滑油位、清洁滤网..." @keyup.enter="addPlan" />
          </div>
        </div>
        <button class="btn btn-sm" @click="addPlan" :disabled="planSaving">{{ planSaving ? '添加中...' : '+ 添加' }}</button>
      </div>

      <!-- 计划列表 -->
      <div class="card">
        <div class="card-header">
          <div class="flex-1 min-w-0">
            <h3 class="card-title">维护计划列表</h3>
          </div>
          <span class="text-sm text-secondary shrink-0">{{ planStats }}</span>
        </div>
        <div v-if="maintRecords.length === 0" class="empty">
          <div class="empty-icon">📅</div>
          <div class="empty-title">暂无维护计划</div>
          <div class="empty-desc">上方添加维护计划，设定日期和内容</div>
        </div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:90px">计划日期</th>
                <th>维护内容</th>
                <th style="width:80px">状态</th>
                <th style="width:90px">完成日期</th>
                <th class="text-truncate" style="max-width:120px">备注</th>
                <th style="width:70px">照片</th>
                <th style="width:100px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in maintRecords" :key="r.id" class="schedule-row" :class="{ 'opacity-60': r.submitted }" @click="openEditRecord(r)">
                <td>{{ r.scheduled_date }}</td>
                <td class="text-sm">{{ r.content || '-' }}</td>
                <td>
                  <span class="badge" :class="statusBadgeClass(r)">{{ statusLabel(r) }}</span>
                  <span v-if="r.submitted" class="badge badge-submitted ml-4">已提交</span>
                </td>
                <td class="text-sm text-secondary">{{ r.completed_date || '-' }}</td>
                <td class="text-sm text-secondary text-truncate" style="max-width:120px">{{ r.notes || '-' }}</td>
                <td>
                  <span v-if="!r.photos?.length">-</span>
                  <span v-else class="text-sm text-secondary">{{ r.photos.length }} 张</span>
                </td>
                <td @click.stop>
                  <button v-if="r.submitted" class="btn btn-sm btn-outline" disabled>已提交</button>
                  <button v-else-if="r.status === 'pending'" class="btn btn-sm" @click="openEditRecord(r)">记录</button>
                  <button v-else class="btn btn-sm btn-outline" @click="openEditRecord(r)">编辑</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tab: 说明书 -->
    <div v-if="tab === 'manuals'">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">说明书列表</h3>
          <div class="flex gap-8 shrink-0 items-center">
            <input ref="fileInput" type="file" :accept="manualAccept" class="hidden-input" @change="uploadManual" />
            <button v-if="auth.isManager" class="btn btn-sm" @click="$refs.fileInput.click()">+ 上传文件</button>
          </div>
        </div>
        <div v-if="manuals.length === 0" class="empty">
          <div class="empty-icon">📄</div>
          <div class="empty-title">暂无说明书</div>
          <div class="empty-desc">支持 PDF、Word、Excel、图片等格式</div>
        </div>
        <table v-else>
          <thead>
            <tr><th>文件名</th><th>上传者</th><th>上传时间</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="m in manuals" :key="m.id">
              <td>{{ fileIcon(m.original_name) }} {{ m.original_name }}</td>
              <td class="text-sm text-secondary">{{ m.uploader_name || '-' }}</td>
              <td class="text-sm text-secondary">{{ m.created_at }}</td>
              <td>
                <div class="flex gap-4">
                  <a :href="'/uploads/manuals/' + m.filename" target="_blank" class="btn btn-sm btn-outline">查看</a>
                  <button v-if="auth.isManager" class="btn btn-sm btn-danger-outline" @click="delManual(m)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 记录/编辑模态框 -->
    <div class="modal" v-if="showMaintModal" @click.self="showMaintModal=false">
      <div class="modal-card modal-card-sm">
        <h3>
          {{ editingRecordId ? '编辑维护记录' : '记录维护' }}
          <span v-if="maintForm._submitted" class="badge badge-submitted ml-8">已提交</span>
        </h3>
        <div class="form-group">
          <label class="form-label">计划日期</label>
          <input v-model="maintForm.scheduled_date" type="date" class="input" :disabled="maintForm._submitted" />
        </div>
        <div class="form-group">
          <label class="form-label">维护内容</label>
          <input v-model="maintForm.content" class="input" placeholder="检查项目或维护内容..." :disabled="maintForm._submitted" />
        </div>
        <div class="form-group">
          <label class="form-label">状态</label>
          <div class="flex gap-8">
            <label class="flex items-center gap-4">
              <input type="radio" v-model="maintForm.status" value="pending" class="result-radio" :disabled="maintForm._submitted" />
              <span>待执行</span>
            </label>
            <label class="flex items-center gap-4">
              <input type="radio" v-model="maintForm.status" value="completed" class="result-radio" :disabled="maintForm._submitted" />
              <span>已完成</span>
            </label>
            <label class="flex items-center gap-4">
              <input type="radio" v-model="maintForm.status" value="skipped" class="result-radio" :disabled="maintForm._submitted" />
              <span>已跳过</span>
            </label>
          </div>
        </div>
        <div class="form-group" v-if="maintForm.status === 'completed'">
          <label class="form-label">完成日期</label>
          <input v-model="maintForm.completed_date" type="date" class="input" :disabled="maintForm._submitted" />
        </div>
        <div class="form-group">
          <label class="form-label">备注</label>
          <textarea v-model="maintForm.notes" class="textarea" rows="2" placeholder="维护情况说明..." :disabled="maintForm._submitted"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">照片（最多6张）</label>
          <div v-if="maintForm._existingPhotos && maintForm._existingPhotos.length" class="photo-grid mb-8">
            <div v-for="(p, i) in maintForm._existingPhotos" :key="'e'+i" class="photo-thumb">
              <img :src="'/uploads/' + p" alt="已有照片" @click.stop="viewPhoto('/uploads/' + p)" />
              <button class="photo-del" @click="removeExistingPhoto(i)">✕</button>
            </div>
          </div>
          <input v-if="!maintForm._submitted" type="file" multiple accept="image/*" @change="onMaintPhotos" />
          <div v-if="maintForm._newPhotos && maintForm._newPhotos.length" class="photo-grid mt-8">
            <div v-for="(f, i) in maintForm._newPhotos" :key="'n'+i" class="photo-thumb">
              <img :src="f._preview" alt="新照片" />
              <button class="photo-del" @click="removeNewPhoto(i)">✕</button>
            </div>
          </div>
        </div>
        <p class="error-msg" v-if="maintError">{{ maintError }}</p>
        <div class="modal-actions">
          <button v-if="editingRecordId && !maintForm._submitted" class="btn btn-danger-outline" @click="deleteRecord">删除</button>
          <div class="flex-1"></div>
          <template v-if="!maintForm._submitted">
            <button class="btn" @click="saveMaintRecord" :disabled="maintSaving">{{ maintSaving ? '保存中...' : '保存' }}</button>
            <button v-if="editingRecordId" class="btn btn-success" @click="submitMaintRecord" :disabled="maintSubmitting">{{ maintSubmitting ? '提交中...' : '提交' }}</button>
          </template>
          <button class="btn btn-outline" @click="showMaintModal=false">取消</button>
        </div>
      </div>
    </div>

    <!-- 照片预览 -->
    <div class="modal" v-if="photoPreviewUrl" @click.self="photoPreviewUrl=null">
      <div class="modal-card modal-card-lg" style="padding:8px;background:transparent;box-shadow:none;max-width:90vw;">
        <img :src="photoPreviewUrl" style="width:100%;max-height:80vh;object-fit:contain;border-radius:4px;" @click="photoPreviewUrl=null" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api'

const route = useRoute()
const auth = useAuthStore()

const tab = ref('info')
const eq = ref({})
const form = ref({})
const saving = ref(false)
const maintRecords = ref([])
const manuals = ref([])

const planForm = ref({ scheduled_date: '', content: '' })
const planSaving = ref(false)

const showMaintModal = ref(false)
const editingRecordId = ref(null)
const maintForm = ref({})
const maintSaving = ref(false)
const maintSubmitting = ref(false)
const maintError = ref('')
const photoPreviewUrl = ref(null)

const manualAccept = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg'

onMounted(async () => {
  try {
    const { data } = await api.get('/equipment/' + route.params.eid)
    eq.value = data
    form.value = { ...data }
  } catch (_) { eq.value = null }
  loadMaintRecords()
  loadManuals()
})

async function saveInfo() {
  saving.value = true
  try {
    const { data } = await api.put('/equipment/' + route.params.eid, form.value)
    eq.value = data
    form.value = { ...data }
  } finally { saving.value = false }
}

// Maintenance plans
async function loadMaintRecords() {
  try {
    const { data } = await api.get('/equipment/' + route.params.eid + '/maintenance')
    maintRecords.value = data
  } catch (_) { maintRecords.value = [] }
}

async function addPlan() {
  if (!planForm.value.scheduled_date) return
  planSaving.value = true
  try {
    await api.post('/equipment/' + route.params.eid + '/maintenance', {
      scheduled_date: planForm.value.scheduled_date,
      content: planForm.value.content
    })
    planForm.value = { scheduled_date: '', content: '' }
    loadMaintRecords()
  } catch (e) {
    alert('添加失败：' + (e.response?.data?.error || '未知错误'))
  } finally { planSaving.value = false }
}

function openEditRecord(r) {
  editingRecordId.value = r.id
  maintError.value = ''
  maintForm.value = {
    scheduled_date: r.scheduled_date,
    content: r.content || '',
    status: r.status,
    completed_date: r.completed_date || new Date().toISOString().slice(0, 10),
    notes: r.notes || '',
    _submitted: r.submitted || false,
    _existingPhotos: [...(r.photos || [])],
    _newPhotos: []
  }
  showMaintModal.value = true
}

function onMaintPhotos(e) {
  const files = Array.from(e.target.files || [])
  const existing = (maintForm.value._existingPhotos || []).length
  const current = maintForm.value._newPhotos || []
  if (existing + current.length + files.length > 6) {
    maintError.value = '最多上传6张照片'
    return
  }
  maintError.value = ''
  files.forEach(f => {
    f._preview = URL.createObjectURL(f)
    current.push(f)
  })
  maintForm.value._newPhotos = current
  e.target.value = ''
}

function removeExistingPhoto(i) {
  const photos = maintForm.value._existingPhotos
  photos.splice(i, 1)
  maintForm.value._existingPhotos = [...photos]
}

function removeNewPhoto(i) {
  const photos = maintForm.value._newPhotos
  URL.revokeObjectURL(photos[i]._preview)
  photos.splice(i, 1)
  maintForm.value._newPhotos = [...photos]
}

async function saveMaintRecord() {
  if (!maintForm.value.scheduled_date) return
  maintSaving.value = true
  maintError.value = ''
  try {
    const fd = new FormData()
    fd.append('scheduled_date', maintForm.value.scheduled_date)
    fd.append('content', maintForm.value.content || '')
    fd.append('status', maintForm.value.status)
    if (maintForm.value.completed_date) fd.append('completed_date', maintForm.value.completed_date)
    if (maintForm.value.notes) fd.append('notes', maintForm.value.notes)
    fd.append('keep_photos', JSON.stringify(maintForm.value._existingPhotos || []))
    const newPhotos = maintForm.value._newPhotos || []
    newPhotos.forEach(f => fd.append('photos', f))

    await api.put('/equipment/' + route.params.eid + '/maintenance/' + editingRecordId.value, fd)
    showMaintModal.value = false
    loadMaintRecords()
    const { data } = await api.get('/equipment/' + route.params.eid)
    eq.value = data
  } catch (e) {
    maintError.value = e.response?.data?.error || '保存失败'
  } finally { maintSaving.value = false }
}

async function submitMaintRecord() {
  if (!confirm('提交后记录将锁定，无法再修改或删除，确认提交？')) return
  maintSubmitting.value = true
  try {
    await saveMaintRecord()
    await api.post('/equipment/' + route.params.eid + '/maintenance/' + editingRecordId.value + '/submit')
    showMaintModal.value = false
    loadMaintRecords()
  } catch (e) {
    maintError.value = e.response?.data?.error || '提交失败'
  } finally { maintSubmitting.value = false }
}

async function deleteRecord() {
  if (!confirm('确定删除此维护计划？')) return
  await api.delete('/equipment/' + route.params.eid + '/maintenance/' + editingRecordId.value)
  showMaintModal.value = false
  loadMaintRecords()
}

const planStats = computed(() => {
  const total = maintRecords.value.length
  const done = maintRecords.value.filter(r => r.status === 'completed').length
  const pending = maintRecords.value.filter(r => r.status === 'pending').length
  return `${total} 项 · ${done} 已完成 · ${pending} 待执行`
})

function statusBadgeClass(r) {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const sched = new Date(r.scheduled_date + 'T00:00:00')
  if (r.status === 'completed') return 'badge-pass'
  if (r.status === 'skipped') return 'badge-skip'
  if (sched < now) return 'badge-fail'
  return 'badge-pending'
}

function statusLabel(r) {
  if (r.status === 'completed') return '已完成'
  if (r.status === 'skipped') return '已跳过'
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const sched = new Date(r.scheduled_date + 'T00:00:00')
  if (sched < now) return '已逾期'
  return '待执行'
}

// Manuals
async function loadManuals() {
  try {
    const { data } = await api.get('/equipment/' + route.params.eid + '/manuals')
    manuals.value = data
  } catch (_) { manuals.value = [] }
}

async function uploadManual(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const fd = new FormData()
  fd.append('file', file)
  try {
    await api.post('/equipment/' + route.params.eid + '/manuals', fd)
    loadManuals()
  } catch (err) {
    alert('上传失败：' + (err.response?.data?.error || '未知错误'))
  }
  e.target.value = ''
}

async function delManual(m) {
  if (!confirm('确定删除说明书 "' + m.original_name + '"？')) return
  await api.delete('/equipment/' + route.params.eid + '/manuals/' + m.id)
  loadManuals()
}

function viewPhoto(url) { photoPreviewUrl.value = url }

function fileIcon(name) {
  const ext = (name || '').split('.').pop().toLowerCase()
  const map = { pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗', png: '🖼️', jpg: '🖼️', jpeg: '🖼️' }
  return map[ext] || '📎'
}
</script>

<style scoped>
.hidden-input { display: none; }
.schedule-row { cursor: pointer; }
.schedule-row:hover td { background: #fdfcfa; }
.opacity-60 { opacity: 0.6; }
</style>
