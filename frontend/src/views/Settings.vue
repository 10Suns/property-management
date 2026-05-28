<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">⚙️ 项目配置</h1>
    </div>

    <div class="tabs">
      <div class="tab" :class="{ active: tab === 'info' }" @click="tab='info'">项目信息</div>
      <div class="tab" :class="{ active: tab === 'buildings' }" @click="tab='buildings'">楼栋管理</div>
      <div class="tab" :class="{ active: tab === 'houses' }" @click="tab='houses'">房源管理</div>
      <div class="tab" :class="{ active: tab === 'members' }" @click="tab='members'; loadMembers()">成员管理</div>
    </div>

    <!-- Project Info -->
    <div v-if="tab === 'info'" class="card">
      <div class="card-header"><h3 class="card-title">基本信息</h3></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">项目名称 *</label><input v-model="projectForm.name" class="input" placeholder="如：瑞界物业" /></div>
        <div class="form-group"><label class="form-label">项目类型</label><select v-model="projectForm.type" class="select"><option value="industrial">工业</option><option value="commercial">商业</option><option value="residential">住宅</option><option value="other">其他</option></select></div>
      </div>
      <div class="form-group"><label class="form-label">地址</label><input v-model="projectForm.address" class="input" placeholder="详细地址" /></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">占地面积</label><input v-model="projectForm.land_area" class="input" placeholder="如：34000 ㎡" /></div>
        <div class="form-group"><label class="form-label">建筑面积</label><input v-model="projectForm.building_area" class="input" placeholder="如：120000 ㎡" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">交接日期</label><input v-model="projectForm.handover_date" type="date" class="input" /></div>
        <div class="form-group"><label class="form-label">开发商</label><input v-model="projectForm.developer" class="input" placeholder="开发商名称" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">物业经理</label><input v-model="projectForm.manager_name" class="input" placeholder="经理姓名" /></div>
        <div class="form-group"><label class="form-label">联系电话</label><input v-model="projectForm.manager_phone" class="input" placeholder="联系电话" /></div>
      </div>
      <div class="form-group"><label class="form-label">联系邮箱</label><input v-model="projectForm.email" class="input" placeholder="联系邮箱" /></div>
      <button class="btn" @click="saveProject" :disabled="projectSaving">{{ projectSaving ? '保存中...' : '保存项目信息' }}</button>
    </div>

    <!-- Buildings -->
    <div v-if="tab === 'buildings'">
      <div class="flex gap-8 mb-12">
        <input v-model="newBuildingName" class="input" style="flex:1" placeholder="楼栋名称" @keyup.enter="addBuilding" />
        <button class="btn btn-sm" @click="addBuilding">添加</button>
      </div>
      <div v-if="buildings.length === 0" class="empty">暂无楼栋</div>
      <div v-for="b in buildings" :key="b.id" class="card">
        <div class="card-header">
          <span class="card-title">{{ b.name }}</span>
          <button class="btn btn-sm btn-outline" @click="deleteBuilding(b)">删除</button>
        </div>
        <div class="text-sm text-secondary">{{ b.house_count || 0 }} 户</div>
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
      <div v-for="h in houses" :key="h.id" class="card">
        <div class="card-header">
          <span class="card-title">{{ h.house_number }}</span>
          <button class="btn btn-sm btn-outline" @click="deleteHouse(h)">删除</button>
        </div>
        <div class="text-sm text-secondary">{{ h.building_name || '未分配楼栋' }} · {{ h.area || '-' }}㎡</div>
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
                <td><span class="badge" :class="roleBadgeMap[m.role] || 'badge-skip'">{{ roleLabel(m.role) }}</span></td>
                <td>
                  <button v-if="m.id !== currentUserId" class="btn btn-sm btn-danger-outline" @click="removeMember(m)">移除</button>
                  <button v-if="m.id !== currentUserId" class="btn btn-sm btn-outline" style="margin-left:8px" @click="resetMemberPwd(m)">重置密码</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add Member Modal -->
    <div class="modal" v-if="showMemberAdd" @click.self="showMemberAdd=false">
      <div class="modal-card">
        <h3>添加成员</h3>
        <div class="form-group">
          <label class="form-label">员工编号</label>
          <input v-model="memberForm.username" class="input" readonly style="font-size:20px;text-align:center;letter-spacing:2px;font-weight:600" />
          <p class="text-sm text-secondary mt-4">系统自动分配编号（SG + 3位数字）</p>
        </div>
        <div class="form-group">
          <label class="form-label">姓名 *</label>
          <input v-model="memberForm.display_name" class="input" placeholder="如：张三" @keyup.enter="doAddMember" />
        </div>
        <div class="form-group">
          <label class="form-label">角色</label>
          <select v-model="memberForm.role" class="select">
            <option value="employee">基层员工</option>
            <option value="manager">物业经理</option>
            <option value="admin">系统管理员</option>
          </select>
        </div>
        <p class="error-msg" v-if="memberError">{{ memberError }}</p>
        <div class="modal-actions">
          <button class="btn" @click="doAddMember" :disabled="memberLoading">添加</button>
          <button class="btn btn-outline" @click="showMemberAdd=false">取消</button>
        </div>
      </div>
    </div>

    <!-- Member Created Credentials Modal -->
    <div class="modal" v-if="showCredentials" @click.self="showCredentials=false">
      <div class="modal-card">
        <h3>成员已创建</h3>
        <p class="text-sm text-secondary mb-12">请告知成员以下登录信息，成员无法自行修改密码。</p>
        <div class="form-group">
          <label class="form-label">用户名</label>
          <input :value="newMemberCreds.username" class="input" readonly style="font-size:20px;text-align:center;letter-spacing:2px;font-weight:600" @focus="$event.target.select()" />
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input :value="newMemberCreds.password" class="input" readonly style="font-size:24px;text-align:center;letter-spacing:4px;font-weight:600" @focus="$event.target.select()" />
        </div>
        <p class="text-sm" style="color:#c5221f">请立即复制保存此密码，关闭后无法找回！</p>
        <div class="modal-actions">
          <button class="btn" @click="showCredentials=false">已保存，关闭</button>
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
          <input :value="newPwd" class="input" readonly style="font-size:24px;text-align:center;letter-spacing:4px" @focus="$event.target.select()" />
        </div>
        <p class="text-sm text-secondary">请将此密码告知用户，用户无法自行修改密码。</p>
        <div class="modal-actions">
          <button class="btn" @click="confirmResetPwd">确认重置</button>
          <button class="btn btn-outline" @click="showPwdReset=false">取消</button>
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
const tab = ref(route.query.tab || 'info')
const currentUserId = ref(null)

// Project config
const projectForm = ref({ name: '', type: '', address: '', area: '', land_area: '', building_area: '', handover_date: '', developer: '', manager_name: '', manager_phone: '', email: '' })
const projectSaving = ref(false)

async function loadProject() {
  try {
    const { data } = await api.get('/projects/' + projectId)
    projectForm.value = { ...data }
  } catch (_) {}
}
async function saveProject() {
  if (!projectForm.value.name.trim()) return
  projectSaving.value = true
  try {
    await api.put('/projects/' + projectId, projectForm.value)
  } catch (e) {
    alert('保存失败：' + (e.response?.data?.error || '未知错误'))
  } finally { projectSaving.value = false }
}

// Buildings
const buildings = ref([])
const newBuildingName = ref('')

// Houses
const houses = ref([])
const houseForm = ref({ building_id: null, house_number: '', area: '' })

// Members
const members = ref([])
const showMemberAdd = ref(false)
const memberForm = ref({ username: '', display_name: '', role: 'employee' })
const memberError = ref('')
const memberLoading = ref(false)
const showPwdReset = ref(false)
const pwdResetUser = ref(null)
const newPwd = ref('')
const showCredentials = ref(false)
const newMemberCreds = ref({ username: '', password: '' })

const roleBadgeMap = { admin: 'badge-pass', manager: 'badge-in_progress', employee: 'badge-skip' }

function roleLabel(r) {
  return r === 'admin' ? '管理员' : r === 'manager' ? '经理' : '员工'
}

onMounted(async () => {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  currentUserId.value = user?.id
  await loadProject()
  await loadBuildings()
})

// Generate SG-format username
async function generateUsername() {
  try {
    const { data } = await api.get('/users')
    const sgUsers = data.filter(u => /^SG\d{3}$/.test(u.username))
    let maxNum = 0
    for (const u of sgUsers) {
      const num = parseInt(u.username.slice(2))
      if (num > maxNum) maxNum = num
    }
    const nextNum = String(maxNum + 1).padStart(3, '0')
    return 'SG' + nextNum
  } catch (e) {
    const ts = Date.now().toString(36).slice(-5).toUpperCase()
    return 'SG' + ts
  }
}

watch(showMemberAdd, async (v) => {
  if (v) {
    memberForm.value = { username: '', display_name: '', role: 'employee' }
    memberForm.value.username = await generateUsername()
  }
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
    const password = generatePwd()
    const { data: user } = await api.post('/users', {
      username: memberForm.value.username,
      password,
      display_name: memberForm.value.display_name.trim(),
      role: memberForm.value.role
    })
    try {
      await api.post('/projects/' + projectId + '/members', {
        user_id: user.id,
        role: memberForm.value.role === 'admin' ? 'admin' : 'member'
      })
    } catch (memberErr) {
      memberError.value = '成员创建成功但添加到项目失败：' + (memberErr.response?.data?.error || '未知错误')
      memberLoading.value = false
      return
    }
    showMemberAdd.value = false
    loadMembers()
    newMemberCreds.value = { username: memberForm.value.username, password }
    showCredentials.value = true
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
  try {
    await api.put('/users/' + pwdResetUser.value.id + '/reset-password', {
      password: newPwd.value
    })
    showPwdReset.value = false
    alert('密码已重置为：' + newPwd.value)
  } catch (e) {
    alert('请手动告知新密码：' + newPwd.value + '\n（需后端支持管理员重置密码接口）')
    showPwdReset.value = false
  }
}
</script>
