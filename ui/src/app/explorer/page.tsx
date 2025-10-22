'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProjectDetailsModal } from '@/components/project-details-modal'
import { Leaf, MapPin, Calendar, Building, Hash, Search, Filter, Home } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import Link from 'next/link'

interface Project {
  id: string
  title: string
  description: string
  country: string
  region: string
  methodology: string
  status: string
  createdAt: string
  updatedAt: string
  organization: {
    name: string
    type: string
  }
  creditBatches?: Array<{
    id: string
    totalIssued: number
    totalRetired: number
    serialStart: number
    serialEnd: number
  }>
  // For public endpoint data
  creditsIssued?: number
  creditsRetired?: number
}

export default function ExplorerPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { isAuthenticated } = useAuth()

  // Ensure component is mounted before rendering dynamic content
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch projects from API
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        if (isAuthenticated) {
          // Fetch all projects for authenticated users
          const data = await apiClient.get('/projects')
          setProjects(data.projects || data)
          setFilteredProjects(data.projects || data)
        } else {
          // Fetch only approved projects for public access
          const response = await fetch('http://localhost:4000/public/projects')
          const data = await response.json()
          setProjects(data.projects || [])
          setFilteredProjects(data.projects || [])
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [isAuthenticated])

  // Filter projects based on search and status
  useEffect(() => {
    let filtered = projects

    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.region.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter)
    }

    setFilteredProjects(filtered)
  }, [projects, searchTerm, statusFilter])

  // Calculate statistics - ensure consistent rendering between server and client
  const totalProjects = !mounted || loading ? 0 : projects.length
  const totalCreditsIssued = !mounted || loading ? 0 : projects.reduce((sum, project) => {
    if (project.creditsIssued !== undefined) {
      return sum + project.creditsIssued
    }
    return sum + (project.creditBatches || []).reduce((batchSum, batch) => batchSum + batch.totalIssued, 0)
  }, 0)
  const totalCreditsRetired = !mounted || loading ? 0 : projects.reduce((sum, project) => {
    if (project.creditsRetired !== undefined) {
      return sum + project.creditsRetired
    }
    return sum + (project.creditBatches || []).reduce((batchSum, batch) => batchSum + batch.totalRetired, 0)
  }, 0)
  const activeProjects = !mounted || loading ? 0 : projects.filter(project => 
    project.status === 'APPROVED'
  ).length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'secondary'
      case 'UNDER_REVIEW': return 'warning'
      case 'APPROVED': return 'success'
      default: return 'default'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Leaf className="h-8 w-8 text-green-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Official Carbon Credit Registry
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" className="flex items-center space-x-2">
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>Filter</span>
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
          
          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Status:</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all')
                    setSearchTerm('')
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Page Title Section */}
      <section className="py-8 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Project Explorer
            </h2>
            <p className="text-lg text-gray-600">
              Browse and explore carbon credit projects in the registry
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-grow">
        {/* Stats Section */}
      <section className="py-8 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-lg">Total Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{totalProjects}</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-lg">Credits Issued</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{totalCreditsIssued.toLocaleString()}</div>
                <p className="text-sm text-gray-600">tCO₂e</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-lg">Credits Retired</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{totalCreditsRetired.toLocaleString()}</div>
                <p className="text-sm text-gray-600">tCO₂e</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-lg">Active Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{activeProjects}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Projects List */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">
            Carbon Credit Projects ({!mounted || loading ? 0 : filteredProjects.length})
          </h2>
          
          {!mounted || loading ? (
            <div className="text-center py-8">
              <div className="text-lg text-gray-600">Loading projects...</div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-lg text-gray-600">No projects found matching your criteria.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => {
                const creditsIssued = project.creditsIssued !== undefined 
                  ? project.creditsIssued 
                  : (project.creditBatches || []).reduce((sum, batch) => sum + batch.totalIssued, 0)
                const creditsRetired = project.creditsRetired !== undefined 
                  ? project.creditsRetired 
                  : (project.creditBatches || []).reduce((sum, batch) => sum + batch.totalRetired, 0)
                const serialRanges = (project.creditBatches || []).map(batch => ({
                  startSerial: batch.serialStart,
                  endSerial: batch.serialEnd,
                  quantity: batch.totalIssued - batch.totalRetired,
                  formatted: `${batch.serialStart.toString().padStart(8, '0')}-${batch.serialEnd.toString().padStart(8, '0')}`,
                  humanReadable: `SIM-REG-${project.id.toUpperCase()}-2024-2024-BA01-${batch.serialStart.toString().padStart(8, '0')}-${batch.serialEnd.toString().padStart(8, '0')}`
                }))

                return (
                  <Card key={project.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{project.title}</CardTitle>
                        <Badge variant={getStatusColor(project.status)}>
                          {project.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <CardDescription>{project.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{project.region}, {project.country}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Building className="h-4 w-4" />
                        <span>{project.methodology}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-600">
                            {creditsIssued.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600">Issued</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-purple-600">
                            {creditsRetired.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600">Retired</div>
                        </div>
                      </div>

                      {/* Serial Ranges */}
                      {serialRanges.length > 0 && (
                        <div className="pt-4 border-t">
                          <div className="flex items-center space-x-2 mb-2">
                            <Hash className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Serial Ranges</span>
                          </div>
                          <div className="space-y-2">
                            {serialRanges.map((range, index) => (
                              <div key={index} className="bg-gray-50 rounded p-2 text-xs">
                                <div className="flex justify-between items-center">
                                  <span className="font-mono text-gray-600">
                                    {range.formatted}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {range.quantity} credits
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <ProjectDetailsModal project={{
                        ...project,
                        creditsIssued,
                        creditsRetired,
                        serialRanges
                      }}>
                        <Button className="w-full" variant="outline">
                          View Details
                        </Button>
                      </ProjectDetailsModal>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </section>

      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Leaf className="h-6 w-6 text-green-400" />
                <span className="font-bold">Carbon Registry</span>
              </div>
              <p className="text-gray-400 text-sm">
                Official Carbon Credit Registry Simulator for demonstration and educational purposes.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/" className="hover:text-white">Home</Link></li>
                <li><Link href="/explorer" className="hover:text-white">Project Explorer</Link></li>
                <li><Link href="/login" className="hover:text-white">Login Portal</Link></li>
                <li><Link href="/docs" className="hover:text-white">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Roles</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Project Developers</li>
                <li>Verifiers</li>
                <li>Administrators</li>
                <li>Public Viewers</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Demo Accounts</h4>
              <div className="text-sm text-gray-400 space-y-1">
                <div>Admin: admin@registry.test</div>
                <div>Verifier: verifier1@registry.test</div>
                <div>Issuer: solarco@registry.test</div>
                <div>Password: Admin@123</div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 Official Carbon Credit Registry Simulator. Demo/Education Platform.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
