# Project Feedback and Resubmission System

## Overview
This feature implements a complete feedback loop for projects that need changes. When a verifier requests changes on a project, the issuer receives feedback, can view it, update the project, and resubmit it for review.

## Changes Made

### 1. Database Schema (`api/prisma/schema.prisma`)
Added three new fields to the `Project` model:
- `feedback` (String, optional): Stores verifier feedback/comments
- `feedbackBy` (String, optional): User ID who provided the feedback  
- `feedbackAt` (DateTime, optional): Timestamp when feedback was provided

### 2. API Updates (`api/src/modules/projects/routes.ts`)

#### Request Changes Endpoint
Updated to store feedback when requesting changes:
```typescript
data: { 
  status: ProjectStatus.NEEDS_CHANGES,
  feedback: data.message,
  feedbackBy: authRequest.user.id,
  feedbackAt: new Date(),
}
```

#### Submit Endpoint
Modified to allow resubmission from NEEDS_CHANGES status:
- Changed validation to allow submission from both DRAFT and NEEDS_CHANGES
- Clears feedback when resubmitted
- Sets status to UNDER_REVIEW

### 3. UI Updates (`ui/src/components/issuer-dashboard.tsx`)

#### Interface Updates
Added feedback fields to Project interface:
```typescript
interface Project {
  // ... existing fields
  feedback?: string
  feedbackBy?: string
  feedbackAt?: string
}
```

#### Feedback Display
Added yellow alert box showing verifier feedback for NEEDS_CHANGES projects:
- Shows feedback message
- Shows date feedback was provided
- Only appears for projects with status NEEDS_CHANGES

#### Resubmit Button
Added resubmit button for NEEDS_CHANGES projects:
- Green "Resubmit" button appears
- Calls handleResubmitProject function
- Only visible for NEEDS_CHANGES status

#### Edit Restrictions
Updated edit button logic:
- Disabled for APPROVED and UNDER_REVIEW projects
- Enabled for DRAFT and NEEDS_CHANGES projects
- Allows issuers to update projects based on feedback

#### Resubmission Handler
Added `handleResubmitProject` function:
```typescript
const handleResubmitProject = async (project: Project) => {
  await apiClient.post(`/projects/${project.id}/submit`, {})
  // Refreshes project list
  // Shows success notification
}
```

## Workflow

### For Verifiers:
1. Review a project under review
2. Click "Request Changes"
3. Enter feedback/comment
4. Submit - feedback is stored in database
5. Project status changes to NEEDS_CHANGES

### For Issuers:
1. See notification: "X project(s) that need changes"
2. View project details
3. See yellow feedback box with verifier comments
4. Click "Edit" to update project details
5. Click "Resubmit" to send back for review
6. Project status changes back to UNDER_REVIEW
7. Feedback is cleared for new review cycle

## Visual Design

### Feedback Box
```
┌─────────────────────────────────────────┐
│ ⚠️  Verifier Feedback:                   │
│                                          │
│ Your project description needs more      │
│ detail about the methodology used.        │
│                                          │
│ [Date: 10/26/2024]                       │
└─────────────────────────────────────────┘
```

### Project Card with Feedback
- Yellow background alert box
- Warning icon
- Feedback text clearly displayed
- Date of feedback shown
- Resubmit button (green) visible
- Edit button enabled

## Benefits

1. **Clear Communication**: Issuers know exactly what needs to be changed
2. **Traceable History**: Feedback is stored with timestamp and author
3. **Iterative Improvement**: Projects can be refined through feedback cycles
4. **User Experience**: Visual feedback box makes comments prominent
5. **Workflow Efficiency**: One-click resubmission after updates

## Testing

### Test Scenario 1: Verifier Provides Feedback
1. Login as verifier
2. Select project under review
3. Click "Request Changes"
4. Enter feedback: "Please add more methodology details"
5. Submit
6. ✅ Project status changes to NEEDS_CHANGES

### Test Scenario 2: Issuer Sees Feedback
1. Login as issuer
2. Go to Projects section
3. Find NEEDS_CHANGES project
4. ✅ See yellow feedback box
5. ✅ See feedback message displayed
6. ✅ See feedback date

### Test Scenario 3: Issuer Updates and Resubmits
1. Login as issuer
2. Select NEEDS_CHANGES project
3. Click "Edit" button
4. Update project description with methodology details
5. Save changes
6. Click "Resubmit" button
7. ✅ Project status changes to UNDER_REVIEW
8. ✅ Feedback is cleared
9. ✅ Project ready for verifier review

## Database Migration

The following SQL was executed to add the new columns:

```sql
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "feedback" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "feedbackBy" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "feedbackAt" TIMESTAMP(3);
```

## Related Features

- Audit logging: All actions logged in audit_events table
- Status transitions: DRAFT → UNDER_REVIEW → NEEDS_CHANGES → UNDER_REVIEW → APPROVED
- Role-based access: Only verifiers can request changes, only issuers can resubmit

## Status
✅ **COMPLETE** - All features implemented and tested

## Commit
`b6ecadc` - feat: Add project feedback system and resubmission workflow

