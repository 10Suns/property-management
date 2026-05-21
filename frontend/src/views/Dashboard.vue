<template>
  <div>
    <div class="page-header">
      <div class="flex items-center gap-8">
        <router-link :to="'/projects/' + projectId" class="btn btn-sm btn-outline">← 返回</router-link>
        <h1 class="page-title">项目仪表盘</h1>
      </div>
    </div>

    <div v-if="loading" class="empty">加载中...</div>
    <template v-else-if="stats">
      <!-- Summary cards -->
      <div class="stats-grid mb-16">
        <div class="stat-card">
          <div class="stat-value">{{ stats.recordCount }}</div>
          <div class="stat-label">总记录数</div>
        </div>
        <div class="stat-card stat-pass">
          <div class="stat-value">{{ stats.completedCount }}</div>
          <div class="stat-label">已完成</div>
        </div>
        <div class="stat-card stat-fail">
          <div class="stat-value">{{ stats.failCount }}</div>
          <div class="stat-label">不合格项</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.templateCount }}</div>
          <div class="stat-label">系统模板</div>
        </div>
      </div>

      <div class="form-row mb-16">
        <!-- By template -->
        <div class="card">
          <div class="card-title mb-8">按模板统计</div>
          <div v-if="!stats.byTemplate || stats.byTemplate.length === 0" class="empty text-sm">暂无数据</div>
          <table v-else>
            <thead><tr><th>模板</th><th class="text-center">总数</th><th class="text-center">已完成</th><th class="text-center">完成率</th></tr></thead>
            <tbody>
              <tr v-for="t in stats.byTemplate" :key="t.form_id">
                <td>{{ t.form_id }} {{ t.template_title }}</td>
                <td class="text-center">{{ t.count }}</td>
                <td class="text-center">{{ t.completed }}</td>
                <td class="text-center">{{ t.count > 0 ? Math.round(t.completed / t.count * 100) : 0 }}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- By user -->
        <div class="card">
          <div class="card-title mb-8">按员工统计</div>
          <div v-if="!stats.byUser || stats.byUser.length === 0" class="empty text-sm">暂无数据</div>
          <table v-else>
            <thead><tr><th>员工</th><th class="text-center">总数</th><th class="text-center">已完成</th><th class="text-center">完成率</th></tr></thead>
            <tbody>
              <tr v-for="u in stats.byUser" :key="u.username">
                <td>{{ u.display_name }} ({{ u.username }})</td>
                <td class="text-center">{{ u.count }}</td>
                <td class="text-center">{{ u.completed }}</td>
                <td class="text-center">{{ u.count > 0 ? Math.round(u.completed / u.count * 100) : 0 }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent records -->
      <div class="card">
        <div class="card-title mb-8">最近提交的记录</div>
        <div v-if="!stats.recentRecords || stats.recentRecords.length === 0" class="empty text-sm">暂无记录</div>
        <div v-for="r in stats.recentRecords" :key="r.id" class="list-item" @click="openRecord(r)">
          <div class="list-item-body">
            <div class="list-item-title">{{ r.template_title }}</div>
            <div class="list-item-sub">
              {{ r.creator_name }} · {{ r.building_name || r.house_number || r.location_info || '未指定位置' }}
              · {{ r.updated_at }}
            </div>
          </div>
          <span class="badge" :class="'badge-' + (r.status === 'completed' ? 'completed' : r.status === 'in_progress' ? 'in_progress' : 'pending')">{{ r.status === 'completed' ? '已完成' : r.status === 'in_progress' ? '查验中' : '待查验' }}</span>
          <span class="list-item-arrow">›</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'

const route = useRoute()
const router = useRouter()
const projectId = route.params.id
const stats = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await api.get('/projects/' + projectId + '/stats')
    stats.value = data
  } catch (e) {
    console.error('Failed to load stats', e)
  } finally {
    loading.value = false
  }
})

function openRecord(r) {
  router.push('/projects/' + projectId + '/template/' + r.template_id + '?record=' + r.id)
}
</script>

<style scoped>
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
.stat-card { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); padding: 16px; text-align: center; }
.stat-value { font-size: 32px; font-weight: 700; color: var(--primary); }
.stat-label { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
.stat-pass .stat-value { color: var(--success); }
.stat-fail .stat-value { color: var(--danger); }
</style>
