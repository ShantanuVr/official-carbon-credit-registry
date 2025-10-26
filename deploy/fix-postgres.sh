#!/bin/bash
# Fix PostgreSQL container issue on EC2

echo "🔧 Fixing PostgreSQL container issues..."

# Navigate to project directory
PROJECT_DIR="/home/ec2-user/official-carbon-credit-registry"
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Project directory not found at $PROJECT_DIR"
    echo "Please clone the repository first:"
    echo "  cd /home/ec2-user"
    echo "  git clone https://github.com/ShantanuVr/official-carbon-credit-registry.git"
    exit 1
fi

cd "$PROJECT_DIR" || exit 1
echo "📂 Working directory: $(pwd)"

# Stop any running containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true

# Remove orphaned containers and volumes
echo "🧹 Cleaning up..."
docker-compose rm -f 2>/dev/null || true
docker volume ls | grep official-carbon-credit-registry | awk '{print $2}' | xargs docker volume rm 2>/dev/null || true

# Start PostgreSQL first
echo "🐘 Starting PostgreSQL container..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to start (30 seconds)..."
sleep 30

# Check PostgreSQL status
if docker-compose ps postgres | grep -q "Up"; then
    echo "✅ PostgreSQL is running!"
else
    echo "❌ PostgreSQL failed to start. Checking logs..."
    docker-compose logs postgres | tail -20
    echo ""
    echo "Trying to restart..."
    docker-compose restart postgres
    sleep 15
fi

# Now start all services
echo "🚀 Starting all services..."
docker-compose up -d

# Check status
echo ""
echo "📊 Container Status:"
docker-compose ps

# Show logs if there are errors
if docker-compose ps | grep -q "Error"; then
    echo ""
    echo "❌ Some containers have errors. Logs:"
    docker-compose logs | tail -50
fi

