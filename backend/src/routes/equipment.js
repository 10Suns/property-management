import { Router } from 'express'
import fs from 'fs'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import db from '../db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = Router()

function isManager(req) {
  return req.user.role === 'admin' || req.user.role === 'manager'
}

function hasEquipmentAccess(userId, projectId) {
  return db.prepare('SELECT * FROM equipment_access WHERE user_id=? AND project_id=?').get(userId, projectId)
}

// File upload config for maintenance photos
const photoStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext)
  }
})
const uploadPhotos = multer({ storage: photoStorage, limits: { fileSize: 10 * 1024 * 1024 } })

// File upload config for manuals
const manualStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads', 'manuals'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext)
  }
})
const uploadManual = multer({ storage: manualStorage, limits: { fileSize: 50 * 1024 * 1024 } })

// List equipment
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
  const { project_id, building_id, house_id, name, category, model, serial_number, install_date, location, notes,
    maintenance_cycle, maintenance_interval_days, maintenance_hint } = req.body
  if (!project_id || !name) return res.status(400).json({ error: '项目和设备名称不能为空' })

  const r = db.prepare(`INSERT INTO equipment (project_id,building_id,house_id,name,category,model,serial_number,install_date,location,notes,maintenance_cycle,maintenance_interval_days,maintenance_hint,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(project_id, building_id||null, house_id||null, name, category||null, model||null, serial_number||null,
      install_date||null, location||null, notes||null, maintenance_cycle||null, maintenance_interval_days||null, maintenance_hint||null, req.user.id)
  res.json(db.prepare('SELECT * FROM equipment WHERE id=?').get(r.lastInsertRowid))
})

// Update equipment (manager only)
router.put('/:id', (req, res) => {
  if (!isManager(req)) return res.status(403).json({ error: '仅管理员和物业经理可编辑设备' })
  const eq = db.prepare('SELECT * FROM equipment WHERE id=?').get(req.params.id)
  if (!eq) return res.status(404).json({ error: '设备不存在' })

  const { name, building_id, house_id, category, model, serial_number, install_date, location, status, notes,
    maintenance_cycle, maintenance_interval_days, next_maintenance_date, maintenance_hint } = req.body
  const u = (field, val) => val !== undefined ? val : field
  db.prepare(`UPDATE equipment SET name=?,building_id=?,house_id=?,category=?,model=?,serial_number=?,install_date=?,location=?,status=?,notes=?,maintenance_cycle=?,maintenance_interval_days=?,next_maintenance_date=?,maintenance_hint=?,updated_at=datetime('now') WHERE id=?`)
    .run(u(eq.name, name), u(eq.building_id, building_id), u(eq.house_id, house_id), u(eq.category, category),
      u(eq.model, model), u(eq.serial_number, serial_number), u(eq.install_date, install_date),
      u(eq.location, location), u(eq.status, status), u(eq.notes, notes),
      u(eq.maintenance_cycle, maintenance_cycle), u(eq.maintenance_interval_days, maintenance_interval_days),
      u(eq.next_maintenance_date, next_maintenance_date), u(eq.maintenance_hint, maintenance_hint),
      req.params.id)
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

// ---- Maintenance Records ----

// List maintenance records for an equipment
router.get('/:id/maintenance', (req, res) => {
  const eq = db.prepare('SELECT * FROM equipment WHERE id=?').get(req.params.id)
  if (!eq) return res.status(404).json({ error: '设备不存在' })
  const records = db.prepare(`
    SELECT mr.*, u.display_name as creator_name
    FROM maintenance_records mr
    LEFT JOIN users u ON mr.created_by=u.id
    WHERE mr.equipment_id=?
    ORDER BY mr.completed_date DESC
  `).all(req.params.id)
  res.json(records.map(r => ({ ...r, photos: JSON.parse(r.photos || '[]') })))
})

// Create maintenance record (plan item)
router.post('/:id/maintenance', uploadPhotos.array('photos', 6), (req, res) => {
  const eq = db.prepare('SELECT * FROM equipment WHERE id=?').get(req.params.id)
  if (!eq) return res.status(404).json({ error: '设备不存在' })
  if (!isManager(req)) return res.status(403).json({ error: '仅管理员和物业经理可管理维护计划' })

  const { scheduled_date, completed_date, content, status, notes } = req.body
  if (!scheduled_date) return res.status(400).json({ error: '请填写计划日期' })

  const photos = (req.files || []).map(f => f.filename)
  const recordStatus = status || 'pending'
  const r = db.prepare(`INSERT INTO maintenance_records (equipment_id, scheduled_date, completed_date, content, status, notes, photos, created_by)
    VALUES (?,?,?,?,?,?,?,?)`)
    .run(req.params.id, scheduled_date, completed_date || null, content || '', recordStatus, notes || '', JSON.stringify(photos), req.user.id)

  if (recordStatus === 'completed' && completed_date) {
    db.prepare('UPDATE equipment SET last_maintenance_date=?, next_maintenance_date=?, updated_at=datetime(\'now\') WHERE id=?')
      .run(completed_date, calcNextDate(eq, completed_date), req.params.id)
  }

  const record = db.prepare('SELECT * FROM maintenance_records WHERE id=?').get(r.lastInsertRowid)
  res.json({ ...record, photos: JSON.parse(record.photos || '[]') })
})

// Update maintenance record
router.put('/:id/maintenance/:rid', uploadPhotos.array('photos', 6), (req, res) => {
  if (!isManager(req)) return res.status(403).json({ error: '仅管理员和物业经理可编辑保养记录' })
  const mr = db.prepare('SELECT * FROM maintenance_records WHERE id=? AND equipment_id=?').get(req.params.rid, req.params.id)
  if (!mr) return res.status(404).json({ error: '记录不存在' })
  if (mr.submitted) return res.status(403).json({ error: '记录已提交，无法修改' })

  const { scheduled_date, completed_date, content, status, notes, keep_photos } = req.body
  const newScheduledDate = scheduled_date !== undefined ? scheduled_date : mr.scheduled_date
  const newCompletedDate = completed_date !== undefined ? (completed_date || null) : mr.completed_date
  const newContent = content !== undefined ? (content || '') : mr.content
  const newStatus = status || mr.status
  const newNotes = notes !== undefined ? (notes || '') : mr.notes

  // Merge existing photos with newly uploaded ones
  let existingPhotos = []
  try { existingPhotos = JSON.parse(keep_photos || mr.photos) } catch (_) { existingPhotos = [] }
  const newPhotos = (req.files || []).map(f => f.filename)
  const allPhotos = JSON.stringify([...existingPhotos, ...newPhotos])

  db.prepare(`UPDATE maintenance_records SET scheduled_date=?, completed_date=?, content=?, status=?, notes=?, photos=?, updated_at=datetime('now') WHERE id=?`)
    .run(newScheduledDate, newCompletedDate, newContent, newStatus, newNotes, allPhotos, req.params.rid)

  if (newStatus === 'completed' && newCompletedDate) {
    const eq = db.prepare('SELECT * FROM equipment WHERE id=?').get(req.params.id)
    db.prepare('UPDATE equipment SET last_maintenance_date=?, next_maintenance_date=?, updated_at=datetime(\'now\') WHERE id=?')
      .run(newCompletedDate, calcNextDate(eq, newCompletedDate), req.params.id)
  }

  const record = db.prepare('SELECT * FROM maintenance_records WHERE id=?').get(req.params.rid)
  res.json({ ...record, photos: JSON.parse(record.photos || '[]') })
})

// Delete maintenance record
router.delete('/:id/maintenance/:rid', (req, res) => {
  if (!isManager(req)) return res.status(403).json({ error: '仅管理员和物业经理可删除保养记录' })
  const mr = db.prepare('SELECT * FROM maintenance_records WHERE id=? AND equipment_id=?').get(req.params.rid, req.params.id)
  if (!mr) return res.status(404).json({ error: '记录不存在' })
  if (mr.submitted) return res.status(403).json({ error: '记录已提交，无法删除' })
  db.prepare('DELETE FROM maintenance_records WHERE id=?').run(req.params.rid)
  res.json({ message: '已删除' })
})

// Submit maintenance record (lock it permanently)
router.post('/:id/maintenance/:rid/submit', (req, res) => {
  if (!isManager(req)) return res.status(403).json({ error: '仅管理员和物业经理可提交保养记录' })
  const mr = db.prepare('SELECT * FROM maintenance_records WHERE id=? AND equipment_id=?').get(req.params.rid, req.params.id)
  if (!mr) return res.status(404).json({ error: '记录不存在' })
  if (mr.submitted) return res.status(403).json({ error: '记录已提交' })
  db.prepare("UPDATE maintenance_records SET submitted=1, updated_at=datetime('now') WHERE id=?").run(req.params.rid)
  const record = db.prepare('SELECT * FROM maintenance_records WHERE id=?').get(req.params.rid)
  res.json({ ...record, photos: JSON.parse(record.photos || '[]') })
})

function calcNextDate(eq, fromDate) {
  if (!eq.maintenance_cycle) return null
  let days = 0
  switch (eq.maintenance_cycle) {
    case 'weekly': days = 7; break
    case 'biweekly': days = 14; break
    case 'monthly': days = 30; break
    case 'quarterly': days = 90; break
    case 'semiannual': days = 180; break
    case 'annual': days = 365; break
    case 'custom': days = eq.maintenance_interval_days || 0; break
    default: return null
  }
  if (!days) return null
  const d = new Date(fromDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ---- Manuals ----

router.get('/:id/manuals', (req, res) => {
  const eq = db.prepare('SELECT * FROM equipment WHERE id=?').get(req.params.id)
  if (!eq) return res.status(404).json({ error: '设备不存在' })
  const manuals = db.prepare(`
    SELECT em.*, u.display_name as uploader_name
    FROM equipment_manuals em
    LEFT JOIN users u ON em.uploaded_by=u.id
    WHERE em.equipment_id=?
    ORDER BY em.created_at DESC
  `).all(req.params.id)
  res.json(manuals)
})

router.post('/:id/manuals', uploadManual.single('file'), (req, res) => {
  if (!isManager(req)) return res.status(403).json({ error: '仅管理员和物业经理可上传说明书' })
  const eq = db.prepare('SELECT * FROM equipment WHERE id=?').get(req.params.id)
  if (!eq) return res.status(404).json({ error: '设备不存在' })
  if (!req.file) return res.status(400).json({ error: '请选择文件' })

  const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8')
  const r = db.prepare('INSERT INTO equipment_manuals (equipment_id, filename, original_name, uploaded_by) VALUES (?,?,?,?)')
    .run(req.params.id, req.file.filename, originalName, req.user.id)
  res.json(db.prepare('SELECT * FROM equipment_manuals WHERE id=?').get(r.lastInsertRowid))
})

router.delete('/:id/manuals/:mid', (req, res) => {
  if (!isManager(req)) return res.status(403).json({ error: '仅管理员和物业经理可删除说明书' })
  const manual = db.prepare('SELECT * FROM equipment_manuals WHERE id=? AND equipment_id=?').get(req.params.mid, req.params.id)
  if (!manual) return res.status(404).json({ error: '说明书不存在' })
  db.prepare('DELETE FROM equipment_manuals WHERE id=?').run(req.params.mid)
  fs.unlink(path.join(__dirname, '..', '..', 'uploads', 'manuals', manual.filename), () => {})
  res.json({ message: '已删除' })
})

export default router
