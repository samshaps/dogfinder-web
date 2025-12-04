# Module 6: Email Alerts - Comprehensive Testing Plan

## 🎯 Testing Overview

This comprehensive testing plan covers all aspects of the email alerts system, from unit tests to end-to-end user workflows. The system is critical for user engagement and must be thoroughly tested before production deployment.

## 📋 Test Categories

### 1. Unit Tests ✅
**Status: Implemented** - Located in `frontend/__tests__/email-alerts.test.ts`

#### Test Coverage:
- ✅ Email service functionality
- ✅ Template generation
- ✅ Schema validation
- ✅ Error handling scenarios

#### Run Tests:
```bash
cd frontend && npm test email-alerts
```

### 2. API Endpoint Tests

#### 2.1 Email Alert Settings API (`/api/email-alerts`)

**GET Request - Fetch Settings**
```bash
# Test authenticated user
curl -X GET "http://localhost:3000/api/email-alerts" \
  -H "Cookie: next-auth.session-token=your-session-token"

# Expected: 200 OK with user settings
# Expected: 401 Unauthorized without auth
```

**POST Request - Update Settings**
```bash
# Test valid settings update
curl -X POST "http://localhost:3000/api/email-alerts" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=your-session-token" \
  -d '{
    "enabled": true,
    "frequency": "daily",
    "maxDogsPerEmail": 5,
    "minMatchScore": 70,
    "includePhotos": true,
    "includeReasoning": true
  }'

# Expected: 200 OK with updated settings
```

**POST Request - Send Test Email**
```bash
# Test email functionality
curl -X POST "http://localhost:3000/api/email-alerts?action=test" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=your-session-token" \
  -d '{"testEmail": "test@example.com"}'

# Expected: 200 OK with message ID
```

**DELETE Request - Disable Alerts**
```bash
# Test disabling alerts
curl -X DELETE "http://localhost:3000/api/email-alerts" \
  -H "Cookie: next-auth.session-token=your-session-token"

# Expected: 200 OK with confirmation
```

#### 2.2 Cron Job API (`/api/cron/email-alerts`)

**POST Request - Manual Cron Trigger**
```bash
# Test cron job manually (requires CRON_SECRET)
curl -X POST "http://localhost:3000/api/cron/email-alerts" \
  -H "Authorization: Bearer your-cron-secret"

# Expected: 200 OK with processing results
```

### 3. Database Integration Tests

#### 3.1 Alert Settings Table
```sql
-- Test alert settings CRUD operations
SELECT * FROM alert_settings WHERE user_id = 'test-user-id';
INSERT INTO alert_settings (user_id, enabled, cadence) VALUES ('test-user-id', true, 'daily');
UPDATE alert_settings SET enabled = false WHERE user_id = 'test-user-id';
DELETE FROM alert_settings WHERE user_id = 'test-user-id';
```

#### 3.2 Email Events Table
```sql
-- Test email event logging
SELECT * FROM email_events WHERE user_id = 'test-user-id' ORDER BY created_at DESC;
INSERT INTO email_events (user_id, event_type, metadata) VALUES ('test-user-id', 'test_email', '{"test": true}');
```

### 4. Email Service Tests

#### 4.1 Resend Integration
- [ ] **API Key Configuration**: Verify RESEND_API_KEY is set
- [ ] **Domain Setup**: Confirm dogyenta.com domain is configured in Resend
- [ ] **Sender Authentication**: Test email sending with theyenta@dogyenta.com
- [ ] **Rate Limits**: Verify Resend rate limits are not exceeded

#### 4.2 Email Template Tests
- [ ] **HTML Rendering**: Test email HTML renders correctly in multiple clients
- [ ] **Text Fallback**: Verify plain text version is generated
- [ ] **Responsive Design**: Test mobile email client compatibility
- [ ] **Subject Lines**: Verify subject line logic for different match counts
- [ ] **Personalization**: Test dynamic content insertion

### 5. User Interface Tests

#### 5.1 Profile Page Integration
- [ ] **Email Settings Section**: Verify EmailAlertSettings component renders
- [ ] **Toggle Functionality**: Test enable/disable email alerts
- [ ] **Settings Persistence**: Confirm settings save and load correctly
- [ ] **Error Handling**: Test error states and user feedback

#### 5.2 Email Alert Settings Component
- [ ] **Frequency Selection**: Test daily/weekly options
- [ ] **Max Dogs Setting**: Verify dropdown options (3, 5, 10)
- [ ] **Match Score Filter**: Test minimum score options (50%, 70%, 85%)
- [ ] **Content Toggles**: Test photo and reasoning inclusion options
- [ ] **Test Email**: Verify test email functionality
- [ ] **Loading States**: Test loading indicators
- [ ] **Error Messages**: Verify error display

#### 5.3 Unsubscribe Page
- [ ] **URL Parameters**: Test email parameter handling
- [ ] **Unsubscribe Flow**: Verify one-click unsubscribe
- [ ] **Confirmation**: Test success/error states
- [ ] **Navigation**: Test links to sign-in and home

### 6. End-to-End Workflow Tests

#### 6.1 Complete Email Alert Flow
1. **User Setup**
   - [ ] User signs in to application
   - [ ] User sets search preferences on /find page
   - [ ] User enables email alerts in profile
   - [ ] User configures alert settings

2. **Email Generation**
   - [ ] New dogs appear in search results
   - [ ] Cron job runs (manual trigger for testing)
   - [ ] Email is generated with correct content
   - [ ] Email is sent to user's address

3. **Email Content Verification**
   - [ ] Subject line matches expected format
   - [ ] Email contains correct number of dog matches
   - [ ] Dog photos display correctly
   - [ ] AI reasoning is included
   - [ ] Links work correctly
   - [ ] Unsubscribe link functions

4. **User Interaction**
   - [ ] User receives email in inbox
   - [ ] User clicks on dog profile links
   - [ ] User visits dashboard from email
   - [ ] User can modify alert settings

#### 6.2 Edge Cases
- [ ] **No New Matches**: Test when no new dogs are found
- [ ] **All Dogs Seen**: Test when all dogs have been seen before
- [ ] **User Paused**: Test when user has paused alerts
- [ ] **Rate Limiting**: Test daily email limit enforcement
- [ ] **Invalid Email**: Test with invalid email addresses
- [ ] **Database Errors**: Test error handling scenarios

### 7. Performance Tests

#### 7.1 Cron Job Performance
- [ ] **Processing Time**: Measure time to process all users
- [ ] **Memory Usage**: Monitor memory consumption during batch processing
- [ ] **Database Queries**: Verify efficient query patterns
- [ ] **Concurrent Users**: Test with multiple users having alerts enabled

#### 7.2 Email Delivery Performance
- [ ] **Send Time**: Measure time to send individual emails
- [ ] **Batch Processing**: Test sending multiple emails efficiently
- [ ] **Error Recovery**: Test handling of failed email sends
- [ ] **Queue Management**: Verify proper queuing of email sends

### 8. Security Tests

#### 8.1 Authentication & Authorization
- [ ] **Protected Endpoints**: Verify all endpoints require authentication
- [ ] **User Isolation**: Test that users can only access their own settings
- [ ] **Cron Security**: Verify CRON_SECRET protection
- [ ] **Input Validation**: Test all input sanitization

#### 8.2 Data Protection
- [ ] **Email Privacy**: Verify email addresses are handled securely
- [ ] **Unsubscribe Security**: Test unsubscribe link security
- [ ] **Rate Limiting**: Verify abuse prevention
- [ ] **Logging**: Ensure sensitive data is not logged

### 9. Integration Tests

#### 9.1 External Service Integration
- [ ] **Resend API**: Test all Resend API interactions
- [ ] **Database Connection**: Verify Supabase connectivity
- [ ] **Authentication**: Test NextAuth integration
- [ ] **Dog Search**: Test integration with existing search system

#### 9.2 Cross-Browser/Device Tests
- [ ] **Email Clients**: Test in Gmail, Outlook, Apple Mail
- [ ] **Mobile Devices**: Test email rendering on mobile
- [ ] **Desktop Clients**: Test in various desktop email clients
- [ ] **Web Interface**: Test settings UI across browsers

### 10. Monitoring & Alerting Tests

#### 10.1 Email Event Tracking
- [ ] **Event Logging**: Verify all email events are logged
- [ ] **Error Tracking**: Test error event logging
- [ ] **Performance Metrics**: Verify timing data collection
- [ ] **User Analytics**: Test user engagement tracking

#### 10.2 System Health Monitoring
- [ ] **Cron Job Monitoring**: Test cron job success/failure detection
- [ ] **Email Delivery Tracking**: Monitor delivery success rates
- [ ] **Database Health**: Monitor query performance
- [ ] **Service Availability**: Test service uptime monitoring

## 🚀 Pre-Production Checklist

### Environment Setup
- [ ] **Resend Configuration**: Domain verified, API key configured
- [ ] **Database Migration**: All tables created and indexed
- [ ] **Environment Variables**: All required variables set
- [ ] **Cron Job Setup**: Scheduled job configured for 12pm Eastern

### Feature Flags
- [ ] **Email Alerts**: Feature enabled in production
- [ ] **Test Mode**: Disabled for production
- [ ] **Debug Logging**: Appropriate level for production
- [ ] **Rate Limiting**: Production limits configured

### Monitoring Setup
- [ ] **Email Analytics**: Resend analytics configured
- [ ] **Error Tracking**: Error monitoring service configured
- [ ] **Performance Monitoring**: APM service configured
- [ ] **Alerting**: Critical error alerting configured

## 🧪 Test Execution Plan

### Phase 1: Development Testing (Local)
1. Run unit tests
2. Test API endpoints locally
3. Test email templates in development
4. Verify database operations

### Phase 2: Staging Testing
1. Deploy to staging environment
2. Configure staging email service
3. Run full end-to-end tests
4. Test with real email addresses
5. Verify cron job functionality

### Phase 3: Production Readiness
1. Performance testing with production-like load
2. Security testing and penetration testing
3. User acceptance testing
4. Monitoring and alerting verification

### Phase 4: Gradual Rollout
1. Enable for small subset of users
2. Monitor email delivery rates
3. Monitor user engagement
4. Monitor system performance
5. Full rollout after validation

## 📊 Success Metrics

### Email Delivery Metrics
- **Delivery Rate**: > 95% successful delivery
- **Open Rate**: Track email open rates
- **Click Rate**: Monitor link click-through rates
- **Unsubscribe Rate**: < 2% unsubscribe rate

### System Performance Metrics
- **Cron Job Duration**: < 5 minutes for all users
- **Email Send Time**: < 30 seconds per email
- **Database Query Time**: < 1 second for user queries
- **Error Rate**: < 1% error rate

### User Experience Metrics
- **Settings Save Time**: < 2 seconds
- **Email Generation Time**: < 10 seconds
- **Page Load Time**: < 3 seconds for settings page
- **User Satisfaction**: Positive feedback on email content

## 🐛 Known Issues & Limitations

### Current Limitations
- **Frequency Options**: Only daily frequency implemented
- **Match Scoring**: Uses placeholder scoring algorithm
- **Photo Optimization**: No image optimization for emails
- **A/B Testing**: No email template testing framework

### Future Improvements
- **Smart Scheduling**: Send emails at optimal times per user
- **Advanced Filtering**: More sophisticated match filtering
- **Template Customization**: User-customizable email templates
- **Analytics Dashboard**: User-facing email analytics

## 📝 Test Documentation

### Test Results Template
```
Test Case: [Test Name]
Date: [Date]
Tester: [Name]
Environment: [Local/Staging/Production]
Result: [Pass/Fail/Blocked]
Notes: [Additional observations]
Screenshots: [If applicable]
```

### Bug Report Template
```
Bug ID: [Auto-generated]
Title: [Brief description]
Severity: [Critical/High/Medium/Low]
Steps to Reproduce: [Detailed steps]
Expected Result: [What should happen]
Actual Result: [What actually happened]
Environment: [Browser/OS/Version]
Screenshots: [If applicable]
```

## 🎯 Testing Completion Criteria

### Must Pass (Blocking Issues)
- [ ] All unit tests pass
- [ ] Email delivery works for test addresses
- [ ] Unsubscribe functionality works
- [ ] No security vulnerabilities
- [ ] Database operations work correctly

### Should Pass (Important Issues)
- [ ] Email templates render correctly
- [ ] User interface is intuitive
- [ ] Performance meets requirements
- [ ] Error handling works properly
- [ ] Monitoring is functional

### Nice to Have (Enhancement Issues)
- [ ] Email analytics are accurate
- [ ] Mobile email rendering is perfect
- [ ] All edge cases are handled
- [ ] Performance is optimal
- [ ] User feedback is positive

---

**Testing Status**: 🟡 In Progress  
**Last Updated**: [Current Date]  
**Next Review**: [Date + 1 week]  
**Test Environment**: Staging  
**Production Ready**: ⏳ Pending

