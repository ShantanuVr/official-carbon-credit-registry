'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, Download, Award, Calendar, Building, Hash } from 'lucide-react'
import { useState } from 'react'

interface Retirement {
  id: string
  orgId: string
  batchId: string
  quantity: number
  purpose: string
  beneficiary?: string
  certificateId: string
  serialStart: number
  serialEnd: number
  createdAt: string
  organization: {
    name: string
  }
  batch: {
    project: {
      title: string
    }
    vintageStart: number
    vintageEnd: number
  }
  formatted?: string
  humanReadable?: string
}

interface RetirementHistoryProps {
  retirements: Retirement[]
  onDownloadCertificate?: (retirement: Retirement) => void
  onViewDetails?: (retirement: Retirement) => void
}

export function RetirementHistory({ retirements, onDownloadCertificate, onViewDetails }: RetirementHistoryProps) {
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

  const formatSerialRange = (start: number, end: number) => {
    if (start === end) {
      return `${start.toString().padStart(8, '0')}`
    }
    return `${start.toString().padStart(8, '0')}-${end.toString().padStart(8, '0')}`
  }

  if (retirements.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Retirements</h3>
          <p className="text-gray-600">No credits have been retired yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Retirement History</h2>
        <Badge variant="outline" className="text-sm">
          {retirements.length} Retirement{retirements.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {retirements.map((retirement) => (
        <Card key={retirement.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg flex items-center">
                  <Award className="h-5 w-5 mr-2 text-purple-600" />
                  Credit Retirement
                </CardTitle>
                <CardDescription>
                  {retirement.batch.project.title} • Vintage {retirement.batch.vintageStart}-{retirement.batch.vintageEnd}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                {retirement.quantity.toLocaleString()} tCO₂e
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Retirement Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Organization:</span>
                  <span className="font-medium">{retirement.organization.name}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-600">Purpose:</span>
                  <span className="font-medium">{retirement.purpose}</span>
                </div>
                {retirement.beneficiary && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-600">Beneficiary:</span>
                    <span className="font-medium">{retirement.beneficiary}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{formatDate(retirement.createdAt)}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-600">Certificate ID:</span>
                  <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                    {retirement.certificateId.slice(0, 12)}...
                  </code>
                </div>
              </div>
            </div>

            {/* Serial Range */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Hash className="h-4 w-4 mr-2" />
                Retired Serial Range
              </h4>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-purple-600">Serial Range:</span>
                      <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                        {formatSerialRange(retirement.serialStart, retirement.serialEnd)}
                      </code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-purple-600">Range:</span>
                      <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                        {retirement.serialStart.toString().padStart(8, '0')} - {retirement.serialEnd.toString().padStart(8, '0')}
                      </code>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-purple-600">Unique ID:</span>
                      <div className="flex items-center space-x-2">
                        <code className="text-xs font-mono bg-white px-2 py-1 rounded border max-w-48 truncate">
                          {retirement.humanReadable || 'SIM-REG-PROJECT-VINTAGE-BATCH-SERIALS'}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(retirement.humanReadable || '', retirement.id)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {copiedSerial === retirement.id && (
                      <div className="text-xs text-green-600 flex items-center">
                        <span>Copied to clipboard!</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownloadCertificate?.(retirement)}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Download Certificate</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails?.(retirement)}
                className="flex items-center space-x-2"
              >
                <span>View Details</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
