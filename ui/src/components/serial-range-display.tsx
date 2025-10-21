'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, Hash } from 'lucide-react'
import { useState } from 'react'

interface SerialRange {
  startSerial: number
  endSerial: number
  quantity: number
  formatted?: string
  humanReadable?: string
}

interface SerialRangeDisplayProps {
  ranges: SerialRange[]
  title?: string
  showHumanReadable?: boolean
  className?: string
}

export function SerialRangeDisplay({ 
  ranges, 
  title = "Serial Ranges", 
  showHumanReadable = true,
  className = ""
}: SerialRangeDisplayProps) {
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

  if (ranges.length === 0) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <Hash className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No serial ranges available</p>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center">
          <Hash className="h-4 w-4 mr-2" />
          {title} ({ranges.length} range{ranges.length !== 1 ? 's' : ''})
        </h4>
        <Badge variant="outline" className="text-xs">
          {ranges.reduce((sum, range) => sum + range.quantity, 0)} total
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ranges.map((range, index) => (
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
                  {range.formatted || formatSerialRange(range.startSerial, range.endSerial)}
                </code>
              </div>
              {showHumanReadable && range.humanReadable && (
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
                      onClick={() => copyToClipboard(range.humanReadable, `${index}`)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              {copiedSerial === `${index}` && (
                <div className="text-xs text-green-600 flex items-center">
                  <span>Copied to clipboard!</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
