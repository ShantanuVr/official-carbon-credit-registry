import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../index'
import { AppError, ErrorCodes } from '../../lib/errors'
import { authenticate, requireRole, requireOrgAccess, AuthenticatedRequest } from '../../lib/auth'
import { Role, ProjectStatus } from '@prisma/client'

const createProjectSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  country: z.string().min(1),
  region: z.string().min(1),
  methodology: z.string().min(1),
  baselineRef: z.string().optional(),
})

const updateProjectSchema = createProjectSchema.partial()

const submitProjectSchema = z.object({
  message: z.string().optional(),
})

const requestChangesSchema = z.object({
  message: z.string().min(1),
})

const approveProjectSchema = z.object({
  message: z.string().optional(),
})

export async function projectRoutes(fastify: FastifyInstance) {
  // Create project
  fastify.post('/', {
    preHandler: [authenticate, requireRole([Role.ADMIN, Role.ISSUER])],
    schema: {
      body: {
        type: 'object',
        required: ['title', 'description', 'country', 'region', 'methodology'],
        properties: {
          title: { type: 'string', minLength: 1 },
          description: { type: 'string', minLength: 1 },
          country: { type: 'string', minLength: 1 },
          region: { type: 'string', minLength: 1 },
          methodology: { type: 'string', minLength: 1 },
          baselineRef: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const data = request.body as z.infer<typeof createProjectSchema>

    const project = await prisma.project.create({
      data: {
        ...data,
        orgId: authRequest.user.orgId!,
        status: ProjectStatus.DRAFT,
      },
      include: {
        organization: true,
        evidenceFiles: true,
      },
    })

    // Audit log
    await prisma.auditEvent.create({
      data: {
        actorUserId: authRequest.user.id,
        actorRole: authRequest.user.role,
        entityType: 'Project',
        entityId: project.id,
        action: 'CREATE',
        afterJson: project,
      },
    })

    return project
  })

  // Get projects with pagination and filtering
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
      where.orgId = authRequest.user.orgId
    }

    // Search by title or description
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ]
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        include: {
          organization: true,
          evidenceFiles: true,
          creditBatches: true,
          _count: {
            select: {
              issuanceRequests: true,
              creditBatches: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.count({ where }),
    ])

    return {
      authority: "credit",
      projects: projects.map(project => ({
        ...project,
        tokenization: {
          status: "NOT_REQUESTED"
        }
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  })

  // Get single project
  fastify.get('/:id', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const params = request.params as { id: string }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        organization: true,
        evidenceFiles: true,
        issuanceRequests: {
          include: {
            creditBatch: true,
          },
        },
        creditBatches: {
          include: {
            holdings: {
              include: {
                organization: true,
              },
            },
            transfers: true,
            retirements: true,
          },
        },
      },
    })

    if (!project) {
      throw new AppError(ErrorCodes.PROJECT_NOT_FOUND, 'Project not found', 404)
    }

    // Check access permissions
    if (authRequest.user.role === Role.ISSUER && project.orgId !== authRequest.user.orgId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403)
    }

    return {
      authority: "credit",
      ...project,
      tokenization: {
        status: "NOT_REQUESTED"
      }
    }
  })

  // Update project
  fastify.patch('/:id', {
    preHandler: [authenticate, requireRole([Role.ADMIN, Role.ISSUER])],
    schema: {
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1 },
          description: { type: 'string', minLength: 1 },
          country: { type: 'string', minLength: 1 },
          region: { type: 'string', minLength: 1 },
          methodology: { type: 'string', minLength: 1 },
          baselineRef: { type: 'string' },
          status: { type: 'string', enum: ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'NEEDS_CHANGES'] },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const params = request.params as { id: string }
    const data = request.body as z.infer<typeof updateProjectSchema>

    const existingProject = await prisma.project.findUnique({
      where: { id: params.id },
    })

    if (!existingProject) {
      throw new AppError(ErrorCodes.PROJECT_NOT_FOUND, 'Project not found', 404)
    }

    // Check permissions
    if (authRequest.user.role === Role.ISSUER) {
      if (existingProject.orgId !== authRequest.user.orgId) {
        throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403)
      }
      if (existingProject.status !== ProjectStatus.DRAFT) {
        throw new AppError(ErrorCodes.INVALID_STATE_TRANSITION, 'Project cannot be modified in current state', 400)
      }
      // Issuers cannot change status
      if (data.status) {
        delete data.status
      }
    } else if (authRequest.user.role === Role.ADMIN) {
      // Admins can update any project and change status
      // No additional restrictions
    }

    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data,
      include: {
        organization: true,
        evidenceFiles: true,
      },
    })

    // Audit log
    await prisma.auditEvent.create({
      data: {
        actorUserId: authRequest.user.id,
        actorRole: authRequest.user.role,
        entityType: 'Project',
        entityId: updatedProject.id,
        action: 'UPDATE',
        beforeJson: existingProject,
        afterJson: updatedProject,
      },
    })

    return updatedProject
  })

  // Submit project for review
  fastify.post('/:id/submit', {
    preHandler: [authenticate, requireRole([Role.ADMIN, Role.ISSUER])],
    schema: {
      body: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const params = request.params as { id: string }
    const data = request.body as z.infer<typeof submitProjectSchema>

    const project = await prisma.project.findUnique({
      where: { id: params.id },
    })

    if (!project) {
      throw new AppError(ErrorCodes.PROJECT_NOT_FOUND, 'Project not found', 404)
    }

    // Allow submission from DRAFT or NEEDS_CHANGES status
    if (project.status !== ProjectStatus.DRAFT && project.status !== ProjectStatus.NEEDS_CHANGES) {
      throw new AppError(ErrorCodes.INVALID_STATE_TRANSITION, 'Project must be in DRAFT or NEEDS_CHANGES status to submit', 400)
    }

    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: { 
        status: ProjectStatus.UNDER_REVIEW,
        feedback: null, // Clear feedback when resubmitting
        feedbackBy: null,
        feedbackAt: null,
      },
      include: {
        organization: true,
        evidenceFiles: true,
      },
    })

    // Audit log
    await prisma.auditEvent.create({
      data: {
        actorUserId: authRequest.user.id,
        actorRole: authRequest.user.role,
        entityType: 'Project',
        entityId: updatedProject.id,
        action: 'SUBMIT',
        beforeJson: project,
        afterJson: updatedProject,
      },
    })

    return updatedProject
  })

  // Request changes
  fastify.post('/:id/request-changes', {
    preHandler: [authenticate, requireRole([Role.ADMIN, Role.VERIFIER])],
    schema: {
      body: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const params = request.params as { id: string }
    const data = request.body as z.infer<typeof requestChangesSchema>

    const project = await prisma.project.findUnique({
      where: { id: params.id },
    })

    if (!project) {
      throw new AppError(ErrorCodes.PROJECT_NOT_FOUND, 'Project not found', 404)
    }

    if (project.status !== ProjectStatus.UNDER_REVIEW) {
      throw new AppError(ErrorCodes.INVALID_STATE_TRANSITION, 'Project must be under review to request changes', 400)
    }

    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: { 
        status: ProjectStatus.NEEDS_CHANGES,
        feedback: data.message,
        feedbackBy: authRequest.user.id,
        feedbackAt: new Date(),
      },
      include: {
        organization: true,
        evidenceFiles: true,
      },
    })

    // Audit log
    await prisma.auditEvent.create({
      data: {
        actorUserId: authRequest.user.id,
        actorRole: authRequest.user.role,
        entityType: 'Project',
        entityId: updatedProject.id,
        action: 'REQUEST_CHANGES',
        beforeJson: project,
        afterJson: updatedProject,
      },
    })

    return updatedProject
  })

  // Approve project
  fastify.post('/:id/approve', {
    preHandler: [authenticate, requireRole([Role.ADMIN, Role.VERIFIER])],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const params = request.params as { id: string }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
    })

    if (!project) {
      throw new AppError(ErrorCodes.PROJECT_NOT_FOUND, 'Project not found', 404)
    }

    if (project.status !== ProjectStatus.UNDER_REVIEW) {
      throw new AppError(ErrorCodes.INVALID_STATE_TRANSITION, 'Project must be under review to approve', 400)
    }

    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: { status: ProjectStatus.APPROVED },
      include: {
        organization: true,
        evidenceFiles: true,
      },
    })

    // Audit log
    await prisma.auditEvent.create({
      data: {
        actorUserId: authRequest.user.id,
        actorRole: authRequest.user.role,
        entityType: 'Project',
        entityId: updatedProject.id,
        action: 'APPROVE',
        beforeJson: project,
        afterJson: updatedProject,
      },
    })

    return updatedProject
  })

  // Delete project (only for DRAFT projects)
  fastify.delete('/:id', {
    preHandler: [authenticate, requireRole([Role.ADMIN, Role.ISSUER])],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const { id } = request.params as { id: string }

    const existingProject = await prisma.project.findUnique({
      where: { id },
      include: { organization: true }
    })

    if (!existingProject) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Project not found', 404)
    }

    // Check permissions
    if (authRequest.user.role === Role.ISSUER) {
      if (existingProject.orgId !== authRequest.user.orgId) {
        throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403)
      }
      if (existingProject.status !== ProjectStatus.DRAFT) {
        throw new AppError(ErrorCodes.INVALID_STATE_TRANSITION, 'Only draft projects can be deleted', 400)
      }
    } else if (authRequest.user.role === Role.ADMIN) {
      // Admins can delete any DRAFT project
      if (existingProject.status !== ProjectStatus.DRAFT) {
        throw new AppError(ErrorCodes.INVALID_STATE_TRANSITION, 'Only draft projects can be deleted', 400)
      }
    }

    // Delete the project
    await prisma.project.delete({
      where: { id }
    })

    // Audit log
    await prisma.auditEvent.create({
      data: {
        actorUserId: authRequest.user.id,
        actorRole: authRequest.user.role,
        entityType: 'Project',
        entityId: id,
        action: 'DELETE',
        beforeJson: existingProject,
        afterJson: null,
      },
    })

    return { message: 'Project deleted successfully' }
  })
}
