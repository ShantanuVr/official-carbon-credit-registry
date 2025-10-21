import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Leaf, MapPin, Calendar, Building } from 'lucide-react'

export default function ExplorerPage() {
  // Mock data for demonstration
  const projects = [
    {
      id: 'solar-farm-a',
      title: 'Solar Farm A - Renewable Energy Project',
      description: 'A 50MW solar photovoltaic power plant located in California, USA.',
      country: 'United States',
      region: 'California',
      methodology: 'ACM0002 - Grid-connected renewable electricity generation',
      status: 'DRAFT',
      creditsIssued: 0,
      creditsRetired: 0,
    },
    {
      id: 'solar-farm-b',
      title: 'Solar Farm B - Community Solar Initiative',
      description: 'A 25MW community solar project in Texas providing renewable energy.',
      country: 'United States',
      region: 'Texas',
      methodology: 'ACM0002 - Grid-connected renewable electricity generation',
      status: 'UNDER_REVIEW',
      creditsIssued: 0,
      creditsRetired: 0,
    },
    {
      id: 'wind-farm-c',
      title: 'Wind Farm C - Offshore Wind Project',
      description: 'A 100MW offshore wind farm in the North Sea generating clean electricity.',
      country: 'United Kingdom',
      region: 'North Sea',
      methodology: 'ACM0002 - Grid-connected renewable electricity generation',
      status: 'APPROVED',
      creditsIssued: 50000,
      creditsRetired: 5000,
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'secondary'
      case 'UNDER_REVIEW': return 'warning'
      case 'APPROVED': return 'success'
      case 'ACTIVE': return 'success'
      default: return 'default'
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
                Project Explorer
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline">Filter</Button>
              <Button>Search</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <section className="py-8 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-lg">Total Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">3</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-lg">Credits Issued</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">50,000</div>
                <p className="text-sm text-gray-600">tCO₂e</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-lg">Credits Retired</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">5,000</div>
                <p className="text-sm text-gray-600">tCO₂e</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-lg">Active Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">1</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Projects List */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">Carbon Credit Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
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
                        {project.creditsIssued.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Issued</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-purple-600">
                        {project.creditsRetired.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Retired</div>
                    </div>
                  </div>

                  <Button className="w-full" variant="outline">
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Leaf className="h-6 w-6 text-green-400" />
            <span className="font-bold">Official Carbon Credit Registry</span>
          </div>
          <p className="text-gray-400 text-sm">
            Demo/Education Platform - Not for Production Use
          </p>
        </div>
      </footer>
    </div>
  )
}
