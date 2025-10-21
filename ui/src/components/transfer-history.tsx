'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, ExternalLink, ArrowRight, Calendar, Building } from 'lucide-react'
import { useState } from 'react'

interface TransferAllocation {
  startSerial: number
  endSerial: number
  quantity: number
  formatted: string
}

interface Transfer {
  id: string
  fromOrgId: string
  toOrgId: string
  batchId: string
  quantity: number
  createdAt: string
  fromOrganization: {
    name: string
  }
  toOrganization: {
    name: string
  }
  batch: {
    project: {
      title: string
    }
    vintageStart: number
    vintageEnd: number
  }
  allocated?: TransferAllocation[]
}

interface TransferHistoryProps {
  transfers: Transfer[]
  onViewDetails?: (transfer: Transfer) => void
}

export function TransferHistory({ transfers, onViewDetails }: TransferHistoryProps) {
  const [copiedSerial, setCopiedSerial] = useState<string | null>(null)

  const copyToClipboard = async (text: string, serialId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedSerial(serialId)
      setTimeout(() => setCopiedSerial(null), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (transfers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <ArrowRight className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Transfers</h3>
          <p className="text-gray-600">No credit transfers have been made yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Transfer History</h2>
        <Badge variant="outline" className="text-sm">
          {transfers.length} Transfer{transfers.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {transfers.map((transfer) => (
        <Card key={transfer.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg flex items-center">
                  <ArrowRight className="h-5 w-5 mr-2 text-blue-600" />
                  Credit Transfer
                </CardTitle>
                <CardDescription>
                  {transfer.batch.project.title} • Vintage {transfer.batch.vintageStart}-{transfer.batch.vintageEnd}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                {transfer.quantity.toLocaleString()} tCO₂e
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Transfer Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">From:</span>
                  <span className="font-medium">{transfer.fromOrganization.name}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">To:</span>
                  <span className="font-medium">{transfer.toOrganization.name}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{formatDate(transfer.createdAt)}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-600">Transfer ID:</span>
                  <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                    {transfer.id.slice(0, 8)}...
                  </code>
                </div>
              </div>
            </div>

            {/* Serial Allocations */}
            {transfer.allocated && transfer.allocated.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Serial Ranges Transferred ({transfer.allocated.length} range{transfer.allocated.length !== 1 ? 's' : ''})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {transfer.allocated.map((allocation, index) => (
                    <div key={index} className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-700">
                          Range {index + 1}
                        </span>
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                          {allocation.quantity} credits
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-600">Serial Range:</span>
                          <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                            {allocation.formatted}
                          </code>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-600">Range:</span>
                          <div className="flex items-center space-x-2">
                            <code className="text-xs font-mono bg-white px-2 py-1 rounded border">
                              {allocation.startSerial.toString().padStart(8, '0')} - {allocation.endSerial.toString().padStart(8, '0')}
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(allocation.formatted, `${transfer.id}-${index}`)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {copiedSerial === `${transfer.id}-${index}` && (
                          <div className="text-xs text-green-600 flex items-center">
                            <span>Copied to clipboard!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails?.(transfer)}
                className="flex items-center space-x-2"
              >
                <ExternalLink className="h-4 w-4" />
                <span>View Details</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
