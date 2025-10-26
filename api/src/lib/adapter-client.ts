import jwt from 'jsonwebtoken'
import { config } from './config'
import { AppError, ErrorCodes } from './errors'

interface AdapterResponse {
  adapterTxId: string
  classId: string
  quantity: number
  txHash: string
  blockNumber: number
  onchainHash: string
  receiptUrl: string
}

interface IssuanceFinalizeRequest {
  issuanceId: string
  projectId: string
  vintageStart: string
  vintageEnd: string
  quantity: number
  factorRef: string
  evidenceHashes: string[]
  classId?: string
}

/**
 * Client for calling the registry-adapter-api
 */
export class AdapterClient {
  private adapterUrl: string
  private jwtSecret: string

  constructor() {
    if (!config.integrations.adapterUrl) {
      throw new AppError(
        ErrorCodes.CONFIGURATION_ERROR,
        'ADAPTER_URL is not configured',
        500
      )
    }
    this.adapterUrl = config.integrations.adapterUrl
    this.jwtSecret = config.jwt.secret
  }

  /**
   * Generate a JWT token for adapter authentication
   */
  private generateAdapterToken(): string {
    const payload = {
      role: 'ISSUER',
      orgId: 'official-registry',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
    }

    return jwt.sign(payload, this.jwtSecret)
  }

  /**
   * Generate a UUID for idempotency
   */
  private generateIdempotencyKey(): string {
    return `idemp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Finalize issuance on-chain via the adapter
   */
  async finalizeIssuance(request: IssuanceFinalizeRequest): Promise<AdapterResponse> {
    const url = `${this.adapterUrl}/v1/credit/issuance/finalize`
    const token = this.generateAdapterToken()
    const idempotencyKey = this.generateIdempotencyKey()

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new AppError(
          ErrorCodes.ADAPTER_ERROR,
          `Adapter returned ${response.status}: ${JSON.stringify(errorBody)}`,
          response.status
        )
      }

      const result = await response.json()
      
      return {
        adapterTxId: result.adapterTxId,
        classId: result.classId,
        quantity: result.quantity,
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        onchainHash: result.onchainHash,
        receiptUrl: result.receiptUrl,
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw new AppError(
        ErrorCodes.ADAPTER_ERROR,
        `Failed to call adapter: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      )
    }
  }

  /**
   * Format vintage year to ISO date string
   */
  formatVintageDate(year: number): string {
    // Convert to ISO date-time string
    // January 1 of the year at midnight UTC
    return new Date(year, 0, 1, 0, 0, 0, 0).toISOString()
  }
}

