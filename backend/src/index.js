import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDB } from './db.js'
import { seed } from './seed.js'
import { authMiddleware } from './auth.js'
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

app.use(cors())
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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
