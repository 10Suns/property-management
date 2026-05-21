<template>
  <div class="login-page">
    <div class="login-card">
      <h1>物业承接查验系统</h1>
      <p class="text-secondary mb-16">请登录以继续</p>
      <div class="form-group">
        <label class="form-label">用户名</label>
        <input v-model="username" class="input" placeholder="请输入用户名" @keyup.enter="doLogin" />
      </div>
      <div class="form-group">
        <label class="form-label">密码</label>
        <input v-model="password" type="password" class="input" placeholder="请输入密码" @keyup.enter="doLogin" />
      </div>
      <p class="error-msg mb-12" v-if="error">{{ error }}</p>
      <button class="btn btn-lg" style="width:100%" @click="doLogin" :disabled="loading">
        {{ loading ? '登录中...' : '登录' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function doLogin() {
  error.value = ''
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  try {
    await auth.login(username.value, password.value)
    router.push('/projects')
  } catch (e) {
    error.value = e.response?.data?.error || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; padding: 24px;
}
.login-card {
  background: var(--surface); border-radius: var(--radius);
  box-shadow: var(--shadow-md); padding: 32px; width: 100%; max-width: 380px;
}
.login-card h1 { font-size: 22px; text-align: center; margin-bottom: 4px; }
</style>
