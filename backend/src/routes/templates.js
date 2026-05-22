import { Router } from 'express'
import db from '../db.js'
import { adminRequired } from '../auth.js'

const router = Router()

function getTemplateWithItems(id) {
  const t = db.prepare('SELECT * FROM inspection_templates WHERE id=?').get(id)
  if (!t) return null
  t.items = db.prepare('SELECT * FROM template_items WHERE template_id=? ORDER BY sort_order').all(id)
  return t
}

function insertTemplateItems(templateId, items) {
  const ins = db.prepare('INSERT INTO template_items (template_id,item_number,item_name,check_standard,sort_order) VALUES (?,?,?,?,?)')
  items.forEach((item, i) => {
    ins.run(templateId, item.item_number || (i + 1), item.item_name, item.check_standard || '', i)
  })
}

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM inspection_templates ORDER BY form_id').all())
})

router.get('/:id', (req, res) => {
  const t = getTemplateWithItems(req.params.id)
  if (!t) return res.status(404).json({ error: '模板不存在' })
  res.json(t)
})

router.post('/', adminRequired, (req, res) => {
  const { form_id, title, category, items } = req.body
  if (!form_id || !title || !category) {
    return res.status(400).json({ error: 'form_id、title、category 不能为空' })
  }
  const existing = db.prepare('SELECT id FROM inspection_templates WHERE form_id=?').get(form_id)
  if (existing) return res.status(400).json({ error: '表单编号 ' + form_id + ' 已存在' })

  const tx = db.transaction(() => {
    const r = db.prepare('INSERT INTO inspection_templates (form_id,title,category) VALUES (?,?,?)')
      .run(form_id, title, category)
    const tid = r.lastInsertRowid
    if (items && items.length) insertTemplateItems(tid, items)
    return tid
  })
  res.status(201).json(getTemplateWithItems(tx()))
})

router.put('/:id', adminRequired, (req, res) => {
  const t = db.prepare('SELECT * FROM inspection_templates WHERE id=?').get(req.params.id)
  if (!t) return res.status(404).json({ error: '模板不存在' })

  const { form_id, title, category, items } = req.body
  if (form_id && form_id !== t.form_id) {
    const dup = db.prepare('SELECT id FROM inspection_templates WHERE form_id=? AND id!=?').get(form_id, req.params.id)
    if (dup) return res.status(400).json({ error: '表单编号 ' + form_id + ' 已存在' })
  }

  const tx = db.transaction(() => {
    db.prepare('UPDATE inspection_templates SET form_id=?,title=?,category=? WHERE id=?')
      .run(form_id || t.form_id, title || t.title, category || t.category, req.params.id)
    if (items !== undefined) {
      db.prepare('DELETE FROM template_items WHERE template_id=?').run(req.params.id)
      insertTemplateItems(req.params.id, items)
    }
  })
  tx()
  res.json(getTemplateWithItems(req.params.id))
})

export default router
