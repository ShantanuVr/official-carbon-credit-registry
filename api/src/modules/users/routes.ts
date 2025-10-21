import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../index'
import { authenticate, AuthenticatedRequest } from '../../lib/auth'

export async function userRoutes(fastify: FastifyInstance) {
  // Get current user profile
  fastify.get('/profile', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    
    const user = await prisma.user.findUnique({
      where: { id: authRequest.user.id },
      include: {
        organization: true,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.orgId,
      organization: user.organization,
      totpEnabled: user.totpEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  })

  // Update user profile
  fastify.patch('/profile', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    const data = request.body as any

    const allowedFields = ['name']
    const updateData: any = {}

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field]
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: authRequest.user.id },
      data: updateData,
      include: {
        organization: true,
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
}
