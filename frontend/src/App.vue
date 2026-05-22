<template>
  <div id="app" :class="{ 'standalone': isStandalone }">
    <!-- 登录页无壳 -->
    <template v-if="!auth.isLoggedIn">
      <router-view />
    </template>

    <!-- 主壳：顶栏 + 侧边栏 + 内容区 -->
    <template v-else>
      <nav class="topbar">
        <span class="topbar-title">{{ project?.name || '物业承接查验系统' }}</span>
        <div class="topbar-actions">
          <router-link v-if="auth.isManager && projectId" :to="'/projects/' + projectId + '/dashboard'" class="topbar-action">仪表盘</router-link>
          <router-link v-if="auth.isManager && projectId" :to="'/projects/' + projectId + '/settings'" class="topbar-action">配置</router-link>
          <span class="topbar-action" style="cursor:default">{{ auth.user?.display_name }}</span>
          <button v-if="auth.isAdmin" class="topbar-action" @click="changePwd">修改密码</button>
          <button class="topbar-action" @click="logout">退出</button>
        </div>
      </nav>
      <div class="app-body">
        <aside class="sidebar">
          <div class="sidebar-section">工作台</div>
          <router-link :to="'/projects/' + projectId" class="sidebar-link" active-class="active" exact>📋 我的表单</router-link>
          <router-link :to="'/projects/' + projectId + '/records'" class="sidebar-link" active-class="active">✅ 检查记录</router-link>
          <router-link :to="'/projects/' + projectId + '/equipment'" class="sidebar-link" active-class="active">🔧 设备档案</router-link>
          <div class="sidebar-section">资源</div>
          <router-link :to="'/projects/' + projectId + '/templates'" class="sidebar-link" active-class="active">📁 参考表单 <span class="badge badge-skip">28</span></router-link>
        </aside>
        <main class="main-content">
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
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import api from './api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const projectId = ref(null)
const project = ref(null)
const isStandalone = ref(window.matchMedia('(display-mode: standalone)').matches)
const showPwdModal = ref(false)
const pwdForm = ref({ old: '', new1: '', new2: '' })
const pwdError = ref('')
const pwdLoading = ref(false)

onMounted(async () => {
  if (auth.isLoggedIn) {
    try {
      const { data } = await api.get('/projects')
      if (data.length > 0) {
        projectId.value = data[0].id
        project.value = data[0]
      }
    } catch (_) {}
  }
})

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
