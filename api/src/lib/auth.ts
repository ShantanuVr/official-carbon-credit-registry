import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../index'
import { Role } from '@prisma/client'

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
    const token = request.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided',
        },
      })
      return
    }

    const decoded = request.server.jwt.verify(token) as any
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { organization: true },
    })

    if (!user) {
      reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token',
        },
      })
      return
    }

    ;(request as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
    }
  } catch (error) {
    reply.code(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid token',
      },
    })
  }
}

export function requireRole(roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    
    if (!authRequest.user) {
      reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      })
      return
    }

    if (!roles.includes(authRequest.user.role)) {
      reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      })
      return
    }
  }
}

export function requireOrgAccess() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest
    
    if (!authRequest.user) {
      reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      })
      return
    }

    // Admin and Verifier can access any organization
    if (authRequest.user.role === 'ADMIN' || authRequest.user.role === 'VERIFIER') {
      return
    }

    // Issuer can only access their own organization
    if (authRequest.user.role === 'ISSUER' && !authRequest.user.orgId) {
      reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Organization access required',
        },
      })
      return
    }
  }
}
