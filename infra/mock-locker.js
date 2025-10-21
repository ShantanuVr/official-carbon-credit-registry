const express = require('express')
const multer = require('multer')
const crypto = require('crypto')
const app = express()

app.use(express.json())

// Mock Evidence Locker API
app.post('/upload/init', (req, res) => {
  const { fileName, sizeBytes } = req.body
  
  console.log('Mock locker received upload init:', { fileName, sizeBytes })

  // Generate signed URL (mock)
  const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const signedUrl = `https://mock-locker.com/upload/${uploadId}`

  res.json({
    uploadId,
    signedUrl,
    expiresIn: 3600 // 1 hour
  })
})

app.post('/upload/complete', (req, res) => {
  const { uploadId, sha256 } = req.body
  
  console.log('Mock locker received upload complete:', { uploadId, sha256 })

  // Generate mock CID
  const cid = `Qm${crypto.randomBytes(32).toString('hex')}`

  res.json({
    cid,
    sha256,
    sizeBytes: Math.floor(Math.random() * 1000000) + 10000,
    status: 'success'
  })
})

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'mock-locker' })
})

const PORT = process.env.PORT || 3002
app.listen(PORT, () => {
  console.log(`Mock Evidence Locker running on port ${PORT}`)
})
