import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../index'
import { authenticate } from '../../lib/auth'

export async function reportRoutes(fastify: FastifyInstance) {
  // Get registry statistics
  fastify.get('/registry-stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const [
      totalProjects,
      activeProjects,
      totalCreditsIssued,
      totalCreditsRetired,
      totalOrganizations,
      totalUsers,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({
        where: {
          status: {
            in: ['APPROVED'],
          },
        },
      }),
      prisma.creditBatch.aggregate({
        _sum: {
          totalIssued: true,
        },
      }),
      prisma.creditBatch.aggregate({
        _sum: {
          totalRetired: true,
        },
      }),
      prisma.organization.count(),
      prisma.user.count(),
    ])

    return {
      projects: {
        total: totalProjects,
        active: activeProjects,
      },
      credits: {
        totalIssued: totalCreditsIssued._sum.totalIssued || 0,
        totalRetired: totalCreditsRetired._sum.totalRetired || 0,
        available: (totalCreditsIssued._sum.totalIssued || 0) - (totalCreditsRetired._sum.totalRetired || 0),
      },
      organizations: {
        total: totalOrganizations,
      },
      users: {
        total: totalUsers,
      },
    }
  })

  // Get project statistics
  fastify.get('/projects/stats', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const stats = await prisma.project.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    })

    const methodologyStats = await prisma.project.groupBy({
      by: ['methodology'],
      _count: {
        id: true,
      },
    })

    const countryStats = await prisma.project.groupBy({
      by: ['country'],
      _count: {
        id: true,
      },
    })

    return {
      byStatus: stats.map(stat => ({
        status: stat.status,
        count: stat._count.id,
      })),
      byMethodology: methodologyStats.map(stat => ({
        methodology: stat.methodology,
        count: stat._count.id,
      })),
      byCountry: countryStats.map(stat => ({
        country: stat.country,
        count: stat._count.id,
      })),
    }
  })

  // Get credit statistics
  fastify.get('/credits/stats', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const vintageStats = await prisma.creditBatch.groupBy({
      by: ['vintageStart'],
      _sum: {
        totalIssued: true,
        totalRetired: true,
      },
      _count: {
        id: true,
      },
    })

    const projectStats = await prisma.creditBatch.groupBy({
      by: ['projectId'],
      _sum: {
        totalIssued: true,
        totalRetired: true,
      },
      _count: {
        id: true,
      },
    })

    return {
      byVintage: vintageStats.map(stat => ({
        vintage: stat.vintageStart,
        totalIssued: stat._sum.totalIssued || 0,
        totalRetired: stat._sum.totalRetired || 0,
        batchCount: stat._count.id,
      })),
      byProject: projectStats.map(stat => ({
        projectId: stat.projectId,
        totalIssued: stat._sum.totalIssued || 0,
        totalRetired: stat._sum.totalRetired || 0,
        batchCount: stat._count.id,
      })),
    }
  })
}
