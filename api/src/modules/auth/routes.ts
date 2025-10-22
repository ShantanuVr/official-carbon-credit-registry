import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../../index'
import { AppError, ErrorCodes } from '../../lib/errors'
import { logger } from '../../lib/logger'
import { authenticate } from '../../lib/auth'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const refreshSchema = z.object({
  refreshToken: z.string(),
})

export async function authRoutes(fastify: FastifyInstance) {
  // Login
  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
                orgId: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as z.infer<typeof loginSchema>

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    })

    if (!user || !await bcrypt.compare(password, user.password)) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid credentials', 401)
    }

    const accessToken = fastify.jwt.sign(
      { userId: user.id, role: user.role },
      { expiresIn: '1h' }
    )

    const refreshToken = fastify.jwt.sign(
      { userId: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    )

    logger.info({
      userId: user.id,
      email: user.email,
      role: user.role,
      action: 'login',
    }, 'User logged in')

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.orgId,
      },
    }
  })

  // Refresh token
  fastify.post('/refresh', {
    schema: {
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = request.body as z.infer<typeof refreshSchema>

    try {
      const decoded = fastify.jwt.verify(refreshToken) as any
      
      if (decoded.type !== 'refresh') {
        throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid refresh token', 401)
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      })

      if (!user) {
        throw new AppError(ErrorCodes.UNAUTHORIZED, 'User not found', 401)
      }

      const accessToken = fastify.jwt.sign(
        { userId: user.id, role: user.role },
        { expiresIn: '1h' }
      )

      return { accessToken }
    } catch (error) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid refresh token', 401)
    }
  })

  // Logout
  fastify.post('/logout', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as any
    
    logger.info({
      userId: authRequest.user.id,
      action: 'logout',
    }, 'User logged out')

    return { message: 'Logged out successfully' }
  })

  // Get current user
  fastify.get('/me', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as any
    
    const user = await prisma.user.findUnique({
      where: { id: authRequest.user.id },
      include: { organization: true },
    })

    if (!user) {
      throw new AppError(ErrorCodes.USER_NOT_FOUND, 'User not found', 404)
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.orgId,
      organization: user.organization,
    }
  })
}
