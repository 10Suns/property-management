import { Router } from 'express'
import db from '../db.js'

const router = Router()

function isManager(req) {
  return req.user.role === 'admin' || req.user.role === 'manager'
}

function hasEquipmentAccess(userId, projectId) {
  return db.prepare('SELECT * FROM equipment_access WHERE user_id=? AND project_id=?').get(userId, projectId)
}

// List equipment (managers see all, employees need equipment_access)
router.get('/', (req, res) => {
  const { project_id, building_id, category, status } = req.query
  if (!project_id) return res.status(400).json({ error: '请指定项目' })

  if (!isManager(req) && !hasEquipmentAccess(req.user.id, project_id)) {
    return res.status(403).json({ error: '您没有设备档案查看权限，请联系管理员授权' })
  }

  let sql = `
    SELECT e.*, b.name as building_name, h.house_number,
      u.display_name as creator_name
    FROM equipment e
    LEFT JOIN buildings b ON e.building_id=b.id
    LEFT JOIN houses h ON e.house_id=h.id
    LEFT JOIN users u ON e.created_by=u.id
    WHERE e.project_id=?
  `
  const params = [project_id]
  if (building_id) { sql += ' AND e.building_id=?'; params.push(building_id) }
  if (category) { sql += ' AND e.category=?'; params.push(category) }
  if (status) { sql += ' AND e.status=?'; params.push(status) }
  sql += ' ORDER BY e.category, e.name'
  res.json(db.prepare(sql).all(...params))
})

// Get single equipment
router.get('/:id', (req, res) => {
  const eq = db.prepare(`
    SELECT e.*, b.name as building_name, h.house_number
    FROM equipment e
    LEFT JOIN buildings b ON e.building_id=b.id
    LEFT JOIN houses h ON e.house_id=h.id
    WHERE e.id=?
  `).get(req.params.id)
  if (!eq) return res.status(404).json({ error: '设备不存在' })
  if (!isManager(req) && !hasEquipmentAccess(req.user.id, eq.project_id)) {
    return res.status(403).json({ error: '权限不足' })
  }
  res.json(eq)
})

// Create equipment (manager only)
router.post('/', (req, res) => {
  if (!isManager(req)) return res.status(403).json({ error: '仅管理员和物业经理可添加设备' })
  const { project_id, building_id, house_id, name, category, model, serial_number, install_date, location, notes } = req.body
  if (!project_id || !name) return res.status(400).json({ error: '项目和设备名称不能为空' })

  const r = db.prepare(`INSERT INTO equipment (project_id,building_id,house_id,name,category,model,serial_number,install_date,location,notes,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(project_id, building_id||null, house_id||null, name, category||null, model||null, serial_number||null, install_date||null, location||null, notes||null, req.user.id)
  res.json(db.prepare('SELECT * FROM equipment WHERE id=?').get(r.lastInsertRowid))
})

// Update equipment (manager only)
router.put('/:id', (req, res) => {
  if (!isManager(req)) return res.status(403).json({ error: '仅管理员和物业经理可编辑设备' })
  const eq = db.prepare('SELECT * FROM equipment WHERE id=?').get(req.params.id)
  if (!eq) return res.status(404).json({ error: '设备不存在' })

  const { name, building_id, house_id, category, model, serial_number, install_date, location, status, notes } = req.body
  const update = (field, val) => val !== undefined ? val : field
  db.prepare(`UPDATE equipment SET name=?,building_id=?,house_id=?,category=?,model=?,serial_number=?,install_date=?,location=?,status=?,notes=?,updated_at=datetime('now') WHERE id=?`)
    .run(update(eq.name, name), update(eq.building_id, building_id), update(eq.house_id, house_id), update(eq.category, category), update(eq.model, model), update(eq.serial_number, serial_number), update(eq.install_date, install_date), update(eq.location, location), update(eq.status, status), update(eq.notes, notes), req.params.id)
  res.json(db.prepare('SELECT * FROM equipment WHERE id=?').get(req.params.id))
})

// Delete equipment (manager only)
router.delete('/:id', (req, res) => {
  if (!isManager(req)) return res.status(403).json({ error: '仅管理员和物业经理可删除设备' })
  const eq = db.prepare('SELECT * FROM equipment WHERE id=?').get(req.params.id)
  if (!eq) return res.status(404).json({ error: '设备不存在' })
  db.prepare('DELETE FROM equipment WHERE id=?').run(req.params.id)
  res.json({ message: '已删除' })
})

export default router
