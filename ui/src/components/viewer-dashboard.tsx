'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  FileText, 
  Eye,
  Download,
  Search,
  Filter,
  TrendingUp,
  Globe,
  Building
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

interface Project {
  id: string
  title: string
  description: string
  status: string
  country: string
  region: string
  methodology: string
  createdAt: string
  organization: {
    name: string
    type: string
  }
  creditBatches: Array<{
    totalIssued: number
    totalRetired: number
    serialStart: number
    serialEnd: number
  }>
}

export function ViewerDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isAuthenticated) {
          const data = await apiClient.get('/projects')
          const projectsData = data.projects || data
          setProjects(projectsData)
          setFilteredProjects(projectsData)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isAuthenticated])

  useEffect(() => {
    let filtered = projects

    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.organization.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter)
    }

    if (countryFilter !== 'all') {
      filtered = filtered.filter(project => project.country === countryFilter)
    }

    setFilteredProjects(filtered)
  }, [projects, searchTerm, statusFilter, countryFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'secondary'
      case 'UNDER_REVIEW': return 'warning'
      case 'APPROVED': return 'success'
      default: return 'default'
    }
  }

  const countries = [...new Set((projects || []).map(p => p.country))].sort()
  const totalCreditsIssued = projects?.reduce((sum, project) => 
    sum + (project.creditBatches || []).reduce((batchSum, batch) => batchSum + batch.totalIssued, 0), 0
  ) || 0
  const totalCreditsRetired = projects?.reduce((sum, project) => 
    sum + (project.creditBatches || []).reduce((batchSum, batch) => batchSum + batch.totalRetired, 0), 0
  ) || 0

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading viewer dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground">
              {projects.filter(p => p.status === 'APPROVED').length} approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Issued</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCreditsIssued.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              tCO₂e total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Retired</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCreditsRetired.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              tCO₂e retired
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Countries</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countries.length}</div>
            <p className="text-xs text-muted-foreground">
              Countries represented
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search & Filter Projects</span>
          </CardTitle>
          <CardDescription>
            Find and explore carbon credit projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search projects, organizations, locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map(country => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Public Projects ({filteredProjects.length})</span>
          </CardTitle>
          <CardDescription>
            Browse all publicly available carbon credit projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No projects found matching your criteria.</p>
              </div>
            ) : (
              filteredProjects.map((project) => {
                const creditsIssued = (project.creditBatches || []).reduce((sum, batch) => sum + batch.totalIssued, 0)
                const creditsRetired = (project.creditBatches || []).reduce((sum, batch) => sum + batch.totalRetired, 0)
                const serialRanges = project.creditBatches.map(batch => ({
                  startSerial: batch.serialStart,
                  endSerial: batch.serialEnd,
                  quantity: batch.totalIssued - batch.totalRetired,
                  formatted: `${batch.serialStart.toString().padStart(8, '0')}-${batch.serialEnd.toString().padStart(8, '0')}`
                }))

                return (
                  <div key={project.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold">{project.title}</h4>
                          <Badge variant={getStatusColor(project.status)}>
                            {project.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{project.description}</p>
                        <div className="flex space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Building className="h-3 w-3 mr-1" />
                            {project.organization.name}
                          </span>
                          <span className="flex items-center">
                            <Globe className="h-3 w-3 mr-1" />
                            {project.region}, {project.country}
                          </span>
                          <span>Methodology: {project.methodology}</span>
                        </div>
                        <div className="flex space-x-4 text-sm">
                          <span className="text-blue-600">
                            Issued: {creditsIssued.toLocaleString()} tCO₂e
                          </span>
                          <span className="text-purple-600">
                            Retired: {creditsRetired.toLocaleString()} tCO₂e
                          </span>
                          <span className="text-green-600">
                            Available: {(creditsIssued - creditsRetired).toLocaleString()} tCO₂e
                          </span>
                        </div>
                        {serialRanges.length > 0 && (
                          <div className="text-xs text-gray-500">
                            Serial Ranges: {serialRanges.map(range => range.formatted).join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-1" />
                          Download Report
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Methodology Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Methodology Breakdown</span>
          </CardTitle>
          <CardDescription>
            Distribution of projects by methodology
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(
              (projects || []).reduce((acc, project) => {
                acc[project.methodology] = (acc[project.methodology] || 0) + 1
                return acc
              }, {} as Record<string, number>)
            ).map(([methodology, count]) => (
              <div key={methodology} className="flex justify-between items-center">
                <span className="text-sm">{methodology}</span>
                <Badge variant="secondary">{count} projects</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
