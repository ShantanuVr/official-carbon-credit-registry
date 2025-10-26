'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Plus, 
  TrendingUp,
  Clock,
  CheckCircle,
  Upload,
  Building,
  Edit,
  XCircle,
  Trash2,
  Info
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api'
import { ProjectDetailsModal } from '@/components/project-details-modal'

interface Project {
  id: string
  title: string
  description: string
  status: string
  country: string
  region: string
  methodology: string
  feedback?: string
  feedbackBy?: string
  feedbackAt?: string
  createdAt: string
  creditBatches: Array<{
    totalIssued: number
    totalRetired: number
    serialStart: number
    serialEnd: number
  }>
}

interface IssuanceRequest {
  id: string
  projectId: string
  status: string
  quantity: number
  vintageStart: number
  vintageEnd: number
  factorRef: string
  rejectionReason?: string
  rejectedAt?: string
  createdAt: string
  project: {
    title: string
  }
}

export function IssuerDashboard() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [issuanceRequests, setIssuanceRequests] = useState<IssuanceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [showCreateIssuance, setShowCreateIssuance] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    country: '',
    region: '',
    methodology: ''
  })
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)
  const [selectedIssuanceRequest, setSelectedIssuanceRequest] = useState<IssuanceRequest | null>(null)
  const [showIssuanceDetailsModal, setShowIssuanceDetailsModal] = useState(false)
  const [showEditIssuanceModal, setShowEditIssuanceModal] = useState(false)
  const [editingIssuance, setEditingIssuance] = useState<IssuanceRequest | null>(null)
  const [editIssuanceData, setEditIssuanceData] = useState({
    quantity: 0,
    vintageStart: 2024,
    vintageEnd: 2024,
    factorRef: ''
  })
  const [showDeleteIssuanceConfirm, setShowDeleteIssuanceConfirm] = useState(false)
  const [issuanceToDelete, setIssuanceToDelete] = useState<IssuanceRequest | null>(null)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showRetirementModal, setShowRetirementModal] = useState(false)
  const [selectedBatchForRetirement, setSelectedBatchForRetirement] = useState<any>(null)
  const [retirementForm, setRetirementForm] = useState({
    quantity: 0,
    reason: ''
  })

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4000) // Auto-hide after 4 seconds
  }

  const handleViewProjectDetails = async (projectId: string) => {
    try {
      const projectData = await apiClient.get(`/projects/${projectId}`)
      setSelectedProject(projectData as Project)
    } catch (error) {
      console.error('Failed to fetch project details:', error)
      showNotification('error', 'Failed to load project details.')
    }
  }

  const handleEditProject = async (projectId: string) => {
    try {
      const projectData = await apiClient.get(`/projects/${projectId}`) as Project
      
      // Check if project can be edited (only DRAFT or NEEDS_CHANGES projects)
      if (projectData.status !== 'DRAFT' && projectData.status !== 'NEEDS_CHANGES') {
        showNotification('error', 'Only draft or needs changes projects can be edited.')
        return
      }
      
      setSelectedProject(projectData)
      setEditFormData({
        title: projectData.title,
        description: projectData.description,
        country: projectData.country,
        region: projectData.region,
        methodology: projectData.methodology
      })
      setShowEditModal(true)
    } catch (error) {
      console.error('Failed to fetch project details:', error)
      showNotification('error', 'Failed to load project details.')
    }
  }

  const handleSaveProject = async () => {
    if (!selectedProject) return
    
    setSaving(true)
    try {
      await apiClient.patch(`/projects/${selectedProject.id}`, editFormData)
      
      // Refresh projects list
      const projectsData = await apiClient.get('/projects')
      setProjects((projectsData as any).projects || projectsData as Project[])
      
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

  const handleViewIssuanceDetails = (request: IssuanceRequest) => {
    setSelectedIssuanceRequest(request)
    setShowIssuanceDetailsModal(true)
  }

  const handleEditIssuance = (request: IssuanceRequest) => {
    setEditingIssuance(request)
    setEditIssuanceData({
      quantity: request.quantity,
      vintageStart: request.vintageStart,
      vintageEnd: request.vintageEnd,
      factorRef: request.factorRef
    })
    setShowEditIssuanceModal(true)
  }

  const handleSaveIssuance = async () => {
    if (!editingIssuance) return

    setSaving(true)
    try {
      await apiClient.patch(`/issuances/${editingIssuance.id}`, editIssuanceData)
      showNotification('success', 'Issuance request updated successfully!')
      setShowEditIssuanceModal(false)
      fetchData() // Refresh data
    } catch (error) {
      console.error('Failed to update issuance request:', error)
      showNotification('error', 'Failed to update issuance request. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteIssuance = (request: IssuanceRequest) => {
    setIssuanceToDelete(request)
    setShowDeleteIssuanceConfirm(true)
  }

  const confirmDeleteIssuance = async () => {
    if (!issuanceToDelete) return

    setDeleting(true)
    try {
      await apiClient.delete(`/issuances/${issuanceToDelete.id}`)
      showNotification('success', 'Issuance request deleted successfully!')
      setShowDeleteIssuanceConfirm(false)
      setIssuanceToDelete(null)
      fetchData() // Refresh data
    } catch (error) {
      console.error('Failed to delete issuance request:', error)
      showNotification('error', 'Failed to delete issuance request. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteProject = (project: Project) => {
    if (project.status !== 'DRAFT') {
      showNotification('error', 'Only draft projects can be deleted.')
      return
    }
    setProjectToDelete(project)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return
    
    setDeleting(true)
    try {
      await apiClient.delete(`/projects/${projectToDelete.id}`)
      
      // Refresh projects list
      const projectsData = await apiClient.get('/projects')
      setProjects((projectsData as any).projects || projectsData as Project[])
      
      setShowDeleteConfirm(false)
      setProjectToDelete(null)
      showNotification('success', 'Project deleted successfully!')
    } catch (error) {
      console.error('Failed to delete project:', error)
      showNotification('error', 'Failed to delete project. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleSubmitProject = async (project: Project) => {
    try {
      await apiClient.post(`/projects/${project.id}/submit`, {})
      
      // Refresh projects list
      const projectsData = await apiClient.get('/projects')
      setProjects((projectsData as any).projects || projectsData as Project[])
      
      showNotification('success', 'Project submitted for review successfully!')
    } catch (error) {
      console.error('Failed to submit project:', error)
      showNotification('error', 'Failed to submit project. Please try again.')
    }
  }

  const handleResubmitProject = async (project: Project) => {
    try {
      await apiClient.post(`/projects/${project.id}/submit`, {})
      
      // Refresh projects list
      const projectsData = await apiClient.get('/projects')
      setProjects((projectsData as any).projects || projectsData as Project[])
      
      showNotification('success', 'Project resubmitted for review successfully!')
    } catch (error) {
      console.error('Failed to resubmit project:', error)
      showNotification('error', 'Failed to resubmit project. Please try again.')
    }
  }

  const handleRetireCredits = (project: Project, batch: any) => {
    setSelectedBatchForRetirement({ project, batch })
    setRetirementForm({ quantity: 0, reason: '' })
    setShowRetirementModal(true)
  }

  const handleConfirmRetirement = async () => {
    if (!selectedBatchForRetirement) return
    if (retirementForm.quantity <= 0) {
      showNotification('error', 'Please enter a valid quantity')
      return
    }
    if (!retirementForm.reason.trim()) {
      showNotification('error', 'Please provide a retirement reason')
      return
    }

    try {
      // Create retirement via API
      await apiClient.post('/retirements', {
        batchId: selectedBatchForRetirement.batch.id,
        quantity: retirementForm.quantity,
        reason: retirementForm.reason
      })

      // Refresh projects
      const projectsData = await apiClient.get('/projects')
      setProjects((projectsData as any).projects || projectsData as Project[])
      
      setShowRetirementModal(false)
      setSelectedBatchForRetirement(null)
      showNotification('success', 'Credits retired successfully!')
    } catch (error) {
      console.error('Failed to retire credits:', error)
      showNotification('error', 'Failed to retire credits. Please try again.')
    }
  }

  // Form states
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    country: '',
    region: '',
    methodology: '',
    baselineRef: ''
  })

  const [newIssuance, setNewIssuance] = useState({
    projectId: '',
    quantity: 0,
    vintageStart: 2024,
    vintageEnd: 2024,
    factorRef: '',
    evidenceIds: [] as string[]
  })

  const fetchData = async () => {
    try {
      const [projectsData, issuancesData] = await Promise.all([
        apiClient.get('/projects'),
        apiClient.get('/issuances')
      ])

      const projects = (projectsData as any).projects || projectsData
      // For issuers, the API already filters by organization, so we show all projects
      setProjects(projects as Project[])

      const issuances = (issuancesData as any).issuances || issuancesData
      setIssuanceRequests(issuances as IssuanceRequest[])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await apiClient.post('/projects', newProject)

      setShowCreateProject(false)
      setNewProject({
        title: '',
        description: '',
        country: '',
        region: '',
        methodology: '',
        baselineRef: ''
      })
      
      // Refresh projects
      const projectsData = await apiClient.get('/projects')
      setProjects((projectsData as any).projects || projectsData as Project[])
      showNotification('success', 'Project created successfully!')
    } catch (error) {
      console.error('Failed to create project:', error)
      showNotification('error', 'Failed to create project. Please try again.')
    }
  }

  const handleCreateIssuance = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await apiClient.post('/issuances', newIssuance)

      setShowCreateIssuance(false)
      setNewIssuance({
        projectId: '',
        quantity: 0,
        vintageStart: 2024,
        vintageEnd: 2024,
        factorRef: '',
        evidenceIds: []
      })
      
      // Refresh issuances
      const issuancesData = await apiClient.get('/issuances')
      setIssuanceRequests((issuancesData as any).issuances || issuancesData as IssuanceRequest[])
      showNotification('success', 'Issuance request created successfully!')
    } catch (error) {
      console.error('Failed to create issuance:', error)
      showNotification('error', 'Failed to create issuance request. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'secondary'
      case 'UNDER_REVIEW': return 'warning'
      case 'APPROVED': return 'success'
      case 'NEEDS_CHANGES': return 'destructive'
      case 'PENDING': return 'warning'
      case 'FINALIZED': return 'success'
      case 'REJECTED': return 'destructive'
      default: return 'default'
    }
  }

  const myIssuanceRequests = issuanceRequests.filter(req => 
    projects.some(p => p.id === req.projectId)
  )

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading issuer dashboard...</p>
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
            <CardTitle className="text-sm font-medium">My Projects</CardTitle>
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
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.filter(p => p.status === 'UNDER_REVIEW').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Projects awaiting verifier review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Issuances</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {myIssuanceRequests.filter(req => req.status === 'DRAFT').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Issuance requests awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Issued</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(projects || []).reduce((sum, p) => 
                sum + (p.creditBatches || []).reduce((batchSum, batch) => batchSum + batch.totalIssued, 0), 0
              ).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              tCO₂e total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Retired</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(projects || []).reduce((sum, p) => 
                sum + (p.creditBatches || []).reduce((batchSum, batch) => batchSum + batch.totalRetired, 0), 0
              ).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              tCO₂e retired
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projects Needing Attention */}
      {projects.some(p => p.status === 'NEEDS_CHANGES') && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Action Required:</strong> You have {projects.filter(p => p.status === 'NEEDS_CHANGES').length} project(s) that need changes based on verifier feedback. Please review and update these projects.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Quick Actions</span>
          </CardTitle>
          <CardDescription>
            Create new projects and issuance requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button onClick={() => setShowCreateProject(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateIssuance(true)} 
              disabled={projects.filter(p => p.status === 'APPROVED').length === 0}
              title={projects.filter(p => p.status === 'APPROVED').length === 0 ? 'No approved projects available for issuance' : 'Request credit issuance'}
            >
              <Upload className="h-4 w-4 mr-2" />
              Request Issuance
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* My Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>My Projects</span>
          </CardTitle>
          <CardDescription>
            Manage your carbon credit projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projects.map((project) => (
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
                      <span>{project.region}, {project.country}</span>
                      <span>{project.methodology}</span>
                      <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span className="text-blue-600">
                        Issued: {(project.creditBatches || []).reduce((sum, batch) => sum + batch.totalIssued, 0).toLocaleString()} tCO₂e
                      </span>
                      <span className="text-purple-600">
                        Retired: {(project.creditBatches || []).reduce((sum, batch) => sum + batch.totalRetired, 0).toLocaleString()} tCO₂e
                      </span>
                    </div>
                    {project.status === 'NEEDS_CHANGES' && project.feedback && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex items-start">
                          <XCircle className="h-4 w-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-yellow-800 mb-1">Verifier Feedback:</p>
                            <p className="text-sm text-yellow-700">{project.feedback}</p>
                            {project.feedbackAt && (
                              <p className="text-xs text-yellow-600 mt-1">
                                {new Date(project.feedbackAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {/* Action buttons at bottom of card */}
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <div className="flex space-x-2">
                    <ProjectDetailsModal project={project}>
                      <Button size="sm" variant="outline">
                        <FileText className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </ProjectDetailsModal>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditProject(project.id)}
                      disabled={project.status === 'APPROVED' || project.status === 'UNDER_REVIEW'}
                      title={project.status === 'APPROVED' || project.status === 'UNDER_REVIEW' ? 'Cannot edit approved or under review projects' : 'Edit project'}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDeleteProject(project)}
                      disabled={project.status !== 'DRAFT'}
                      title={project.status !== 'DRAFT' ? 'Only draft projects can be deleted' : 'Delete project'}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                  {/* Primary action button on the right */}
                  <div>
                    {project.status === 'DRAFT' && (
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handleSubmitProject(project)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Submit
                      </Button>
                    )}
                    {project.status === 'NEEDS_CHANGES' && (
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handleResubmitProject(project)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resubmit
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* My Issuance Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>My Issuance Requests</span>
          </CardTitle>
          <CardDescription>
            Track your issuance request status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {myIssuanceRequests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h4 className="font-semibold">{request.project.title}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                        <span className="text-sm text-gray-600">
                          {request.quantity?.toLocaleString() || 0} tCO₂e
                        </span>
                    </div>
                    {request.status === 'REJECTED' && request.rejectionReason && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-start">
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-red-800 mb-1">Rejection Reason:</p>
                            <p className="text-sm text-red-700">{request.rejectionReason}</p>
                            {request.rejectedAt && (
                              <p className="text-xs text-red-600 mt-1">
                                Rejected on: {new Date(request.rejectedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      Submitted: {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewIssuanceDetails(request)}
                    >
                      View Details
                    </Button>
                    {request.status === 'DRAFT' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditIssuance(request)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteIssuance(request)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Available Credits for Retirement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>My Credit Holdings</span>
          </CardTitle>
          <CardDescription>
            View and retire carbon credits from your approved projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projects.filter(p => p.status === 'APPROVED' && (p.creditBatches || []).length > 0).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No credit batches available yet. Credits will appear here once your projects are approved and finalized.</p>
              </div>
            ) : (
              projects
                .filter(p => p.status === 'APPROVED')
                .map((project) => {
                  const batch = project.creditBatches?.[0]
                  if (!batch) return null
                  const available = batch.totalIssued - batch.totalRetired
                  if (available <= 0) return null
                  
                  return (
                    <div key={project.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h4 className="font-semibold">{project.title}</h4>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-blue-600">
                              Total Issued: {batch.totalIssued.toLocaleString()} tCO₂e
                            </span>
                            <span className="text-purple-600">
                              Retired: {batch.totalRetired.toLocaleString()} tCO₂e
                            </span>
                            <span className="text-green-600 font-semibold">
                              Available: {available.toLocaleString()} tCO₂e
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Serial Range: {batch.serialStart} - {batch.serialEnd}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleRetireCredits(project, batch)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Retire Credits
                        </Button>
                      </div>
                    </div>
                  )
                })
                .filter(Boolean)
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Create New Project</CardTitle>
              <CardDescription>
                Submit a new carbon credit project for review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Project Title</Label>
                    <Input
                      id="title"
                      value={newProject.title}
                      onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="methodology">Methodology</Label>
                    <Input
                      id="methodology"
                      value={newProject.methodology}
                      onChange={(e) => setNewProject({...newProject, methodology: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newProject.description}
                    onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={newProject.country}
                      onChange={(e) => setNewProject({...newProject, country: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="region">Region</Label>
                    <Input
                      id="region"
                      value={newProject.region}
                      onChange={(e) => setNewProject({...newProject, region: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="baselineRef">Baseline Reference (Optional)</Label>
                  <Input
                    id="baselineRef"
                    value={newProject.baselineRef}
                    onChange={(e) => setNewProject({...newProject, baselineRef: e.target.value})}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateProject(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Project</Button>
                </div>
              </form>
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
                  setEditFormData({ title: '', description: '', country: '', region: '', methodology: '' })
                }}
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="editTitle">Project Title</Label>
                <Input 
                  id="editTitle"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Textarea 
                  id="editDescription"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editCountry">Country</Label>
                  <Input 
                    id="editCountry"
                    value={editFormData.country}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, country: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="editRegion">Region</Label>
                  <Input 
                    id="editRegion"
                    value={editFormData.region}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, region: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="editMethodology">Methodology</Label>
                <Input 
                  id="editMethodology"
                  value={editFormData.methodology}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, methodology: e.target.value }))}
                  className="mt-1"
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedProject(null)
                    setEditFormData({ title: '', description: '', country: '', region: '', methodology: '' })
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

      {/* Create Issuance Modal */}
      {showCreateIssuance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Request Credit Issuance</CardTitle>
              <CardDescription>
                Submit a request for credit issuance from approved projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateIssuance} className="space-y-4">
                <div>
                  <Label htmlFor="projectId">Project</Label>
                  <Select value={newIssuance.projectId} onValueChange={(value) => setNewIssuance({...newIssuance, projectId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select approved project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.filter(project => project.status === 'APPROVED').length > 0 ? (
                        projects.filter(project => project.status === 'APPROVED').map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.title}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          No approved projects available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Only approved projects can have issuance requests created
                  </p>
                </div>
                <div>
                  <Label htmlFor="quantity">Requested Credits</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={newIssuance.quantity}
                    onChange={(e) => setNewIssuance({...newIssuance, quantity: parseInt(e.target.value)})}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vintageStart">Vintage Start Year</Label>
                    <Input
                      id="vintageStart"
                      type="number"
                      min="2000"
                      max="2100"
                      value={newIssuance.vintageStart}
                      onChange={(e) => setNewIssuance({...newIssuance, vintageStart: parseInt(e.target.value)})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="vintageEnd">Vintage End Year</Label>
                    <Input
                      id="vintageEnd"
                      type="number"
                      min="2000"
                      max="2100"
                      value={newIssuance.vintageEnd}
                      onChange={(e) => setNewIssuance({...newIssuance, vintageEnd: parseInt(e.target.value)})}
                      required
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Label htmlFor="factorRef">Factor Reference</Label>
                    <div className="group relative inline-block">
                      <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                      <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-2 px-3 whitespace-normal w-64 z-50">
                        <div className="font-semibold mb-1">Emission Factor Reference</div>
                        <div className="text-gray-200">
                          A unique identifier for the conversion/emission factor used to calculate credits. This documents which methodology or rate was applied.
                        </div>
                        <div className="mt-2 text-gray-300">
                          <span className="font-semibold">Example:</span> factor_renewable_2024_v2.1
                        </div>
                        <div className="absolute left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </div>
                  </div>
                  <Input
                    id="factorRef"
                    type="text"
                    value={newIssuance.factorRef}
                    onChange={(e) => setNewIssuance({...newIssuance, factorRef: e.target.value})}
                    placeholder="factor_renewable_2024_v2.1"
                    required
                  />
                </div>
                <div className="text-sm text-gray-500">
                  <p>Note: Evidence files can be uploaded later. Leave empty for now.</p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateIssuance(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Submit Request</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Issuance Request Details Modal */}
      {showIssuanceDetailsModal && selectedIssuanceRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Issuance Request Details</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowIssuanceDetailsModal(false)
                  setSelectedIssuanceRequest(null)
                }}
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Project</Label>
                  <p className="text-sm">{selectedIssuanceRequest.project.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <div className="mt-1">
                    <Badge variant={getStatusColor(selectedIssuanceRequest.status)}>
                      {selectedIssuanceRequest.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Requested Credits</Label>
                  <p className="text-sm">{selectedIssuanceRequest.quantity?.toLocaleString() || 0} tCO₂e</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Submitted Date</Label>
                  <p className="text-sm">{new Date(selectedIssuanceRequest.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700">Request ID</Label>
                <p className="text-sm font-mono text-gray-600">{selectedIssuanceRequest.id}</p>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowIssuanceDetailsModal(false)
                    setSelectedIssuanceRequest(null)
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Issuance Modal */}
      {showEditIssuanceModal && editingIssuance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Edit Issuance Request</CardTitle>
              <CardDescription>
                Update the details of your issuance request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); handleSaveIssuance(); }} className="space-y-4">
                <div>
                  <Label htmlFor="editQuantity">Requested Credits</Label>
                  <Input
                    id="editQuantity"
                    type="number"
                    value={editIssuanceData.quantity}
                    onChange={(e) => setEditIssuanceData({...editIssuanceData, quantity: parseInt(e.target.value) || 0})}
                    min="1"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editVintageStart">Vintage Start</Label>
                    <Input
                      id="editVintageStart"
                      type="number"
                      value={editIssuanceData.vintageStart}
                      onChange={(e) => setEditIssuanceData({...editIssuanceData, vintageStart: parseInt(e.target.value) || 2024})}
                      min="2020"
                      max="2030"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="editVintageEnd">Vintage End</Label>
                    <Input
                      id="editVintageEnd"
                      type="number"
                      value={editIssuanceData.vintageEnd}
                      onChange={(e) => setEditIssuanceData({...editIssuanceData, vintageEnd: parseInt(e.target.value) || 2024})}
                      min="2020"
                      max="2030"
                      required
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Label htmlFor="editFactorRef">Factor Reference</Label>
                    <div className="group relative inline-block">
                      <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                      <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-2 px-3 whitespace-normal w-64 z-50">
                        <div className="font-semibold mb-1">Emission Factor Reference</div>
                        <div className="text-gray-200">
                          A unique identifier for the conversion/emission factor used to calculate credits. This documents which methodology or rate was applied.
                        </div>
                        <div className="mt-2 text-gray-300">
                          <span className="font-semibold">Example:</span> factor_renewable_2024_v2.1
                        </div>
                        <div className="absolute left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </div>
                  </div>
                  <Input
                    id="editFactorRef"
                    value={editIssuanceData.factorRef}
                    onChange={(e) => setEditIssuanceData({...editIssuanceData, factorRef: e.target.value})}
                    placeholder="factor_renewable_2024_v2.1"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditIssuanceModal(false)
                      setEditingIssuance(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Issuance Confirmation Modal */}
      {showDeleteIssuanceConfirm && issuanceToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <XCircle className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold">Delete Issuance Request</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the issuance request for <strong>{issuanceToDelete.project.title}</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline"
                onClick={() => {
                  setShowDeleteIssuanceConfirm(false)
                  setIssuanceToDelete(null)
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={confirmDeleteIssuance}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && projectToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Delete Project
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to delete <strong>"{projectToDelete.title}"</strong>? 
                This action cannot be undone.
              </p>
              
              <div className="flex justify-center space-x-3">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setProjectToDelete(null)
                  }}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={confirmDeleteProject}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Project'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Retirement Modal */}
      {showRetirementModal && selectedBatchForRetirement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex items-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
              <h3 className="text-lg font-semibold">Retire Carbon Credits</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Project: <strong>{selectedBatchForRetirement.project.title}</strong><br />
              Available: <strong>{selectedBatchForRetirement.batch.totalIssued - selectedBatchForRetirement.batch.totalRetired}</strong> tCO₂e
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="retirementQuantity">Quantity to Retire (tCO₂e)</Label>
                <Input
                  id="retirementQuantity"
                  type="number"
                  value={retirementForm.quantity}
                  onChange={(e) => setRetirementForm({...retirementForm, quantity: parseFloat(e.target.value) || 0})}
                  min="1"
                  max={selectedBatchForRetirement.batch.totalIssued - selectedBatchForRetirement.batch.totalRetired}
                  required
                />
              </div>
              <div>
                <Label htmlFor="retirementReason">Retirement Reason</Label>
                <Textarea
                  id="retirementReason"
                  value={retirementForm.reason}
                  onChange={(e) => setRetirementForm({...retirementForm, reason: e.target.value})}
                  placeholder="e.g., Corporate carbon neutrality initiative, voluntary offset"
                  rows={4}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button 
                variant="outline"
                onClick={() => {
                  setShowRetirementModal(false)
                  setSelectedBatchForRetirement(null)
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmRetirement}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Retire Credits
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
