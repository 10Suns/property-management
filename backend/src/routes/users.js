import { Router } from 'express'
import bcrypt from 'bcryptjs'
import db from '../db.js'
import { adminRequired } from '../auth.js'
import { auditLog } from '../db.js'

const router = Router()

// List users (managers and admins can view)
router.get('/', (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ error: '权限不足' })
  }
  const users = db.prepare('SELECT id, username, display_name, role, created_at FROM users ORDER BY id').all()
  res.json(users)
})

router.post('/', adminRequired, (req, res) => {
  const { username, password, display_name, role } = req.body
  if (!username || !password || !display_name) return res.status(400).json({ error: '用户名、密码和姓名不能为空' })
  if (password.length < 4) return res.status(400).json({ error: '密码至少4位' })
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existing) return res.status(400).json({ error: '用户名已存在' })
  const hash = bcrypt.hashSync(password, 10)
  const r = db.prepare('INSERT INTO users (username, password_hash, display_name, role, created_by) VALUES (?,?,?,?,?)')
    .run(username, hash, display_name, role || 'employee', req.user.id)
  res.json({ id: r.lastInsertRowid, username, display_name, role: role || 'employee' })
})

// Admin reset user password
router.put('/:id/reset-password', adminRequired, (req, res) => {
  const { password } = req.body
  if (!password || password.length < 4) return res.status(400).json({ error: '密码至少4位' })
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id)
  if (!user) return res.status(404).json({ error: '用户不存在' })
  const hash = bcrypt.hashSync(password, 10)
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, req.params.id)
  auditLog(req.user.id, req.user.username, 'reset_password', 'user', req.params.id, `target_username=${user.username}`)
  res.json({ message: '密码已重置' })
})

router.delete('/:id', adminRequired, (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: '不能删除自己' })
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id)
  if (!user) return res.status(404).json({ error: '用户不存在' })
  // Check for submitted records
  const submittedCount = db.prepare(
    'SELECT COUNT(*) as cnt FROM inspection_records WHERE created_by=? AND submitted=1'
  ).get(req.params.id)
  if (submittedCount.cnt > 0) {
    return res.status(403).json({ error: `该用户关联 ${submittedCount.cnt} 条已提交的查验记录，无法删除` })
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
  auditLog(req.user.id, req.user.username, 'delete', 'user', req.params.id, `target_username=${user.username}`)
  res.json({ message: '用户已删除' })
})

export default router
