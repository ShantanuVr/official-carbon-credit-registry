import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Running Carbon Credit Registry Happy Path Demo...')
  
  try {
    // Import and run the happy path demo
    const { happyPathDemo } = await import('./happy-path')
    await happyPathDemo()
  } catch (error) {
    console.error('❌ Error running happy path demo:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}
