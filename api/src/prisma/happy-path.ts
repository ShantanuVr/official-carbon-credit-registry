import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function happyPathDemo() {
  console.log('🌱 Starting Carbon Credit Registry Happy Path Demo...\n')

  try {
    // Step 1: Login as Issuer → create Project → upload Evidence → submit
    console.log('Step 1: Issuer creates and submits a project')
    
    const issuer = await prisma.user.findUnique({
      where: { email: 'solarco@registry.test' },
      include: { organization: true },
    })

    if (!issuer) {
      throw new Error('Issuer user not found')
    }

    console.log(`✓ Logged in as: ${issuer.name} (${issuer.email})`)
    console.log(`✓ Organization: ${issuer.organization?.name}`)

    // Create a new project
    const newProject = await prisma.project.create({
      data: {
        title: 'Solar Farm Demo - Happy Path Project',
        description: 'A demonstration solar farm project for the happy path workflow',
        country: 'United States',
        region: 'Nevada',
        methodology: 'ACM0002 - Grid-connected renewable electricity generation',
        baselineRef: 'baseline_2023_v1.2',
        status: 'DRAFT',
        orgId: issuer.orgId!,
        iotDigestRef: 'iot_digest_demo_2024',
      },
    })

    console.log(`✓ Created project: ${newProject.title}`)

    // Upload evidence
    const evidence = await prisma.evidenceFile.create({
      data: {
        projectId: newProject.id,
        fileName: 'demo_project_documentation.pdf',
        sizeBytes: 1024000,
        sha256: 'demo1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
        cid: 'QmDemoProjectDoc1234567890abcdef',
        uploadedBy: issuer.id,
      },
    })

    console.log(`✓ Uploaded evidence: ${evidence.fileName}`)

    // Submit project
    const submittedProject = await prisma.project.update({
      where: { id: newProject.id },
      data: { status: 'UNDER_REVIEW' },
    })

    console.log(`✓ Submitted project for review`)

    // Step 2: Login as Verifier → approve Project
    console.log('\nStep 2: Verifier reviews and approves the project')
    
    const verifier = await prisma.user.findUnique({
      where: { email: 'verifier1@registry.test' },
    })

    if (!verifier) {
      throw new Error('Verifier user not found')
    }

    console.log(`✓ Logged in as: ${verifier.name} (${verifier.email})`)

    // Approve project
    const approvedProject = await prisma.project.update({
      where: { id: submittedProject.id },
      data: { status: 'APPROVED' },
    })

    console.log(`✓ Approved project: ${approvedProject.title}`)

    // Step 3: Issuer → create Issuance → submit
    console.log('\nStep 3: Issuer creates and submits an issuance request')
    
    const issuance = await prisma.issuanceRequest.create({
      data: {
        projectId: approvedProject.id,
        vintageStart: 2024,
        vintageEnd: 2024,
        quantity: 25000, // 25,000 tCO2e
        factorRef: 'factor_renewable_2024_v2.1',
        status: 'SUBMITTED',
        evidenceIds: [evidence.id],
      },
    })

    console.log(`✓ Created issuance request: ${issuance.quantity.toLocaleString()} tCO2e`)

    // Step 4: Verifier → approve Issuance
    console.log('\nStep 4: Verifier approves the issuance request')
    
    const approvedIssuance = await prisma.issuanceRequest.update({
      where: { id: issuance.id },
      data: { status: 'APPROVED' },
    })

    console.log(`✓ Approved issuance request`)

    // Step 5: Admin → finalize Issuance (mock adapter returns {adapterTxId,onchainHash})
    console.log('\nStep 5: Admin finalizes the issuance')
    
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@registry.test' },
    })

    if (!admin) {
      throw new Error('Admin user not found')
    }

    console.log(`✓ Logged in as: ${admin.name} (${admin.email})`)

    // Mock adapter response
    const adapterResponse = {
      adapterTxId: `tx_demo_${Date.now()}`,
      onchainHash: `0x${Math.random().toString(16).substr(2, 64)}`,
    }

    // Create credit batch
    const creditBatch = await prisma.creditBatch.create({
      data: {
        projectId: approvedProject.id,
        issuanceId: approvedIssuance.id,
        vintageStart: approvedIssuance.vintageStart,
        vintageEnd: approvedIssuance.vintageEnd,
        totalIssued: approvedIssuance.quantity,
        classId: `class_${approvedProject.id}_${approvedIssuance.vintageStart}_${approvedIssuance.vintageEnd}`,
      },
    })

    // Create initial holding for the project organization
    await prisma.creditHolding.create({
      data: {
        orgId: issuer.orgId!,
        batchId: creditBatch.id,
        quantity: approvedIssuance.quantity,
      },
    })

    // Update issuance with adapter response and finalize
    const finalizedIssuance = await prisma.issuanceRequest.update({
      where: { id: approvedIssuance.id },
      data: {
        status: 'FINALIZED',
        adapterTxId: adapterResponse.adapterTxId,
        onchainHash: adapterResponse.onchainHash,
      },
    })

    console.log(`✓ Finalized issuance with adapter transaction: ${adapterResponse.adapterTxId}`)
    console.log(`✓ On-chain hash: ${adapterResponse.onchainHash}`)

    // Step 6: Issuer → retire some credits → certificate generated
    console.log('\nStep 6: Issuer retires some credits')
    
    const retirementQuantity = 5000 // Retire 5,000 tCO2e
    const certificateId = `cert_demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Update holding
    await prisma.creditHolding.update({
      where: {
        orgId_batchId: {
          orgId: issuer.orgId!,
          batchId: creditBatch.id,
        },
      },
      data: {
        quantity: approvedIssuance.quantity - retirementQuantity,
      },
    })

    // Update batch total retired
    await prisma.creditBatch.update({
      where: { id: creditBatch.id },
      data: {
        totalRetired: retirementQuantity,
      },
    })

    // Create retirement record
    const retirement = await prisma.retirement.create({
      data: {
        orgId: issuer.orgId!,
        batchId: creditBatch.id,
        quantity: retirementQuantity,
        purpose: 'Corporate carbon neutrality commitment',
        beneficiary: 'Climate Action Initiative',
        certificateId,
      },
    })

    console.log(`✓ Retired ${retirementQuantity.toLocaleString()} tCO2e`)
    console.log(`✓ Generated retirement certificate: ${certificateId}`)

    // Step 7: Viewer → open public certificate URL
    console.log('\nStep 7: Public certificate is now available')
    console.log(`✓ Certificate URL: http://localhost:3000/retirements/${certificateId}`)
    console.log(`✓ Certificate PDF: http://localhost:4000/retirements/${certificateId}/pdf`)

    console.log('\n🎉 Happy Path Demo Completed Successfully!')
    console.log('\nSummary:')
    console.log(`- Project: ${approvedProject.title}`)
    console.log(`- Credits Issued: ${approvedIssuance.quantity.toLocaleString()} tCO2e`)
    console.log(`- Credits Retired: ${retirementQuantity.toLocaleString()} tCO2e`)
    console.log(`- Credits Available: ${(approvedIssuance.quantity - retirementQuantity).toLocaleString()} tCO2e`)
    console.log(`- Certificate ID: ${certificateId}`)
    console.log(`- Adapter Transaction: ${adapterResponse.adapterTxId}`)

  } catch (error) {
    console.error('❌ Error in happy path demo:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  happyPathDemo()
}

export { happyPathDemo }
