import { PrismaClient } from '@prisma/client'

export interface SerialRange {
  id: string
  batchId: string
  ownerOrgId: string
  startSerial: number
  endSerial: number
  createdAt: Date
}

export interface SerialAllocation {
  startSerial: number
  endSerial: number
  quantity: number
}

export class SerialAllocator {
  constructor(private prisma: PrismaClient) {}

  /**
   * Allocate serials for a transfer from sender's ranges
   */
  async allocateForTransfer(
    batchId: string,
    fromOrgId: string,
    quantity: number
  ): Promise<SerialAllocation[]> {
    const allocations: SerialAllocation[] = []
    let remainingQuantity = quantity

    // Get sender's serial ranges for this batch, ordered by startSerial
    const senderRanges = await this.prisma.serialRange.findMany({
      where: {
        batchId,
        ownerOrgId: fromOrgId,
      },
      orderBy: { startSerial: 'asc' },
    })

    for (const range of senderRanges) {
      if (remainingQuantity <= 0) break

      const rangeQuantity = range.endSerial - range.startSerial + 1
      const allocateQuantity = Math.min(remainingQuantity, rangeQuantity)

      allocations.push({
        startSerial: range.startSerial,
        endSerial: range.startSerial + allocateQuantity - 1,
        quantity: allocateQuantity,
      })

      remainingQuantity -= allocateQuantity
    }

    if (remainingQuantity > 0) {
      throw new Error(`Insufficient serials available. Need ${quantity}, only have ${quantity - remainingQuantity}`)
    }

    return allocations
  }

  /**
   * Allocate contiguous serials for retirement
   */
  async allocateForRetirement(
    batchId: string,
    orgId: string,
    quantity: number
  ): Promise<SerialAllocation> {
    // Get organization's serial ranges for this batch
    const ranges = await this.prisma.serialRange.findMany({
      where: {
        batchId,
        ownerOrgId: orgId,
      },
      orderBy: { startSerial: 'asc' },
    })

    // Find the first range that can accommodate the retirement
    for (const range of ranges) {
      const rangeQuantity = range.endSerial - range.startSerial + 1
      if (rangeQuantity >= quantity) {
        return {
          startSerial: range.startSerial,
          endSerial: range.startSerial + quantity - 1,
          quantity,
        }
      }
    }

    throw new Error(`No contiguous range available for retirement of ${quantity} credits`)
  }

  /**
   * Split a serial range when transferring partial quantity
   */
  async splitSerialRange(
    rangeId: string,
    splitPoint: number
  ): Promise<{ remainingRange: SerialRange; transferredRange: SerialRange }> {
    const range = await this.prisma.serialRange.findUnique({
      where: { id: rangeId },
    })

    if (!range) {
      throw new Error('Serial range not found')
    }

    if (splitPoint <= range.startSerial || splitPoint > range.endSerial) {
      throw new Error('Invalid split point')
    }

    // Update the original range to end before split point
    const remainingRange = await this.prisma.serialRange.update({
      where: { id: rangeId },
      data: { endSerial: splitPoint - 1 },
    })

    // Create new range for transferred portion
    const transferredRange = await this.prisma.serialRange.create({
      data: {
        batchId: range.batchId,
        ownerOrgId: range.ownerOrgId,
        startSerial: splitPoint,
        endSerial: range.endSerial,
      },
    })

    return { remainingRange, transferredRange }
  }

  /**
   * Transfer serial ranges between organizations
   */
  async transferSerialRanges(
    batchId: string,
    fromOrgId: string,
    toOrgId: string,
    allocations: SerialAllocation[]
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const allocation of allocations) {
        // Find and update the source range
        const sourceRange = await tx.serialRange.findFirst({
          where: {
            batchId,
            ownerOrgId: fromOrgId,
            startSerial: { lte: allocation.startSerial },
            endSerial: { gte: allocation.endSerial },
          },
        })

        if (!sourceRange) {
          throw new Error('Source serial range not found')
        }

        // If the allocation covers the entire source range, transfer it
        if (sourceRange.startSerial === allocation.startSerial && 
            sourceRange.endSerial === allocation.endSerial) {
          await tx.serialRange.update({
            where: { id: sourceRange.id },
            data: { ownerOrgId: toOrgId },
          })
        } else {
          // Split the range
          await tx.serialRange.update({
            where: { id: sourceRange.id },
            data: { endSerial: allocation.startSerial - 1 },
          })

          // Create new range for recipient
          await tx.serialRange.create({
            data: {
              batchId,
              ownerOrgId: toOrgId,
              startSerial: allocation.startSerial,
              endSerial: allocation.endSerial,
            },
          })

          // If there's a remaining portion, create another range
          if (allocation.endSerial < sourceRange.endSerial) {
            await tx.serialRange.create({
              data: {
                batchId,
                ownerOrgId: fromOrgId,
                startSerial: allocation.endSerial + 1,
                endSerial: sourceRange.endSerial,
              },
            })
          }
        }
      }
    })
  }

  /**
   * Create initial serial range for issuer when batch is finalized
   * This method is deprecated - use createSerialRangeWithGlobalNumbers instead
   */
  async createInitialSerialRange(
    batchId: string,
    orgId: string,
    quantity: number
  ): Promise<SerialRange> {
    // Get the next global serial number
    const startSerial = await this.getNextGlobalSerialNumber(quantity)
    
    return await this.prisma.serialRange.create({
      data: {
        batchId,
        ownerOrgId: orgId,
        startSerial,
        endSerial: startSerial + quantity - 1,
      },
    })
  }

  /**
   * Create serial range with specific global serial numbers (for transfers)
   */
  async createSerialRangeWithGlobalNumbers(
    batchId: string,
    orgId: string,
    startSerial: number,
    endSerial: number
  ): Promise<SerialRange> {
    return await this.prisma.serialRange.create({
      data: {
        batchId,
        ownerOrgId: orgId,
        startSerial,
        endSerial,
      },
    })
  }

  /**
   * Get the next global serial number(s) and increment the counter
   */
  async getNextGlobalSerialNumber(quantity: number): Promise<number> {
    return await this.prisma.$transaction(async (tx) => {
      // Get the global counter
      let counter = await tx.globalSerialCounter.findFirst()
      
      if (!counter) {
        counter = await tx.globalSerialCounter.create({
          data: { counter: 0 }
        })
      }

      const startSerial = counter.counter + 1
      
      // Update the counter
      await tx.globalSerialCounter.update({
        where: { id: counter.id },
        data: { counter: counter.counter + quantity }
      })

      return startSerial
    })
  }

  /**
   * Get serial ranges for an organization and batch
   */
  async getSerialRanges(batchId: string, orgId: string): Promise<SerialRange[]> {
    return await this.prisma.serialRange.findMany({
      where: {
        batchId,
        ownerOrgId: orgId,
      },
      orderBy: { startSerial: 'asc' },
    })
  }

  /**
   * Format serial range for display
   */
  formatSerialRange(startSerial: number, endSerial: number): string {
    if (startSerial === endSerial) {
      return `${startSerial.toString().padStart(8, '0')}`
    }
    return `${startSerial.toString().padStart(8, '0')}-${endSerial.toString().padStart(8, '0')}`
  }

  /**
   * Generate human-readable serial format
   */
  generateHumanReadableSerial(
    projectCode: string,
    vintageStart: number,
    vintageEnd: number,
    batchId: string,
    startSerial: number,
    endSerial: number
  ): string {
    const batchCode = batchId.slice(-4).toUpperCase()
    const serialStart = startSerial.toString().padStart(8, '0')
    const serialEnd = endSerial.toString().padStart(8, '0')
    
    return `SIM-REG-${projectCode}-${vintageStart}-${vintageEnd}-${batchCode}-${serialStart}-${serialEnd}`
  }
}
