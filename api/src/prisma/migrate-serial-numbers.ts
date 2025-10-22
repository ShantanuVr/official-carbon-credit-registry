import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateSerialNumbers() {
  console.log('🔄 Starting serial number migration...')

  try {
    // Get all existing credit batches ordered by creation date
    const batches = await prisma.creditBatch.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        serialRanges: true,
      },
    })

    console.log(`Found ${batches.length} credit batches to migrate`)

    let globalCounter = 0

    for (const batch of batches) {
      const quantity = batch.totalIssued
      const newStartSerial = globalCounter + 1
      const newEndSerial = globalCounter + quantity

      console.log(`Migrating batch ${batch.id}: ${batch.serialStart}-${batch.serialEnd} → ${newStartSerial}-${newEndSerial}`)

      // Update the credit batch
      await prisma.creditBatch.update({
        where: { id: batch.id },
        data: {
          serialStart: newStartSerial,
          serialEnd: newEndSerial,
        },
      })

      // Update all serial ranges for this batch
      for (const range of batch.serialRanges) {
        const rangeQuantity = range.endSerial - range.startSerial + 1
        const rangeStartSerial = newStartSerial + (range.startSerial - batch.serialStart)
        const rangeEndSerial = rangeStartSerial + rangeQuantity - 1

        await prisma.serialRange.update({
          where: { id: range.id },
          data: {
            startSerial: rangeStartSerial,
            endSerial: rangeEndSerial,
          },
        })

        console.log(`  Updated range ${range.id}: ${range.startSerial}-${range.endSerial} → ${rangeStartSerial}-${rangeEndSerial}`)
      }

      // Update retirements for this batch
      const retirements = await prisma.retirement.findMany({
        where: { batchId: batch.id },
      })

      for (const retirement of retirements) {
        const retirementQuantity = retirement.serialEnd - retirement.serialStart + 1
        const retirementStartSerial = newStartSerial + (retirement.serialStart - batch.serialStart)
        const retirementEndSerial = retirementStartSerial + retirementQuantity - 1

        await prisma.retirement.update({
          where: { id: retirement.id },
          data: {
            serialStart: retirementStartSerial,
            serialEnd: retirementEndSerial,
          },
        })

        console.log(`  Updated retirement ${retirement.id}: ${retirement.serialStart}-${retirement.serialEnd} → ${retirementStartSerial}-${retirementEndSerial}`)
      }

      globalCounter += quantity
    }

    // Set the global counter to the final value
    await prisma.globalSerialCounter.upsert({
      where: { id: 'default' },
      update: { counter: globalCounter },
      create: { id: 'default', counter: globalCounter },
    })

    console.log(`✅ Migration completed! Global counter set to ${globalCounter}`)
    console.log('📊 Summary:')
    console.log(`- Migrated ${batches.length} credit batches`)
    console.log(`- Total serial numbers: ${globalCounter}`)
    console.log(`- Serial range: 1-${globalCounter}`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  migrateSerialNumbers()
    .then(() => {
      console.log('🎉 Migration completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error)
      process.exit(1)
    })
}

export { migrateSerialNumbers }
