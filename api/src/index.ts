import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import { PrismaClient } from '@prisma/client'
import { config } from './lib/config'
import { logger } from './lib/logger'
import { authRoutes } from './modules/auth/routes'
import { userRoutes } from './modules/users/routes'
import { projectRoutes } from './modules/projects/routes'
import { issuanceRoutes } from './modules/issuances/routes'
import { creditRoutes } from './modules/credits/routes'
import { transferRoutes } from './modules/transfers/routes'
import { retirementRoutes } from './modules/retirements/routes'
import { evidenceRoutes } from './modules/evidence/routes'
import { auditRoutes } from './modules/audits/routes'
import { reportRoutes } from './modules/reports/routes'
import { adminRoutes } from './modules/admin/routes'

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
    root: config.static.root,
    prefix: config.static.prefix,
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

  // Public stats endpoint
  fastify.get('/public/stats', async (request, reply) => {
    try {
      const projects = await prisma.project.findMany({
        include: {
          creditBatches: true
        }
      })

      const totalProjects = projects.length
      const totalCreditsIssued = projects.reduce((sum, project) => 
        sum + project.creditBatches.reduce((batchSum, batch) => batchSum + batch.totalIssued, 0), 0
      )
      const totalCreditsRetired = projects.reduce((sum, project) => 
        sum + project.creditBatches.reduce((batchSum, batch) => batchSum + batch.totalRetired, 0), 0
      )
      const activeProjects = projects.filter(project => 
        project.status === 'APPROVED'
      ).length

      return {
        totalProjects,
        totalCreditsIssued,
        totalCreditsRetired,
        activeProjects
      }
    } catch (error) {
      reply.code(500)
      return { error: 'Failed to fetch stats' }
    }
  })

  // Public projects endpoint
  fastify.get('/public/projects', async (request, reply) => {
    try {
      const projects = await prisma.project.findMany({
        where: {
          status: 'APPROVED' // Only show approved projects publicly
        },
        include: {
          organization: {
            select: {
              name: true,
              type: true
            }
          },
          creditBatches: {
            select: {
              totalIssued: true,
              totalRetired: true,
              vintageStart: true,
              vintageEnd: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return {
        projects: projects.map(project => ({
          id: project.id,
          title: project.title,
          description: project.description,
          country: project.country,
          region: project.region,
          methodology: project.methodology,
          status: project.status,
          organization: project.organization,
          creditsIssued: project.creditBatches.reduce((sum, batch) => sum + batch.totalIssued, 0),
          creditsRetired: project.creditBatches.reduce((sum, batch) => sum + batch.totalRetired, 0),
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        }))
      }
    } catch (error) {
      reply.code(500)
      return { error: 'Failed to fetch projects' }
    }
  })

  // API routes
  await fastify.register(authRoutes, { prefix: '/auth' })
  await fastify.register(userRoutes, { prefix: '/users' })
  await fastify.register(projectRoutes, { prefix: '/projects' })
  await fastify.register(issuanceRoutes, { prefix: '/issuances' })
  await fastify.register(creditRoutes, { prefix: '/credits' })
  await fastify.register(transferRoutes, { prefix: '/transfers' })
  await fastify.register(retirementRoutes, { prefix: '/retirements' })
  await fastify.register(evidenceRoutes, { prefix: '/evidence' })
  await fastify.register(auditRoutes, { prefix: '/audits' })
  await fastify.register(reportRoutes, { prefix: '/reports' })
  await fastify.register(adminRoutes, { prefix: '/admin' })
}

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  const traceId = request.id
  
  fastify.log.error({
    error: error.message,
    stack: error.stack,
    traceId,
    url: request.url,
    method: request.method,
  })

  if (error.validation) {
    reply.code(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.validation,
        traceId,
      },
    })
    return
  }

  reply.code(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
      traceId,
    },
  })
})

// Start server
async function start() {
  try {
    await registerPlugins()
    await registerRoutes()
    
    const port = config.server.port
    const host = config.server.host
    
    await fastify.listen({ port, host })
    
    fastify.log.info(`Server listening on http://${host}:${port}`)
  } catch (error) {
    fastify.log.error(error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  fastify.log.info('Received SIGINT, shutting down gracefully...')
  await fastify.close()
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  fastify.log.info('Received SIGTERM, shutting down gracefully...')
  await fastify.close()
  await prisma.$disconnect()
  process.exit(0)
})

// Start the server
if (require.main === module) {
  start()
}

export default fastify
