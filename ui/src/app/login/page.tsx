'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Leaf, LogIn } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { login } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const success = await login(email, password)
    
    if (success) {
      router.push('/dashboard')
    } else {
      setError('Invalid credentials. Please try again.')
    }
    
    setLoading(false)
  }

  const fillDemoAccount = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail)
    setPassword(demoPassword)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Leaf className="h-8 w-8 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Carbon Registry
            </h1>
          </div>
          <CardTitle>Login to Registry Portal</CardTitle>
          <CardDescription>
            Access your carbon credit management dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </div>
              )}
            </Button>
          </form>

          {/* Demo Accounts */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Quick Demo Login</h3>
            <div className="space-y-2 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                   onClick={() => fillDemoAccount('admin@carbonregistry.test', 'password123')}>
                <div className="font-medium">Admin</div>
                <div className="text-gray-600">admin@carbonregistry.test</div>
                <div className="text-gray-500">Click to fill</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                   onClick={() => fillDemoAccount('verifier@carbonregistry.test', 'password123')}>
                <div className="font-medium">Verifier</div>
                <div className="text-gray-600">verifier@carbonregistry.test</div>
                <div className="text-gray-500">Click to fill</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                   onClick={() => fillDemoAccount('issuer@carbonregistry.test', 'password123')}>
                <div className="font-medium">Issuer</div>
                <div className="text-gray-600">issuer@carbonregistry.test</div>
                <div className="text-gray-500">Click to fill</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                   onClick={() => fillDemoAccount('viewer@carbonregistry.test', 'password123')}>
                <div className="font-medium">Viewer</div>
                <div className="text-gray-600">viewer@carbonregistry.test</div>
                <div className="text-gray-500">Click to fill</div>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              This is a demo platform. Click on demo accounts above to auto-fill credentials.
            </p>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}