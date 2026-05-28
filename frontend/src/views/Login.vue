<template>
  <div class="login-page">
    <div class="login-bg"></div>
    <div class="login-card">
      <div class="login-brand">
        <h1>瑞界物业</h1>
        <p class="login-subtitle">SG Properties</p>
      </div>
      <div class="login-form">
        <div class="form-group">
          <label class="form-label">用户名</label>
          <input v-model="username" class="login-input" placeholder="请输入用户名" @keyup.enter="doLogin" />
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input v-model="password" type="password" class="login-input" placeholder="请输入密码" @keyup.enter="doLogin" />
        </div>
        <p class="error-msg" v-if="error">{{ error }}</p>
        <button class="btn btn-lg btn-block login-btn" @click="doLogin" :disabled="loading">
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
import api from '../api'

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
    // Redirect to single project
    const { data: projects } = await api.get('/projects')
    if (projects && projects.length > 0) {
      router.push('/projects/' + projects[0].id)
    } else {
      router.push('/projects')
    }
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
  width: 100vw; min-height: 100vh; padding: 24px;
  position: relative;
}
.login-bg {
  position: fixed; inset: 0; z-index: 0;
  background: url(https://images.unsplash.com/photo-1722537273909-a41f4f44ad6c?w=1400&q=80) center / cover no-repeat;
}
.login-bg::after {
  content: ''; position: absolute; inset: 0;
  background: rgba(0,0,0,0.35);
}
.login-card {
  position: relative; z-index: 1;
  background: rgba(255,255,255,0.93); border-radius: var(--radius);
  box-shadow: 0 8px 40px rgba(0,0,0,0.2);
  padding: 52px 44px; width: 100%; max-width: 420px;
  border: 1px solid var(--border);
}
.login-brand { text-align: center; margin-bottom: 36px; }
.login-brand h1 {
  font-family: 'Noto Serif SC', serif;
  font-size: 26px; font-weight: 600; letter-spacing: 1.5px;
  color: var(--text); margin-bottom: 8px;
}
.login-subtitle {
  font-size: 11px; color: var(--text-light);
  text-transform: uppercase; letter-spacing: 0.8px;
}
.login-form { display: flex; flex-direction: column; gap: 18px; }
.login-input {
  width: 100%; padding: 10px 0; border: none;
  border-bottom: 1px solid var(--border);
  font-size: 15px; font-family: inherit; color: var(--text);
  background: transparent; outline: none; transition: border-color 0.2s;
}
.login-input:focus { border-bottom-color: var(--primary); }
.login-btn { margin-top: 8px; }
</style>
