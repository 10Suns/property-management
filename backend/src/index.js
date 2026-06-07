import express from 'express'
import cors from 'cors'
import fs from 'fs'
import { copyFile } from 'fs/promises'
import { parsePagination } from './pagination.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDB } from './db.js'
import db from './db.js'
import { seed } from './seed.js'
import { authMiddleware, adminRequired } from './auth.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import projectRoutes from './routes/projects.js'
import templateRoutes from './routes/templates.js'
import recordRoutes from './routes/records.js'
import photoRoutes from './routes/photos.js'
import formRoutes from './routes/forms.js'
import equipmentRoutes from './routes/equipment.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3002

// CORS configuration — restrict in production via ALLOWED_ORIGINS env var
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : undefined
app.use(cors(allowedOrigins ? { origin: (origin, cb) => {
  if (!origin || allowedOrigins.includes(origin)) cb(null, true)
  else cb(new Error('CORS not allowed'))
}} : {}))
app.use(express.json({ limit: '50mb' }))
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

initDB()
seed()

app.use('/api/auth', authRoutes)
app.use('/api/users', authMiddleware, userRoutes)
app.use('/api/projects', authMiddleware, projectRoutes)
app.use('/api/templates', authMiddleware, templateRoutes)
app.use('/api/records', authMiddleware, recordRoutes)
app.use('/api/photos', authMiddleware, photoRoutes)
app.use('/api/forms', authMiddleware, formRoutes)
app.use('/api/equipment', authMiddleware, equipmentRoutes)

// Database backup endpoint (admin only)
app.post('/api/backup', authMiddleware, adminRequired, async (req, res) => {
  const dbFile = path.join(__dirname, '..', 'data.db')
  const backupFile = path.join(__dirname, '..', `data_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`)
  try {
    await copyFile(dbFile, backupFile)
    res.json({ message: '备份完成', filename: path.basename(backupFile) })
  } catch (e) {
    res.status(500).json({ error: '备份失败: ' + e.message })
  }
})

// Audit logs query endpoint (admin only)
app.get('/api/audit-logs', authMiddleware, adminRequired, (req, res) => {
  const { action, target_type, user_id } = req.query
  const pag = parsePagination(req.query, { defaultSize: 50, maxSize: 200 })
  const conditions = []
  const params = []
  if (action) { conditions.push('action=?'); params.push(action) }
  if (target_type) { conditions.push('target_type=?'); params.push(target_type) }
  if (user_id) { conditions.push('user_id=?'); params.push(user_id) }
  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : ''
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM audit_logs${where}`).get(...params)?.cnt || 0
  const rows = db.prepare(`SELECT * FROM audit_logs${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, pag.pageSize, pag.offset)
  res.json({ rows, total, page: pag.page, page_size: pag.pageSize })
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
