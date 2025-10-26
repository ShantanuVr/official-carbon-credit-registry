#!/bin/bash
# Fresh EC2 Deployment for Official Carbon Credit Registry
# This script completely sets up a fresh EC2 instance (Amazon Linux or Ubuntu)

set -e

echo "🚀 Official Carbon Credit Registry - Fresh EC2 Deployment"
echo "=========================================================="

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    # Fallback detection
    if [ -f /etc/lsb-release ]; then
        OS="ubuntu"
    elif command -v apt-get &> /dev/null; then
        OS="debian"
    elif command -v yum &> /dev/null; then
        OS="amzn"
    else
        echo "❌ Cannot detect OS"
        exit 1
    fi
fi

echo "📌 Detected OS: $OS"

# Update system packages
echo "📦 Updating system packages..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo apt-get update -y
    sudo apt-get upgrade -y
elif [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
    sudo yum update -y
else
    echo "⚠️  Unknown OS, trying apt-get..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update -y
        sudo apt-get upgrade -y
        OS="debian"
    else
        echo "❌ Unsupported OS: $OS"
        exit 1
    fi
fi

# Install Docker
echo "📦 Installing Docker..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    # Install prerequisites
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    
    # Add Docker GPG key
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    
    # Add Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # Add ubuntu user to docker group
    sudo usermod -aG docker ubuntu
    
else
    # Amazon Linux
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -a -G docker ec2-user
fi

# Install Docker Compose (V1 - standalone)
echo "📦 Installing Docker Compose..."
DOCKER_COMPOSE_VERSION="2.20.0"
sudo curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify Docker Compose installation
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose installation failed"
    exit 1
fi

echo "✅ Docker Compose version: $(docker-compose --version)"

# Install Git
echo "📦 Installing Git..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo apt-get install -y git
else
    sudo yum install -y git
fi

# Determine user and home directory
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    USER_HOME="/home/ubuntu"
    USER_NAME="ubuntu"
else
    USER_HOME="/home/ec2-user"
    USER_NAME="ec2-user"
fi

# Clone repository
echo "📥 Cloning repository..."
cd "$USER_HOME"
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

# Check if user needs to be added to docker group
if ! groups | grep -q docker; then
    echo "⚠️  User not in docker group. Adding and refreshing..."
    sudo usermod -aG docker "$USER_NAME"
    # Apply new group membership without requiring logout
    newgrp docker <<EOF
docker-compose up -d
EOF
else
    docker-compose up -d
fi

# Wait for services to be ready
echo "⏳ Waiting for services to start (45 seconds)..."
sleep 45

# Check container status
echo "📊 Checking container status..."
docker-compose ps

# Run database migrations
echo "🗄️  Running database migrations and seeding..."

# Check if we're in docker group
if groups | grep -q docker; then
    docker-compose exec -T api sh -c "npm install -g pnpm && pnpm db:generate" || true
    docker-compose exec -T api sh -c "npm install -g pnpm && pnpm db:fresh" || true
    
    # Check container status
    echo "📊 Checking container status..."
    docker-compose ps
else
    echo "⚠️  Running with sudo due to permissions..."
    sudo docker-compose exec -T api sh -c "npm install -g pnpm && pnpm db:generate" || true
    sudo docker-compose exec -T api sh -c "npm install -g pnpm && pnpm db:fresh" || true
    
    echo "📊 Checking container status..."
    sudo docker-compose ps
fi

# Final status
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Final Status:"
docker-compose ps

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "unknown")

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

