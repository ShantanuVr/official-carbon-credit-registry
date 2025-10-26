'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ProjectDetailsModal } from '@/components/project-details-modal'
import { 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  Plus,
  Search,
  Filter,
  Edit,
  Upload
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

interface Project {
  id: string
  title: string
  description: string
  status: string
  organization: {
    name: string
    type: string
  }
  createdAt: string
  creditBatches: Array<{
    totalIssued: number
    totalRetired: number
  }>
}

interface IssuanceRequest {
  id: string
  projectId: string
  status: string
  quantity: number
  createdAt: string
  project: {
    title: string
    organization: {
      name: string
    }
  }
}

export function AdminDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [issuanceRequests, setIssuanceRequests] = useState<IssuanceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    status: ''
  })
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)
  const { isAuthenticated } = useAuth()

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4000) // Auto-hide after 4 seconds
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isAuthenticated) {
          const [projectsData, issuancesData] = await Promise.all([
            apiClient.get('/projects'),
            apiClient.get('/issuances')
          ])

          setProjects(projectsData.projects || projectsData)
          setIssuanceRequests(issuancesData.issuances || issuancesData)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isAuthenticated])

  const handleApproveProject = async (projectId: string) => {
    try {
      await apiClient.post(`/projects/${projectId}/approve`, {})
      showNotification('success', 'Project approved successfully!')
      // Refresh data
      const projectsData = await apiClient.get('/projects')
      setProjects(projectsData.projects || projectsData)
    } catch (error) {
      console.error('Failed to approve project:', error)
      showNotification('error', 'Failed to approve project. Please try again.')
    }
  }

  const handleRequestChanges = async (projectId: string) => {
    try {
      const response = await apiClient.post(`/projects/${projectId}/request-changes`, {
        message: 'Please review and provide feedback on required changes.'
      })
      showNotification('success', 'Changes requested successfully!')
      // Refresh data
      const projectsData = await apiClient.get('/projects')
      setProjects(projectsData.projects || projectsData)
    } catch (error) {
      console.error('Failed to request changes:', error)
      showNotification('error', 'Failed to request changes. Please try again.')
    }
  }

  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [issuanceToReject, setIssuanceToReject] = useState<string | null>(null)

  const handleApproveIssuance = async (issuanceId: string) => {
    try {
      await apiClient.post(`/issuances/${issuanceId}/approve`, {})

      // Refresh data
      const issuancesData = await apiClient.get('/issuances')
      setIssuanceRequests(issuancesData.issuances || issuancesData)
      showNotification('success', 'Issuance approved successfully!')
    } catch (error) {
      console.error('Failed to approve issuance:', error)
      showNotification('error', 'Failed to approve issuance. Please try again.')
    }
  }

  const handleRejectIssuance = (issuanceId: string) => {
    setIssuanceToReject(issuanceId)
    setShowRejectionModal(true)
  }

  const confirmRejectIssuance = async () => {
    if (!issuanceToReject || !rejectionReason.trim()) {
      showNotification('error', 'Please provide a rejection reason.')
      return
    }

    try {
      await apiClient.post(`/issuances/${issuanceToReject}/reject`, {
        reason: rejectionReason
      })

      // Refresh data
      const issuancesData = await apiClient.get('/issuances')
      setIssuanceRequests(issuancesData.issuances || issuancesData)
      showNotification('success', 'Issuance rejected successfully!')
      
      // Close modal and reset
      setShowRejectionModal(false)
      setIssuanceToReject(null)
      setRejectionReason('')
    } catch (error) {
      console.error('Failed to reject issuance:', error)
      showNotification('error', 'Failed to reject issuance. Please try again.')
    }
  }

  const handleViewProjectDetails = async (projectId: string) => {
    try {
      const projectData = await apiClient.get(`/projects/${projectId}`)
      setSelectedProject(projectData)
    } catch (error) {
      console.error('Failed to fetch project details:', error)
    }
  }

  const handleEditProject = async (projectId: string) => {
    try {
      const projectData = await apiClient.get(`/projects/${projectId}`)
      
      // Check if project is approved
      if (projectData.status === 'APPROVED') {
        showNotification('error', 'Cannot edit approved projects. Only draft and under review projects can be edited.')
        return
      }
      
      setSelectedProject(projectData)
      setEditFormData({
        title: projectData.title,
        description: projectData.description,
        status: projectData.status
      })
      setShowEditModal(true)
    } catch (error) {
      console.error('Failed to fetch project details:', error)
    }
  }

  const handleSaveProject = async () => {
    if (!selectedProject) return
    
    setSaving(true)
    try {
      await apiClient.patch(`/projects/${selectedProject.id}`, {
        title: editFormData.title,
        description: editFormData.description,
        status: editFormData.status
      })
      
      // Refresh projects list
      const projectsData = await apiClient.get('/projects')
      setProjects(projectsData.projects || projectsData)
      
      setShowEditModal(false)
      setSelectedProject(null)
      showNotification('success', 'Project updated successfully!')
    } catch (error) {
      console.error('Failed to update project:', error)
      showNotification('error', 'Failed to update project. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'secondary'
      case 'UNDER_REVIEW': return 'warning'
      case 'APPROVED': return 'success'
      case 'PENDING': return 'warning'
      case 'FINALIZED': return 'success'
      case 'REJECTED': return 'destructive'
      default: return 'default'
    }
  }

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const pendingIssuances = issuanceRequests.filter(req => req.status === 'UNDER_REVIEW')
  const pendingProjectReviews = projects.filter(p => p.status === 'UNDER_REVIEW')

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading admin dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-lg border-l-4 shadow-sm animate-in slide-in-from-top-2 duration-300 ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-400 text-green-800' 
            : notification.type === 'error'
            ? 'bg-red-50 border-red-400 text-red-800'
            : 'bg-blue-50 border-blue-400 text-blue-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {notification.type === 'success' && (
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              )}
              {notification.type === 'error' && (
                <XCircle className="h-5 w-5 mr-2 text-red-600" />
              )}
              {notification.type === 'info' && (
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-gray-400 hover:text-gray-600 ml-4 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
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
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingProjectReviews.length}</div>
            <p className="text-xs text-muted-foreground">
              Projects under review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Issuances</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingIssuances.length}</div>
            <p className="text-xs text-muted-foreground">
              Issuance requests awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((projects || []).reduce((sum, p) => 
                sum + (p.creditBatches || []).reduce((batchSum, batch) => batchSum + (batch.totalIssued || 0), 0), 0
              ) || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              tCO₂e issued
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(projects.map(p => p.organization.name)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Registered
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projects Under Review - Admin Verification Section */}
      {pendingProjectReviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Projects Under Review</span>
            </CardTitle>
            <CardDescription>
              Review and approve/reject projects awaiting verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingProjectReviews.map((project) => (
                <div key={project.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold">{project.title}</h4>
                        <Badge variant="warning">Under Review</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{project.description}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>Org: {project.organization.name}</span>
                        <span>Type: {project.organization.type}</span>
                        <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <ProjectDetailsModal project={project}>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </ProjectDetailsModal>
                      <Button 
                        size="sm" 
                        onClick={() => handleApproveProject(project.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleRequestChanges(project.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Request Changes
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Issuance Requests */}
      {pendingIssuances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Pending Issuance Requests</span>
            </CardTitle>
            <CardDescription>
              Review and approve/reject issuance requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingIssuances.map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h4 className="font-semibold">{request.project.title}</h4>
                      <p className="text-sm text-gray-600">
                        Organization: {request.project.organization.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        Requested Credits: {(request.quantity || 0).toLocaleString()} tCO₂e
                      </p>
                      <p className="text-xs text-gray-500">
                        Submitted: {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleApproveIssuance(request.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleRejectIssuance(request.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projects Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Projects Management</span>
          </CardTitle>
          <CardDescription>
            Manage all carbon credit projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search projects..."
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
            </div>

            {/* Projects List */}
                 <div className="space-y-3">
                   {filteredProjects.map((project) => (
                     <div key={project.id} className="border rounded-lg p-4">
                       <div className="flex justify-between items-start gap-4">
                         <div className="flex-1 min-w-0 space-y-2 min-h-[4rem]">
                           <div className="flex items-center space-x-2">
                             <h4 className="font-semibold truncate">{project.title}</h4>
                             <Badge variant={getStatusColor(project.status)}>
                               {project.status.replace('_', ' ')}
                             </Badge>
                           </div>
                           <div className="text-sm text-gray-600 h-10 overflow-hidden relative">
                             <div className="absolute inset-0" style={{
                               display: '-webkit-box',
                               WebkitLineClamp: 2,
                               WebkitBoxOrient: 'vertical',
                               overflow: 'hidden',
                               lineHeight: '1.25rem'
                             }}>
                               {project.description}
                             </div>
                           </div>
                           <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                             <span>Org: {project.organization.name}</span>
                             <span>Type: {project.organization.type}</span>
                             <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                           </div>
                         </div>
                         <div className="flex-shrink-0 flex space-x-2 items-start pt-1">
                           <ProjectDetailsModal project={project}>
                             <Button size="sm" variant="outline">
                               View Details
                             </Button>
                           </ProjectDetailsModal>
                           <Button 
                             size="sm" 
                             variant="outline"
                             onClick={() => handleEditProject(project.id)}
                             disabled={project.status === 'APPROVED'}
                             title={project.status === 'APPROVED' ? 'Cannot edit approved projects' : 'Edit project'}
                           >
                             <Edit className="h-4 w-4 mr-1" />
                             Edit
                           </Button>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
          </div>
        </CardContent>
      </Card>

      {/* Rejection Reason Modal */}
      {showRejectionModal && issuanceToReject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Reject Issuance Request</CardTitle>
              <CardDescription>
                Please provide a reason for rejecting this issuance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rejectionReason">Rejection Reason</Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter the reason for rejection..."
                    rows={4}
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowRejectionModal(false)
                      setIssuanceToReject(null)
                      setRejectionReason('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={confirmRejectIssuance}
                    disabled={!rejectionReason.trim()}
                    variant="destructive"
                  >
                    Reject Issuance
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit Project</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedProject(null)
                }}
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Project Title</Label>
                <Input 
                  id="title"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <textarea 
                  id="description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 w-full p-2 border rounded-md"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={editFormData.status}
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedProject(null)
                    setEditFormData({ title: '', description: '', status: '' })
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveProject}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
