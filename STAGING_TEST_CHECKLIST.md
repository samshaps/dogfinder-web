# Staging Deployment Test Checklist

## ✅ Unit Tests Passed
All 30 unit tests passing for:
- API helpers (`requireSession`, `okJson`, `errJson`)
- `setPlan()` function with idempotency
- Token jti consume/check helpers
- Refactored routes integration

## 🧪 Staging Integration Tests

### 1. Authentication Flow
- [ ] Test `/api/preferences` GET without auth → should return 401
- [ ] Test `/api/preferences` GET with valid session → should return 200 with standardized format
- [ ] Verify response includes `success`, `data`, `meta.requestId` fields

### 2. Preferences Route (Refactored)
- [ ] GET `/api/preferences` with auth → verify standardized response format
- [ ] POST `/api/preferences` with valid data → verify success response
- [ ] POST `/api/preferences` with invalid data → verify validation error format
- [ ] DELETE `/api/preferences` → verify success response

### 3. Unsubscribe Route (Refactored)
- [ ] POST `/api/unsubscribe` with valid token → verify uses `setPlan()` for downgrade
- [ ] POST `/api/unsubscribe` with already-used token → verify idempotent response
- [ ] POST `/api/unsubscribe` with invalid token → verify error response format

### 4. Stripe Webhook (Refactored)
- [ ] Test `checkout.session.completed` event → verify uses `setPlan()` with event ID
- [ ] Test duplicate webhook event → verify idempotency (should skip if already processed)
- [ ] Test `subscription.updated` → verify uses `setPlan()` 
- [ ] Test `subscription.deleted` → verify downgrades to free using `setPlan()`

### 5. Plan Management
- [ ] Verify plan updates go through `setPlan()` function (check logs)
- [ ] Test Stripe event ID is stored for idempotency
- [ ] Verify no direct plan DB updates (all via `setPlan()`)

### 6. Token Security
- [ ] Test token jti reuse prevention (same token twice should be idempotent)
- [ ] Verify token consumption is recorded in `email_events`

### 7. Error Handling
- [ ] Verify all errors return standardized format: `{ success: false, error: { code, message }, meta: { requestId } }`
- [ ] Verify all successes return standardized format: `{ success: true, data: {...}, meta: { requestId, timestamp } }`

### 8. Logging
- [ ] Check that sensitive data (emails, tokens) are redacted in logs
- [ ] Verify request IDs are present in all responses

## 🚀 Quick Test Scripts

```bash
# Test preferences endpoint
curl -X GET https://staging.dogyenta.com/api/preferences \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  | jq '.success, .meta.requestId'

# Test unsubscribe (if you have a valid token)
curl -X POST https://staging.dogyenta.com/api/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN"}' \
  | jq '.success, .error'
```

## ✅ Success Criteria
- All routes return standardized response format
- All plan updates go through `setPlan()`
- Token reuse is prevented (idempotent)
- Webhook events are idempotent
- No runtime errors in logs
- All error responses include request IDs

## 🐛 If Issues Found
1. Check server logs for errors
2. Verify environment variables are set correctly
3. Check that database schema matches expectations
4. Verify all mocks are removed in staging

