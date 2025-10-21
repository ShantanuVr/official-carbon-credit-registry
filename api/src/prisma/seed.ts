import { PrismaClient, Role, ProjectStatus, IssuanceStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seedUsers() {
  console.log('Seeding users...')

  const hashedPassword = await bcrypt.hash('Admin@123', 12)

  // Create organizations
  const solarOrg = await prisma.organization.upsert({
    where: { id: 'solar-co' },
    update: {},
    create: {
      id: 'solar-co',
      name: 'SolarCo Energy',
      type: 'ISSUER',
    },
  })

  const greenOrg = await prisma.organization.upsert({
    where: { id: 'green-gen' },
    update: {},
    create: {
      id: 'green-gen',
      name: 'GreenGen Solutions',
      type: 'ISSUER',
    },
  })

  const verifierOrg = await prisma.organization.upsert({
    where: { id: 'carbon-verify' },
    update: {},
    create: {
      id: 'carbon-verify',
      name: 'CarbonVerify Ltd',
      type: 'VERIFIER',
    },
  })

  // Create users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@registry.test' },
    update: {},
    create: {
      email: 'admin@registry.test',
      name: 'Registry Administrator',
      role: Role.ADMIN,
      password: hashedPassword,
    },
  })

  const verifier1 = await prisma.user.upsert({
    where: { email: 'verifier1@registry.test' },
    update: {},
    create: {
      email: 'verifier1@registry.test',
      name: 'Alice Verifier',
      role: Role.VERIFIER,
      orgId: verifierOrg.id,
      password: hashedPassword,
    },
  })

  const verifier2 = await prisma.user.upsert({
    where: { email: 'verifier2@registry.test' },
    update: {},
    create: {
      email: 'verifier2@registry.test',
      name: 'Bob Verifier',
      role: Role.VERIFIER,
      orgId: verifierOrg.id,
      password: hashedPassword,
    },
  })

  const issuer1 = await prisma.user.upsert({
    where: { email: 'solarco@registry.test' },
    update: {},
    create: {
      email: 'solarco@registry.test',
      name: 'SolarCo Project Manager',
      role: Role.ISSUER,
      orgId: solarOrg.id,
      password: hashedPassword,
    },
  })

  const issuer2 = await prisma.user.upsert({
    where: { email: 'greengen@registry.test' },
    update: {},
    create: {
      email: 'greengen@registry.test',
      name: 'GreenGen Project Manager',
      role: Role.ISSUER,
      orgId: greenOrg.id,
      password: hashedPassword,
    },
  })

  console.log('Users seeded successfully')
  return { admin, verifier1, verifier2, issuer1, issuer2, solarOrg, greenOrg, verifierOrg }
}

async function seedProjects(organizations: any) {
  console.log('Seeding projects...')

  const { solarOrg, greenOrg } = organizations

  // Solar Farm A (DRAFT)
  const solarFarmA = await prisma.project.upsert({
    where: { id: 'solar-farm-a' },
    update: {},
    create: {
      id: 'solar-farm-a',
      orgId: solarOrg.id,
      title: 'Solar Farm A - Renewable Energy Project',
      description: 'A 50MW solar photovoltaic power plant located in California, USA. This project generates clean electricity and reduces CO2 emissions by displacing fossil fuel-based power generation.',
      country: 'United States',
      region: 'California',
      methodology: 'ACM0002 - Grid-connected renewable electricity generation',
      baselineRef: 'baseline_2023_v1.2',
      status: ProjectStatus.DRAFT,
      iotDigestRef: 'iot_digest_solar_a_2024',
    },
  })

  // Solar Farm B (UNDER_REVIEW)
  const solarFarmB = await prisma.project.upsert({
    where: { id: 'solar-farm-b' },
    update: {},
    create: {
      id: 'solar-farm-b',
      orgId: solarOrg.id,
      title: 'Solar Farm B - Community Solar Initiative',
      description: 'A 25MW community solar project in Texas providing renewable energy to local residents and businesses.',
      country: 'United States',
      region: 'Texas',
      methodology: 'ACM0002 - Grid-connected renewable electricity generation',
      baselineRef: 'baseline_2023_v1.2',
      status: ProjectStatus.UNDER_REVIEW,
      iotDigestRef: 'iot_digest_solar_b_2024',
    },
  })

  // Wind Farm C (APPROVED)
  const windFarmC = await prisma.project.upsert({
    where: { id: 'wind-farm-c' },
    update: {},
    create: {
      id: 'wind-farm-c',
      orgId: greenOrg.id,
      title: 'Wind Farm C - Offshore Wind Project',
      description: 'A 100MW offshore wind farm in the North Sea generating clean electricity for European grid.',
      country: 'United Kingdom',
      region: 'North Sea',
      methodology: 'ACM0002 - Grid-connected renewable electricity generation',
      baselineRef: 'baseline_2023_v1.2',
      status: ProjectStatus.APPROVED,
      iotDigestRef: 'iot_digest_wind_c_2024',
    },
  })

  console.log('Projects seeded successfully')
  return { solarFarmA, solarFarmB, windFarmC }
}

async function seedEvidence(projects: any) {
  console.log('Seeding evidence files...')

  const { solarFarmA, solarFarmB, windFarmC } = projects

  // Evidence for Solar Farm A
  await prisma.evidenceFile.upsert({
    where: { id: 'evidence-solar-a-1' },
    update: {},
    create: {
      id: 'evidence-solar-a-1',
      projectId: solarFarmA.id,
      fileName: 'solar_farm_a_project_documentation.pdf',
      sizeBytes: 2048576,
      sha256: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
      cid: 'QmSolarFarmAProjectDoc1234567890abcdef',
      uploadedBy: 'solar-co-user',
    },
  })

  await prisma.evidenceFile.upsert({
    where: { id: 'evidence-solar-a-2' },
    update: {},
    create: {
      id: 'evidence-solar-a-2',
      projectId: solarFarmA.id,
      fileName: 'solar_farm_a_baseline_study.pdf',
      sizeBytes: 1536000,
      sha256: 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890',
      cid: 'QmSolarFarmABaselineStudy1234567890abcdef',
      uploadedBy: 'solar-co-user',
    },
  })

  // Evidence for Solar Farm B
  await prisma.evidenceFile.upsert({
    where: { id: 'evidence-solar-b-1' },
    update: {},
    create: {
      id: 'evidence-solar-b-1',
      projectId: solarFarmB.id,
      fileName: 'solar_farm_b_project_documentation.pdf',
      sizeBytes: 1800000,
      sha256: 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890ab',
      cid: 'QmSolarFarmBProjectDoc1234567890abcdef',
      uploadedBy: 'solar-co-user',
    },
  })

  // Evidence for Wind Farm C
  await prisma.evidenceFile.upsert({
    where: { id: 'evidence-wind-c-1' },
    update: {},
    create: {
      id: 'evidence-wind-c-1',
      projectId: windFarmC.id,
      fileName: 'wind_farm_c_project_documentation.pdf',
      sizeBytes: 2500000,
      sha256: 'd4e5f6789012345678901234567890abcdef1234567890abcdef1234567890abcd',
      cid: 'QmWindFarmCProjectDoc1234567890abcdef',
      uploadedBy: 'green-gen-user',
    },
  })

  console.log('Evidence files seeded successfully')
}

async function seedIssuances(projects: any) {
  console.log('Seeding issuance requests...')

  const { windFarmC } = projects

  // Create an issuance request ready for approval
  const issuance = await prisma.issuanceRequest.upsert({
    where: { id: 'issuance-wind-c-1' },
    update: {},
    create: {
      id: 'issuance-wind-c-1',
      projectId: windFarmC.id,
      vintageStart: 2024,
      vintageEnd: 2024,
      quantity: 50000, // 50,000 tCO2e
      factorRef: 'factor_renewable_2024_v2.1',
      status: IssuanceStatus.SUBMITTED,
      evidenceIds: ['evidence-wind-c-1'],
    },
  })

  console.log('Issuance requests seeded successfully')
  return { issuance }
}

async function main() {
  try {
    console.log('Starting database seeding...')

    const organizations = await seedUsers()
    const projects = await seedProjects(organizations)
    await seedEvidence(projects)
    const issuances = await seedIssuances(projects)

    console.log('Database seeding completed successfully!')
    console.log('\nDemo accounts:')
    console.log('Admin: admin@registry.test / Admin@123')
    console.log('Verifier 1: verifier1@registry.test / Admin@123')
    console.log('Verifier 2: verifier2@registry.test / Admin@123')
    console.log('Issuer 1: solarco@registry.test / Admin@123')
    console.log('Issuer 2: greengen@registry.test / Admin@123')
    console.log('\nProjects created:')
    console.log('- Solar Farm A (DRAFT)')
    console.log('- Solar Farm B (UNDER_REVIEW)')
    console.log('- Wind Farm C (APPROVED)')
    console.log('\nIssuance ready for approval:')
    console.log('- Wind Farm C issuance (50,000 tCO2e)')

  } catch (error) {
    console.error('Error seeding database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

export { main as seedAll }
