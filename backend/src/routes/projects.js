import { Router } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  const projects = db.prepare(`
    SELECT DISTINCT p.*, pm.role as member_role,
      (SELECT COUNT(*) FROM buildings WHERE project_id=p.id) as building_count,
      (SELECT COUNT(*) FROM houses WHERE project_id=p.id) as house_count
    FROM projects p
    LEFT JOIN project_members pm ON p.id=pm.project_id AND pm.user_id=?
    WHERE pm.user_id=? OR ?='admin'
    ORDER BY p.created_at DESC
  `).all(req.user.id, req.user.id, req.user.role)
  res.json(projects)
})

// Create project
router.post('/', (req, res) => {
  const { name, type, address, area, handover_date, developer, manager_name, manager_phone } = req.body
  if (!name) return res.status(400).json({ error: '项目名称不能为空' })
  const tx = db.transaction(() => {
    const r = db.prepare(`INSERT INTO projects (name,type,address,area,handover_date,developer,manager_name,manager_phone,created_by) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(name, type||'industrial', address, area, handover_date, developer, manager_name, manager_phone, req.user.id)
    const pid = r.lastInsertRowid
    db.prepare('INSERT INTO project_members (project_id,user_id,role) VALUES (?,?,?)').run(pid, req.user.id, 'admin')
    return pid
  })
  res.json(db.prepare('SELECT * FROM projects WHERE id=?').get(tx()))
})

// Get project
router.get('/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id)
  if (!p) return res.status(404).json({ error: '项目不存在' })
  if (req.user.role !== 'admin') {
    const m = db.prepare('SELECT * FROM project_members WHERE project_id=? AND user_id=?').get(req.params.id, req.user.id)
    if (!m) return res.status(403).json({ error: '无权访问此项目' })
  }
  res.json(p)
})

// Update project
router.put('/:id', (req, res) => {
  if (req.user.role !== 'admin') {
    const m = db.prepare('SELECT * FROM project_members WHERE project_id=? AND user_id=? AND role=?').get(req.params.id, req.user.id, 'admin')
    if (!m) return res.status(403).json({ error: '仅项目管理员可编辑' })
  }
  const { name, type, address, area, handover_date, developer, manager_name, manager_phone } = req.body
  db.prepare(`UPDATE projects SET name=?,type=?,address=?,area=?,handover_date=?,developer=?,manager_name=?,manager_phone=?,updated_at=datetime('now') WHERE id=?`)
    .run(name, type, address, area, handover_date, developer, manager_name, manager_phone, req.params.id)
  res.json(db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id))
})

// Delete project
router.delete('/:id', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '仅系统管理员可删除项目' })
  db.prepare('DELETE FROM projects WHERE id=?').run(req.params.id)
  res.json({ message: '已删除' })
})

// Members
router.get('/:id/members', (req, res) => {
  res.json(db.prepare('SELECT u.id,u.username,u.display_name,pm.role FROM project_members pm JOIN users u ON pm.user_id=u.id WHERE pm.project_id=?').all(req.params.id))
})

router.post('/:id/members', (req, res) => {
  if (req.user.role !== 'admin') {
    const ac = db.prepare('SELECT * FROM project_members WHERE project_id=? AND user_id=? AND role=?').get(req.params.id, req.user.id, 'admin')
    if (!ac) return res.status(403).json({ error: '仅项目管理员可添加成员' })
  }
  const { user_id, role } = req.body
  if (!user_id) return res.status(400).json({ error: '请选择用户' })
  const ex = db.prepare('SELECT * FROM project_members WHERE project_id=? AND user_id=?').get(req.params.id, user_id)
  if (ex) return res.status(400).json({ error: '该用户已是项目成员' })
  db.prepare('INSERT INTO project_members (project_id,user_id,role) VALUES (?,?,?)').run(req.params.id, user_id, role||'member')
  res.json({ message: '已添加' })
})

router.delete('/:id/members/:userId', (req, res) => {
  if (parseInt(req.params.userId) === req.user.id) return res.status(400).json({ error: '不能移除自己' })
  db.prepare('DELETE FROM project_members WHERE project_id=? AND user_id=?').run(req.params.id, req.params.userId)
  res.json({ message: '已移除' })
})

// Buildings
router.get('/:pid/buildings', (req, res) => {
  res.json(db.prepare('SELECT b.*,(SELECT COUNT(*) FROM houses WHERE building_id=b.id) as house_count FROM buildings b WHERE b.project_id=? ORDER BY b.sort_order,b.id').all(req.params.pid))
})

router.post('/:pid/buildings', (req, res) => {
  const { name, sort_order } = req.body
  if (!name) return res.status(400).json({ error: '楼栋名称不能为空' })
  const r = db.prepare('INSERT INTO buildings (project_id,name,sort_order,created_by) VALUES (?,?,?,?)').run(req.params.pid, name, sort_order||0, req.user.id)
  res.json({ id: r.lastInsertRowid, name, sort_order: sort_order||0 })
})

router.put('/:pid/buildings/:id', (req, res) => {
  const { name, sort_order } = req.body
  db.prepare('UPDATE buildings SET name=?,sort_order=? WHERE id=? AND project_id=?').run(name, sort_order||0, req.params.id, req.params.pid)
  res.json({ message: '已更新' })
})

router.delete('/:pid/buildings/:id', (req, res) => {
  db.prepare('DELETE FROM buildings WHERE id=? AND project_id=?').run(req.params.id, req.params.pid)
  res.json({ message: '已删除' })
})

// Houses
router.get('/:pid/houses', (req, res) => {
  const { building_id } = req.query
  let sql = 'SELECT h.*,b.name as building_name FROM houses h LEFT JOIN buildings b ON h.building_id=b.id WHERE h.project_id=?'
  const params = [req.params.pid]
  if (building_id) { sql += ' AND h.building_id=?'; params.push(building_id) }
  sql += ' ORDER BY h.building_id, h.house_number'
  res.json(db.prepare(sql).all(...params))
})

router.post('/:pid/houses', (req, res) => {
  const { building_id, house_number, area, notes } = req.body
  if (!house_number) return res.status(400).json({ error: '房号不能为空' })
  const r = db.prepare('INSERT INTO houses (project_id,building_id,house_number,area,notes,created_by) VALUES (?,?,?,?,?,?)').run(req.params.pid, building_id||null, house_number, area, notes, req.user.id)
  res.json({ id: r.lastInsertRowid, house_number, area, notes })
})

router.put('/:pid/houses/:id', (req, res) => {
  const { building_id, house_number, area, notes } = req.body
  db.prepare('UPDATE houses SET building_id=?,house_number=?,area=?,notes=? WHERE id=? AND project_id=?').run(building_id||null, house_number, area, notes, req.params.id, req.params.pid)
  res.json({ message: '已更新' })
})

router.delete('/:pid/houses/:id', (req, res) => {
  db.prepare('DELETE FROM houses WHERE id=? AND project_id=?').run(req.params.id, req.params.pid)
  res.json({ message: '已删除' })
})

// Template access management
router.get('/:pid/template-access', (req, res) => {
  const rows = db.prepare(`
    SELECT uta.*, u.username, u.display_name, it.form_id, it.title as template_title
    FROM user_template_access uta
    JOIN users u ON uta.user_id=u.id
    JOIN inspection_templates it ON uta.template_id=it.id
    WHERE u.id IN (SELECT user_id FROM project_members WHERE project_id=?)
    ORDER BY u.display_name, it.form_id
  `).all(req.params.pid)
  res.json(rows)
})

router.post('/:pid/template-access', (req, res) => {
  if (req.user.role !== 'admin') {
    const ac = db.prepare('SELECT * FROM project_members WHERE project_id=? AND user_id=? AND role=?').get(req.params.pid, req.user.id, 'admin')
    if (!ac) return res.status(403).json({ error: '仅项目管理员可授权' })
  }
  const { user_id, template_id } = req.body
  if (!user_id || !template_id) return res.status(400).json({ error: '请指定用户和模板' })
  const ex = db.prepare('SELECT * FROM user_template_access WHERE user_id=? AND template_id=?').get(user_id, template_id)
  if (ex) return res.status(400).json({ error: '该用户已有此模板权限' })
  db.prepare('INSERT INTO user_template_access (user_id,template_id,granted_by) VALUES (?,?,?)').run(user_id, template_id, req.user.id)
  res.json({ message: '已授权' })
})

router.delete('/:pid/template-access/:id', (req, res) => {
  db.prepare('DELETE FROM user_template_access WHERE id=?').run(req.params.id)
  res.json({ message: '已取消授权' })
})

router.get('/:pid/my-templates', (req, res) => {
  const isAdmin = req.user.role === 'admin'
  const isPA = !isAdmin && db.prepare('SELECT * FROM project_members WHERE project_id=? AND user_id=? AND role=?').get(req.params.pid, req.user.id, 'admin')
  if (isAdmin || isPA) {
    return res.json(db.prepare('SELECT * FROM inspection_templates ORDER BY form_id').all())
  }
  const access = db.prepare('SELECT template_id FROM user_template_access WHERE user_id=?').all(req.user.id)
  if (access.length === 0) {
    return res.json(db.prepare('SELECT * FROM inspection_templates ORDER BY form_id').all())
  }
  const ids = access.map(a => a.template_id)
  const placeholders = ids.map(() => '?').join(',')
  res.json(db.prepare(`SELECT * FROM inspection_templates WHERE id IN (${placeholders}) ORDER BY form_id`).all(...ids))
})

export default router
