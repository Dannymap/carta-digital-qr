import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const storage = multer.diskStorage({
  destination: path.join(__dirname, 'public/images'),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`
    cb(null, name)
  },
})
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'upload-plugin',
      configureServer(server) {
        server.middlewares.use('/api/upload', (req, res, next) => {
          if (req.method !== 'POST') return next()
          upload.single('file')(req, res, err => {
            if (err) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: err.message }))
              return
            }
            const url = `/images/${req.file.filename}`
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ url }))
          })
        })
      },
    },
  ],
})
