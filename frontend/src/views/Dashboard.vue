<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">📊 项目仪表盘</h1>
    </div>

    <!-- Month range selector -->
    <div class="card mb-16" style="padding:12px 16px">
      <div class="flex items-center gap-12" style="flex-wrap:wrap">
        <span style="font-weight:500;font-size:13px">统计范围：</span>
        <select v-model="fromMonth" class="select" style="width:auto" @change="loadStats">
          <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
        <span class="text-secondary" style="font-size:13px">至</span>
        <select v-model="toMonth" class="select" style="width:auto" @change="loadStats">
          <option v-for="m in toMonthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
        <div class="flex gap-4" style="flex-shrink:0">
          <button class="btn btn-sm" :class="{ 'btn-outline': rangeQuick !== 3 }" @click="setRange(3)">近3月</button>
          <button class="btn btn-sm" :class="{ 'btn-outline': rangeQuick !== 6 }" @click="setRange(6)">近6月</button>
          <button class="btn btn-sm" :class="{ 'btn-outline': rangeQuick !== 12 }" @click="setRange(12)">近1年</button>
        </div>
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
        <div class="stat-card stat-fail">
          <div class="stat-value">{{ stats.failCount }}</div>
          <div class="stat-label">不合格项</div>
        </div>
        <div class="stat-card stat-pass">
          <div class="stat-value">{{ stats.completedCount }}</div>
          <div class="stat-label">已完成</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ (stats.recordCount || 0) - (stats.completedCount || 0) }}</div>
          <div class="stat-label">待处理</div>
        </div>
      </div>

      <!-- Monthly bar chart -->
      <div class="card mb-16" v-if="stats.monthly && stats.monthly.length > 0">
        <div class="card-title mb-12">月度趋势</div>
        <div class="chart">
          <div class="chart-row" v-for="m in stats.monthly" :key="m.month">
            <span class="chart-label">{{ m.month }}</span>
            <div class="chart-bars">
              <div class="chart-bar chart-bar-done" :style="{ width: barPct(m.completed, maxBar) + '%' }" :title="'已完成 ' + (m.completed || 0)"></div>
              <div class="chart-bar chart-bar-pending" :style="{ width: barPct(m.count - m.completed, maxBar) + '%' }" :title="'待处理 ' + ((m.count || 0) - (m.completed || 0))"></div>
            </div>
            <span class="chart-num">{{ m.count || 0 }}</span>
          </div>
          <div class="chart-legend">
            <span><span class="chart-dot" style="background:var(--primary)"></span> 已完成</span>
            <span><span class="chart-dot" style="background:var(--danger)"></span> 待处理</span>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px" class="mb-16">
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
        <div v-for="r in stats.recentRecords" :key="r.id" class="flex items-center gap-8" style="padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer" @click="openRecord(r)">
          <div class="flex-1" style="min-width:0">
            <div style="font-weight:500;font-size:14px">{{ r.template_title }}</div>
            <div class="text-sm text-secondary">{{ r.creator_name }} · {{ r.building_name || r.house_number || r.location_info || '未指定位置' }} · {{ r.updated_at }}</div>
          </div>
          <span class="badge" :class="statusBadgeMap[r.status] || 'badge-pending'">{{ statusLabelMap[r.status] || r.status }}</span>
          <span style="color:var(--text-light);font-size:18px">›</span>
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
const projectId = route.params.id
const stats = ref(null)
const loading = ref(true)
const rangeQuick = ref(12)

// Generate last 24 months for selector
const monthOptions = computed(() => {
  const opts = []
  const now = new Date()
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    const label = d.getFullYear() + '年' + (d.getMonth() + 1) + '月'
    opts.push({ value, label })
  }
  return opts
})

const fromMonth = ref(monthOptions.value.length >= 12 ? monthOptions.value[monthOptions.value.length - 12].value : monthOptions.value[0]?.value || '')
const toMonth = ref(monthOptions.value[monthOptions.value.length - 1]?.value || '')

const toMonthOptions = computed(() => {
  return monthOptions.value.filter(m => m.value >= fromMonth.value)
})

const maxBar = computed(() => {
  if (!stats.value?.monthly) return 1
  let max = 0
  for (const m of stats.value.monthly) {
    if (m.count > max) max = m.count
  }
  return max || 1
})

function barPct(v, max) {
  if (!v || !max) return 0
  return Math.round(v / max * 100)
}

function setRange(months) {
  rangeQuick.value = months
  const to = monthOptions.value[monthOptions.value.length - 1]
  const fromIdx = monthOptions.value.length - months
  const from = monthOptions.value[fromIdx >= 0 ? fromIdx : 0]
  toMonth.value = to.value
  fromMonth.value = from.value
  loadStats()
}

onMounted(() => {
  loadStats()
})

async function loadStats() {
  loading.value = true
  try {
    const params = fromMonth.value ? '?from=' + fromMonth.value + '&to=' + toMonth.value : ''
    const { data } = await api.get('/projects/' + projectId + '/stats' + params)
    stats.value = data
  } catch (e) {
    console.error('Failed to load stats', e)
  } finally {
    loading.value = false
  }
}

const statusBadgeMap = { completed: 'badge-completed', in_progress: 'badge-in_progress', pending: 'badge-pending' }
const statusLabelMap = { completed: '已完成', in_progress: '查验中', pending: '待查验' }

function openRecord(r) {
  router.push('/projects/' + projectId + '/template/' + r.template_id + '?record=' + r.id)
}
</script>

<style scoped>
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.stat-card { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); padding: 16px; text-align: center; }
.stat-value { font-size: 32px; font-weight: 700; color: var(--primary); }
.stat-label { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
.stat-pass .stat-value { color: var(--success); }
.stat-fail .stat-value { color: var(--danger); }

.chart { padding: 4px 0; }
.chart-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.chart-label { width: 60px; font-size: 11px; color: var(--text-secondary); text-align: right; flex-shrink: 0; }
.chart-bars { flex: 1; display: flex; height: 20px; border-radius: 3px; overflow: hidden; background: #f1f3f4; }
.chart-bar { height: 100%; transition: width 0.3s; }
.chart-bar-done { background: var(--primary); }
.chart-bar-pending { background: var(--danger); }
.chart-num { width: 28px; font-size: 11px; color: var(--text-secondary); flex-shrink: 0; }
.chart-legend { display: flex; gap: 16px; margin-top: 8px; font-size: 12px; color: var(--text-secondary); align-items: center; }
.chart-dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; }

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
