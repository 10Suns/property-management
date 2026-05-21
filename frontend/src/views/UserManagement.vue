<template>
  <div>
    <div class="page-header">
      <router-link to="/projects" class="btn btn-sm btn-outline">← 返回</router-link>
      <h1 class="page-title">用户管理</h1>
      <button class="btn" @click="showCreate=true">新建用户</button>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>用户名</th>
              <th>姓名</th>
              <th>角色</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.id }}</td>
              <td>{{ u.username }}</td>
              <td>{{ u.display_name }}</td>
              <td><span class="badge" :class="u.role==='admin'?'badge-pass':u.role==='manager'?'badge-in_progress':'badge-skip'">{{ roleLabel(u.role) }}</span></td>
              <td class="text-sm">{{ u.created_at }}</td>
              <td>
                <button v-if="u.id !== auth.user?.id" class="btn btn-sm btn-danger-outline" @click="deleteUser(u)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create modal -->
    <div class="modal" v-if="showCreate" @click.self="showCreate=false">
      <div class="modal-card">
        <h3>新建用户</h3>
        <div class="form-group">
          <label class="form-label">用户名 *</label>
          <input v-model="form.username" class="input" placeholder="登录用户名" />
        </div>
        <div class="form-group">
          <label class="form-label">密码 *</label>
          <input v-model="form.password" type="password" class="input" placeholder="至少4位" />
        </div>
        <div class="form-group">
          <label class="form-label">姓名 *</label>
          <input v-model="form.display_name" class="input" placeholder="显示名称" />
        </div>
        <div class="form-group">
          <label class="form-label">角色</label>
          <select v-model="form.role" class="select">
            <option value="employee">基层员工</option>
            <option value="manager">物业经理</option>
            <option value="admin">系统管理员</option>
          </select>
        </div>
        <p class="error-msg" v-if="error">{{ error }}</p>
        <div class="modal-actions">
          <button class="btn" @click="doCreate" :disabled="loading">创建</button>
          <button class="btn btn-outline" @click="showCreate=false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../api'

const auth = useAuthStore()
const users = ref([])

function roleLabel(r) {
  return r === 'admin' ? '管理员' : r === 'manager' ? '经理' : '员工'
}
const showCreate = ref(false)
const form = ref({ username: '', password: '', display_name: '', role: 'employee' })
const error = ref('')
const loading = ref(false)

onMounted(async () => {
  const { data } = await api.get('/users')
  users.value = data
})

async function doCreate() {
  error.value = ''
  if (!form.value.username || !form.value.password || !form.value.display_name) {
    error.value = '请填写所有必填项'
    return
  }
  if (form.value.password.length < 4) {
    error.value = '密码至少4位'
    return
  }
  loading.value = true
  try {
    const { data } = await api.post('/users', form.value)
    users.value.push(data)
    showCreate.value = false
    form.value = { username: '', password: '', display_name: '', role: 'employee' }
  } catch (e) {
    error.value = e.response?.data?.error || '创建失败'
  } finally {
    loading.value = false
  }
}

async function deleteUser(u) {
  if (!confirm('确定删除用户 "' + u.display_name + '"？此操作不可恢复。')) return
  await api.delete('/users/' + u.id)
  users.value = users.value.filter(x => x.id !== u.id)
}
</script>
