import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../index'
import { AppError, ErrorCodes } from '../../lib/errors'
import { authenticate, requireRole, AuthenticatedRequest } from '../../lib/auth'
import { Role } from '@prisma/client'

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.nativeEnum(Role),
  orgId: z.string().optional(),
  password: z.string().min(8),
})

const updateUserSchema = createUserSchema.partial().omit({ password: true })

const createOrganizationSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
})

export async function adminRoutes(fastify: FastifyInstance) {
  // Get all users
  fastify.get('/users', {
    preHandler: [authenticate, requireRole([Role.ADMIN])],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const users = await prisma.user.findMany({
      include: {
        organization: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.orgId,
      organization: user.organization,
      totpEnabled: user.totpEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }))
  })

  // Create user
  fastify.post('/users', {
    preHandler: [authenticate, requireRole([Role.ADMIN])],
    schema: {
      body: {
        type: 'object',
        required: ['email', 'name', 'role', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          name: { type: 'string', minLength: 1 },
          role: { type: 'string', enum: ['ADMIN', 'VERIFIER', 'ISSUER', 'VIEWER'] },
          orgId: { type: 'string' },
          password: { type: 'string', minLength: 8 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const data = request.body as z.infer<typeof createUserSchema>

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      throw new AppError(ErrorCodes.CONFLICT, 'User with this email already exists', 409)
    }

    // Hash password
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(data.password, 12)

    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      include: {
        organization: true,
      },
    })

    // Audit log
    await prisma.auditEvent.create({
      data: {
        actorUserId: authRequest.user.id,
        actorRole: authRequest.user.role,
        entityType: 'User',
        entityId: user.id,
        action: 'CREATE',
        afterJson: user,
      },
    })

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.orgId,
      organization: user.organization,
      createdAt: user.createdAt,
    }
  })

  // Update user
  fastify.patch('/users/:id', {
    preHandler: [authenticate, requireRole([Role.ADMIN])],
    schema: {
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          name: { type: 'string', minLength: 1 },
          role: { type: 'string', enum: ['ADMIN', 'VERIFIER', 'ISSUER', 'VIEWER'] },
          orgId: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const params = request.params as { id: string }
    const data = request.body as z.infer<typeof updateUserSchema>

    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!existingUser) {
      throw new AppError(ErrorCodes.USER_NOT_FOUND, 'User not found', 404)
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data,
      include: {
        organization: true,
      },
    })

    // Audit log
    await prisma.auditEvent.create({
      data: {
        actorUserId: authRequest.user.id,
        actorRole: authRequest.user.role,
        entityType: 'User',
        entityId: updatedUser.id,
        action: 'UPDATE',
        beforeJson: existingUser,
        afterJson: updatedUser,
      },
    })

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      orgId: updatedUser.orgId,
      organization: updatedUser.organization,
      updatedAt: updatedUser.updatedAt,
    }
  })

  // Get all organizations
  fastify.get('/organizations', {
    preHandler: [authenticate, requireRole([Role.ADMIN])],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return organizations
  })

  // Create organization
  fastify.post('/organizations', {
    preHandler: [authenticate, requireRole([Role.ADMIN])],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'type'],
        properties: {
          name: { type: 'string', minLength: 1 },
          type: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const data = request.body as z.infer<typeof createOrganizationSchema>

    const organization = await prisma.organization.create({
      data,
    })

    // Audit log
    await prisma.auditEvent.create({
      data: {
        actorUserId: authRequest.user.id,
        actorRole: authRequest.user.role,
        entityType: 'Organization',
        entityId: organization.id,
        action: 'CREATE',
        afterJson: organization,
      },
    })

    return organization
  })

  // Get final approval queue
  fastify.get('/approvals', {
    preHandler: [authenticate, requireRole([Role.ADMIN])],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const [approvedProjects, approvedIssuances] = await Promise.all([
      prisma.project.findMany({
        where: { status: 'APPROVED' },
        include: {
          organization: true,
          evidenceFiles: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.issuanceRequest.findMany({
        where: { status: 'APPROVED' },
        include: {
          project: {
            include: {
              organization: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ])

    return {
      projects: approvedProjects,
      issuances: approvedIssuances,
    }
  })

  // Activate approved project
  fastify.post('/projects/:id/activate', {
    preHandler: [authenticate, requireRole([Role.ADMIN])],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const params = request.params as { id: string }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
    })

    if (!project) {
      throw new AppError(ErrorCodes.PROJECT_NOT_FOUND, 'Project not found', 404)
    }

    if (project.status !== 'APPROVED') {
      throw new AppError(ErrorCodes.INVALID_STATE_TRANSITION, 'Project must be approved to activate', 400)
    }

    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: { status: 'ACTIVE' },
      include: {
        organization: true,
      },
    })

    // Audit log
    await prisma.auditEvent.create({
      data: {
        actorUserId: authRequest.user.id,
        actorRole: authRequest.user.role,
        entityType: 'Project',
        entityId: updatedProject.id,
        action: 'ACTIVATE',
        beforeJson: project,
        afterJson: updatedProject,
      },
    })

    return updatedProject
  })
}
