# Email Compliance Checklist

**Date:** November 11, 2025  
**Owner:** Lifecycle Marketing

Use this checklist before every launch to ensure outbound messages meet CAN-SPAM, CASL, and GDPR guidelines.

## 1. Identity & Branding

- [ ] Confirm `EMAIL_FROM` displays the DogYenta brand (no-noreply addresses discouraged).
- [ ] Subject lines are accurate, non-deceptive, and ≤ 60 characters.
- [ ] Preview text summarizes content without misleading copy.

## 2. Footer Requirements

- [ ] Physical mailing address renders in both HTML and plain text.
- [ ] Support contact (`EMAIL_REPLY_TO`) and help center link are present.
- [ ] Privacy Policy and Terms of Service links render correctly.
- [ ] Compliance notice explains why the user is receiving the email.

## 3. Unsubscribe Experience

- [ ] `List-Unsubscribe` and `List-Unsubscribe-Post` headers present (Resend console).
- [ ] Unsubscribe link resolves to single-click opt-out.
- [ ] Preferences link updates cadence without requiring login (if applicable).
- [ ] Test unsubscribed user receives confirmation within 10 minutes.

## 4. Deliverability

- [ ] SPF, DKIM, and DMARC records pass (check with [mxtoolbox.com](https://mxtoolbox.com)).
- [ ] Run email through [Mail-Tester](https://www.mail-tester.com) and record score ≥ 8/10.
- [ ] HTML validates (no nested tables missing `tbody`, inline CSS used).
- [ ] Plain text part present and readable.

## 5. Logging & Audit Trail

- [ ] `email_events` table captures `alert_sent` and `alert_failed` entries.
- [ ] Message IDs stored for reference in deliverability investigations.
- [ ] Bounce/complaint notifications configured in ESP (Resend).

## 6. Regional Considerations

- [ ] EU/UK users receive consent reminder (GDPR).
- [ ] Canadian users (CASL) tagged with consent timestamp in CRM.
- [ ] Honor do-not-email list before new campaign.

Document results in `STAGING_TEST_RESULTS.md` and keep evidence (screenshots, Mail-Tester report) for audits.

