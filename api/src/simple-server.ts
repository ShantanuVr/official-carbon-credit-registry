import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import { PrismaClient } from '@prisma/client'
import { config } from './lib/config'
import { logger } from './lib/logger'
import path from 'path'
import bcrypt from 'bcryptjs'

// Initialize Prisma
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

// Create Fastify instance
const fastify = Fastify({
  logger: logger,
  trustProxy: true,
})

// Register plugins
async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: config.cors.origin,
    credentials: true,
  })

  // JWT
  await fastify.register(jwt, {
    secret: config.jwt.secret,
    sign: {
      expiresIn: config.jwt.expiresIn,
    },
  })

  // Multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  })

  // Static files for certificates
  await fastify.register(staticFiles, {
    root: path.join(process.cwd(), 'public'),
    prefix: '/public',
  })
}

// Register routes
async function registerRoutes() {
  // Health check
  fastify.get('/health', async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return { status: 'healthy', timestamp: new Date().toISOString() }
    } catch (error) {
      reply.code(503)
      return { status: 'unhealthy', error: 'Database connection failed' }
    }
  })

  fastify.get('/ready', async (request, reply) => {
    return { status: 'ready', timestamp: new Date().toISOString() }
  })

  // Basic auth routes
  fastify.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    })

    if (!user || !await bcrypt.compare(password, user.password)) {
      reply.code(401)
      return { error: 'Invalid credentials' }
    }

    const accessToken = fastify.jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      { expiresIn: '15m' }
    )

    const refreshToken = fastify.jwt.sign(
      { userId: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    )

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

  // Projects routes
  fastify.get('/projects', async (request, reply) => {
    const projects = await prisma.project.findMany({
      include: {
        organization: true,
        creditBatches: true,
      },
    })

    return projects
  })

  fastify.get('/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        organization: true,
        creditBatches: true,
        evidenceFiles: true,
      },
    })

    if (!project) {
      reply.code(404)
      return { error: 'Project not found' }
    }

    return project
  })

  // Credits routes
  fastify.get('/credits/holdings', async (request, reply) => {
    const holdings = await prisma.creditHolding.findMany({
      include: {
        organization: true,
        batch: {
          include: {
            project: true,
          },
        },
      },
    })

    return holdings
  })

  // Issuances routes
  fastify.get('/issuances', async (request, reply) => {
    const issuances = await prisma.issuanceRequest.findMany({
      include: {
        project: {
          include: {
            organization: true,
          },
        },
      },
    })
    return issuances
  })

  fastify.post('/issuances', async (request, reply) => {
    const { projectId, requestedCredits, vintageStart, vintageEnd } = request.body as any
    
    const issuance = await prisma.issuanceRequest.create({
      data: {
        projectId,
        requestedCredits,
        vintageStart: new Date(vintageStart),
        vintageEnd: new Date(vintageEnd),
        status: 'PENDING',
      },
      include: {
        project: {
          include: {
            organization: true,
          },
        },
      },
    })
    
    return issuance
  })

  fastify.post('/issuances/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const issuance = await prisma.issuanceRequest.update({
      where: { id },
      data: { status: 'FINALIZED' },
      include: {
        project: true,
      },
    })
    
    // Create credit batch
    const creditBatch = await prisma.creditBatch.create({
      data: {
        projectId: issuance.projectId,
        issuanceId: issuance.id,
        vintageStart: issuance.vintageStart,
        vintageEnd: issuance.vintageEnd,
        totalIssued: issuance.requestedCredits,
        totalRetired: 0,
        serialStart: 1,
        serialEnd: issuance.requestedCredits,
      },
    })
    
    return { issuance, creditBatch }
  })

  fastify.post('/issuances/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const issuance = await prisma.issuanceRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    })
    
    return issuance
  })

  // Project review endpoint
  fastify.post('/projects/:id/review', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { decision, comment } = request.body as any
    
    const project = await prisma.project.update({
      where: { id },
      data: { 
        status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      },
    })
    
    return project
  })
}

// Start server
async function start() {
  try {
    await registerPlugins()
    await registerRoutes()
    
    const address = await fastify.listen({
      port: config.server.port,
      host: config.server.host,
    })
    
    logger.info(`Server listening at ${address}`)
  } catch (err) {
    logger.error(err)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...')
  await prisma.$disconnect()
  await fastify.close()
  process.exit(0)
})

start()
