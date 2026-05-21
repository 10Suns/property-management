import { Router } from 'express'
import db from '../db.js'

const router = Router()

function getRecord(id) {
  const record = db.prepare(`
    SELECT r.*, t.title as template_title, t.form_id, u.display_name as creator_name,
      uf.form_id as user_form_fid, uf.title as user_form_title,
      b.name as building_name, h.house_number
    FROM inspection_records r
    JOIN inspection_templates t ON r.template_id=t.id
    JOIN users u ON r.created_by=u.id
    LEFT JOIN user_forms uf ON r.user_form_id=uf.id
    LEFT JOIN buildings b ON r.building_id=b.id
    LEFT JOIN houses h ON r.house_id=h.id
    WHERE r.id=?
  `).get(id)
  if (!record) return null

  record.results = db.prepare(`
    SELECT ir.*, ufi.item_name, ufi.check_standard, ti.item_name as template_item_name, ti.check_standard as template_standard
    FROM inspection_results ir
    LEFT JOIN user_form_items ufi ON ir.user_form_item_id=ufi.id
    LEFT JOIN template_items ti ON ir.template_item_id=ti.id
    WHERE ir.record_id=? ORDER BY ir.sort_order
  `).all(id)

  // Merge display names: prefer user_form_item, fallback to template_item, then custom
  for (const r of record.results) {
    if (!r.item_name) r.item_name = r.template_item_name || r.custom_item_name
    if (!r.check_standard) r.check_standard = r.template_standard || r.custom_standard
  }

  record.photos = db.prepare('SELECT * FROM inspection_photos WHERE record_id=? ORDER BY uploaded_at').all(id)
  return record
}

// List records
router.get('/', (req, res) => {
  const { project_id, template_id, user_form_id, building_id, house_id, status } = req.query
  const base = `
    SELECT r.*, t.title as template_title, t.form_id, u.display_name as creator_name,
      b.name as building_name, h.house_number, uf.title as user_form_title
    FROM inspection_records r
    JOIN inspection_templates t ON r.template_id=t.id
    JOIN users u ON r.created_by=u.id
    LEFT JOIN buildings b ON r.building_id=b.id
    LEFT JOIN houses h ON r.house_id=h.id
    LEFT JOIN user_forms uf ON r.user_form_id=uf.id
  `
  const conditions = []
  const params = []
  if (project_id) { conditions.push('r.project_id=?'); params.push(project_id) }
  if (template_id) { conditions.push('r.template_id=?'); params.push(template_id) }
  if (user_form_id) { conditions.push('r.user_form_id=?'); params.push(user_form_id) }
  if (building_id) { conditions.push('r.building_id=?'); params.push(building_id) }
  if (house_id) { conditions.push('r.house_id=?'); params.push(house_id) }
  if (status) { conditions.push('r.status=?'); params.push(status) }
  // Employees only see their own records
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    conditions.push('r.created_by=?')
    params.push(req.user.id)
  }
  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : ''
  res.json(db.prepare(base + where + ' ORDER BY r.updated_at DESC').all(...params))
})

// Create record from user_form
router.post('/', (req, res) => {
  const { project_id, user_form_id, template_id, building_id, house_id, location_info } = req.body
  if (!project_id) return res.status(400).json({ error: '项目不能为空' })
  if (!user_form_id && !template_id) return res.status(400).json({ error: '表单或模板不能为空' })

  const tx = db.transaction(() => {
    // If using user_form, get the template_id from it
    let tid = template_id
    let ufid = user_form_id || null
    if (ufid) {
      const uf = db.prepare('SELECT * FROM user_forms WHERE id=?').get(ufid)
      if (!uf) throw new Error('表单不存在')
      tid = uf.template_id
    }

    const r = db.prepare(`INSERT INTO inspection_records (project_id,user_form_id,template_id,building_id,house_id,location_info,created_by) VALUES (?,?,?,?,?,?,?)`)
      .run(project_id, ufid, tid, building_id||null, house_id||null, location_info, req.user.id)
    const rid = r.lastInsertRowid

    if (ufid) {
      // Create results from user_form_items
      const items = db.prepare('SELECT * FROM user_form_items WHERE form_id=? ORDER BY sort_order').all(ufid)
      const ins = db.prepare('INSERT INTO inspection_results (record_id,user_form_item_id,sort_order) VALUES (?,?,?)')
      for (const item of items) ins.run(rid, item.id, item.sort_order)
    } else {
      // Create results from template_items (legacy)
      const items = db.prepare('SELECT * FROM template_items WHERE template_id=? ORDER BY sort_order').all(tid)
      const ins = db.prepare('INSERT INTO inspection_results (record_id,template_item_id,sort_order) VALUES (?,?,?)')
      for (const item of items) ins.run(rid, item.id, item.sort_order)
    }
    return rid
  })
  res.json(getRecord(tx()))
})

// Get record
router.get('/:id', (req, res) => {
  const record = getRecord(req.params.id)
  if (!record) return res.status(404).json({ error: '记录不存在' })
  res.json(record)
})

// Update record
router.put('/:id', (req, res) => {
  const record = db.prepare('SELECT * FROM inspection_records WHERE id=?').get(req.params.id)
  if (!record) return res.status(404).json({ error: '记录不存在' })

  if (req.user.role !== 'admin' && record.created_by !== req.user.id) {
    const isPA = db.prepare('SELECT * FROM project_members WHERE project_id=? AND user_id=? AND role=?').get(record.project_id, req.user.id, 'admin')
    if (!isPA) return res.status(403).json({ error: '只能编辑自己的记录' })
  }

  const { inspector_comment, status, location_info, building_id, house_id } = req.body
  db.prepare(`UPDATE inspection_records SET
    inspector_comment=?,status=?,location_info=?,
    building_id=?,house_id=?,
    updated_at=datetime('now') WHERE id=?`)
    .run(
      inspector_comment !== undefined ? inspector_comment : record.inspector_comment,
      status || record.status,
      location_info !== undefined ? location_info : record.location_info,
      building_id !== undefined ? building_id : record.building_id,
      house_id !== undefined ? house_id : record.house_id,
      req.params.id
    )
  res.json(getRecord(req.params.id))
})

// Delete record (admin or owner only)
router.delete('/:id', (req, res) => {
  const record = db.prepare('SELECT * FROM inspection_records WHERE id=?').get(req.params.id)
  if (!record) return res.status(404).json({ error: '记录不存在' })
  if (req.user.role !== 'admin' && record.created_by !== req.user.id) {
    return res.status(403).json({ error: '只能删除自己的记录，管理员可删除所有记录' })
  }
  db.prepare('DELETE FROM inspection_records WHERE id=?').run(req.params.id)
  res.json({ message: '已删除' })
})

// Add custom result item
router.post('/:rid/results', (req, res) => {
  const { custom_item_name, custom_standard, user_form_item_id, result, problem_description } = req.body
  if (!custom_item_name && !user_form_item_id) return res.status(400).json({ error: '条目名称不能为空' })
  const max = db.prepare('SELECT MAX(sort_order) as m FROM inspection_results WHERE record_id=?').get(req.params.rid)
  const sort = (max?.m || 0) + 1
  const r = db.prepare('INSERT INTO inspection_results (record_id,user_form_item_id,custom_item_name,custom_standard,result,problem_description,sort_order) VALUES (?,?,?,?,?,?,?)')
    .run(req.params.rid, user_form_item_id || null, custom_item_name || null, custom_standard || null, result || 'pending', problem_description || null, sort)
  const item = db.prepare(`
    SELECT ir.*, ufi.item_name, ufi.check_standard
    FROM inspection_results ir
    LEFT JOIN user_form_items ufi ON ir.user_form_item_id=ufi.id
    WHERE ir.id=?
  `).get(r.lastInsertRowid)
  res.json(item)
})

// Update result
router.put('/results/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM inspection_results WHERE id=?').get(req.params.id)
  if (!item) return res.status(404).json({ error: '条目不存在' })
  const { result, problem_description, custom_item_name, custom_standard } = req.body
  db.prepare(`UPDATE inspection_results SET result=?,problem_description=?,custom_item_name=?,custom_standard=?,updated_at=datetime('now') WHERE id=?`)
    .run(
      result !== undefined ? result : item.result,
      problem_description !== undefined ? problem_description : item.problem_description,
      custom_item_name !== undefined ? custom_item_name : item.custom_item_name,
      custom_standard !== undefined ? custom_standard : item.custom_standard,
      req.params.id
    )
  const resultItem = db.prepare(`
    SELECT ir.*, ufi.item_name, ufi.check_standard
    FROM inspection_results ir
    LEFT JOIN user_form_items ufi ON ir.user_form_item_id=ufi.id
    WHERE ir.id=?
  `).get(req.params.id)
  res.json(resultItem)
})

router.delete('/results/:id', (req, res) => {
  const item = db.prepare('SELECT ir.*, r.created_by FROM inspection_results ir JOIN inspection_records r ON ir.record_id=r.id WHERE ir.id=?').get(req.params.id)
  if (!item) return res.status(404).json({ error: '条目不存在' })
  if (item.created_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '只能删除自己的记录' })
  db.prepare('DELETE FROM inspection_results WHERE id=?').run(req.params.id)
  res.json({ message: '已删除' })
})

export default router
