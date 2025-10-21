const express = require('express')
const app = express()

app.use(express.json())

// Mock IoT Oracle API
app.get('/digest/latest', (req, res) => {
  const { projectId } = req.query
  
  console.log('Mock oracle received digest request for project:', projectId)

  // Generate mock IoT data
  const kwh = Math.floor(Math.random() * 10000) + 1000
  const tco2e = Math.floor(kwh * 0.4) // Mock conversion factor
  const digestHash = `0x${Math.random().toString(16).substr(2, 64)}`
  const cid = `Qm${Math.random().toString(36).substr(2, 44)}`

  res.json({
    projectId,
    kwh,
    tco2e,
    date: new Date().toISOString().split('T')[0],
    digestHash,
    cid,
    lastUpdated: new Date().toISOString()
  })
})

app.get('/digest/:projectId/history', (req, res) => {
  const { projectId } = req.params
  
  console.log('Mock oracle received history request for project:', projectId)

  // Generate mock historical data
  const history = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    const kwh = Math.floor(Math.random() * 10000) + 1000
    const tco2e = Math.floor(kwh * 0.4)
    
    return {
      date: date.toISOString().split('T')[0],
      kwh,
      tco2e,
      digestHash: `0x${Math.random().toString(16).substr(2, 64)}`
    }
  })

  res.json({
    projectId,
    history
  })
})

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'mock-oracle' })
})

const PORT = process.env.PORT || 3003
app.listen(PORT, () => {
  console.log(`Mock IoT Oracle running on port ${PORT}`)
})
