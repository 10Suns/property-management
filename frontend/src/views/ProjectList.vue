<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">项目列表</h1>
      <button class="btn btn-sm" @click="showCreate=true">+ 新建项目</button>
    </div>

    <div v-if="loading" class="empty">加载中...</div>
    <div v-else class="data-grid">
      <div v-for="p in projects" :key="p.id" class="data-grid-item clickable" @click="router.push('/projects/' + p.id)">
        <div class="item-main">
          <div class="item-title-row">
            <span v-if="p.code" class="badge badge-skip">{{ p.code }}</span>
            <span class="cell-title">{{ p.name }}</span>
          </div>
          <span class="cell-meta">{{ p.address || '' }} · {{ p.building_count || 0 }} 栋 / {{ p.house_count || 0 }} 户 · {{ typeLabel(p.type) }}</span>
        </div>
        <div class="item-actions">
          <span class="badge" :class="p.member_role === 'admin' ? 'badge-pass' : 'badge-skip'">{{ p.member_role === 'admin' ? '管理员' : '成员' }}</span>
        </div>
      </div>
      <div v-if="projects.length === 0" class="data-grid-empty">
        <div class="empty-icon">📋</div>
        <div class="empty-title">暂无项目</div>
        <div class="empty-desc">点击右上角「+ 新建项目」创建第一个项目</div>
      </div>
    </div>

    <!-- Create modal -->
    <div class="modal" v-if="showCreate" @click.self="showCreate=false">
      <div class="modal-card">
        <h3>新建项目</h3>
        <div class="form-group">
          <label class="form-label">项目名称 *</label>
          <input v-model="form.name" class="input" placeholder="如：GVIP嘉平二工业区" />
        </div>
        <div class="form-group">
          <label class="form-label">项目类型</label>
          <select v-model="form.type" class="select">
            <option value="industrial">工业</option>
            <option value="commercial">商业</option>
            <option value="residential">住宅</option>
            <option value="other">其他</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">地址</label>
          <input v-model="form.address" class="input" placeholder="项目地址" />
        </div>
        <div class="form-group">
          <label class="form-label">面积</label>
          <input v-model="form.area" class="input" placeholder="占地面积" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">交接日期</label>
            <input v-model="form.handover_date" type="date" class="input" />
          </div>
          <div class="form-group">
            <label class="form-label">开发商</label>
            <input v-model="form.developer" class="input" placeholder="开发商名称" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">物业经理</label>
            <input v-model="form.manager_name" class="input" placeholder="经理姓名" />
          </div>
          <div class="form-group">
            <label class="form-label">联系电话</label>
            <input v-model="form.manager_phone" class="input" placeholder="联系电话" />
          </div>
        </div>
        <p class="error-msg" v-if="createError">{{ createError }}</p>
        <div class="modal-actions">
          <button class="btn" @click="doCreate" :disabled="createLoading">创建</button>
          <button class="btn btn-outline" @click="showCreate=false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'

const router = useRouter()
const projects = ref([])
const loading = ref(true)
const showCreate = ref(false)
const createError = ref('')
const createLoading = ref(false)
const form = ref({ name: '', type: 'industrial', address: '', area: '', handover_date: '', developer: '', manager_name: '', manager_phone: '' })

onMounted(async () => {
  try {
    const { data } = await api.get('/projects')
    projects.value = data
    // Single-project mode: auto-redirect
    if (data.length === 1) {
      router.push('/projects/' + data[0].id)
      return
    }
  } finally {
    loading.value = false
  }
})

const typeLabels = { industrial: '工业', commercial: '商业', residential: '住宅', other: '其他' }
function typeLabel(t) { return typeLabels[t] || t }

async function doCreate() {
  createError.value = ''
  if (!form.value.name) { createError.value = '请输入项目名称'; return }
  createLoading.value = true
  try {
    const { data } = await api.post('/projects', form.value)
    showCreate.value = false
    router.push('/projects/' + data.id)
  } catch (e) {
    createError.value = e.response?.data?.error || '创建失败'
  } finally {
    createLoading.value = false
  }
}
</script>
