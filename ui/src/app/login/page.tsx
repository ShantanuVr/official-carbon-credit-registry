import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Leaf } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
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
          <div className="space-y-2">
            <h3 className="font-semibold">Demo Accounts</h3>
            <div className="space-y-2 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">Admin</div>
                <div className="text-gray-600">admin@registry.test</div>
                <div className="text-gray-500">Password: Admin@123</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">Verifier</div>
                <div className="text-gray-600">verifier1@registry.test</div>
                <div className="text-gray-500">Password: Admin@123</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">Issuer</div>
                <div className="text-gray-600">solarco@registry.test</div>
                <div className="text-gray-500">Password: Admin@123</div>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              This is a demo platform. Use the credentials above to explore different roles.
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
