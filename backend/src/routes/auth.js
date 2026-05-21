import { Router } from 'express'
import bcrypt from 'bcryptjs'
import db from '../db.js'
import { generateToken, authMiddleware } from '../auth.js'

const router = Router()

router.post('/login', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' })

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  if (!user) return res.status(401).json({ error: '用户名或密码错误' })

  const valid = bcrypt.compareSync(password, user.password_hash)
  if (!valid) return res.status(401).json({ error: '用户名或密码错误' })

  const token = generateToken(user)
  res.json({
    token,
    user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role }
  })
})

router.put('/password', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '仅管理员可修改密码，请联系管理员重置' })
  const { old_password, new_password } = req.body
  if (!old_password || !new_password) return res.status(400).json({ error: '请输入旧密码和新密码' })
  if (new_password.length < 4) return res.status(400).json({ error: '新密码至少4位' })

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!bcrypt.compareSync(old_password, user.password_hash)) {
    return res.status(400).json({ error: '旧密码错误' })
  }

  const hash = bcrypt.hashSync(new_password, 10)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id)
  res.json({ message: '密码修改成功' })
})

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, display_name, role FROM users WHERE id = ?').get(req.user.id)
  res.json(user)
})

export default router
