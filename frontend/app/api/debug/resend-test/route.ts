import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getResendClient, EMAIL_CONFIG } from '@/lib/email/config';
import { appConfig } from '@/lib/config';

// Debug endpoint to test Resend API directly
export async function POST(request: NextRequest) {
  try {
    // Only allow in development/staging
    if (process.env.VERCEL_ENV === 'production') {
      return NextResponse.json(
        { error: 'Debug endpoint not available in production' },
        { status: 403 }
      );
    }

    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { testEmail } = body;

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Test email address is required' },
        { status: 400 }
      );
    }

    // Check if Resend is configured
    if (!appConfig.resendApiKey) {
      return NextResponse.json({
        error: 'RESEND_API_KEY not configured',
        config: {
          hasApiKey: false,
          from: EMAIL_CONFIG.from,
          replyTo: EMAIL_CONFIG.replyTo,
        }
      }, { status: 500 });
    }

    const resend = getResendClient();

    console.log('🔍 DEBUG: Testing Resend API directly');
    console.log('🔍 DEBUG: Config:', {
      from: EMAIL_CONFIG.from,
      to: testEmail,
      replyTo: EMAIL_CONFIG.replyTo,
      hasApiKey: !!appConfig.resendApiKey,
      apiKeyPrefix: appConfig.resendApiKey?.substring(0, 7),
    });

    // Send a simple test email
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [testEmail],
      replyTo: EMAIL_CONFIG.replyTo,
      subject: '🔍 Resend Debug Test Email',
      html: '<p>This is a debug test email from Resend.</p>',
      text: 'This is a debug test email from Resend.',
    });

    // Return the full raw response
    return NextResponse.json({
      success: !result.error,
      message: result.error ? 'Resend API call failed' : 'Resend API call succeeded',
      rawResponse: {
        error: result.error ? {
          name: result.error.name,
          message: result.error.message,
          statusCode: (result.error as any).statusCode,
          stack: (result.error as any).stack,
        } : null,
        data: result.data,
        // Full result for inspection
        fullResult: result,
      },
      config: {
        from: EMAIL_CONFIG.from,
        to: testEmail,
        replyTo: EMAIL_CONFIG.replyTo,
        hasApiKey: !!appConfig.resendApiKey,
      },
    });

  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Debug endpoint failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

