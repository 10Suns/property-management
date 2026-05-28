import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import db from '../db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, '..', '..', 'uploads')

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`)
  }
})
const upload = multer({ storage, limits: { fileSize: 10*1024*1024 } })

const router = Router()

router.post('/upload', upload.array('photos', 6), (req, res) => {
  const { record_id, result_id } = req.body
  if (!record_id) return res.status(400).json({ error: '请指定查验记录' })

  const record = db.prepare('SELECT * FROM inspection_records WHERE id=?').get(record_id)
  if (!record) return res.status(404).json({ error: '记录不存在' })

  const insert = db.prepare('INSERT INTO inspection_photos (record_id,result_id,filename,original_name,uploaded_by) VALUES (?,?,?,?,?)')
  const photos = []
  for (const file of req.files) {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8')
    const r = insert.run(record_id, result_id||null, file.filename, originalName, req.user.id)
    photos.push({ id: r.lastInsertRowid, filename: file.filename, original_name: originalName })
  }
  res.json(photos)
})

router.delete('/:id', (req, res) => {
  const photo = db.prepare('SELECT * FROM inspection_photos WHERE id=?').get(req.params.id)
  if (!photo) return res.status(404).json({ error: '照片不存在' })
  const record = db.prepare('SELECT * FROM inspection_records WHERE id=?').get(photo.record_id)
  if (req.user.role !== 'admin' && record.created_by !== req.user.id) return res.status(403).json({ error: '只能删除自己的照片' })
  db.prepare('DELETE FROM inspection_photos WHERE id=?').run(req.params.id)
  res.json({ message: '已删除' })
})

export default router
