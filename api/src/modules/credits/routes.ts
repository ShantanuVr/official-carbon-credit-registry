import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../index'
import { AppError, ErrorCodes } from '../../lib/errors'
import { authenticate, requireRole, AuthenticatedRequest } from '../../lib/auth'
import { Role } from '@prisma/client'

const transferCreditsSchema = z.object({
  from: z.string().optional(), // Defaults to current user's org
  toOrgId: z.string(),
  batchId: z.string(),
  quantity: z.number().int().positive(),
})

const retireCreditsSchema = z.object({
  batchId: z.string(),
  quantity: z.number().int().positive(),
  purpose: z.string().min(1),
  beneficiary: z.string().optional(),
})

export async function creditRoutes(fastify: FastifyInstance) {
  // Get credit balance
  fastify.get('/balance', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const query = request.query as any

    const ownerId = query.ownerId === 'me' ? authRequest.user.orgId : query.ownerId

    if (!ownerId) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Owner ID is required', 400)
    }

    // Check permissions
    if (authRequest.user.role === Role.ISSUER && ownerId !== authRequest.user.orgId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403)
    }

    const holdings = await prisma.creditHolding.findMany({
      where: { orgId: ownerId },
      include: {
        batch: {
          include: {
            project: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    })

    const totalBalance = holdings.reduce((sum, holding) => sum + holding.quantity, 0)

    return {
      ownerId,
      totalBalance,
      holdings: holdings.map(holding => ({
        batchId: holding.batchId,
        quantity: holding.quantity,
        project: holding.batch.project,
        vintage: `${holding.batch.vintageStart}-${holding.batch.vintageEnd}`,
        classId: holding.batch.classId,
        totalIssued: holding.batch.totalIssued,
        totalRetired: holding.batch.totalRetired,
      })),
    }
  })

  // Transfer credits
  fastify.post('/transfer', {
    preHandler: [authenticate, requireRole([Role.ADMIN, Role.ISSUER])],
    schema: {
      body: transferCreditsSchema,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const data = request.body as z.infer<typeof transferCreditsSchema>

    const fromOrgId = data.from || authRequest.user.orgId

    if (!fromOrgId) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'From organization is required', 400)
    }

    // Check permissions
    if (authRequest.user.role === Role.ISSUER && fromOrgId !== authRequest.user.orgId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403)
    }

    // Validate credit batch exists
    const batch = await prisma.creditBatch.findUnique({
      where: { id: data.batchId },
      include: {
        project: true,
      },
    })

    if (!batch) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Credit batch not found', 404)
    }

    // Check if sender has sufficient credits
    const senderHolding = await prisma.creditHolding.findUnique({
      where: {
        orgId_batchId: {
          orgId: fromOrgId,
          batchId: data.batchId,
        },
      },
    })

    if (!senderHolding || senderHolding.quantity < data.quantity) {
      throw new AppError(ErrorCodes.INSUFFICIENT_CREDITS, 'Insufficient credits', 400)
    }

    // Validate recipient organization exists
    const recipientOrg = await prisma.organization.findUnique({
      where: { id: data.toOrgId },
    })

    if (!recipientOrg) {
      throw new AppError(ErrorCodes.ORGANIZATION_NOT_FOUND, 'Recipient organization not found', 404)
    }

    // Perform transfer in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update sender's holding
      await tx.creditHolding.update({
        where: {
          orgId_batchId: {
            orgId: fromOrgId,
            batchId: data.batchId,
          },
        },
        data: {
          quantity: senderHolding.quantity - data.quantity,
        },
      })

      // Update or create recipient's holding
      const recipientHolding = await tx.creditHolding.findUnique({
        where: {
          orgId_batchId: {
            orgId: data.toOrgId,
            batchId: data.batchId,
          },
        },
      })

      if (recipientHolding) {
        await tx.creditHolding.update({
          where: {
            orgId_batchId: {
              orgId: data.toOrgId,
              batchId: data.batchId,
            },
          },
          data: {
            quantity: recipientHolding.quantity + data.quantity,
          },
        })
      } else {
        await tx.creditHolding.create({
          data: {
            orgId: data.toOrgId,
            batchId: data.batchId,
            quantity: data.quantity,
          },
        })
      }

      // Create transfer record
      const transfer = await tx.transfer.create({
        data: {
          fromOrgId,
          toOrgId: data.toOrgId,
          batchId: data.batchId,
          quantity: data.quantity,
        },
        include: {
          fromOrg: true,
          toOrg: true,
          batch: {
            include: {
              project: true,
            },
          },
        },
      })

      return transfer
    })

    // Audit log
    await prisma.auditEvent.create({
      data: {
        actorUserId: authRequest.user.id,
        actorRole: authRequest.user.role,
        entityType: 'Transfer',
        entityId: result.id,
        action: 'CREATE',
        afterJson: result,
      },
    })

    return result
  })

  // Retire credits
  fastify.post('/retire', {
    preHandler: [authenticate, requireRole([Role.ADMIN, Role.ISSUER])],
    schema: {
      body: retireCreditsSchema,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const data = request.body as z.infer<typeof retireCreditsSchema>

    const orgId = authRequest.user.orgId

    if (!orgId) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Organization is required', 400)
    }

    // Validate credit batch exists
    const batch = await prisma.creditBatch.findUnique({
      where: { id: data.batchId },
      include: {
        project: true,
      },
    })

    if (!batch) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Credit batch not found', 404)
    }

    // Check if organization has sufficient credits
    const holding = await prisma.creditHolding.findUnique({
      where: {
        orgId_batchId: {
          orgId,
          batchId: data.batchId,
        },
      },
    })

    if (!holding || holding.quantity < data.quantity) {
      throw new AppError(ErrorCodes.INSUFFICIENT_CREDITS, 'Insufficient credits', 400)
    }

    // Check if retirement would exceed total issued
    const totalRetired = batch.totalRetired + data.quantity
    if (totalRetired > batch.totalIssued) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Retirement would exceed total issued credits', 400)
    }

    // Perform retirement in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update holding
      await tx.creditHolding.update({
        where: {
          orgId_batchId: {
            orgId,
            batchId: data.batchId,
          },
        },
        data: {
          quantity: holding.quantity - data.quantity,
        },
      })

      // Update batch total retired
      await tx.creditBatch.update({
        where: { id: data.batchId },
        data: {
          totalRetired: batch.totalRetired + data.quantity,
        },
      })

      // Create retirement record
      const certificateId = `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const retirement = await tx.retirement.create({
        data: {
          orgId,
          batchId: data.batchId,
          quantity: data.quantity,
          purpose: data.purpose,
          beneficiary: data.beneficiary,
          certificateId,
        },
        include: {
          organization: true,
          batch: {
            include: {
              project: true,
            },
          },
        },
      })

      return retirement
    })

    // Audit log
    await prisma.auditEvent.create({
      data: {
        actorUserId: authRequest.user.id,
        actorRole: authRequest.user.role,
        entityType: 'Retirement',
        entityId: result.id,
        action: 'CREATE',
        afterJson: result,
      },
    })

    return result
  })
}
