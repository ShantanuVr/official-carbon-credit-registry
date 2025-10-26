# Issuance Rejection Workflow

## Overview
Implementation of a complete issuance rejection workflow with reason tracking and issuer feedback.

## Changes Made

### 1. Database Schema (`api/prisma/schema.prisma`)
Added three new fields to the `IssuanceRequest` model:
- `rejectionReason` (String, optional): Stores admin's reason for rejection
- `rejectedBy` (String, optional): User ID who rejected the issuance
- `rejectedAt` (DateTime, optional): Timestamp when rejection occurred

### 2. API Endpoints (`api/src/modules/issuances/routes.ts`)

#### Fixed Approve Endpoint
- Changed from no body to sending empty object `{}`
- Removed required body schema to prevent errors

#### New Reject Endpoint
```
POST /issuances/:id/reject
```
- Requires authentication (Admin or Verifier)
- Validates rejection reason is provided
- Updates status to REJECTED
- Stores rejection reason, rejectedBy, rejectedAt
- Creates audit log entry

### 3. Admin Dashboard (`ui/src/components/admin-dashboard.tsx`)

#### Rejection Modal
- New modal appears when admin clicks Reject
- Requires rejection reason to be filled
- Textarea for detailed feedback
- Cancel button to close without action
- Reject button (red, destructive style)

#### Updated Handlers
- `handleApproveIssuance`: Fixed to send `{}` instead of no body
- `handleRejectIssuance`: Opens modal instead of immediate rejection
- `confirmRejectIssuance`: Sends rejection with reason to API

#### State Management
- `rejectionReason`: Stores user input
- `showRejectionModal`: Controls modal visibility
- `issuanceToReject`: Tracks which issuance is being rejected

### 4. Issuer Dashboard (`ui/src/components/issuer-dashboard.tsx`)

#### Interface Updates
Added to `IssuanceRequest` interface:
```typescript
interface IssuanceRequest {
  // ... existing fields
  rejectionReason?: string
  rejectedAt?: string
}
```

#### Rejection Display
- Shows red alert box for REJECTED issuances
- Displays rejection reason prominently
- Shows rejection date if available
- Matches design pattern from project feedback
- Visual distinction with red colors (bg-red-50, border-red-200)

## Workflow

### For Admin:
1. View pending issuance requests
2. Click "Reject" button
3. Modal appears requesting reason
4. Enter detailed rejection reason
5. Click "Reject Issuance" to confirm
6. Issuance status changes to REJECTED
7. Reason, user, and timestamp saved

### For Issuer:
1. View issuance requests in dashboard
2. See REJECTED status badge
3. Read rejection reason in red alert box
4. See when it was rejected
5. Understand what needs to be corrected
6. Can create new issuance for approved projects

## API Calls

### Approve Issuance
```typescript
POST /issuances/:id/approve
Body: {}
Response: Updated issuance with APPROVED status
```

### Reject Issuance
```typescript
POST /issuances/:id/reject
Body: { reason: "string" }
Response: Updated issuance with REJECTED status + metadata
```

## Visual Design

### Rejection Modal
```
┌──────────────────────────────────────┐
│ Reject Issuance Request              │
│ Please provide a reason for rejection│
├──────────────────────────────────────┤
│ Rejection Reason                     │
│ ┌──────────────────────────────────┐│
│ │ Enter the reason...              ││
│ │                                  ││
│ └──────────────────────────────────┘│
│                                      │
│               [Cancel] [Reject]      │
└──────────────────────────────────────┘
```

### Issuer Dashboard - Rejected Issuance
```
┌────────────────────────────────────────┐
│ Project Title                    [Rejected] │
│ 10,000 tCO₂e                              │
│                                          │
│ ⚠️ Rejection Reason:                    │
│    Insufficient documentation...        │
│    Rejected on: 10/26/2024               │
│                                          │
│ Submitted: 10/24/2024              [View] │
└────────────────────────────────────────┘
```

## Benefits

1. **Clear Communication**: Issuer knows exactly why issuance was rejected
2. **Traceable History**: Rejection details stored with timestamp and author
3. **Better Quality**: Feedback helps issuer improve future requests
4. **Workflow Efficiency**: Proper documentation and tracking
5. **User Experience**: Visual feedback with clear messaging

## Status
✅ **COMPLETE** - All features implemented

## Commits
- `7434ec6` - Add issuance rejection with reason tracking
- `c0cbe24` - Add rejection modal and fix approval API calls
- `a608562` - Add rejection reason display to issuer dashboard

## Next Steps

### Remaining Work:
1. **Allow issuer to create new issuance** - Enable "Request Issuance" for projects where previous issuance was rejected
2. **Track issuance attempt history** - Record how many times issuer has requested issuance for a project
3. **Resubmission workflow** - Allow issuer to retry rejected issuances with fixes

The issuer can currently see rejection reasons and create new issuances, but the UI could be enhanced to make it clearer that they can retry for the same project.

