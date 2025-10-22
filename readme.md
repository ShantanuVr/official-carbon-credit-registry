# Official Carbon Credit Registry Simulator

[![GitHub](https://img.shields.io/badge/GitHub-ShantanuVr%2Fofficial--carbon--credit--registry-blue?style=flat-square&logo=github)](https://github.com/ShantanuVr/official-carbon-credit-registry)
[![License](https://img.shields.io/badge/License-Demo%2FEducation-green?style=flat-square)](https://github.com/ShantanuVr/official-carbon-credit-registry)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue?style=flat-square&logo=docker)](https://docs.docker.com/compose/)

A comprehensive simulation of an official carbon credit registry for demonstration and educational purposes. This platform manages the complete lifecycle of carbon credits from project submission to retirement.

> 🌱 **Demo Platform**: This is a simulation for demonstration and educational purposes. Not intended for production use with real carbon credits or financial transactions.

## 🌱 Features

- **Project Management**: Submit, review, and manage carbon credit projects with full CRUD operations
- **Issuance Workflow**: Complete issuance request and approval process with editing capabilities
- **Globally Unique Serial Numbers**: Each carbon credit has a globally unique serial number for tracking
- **Credit Transfers**: Transfer credits between organizations with serial allocation
- **Retirement System**: Retire credits permanently with certificate generation
- **Serial Range Tracking**: Track serial ranges owned by each organization
- **Role-Based Access**: Admin, Verifier, Issuer, and Viewer roles with proper permissions
- **Audit Trails**: Complete audit logging for all actions
- **Public Explorer**: Public access to approved projects and statistics
- **Certificate Generation**: Download certificates with complete serial number lists
- **Real-time Notifications**: User-friendly notification system for all actions
- **Responsive Design**: Modern UI with proper text truncation and alignment
- **Blockchain Integration**: Mock adapter for on-chain anchoring
- **Evidence Management**: File upload and integrity verification
- **IoT Integration**: Mock IoT oracle for real-time data

## 🏗️ Architecture

- **Backend**: Node.js + TypeScript + Fastify + Prisma + PostgreSQL
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL 16 with Prisma ORM
- **Authentication**: JWT with role-based access control
- **Mock Services**: Registry Adapter, Evidence Locker, IoT Oracle

## 🚀 Quick Start

### Repository
- **GitHub**: https://github.com/ShantanuVr/official-carbon-credit-registry
- **Live Demo**: Available via Docker Compose setup
- **Documentation**: Comprehensive setup and usage guide

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose

### Setup

#### Option 1: Automated Setup (Recommended)
```bash
git clone https://github.com/ShantanuVr/official-carbon-credit-registry.git
cd official-carbon-credit-registry
chmod +x setup.sh
./setup.sh
```

#### Option 2: Manual Setup
1. **Clone and install dependencies**:
   ```bash
   git clone https://github.com/ShantanuVr/official-carbon-credit-registry.git
   cd official-carbon-credit-registry
   pnpm install
   ```

2. **Start services with Docker Compose**:
   ```bash
   docker compose up -d
   ```

3. **Run database migrations and seed data**:
   ```bash
   pnpm db:migrate
   pnpm db:seed:all
   ```

4. **Start development servers**:
   ```bash
   pnpm dev
   ```

5. **Access the application**:
   - Frontend: http://localhost:3000
   - API: http://localhost:4000
   - API Health: http://localhost:4000/health

## 👥 Demo Accounts

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| Admin | admin@registry.test | Admin@123 | Full system access |
| Verifier | verifier1@registry.test | Admin@123 | Project/issuance review |
| Verifier | verifier2@registry.test | Admin@123 | Project/issuance review |
| Issuer | solarco@registry.test | Admin@123 | SolarCo Energy projects |
| Issuer | greengen@registry.test | Admin@123 | GreenGen Solutions projects |

## 📊 Demo Data

The seed script creates:
- **3 Organizations**: SolarCo Energy, GreenGen Solutions, CarbonVerify Ltd
- **3 Projects**: Solar Farm A (DRAFT), Solar Farm B (UNDER_REVIEW), Wind Farm C (APPROVED)
- **Evidence Files**: Project documentation with SHA256 hashes
- **Issuance Request**: Wind Farm C issuance ready for approval
- **Credit Batch**: Wind Farm C with 30,000 credits (globally unique serial range)
- **Serial Ranges**: Organization-specific serial range ownership with global uniqueness
- **Retirement Record**: 5,000 credits retired with proper serial allocation
- **Global Serial Counter**: Maintains globally unique serial numbers across all projects

## 🔄 Happy Path Demo

Run the complete workflow demonstration:

```bash
pnpm --filter api run happy-path
```

This script demonstrates:
1. Issuer creates and submits a project
2. Verifier reviews and approves the project
3. Issuer creates and submits an issuance request
4. Verifier approves the issuance request
5. Admin finalizes the issuance (creates credit batch with globally unique serial range)
6. Issuer retires some credits (retires credits with proper serial allocation, generates certificate)
7. Public certificate is available for viewing with complete serial number information
8. All serial numbers are globally unique across the entire registry

## 🏛️ Project Lifecycle

### Project States
- **DRAFT** → **SUBMITTED** → **UNDER_REVIEW** → **NEEDS_CHANGES** ↺ → **APPROVED**

### Issuance States
- **DRAFT** → **SUBMITTED** → **UNDER_REVIEW** → **NEEDS_CHANGES** ↺ → **APPROVED** → **FINALIZED**

## 🔢 Serial Number System

### Globally Unique Serial Numbers
Each carbon credit has a globally unique serial number across the entire registry for complete traceability:

- **Global Serial Range**: Contiguous numbers across all projects (30001, 30002, 30003...)
- **Global Counter**: Single counter maintains uniqueness across all batches
- **Batch Assignment**: Each batch gets a globally unique serial range
- **Organization Tracking**: Serial ranges are owned by specific organizations
- **Transfer Allocation**: Serial ranges are allocated during transfers
- **Retirement Tracking**: Retired serials are permanently removed from circulation
- **No Duplicates**: Impossible to have duplicate serial numbers across projects

### Serial Format
- **Internal Format**: Simple numbers (1, 2, 3, 4...)
- **Display Format**: Zero-padded ranges (00000001-00001000)
- **Human-Readable**: `SIM-REG-PROJECT-VINTAGE-BATCH-SERIALS`

### Serial Range Management
- **Initial Allocation**: Globally unique serial range created when batch is finalized
- **Transfer Allocation**: Serial ranges allocated from sender's holdings
- **Retirement Allocation**: Contiguous serial ranges allocated for retirement
- **Range Splitting**: Automatic splitting when partial transfers occur
- **Range Merging**: Automatic merging of contiguous ranges when possible
- **Global Counter**: Atomic counter ensures no duplicate serial numbers

## 🔐 Role-Based Access Control

| Feature | Admin | Verifier | Issuer | Viewer |
|---------|-------|----------|--------|--------|
| Create Project | ✓ | – | ✓ | – |
| Edit Project | ✓ | – | ✓ (DRAFT only) | – |
| Delete Project | ✓ | – | ✓ (DRAFT only) | – |
| Submit Evidence | ✓ | c | ✓ | – |
| Review/Approve Project | ✓ | ✓ | – | – |
| Request Issuance | ✓ | – | ✓ | – |
| Edit Issuance | ✓ | – | ✓ (DRAFT only) | – |
| Delete Issuance | ✓ | – | ✓ (DRAFT only) | – |
| Approve Issuance | ✓ | ✓ | – | – |
| Transfer Credits | ✓ | – | ✓ | – |
| Retire Credits | ✓ | – | ✓ | – |
| Download Certificates | ✓ | ✓ | ✓ | ✓ |
| View Explorer/Reports | ✓ | ✓ | ✓ | ✓ |
| Manage Users/Policies | ✓ | – | – | – |

*(c = comment only)*

## 🌐 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - User logout
- `GET /auth/me` - Current user info

### Projects
- `GET /projects` - List projects (with filtering)
- `POST /projects` - Create project
- `GET /projects/:id` - Get project details
- `PATCH /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project (DRAFT only)
- `POST /projects/:id/submit` - Submit for review
- `POST /projects/:id/approve` - Approve project
- `POST /projects/:id/request-changes` - Request changes

### Issuances
- `GET /issuances` - List issuances
- `POST /issuances` - Create issuance request
- `GET /issuances/:id` - Get issuance details
- `PATCH /issuances/:id` - Update issuance request (DRAFT only)
- `DELETE /issuances/:id` - Delete issuance request (DRAFT only)
- `POST /issuances/:id/submit` - Submit for review
- `POST /issuances/:id/approve` - Approve issuance
- `POST /issuances/:id/finalize` - Finalize issuance (Admin only)

### Public Endpoints
- `GET /public/stats` - Registry statistics (no auth required)
- `GET /public/projects` - Approved projects for public viewing

### Credits
- `GET /credits/balance` - Get credit balance
- `GET /credits/holdings` - Get credit holdings with serial ranges
- `POST /credits/transfer` - Transfer credits with serial allocation
- `POST /credits/retire` - Retire credits with serial allocation

### Reports
- `GET /reports/registry-stats` - Registry statistics
- `GET /retirements/:certificateId` - Retirement certificate

## 🔧 Development

### Project Structure
```
official-registry-sim/
├── api/                    # Backend API
│   ├── src/
│   │   ├── modules/        # Feature modules
│   │   ├── lib/           # Utilities
│   │   └── prisma/        # Database schema & seeds
│   └── prisma/schema.prisma
├── ui/                     # Frontend UI
│   ├── src/
│   │   ├── app/           # Next.js app router
│   │   ├── components/    # React components
│   │   │   ├── ui/        # shadcn/ui components
│   │   │   ├── credit-holdings.tsx
│   │   │   ├── transfer-history.tsx
│   │   │   ├── retirement-history.tsx
│   │   │   └── serial-range-display.tsx
│   │   └── lib/           # Utilities
├── infra/                  # Infrastructure
│   ├── mock-*.js          # Mock services
│   └── docker-compose.yml
└── docs/                   # Documentation
```

### Environment Variables

Copy `env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/carbon_registry"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Server
SERVER_PORT=4000
CORS_ORIGIN="http://localhost:3000"

# Integrations (mock services)
ADAPTER_URL="http://localhost:3001"
LOCKER_URL="http://localhost:3002"
ORACLE_URL="http://localhost:3003"
```

### Database Commands

```bash
# Generate Prisma client
pnpm --filter api db:generate

# Run migrations
pnpm --filter api db:migrate

# Seed database
pnpm --filter api db:seed:all

# Reset database
pnpm --filter api db:reset
```

### Testing

```bash
# Run all tests
pnpm test

# API tests only
pnpm --filter api test

# UI tests only
pnpm --filter ui test

# E2E tests
pnpm test:e2e
```

## 🐳 Docker Services

The Docker Compose setup includes:
- **PostgreSQL**: Database server
- **API**: Backend service
- **UI**: Frontend service
- **Mock Adapter**: Registry adapter simulation
- **Mock Locker**: Evidence storage simulation
- **Mock Oracle**: IoT data simulation
- **MailHog**: Email testing

## 📋 Mock Services

### Registry Adapter (Port 3001)
Simulates blockchain integration for credit anchoring.

### Evidence Locker (Port 3002)
Simulates file storage and IPFS integration.

### IoT Oracle (Port 3003)
Simulates IoT data feeds for project monitoring.

## 🔍 Monitoring

- **Health Check**: http://localhost:4000/health
- **API Ready**: http://localhost:4000/ready
- **MailHog UI**: http://localhost:8025

## 🆕 Recent Improvements

### ✅ Fixed Issues
- **Globally Unique Serial Numbers**: Implemented global serial counter to prevent duplicates across projects
- **Admin Dashboard**: Fixed "View Details" and "Edit" buttons functionality
- **Project Management**: Added full CRUD operations for projects and issuance requests
- **Certificate Generation**: Enhanced certificates with complete serial number lists
- **Public Explorer**: Fixed data display and added public access to approved projects
- **UI/UX Improvements**: Added proper text truncation, button alignment, and notifications
- **Authentication**: Fixed JWT token handling and user session management
- **Data Consistency**: Ensured proper data structure handling between API and frontend

### 🚀 New Features
- **Project Deletion**: Admins and issuers can delete DRAFT projects
- **Issuance Editing**: Edit and delete DRAFT issuance requests
- **Real-time Notifications**: User-friendly notification system for all actions
- **Public Statistics**: Public endpoint for registry statistics without authentication
- **Enhanced Certificates**: Certificates include all individual serial numbers
- **Status Management**: Proper project status transitions and restrictions
- **Responsive Design**: Improved mobile and desktop experience

## 📚 Documentation

- [Domain Model](docs/domain-model.md) - Entity relationships
- [RBAC Matrix](docs/rbac-matrix.md) - Role permissions
- [Runbook](docs/runbook.md) - Operational procedures

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is for demonstration and educational purposes.

## 🆘 Support

For questions or issues:
1. Check the documentation
2. Review the demo accounts
3. Run the happy path script
4. Check the health endpoints

---

**Note**: This is a simulation platform for demonstration and educational purposes. It is not intended for production use with real carbon credits or financial transactions.
