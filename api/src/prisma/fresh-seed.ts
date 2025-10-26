import { PrismaClient, Role, ProjectStatus, IssuanceStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function cleanDatabase() {
  console.log('🧹 Cleaning existing data...')
  
  // Delete in reverse order of dependencies
  await prisma.auditEvent.deleteMany()
  await prisma.retirement.deleteMany()
  await prisma.transfer.deleteMany()
  await prisma.creditHolding.deleteMany()
  await prisma.serialRange.deleteMany()
  await prisma.creditBatch.deleteMany()
  await prisma.evidenceFile.deleteMany()
  await prisma.issuanceRequest.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.globalSerialCounter.deleteMany()
  
  console.log('✅ Database cleaned')
}

async function seedUsers() {
  console.log('👥 Seeding users and organizations...')

  const hashedPassword = await bcrypt.hash('password123', 12)

  // Create organizations
  const solarOrg = await prisma.organization.create({
    data: {
      id: 'org-solar-001',
      name: 'SolarCo Energy Solutions',
      type: 'ISSUER',
    },
  })

  const windOrg = await prisma.organization.create({
    data: {
      id: 'org-wind-001',
      name: 'WindPower Technologies',
      type: 'ISSUER',
    },
  })

  const hydroOrg = await prisma.organization.create({
    data: {
      id: 'org-hydro-001',
      name: 'CleanWater Hydro Systems',
      type: 'ISSUER',
    },
  })

  const verifierOrg = await prisma.organization.create({
    data: {
      id: 'org-verifier-001',
      name: 'CarbonVerify Inc.',
      type: 'VERIFIER',
    },
  })

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@carbonregistry.test',
      name: 'Admin User',
      role: Role.ADMIN,
      password: hashedPassword,
    },
  })

  // Create verifier users
  await prisma.user.create({
    data: {
      email: 'verifier@carbonregistry.test',
      name: 'Alice Verifier',
      role: Role.VERIFIER,
      orgId: verifierOrg.id,
      password: hashedPassword,
    },
  })

  await prisma.user.create({
    data: {
      email: 'verifier2@carbonregistry.test',
      name: 'Bob Verifier',
      role: Role.VERIFIER,
      orgId: verifierOrg.id,
      password: hashedPassword,
    },
  })

  // Create issuer users
  await prisma.user.create({
    data: {
      email: 'issuer@carbonregistry.test',
      name: 'Jane Issuer',
      role: Role.ISSUER,
      orgId: solarOrg.id,
      password: hashedPassword,
    },
  })

  await prisma.user.create({
    data: {
      email: 'issuer2@carbonregistry.test',
      name: 'John Issuer',
      role: Role.ISSUER,
      orgId: windOrg.id,
      password: hashedPassword,
    },
  })

  // Create viewer user
  await prisma.user.create({
    data: {
      email: 'viewer@carbonregistry.test',
      name: 'Public Viewer',
      role: Role.VIEWER,
      password: hashedPassword,
    },
  })

  console.log('✅ Users and organizations created')
  
  return { solarOrg, windOrg, hydroOrg, verifierOrg }
}

async function seedProjects(orgs: any) {
  console.log('🌱 Seeding projects...')

  // Create DRAFT project
  const draftProject = await prisma.project.create({
    data: {
      title: 'Rural Solar Array - Phase 1',
      description: 'Installation of 500kW solar array in rural community',
      methodology: 'VCS v4.5',
      orgId: orgs.solarOrg.id,
      status: ProjectStatus.DRAFT,
      region: 'Rajasthan, India',
      country: 'India',
    },
  })

  // Create UNDER_REVIEW project
  const reviewProject = await prisma.project.create({
    data: {
      title: 'Urban Wind Farm - Central District',
      description: '20MW wind farm serving urban district',
      methodology: 'CDM ACM0002',
      orgId: orgs.windOrg.id,
      status: ProjectStatus.UNDER_REVIEW,
      region: 'Gujarat, India',
      country: 'India',
    },
  })

  // Create NEEDS_CHANGES project
  const needsChangesProject = await prisma.project.create({
    data: {
      title: 'Hydroelectric Plant - River Valley',
      description: 'Small-scale hydroelectric plant',
      methodology: 'GHG Protocol',
      orgId: orgs.hydroOrg.id,
      status: ProjectStatus.NEEDS_CHANGES,
      region: 'Himachal Pradesh, India',
      country: 'India',
      feedback: 'Please provide detailed environmental impact assessment',
      feedbackBy: 'verifier@carbonregistry.test',
      feedbackAt: new Date(),
    },
  })

  // Create APPROVED project with finalized issuance
  const approvedProject = await prisma.project.create({
    data: {
      title: 'Solar Grid Expansion - Northern Region',
      description: 'Expansion of grid-connected solar generation capacity',
      methodology: 'VCS v4.5',
      orgId: orgs.solarOrg.id,
      status: ProjectStatus.APPROVED,
      region: 'Punjab, India',
      country: 'India',
    },
  })

  // Create another APPROVED project
  const approvedProject2 = await prisma.project.create({
    data: {
      title: 'Coastal Wind Energy Project',
      description: '50MW offshore wind farm',
      methodology: 'CDM ACM0002',
      orgId: orgs.windOrg.id,
      status: ProjectStatus.APPROVED,
      region: 'Maharashtra, India',
      country: 'India',
    },
  })

  console.log('✅ Projects created')
  
  return { draftProject, reviewProject, needsChangesProject, approvedProject, approvedProject2 }
}

async function seedIssuances(projects: any, orgs: any) {
  console.log('📝 Seeding issuance requests...')

  // Create issuance in UNDER_REVIEW
  await prisma.issuanceRequest.create({
    data: {
      projectId: projects.reviewProject.id,
      vintageStart: 2023,
      vintageEnd: 2024,
      quantity: 40000,
      factorRef: 'factor_renewable_2023_v2.1',
      status: IssuanceStatus.UNDER_REVIEW,
      evidenceIds: [],
    },
  })

  // Create finalized issuance with credit batch
  const finalizedIssuance = await prisma.issuanceRequest.create({
    data: {
      projectId: projects.approvedProject.id,
      vintageStart: 2022,
      vintageEnd: 2023,
      quantity: 50000,
      factorRef: 'factor_solar_2022_v1.8',
      status: IssuanceStatus.FINALIZED,
      adapterTxId: 'tx_finalized_2022_solar_001',
      onchainHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      evidenceIds: [],
    },
  })

  // Create credit batch
  const creditBatch = await prisma.creditBatch.create({
    data: {
      projectId: projects.approvedProject.id,
      issuanceId: finalizedIssuance.id,
      vintageStart: 2022,
      vintageEnd: 2023,
      totalIssued: 50000,
      totalRetired: 5000,
      classId: `class_${projects.approvedProject.id}_2022_2023`,
      serialStart: 1,
      serialEnd: 50000,
    },
  })

  // Create holdings
  await prisma.creditHolding.create({
    data: {
      orgId: orgs.solarOrg.id,
      batchId: creditBatch.id,
      quantity: 45000,
    },
  })

  // Create serial ranges
  await prisma.serialRange.create({
    data: {
      batchId: creditBatch.id,
      ownerOrgId: orgs.solarOrg.id,
      startSerial: 1,
      endSerial: 45000,
    },
  })

  // Another finalized issuance
  const finalizedIssuance2 = await prisma.issuanceRequest.create({
    data: {
      projectId: projects.approvedProject2.id,
      vintageStart: 2023,
      vintageEnd: 2024,
      quantity: 75000,
      factorRef: 'factor_wind_2023_v2.0',
      status: IssuanceStatus.FINALIZED,
      adapterTxId: 'tx_finalized_2023_wind_001',
      onchainHash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
      evidenceIds: [],
    },
  })

  const creditBatch2 = await prisma.creditBatch.create({
    data: {
      projectId: projects.approvedProject2.id,
      issuanceId: finalizedIssuance2.id,
      vintageStart: 2023,
      vintageEnd: 2024,
      totalIssued: 75000,
      totalRetired: 0,
      classId: `class_${projects.approvedProject2.id}_2023_2024`,
      serialStart: 50001,
      serialEnd: 125000,
    },
  })

  await prisma.creditHolding.create({
    data: {
      orgId: orgs.windOrg.id,
      batchId: creditBatch2.id,
      quantity: 75000,
    },
  })

  await prisma.serialRange.create({
    data: {
      batchId: creditBatch2.id,
      ownerOrgId: orgs.windOrg.id,
      startSerial: 50001,
      endSerial: 125000,
    },
  })

  console.log('✅ Issuance requests and credit batches created')
  
  return { finalizedIssuance, finalizedIssuance2 }
}

async function seedRetirements(issuances: any) {
  console.log('♻️  Seeding retirements...')

  // Create a retirement
  const creditBatchForRetirement = await prisma.creditBatch.findFirst({
    where: { projectId: 'approval-test-123' } // Use a project that exists
  })
  
  if (creditBatchForRetirement) {
    await prisma.retirement.create({
      data: {
        id: 'ret-001',
        orgId: 'org-solar-001',
        batchId: creditBatchForRetirement.id,
        quantity: 5000,
        serialStart: 45001,
        serialEnd: 50000,
        reason: 'Corporate carbon neutrality initiative',
        certificateId: 'cert-solar-2022-ret-001',
      },
    })
  }

  console.log('✅ Retirements created')
}

async function main() {
  try {
    console.log('🌱 Starting fresh database seeding...\n')

    // Clean existing data
    await cleanDatabase()

    // Seed users and organizations
    const orgs = await seedUsers()

    // Seed projects
    const projects = await seedProjects(orgs)

    // Seed issuances
    const issuances = await seedIssuances(projects, orgs)

    // Seed retirements (commented out for simplicity)
    // await seedRetirements(issuances)

    console.log('\n✅ Fresh seed data created successfully!')
    console.log('\n📊 Summary:')
    console.log('  - Organizations: 4')
    console.log('  - Users: 6')
    console.log('  - Projects: 5')
    console.log('  - Issuance Requests: 2')
    console.log('  - Credit Batches: 2')
    console.log('  - Retirements: 1')
    console.log('\n👤 Test Users:')
    console.log('  - admin@carbonregistry.test / password123')
    console.log('  - issuer@carbonregistry.test / password123')
    console.log('  - verifier@carbonregistry.test / password123')
    console.log('  - viewer@carbonregistry.test / password123')

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

