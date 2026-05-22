import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { guest: true }
  },
  {
    path: '/',
    redirect: '/projects'
  },
  {
    path: '/projects',
    name: 'ProjectList',
    component: () => import('../views/ProjectList.vue')
  },
  {
    path: '/projects/:id',
    name: 'ProjectDetail',
    component: () => import('../views/ProjectDetail.vue')
  },
  {
    path: '/projects/:id/template/:tid',
    name: 'FormEditor',
    component: () => import('../views/FormEditor.vue')
  },
  {
    path: '/projects/:id/records',
    name: 'RecordList',
    component: () => import('../views/RecordList.vue')
  },
  {
    path: '/projects/:id/equipment',
    name: 'Equipment',
    component: () => import('../views/Equipment.vue')
  },
  {
    path: '/projects/:id/templates',
    name: 'ReferenceForms',
    component: () => import('../views/ReferenceForms.vue')
  },
  {
    path: '/print-preview',
    name: 'PrintPreview',
    component: () => import('../views/PrintPreview.vue')
  },
  {
    path: '/admin/users',
    name: 'UserManagement',
    component: () => import('../views/UserManagement.vue'),
    meta: { admin: true }
  },
  {
    path: '/projects/:id/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
    meta: { manager: true }
  },
  {
    path: '/projects/:id/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { manager: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.meta.guest) {
    if (token) return next('/projects')
    return next()
  }
  if (!token) return next('/login')
  if (to.meta.admin) {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    if (user?.role !== 'admin') return next('/projects')
  }
  if (to.meta.manager) {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    if (user?.role !== 'admin' && user?.role !== 'manager') return next('/projects')
  }
  next()
})

export default router
