# AWS Deployment Guide

This guide will help you deploy the Official Carbon Credit Registry to AWS.

## Architecture Overview

### Recommended Architecture (Option 1: AWS App Runner)

```
┌─────────────────────────────────────────────────────────┐
│                    AWS Cloud                             │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         CloudFront Distribution                 │    │
│  │  (CDN for static assets + Next.js)             │    │
│  └──────────────────┬─────────────────────────────┘    │
│                     │                                    │
│  ┌──────────────────┴─────────────────────────────┐    │
│  │        AWS App Runner                          │    │
│  │  ┌──────────────┐       ┌──────────────┐      │    │
│  │  │   Next.js UI │       │  Fastify API │      │    │
│  │  │   (Port 3000)│◄─────►│  (Port 4000) │      │    │
│  │  └──────────────┘       └──────────────┘      │    │
│  └──────────────────┬─────────────────────────────┘    │
│                     │                                    │
│  ┌──────────────────┴─────────────────────────────┐    │
│  │      RDS PostgreSQL Database                     │    │
│  │   (Multi-AZ for production)                     │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐  │
│  │         AWS Secrets Manager                      │  │
│  │   (Database credentials, JWT secrets)            │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Budget-Friendly Architecture (Option 2: Single EC2)

```
┌─────────────────────────────────────────────────────────┐
│                  AWS EC2 Instance                      │
│                   (t3.medium)                          │
│                                                          │
│  ┌────────────────────────────────────────────────┐   │
│  │         Docker Compose                          │   │
│  │  ┌─────────────┐    ┌─────────────┐           │   │
│  │  │ Next.js UI  │    │ Fastify API  │           │   │
│  │  │             │    │              │           │   │
│  │  └─────────────┘    └─────────────┘           │   │
│  │           │                │                     │   │
│  │           └────────┬───────┘                     │   │
│  │                   │                              │   │
│  │  ┌────────────────┴─────────────────┐           │   │
│  │  │  PostgreSQL (Docker container)   │           │   │
│  │  └──────────────────────────────────┘           │   │
│  └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Option 1: AWS App Runner Deployment (Recommended)

### Prerequisites
- AWS Account
- AWS CLI installed and configured
- Docker installed locally

### Step 1: Create Dockerfile for Production

Create `api/Dockerfile.prod`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

FROM node:20-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Expose port
EXPOSE 4000

CMD ["npm", "start"]
```

Create `ui/Dockerfile.prod`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

### Step 2: Set Up RDS Database

```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier carbon-registry-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16 \
  --master-username postgres \
  --master-user-password YourSecurePassword123! \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name default
```

### Step 3: Create ECR Repositories

```bash
# Create repositories
aws ecr create-repository --repository-name carbon-registry-api
aws ecr create-repository --repository-name carbon-registry-ui

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

# Build and push images
docker build -f api/Dockerfile.prod -t carbon-registry-api .
docker build -f ui/Dockerfile.prod -t carbon-registry-ui .

docker tag carbon-registry-api:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/carbon-registry-api:latest
docker tag carbon-registry-ui:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/carbon-registry-ui:latest

docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/carbon-registry-api:latest
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/carbon-registry-ui:latest
```

### Step 4: Create App Runner Services

Create `apprunner-api.json`:

```json
{
  "ServiceName": "carbon-registry-api",
  "SourceConfiguration": {
    "AuthenticationConfiguration": {
      "AccessRoleArn": "arn:aws:iam::ACCOUNT:role/AppRunnerECRAccessRole"
    },
    "ImageRepository": {
      "ImageIdentifier": "YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/carbon-registry-api:latest",
      "ImageConfiguration": {
        "Port": "4000",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "DATABASE_URL": "postgresql://postgres:password@RDS_ENDPOINT:5432/carbon_registry",
          "JWT_SECRET": "your-jwt-secret"
        }
      }
    }
  },
  "InstanceConfiguration": {
    "Cpu": "1 vCPU",
    "Memory": "2 GB"
  }
}
```

Create `apprunner-ui.json`:

```json
{
  "ServiceName": "carbon-registry-ui",
  "SourceConfiguration": {
    "ImageRepository": {
      "ImageIdentifier": "YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/carbon-registry-ui:latest",
      "ImageConfiguration": {
        "Port": "3000",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "NEXT_PUBLIC_API_URL": "https://API_APPRUNNER_URL"
        }
      }
    }
  },
  "InstanceConfiguration": {
    "Cpu": "1 vCPU",
    "Memory": "2 GB"
  }
}
```

```bash
# Create API service
aws apprunner create-service --cli-input-json file://apprunner-api.json

# Create UI service
aws apprunner create-service --cli-input-json file://apprunner-ui.json
```

## Option 2: EC2 + Docker Compose (Budget-Friendly)

### Prerequisites
- AWS Account
- AWS CLI installed
- Key pair for EC2 access

### Step 1: Launch EC2 Instance

```bash
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --user-data file://setup.sh
```

Create `setup.sh` for EC2 user data:

```bash
#!/bin/bash
# Install Docker
yum update -y
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git
yum install -y git

# Clone repository
cd /home/ec2-user
git clone https://github.com/ShantanuVr/official-carbon-credit-registry.git
cd official-carbon-credit-registry

# Configure environment
cat > api/.env << EOF
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/carbon_registry
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
SERVER_PORT=4000
SERVER_HOST=0.0.0.0
CORS_ORIGIN=http://YOUR_DOMAIN
ADAPTER_URL=http://mock-adapter:3001
LOCKER_URL=http://mock-locker:3002
ORACLE_URL=http://mock-oracle:3003
REGISTRY_BRAND_NAME=Official Carbon Credit Registry
ENABLE_TOTP=false
READONLY_MODE=false
ALLOW_DEMO_UPLOAD_BYPASS=true
LOG_LEVEL=info
EOF

cat > ui/.env.local << EOF
NEXT_PUBLIC_API_URL=http://YOUR_API_DOMAIN:4000
NEXT_PUBLIC_REGISTRY_NAME=Official Carbon Credit Registry
EOF

# Start services
docker compose up -d

# Run migrations
docker compose exec api pnpm db:migrate
docker compose exec api pnpm db:seed:all
```

### Step 2: Configure Security Groups

```bash
# Allow SSH
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

# Allow HTTP
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Allow HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

### Step 3: Set Up Domain and SSL

```bash
# Install Certbot
sudo yum install certbot python3-certbot-nginx -y

# Generate SSL certificate
sudo certbot --nginx -d your-domain.com
```

## Option 3: AWS Amplify (Simplest for Frontend)

### Deploy UI to Amplify

1. Go to AWS Amplify Console
2. Create new app → Host web app
3. Connect GitHub repository
4. Configure build settings:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### Deploy API to Lambda

For API, use AWS Lambda + API Gateway:

1. Convert Fastify to Lambda-compatible handler
2. Use `@fastify/aws-lambda`
3. Deploy via Serverless Framework or SAM

## Cost Estimates

### Option 1 (App Runner)
- RDS db.t3.micro: ~$15/month
- App Runner (2 services): ~$20/month
- CloudFront: ~$1/month
- **Total: ~$36/month**

### Option 2 (EC2)
- EC2 t3.medium: ~$30/month
- Domain + SSL: ~$5/month
- **Total: ~$35/month**

### Option 3 (Amplify + Lambda)
- Amplify Hosting: Free tier available
- Lambda: ~$5/month
- RDS: ~$15/month
- **Total: ~$20/month**

## Next Steps

1. Choose your preferred option
2. Set up AWS credentials
3. Run the deployment commands
4. Configure domain and SSL
5. Test the application

## Support

For issues or questions:
- Review AWS documentation
- Check CloudWatch logs
- Test health endpoints
- Review security groups

