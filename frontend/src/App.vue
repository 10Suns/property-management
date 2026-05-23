<template>
  <div id="app">
    <template v-if="!auth.isLoggedIn">
      <router-view />
    </template>

    <template v-else>
      <aside v-if="projectId" class="sidebar">
        <div class="sidebar-brand">{{ project?.code || project?.name || '物业承接查验' }}</div>
        <div class="sidebar-section">工作台</div>
        <router-link :to="'/projects/' + projectId" class="sidebar-link">我的表单</router-link>
        <router-link :to="'/projects/' + projectId + '/records'" class="sidebar-link">日常巡检</router-link>
        <router-link :to="'/projects/' + projectId + '/acceptance'" class="sidebar-link">承接查验</router-link>
        <router-link :to="'/projects/' + projectId + '/equipment'" class="sidebar-link">设备档案</router-link>
        <div class="sidebar-section">资源</div>
        <router-link :to="'/projects/' + projectId + '/templates'" class="sidebar-link">参考表单</router-link>
        <div class="sidebar-section sidebar-spacer">账户</div>
        <router-link v-if="auth.isManager" :to="'/projects/' + projectId + '/dashboard'" class="sidebar-link">仪表盘</router-link>
        <router-link v-if="auth.isManager" :to="'/projects/' + projectId + '/settings'" class="sidebar-link">项目配置</router-link>
        <router-link v-if="auth.isAdmin" to="/admin/users" class="sidebar-link">用户管理</router-link>
        <a class="sidebar-link" @click="changePwd">修改密码</a>
        <a class="sidebar-link" @click="logout">
          {{ auth.user?.display_name || '' }} · 退出
        </a>
      </aside>
      <main class="main-content" :class="{ 'main-full': !projectId }">
        <router-view />
      </main>
    </template>

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
