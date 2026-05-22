<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <h1>物业承接查验</h1>
        <p class="login-subtitle">瑞界物业管理有限公司</p>
      </div>
      <div class="login-form">
        <div class="form-group">
          <label class="form-label">用户名</label>
          <input v-model="username" class="input" placeholder="请输入用户名" @keyup.enter="doLogin" />
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input v-model="password" type="password" class="input" placeholder="请输入密码" @keyup.enter="doLogin" />
        </div>
        <p class="error-msg" v-if="error">{{ error }}</p>
        <button class="btn btn-lg btn-block" @click="doLogin" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </div>
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
  min-height: 100vh; padding: 24px; background: var(--bg);
}
.login-card {
  background: var(--surface); border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06);
  padding: 40px; width: 100%; max-width: 420px;
}
.login-brand { text-align: center; margin-bottom: 28px; }
.login-brand h1 { font-size: 28px; font-weight: 700; margin-bottom: 6px; letter-spacing: -0.3px; line-height: 1.2; }
.login-subtitle { font-size: 14px; color: var(--text-light); }
.login-form { display: flex; flex-direction: column; gap: 12px; }
</style>
