const express = require('express')
const app = express()

app.use(express.json())

// Mock Registry Adapter API
app.post('/anchor/issuance', (req, res) => {
  const { issuanceId, projectId, quantity, vintageStart, vintageEnd, evidenceHashes, factorRef } = req.body
  
  console.log('Mock adapter received issuance:', {
    issuanceId,
    projectId,
    quantity,
    vintageStart,
    vintageEnd,
    evidenceHashes,
    factorRef
  })

  // Simulate blockchain transaction
  const adapterTxId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const onchainHash = `0x${Math.random().toString(16).substr(2, 64)}`

  res.json({
    adapterTxId,
    onchainHash,
    status: 'success',
    timestamp: new Date().toISOString()
  })
})

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'mock-adapter' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Mock Registry Adapter running on port ${PORT}`)
})
