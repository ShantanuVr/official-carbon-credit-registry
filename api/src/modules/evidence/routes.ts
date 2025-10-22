import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../index'
import { AppError, ErrorCodes } from '../../lib/errors'
import { authenticate, requireRole, AuthenticatedRequest } from '../../lib/auth'
import { Role } from '@prisma/client'

const uploadEvidenceSchema = z.object({
  fileName: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  sha256: z.string().min(64),
  cid: z.string().optional(),
})

export async function evidenceRoutes(fastify: FastifyInstance) {
  // Upload evidence metadata
  fastify.post('/projects/:projectId/evidence', {
    preHandler: [authenticate, requireRole([Role.ADMIN, Role.ISSUER])],
    schema: {
      body: {
        type: 'object',
        required: ['fileName', 'sizeBytes', 'sha256'],
        properties: {
          fileName: { type: 'string', minLength: 1 },
          sizeBytes: { type: 'number', minimum: 1 },
          sha256: { type: 'string', minLength: 64 },
          cid: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const params = request.params as { projectId: string }
    const data = request.body as z.infer<typeof uploadEvidenceSchema>

    // Validate project exists and user has access
    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
    })

    if (!project) {
      throw new AppError(ErrorCodes.PROJECT_NOT_FOUND, 'Project not found', 404)
    }

    // Check permissions
    if (authRequest.user.role === Role.ISSUER && project.orgId !== authRequest.user.orgId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403)
    }

    const evidenceFile = await prisma.evidenceFile.create({
      data: {
        projectId: params.projectId,
        fileName: data.fileName,
        sizeBytes: data.sizeBytes,
        sha256: data.sha256,
        cid: data.cid,
        uploadedBy: authRequest.user.id,
      },
    })

    // Audit log
    await prisma.auditEvent.create({
      data: {
        actorUserId: authRequest.user.id,
        actorRole: authRequest.user.role,
        entityType: 'EvidenceFile',
        entityId: evidenceFile.id,
        action: 'CREATE',
        afterJson: evidenceFile,
      },
    })

    return evidenceFile
  })

  // Get evidence files for a project
  fastify.get('/projects/:projectId/evidence', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const params = request.params as { projectId: string }

    // Validate project exists and user has access
    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
    })

    if (!project) {
      throw new AppError(ErrorCodes.PROJECT_NOT_FOUND, 'Project not found', 404)
    }

    // Check permissions
    if (authRequest.user.role === Role.ISSUER && project.orgId !== authRequest.user.orgId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403)
    }

    const evidenceFiles = await prisma.evidenceFile.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: 'desc' },
    })

    return evidenceFiles
  })

  // Get single evidence file
  fastify.get('/:id', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const params = request.params as { id: string }

    const evidenceFile = await prisma.evidenceFile.findUnique({
      where: { id: params.id },
      include: {
        project: true,
      },
    })

    if (!evidenceFile) {
      throw new AppError(ErrorCodes.EVIDENCE_NOT_FOUND, 'Evidence file not found', 404)
    }

    // Check permissions
    if (authRequest.user.role === Role.ISSUER && evidenceFile.project.orgId !== authRequest.user.orgId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403)
    }

    return evidenceFile
  })
}
