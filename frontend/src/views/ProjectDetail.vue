<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">📋 我的表单</h1>
      <button class="btn btn-sm" @click="showCreateBlank=true">+ 创建空白表单</button>
    </div>
    <p class="text-sm text-secondary mb-16">从左侧「📁 参考表单」选择模板一键创建，或点击右上角创建空白表单。完成后打印空白表带去现场检查。</p>

    <div v-if="loading" class="empty">加载中...</div>
    <div v-else class="data-grid">
      <div v-for="f in myForms" :key="f.id" class="data-grid-item">
        <div class="item-main">
          <div class="item-title-row">
            <span v-if="f.template_form_id" class="badge badge-pass">{{ f.template_form_id }}</span>
            <span class="cell-title">{{ f.title }}</span>
          </div>
          <span class="cell-meta">{{ f.item_count || 0 }} 项 · {{ f.creator_name }} · {{ formatDate(f.created_at) }}</span>
        </div>
        <div class="item-actions">
          <button class="action-btn" @click="printBlank(f)">打印</button>
          <button class="action-btn" @click="editMyForm(f)">编辑</button>
          <button class="action-btn danger" @click="deleteForm(f)">删除</button>
        </div>
      </div>
      <div v-if="myForms.length === 0" class="data-grid-empty">
        <div class="empty-icon">📋</div>
        <div class="empty-title">还没有表单</div>
        <div class="empty-desc">在左侧「参考表单」选择模板一键创建，或点击右上角「+ 创建空白表单」从零开始</div>
      </div>
    </div>

    <!-- Create blank form modal -->
    <div class="modal" v-if="showCreateBlank" @click.self="showCreateBlank=false">
      <div class="modal-card modal-card-sm">
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'
import { formatDate } from '../utils/format'

const route = useRoute()
const router = useRouter()

const myForms = ref([])
const loading = ref(true)

const showCreateBlank = ref(false)
const blankForm = ref({ title: '' })
const blankError = ref('')
const blankLoading = ref(false)

onMounted(async () => {
  try {
    const { data } = await api.get('/forms?project_id=' + route.params.id)
    myForms.value = data
  } finally {
    loading.value = false
  }
})

async function loadMyForms() {
  const { data } = await api.get('/forms?project_id=' + route.params.id)
  myForms.value = data
}

function editMyForm(f) {
  router.push('/projects/' + route.params.id + '/template/' + (f.template_id || 0) + '?form=' + f.id)
}

function printBlank(f) {
  localStorage.setItem('printBlankTemplates', JSON.stringify(['f_' + f.id]))
  localStorage.setItem('printRecords', JSON.stringify([]))
  router.push('/print-preview')
}

async function deleteForm(f) {
  if (!confirm(`确定删除表单"${f.title}"吗？\n\n该表单关联的所有查验记录也将被永久删除，此操作不可撤销。`)) return
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
    router.push('/projects/' + route.params.id + '/template/0?form=' + data.id)
  } catch (e) {
    blankError.value = e.response?.data?.error || '创建失败'
  } finally { blankLoading.value = false }
}
</script>
