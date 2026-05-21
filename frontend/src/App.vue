<template>
  <div id="app" :class="{ 'standalone': isStandalone }">
    <nav class="topbar" v-if="auth.isLoggedIn">
      <button class="menu-btn" @click="showMenu=!showMenu">&#9776;</button>
      <span class="topbar-title">{{ pageTitle }}</span>
      <span class="topbar-user">{{ auth.user?.display_name }}</span>
    </nav>
    <div class="sidebar-overlay" v-if="showMenu" @click="showMenu=false"></div>
    <aside class="sidebar" :class="{ open: showMenu }">
      <div class="sidebar-header">
        <span>菜单</span>
        <button class="close-btn" @click="showMenu=false">&times;</button>
      </div>
      <router-link to="/projects" class="sidebar-link" @click="showMenu=false">项目列表</router-link>
      <router-link v-if="auth.isAdmin" to="/admin/users" class="sidebar-link" @click="showMenu=false">用户管理</router-link>
      <div class="sidebar-section">当前项目</div>
      <router-link v-if="currentProjectId" :to="'/projects/' + currentProjectId" class="sidebar-link" @click="showMenu=false">项目详情</router-link>
      <router-link v-if="currentProjectId" :to="'/projects/' + currentProjectId + '/records'" class="sidebar-link" @click="showMenu=false">查验记录</router-link>
      <router-link v-if="currentProjectId" :to="'/projects/' + currentProjectId + '/settings'" class="sidebar-link" @click="showMenu=false">项目配置</router-link>
      <router-link v-if="currentProjectId" :to="'/projects/' + currentProjectId + '/print'" class="sidebar-link" @click="showMenu=false">打印表单</router-link>
      <div class="sidebar-footer">
        <button v-if="auth.isAdmin" class="btn btn-sm" @click="changePwd">修改密码</button>
        <button class="btn btn-sm btn-outline" @click="logout">退出</button>
      </div>
    </aside>
    <main class="main-content">
      <router-view />
    </main>
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
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const showMenu = ref(false)
const showPwdModal = ref(false)
const pwdForm = ref({ old: '', new1: '', new2: '' })
const pwdError = ref('')
const pwdLoading = ref(false)
const isStandalone = ref(window.matchMedia('(display-mode: standalone)').matches)

const pageTitle = computed(() => route.meta.title || '物业承接查验系统')
const currentProjectId = computed(() => route.params.id)

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
