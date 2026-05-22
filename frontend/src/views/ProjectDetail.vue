<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">📋 我的表单</h1>
      <button class="btn btn-sm" @click="showCreateBlank=true">+ 创建空白表单</button>
    </div>
    <p class="text-sm text-secondary mb-16">从左侧「📁 参考表单」选择模板一键创建，或点击右上角创建空白表单。完成后打印空白表带去现场检查。</p>

    <div v-if="loading" class="empty">加载中...</div>
    <template v-else>
      <div v-if="myForms.length === 0" class="empty" style="padding:60px 16px">
        <div style="font-size:48px;margin-bottom:12px">📋</div>
        <p style="font-weight:600;font-size:15px;margin-bottom:6px">还没有表单</p>
        <p class="text-sm">去左侧「📁 参考表单」浏览 28 套系统模板<br>选择需要的模板，一键创建为你的表单<br>或点击右上角「+ 创建空白表单」从零开始</p>
      </div>
      <div v-for="f in myForms" :key="f.id" class="card">
        <div class="card-header">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span v-if="f.template_form_id" class="badge badge-pass">{{ f.template_form_id }}</span>
              <span class="card-title" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ f.title }}</span>
            </div>
            <span class="text-sm text-secondary">{{ f.item_count || 0 }} 项 · {{ f.creator_name }} · {{ formatDate(f.created_at) }}</span>
          </div>
          <div class="flex gap-8" style="flex-shrink:0">
            <button class="btn btn-sm" @click="printBlank(f)">🖨 打印空白表</button>
            <button class="btn btn-sm btn-outline" @click="editMyForm(f)">编辑</button>
            <button class="btn btn-sm btn-danger-outline" @click="deleteForm(f)">删除</button>
          </div>
        </div>
      </div>
    </template>

    <!-- Create blank form modal -->
    <div class="modal" v-if="showCreateBlank" @click.self="showCreateBlank=false">
      <div class="modal-card" style="max-width:420px">
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

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('zh-CN')
}

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
    await loadMyForms()
    router.push('/projects/' + route.params.id + '/template/0?form=' + data.id)
  } catch (e) {
    blankError.value = e.response?.data?.error || '创建失败'
  } finally { blankLoading.value = false }
}
</script>
