import { Router } from 'express'
import db from '../db.js'

const router = Router()

// List user forms for a project
router.get('/', (req, res) => {
  const { project_id } = req.query
  if (!project_id) return res.status(400).json({ error: '请指定项目' })

  let forms
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    forms = db.prepare(`
      SELECT uf.*, u.display_name as creator_name, it.form_id as template_form_id, it.category,
        (SELECT COUNT(*) FROM user_form_items WHERE form_id=uf.id) as item_count
      FROM user_forms uf
      JOIN users u ON uf.user_id=u.id
      LEFT JOIN inspection_templates it ON uf.template_id=it.id
      WHERE uf.project_id=?
      ORDER BY uf.updated_at DESC
    `).all(project_id)
  } else {
    forms = db.prepare(`
      SELECT uf.*, u.display_name as creator_name, it.form_id as template_form_id, it.category,
        (SELECT COUNT(*) FROM user_form_items WHERE form_id=uf.id) as item_count
      FROM user_forms uf
      JOIN users u ON uf.user_id=u.id
      LEFT JOIN inspection_templates it ON uf.template_id=it.id
      WHERE uf.project_id=? AND uf.user_id=?
      ORDER BY uf.updated_at DESC
    `).all(project_id, req.user.id)
  }
  res.json(forms)
})

// Get single user form with items
router.get('/:id', (req, res) => {
  const form = db.prepare(`
    SELECT uf.*, u.display_name as creator_name, it.form_id as template_form_id
    FROM user_forms uf
    JOIN users u ON uf.user_id=u.id
    LEFT JOIN inspection_templates it ON uf.template_id=it.id
    WHERE uf.id=?
  `).get(req.params.id)
  if (!form) return res.status(404).json({ error: '表单不存在' })
  form.items = db.prepare('SELECT * FROM user_form_items WHERE form_id=? ORDER BY sort_order').all(req.params.id)
  res.json(form)
})

// Create user form from system template (or blank)
router.post('/', (req, res) => {
  const { project_id, template_id, title, items } = req.body
  if (!project_id) return res.status(400).json({ error: '项目不能为空' })

  let formId, templateName
  if (template_id) {
    const template = db.prepare('SELECT * FROM inspection_templates WHERE id=?').get(template_id)
    if (!template) return res.status(404).json({ error: '模板不存在' })
    templateName = template.title
    formId = `${template.form_id}-${req.user.username}-${Date.now().toString(36)}`
  } else {
    templateName = '自定义表单'
    formId = `CUSTOM-${req.user.username}-${Date.now().toString(36)}`
  }

  const formTitle = title || templateName

  const tx = db.transaction(() => {
    const r = db.prepare('INSERT INTO user_forms (project_id,user_id,template_id,form_id,title) VALUES (?,?,?,?,?)')
      .run(project_id, req.user.id, template_id || null, formId, formTitle)
    const fid = r.lastInsertRowid

    if (items && Array.isArray(items) && items.length > 0) {
      const ins = db.prepare('INSERT INTO user_form_items (form_id,item_number,item_name,check_standard,source_item_id,sort_order) VALUES (?,?,?,?,?,?)')
      items.forEach((item, idx) => {
        ins.run(fid, idx + 1, item.item_name, item.check_standard || '', item.source_item_id || null, idx)
      })
    } else if (template_id) {
      // Copy template items to user form items
      const templateItems = db.prepare('SELECT * FROM template_items WHERE template_id=? ORDER BY sort_order').all(template_id)
      const ins = db.prepare('INSERT INTO user_form_items (form_id,item_number,item_name,check_standard,source_item_id,sort_order) VALUES (?,?,?,?,?,?)')
      for (const item of templateItems) {
        ins.run(fid, item.item_number, item.item_name, item.check_standard, item.id, item.sort_order)
      }
    }
    return fid
  })
  const form = db.prepare('SELECT * FROM user_forms WHERE id=?').get(tx())
  form.items = db.prepare('SELECT * FROM user_form_items WHERE form_id=? ORDER BY sort_order').all(form.id)
  res.json(form)
})

// Update user form metadata (owner or admin only)
router.put('/:id', (req, res) => {
  const form = db.prepare('SELECT * FROM user_forms WHERE id=?').get(req.params.id)
  if (!form) return res.status(404).json({ error: '表单不存在' })
  if (form.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '只能编辑自己的表单，管理员可编辑所有表单' })

  const { title, status } = req.body
  db.prepare('UPDATE user_forms SET title=?,status=?,updated_at=datetime(\'now\') WHERE id=?')
    .run(title||form.title, status||form.status, req.params.id)
  res.json(db.prepare('SELECT * FROM user_forms WHERE id=?').get(req.params.id))
})

// Delete user form (owner or admin only)
router.delete('/:id', (req, res) => {
  const form = db.prepare('SELECT * FROM user_forms WHERE id=?').get(req.params.id)
  if (!form) return res.status(404).json({ error: '表单不存在' })
  if (form.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '只能删除自己的表单，管理员可删除所有表单' })
  db.prepare('DELETE FROM user_forms WHERE id=?').run(req.params.id)
  res.json({ message: '已删除' })
})

// Add item to user form
router.post('/:fid/items', (req, res) => {
  const form = db.prepare('SELECT * FROM user_forms WHERE id=?').get(req.params.fid)
  if (!form) return res.status(404).json({ error: '表单不存在' })
  if (form.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '只能编辑自己的表单' })

  const { item_name, item_number, check_standard } = req.body
  if (!item_name) return res.status(400).json({ error: '条目名称不能为空' })
  const max = db.prepare('SELECT MAX(sort_order) as m FROM user_form_items WHERE form_id=?').get(req.params.fid)
  const sort = (max?.m || 0) + 1
  const num = item_number || sort
  const r = db.prepare('INSERT INTO user_form_items (form_id,item_number,item_name,check_standard,sort_order) VALUES (?,?,?,?,?)')
    .run(req.params.fid, num, item_name, check_standard || '', sort)
  db.prepare('UPDATE user_forms SET updated_at=datetime(\'now\') WHERE id=?').run(req.params.fid)
  res.json(db.prepare('SELECT * FROM user_form_items WHERE id=?').get(r.lastInsertRowid))
})

// Update user form item
router.put('/items/:id', (req, res) => {
  const item = db.prepare('SELECT ufi.*, uf.user_id FROM user_form_items ufi JOIN user_forms uf ON ufi.form_id=uf.id WHERE ufi.id=?').get(req.params.id)
  if (!item) return res.status(404).json({ error: '条目不存在' })
  if (item.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '只能编辑自己的表单' })

  const { item_name, item_number, check_standard } = req.body
  db.prepare('UPDATE user_form_items SET item_name=?,item_number=?,check_standard=? WHERE id=?')
    .run(item_name||item.item_name, item_number||item.item_number, check_standard||item.check_standard, req.params.id)
  db.prepare('UPDATE user_forms SET updated_at=datetime(\'now\') WHERE id=?').run(item.form_id)
  res.json(db.prepare('SELECT * FROM user_form_items WHERE id=?').get(req.params.id))
})

// Delete user form item
router.delete('/items/:id', (req, res) => {
  const item = db.prepare('SELECT ufi.*, uf.user_id FROM user_form_items ufi JOIN user_forms uf ON ufi.form_id=uf.id WHERE ufi.id=?').get(req.params.id)
  if (!item) return res.status(404).json({ error: '条目不存在' })
  if (item.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '只能编辑自己的表单' })

  db.prepare('DELETE FROM user_form_items WHERE id=?').run(req.params.id)
  db.prepare('UPDATE user_forms SET updated_at=datetime(\'now\') WHERE id=?').run(item.form_id)
  res.json({ message: '已删除' })
})

export default router
