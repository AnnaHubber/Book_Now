import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import app from './api/app.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 3001

// Static file serving
app.use(express.static(path.join(here, 'dist')))
app.use(express.static(path.join(here, 'public')))

// SPA fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  const indexPath = path.join(here, 'dist', 'index.html')
  const fallback = path.join(here, 'index.html')
  res.sendFile(fs.existsSync(indexPath) ? indexPath : fallback)
})

// Start server
const server = app.listen(PORT, () => {
  const name = path.basename(here).split('-')[0]
  console.log(`\n  ${name.charAt(0).toUpperCase() + name.slice(1)} running on http://localhost:${PORT}\n`)
})

// Keep alive
server.on('error', (err) => console.error('Server error:', err))
process.on('SIGINT', () => { server.close(); process.exit(0) })
