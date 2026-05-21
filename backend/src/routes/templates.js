import { Router } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM inspection_templates ORDER BY form_id').all())
})

router.get('/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM inspection_templates WHERE id=?').get(req.params.id)
  if (!t) return res.status(404).json({ error: '模板不存在' })
  t.items = db.prepare('SELECT * FROM template_items WHERE template_id=? ORDER BY sort_order').all(req.params.id)
  res.json(t)
})

export default router
