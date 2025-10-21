import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../index'
import { AppError, ErrorCodes } from '../../lib/errors'
import { authenticate, requireRole, AuthenticatedRequest } from '../../lib/auth'
import { Role, IssuanceStatus } from '@prisma/client'
import { SerialAllocator } from '../../lib/serial-allocator'

const createIssuanceSchema = z.object({
  projectId: z.string(),
  vintageStart: z.number().int().min(2000).max(2100),
  vintageEnd: z.number().int().min(2000).max(2100),
  quantity: z.number().int().positive(),
  factorRef: z.string().min(1),
  evidenceIds: z.array(z.string()),
})

const requestChangesSchema = z.object({
  message: z.string().min(1),
})

const approveIssuanceSchema = z.object({
  message: z.string().optional(),
})

const finalizeIssuanceSchema = z.object({
  message: z.string().optional(),
})

export async function issuanceRoutes(fastify: FastifyInstance) {
  const serialAllocator = new SerialAllocator(prisma)
  // Create issuance request
  fastify.post('/', {
    preHandler: [authenticate, requireRole([Role.ADMIN, Role.ISSUER])],
    schema: {
      body: createIssuanceSchema,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const data = request.body as z.infer<typeof createIssuanceSchema>

    // Validate project exists and is approved
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
    })

    if (!project) {
      throw new AppError(ErrorCodes.PROJECT_NOT_FOUND, 'Project not found', 404)
    }

    if (project.status !== 'APPROVED' && project.status !== 'ACTIVE') {
      throw new AppError(ErrorCodes.INVALID_STATE_TRANSITION, 'Project must be approved to create issuance', 400)
    }

    // Check organization access for issuers
    if (authRequest.user.role === Role.ISSUER && project.orgId !== authRequest.user.orgId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403)
    }

    // Validate evidence files exist
    const evidenceFiles = await prisma.evidenceFile.findMany({
      where: {
        id: { in: data.evidenceIds },
        projectId: data.projectId,
      },
    })

    if (evidenceFiles.length !== data.evidenceIds.length) {
      throw new AppError(ErrorCodes.EVIDENCE_NOT_FOUND, 'Some evidence files not found', 400)
    }

    const issuance = await prisma.issuanceRequest.create({
      data: {
        ...data,
        status: IssuanceStatus.DRAFT,
      },
      include: {
        project: {
          include: {
            organization: true,
          },
        },
      },
    })

    // Audit log
    await prisma.auditEvent.create({
      data: {
        actorUserId: authRequest.user.id,
        actorRole: authRequest.user.role,
        entityType: 'IssuanceRequest',
        entityId: issuance.id,
        action: 'CREATE',
        afterJson: issuance,
      },
    })

    return issuance
  })

  // Get issuances with pagination and filtering
  fastify.get('/', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const query = request.query as any

    const page = parseInt(query.page) || 1
    const limit = Math.min(parseInt(query.limit) || 20, 100)
    const skip = (page - 1) * limit

    const where: any = {}

    // Filter by status
    if (query.status) {
      where.status = query.status
    }

    // Filter by organization for issuers
    if (authRequest.user.role === Role.ISSUER && authRequest.user.orgId) {
      where.project = {
        orgId: authRequest.user.orgId,
      }
    }

    const [issuances, total] = await Promise.all([
      prisma.issuanceRequest.findMany({
        where,
        skip,
        take: limit,
        include: {
          project: {
            include: {
              organization: true,
            },
          },
          creditBatch: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.issuanceRequest.count({ where }),
    ])

    return {
      issuances,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  })

  // Get single issuance
  fastify.get('/:id', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const params = request.params as { id: string }

    const issuance = await prisma.issuanceRequest.findUnique({
      where: { id: params.id },
      include: {
        project: {
          include: {
            organization: true,
            evidenceFiles: true,
          },
        },
        creditBatch: {
          include: {
            holdings: {
              include: {
                organization: true,
              },
            },
          },
        },
        auditEvents: {
          include: {
            actor: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!issuance) {
      throw new AppError(ErrorCodes.ISSUANCE_NOT_FOUND, 'Issuance not found', 404)
    }

    // Check access permissions
    if (authRequest.user.role === Role.ISSUER && issuance.project.orgId !== authRequest.user.orgId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403)
    }

    return issuance
  })

  // Submit issuance for review
  fastify.post('/:id/submit', {
    preHandler: [authenticate, requireRole([Role.ADMIN, Role.ISSUER])],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const params = request.params as { id: string }

    const issuance = await prisma.issuanceRequest.findUnique({
      where: { id: params.id },
    })

    if (!issuance) {
      throw new AppError(ErrorCodes.ISSUANCE_NOT_FOUND, 'Issuance not found', 404)
    }

    if (issuance.status !== IssuanceStatus.DRAFT) {
      throw new AppError(ErrorCodes.INVALID_STATE_TRANSITION, 'Issuance must be in DRAFT status to submit', 400)
    }

    const updatedIssuance = await prisma.issuanceRequest.update({
      where: { id: params.id },
      data: { status: IssuanceStatus.UNDER_REVIEW },
      include: {
        project: {
          include: {
            organization: true,
          },
        },
      },
    })

    // Audit log
    await prisma.auditEvent.create({
      data: {
        actorUserId: authRequest.user.id,
        actorRole: authRequest.user.role,
        entityType: 'IssuanceRequest',
        entityId: updatedIssuance.id,
        action: 'SUBMIT',
        beforeJson: issuance,
        afterJson: updatedIssuance,
      },
    })

    return updatedIssuance
  })

  // Request changes
  fastify.post('/:id/request-changes', {
    preHandler: [authenticate, requireRole([Role.ADMIN, Role.VERIFIER])],
    schema: {
      body: requestChangesSchema,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const params = request.params as { id: string }
    const data = request.body as z.infer<typeof requestChangesSchema>

    const issuance = await prisma.issuanceRequest.findUnique({
      where: { id: params.id },
    })

    if (!issuance) {
      throw new AppError(ErrorCodes.ISSUANCE_NOT_FOUND, 'Issuance not found', 404)
    }

    if (issuance.status !== IssuanceStatus.UNDER_REVIEW) {
      throw new AppError(ErrorCodes.INVALID_STATE_TRANSITION, 'Issuance must be under review to request changes', 400)
    }

    const updatedIssuance = await prisma.issuanceRequest.update({
      where: { id: params.id },
      data: { status: IssuanceStatus.NEEDS_CHANGES },
      include: {
        project: {
          include: {
            organization: true,
          },
        },
      },
    })

    // Audit log
    await prisma.auditEvent.create({
      data: {
        actorUserId: authRequest.user.id,
        actorRole: authRequest.user.role,
        entityType: 'IssuanceRequest',
        entityId: updatedIssuance.id,
        action: 'REQUEST_CHANGES',
        beforeJson: issuance,
        afterJson: updatedIssuance,
      },
    })

    return updatedIssuance
  })

  // Approve issuance
  fastify.post('/:id/approve', {
    preHandler: [authenticate, requireRole([Role.ADMIN, Role.VERIFIER])],
    schema: {
      body: approveIssuanceSchema,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const params = request.params as { id: string }
    const data = request.body as z.infer<typeof approveIssuanceSchema>

    const issuance = await prisma.issuanceRequest.findUnique({
      where: { id: params.id },
    })

    if (!issuance) {
      throw new AppError(ErrorCodes.ISSUANCE_NOT_FOUND, 'Issuance not found', 404)
    }

    if (issuance.status !== IssuanceStatus.UNDER_REVIEW) {
      throw new AppError(ErrorCodes.INVALID_STATE_TRANSITION, 'Issuance must be under review to approve', 400)
    }

    const updatedIssuance = await prisma.issuanceRequest.update({
      where: { id: params.id },
      data: { status: IssuanceStatus.APPROVED },
      include: {
        project: {
          include: {
            organization: true,
          },
        },
      },
    })

    // Audit log
    await prisma.auditEvent.create({
      data: {
        actorUserId: authRequest.user.id,
        actorRole: authRequest.user.role,
        entityType: 'IssuanceRequest',
        entityId: updatedIssuance.id,
        action: 'APPROVE',
        beforeJson: issuance,
        afterJson: updatedIssuance,
      },
    })

    return updatedIssuance
  })

  // Finalize issuance (Admin only) - creates credit batch and serial ranges
  fastify.post('/:id/finalize', {
    preHandler: [authenticate, requireRole([Role.ADMIN])],
    schema: {
      body: finalizeIssuanceSchema,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const params = request.params as { id: string }
    const data = request.body as z.infer<typeof finalizeIssuanceSchema>

    const issuance = await prisma.issuanceRequest.findUnique({
      where: { id: params.id },
      include: {
        project: true,
      },
    })

    if (!issuance) {
      throw new AppError(ErrorCodes.ISSUANCE_NOT_FOUND, 'Issuance not found', 404)
    }

    if (issuance.status !== IssuanceStatus.APPROVED) {
      throw new AppError(ErrorCodes.INVALID_STATE_TRANSITION, 'Issuance must be approved to finalize', 400)
    }

    // Mock adapter call (in real implementation, this would call the registry adapter)
    const adapterResponse = {
      adapterTxId: `tx_${Date.now()}`,
      onchainHash: `0x${Math.random().toString(16).substr(2, 64)}`,
    }

    // Perform finalization in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create credit batch with serial range
      const creditBatch = await tx.creditBatch.create({
        data: {
          projectId: issuance.projectId,
          issuanceId: issuance.id,
          vintageStart: issuance.vintageStart,
          vintageEnd: issuance.vintageEnd,
          totalIssued: issuance.quantity,
          classId: `class_${issuance.projectId}_${issuance.vintageStart}_${issuance.vintageEnd}`,
          serialStart: 1,
          serialEnd: issuance.quantity,
        },
      })

      // Create initial holding for the project organization
      await tx.creditHolding.create({
        data: {
          orgId: issuance.project.orgId,
          batchId: creditBatch.id,
          quantity: issuance.quantity,
        },
      })

      // Create initial serial range for the issuer
      await serialAllocator.createInitialSerialRange(
        creditBatch.id,
        issuance.project.orgId,
        issuance.quantity
      )

      // Update issuance with adapter response and finalize
      const updatedIssuance = await tx.issuanceRequest.update({
        where: { id: params.id },
        data: {
          status: IssuanceStatus.FINALIZED,
          adapterTxId: adapterResponse.adapterTxId,
          onchainHash: adapterResponse.onchainHash,
        },
        include: {
          project: {
            include: {
              organization: true,
            },
          },
          creditBatch: true,
        },
      })

      return { updatedIssuance, creditBatch }
    })

    // Audit log
    await prisma.auditEvent.create({
      data: {
        actorUserId: authRequest.user.id,
        actorRole: authRequest.user.role,
        entityType: 'IssuanceRequest',
        entityId: result.updatedIssuance.id,
        action: 'FINALIZE',
        beforeJson: issuance,
        afterJson: result.updatedIssuance,
      },
    })

    return {
      ...result.updatedIssuance,
      adapterResponse,
      serialRange: {
        startSerial: 1,
        endSerial: issuance.quantity,
        formatted: serialAllocator.formatSerialRange(1, issuance.quantity),
        humanReadable: serialAllocator.generateHumanReadableSerial(
          issuance.project.title.replace(/\s+/g, '').substring(0, 8).toUpperCase(),
          issuance.vintageStart,
          issuance.vintageEnd,
          result.creditBatch.id,
          1,
          issuance.quantity
        ),
      },
    }
  })
}
