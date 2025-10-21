import { FastifyRequest, FastifyReply } from 'fastify'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function handleError(error: unknown, request: FastifyRequest, reply: FastifyReply) {
  const traceId = request.id

  if (error instanceof AppError) {
    reply.code(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        traceId,
      },
    })
    return
  }

  if (error instanceof ZodError) {
    reply.code(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.errors,
        traceId,
      },
    })
    return
  }

  // Log unexpected errors
  request.log.error({
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    traceId,
    url: request.url,
    method: request.method,
  })

  reply.code(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
      traceId,
    },
  })
}

// Common error codes
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  ISSUANCE_NOT_FOUND: 'ISSUANCE_NOT_FOUND',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  EVIDENCE_NOT_FOUND: 'EVIDENCE_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  ORGANIZATION_NOT_FOUND: 'ORGANIZATION_NOT_FOUND',
} as const
