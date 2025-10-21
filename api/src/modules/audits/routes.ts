import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../index'
import { AppError, ErrorCodes } from '../../lib/errors'
import { authenticate, AuthenticatedRequest } from '../../lib/auth'

export async function auditRoutes(fastify: FastifyInstance) {
  // Get audit events with filtering
  fastify.get('/', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const query = request.query as any

    const page = parseInt(query.page) || 1
    const limit = Math.min(parseInt(query.limit) || 50, 100)
    const skip = (page - 1) * limit

    const where: any = {}

    // Filter by entity type
    if (query.entityType) {
      where.entityType = query.entityType
    }

    // Filter by entity ID
    if (query.entityId) {
      where.entityId = query.entityId
    }

    // Filter by actor
    if (query.actor) {
      where.actorUserId = query.actor
    }

    // Filter by action
    if (query.action) {
      where.action = query.action
    }

    const [auditEvents, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        skip,
        take: limit,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditEvent.count({ where }),
    ])

    return {
      auditEvents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  })

  // Get audit events for a specific entity
  fastify.get('/entity/:entityType/:entityId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const params = request.params as { entityType: string; entityId: string }

    const auditEvents = await prisma.auditEvent.findMany({
      where: {
        entityType: params.entityType,
        entityId: params.entityId,
      },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return auditEvents
  })
}
