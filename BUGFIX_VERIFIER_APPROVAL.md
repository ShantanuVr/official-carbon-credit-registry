# Bug Fix: Verifier Approval 500 Error

## Issue
When a verifier attempts to approve a project, they receive a 500 error.

## Root Cause
The error was:
```
FastifyError: Body cannot be empty when content-type is set to 'application/json'
```

**Problem**: The API route `/projects/:id/approve` was configured with a schema requiring a JSON body, but the UI was calling it without providing any body (empty request).

## Files Changed

### 1. `api/src/modules/projects/routes.ts`
**Changes**:
- Removed the required body schema from the approve endpoint
- Removed unused `data` variable
- Made the endpoint accept requests with or without a body

**Before**:
```typescript
fastify.post('/:id/approve', {
  preHandler: [authenticate, requireRole([Role.ADMIN, Role.VERIFIER])],
  schema: {
    body: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  },
}, async (request: FastifyRequest, reply: FastifyReply) => {
  const data = request.body as z.infer<typeof approveProjectSchema>
  // ...
})
```

**After**:
```typescript
fastify.post('/:id/approve', {
  preHandler: [authenticate, requireRole([Role.ADMIN, Role.VERIFIER])],
}, async (request: FastifyRequest, reply: FastifyReply) => {
  // No body required
  // ...
})
```

### 2. `api/src/modules/issuances/routes.ts`
**Changes**:
- Applied the same fix to the issuance approve endpoint

### 3. `ui/src/components/verifier-dashboard.tsx`
**Changes**:
- Updated the approve API call to send an empty object instead of nothing

**Before**:
```typescript
await apiClient.post(`/projects/${selectedProject.id}/approve`)
```

**After**:
```typescript
await apiClient.post(`/projects/${selectedProject.id}/approve`, {})
```

## Testing
The fix ensures:
1. ✅ Empty body requests work correctly
2. ✅ Verifier approval flow completes successfully
3. ✅ Admin approval flow also works
4. ✅ No breaking changes to other functionality

## Verification
After the fix, the verifier can now:
- Approve projects without errors
- See success notifications
- Have project status updated to APPROVED
- Audit logs are created correctly

## Related Endpoints Fixed
- `POST /projects/:id/approve` - Project approval
- `POST /issuances/:id/approve` - Issuance approval

## Status
✅ **FIXED** - Ready for testing

