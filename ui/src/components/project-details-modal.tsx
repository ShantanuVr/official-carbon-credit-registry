'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ProvenancePill, TokenizationCard } from '@/components/authority-banner'
import { MapPin, Calendar, Building, Hash, Users, FileText, Activity } from 'lucide-react'

interface SerialRange {
  startSerial: number
  endSerial: number
  quantity: number
  formatted?: string
  humanReadable?: string
}

interface Project {
  id: string
  title: string
  description: string
  country: string
  region: string
  methodology: string
  status: string
  creditBatches?: Array<{
    totalIssued: number
    totalRetired: number
    serialStart: number
    serialEnd: number
  }>
  organization?: {
    name: string
    type: string
  }
  createdAt?: string
  updatedAt?: string
}

interface ProjectDetailsModalProps {
  project: Project
  children?: React.ReactNode
  onClose?: () => void
  open?: boolean
}

export function ProjectDetailsModal({ project, children, onClose, open: controlledOpen }: ProjectDetailsModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOpen !== undefined ? (onClose || (() => {})) : setInternalOpen

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'secondary'
      case 'UNDER_REVIEW': return 'warning'
      case 'APPROVED': return 'success'
      default: return 'default'
    }
  }

  // Calculate credits from creditBatches
  const creditsIssued = (project.creditBatches || []).reduce((sum, batch) => sum + (batch.totalIssued || 0), 0)
  const creditsRetired = (project.creditBatches || []).reduce((sum, batch) => sum + (batch.totalRetired || 0), 0)
  
  // Generate serial ranges from creditBatches
  const serialRanges: SerialRange[] = (project.creditBatches || []).map(batch => ({
    startSerial: batch.serialStart,
    endSerial: batch.serialEnd,
    quantity: batch.totalIssued - batch.totalRetired,
    formatted: `${batch.serialStart.toString().padStart(8, '0')}-${batch.serialEnd.toString().padStart(8, '0')}`,
    humanReadable: `SIM-REG-${project.id.toUpperCase()}-2024-2024-BA01-${batch.serialStart.toString().padStart(8, '0')}-${batch.serialEnd.toString().padStart(8, '0')}`
  }))

         const downloadProjectCertificate = (project: Project) => {
           // Only allow certificate download for approved/active projects
           if (project.status !== 'APPROVED') {
             alert('Certificates can only be downloaded for approved projects.')
             return
           }

           // Create certificate content
           const certificateContent = `
CARBON CREDIT PROJECT CERTIFICATE
================================

Project ID: ${project.id}
Project Title: ${project.title}
Description: ${project.description}
Country: ${project.country}
Region: ${project.region}
Methodology: ${project.methodology}
Status: ${project.status}
Organization: ${project.organization?.name || 'N/A'}

CREDIT STATISTICS
================
Total Credits Issued: ${creditsIssued.toLocaleString()} tCO₂e
Total Credits Retired: ${creditsRetired.toLocaleString()} tCO₂e
Available Credits: ${(creditsIssued - creditsRetired).toLocaleString()} tCO₂e

SERIAL NUMBER RANGES
====================
${serialRanges.map(range => `${range.formatted} (${range.quantity} credits)`).join('\n')}

COMPLETE SERIAL NUMBER LIST
============================
${serialRanges.map(range => {
  const serials = []
  for (let i = range.startSerial; i <= range.endSerial; i++) {
    serials.push(i.toString().padStart(8, '0'))
  }
  return `Range ${range.formatted}:\n${serials.join(', ')}`
}).join('\n\n')}

Note: Each serial number represents one carbon credit (1 tCO₂e)
Total Individual Credits: ${creditsIssued.toLocaleString()} serial numbers
Format: Serial numbers are padded to 8 digits (e.g., 00030001, 00030002, etc.)

CERTIFICATE DETAILS
==================
Issued Date: ${new Date().toLocaleDateString()}
Registry: Official Carbon Credit Registry Simulator
Certificate ID: CERT-${project.id.toUpperCase()}-${Date.now()}
Project Status: ${project.status} (Certificate only issued for APPROVED projects)

This certificate verifies the carbon credit project details and credit allocations
as recorded in the Official Carbon Credit Registry Simulator.

---
Generated on ${new Date().toLocaleString()}
Official Carbon Credit Registry Simulator
    `.trim()

    // Create and download file
    const blob = new Blob([certificateContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `carbon-certificate-${project.id}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const content = (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{project.title}</DialogTitle>
          <div className="flex items-center space-x-2">
            <Badge variant={getStatusColor(project.status)}>
              {project.status.replace('_', ' ')}
            </Badge>
            {project.organization && (
              <Badge variant="outline">
                {project.organization.name}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Project Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">{project.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    <strong>Location:</strong> {project.region}, {project.country}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    <strong>Methodology:</strong> {project.methodology}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credit Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Credit Statistics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {creditsIssued.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Credits Issued</div>
                  <div className="text-xs text-gray-500">tCO₂e</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {creditsRetired.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Credits Retired</div>
                  <div className="text-xs text-gray-500">tCO₂e</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {(creditsIssued - creditsRetired).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Available Credits</div>
                  <div className="text-xs text-gray-500">tCO₂e</div>
                </div>
              </div>
            </CardContent>
          </Card>

                 {/* Serial Ranges */}
                 {serialRanges && serialRanges.length > 0 && (
                   <Card>
                     <CardHeader>
                       <CardTitle className="flex items-center space-x-2">
                         <Hash className="h-5 w-5" />
                         <span>Serial Number Ranges</span>
                         {(project.status === 'APPROVED') && (
                           <Badge variant="success" className="ml-2">
                             Certificate Available
                           </Badge>
                         )}
                       </CardTitle>
                       <CardDescription>
                         Unique serial numbers assigned to this project's carbon credits
                         {project.status !== 'APPROVED' && (
                           <span className="text-amber-600 font-medium"> - Certificate available only for approved projects</span>
                         )}
                       </CardDescription>
                     </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {serialRanges.map((range, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-mono text-sm text-gray-700">
                            {range.formatted || `${range.startSerial.toString().padStart(8, '0')}-${range.endSerial.toString().padStart(8, '0')}`}
                          </div>
                          {range.humanReadable && (
                            <div className="text-xs text-gray-500 mt-1">
                              {range.humanReadable}
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary">
                          {range.quantity.toLocaleString()} credits
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        Serial Range: {range.startSerial.toLocaleString()} - {range.endSerial.toLocaleString()}
                      </div>
                      <ProvenancePill 
                        classId={project.id.slice(-8).toUpperCase()}
                        startSerial={range.startSerial}
                        endSerial={range.endSerial}
                        className="mb-2"
                      />
                      <TokenizationCard 
                        status="NOT_REQUESTED"
                        className="mt-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Project Timeline */}
          {project.createdAt && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Project Timeline</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Created:</span>
                    <span className="text-sm font-medium">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {project.updatedAt && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Last Updated:</span>
                      <span className="text-sm font-medium">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Organization Info */}
          {project.organization && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Organization</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-medium">{project.organization.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Type:</span>
                    <Badge variant="outline">{project.organization.type}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

               <div className="flex justify-end space-x-2 pt-4 border-t">
                 <Button variant="outline" onClick={() => setOpen(false)}>
                   Close
                 </Button>
                 {(project.status === 'APPROVED') ? (
                   <Button onClick={() => {
                     downloadProjectCertificate(project)
                   }}>
                     Download Certificate
                   </Button>
                 ) : (
                   <Button disabled title="Certificate only available for approved projects">
                     Download Certificate
                   </Button>
                 )}
               </div>
      </DialogContent>
    </Dialog>
  )

  return content
}
