'use client'

import { Shield, CreditCard } from 'lucide-react'

interface AuthorityBannerProps {
  className?: string
}

export function AuthorityBanner({ className = '' }: AuthorityBannerProps) {
  return (
    <div className={`bg-green-50 border-l-4 border-green-400 p-4 ${className}`}>
      <div className="flex items-center">
        <Shield className="h-5 w-5 text-green-600 mr-3" />
        <div>
          <div className="flex items-center">
            <CreditCard className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-800">
              Official Registry • Demo Environment • Source of Record: CREDIT
            </span>
          </div>
          <p className="text-xs text-green-700 mt-1">
            📜 Credit • Off-chain • Registry Authoritative
          </p>
        </div>
      </div>
    </div>
  )
}

interface ProvenancePillProps {
  classId: string
  startSerial: number
  endSerial: number
  className?: string
}

export function ProvenancePill({ classId, startSerial, endSerial, className = '' }: ProvenancePillProps) {
  const formatSerial = (serial: number) => serial.toString().padStart(8, '0')
  
  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ${className}`}>
      <span className="mr-1">📜</span>
      <span>Credit • Class {classId} • Serials {formatSerial(startSerial)}–{formatSerial(endSerial)}</span>
    </div>
  )
}

interface TokenizationCardProps {
  status: 'NOT_REQUESTED' | 'REQUESTED' | 'MINTED' | 'BURNED'
  chainId?: number
  contract?: string
  tokenId?: string
  className?: string
}

export function TokenizationCard({ status, chainId, contract, tokenId, className = '' }: TokenizationCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NOT_REQUESTED': return 'bg-gray-100 text-gray-800'
      case 'REQUESTED': return 'bg-yellow-100 text-yellow-800'
      case 'MINTED': return 'bg-green-100 text-green-800'
      case 'BURNED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'NOT_REQUESTED': return 'Not Tokenized'
      case 'REQUESTED': return 'Tokenization Requested'
      case 'MINTED': return 'Token Minted'
      case 'BURNED': return 'Token Burned'
      default: return 'Unknown'
    }
  }

  return (
    <div className={`border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900">Tokenization Status</h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
          {getStatusText(status)}
        </span>
      </div>
      
      {status !== 'NOT_REQUESTED' && (
        <div className="space-y-2 text-xs text-gray-600">
          {chainId && <div>Chain ID: {chainId}</div>}
          {contract && <div>Contract: {contract}</div>}
          {tokenId && <div>Token ID: {tokenId}</div>}
        </div>
      )}
      
      <div className="mt-3 pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-500 italic">
          Tokenization is representational only; registry remains authoritative for credits.
        </p>
        {status !== 'NOT_REQUESTED' && (
          <button className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline">
            View token representation →
          </button>
        )}
      </div>
    </div>
  )
}
