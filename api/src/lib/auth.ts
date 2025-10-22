import { FastifyRequest, FastifyReply } from 'fastify'
import { Role } from '@prisma/client'
import { prisma } from '../index'

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string
    email: string
    role: Role
    orgId?: string
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const decoded = await request.jwtVerify()
    
    // Fetch user details from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { organization: true },
    })

    if (!user) {
      reply.code(401).send({ error: 'User not found' })
      return
    }

    // Attach user to request
    ;(request as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
    }
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}

export function requireRole(allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    if (!authRequest.user || !allowedRoles.includes(authRequest.user.role)) {
      reply.code(403).send({ error: 'Forbidden' })
    }
  }
}

export function requireOrgAccess(orgId: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    if (!authRequest.user || 
        (authRequest.user.role !== Role.ADMIN && authRequest.user.orgId !== orgId)) {
      reply.code(403).send({ error: 'Forbidden' })
    }
  }
}