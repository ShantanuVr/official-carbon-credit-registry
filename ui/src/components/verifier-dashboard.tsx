'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  CheckCircle, 
  XCircle,
  Clock,
  Eye,
  Upload,
  MessageSquare
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
  evidenceFiles: Array<{
    id: string
    filename: string
    uploadedAt: string
  }>
}

interface VerificationTask {
  id: string
  projectId: string
  status: string
  assignedAt: string
  project: Project
}

export function VerifierDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [verificationTasks, setVerificationTasks] = useState<VerificationTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewComment, setReviewComment] = useState('')
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
        const projectsData = await apiClient.get('/projects')
        const projects = projectsData.projects || projectsData
        setProjects(projects)
        
        // Create mock verification tasks for projects under review
        const tasks = projects
          .filter((p: Project) => p.status === 'UNDER_REVIEW')
          .map((project: Project) => ({
            id: `task-${project.id}`,
            projectId: project.id,
            status: 'PENDING',
            assignedAt: project.createdAt,
            project
          }))
        setVerificationTasks(tasks)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleStartReview = (project: Project) => {
    setSelectedProject(project)
    setShowReviewModal(true)
  }

  const handleSubmitReview = async (decision: 'APPROVE' | 'REJECT') => {
    if (!selectedProject) return

    try {
      if (decision === 'APPROVE') {
        await apiClient.post(`/projects/${selectedProject.id}/approve`, {})
      } else {
        await apiClient.post(`/projects/${selectedProject.id}/request-changes`, {
          message: reviewComment || 'Project rejected by verifier'
        })
      }

      setShowReviewModal(false)
      setReviewComment('')
      setSelectedProject(null)
      
      // Show success notification
      showNotification('success', `Project ${decision.toLowerCase()}d successfully!`)
      
      // Refresh data
      const projectsData = await apiClient.get('/projects')
      const projects = projectsData.projects || projectsData
      setProjects(projects)
      
      const tasks = projects
        .filter((p: Project) => p.status === 'UNDER_REVIEW')
        .map((project: Project) => ({
          id: `task-${project.id}`,
          projectId: project.id,
          status: 'PENDING',
          assignedAt: project.createdAt,
          project
        }))
      setVerificationTasks(tasks)
    } catch (error) {
      console.error('Failed to submit review:', error)
      showNotification('error', `Failed to ${decision.toLowerCase()} project. Please try again.`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'secondary'
      case 'UNDER_REVIEW': return 'warning'
      case 'APPROVED': return 'success'
      case 'PENDING': return 'warning'
      case 'COMPLETED': return 'success'
      case 'REJECTED': return 'destructive'
      default: return 'default'
    }
  }

  const pendingTasks = verificationTasks.filter(task => task.status === 'PENDING')
  const completedTasks = verificationTasks.filter(task => task.status === 'COMPLETED')

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading verifier dashboard...</p>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Reviews</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              Reviews completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground">
              In system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.filter(p => p.status === 'UNDER_REVIEW').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Projects
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Verification Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Pending Verification Tasks</span>
          </CardTitle>
          <CardDescription>
            Projects awaiting your review and verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingTasks.length === 0 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  No pending verification tasks at this time.
                </AlertDescription>
              </Alert>
            ) : (
              pendingTasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold">{task.project.title}</h4>
                        <Badge variant={getStatusColor(task.project.status)}>
                          {task.project.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{task.project.description}</p>
                      <div className="flex space-x-4 text-xs text-gray-500">
                        <span>Org: {task.project.organization.name}</span>
                        <span>Location: {task.project.region}, {task.project.country}</span>
                        <span>Methodology: {task.project.methodology}</span>
                      </div>
                      <div className="flex space-x-4 text-xs text-gray-500">
                        <span>Assigned: {new Date(task.assignedAt).toLocaleDateString()}</span>
                        <span>Evidence Files: {task.project.evidenceFiles?.length || 0}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleStartReview(task.project)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Completed Reviews */}
      {completedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Completed Reviews</span>
            </CardTitle>
            <CardDescription>
              Your completed verification tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completedTasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold">{task.project.title}</h4>
                        <Badge variant={getStatusColor(task.project.status)}>
                          {task.project.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{task.project.description}</p>
                      <div className="flex space-x-4 text-xs text-gray-500">
                        <span>Org: {task.project.organization.name}</span>
                        <span>Completed: {new Date(task.assignedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Review Project: {selectedProject.title}</CardTitle>
              <CardDescription>
                Review the project details and evidence before making a decision
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Project Details</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                    <p><strong>Description:</strong> {selectedProject.description}</p>
                    <p><strong>Location:</strong> {selectedProject.region}, {selectedProject.country}</p>
                    <p><strong>Methodology:</strong> {selectedProject.methodology}</p>
                    <p><strong>Organization:</strong> {selectedProject.organization.name} ({selectedProject.organization.type})</p>
                    <p><strong>Evidence Files:</strong> {selectedProject.evidenceFiles.length} files uploaded</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="reviewComment">Review Comments</Label>
                  <Textarea
                    id="reviewComment"
                    placeholder="Add your review comments, findings, and recommendations..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowReviewModal(false)
                      setReviewComment('')
                      setSelectedProject(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={() => handleSubmitReview('REJECT')}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button 
                    type="button"
                    onClick={() => handleSubmitReview('APPROVE')}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
