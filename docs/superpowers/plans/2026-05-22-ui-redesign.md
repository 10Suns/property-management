# UI 全面重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将物业承接查验系统从单栏 800px 居中布局重构为全宽顶栏+侧边栏+内容区布局，页面职责重新划分，仪表盘增加月份范围统计。

**Architecture:** App.vue 变成主壳（顶栏 + 持久侧边栏 + router-view），每个侧边栏项对应独立路由。style.css 移除 max-width 限制。登录直接进入项目（单项目系统）。

**Tech Stack:** Vue 3 + Vue Router + 纯 CSS（无 UI 框架）

---

### Task 1: 全局样式和布局框架

**Files:**
- Modify: `frontend/src/style.css`
- Modify: `frontend/src/App.vue`

- [ ] **Step 1: 重写 style.css 布局**

替换 `#app { max-width: 800px }` 为全宽布局样式。新增侧边栏、顶栏、内容区布局。

```css
/* 替换 #app 样式块 */
#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* 顶栏 */
.topbar {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 20px; background: var(--primary); color: #fff;
  position: sticky; top: 0; z-index: 100; height: 48px;
  flex-shrink: 0;
}
.topbar-title { font-weight: 600; font-size: 15px; }
.topbar-actions { display: flex; align-items: center; gap: 16px; margin-left: auto; }
.topbar-action { opacity: 0.85; font-size: 12px; cursor: pointer; color: #fff; text-decoration: none; }
.topbar-action:hover { opacity: 1; }

/* 主体：侧边栏 + 内容 */
.app-body { display: flex; flex: 1; }

/* 侧边栏 */
.sidebar {
  width: 200px; background: #f8f9fa; border-right: 1px solid var(--border);
  padding: 12px; display: flex; flex-direction: column; gap: 2px;
  flex-shrink: 0; overflow-y: auto;
}
.sidebar-section { font-size: 10px; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.05em; padding: 16px 12px 4px; font-weight: 600; }
.sidebar-link { display: flex; align-items: center; gap: 8px; padding: 10px 12px; font-size: 14px; color: var(--text-secondary); text-decoration: none; border-radius: 6px; font-weight: 500; cursor: pointer; border: none; background: none; width: 100%; text-align: left; font-family: inherit; }
.sidebar-link:hover { background: #f1f3f4; }
.sidebar-link.active { color: var(--primary); background: #e8f0fe; }
.sidebar-link .badge { margin-left: auto; }

/* 内容区 */
.main-content { flex: 1; padding: 20px; background: var(--bg); overflow-y: auto; }

/* 删除旧的 sidebar overlay 和 sidebar 样式 (行 51-69) */
/* 删除旧的 .main-content: padding: 16px (行 72) */
/* 保留 .topbar 到行 41 但移除 flex:1 的 .topbar-title */

/* 响应式：窄屏隐藏侧边栏改用顶栏 hamburger */
@media (max-width: 768px) {
  .sidebar { display: none; }
  .main-content { padding: 12px; }
}
```

同时删除旧样式：
- 行 28-34: 旧 `#app` 样式
- 行 50-51: `.sidebar-overlay`
- 行 52-58: `.sidebar` (替换为新样式)
- 行 64: `.close-btn`
- 行 72: `.main-content` (替换为新样式)

- [ ] **Step 2: 重写 App.vue 模板**

```vue
<template>
  <div id="app" :class="{ 'standalone': isStandalone }">
    <!-- 登录页无壳 -->
    <template v-if="!auth.isLoggedIn">
      <router-view />
    </template>

    <!-- 主壳 -->
    <template v-else>
      <nav class="topbar">
        <span class="topbar-title">{{ project?.name || '物业承接查验系统' }}</span>
        <div class="topbar-actions">
          <router-link v-if="auth.isManager" :to="'/projects/' + projectId + '/dashboard'" class="topbar-action">仪表盘</router-link>
          <router-link v-if="auth.isManager" :to="'/projects/' + projectId + '/settings'" class="topbar-action">配置</router-link>
          <span class="topbar-action" style="cursor:default">{{ auth.user?.display_name }}</span>
          <span class="topbar-action" @click="logout" style="cursor:pointer">退出</span>
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
  </div>
</template>
```

- [ ] **Step 3: 更新 App.vue script**

```js
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import api from './api'

const route = useRoute()
const auth = useAuthStore()
const projectId = ref(null)
const project = ref(null)
const isStandalone = ref(window.matchMedia('(display-mode: standalone)').matches)

onMounted(async () => {
  if (auth.isLoggedIn) {
    // 获取第一个项目
    const { data: projects } = await api.get('/projects')
    if (projects.length > 0) {
      projectId.value = projects[0].id
      project.value = projects[0]
    }
  }
})

function logout() {
  auth.logout()
  router.push('/login')
}
```

- [ ] **Step 4: 更新路由**

```js
// 修改 router.js
{ path: '/', redirect: '/projects' },  // 保持不变，但 ProjectList 改为自动跳转

// 新增路由
{
  path: '/projects/:id/equipment',
  name: 'Equipment',
  component: () => import('../views/Equipment.vue')
},
{
  path: '/projects/:id/templates',
  name: 'ReferenceForms',
  component: () => import('../views/ReferenceForms.vue')
}
```

- [ ] **Step 5: 修改 ProjectList.vue 自动跳转**

```vue
// 登录后自动进入第一个项目
onMounted(async () => {
  const { data } = await api.get('/projects')
  if (data.length > 0) {
    router.replace('/projects/' + data[0].id)
  }
})
```

- [ ] **Step 6: 验证布局**

Run: `cd frontend && npx vite --port 5173`
Check: 登录后侧边栏可见，路由切换正常

- [ ] **Step 7: Commit**

```bash
git add frontend/src/style.css frontend/src/App.vue frontend/src/router.js
git commit -m "feat: 全宽顶栏+侧边栏布局框架"
```

---

### Task 2: 我的表单页面

**Files:**
- Modify: `frontend/src/views/ProjectDetail.vue`

- [ ] **Step 1: 重写为"我的表单"页面**

移除基本信息卡片。移除标签页（参考表单、设备档案拆分到独立页面）。保留"我的表单"功能。

```vue
<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">📋 我的表单</h1>
      <button class="btn btn-sm" @click="showCreateBlank=true">+ 创建空白表单</button>
    </div>
    <p class="text-sm text-secondary mb-16">从左侧「📁 参考表单」选择模板一键创建，或点击右上角创建空白表单。完成后打印空白表带去现场检查。</p>

    <div v-if="loading" class="empty">加载中...</div>
    <template v-else>
      <div v-if="myForms.length === 0" class="empty" style="padding:60px 16px">
        <div style="font-size:48px;margin-bottom:12px">📋</div>
        <p style="font-weight:600;font-size:15px;margin-bottom:6px">还没有表单</p>
        <p class="text-sm">去左侧「📁 参考表单」浏览 28 套系统模板<br>选择需要的模板，一键创建为你的表单<br>或点击右上角「+ 创建空白表单」从零开始</p>
      </div>
      <div v-for="f in myForms" :key="f.id" class="card">
        <div class="card-header">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span v-if="f.template_form_id" class="badge badge-pass">{{ f.template_form_id }}</span>
              <span class="card-title" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ f.title }}</span>
            </div>
            <span class="text-sm text-secondary">{{ f.item_count || 0 }} 项 · {{ f.creator_name }} · {{ formatDate(f.created_at) }}</span>
          </div>
          <div class="flex gap-8" style="flex-shrink:0">
            <button class="btn btn-sm" @click="printBlank(f)">🖨 打印空白表</button>
            <button class="btn btn-sm btn-outline" @click="editMyForm(f)">编辑</button>
            <button class="btn btn-sm btn-danger-outline" @click="deleteForm(f)">删除</button>
          </div>
        </div>
      </div>
    </template>

    <!-- Create blank modal (保持原有) -->
  </div>
</template>
```

- [ ] **Step 2: 清理 script**

移除 `tab`, `refTemplates`, `refCategories`, `equipment`, `equipFilter` 等不再需要的状态。保留 `myForms`, `showCreateBlank`, `blankForm` 相关逻辑。新增 `formatDate` 辅助函数。

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/ProjectDetail.vue
git commit -m "feat: 我的表单页面重构"
```

---

### Task 3: 参考表单页面（新建）

**Files:**
- Create: `frontend/src/views/ReferenceForms.vue`

- [ ] **Step 1: 创建参考表单页面**

从 ProjectDetail 提取参考表单逻辑，双列网格展示 A/B/C/D 四类模板。

```vue
<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">📁 参考表单</h1>
    </div>
    <p class="text-sm text-secondary mb-16">{{ templates.length }} 套系统预设模板。点击「+ 创建」直接生成个人表单。</p>

    <div v-if="loading" class="empty">加载中...</div>
    <template v-else>
      <div v-for="cat in categories" :key="cat.name" class="mb-16">
        <h3 class="text-sm text-secondary mb-8" style="font-weight:600;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border);padding-bottom:6px">{{ cat.name }}</h3>
        <div class="template-grid">
          <div v-for="t in cat.templates" :key="t.id" class="card" style="padding:12px 16px;cursor:pointer" @click="createFromTemplate(t)">
            <div class="flex items-center justify-between">
              <div>
                <span class="badge badge-pass" style="margin-right:8px">{{ t.form_id }}</span>
                <span style="font-weight:500;font-size:14px">{{ t.title }}</span>
                <span class="text-sm text-secondary" style="margin-left:8px">{{ t.item_count || 0 }}项</span>
              </div>
              <span style="color:var(--primary);font-weight:500;font-size:12px;flex-shrink:0">+ 创建</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'

const route = useRoute()
const router = useRouter()
const templates = ref([])
const loading = ref(true)

const categories = computed(() => {
  const cats = { A: { name: 'A. 设备用房查验', templates: [] }, B: { name: 'B. 公共部位查验', templates: [] }, C: { name: 'C. 室内专有部分查验', templates: [] }, D: { name: 'D. 资料与物品移交', templates: [] } }
  for (const t of templates.value) {
    const prefix = t.form_id.charAt(0)
    if (cats[prefix]) cats[prefix].templates.push(t)
  }
  return Object.values(cats).filter(c => c.templates.length > 0)
})

onMounted(async () => {
  const { data } = await api.get('/projects/' + route.params.id + '/my-templates')
  templates.value = data
  loading.value = false
})

function createFromTemplate(t) {
  router.push('/projects/' + route.params.id + '/template/' + t.id)
}
</script>

<style scoped>
.template-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
@media (max-width: 900px) { .template-grid { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/ReferenceForms.vue
git commit -m "feat: 参考表单独立页面"
```

---

### Task 4: 设备档案页面（新建）

**Files:**
- Create: `frontend/src/views/Equipment.vue`

- [ ] **Step 1: 创建设备档案页面**

从 ProjectDetail 提取设备相关逻辑。

```vue
<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">🔧 设备档案</h1>
      <button v-if="auth.isManager" class="btn btn-sm" @click="openAdd">+ 添加设备</button>
    </div>

    <div class="filter-bar">
      <select v-model="filter.category" class="select" style="width:auto" @change="load">
        <option value="">全部分类</option>
        <option value="配电">配电</option><option value="消防">消防</option><option value="电梯">电梯</option>
        <option value="给排水">给排水</option><option value="暖通">暖通</option><option value="弱电">弱电</option><option value="其他">其他</option>
      </select>
      <select v-model="filter.status" class="select" style="width:auto" @change="load">
        <option value="">全部状态</option>
        <option value="normal">正常</option><option value="maintenance">保养中</option>
        <option value="repair">待修</option><option value="scrapped">已报废</option>
      </select>
    </div>

    <div v-if="error" class="empty">{{ error }}</div>
    <div v-else-if="list.length === 0" class="empty">暂无设备档案</div>
    <div v-for="eq in list" :key="eq.id" class="card">
      <div class="card-header">
        <span class="card-title" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:8px">{{ eq.name }}</span>
        <div class="flex gap-8" style="flex-shrink:0">
          <span class="badge" :class="statusClass(eq.status)">{{ statusLabel(eq.status) }}</span>
          <button v-if="auth.isManager" class="btn btn-sm btn-outline" @click="edit(eq)">编辑</button>
          <button v-if="auth.isManager" class="btn btn-sm btn-danger-outline" @click="del(eq)">删除</button>
        </div>
      </div>
      <div class="equip-info">
        <div><span class="text-secondary">分类：</span>{{ eq.category || '-' }}</div>
        <div><span class="text-secondary">型号：</span>{{ eq.model || '-' }}</div>
        <div><span class="text-secondary">编号：</span>{{ eq.serial_number || '-' }}</div>
        <div><span class="text-secondary">安装日期：</span>{{ eq.install_date || '-' }}</div>
        <div><span class="text-secondary">位置：</span>{{ [eq.building_name, eq.house_number, eq.location].filter(Boolean).join(' ') || '-' }}</div>
        <div><span class="text-secondary">备注：</span>{{ eq.notes || '-' }}</div>
      </div>
    </div>

    <!-- Modal (复用 ProjectDetail 的 modal 逻辑) -->
  </div>
</template>

<style scoped>
.equip-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 12px; font-size: 12px; color: var(--text); }
@media (max-width: 768px) { .equip-info { grid-template-columns: 1fr 1fr; } }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/Equipment.vue
git commit -m "feat: 设备档案独立页面"
```

---

### Task 5: 检查记录页面重构

**Files:**
- Modify: `frontend/src/views/RecordList.vue`

- [ ] **Step 1: 更新检查记录页面**

更新为新的卡片样式，带筛选栏和不合格计数。

```vue
<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">✅ 检查记录</h1>
      <button class="btn btn-sm" @click="showCreate=true">+ 新增记录</button>
    </div>

    <div class="filter-bar">
      <select v-model="filters.template_id" class="select" style="width:auto" @change="load">
        <option :value="null">全部表单</option>
        <option v-for="f in forms" :key="f.id" :value="f.id">{{ f.title }}</option>
      </select>
      <select v-model="filters.status" class="select" style="width:auto" @change="load">
        <option value="">全部状态</option>
        <option value="pending">待查验</option>
        <option value="in_progress">查验中</option>
        <option value="completed">已完成</option>
      </select>
    </div>

    <div v-if="loading" class="empty">加载中...</div>
    <div v-else-if="records.length === 0" class="empty" style="padding:60px 16px">
      <div style="font-size:48px;margin-bottom:12px">✅</div>
      <p style="font-weight:600;font-size:15px;margin-bottom:6px">暂无检查记录</p>
      <p class="text-sm">点击右上角「+ 新增记录」开始<br>选择表单和位置，即可逐项录入检查结果</p>
    </div>
    <div v-for="r in records" :key="r.id" class="card" style="cursor:pointer" @click="openRecord(r)">
      <div class="flex justify-between items-start">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px;margin-bottom:4px">{{ r.template_title || r.form_title || '未命名记录' }}</div>
          <div class="flex gap-12 text-sm text-secondary" style="flex-wrap:wrap">
            <span>{{ r.creator_name }}</span>
            <span v-if="r.building_name || r.location_info">{{ r.building_name }} {{ r.location_info }}</span>
            <span>{{ formatDate(r.updated_at || r.created_at) }}</span>
            <span>{{ r.item_count || 0 }} 项</span>
            <span v-if="r.fail_count" style="color:var(--danger)">{{ r.fail_count }} 不合格</span>
          </div>
        </div>
        <div class="flex gap-8 items-center" style="flex-shrink:0;margin-left:12px">
          <span class="badge" :class="statusBadgeMap[r.status] || 'badge-pending'">{{ statusLabelMap[r.status] || r.status }}</span>
          <button class="btn btn-sm btn-danger-outline" @click.stop="del(r)">删除</button>
          <span class="text-secondary" style="font-size:18px">›</span>
        </div>
      </div>
    </div>

    <!-- Create record modal: 选择表单 -->
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/RecordList.vue
git commit -m "feat: 检查记录页面重构，新增筛选和状态标签"
```

---

### Task 6: 仪表盘页面重构

**Files:**
- Modify: `frontend/src/views/Dashboard.vue`

- [ ] **Step 1: 重写仪表盘，增加月份范围选择器**

添加月份范围选择（从 X 月到 Y 月，快捷按钮近3/6/12月），月度柱状图，员工完成率。

核心变更：
- 顶部：标题 + 月份范围选择器（两个 select + 快捷按钮）
- 4 统计卡片
- 双列表格：按模板 + 按员工（含完成/待完成）
- 简单柱状图（CSS 实现，蓝=完成 红=待处理）
- 最近记录列表

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/Dashboard.vue
git commit -m "feat: 仪表盘增加月份范围选择和趋势图"
```

---

### Task 7: 配置页面和登录页

**Files:**
- Modify: `frontend/src/views/Settings.vue`
- Modify: `frontend/src/views/Login.vue`

- [ ] **Step 1: 精简 Settings.vue**

移除"表单授权"标签页（如果存在）。保留楼栋管理、房源管理、成员管理三个标签。样式微调。

- [ ] **Step 2: 精简 Login.vue**

登录成功后自动跳转到 `/projects`（ProjectList 会自动重定向到第一个项目）。

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/Settings.vue frontend/src/views/Login.vue
git commit -m "feat: 配置精简、登录自动跳转项目"
```

---

### Task 8: 清理和验证

**Files:**
- Modify: `frontend/src/router.js`

- [ ] **Step 1: 清理不需要的路由和组件**

- 删除 `PrintSelect` 路由（打印从表单/记录直接进入）
- 确认所有新路由已注册
- 移除旧的 hamburger 菜单相关样式

- [ ] **Step 2: 端到端验证**

启动前后端，验证完整流程：
1. 登录 → 直接进入项目
2. 侧边栏 4 项切换正常
3. 我的表单：创建、打印、编辑、删除
4. 参考表单：浏览、一键创建
5. 检查记录：新增、录入、上传照片
6. 仪表盘：月份切换、统计刷新
7. 配置：楼栋/房源/成员管理

- [ ] **Step 3: Commit**

```bash
git add frontend/src/router.js
git commit -m "chore: 清理路由，移除 PrintSelect"
```
