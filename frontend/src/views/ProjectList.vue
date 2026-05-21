<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">项目列表</h1>
      <button class="btn" @click="showCreate=true">新建项目</button>
    </div>

    <div v-if="loading" class="empty">加载中...</div>

    <div v-else-if="projects.length === 0" class="empty">
      <div class="empty-icon">📋</div>
      <p>暂无项目</p>
      <button class="btn mt-8" @click="showCreate=true">创建第一个项目</button>
    </div>

    <router-link v-for="p in projects" :key="p.id" :to="'/projects/' + p.id" class="list-item" style="text-decoration:none;color:inherit">
      <div class="list-item-body">
        <div class="list-item-title">{{ p.name }}</div>
        <div class="list-item-sub">{{ p.address || '未设置地址' }} · {{ p.building_count || 0 }}栋 · {{ p.house_count || 0 }}户</div>
      </div>
      <span class="badge" :class="p.member_role === 'admin' ? 'badge-pass' : 'badge-skip'">{{ p.member_role === 'admin' ? '管理员' : '成员' }}</span>
      <span class="list-item-arrow">›</span>
    </router-link>

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
  } finally {
    loading.value = false
  }
})

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
