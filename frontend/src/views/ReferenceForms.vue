<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">📁 参考表单</h1>
      <button v-if="auth.isAdmin" class="btn btn-sm" @click="openNewTemplate">+ 新建参考表单</button>
    </div>
    <p class="text-sm text-secondary mb-16">{{ templates.length }} 套系统预设模板。点击查看后可使用「保存为我的表单」。</p>

    <div v-if="loading" class="empty">加载中...</div>
    <div v-else class="data-grid">
      <template v-for="cat in categories" :key="cat.name">
        <div class="data-grid-cat">{{ cat.name }}</div>
        <div v-for="t in cat.templates" :key="t.id" class="data-grid-item clickable" @click="createFromTemplate(t)">
          <div class="item-main">
            <div class="item-title-row">
              <span class="badge badge-pass">{{ t.form_id }}</span>
              <span class="cell-title">{{ t.title }}</span>
            </div>
            <span class="cell-meta">{{ t.item_count || 0 }} 项</span>
          </div>
          <div class="item-actions" @click.stop>
            <button v-if="auth.isAdmin" class="action-btn" @click="openEditTemplate(t)">编辑</button>
            <button class="action-btn primary" @click="viewTemplate(t)">查看</button>
          </div>
        </div>
      </template>
      <div v-if="templates.length === 0" class="data-grid-empty">
        <div class="empty-icon">📁</div>
        <div class="empty-title">暂无参考表单</div>
        <div class="empty-desc">系统预设模板将在此处显示</div>
      </div>
    </div>

    <!-- Admin: create/edit template modal -->
    <div class="modal" v-if="showTemplateModal" @click.self="showTemplateModal=false">
      <div class="modal-card modal-card-lg" style="max-height:80vh;overflow-y:auto">
        <h3>{{ editingTemplate ? '编辑参考表单' : '新建参考表单' }}</h3>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">表单编号 *</label>
            <input v-model="templateForm.form_id" class="input" placeholder="如 D005" />
          </div>
          <div class="form-group">
            <label class="form-label">分类 *</label>
            <select v-model="templateForm.category" class="select">
              <option value="">选择分类</option>
              <option value="A">A. 设备用房查验</option>
              <option value="B">B. 公共部位查验</option>
              <option value="C">C. 室内专有部分查验</option>
              <option value="D">D. 资料与物品移交</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">标题 *</label>
          <input v-model="templateForm.title" class="input" placeholder="表单标题" />
        </div>

        <div class="flex items-center justify-between mb-8 mt-12">
          <label class="form-label" style="margin:0">检查项目（{{ templateForm.items.length }}项）</label>
          <button class="btn btn-sm" @click="addTemplateItem">+ 添加条目</button>
        </div>
        <div v-for="(item, i) in templateForm.items" :key="i" class="flex gap-8 mb-4 items-center">
          <span class="text-sm text-secondary text-center" style="width:24px">{{ i + 1 }}</span>
          <input v-model="item.item_name" class="input flex-1" placeholder="检查项目名称" />
          <input v-model="item.check_standard" class="input flex-1" placeholder="检查标准" />
          <button class="btn btn-xs btn-danger-outline" @click="templateForm.items.splice(i,1)">删除</button>
        </div>
        <p v-if="templateError" class="error-msg">{{ templateError }}</p>
        <div class="modal-actions">
          <button class="btn" @click="saveTemplate" :disabled="templateSaving">{{ templateSaving ? '保存中...' : '保存' }}</button>
          <button class="btn btn-outline" @click="showTemplateModal=false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const templates = ref([])
const loading = ref(true)

const showTemplateModal = ref(false)
const editingTemplate = ref(null)
const templateSaving = ref(false)
const templateError = ref('')
const templateForm = ref({ form_id: '', title: '', category: '', items: [] })

const categories = computed(() => {
  const cats = {
    A: { name: 'A. 设备用房查验', templates: [] },
    B: { name: 'B. 公共部位查验', templates: [] },
    C: { name: 'C. 室内专有部分查验', templates: [] },
    D: { name: 'D. 资料与物品移交', templates: [] }
  }
  for (const t of templates.value) {
    const prefix = t.form_id ? t.form_id.charAt(0) : ''
    if (cats[prefix]) cats[prefix].templates.push(t)
  }
  return Object.values(cats).filter(c => c.templates.length > 0)
})

onMounted(async () => {
  try {
    const { data } = await api.get('/projects/' + route.params.id + '/my-templates')
    templates.value = data
  } catch (_) {
    templates.value = []
  } finally {
    loading.value = false
  }
})

function resetTemplateForm() {
  templateForm.value = { form_id: '', title: '', category: '', items: [] }
  templateError.value = ''
  editingTemplate.value = null
}

function openNewTemplate() {
  resetTemplateForm()
  showTemplateModal.value = true
}

async function openEditTemplate(t) {
  templateError.value = ''
  try {
    const { data } = await api.get('/templates/' + t.id)
    editingTemplate.value = data
    templateForm.value = {
      form_id: data.form_id,
      title: data.title,
      category: data.category,
      items: (data.items || []).map(it => ({ item_name: it.item_name, check_standard: it.check_standard }))
    }
    showTemplateModal.value = true
  } catch (e) {
    alert('加载模板失败：' + (e.response?.data?.error || '未知错误'))
  }
}

function addTemplateItem() {
  templateForm.value.items.push({ item_name: '', check_standard: '' })
}

async function saveTemplate() {
  templateError.value = ''
  const { form_id, title, category, items } = templateForm.value
  if (!form_id.trim() || !title.trim() || !category) {
    templateError.value = '表单编号、标题、分类不能为空'
    return
  }
  const validItems = items.filter(it => it.item_name.trim())
  if (validItems.length === 0) {
    templateError.value = '请至少添加一个检查项目'
    return
  }
  templateSaving.value = true
  try {
    const payload = {
      form_id: form_id.trim(),
      title: title.trim(),
      category,
      items: validItems.map((it, i) => ({
        item_number: i + 1,
        item_name: it.item_name.trim(),
        check_standard: (it.check_standard || '').trim()
      }))
    }
    if (editingTemplate.value) {
      await api.put('/templates/' + editingTemplate.value.id, payload)
    } else {
      await api.post('/templates', payload)
    }
    showTemplateModal.value = false
    const { data } = await api.get('/projects/' + route.params.id + '/my-templates')
    templates.value = data
  } catch (e) {
    templateError.value = e.response?.data?.error || '保存失败'
  } finally {
    templateSaving.value = false
  }
}

function createFromTemplate(t) {
  router.push('/projects/' + route.params.id + '/template/' + t.id)
}

function viewTemplate(t) {
  router.push('/projects/' + route.params.id + '/template/' + t.id)
}
</script>
