<template>
  <div id="app" :class="{ 'standalone': isStandalone }">
    <!-- 登录页无壳 -->
    <template v-if="!auth.isLoggedIn">
      <router-view />
    </template>

    <!-- 主壳：顶栏 + 侧边栏 + 内容区 -->
    <template v-else>
      <nav class="topbar">
        <span class="topbar-title">
          <router-link v-if="projectId" to="/projects" class="topbar-back">‹</router-link>
          {{ titleLabel }}
        </span>
        <div class="topbar-actions">
          <router-link v-if="auth.isAdmin" to="/admin/users" class="topbar-action">用户管理</router-link>
          <router-link v-if="auth.isManager && projectId" :to="'/projects/' + projectId + '/dashboard'" class="topbar-action">仪表盘</router-link>
          <router-link v-if="auth.isManager && projectId" :to="'/projects/' + projectId + '/settings'" class="topbar-action">配置</router-link>
          <span class="topbar-action" style="cursor:default">{{ auth.user?.display_name }}</span>
          <button v-if="auth.isAdmin" class="topbar-action" @click="changePwd">修改密码</button>
          <button class="topbar-action" @click="logout">退出</button>
        </div>
      </nav>
      <div class="app-body">
        <aside v-if="projectId" class="sidebar">
          <div class="sidebar-section">工作台</div>
          <router-link :to="'/projects/' + projectId" class="sidebar-link">📋 我的表单</router-link>
          <router-link :to="'/projects/' + projectId + '/records'" class="sidebar-link">📝 日常巡检</router-link>
          <router-link :to="'/projects/' + projectId + '/acceptance'" class="sidebar-link">🏗 承接查验</router-link>
          <router-link :to="'/projects/' + projectId + '/equipment'" class="sidebar-link">🔧 设备档案</router-link>
          <div class="sidebar-section">资源</div>
          <router-link :to="'/projects/' + projectId + '/templates'" class="sidebar-link">📁 参考表单</router-link>
        </aside>
        <main class="main-content" :class="{ 'main-full': !projectId }">
          <router-view />
        </main>
      </div>
    </template>

    <!-- 修改密码 Modal -->
    <div class="modal" v-if="showPwdModal" @click.self="showPwdModal=false">
      <div class="modal-card">
        <h3>修改密码</h3>
        <input v-model="pwdForm.old" type="password" placeholder="旧密码" class="input" />
        <input v-model="pwdForm.new1" type="password" placeholder="新密码（至少4位）" class="input" />
        <input v-model="pwdForm.new2" type="password" placeholder="确认新密码" class="input" />
        <p class="error-msg" v-if="pwdError">{{ pwdError }}</p>
        <div class="modal-actions">
          <button class="btn" @click="doChangePwd" :disabled="pwdLoading">确认</button>
          <button class="btn btn-outline" @click="showPwdModal=false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import api from './api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const projectId = computed(() => route.params.id || null)
const project = ref(null)
const titleLabel = computed(() => {
  if (!project.value) return '物业承接查验系统'
  return (project.value.code ? `[${project.value.code}] ` : '') + project.value.name
})
const isStandalone = ref(window.matchMedia('(display-mode: standalone)').matches)
const showPwdModal = ref(false)
const pwdForm = ref({ old: '', new1: '', new2: '' })
const pwdError = ref('')
const pwdLoading = ref(false)

watch(projectId, async (id) => {
  if (id && auth.isLoggedIn) {
    try {
      const { data } = await api.get('/projects/' + id)
      project.value = data
    } catch (_) {}
  }
}, { immediate: true })

function logout() {
  auth.logout()
  router.push('/login')
}

function changePwd() {
  pwdForm.value = { old: '', new1: '', new2: '' }
  pwdError.value = ''
  showPwdModal.value = true
}

async function doChangePwd() {
  pwdError.value = ''
  if (pwdForm.value.new1 !== pwdForm.value.new2) {
    pwdError.value = '两次输入的新密码不一致'
    return
  }
  if (pwdForm.value.new1.length < 4) {
    pwdError.value = '新密码至少4位'
    return
  }
  pwdLoading.value = true
  try {
    await auth.changePassword(pwdForm.value.old, pwdForm.value.new1)
    showPwdModal.value = false
  } catch (e) {
    pwdError.value = e.response?.data?.error || '修改失败'
  } finally {
    pwdLoading.value = false
  }
}
</script>
