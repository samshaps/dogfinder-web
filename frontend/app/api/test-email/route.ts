/**
 * Test endpoint for manually sending test emails
 * Usage:
 *   POST /api/test-email
 *   Body: { "email": "test@example.com", "userEmail": "user@example.com" }
 *   Headers: { "Authorization": "Bearer ADMIN_SECRET" } (optional in dev mode)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmail } from '@/lib/email/service';
import { appConfig } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    // Simple auth check - allow in dev mode without auth, require ADMIN_SECRET or CRON_SECRET in production
    const authHeader = request.headers.get('authorization');
    const isProduction = process.env.VERCEL_ENV === 'production';
    // Try ADMIN_SECRET first, fall back to appropriate CRON_SECRET for convenience
    const adminSecret = process.env.ADMIN_SECRET 
      || (isProduction ? appConfig.cronSecretProd : appConfig.cronSecretStaging)
      || 'admin-secret';
    const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development';
    
    if (!isDev && (!authHeader || authHeader !== `Bearer ${adminSecret}`)) {
      const secretName = process.env.ADMIN_SECRET ? 'ADMIN_SECRET' : (isProduction ? 'CRON_SECRET_PROD' : 'CRON_SECRET_STAGING');
      return NextResponse.json(
        { error: `Unauthorized. Provide Authorization: Bearer <${secretName}> header` },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { email, userEmail } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required. Provide: { "email": "recipient@example.com", "userEmail": "user@example.com" }' },
        { status: 400 }
      );
    }

    // Use provided userEmail or default to email
    const recipientEmail = email;
    const senderEmail = userEmail || email;

    console.log('📧 Manual test email triggered:', {
      recipient: recipientEmail,
      sender: senderEmail,
      isDev,
    });

    const result = await sendTestEmail(recipientEmail, senderEmail);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send test email',
          recipient: recipientEmail,
          sender: senderEmail,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      recipient: recipientEmail,
      sender: senderEmail,
      messageId: result.messageId,
      resendMessageId: result.messageId,
      resendDashboardUrl: `https://resend.com/emails/${result.messageId}`,
      note: 'Check your inbox and spam folder. You can also view delivery status in the Resend dashboard using the message ID above.',
    });

  } catch (error) {
    console.error('❌ Test email endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for usage instructions
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/test-email',
    method: 'POST',
    description: 'Manually send a test email to verify email configuration',
    usage: {
      url: '/api/test-email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer <ADMIN_SECRET> (optional in dev mode)',
      },
      body: {
        email: 'recipient@example.com',
        userEmail: 'user@example.com (optional, defaults to email)',
      },
    },
    example: {
      curl: `curl -X POST http://localhost:3000/api/test-email \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer your-admin-secret" \\
  -d '{"email": "test@example.com", "userEmail": "user@example.com"}'`,
    },
    note: 'In development mode, authentication is optional. In production, you must provide a valid ADMIN_SECRET.',
  });
}

