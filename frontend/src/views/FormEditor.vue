<template>
  <div>
    <div v-if="loading" class="empty">加载中...</div>
    <template v-else-if="template">
      <div class="page-header">
        <div>
          <div class="flex items-center gap-8 mb-4">
            <span class="text-sm text-secondary" style="font-weight:600">{{ template.form_id }}</span>
            <span class="text-sm text-secondary">{{ template.category || '' }}</span>
          </div>
          <h1 class="page-title">
            {{ displayTitle }}
            <span v-if="record" class="badge" style="background:#c5221f;color:#fff;font-size:11px;vertical-align:middle;margin-left:8px">查验录入</span>
          </h1>
          <div class="text-sm text-secondary">{{ project?.name }}</div>
        </div>
        <div class="flex gap-8">
          <button v-if="!userForm && !record" class="btn" @click="saveAsMyForm" :disabled="savingForm">
            {{ savingForm ? '保存中...' : '保存为我的表单' }}
          </button>
          <template v-if="userForm && !record">
            <button class="btn btn-sm" @click="printBlank">打印空白表</button>
          </template>
          <button v-if="record" class="btn btn-sm" @click="saveRecordMeta" :disabled="saving">
            {{ saving ? '保存中...' : '保存记录' }}
          </button>
          <button class="btn btn-sm btn-outline" @click="router.back()">返回</button>
        </div>
      </div>

      <!-- Location info -->
      <div class="card mb-16" v-if="userForm || record">
        <div class="card-title mb-8" v-if="!record">查验位置</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">楼栋</label>
            <select v-model="recordForm.building_id" class="select" @change="onBuildingChange">
              <option :value="null">不选择</option>
              <option v-for="b in buildings" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">房源</label>
            <select v-model="recordForm.house_id" class="select">
              <option :value="null">不选择</option>
              <option v-for="h in houses" :key="h.id" :value="h.id">{{ h.house_number }} {{ h.building_name ? '('+h.building_name+')' : '' }}</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">位置信息</label>
          <input v-model="recordForm.location_info" class="input" placeholder="具体位置描述" />
        </div>
      </div>

      <!-- Items table -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">检查项目（{{ items.length }}项）</span>
          <div class="flex gap-8">
            <button v-if="canEditItems" class="btn btn-sm" @click="showAddItem=true">+ 添加条目</button>
            <button v-if="canEditItems" class="btn btn-sm btn-outline" @click="editAllItems">批量编辑</button>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:30px">#</th>
                <th style="width:32%">检查项目</th>
                <th style="width:28%">检查标准</th>
                <th style="min-width:180px">查验结果</th>
                <th style="width:60px">照片</th>
                <th v-if="canEditItems" style="width:80px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in items" :key="item._key">
                <td class="text-sm text-secondary text-center">{{ i + 1 }}</td>
                <td>
                  <template v-if="item._editing">
                    <input v-model="item._editName" class="input input-sm" style="font-size:13px;padding:4px 6px" />
                  </template>
                  <template v-else>
                    <span @dblclick="startEditItem(item)" style="cursor:pointer">{{ item.item_name || item.custom_item_name || '-' }}</span>
                  </template>
                </td>
                <td class="text-sm">
                  <template v-if="item._editing">
                    <input v-model="item._editStd" class="input input-sm" style="font-size:13px;padding:4px 6px" />
                  </template>
                  <template v-else>
                    <span @dblclick="startEditItem(item)" style="cursor:pointer">{{ item.check_standard || item.custom_standard || '-' }}</span>
                  </template>
                </td>
                <td>
                  <template v-if="record">
                    <div class="result-group" style="flex-wrap:wrap;gap:2px">
                      <input type="radio" :id="'pass_'+item._key" class="result-radio" value="pass" v-model="item.result" @change="autoSaveResult(item)" />
                      <label :for="'pass_'+item._key" style="font-size:12px;padding:3px 8px">合格</label>
                      <input type="radio" :id="'fail_'+item._key" class="result-radio" value="fail" v-model="item.result" @change="autoSaveResult(item)" />
                      <label :for="'fail_'+item._key" style="font-size:12px;padding:3px 8px">不合格</label>
                      <input type="radio" :id="'skip_'+item._key" class="result-radio" value="skip" v-model="item.result" @change="autoSaveResult(item)" />
                      <label :for="'skip_'+item._key" style="font-size:12px;padding:3px 8px">免检</label>
                    </div>
                    <input v-if="item.result === 'fail'" v-model="item.problem_description" class="input mt-4" style="font-size:12px;padding:4px 6px" placeholder="问题描述..." @change="autoSaveResult(item)" />
                  </template>
                  <template v-else>
                    <span class="text-sm text-secondary">—</span>
                  </template>
                </td>
                <td class="text-center">
                  <button v-if="record" class="btn btn-sm btn-outline" style="font-size:11px;padding:2px 6px" @click="openPhotos(item)">{{ item._photoCount || 0 }}</button>
                </td>
                <td v-if="canEditItems">
                  <div class="flex gap-4">
                    <button v-if="item._editing" class="btn btn-xs" @click="finishEditItem(item)">确认</button>
                    <button v-if="item._editing" class="btn btn-xs btn-danger-outline" @click="removeItem(item)">删除</button>
                    <button v-if="!item._editing" class="btn btn-xs btn-danger-outline" @click="removeItem(item)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Inspector comment — table footer style -->
      <div v-if="record" class="form-footer">
        <div class="form-footer-label">查验意见</div>
        <textarea v-model="recordForm.inspector_comment" class="textarea form-footer-textarea" placeholder="整体查验意见..." @change="autoSaveComment"></textarea>
        <div class="flex gap-8 items-center mt-8">
          <label class="form-label">状态：</label>
          <select v-model="recordForm.status" class="select" style="width:auto" @change="autoSaveComment">
            <option value="pending">待查验</option>
            <option value="in_progress">查验中</option>
            <option value="completed">已完成</option>
          </select>
        </div>
      </div>
    </template>

    <!-- Photo modal -->
    <div class="modal" v-if="photoItem" @click.self="photoItem=null">
      <div class="modal-card" style="max-width:500px">
        <h3>照片</h3>
        <div class="photo-grid">
          <div v-for="p in photoItem._photos" :key="p.id" class="photo-thumb">
            <img :src="'/uploads/' + p.filename" />
            <button class="photo-del" @click="deletePhoto(p)">✕</button>
          </div>
        </div>
        <div v-if="!photoItem._photos || photoItem._photos.length < 6">
          <input type="file" accept="image/*" capture="environment" multiple @change="uploadPhotos" class="input" />
        </div>
        <p class="text-sm text-secondary mt-8">最多6张，每张不超过10MB</p>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="photoItem=null">关闭</button>
        </div>
      </div>
    </div>

    <!-- Add item modal -->
    <div class="modal" v-if="showAddItem" @click.self="showAddItem=false">
      <div class="modal-card">
        <h3>添加检查项</h3>
        <div class="form-group">
          <label class="form-label">检查项目 *</label>
          <input v-model="newItem.name" class="input" placeholder="检查项名称" @keyup.enter="doAddItem" />
        </div>
        <div class="form-group">
          <label class="form-label">检查标准</label>
          <input v-model="newItem.standard" class="input" placeholder="检查标准" @keyup.enter="doAddItem" />
        </div>
        <div class="modal-actions">
          <button class="btn" @click="doAddItem">添加</button>
          <button class="btn btn-outline" @click="showAddItem=false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const template = ref(null)
const project = ref(null)
const userForm = ref(null)
const record = ref(null)
const items = ref([])
const buildings = ref([])
const houses = ref([])
const loading = ref(true)
const saving = ref(false)
const savingForm = ref(false)
const photoItem = ref(null)
const showAddItem = ref(false)
const newItem = ref({ name: '', standard: '' })
let resultSaveTimer = null
let commentSaveTimer = null

const recordForm = reactive({
  building_id: null,
  house_id: null,
  location_info: '',
  inspector_comment: '',
  status: 'in_progress'
})

const displayTitle = computed(() => {
  if (userForm.value) return userForm.value.title
  return template.value?.title || ''
})

const canEditItems = computed(() => {
  return !record.value
})

onMounted(async () => {
  const pid = route.params.id
  const tid = route.params.tid
  const existingRecordId = route.query.record
  const formId = route.query.form

  const [{ data: p }, { data: b }] = await Promise.all([
    api.get('/projects/' + pid),
    api.get('/projects/' + pid + '/buildings')
  ])
  project.value = p
  buildings.value = b

  const [, tData] = await Promise.all([
    loadHouses(),
    tid && tid !== '0'
      ? api.get('/templates/' + tid).then(r => r.data).catch(() => null)
      : Promise.resolve(null)
  ])

  if (tData) {
    template.value = tData
  } else {
    template.value = { form_id: '', title: '', category: '', id: null }
  }

  if (existingRecordId) {
    const { data: r } = await api.get('/records/' + existingRecordId)
    record.value = r
    recordForm.status = r.status
    recordForm.inspector_comment = r.inspector_comment || ''
    recordForm.location_info = r.location_info || ''
    recordForm.building_id = r.building_id
    recordForm.house_id = r.house_id
    items.value = (r.results || []).map(item => ({
      ...item,
      _key: 'r_' + item.id,
      _photos: [],
      _photoCount: 0,
      _editing: false,
      _editName: item.item_name || item.custom_item_name || '',
      _editStd: item.check_standard || item.custom_standard || ''
    }))
    loadPhotos()
  } else if (formId) {
    await loadUserForm(formId)
    if (route.query.inspect === '1') {
      await createRecord()
      if (record.value) {
        router.replace({ query: { record: record.value.id } })
      }
    }
  } else if (template.value?.items) {
    // Show template items as reference
    items.value = template.value.items.map(item => ({
      ...item,
      _key: 't_' + item.id,
      _photos: [],
      _photoCount: 0,
      _editing: false,
      _editName: item.item_name,
      _editStd: item.check_standard
    }))
  }
  loading.value = false
})

async function loadHouses(buildingId) {
  let url = '/projects/' + route.params.id + '/houses'
  if (buildingId) url += '?building_id=' + buildingId
  const { data } = await api.get(url)
  houses.value = data
}

function onBuildingChange() {
  loadHouses(recordForm.building_id)
}

// Load user form with its items
async function loadUserForm(fid) {
  const { data } = await api.get('/forms/' + fid)
  userForm.value = data
  if (data.template_id) {
    try {
      const { data: t } = await api.get('/templates/' + data.template_id)
      template.value = t
    } catch (e) { /* ignore */ }
  }
  items.value = (data.items || []).map(item => ({
    ...item,
    _key: 'f_' + item.id,
    _photos: [],
    _photoCount: 0,
    _editing: false,
    _editName: item.item_name,
    _editStd: item.check_standard
  }))
}

async function saveAsMyForm() {
  const formTitle = (template.value?.title || '自定义表单') + ' - ' + (authStore.user?.display_name || '用户')

  const itemList = items.value
    .filter(item => item._editName?.trim() || item.item_name?.trim())
    .map(item => ({
      item_name: (item._editName || item.item_name || '').trim(),
      check_standard: (item._editStd || item.check_standard || '').trim(),
      source_item_id: item.id || null
    }))

  if (itemList.length === 0) {
    alert('请至少保留一个检查项目')
    return
  }

  savingForm.value = true
  try {
    const { data } = await api.post('/forms', {
      project_id: parseInt(route.params.id),
      template_id: template.value?.id || null,
      title: formTitle,
      items: itemList
    })
    userForm.value = data
    items.value = (data.items || []).map(item => ({
      ...item,
      _key: 'f_' + item.id,
      _photos: [],
      _photoCount: 0,
      _editing: false,
      _editName: item.item_name,
      _editStd: item.check_standard
    }))
    router.replace({ query: { form: data.id } })
  } catch (e) {
    alert('保存失败：' + (e.response?.data?.error || '未知错误'))
  } finally {
    savingForm.value = false
  }
}

// Item editing (for user forms and templates before saving)
function startEditItem(item) {
  if (!canEditItems.value) return
  item._editing = true
  item._editName = item.item_name || item.custom_item_name || item._editName || ''
  item._editStd = item.check_standard || item.custom_standard || item._editStd || ''
}

async function finishEditItem(item) {
  if (!item._editName?.trim()) {
    item._editing = false
    return
  }
  if (item._key.startsWith('f_')) {
    const { data } = await api.put('/forms/items/' + item.id, {
      item_name: item._editName.trim(),
      check_standard: item._editStd.trim()
    })
    item.item_name = data.item_name
    item.check_standard = data.check_standard
  } else if (item._key.startsWith('t_')) {
    item.item_name = item._editName.trim()
    item.check_standard = item._editStd.trim()
  }
  item._editing = false
}

async function removeItem(item) {
  if (item._key.startsWith('f_')) {
    await api.delete('/forms/items/' + item.id)
  } else if (item._key.startsWith('r_')) {
    await api.delete('/records/results/' + item.id)
  }
  items.value = items.value.filter(x => x._key !== item._key)
}

function editAllItems() {
  for (const item of items.value) {
    item._editing = true
    item._editName = item.item_name || item.custom_item_name || item._editName || ''
    item._editStd = item.check_standard || item.custom_standard || item._editStd || ''
  }
}

async function doAddItem() {
  if (!newItem.value.name.trim()) return
  const name = newItem.value.name.trim()
  const std = newItem.value.standard.trim()

  if (userForm.value && !record.value) {
    const { data } = await api.post('/forms/' + userForm.value.id + '/items', {
      item_name: name,
      check_standard: std
    })
    items.value.push({
      ...data,
      _key: 'f_' + data.id,
      _photos: [], _photoCount: 0, _editing: false,
      _editName: data.item_name, _editStd: data.check_standard
    })
  } else if (record.value) {
    const { data } = await api.post('/records/' + record.value.id + '/results', {
      custom_item_name: name,
      custom_standard: std
    })
    items.value.push({
      ...data,
      _key: 'r_' + data.id,
      _photos: [], _photoCount: 0, _editing: false,
      _editName: data.item_name || data.custom_item_name || '',
      _editStd: data.check_standard || data.custom_standard || ''
    })
  } else {
    // Adding locally before saving as user form
    items.value.push({
      _key: 't_new_' + Date.now(),
      id: null,
      item_name: name,
      check_standard: std,
      _photos: [], _photoCount: 0, _editing: false,
      _editName: name,
      _editStd: std
    })
  }
  showAddItem.value = false
  newItem.value = { name: '', standard: '' }
}

// Record operations
async function createRecord() {
  if (!userForm.value) return
  saving.value = true
  try {
    const { data } = await api.post('/records', {
      project_id: parseInt(route.params.id),
      user_form_id: userForm.value.id,
      building_id: recordForm.building_id,
      house_id: recordForm.house_id,
      location_info: recordForm.location_info,
      record_type: route.query.record_type || 'routine'
    })
    record.value = data
    recordForm.status = data.status
    recordForm.inspector_comment = data.inspector_comment || ''
    recordForm.location_info = data.location_info || ''
    recordForm.building_id = data.building_id
    recordForm.house_id = data.house_id
    items.value = (data.results || []).map(item => ({
      ...item,
      _key: 'r_' + item.id,
      _photos: [],
      _photoCount: 0,
      _editing: false,
      _editName: item.item_name || '',
      _editStd: item.check_standard || ''
    }))
  } finally {
    saving.value = false
  }
}

async function saveRecordMeta() {
  if (!record.value) return
  saving.value = true
  try {
    await api.put('/records/' + record.value.id, {
      inspector_comment: recordForm.inspector_comment,
      status: recordForm.status,
      location_info: recordForm.location_info,
      building_id: recordForm.building_id,
      house_id: recordForm.house_id
    })
  } finally {
    saving.value = false
  }
}

function autoSaveResult(item) {
  if (!record.value) return
  clearTimeout(resultSaveTimer)
  resultSaveTimer = setTimeout(() => {
    api.put('/records/results/' + item.id, {
      result: item.result,
      problem_description: item.problem_description || null,
      custom_item_name: item.custom_item_name || item.item_name || null,
      custom_standard: item.custom_standard || item.check_standard || null
    }).catch(() => {})
  }, 400)
}

function autoSaveComment() {
  clearTimeout(commentSaveTimer)
  commentSaveTimer = setTimeout(() => saveRecordMeta(), 600)
}

onUnmounted(() => {
  clearTimeout(resultSaveTimer)
  clearTimeout(commentSaveTimer)
})

// Photos
function openPhotos(item) {
  photoItem.value = item
  if (!item._photos) item._photos = []
}

function loadPhotos() {
  if (!record.value?.photos) return
  for (const p of record.value.photos) {
    const item = items.value.find(r => r.id === p.result_id)
    if (item) {
      if (!item._photos) item._photos = []
      item._photos.push(p)
      item._photoCount = item._photos.length
    }
  }
}

async function uploadPhotos(e) {
  const files = e.target.files
  if (!files.length) return
  const form = new FormData()
  form.append('record_id', record.value.id)
  form.append('result_id', photoItem.value.id)
  for (const f of files) form.append('photos', f)
  const { data } = await api.post('/photos/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  for (const p of data) {
    photoItem.value._photos.push(p)
    photoItem.value._photoCount = photoItem.value._photos.length
  }
  e.target.value = ''
}

async function deletePhoto(p) {
  await api.delete('/photos/' + p.id)
  photoItem.value._photos = photoItem.value._photos.filter(x => x.id !== p.id)
  photoItem.value._photoCount = photoItem.value._photos.length
}

function printBlank() {
  if (!userForm.value) return
  localStorage.setItem('printBlankTemplates', JSON.stringify(['f_' + userForm.value.id]))
  localStorage.setItem('printRecords', JSON.stringify([]))
  router.push('/print-preview')
}
</script>

<style scoped>
.form-footer {
  border: 2px solid #333;
  border-top: none;
  background: #fff;
  display: grid;
  grid-template-columns: 14% 1fr;
}
.form-footer-label {
  background: #f5f5f5;
  font-weight: 600;
  font-size: 12px;
  text-align: center;
  padding: 12px;
  border-right: 1px solid #999;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
}
.form-footer-textarea {
  min-height: 120px;
  border: none;
  border-radius: 0;
  resize: vertical;
}
.form-footer-textarea:focus {
  box-shadow: none;
  outline: 1px solid var(--primary);
}
</style>