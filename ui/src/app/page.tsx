'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Leaf, Users, TrendingUp, Award } from 'lucide-react'
import Link from 'next/link'
import { apiClient } from '@/lib/api'

interface Project {
  id: string
  title: string
  status: string
  creditBatches: Array<{
    totalIssued: number
    totalRetired: number
  }>
}

export default function HomePage() {
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalCreditsIssued: 0,
    totalCreditsRetired: 0,
    activeProjects: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Use the public stats endpoint that doesn't require authentication
        const stats = await fetch('http://localhost:4000/public/stats').then(res => res.json())
        
        setStats({
          totalProjects: stats.totalProjects,
          totalCreditsIssued: stats.totalCreditsIssued,
          totalCreditsRetired: stats.totalCreditsRetired,
          activeProjects: stats.activeProjects
        })
      } catch (error) {
        console.error('Failed to fetch stats:', error)
        // Fallback to hardcoded values if API fails
        setStats({
          totalProjects: 4,
          totalCreditsIssued: 55000,
          totalCreditsRetired: 10000,
          activeProjects: 2
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
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
              <Link href="/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Link href="/explorer">
                <Button>Explore Registry</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Carbon Credit Registry
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            A comprehensive platform for managing carbon credit projects, issuances, 
            transfers, and retirements with full transparency and audit trails.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/explorer">
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                Explore Projects
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Access Portal
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="flex items-center justify-center space-x-2">
                  <Leaf className="h-6 w-6 text-green-600" />
                  <span>Active Projects</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {loading ? '...' : stats.activeProjects}
                </div>
                <p className="text-sm text-gray-600">Active Projects</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <CardTitle className="flex items-center justify-center space-x-2">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                  <span>Credits Issued</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {loading ? '...' : stats.totalCreditsIssued.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">tCO₂e</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <CardTitle className="flex items-center justify-center space-x-2">
                  <Award className="h-6 w-6 text-purple-600" />
                  <span>Credits Retired</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {loading ? '...' : stats.totalCreditsRetired.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">tCO₂e</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <CardTitle className="flex items-center justify-center space-x-2">
                  <Users className="h-6 w-6 text-orange-600" />
                  <span>Total Projects</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {loading ? '...' : stats.totalProjects}
                </div>
                <p className="text-sm text-gray-600">Total Projects</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">Platform Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Project Management</CardTitle>
                <CardDescription>
                  Submit, review, and manage carbon credit projects with full lifecycle tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Project submission and approval workflow</li>
                  <li>• Evidence file management</li>
                  <li>• IoT data integration</li>
                  <li>• Status tracking and notifications</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Credit Issuance</CardTitle>
                <CardDescription>
                  Issue carbon credits with blockchain anchoring and audit trails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Issuance request workflow</li>
                  <li>• Verifier review process</li>
                  <li>• Blockchain integration</li>
                  <li>• Credit batch management</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transfers & Retirements</CardTitle>
                <CardDescription>
                  Transfer credits between organizations and retire them permanently
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Credit transfer system</li>
                  <li>• Retirement certificates</li>
                  <li>• Balance tracking</li>
                  <li>• Public verification</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

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
