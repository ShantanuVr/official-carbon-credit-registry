#!/bin/bash

echo "🌱 Official Carbon Credit Registry Simulator Setup"
echo "=================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first:"
    echo "   npm install -g pnpm"
    exit 1
fi

echo "✅ pnpm is installed"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"

# Start Docker services
echo "🐳 Starting Docker services..."
docker compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Failed to start Docker services"
    exit 1
fi

echo "✅ Docker services started"

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "🗄️ Running database migrations..."
pnpm --filter api db:migrate

if [ $? -ne 0 ]; then
    echo "❌ Failed to run database migrations"
    exit 1
fi

echo "✅ Database migrations completed"

# Seed database
echo "🌱 Seeding database..."
pnpm --filter api db:seed:all

if [ $? -ne 0 ]; then
    echo "❌ Failed to seed database"
    exit 1
fi

echo "✅ Database seeded"

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Start the development servers:"
echo "   pnpm dev"
echo ""
echo "2. Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   API: http://localhost:4000"
echo "   API Health: http://localhost:4000/health"
echo ""
echo "3. Demo accounts:"
echo "   Admin: admin@registry.test / Admin@123"
echo "   Verifier: verifier1@registry.test / Admin@123"
echo "   Issuer: solarco@registry.test / Admin@123"
echo ""
echo "4. Run the happy path demo:"
echo "   pnpm --filter api run happy-path"
echo ""
echo "🌱 Happy coding!"
