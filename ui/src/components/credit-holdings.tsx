'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, ExternalLink, Hash } from 'lucide-react'
import { useState } from 'react'

interface SerialRange {
  startSerial: number
  endSerial: number
  quantity: number
  formatted: string
  humanReadable: string
}

interface CreditHolding {
  batchId: string
  projectId: string
  vintageStart: number
  vintageEnd: number
  quantity: number
  project: {
    title: string
    organization: {
      name: string
    }
  }
  ranges: SerialRange[]
}

interface CreditHoldingsProps {
  holdings: CreditHolding[]
  onTransfer?: (holding: CreditHolding) => void
  onRetire?: (holding: CreditHolding) => void
}

export function CreditHoldings({ holdings, onTransfer, onRetire }: CreditHoldingsProps) {
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

  const formatSerialRange = (start: number, end: number) => {
    if (start === end) {
      return `${start.toString().padStart(8, '0')}`
    }
    return `${start.toString().padStart(8, '0')}-${end.toString().padStart(8, '0')}`
  }

  if (holdings.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Hash className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Credit Holdings</h3>
          <p className="text-gray-600">You don't have any carbon credit holdings yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Credit Holdings</h2>
        <Badge variant="outline" className="text-sm">
          {holdings.length} Batch{holdings.length !== 1 ? 'es' : ''}
        </Badge>
      </div>

      {holdings.map((holding) => (
        <Card key={holding.batchId} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{holding.project.title}</CardTitle>
                <CardDescription>
                  {holding.project.organization.name} • Vintage {holding.vintageStart}-{holding.vintageEnd}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                {holding.quantity.toLocaleString()} tCO₂e
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Serial Ranges */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Hash className="h-4 w-4 mr-2" />
                Serial Ranges ({holding.ranges.length} range{holding.ranges.length !== 1 ? 's' : ''})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {holding.ranges.map((range, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Range {index + 1}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {range.quantity} credits
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Serial Range:</span>
                        <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                          {formatSerialRange(range.startSerial, range.endSerial)}
                        </code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Unique ID:</span>
                        <div className="flex items-center space-x-2">
                          <code className="text-xs font-mono bg-white px-2 py-1 rounded border max-w-48 truncate">
                            {range.humanReadable}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(range.humanReadable, `${holding.batchId}-${index}`)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {copiedSerial === `${holding.batchId}-${index}` && (
                        <div className="text-xs text-green-600 flex items-center">
                          <span>Copied to clipboard!</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTransfer?.(holding)}
                className="flex-1"
              >
                Transfer Credits
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetire?.(holding)}
                className="flex-1"
              >
                Retire Credits
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
