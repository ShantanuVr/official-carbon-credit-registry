#!/bin/bash
# Fresh EC2 Deployment for Official Carbon Credit Registry
# This script completely sets up a fresh EC2 instance

set -e

echo "🚀 Official Carbon Credit Registry - Fresh EC2 Deployment"
echo "=========================================================="

# Update system
echo "📦 Updating system packages..."
sudo yum update -y

# Install Docker
echo "📦 Installing Docker..."
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user
sudo newgrp docker

# Install Docker Compose (V1)
echo "📦 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify Docker Compose installation
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose installation failed"
    exit 1
fi

echo "✅ Docker Compose version: $(docker-compose --version)"

# Install Git
echo "📦 Installing Git..."
sudo yum install -y git

# Clone repository
echo "📥 Cloning repository..."
cd /home/ec2-user
if [ -d "official-carbon-credit-registry" ]; then
    echo "⚠️  Repository exists, updating..."
    cd official-carbon-credit-registry
    git pull origin main
else
    git clone https://github.com/ShantanuVr/official-carbon-credit-registry.git
    cd official-carbon-credit-registry
fi

# Configure environment files
echo "⚙️  Configuring environment..."

# API environment
cat > api/.env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/carbon_registry
JWT_SECRET=your-super-secret-jwt-key-change-in-production-CHANGE-THIS
JWT_EXPIRES_IN=24h
SERVER_PORT=4000
SERVER_HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000
ADAPTER_URL=http://mock-adapter:3001
LOCKER_URL=http://mock-locker:3002
ORACLE_URL=http://mock-oracle:3003
REGISTRY_BRAND_NAME=Official Carbon Credit Registry
ENABLE_TOTP=false
READONLY_MODE=false
ALLOW_DEMO_UPLOAD_BYPASS=true
LOG_LEVEL=info
EOF

# UI environment
cat > ui/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_REGISTRY_NAME=Official Carbon Credit Registry
EOF

# Start Docker services
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start (45 seconds)..."
sleep 45

# Check container status
echo "📊 Checking container status..."
docker-compose ps

# Run database migrations
echo "🗄️  Running database migrations and seeding..."
docker-compose exec -T api sh -c "npm install -g pnpm && pnpm db:generate" || true
docker-compose exec -T api sh -c "npm install -g pnpm && pnpm db:fresh" || true

# Final status
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Final Status:"
docker-compose ps

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

echo ""
echo "🌐 Access your application:"
echo "  - UI: http://$PUBLIC_IP:3000"
echo "  - API: http://$PUBLIC_IP:4000"
echo "  - Health: http://$PUBLIC_IP:4000/health"
echo ""
echo "📝 Default accounts:"
echo "  - Admin: admin@carbonregistry.test / password123"
echo "  - Issuer: issuer@carbonregistry.test / password123"
echo "  - Verifier: verifier@carbonregistry.test / password123"
echo "  - Viewer: viewer@carbonregistry.test / password123"
echo ""
echo "🔍 To check logs:"
echo "  docker-compose logs -f api"
echo "  docker-compose logs -f ui"

