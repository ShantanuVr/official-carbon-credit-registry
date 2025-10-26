#!/bin/bash
# EC2 Setup Script for Official Carbon Credit Registry
# This script sets up the environment on an EC2 instance

set -e

echo "🚀 Starting Official Carbon Credit Registry deployment..."

# Update system
sudo yum update -y

# Install Docker
echo "📦 Installing Docker..."
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
echo "📦 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Docker Compose plugin (v2)
echo "📦 Installing Docker Compose V2 plugin..."
mkdir -p ~/.docker/cli-plugins/
curl -SL https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m) -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose

# Install Git
echo "📦 Installing Git..."
sudo yum install -y git

# Install Node.js (for local development if needed)
echo "📦 Installing Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Clone repository if not already exists
if [ ! -d "/home/ec2-user/official-carbon-credit-registry" ]; then
    echo "📥 Cloning repository..."
    cd /home/ec2-user
    git clone https://github.com/ShantanuVr/official-carbon-credit-registry.git
fi

cd /home/ec2-user/official-carbon-credit-registry

# Set environment variables
echo "⚙️  Configuring environment..."

# Create API .env file
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

# Create UI .env file
cat > ui/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_REGISTRY_NAME=Official Carbon Credit Registry
EOF

# Pull latest changes
echo "🔄 Pulling latest changes..."
git pull origin main || echo "No repository found, using existing code"

# Start Docker services
echo "🐳 Starting Docker containers..."
# Check which docker-compose command is available
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    docker compose up -d
else
    echo "❌ Docker Compose not found. Installing..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    docker-compose up -d
fi

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Run database migrations
echo "🗄️  Running database migrations..."
# Use the correct docker-compose command based on what's installed
if command -v docker-compose &> /dev/null; then
    docker-compose exec -T api pnpm db:generate || true
    docker-compose exec -T api pnpm db:migrate || true
    docker-compose exec -T api pnpm db:fresh || docker-compose exec -T api pnpm db:seed:all || true
    echo "📊 Service Status:"
    docker-compose ps
else
    docker compose exec -T api pnpm db:generate || true
    docker compose exec -T api pnpm db:migrate || true
    docker compose exec -T api pnpm db:fresh || docker compose exec -T api pnpm db:seed:all || true
    echo "📊 Service Status:"
    docker compose ps
fi

# Deployment complete message
echo ""
echo "✅ Deployment complete!"

echo ""
echo "🌐 Access your application:"
echo "  - UI: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
echo "  - API: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):4000"
echo "  - API Health: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):4000/health"

