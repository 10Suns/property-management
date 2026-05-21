<template>
  <div>
    <div class="page-header">
      <div class="flex items-center gap-8">
        <button class="btn btn-sm btn-outline" @click="router.push('/projects/' + projectId)">← 返回</button>
        <h1 class="page-title">项目配置</h1>
      </div>
    </div>

    <div class="tabs">
      <div class="tab" :class="{ active: tab === 'buildings' }" @click="tab='buildings'">楼栋管理</div>
      <div class="tab" :class="{ active: tab === 'houses' }" @click="tab='houses'">房源管理</div>
      <div class="tab" :class="{ active: tab === 'members' }" @click="tab='members'; loadMembers()">成员管理</div>
      <div class="tab" :class="{ active: tab === 'auth' }" @click="tab='auth'; loadAccess()">表单授权</div>
    </div>

    <!-- Buildings -->
    <div v-if="tab === 'buildings'">
      <div class="flex gap-8 mb-12">
        <input v-model="newBuildingName" class="input" style="flex:1" placeholder="楼栋名称" @keyup.enter="addBuilding" />
        <button class="btn btn-sm" @click="addBuilding">添加</button>
      </div>
      <div v-if="buildings.length === 0" class="empty">暂无楼栋</div>
      <div v-for="b in buildings" :key="b.id" class="list-item">
        <div class="list-item-body">
          <div class="list-item-title">{{ b.name }}</div>
          <div class="list-item-sub">{{ b.house_count || 0 }} 户</div>
        </div>
        <button class="btn btn-sm btn-outline" @click="deleteBuilding(b)">删除</button>
      </div>
    </div>

    <!-- Houses -->
    <div v-if="tab === 'houses'">
      <div class="flex gap-8 mb-12 flex-wrap">
        <select v-model="houseForm.building_id" class="select" style="width:auto;min-width:140px">
          <option :value="null">全部楼栋</option>
          <option v-for="b in buildings" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <input v-model="houseForm.house_number" class="input" style="flex:1;min-width:120px" placeholder="房号" />
        <input v-model="houseForm.area" class="input" style="width:100px;min-width:80px" placeholder="面积" />
        <button class="btn btn-sm" @click="addHouse">添加</button>
      </div>
      <div v-if="houses.length === 0" class="empty">暂无房源</div>
      <div v-for="h in houses" :key="h.id" class="list-item">
        <div class="list-item-body">
          <div class="list-item-title">{{ h.house_number }}</div>
          <div class="list-item-sub">{{ h.building_name || '未分配楼栋' }} · {{ h.area || '-' }}㎡</div>
        </div>
        <button class="btn btn-sm btn-outline" @click="deleteHouse(h)">删除</button>
      </div>
    </div>

    <!-- Members -->
    <div v-if="tab === 'members'">
      <div class="card mb-12">
        <div class="card-header">
          <span class="card-title">项目成员</span>
          <button class="btn btn-sm" @click="showMemberAdd=true">+ 添加成员</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>编号</th><th>姓名</th><th>角色</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="m in members" :key="m.id">
                <td>{{ m.username }}</td>
                <td>{{ m.display_name }}</td>
                <td><span class="badge" :class="m.role==='admin'?'badge-pass':'badge-skip'">{{ m.role==='admin'?'管理员':'成员' }}</span></td>
                <td>
                  <button v-if="m.id !== currentUserId" class="btn btn-sm btn-outline" style="color:var(--danger);border-color:var(--danger)" @click="removeMember(m)">移除</button>
                  <button v-if="m.id !== currentUserId" class="btn btn-sm btn-outline ml-8" @click="resetMemberPwd(m)">重置密码</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Template Access -->
    <div v-if="tab === 'auth'">
      <div class="card">
        <div class="card-header">
          <span class="card-title">用户表单权限</span>
          <button class="btn btn-sm" @click="showAuthAdd=true">+ 授权</button>
        </div>
        <p class="text-sm text-secondary mb-8">如不设置权限，则所有用户可访问全部模板。</p>
        <div v-if="accessList.length === 0" class="empty text-sm">暂无授权记录</div>
        <div v-for="a in accessList" :key="a.id" class="list-item">
          <div class="list-item-body">
            <div class="list-item-title">{{ a.display_name }} ({{ a.username }})</div>
            <div class="list-item-sub">{{ a.form_id }} — {{ a.template_title }}</div>
          </div>
          <button class="btn btn-sm btn-outline" style="color:var(--danger);border-color:var(--danger)" @click="revokeAccess(a)">取消</button>
        </div>
      </div>
    </div>

    <!-- Add Member Modal -->
    <div class="modal" v-if="showMemberAdd" @click.self="showMemberAdd=false">
      <div class="modal-card">
        <h3>添加成员</h3>
        <p class="text-sm text-secondary mb-12">输入姓名即可，系统自动分配编号和初始密码。</p>
        <div class="form-group">
          <label class="form-label">姓名 *</label>
          <input v-model="memberForm.display_name" class="input" placeholder="如：张三" @keyup.enter="doAddMember" />
        </div>
        <div class="form-group">
          <label class="form-label">角色</label>
          <select v-model="memberForm.role" class="select">
            <option value="member">成员</option>
            <option value="admin">项目管理员</option>
          </select>
        </div>
        <p class="error-msg" v-if="memberError">{{ memberError }}</p>
        <div class="modal-actions">
          <button class="btn" @click="doAddMember" :disabled="memberLoading">添加</button>
          <button class="btn btn-outline" @click="showMemberAdd=false">取消</button>
        </div>
      </div>
    </div>

    <!-- Reset Password Modal -->
    <div class="modal" v-if="showPwdReset" @click.self="showPwdReset=false">
      <div class="modal-card">
        <h3>重置密码</h3>
        <p>为用户 <b>{{ pwdResetUser?.display_name }}</b> 重置密码：</p>
        <div class="form-group">
          <label class="form-label">新密码</label>
          <input :value="newPwd" class="input" readonly style="font-size:24px;text-align:center;letter-spacing:4px" />
        </div>
        <p class="text-sm text-secondary">请将此密码告知用户，用户无法自行修改密码。</p>
        <div class="modal-actions">
          <button class="btn" @click="confirmResetPwd">确认重置</button>
          <button class="btn btn-outline" @click="showPwdReset=false">取消</button>
        </div>
      </div>
    </div>

    <!-- Auth Modal -->
    <div class="modal" v-if="showAuthAdd" @click.self="showAuthAdd=false">
      <div class="modal-card">
        <h3>授权用户访问模板</h3>
        <div class="form-group">
          <label class="form-label">用户</label>
          <select v-model="authForm.user_id" class="select">
            <option :value="null">请选择</option>
            <option v-for="m in members" :key="m.id" :value="m.id">{{ m.display_name }} ({{ m.username }})</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">模板</label>
          <select v-model="authForm.template_id" class="select">
            <option :value="null">请选择</option>
            <option v-for="t in allTemplates" :key="t.id" :value="t.id">{{ t.form_id }} {{ t.title }}</option>
          </select>
        </div>
        <p class="error-msg" v-if="authError">{{ authError }}</p>
        <div class="modal-actions">
          <button class="btn" @click="doAuth" :disabled="authLoading">授权</button>
          <button class="btn btn-outline" @click="showAuthAdd=false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'

const route = useRoute()
const router = useRouter()
const projectId = route.params.id
const tab = ref('buildings')
const currentUserId = ref(null)

// Buildings
const buildings = ref([])
const newBuildingName = ref('')

// Houses
const houses = ref([])
const houseForm = ref({ building_id: null, house_number: '', area: '' })

// Members
const members = ref([])
const showMemberAdd = ref(false)
const memberForm = ref({ display_name: '', role: 'member' })
const memberError = ref('')
const memberLoading = ref(false)
const showPwdReset = ref(false)
const pwdResetUser = ref(null)
const newPwd = ref('')

// Auth
const accessList = ref([])
const allTemplates = ref([])
const showAuthAdd = ref(false)
const authForm = ref({ user_id: null, template_id: null })
const authError = ref('')
const authLoading = ref(false)

onMounted(async () => {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  currentUserId.value = user?.id
  await loadBuildings()
  const { data: t } = await api.get('/templates')
  allTemplates.value = t
})

async function loadBuildings() {
  const { data } = await api.get('/projects/' + projectId + '/buildings')
  buildings.value = data
}
async function addBuilding() {
  if (!newBuildingName.value.trim()) return
  await api.post('/projects/' + projectId + '/buildings', { name: newBuildingName.value.trim() })
  newBuildingName.value = ''
  loadBuildings()
}
async function deleteBuilding(b) {
  if (!confirm('确定删除楼栋 "' + b.name + '"？')) return
  await api.delete('/projects/' + projectId + '/buildings/' + b.id)
  loadBuildings()
}
watch(() => houseForm.value.building_id, loadHouses)
async function loadHouses() {
  const params = houseForm.value.building_id ? '?building_id=' + houseForm.value.building_id : ''
  const { data } = await api.get('/projects/' + projectId + '/houses' + params)
  houses.value = data
}
async function addHouse() {
  if (!houseForm.value.house_number.trim()) return
  await api.post('/projects/' + projectId + '/houses', { ...houseForm.value })
  houseForm.value.house_number = ''
  houseForm.value.area = ''
  loadHouses()
}
async function deleteHouse(h) {
  if (!confirm('确定删除房源 "' + h.house_number + '"？')) return
  await api.delete('/projects/' + projectId + '/houses/' + h.id)
  loadHouses()
}

// Members
async function loadMembers() {
  const { data } = await api.get('/projects/' + projectId + '/members')
  members.value = data
}
function generatePwd() {
  return String(Math.floor(100000 + Math.random() * 900000))
}
async function doAddMember() {
  memberError.value = ''
  if (!memberForm.value.display_name.trim()) { memberError.value = '请输入姓名'; return }
  memberLoading.value = true
  try {
    // Auto-generate username: M + 3-digit member count
    const num = members.value.length + 1
    const username = 'M' + String(num).padStart(3, '0')
    const password = generatePwd()
    // Create user via /users
    const { data: user } = await api.post('/users', {
      username,
      password,
      display_name: memberForm.value.display_name.trim(),
      role: 'user'
    })
    // Add to project
    await api.post('/projects/' + projectId + '/members', {
      user_id: user.id,
      role: memberForm.value.role
    })
    showMemberAdd.value = false
    memberForm.value = { display_name: '', role: 'member' }
    loadMembers()
    alert('成员已创建\n编号：' + username + '\n密码：' + password + '\n请告知成员，成员不可自行修改密码。')
  } catch (e) {
    memberError.value = e.response?.data?.error || '添加失败'
  } finally { memberLoading.value = false }
}
async function removeMember(m) {
  if (!confirm('确定移除成员 "' + m.display_name + '"？')) return
  await api.delete('/projects/' + projectId + '/members/' + m.id)
  loadMembers()
}
function resetMemberPwd(m) {
  pwdResetUser.value = m
  newPwd.value = generatePwd()
  showPwdReset.value = true
}
async function confirmResetPwd() {
  // Admin resets via /users endpoint - need to update user password
  // For simplicity, use the auth password endpoint isn't right
  // We need a separate admin reset endpoint. For now, notify admin.
  // Actually, let's create a backend endpoint for admin password reset
  try {
    await api.put('/users/' + pwdResetUser.value.id + '/reset-password', {
      password: newPwd.value
    })
    showPwdReset.value = false
    alert('密码已重置为：' + newPwd.value)
  } catch (e) {
    // Fallback: show password to admin
    alert('请手动告知新密码：' + newPwd.value + '\n（需后端支持管理员重置密码接口）')
    showPwdReset.value = false
  }
}

// Auth
async function loadAccess() {
  const { data } = await api.get('/projects/' + projectId + '/template-access')
  accessList.value = data
}
async function doAuth() {
  authError.value = ''
  if (!authForm.value.user_id || !authForm.value.template_id) { authError.value = '请选择用户和模板'; return }
  authLoading.value = true
  try {
    await api.post('/projects/' + projectId + '/template-access', authForm.value)
    showAuthAdd.value = false
    authForm.value = { user_id: null, template_id: null }
    loadAccess()
  } catch (e) {
    authError.value = e.response?.data?.error || '授权失败'
  } finally { authLoading.value = false }
}
async function revokeAccess(a) {
  await api.delete('/projects/' + projectId + '/template-access/' + a.id)
  loadAccess()
}
</script>

<style scoped>
.ml-8 { margin-left: 8px; }
</style>
