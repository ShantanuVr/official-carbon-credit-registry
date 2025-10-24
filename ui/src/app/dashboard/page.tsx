'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Leaf, LogOut, User, Building, Activity } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { AdminDashboard } from '@/components/admin-dashboard'
import { IssuerDashboard } from '@/components/issuer-dashboard'
import { VerifierDashboard } from '@/components/verifier-dashboard'
import { ViewerDashboard } from '@/components/viewer-dashboard'
import { AuthorityBanner } from '@/components/authority-banner'

export default function DashboardPage() {
  const { user, loading, logout, isAuthenticated } = useAuth()
  const router = useRouter()

  // Handle redirect to login when not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'destructive'
      case 'VERIFIER': return 'warning'
      case 'ISSUER': return 'success'
      case 'VIEWER': return 'secondary'
      default: return 'default'
    }
  }

  const renderRoleDashboard = () => {
    switch (user.role) {
      case 'ADMIN':
        return <AdminDashboard />
      case 'ISSUER':
        return <IssuerDashboard />
      case 'VERIFIER':
        return <VerifierDashboard />
      case 'VIEWER':
        return <ViewerDashboard />
      default:
        return <ViewerDashboard />
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Leaf className="h-8 w-8 text-green-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Carbon Registry Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{user.name}</span>
                <Badge variant={getRoleColor(user.role)}>
                  {user.role}
                </Badge>
              </div>
              <Button variant="outline" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
        <AuthorityBanner />
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {renderRoleDashboard()}
      </main>
    </div>
  )
}
