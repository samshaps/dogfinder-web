import { getResendClient, EMAIL_CONFIG } from './config';
import { 
  EmailTemplateData, 
  EmailServiceResponse, 
  EmailEventType,
  EmailDogMatch 
} from './types';
import { getSupabaseClient } from '@/lib/supabase';

/**
 * Send a dog match alert email to a user
 */
export async function sendDogMatchAlert(
  templateData: EmailTemplateData
): Promise<EmailServiceResponse> {
  try {
    console.log('📧 Sending dog match alert email to:', templateData.user.email);
    
    const resend = getResendClient();
    
    // Generate email HTML content
    const htmlContent = generateEmailHTML(templateData);
    const textContent = generateEmailText(templateData);
    
    // Send email via Resend
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [templateData.user.email],
      replyTo: EMAIL_CONFIG.replyTo,
      subject: generateEmailSubject(templateData),
      html: htmlContent,
      text: textContent,
      headers: {
        'X-Entity-Ref-ID': `dog-alert-${templateData.user.email}-${Date.now()}`,
      },
      tags: [
        { name: 'type', value: 'dog-alert' },
        { name: 'user', value: templateData.user.email },
        { name: 'matches', value: templateData.matches.length.toString() },
      ],
    });

    if (result.error) {
      console.error('❌ Email send failed:', result.error);
      await logEmailEvent({
        userId: templateData.user.email, // Using email as userId for now
        eventType: 'alert_failed',
        metadata: { error: result.error },
      });
      
      return {
        success: false,
        error: result.error.message || 'Failed to send email',
      };
    }

    console.log('✅ Email sent successfully:', result.data?.id);
    
    // Log successful email event
    await logEmailEvent({
      userId: templateData.user.email,
      eventType: 'alert_sent',
      emailProvider: 'resend',
      messageId: result.data?.id,
      metadata: {
        matchesCount: templateData.matches.length,
        totalMatches: templateData.totalMatches,
      },
    });

    return {
      success: true,
      messageId: result.data?.id,
    };

  } catch (error) {
    console.error('❌ Email service error:', error);
    
    await logEmailEvent({
      userId: templateData.user.email,
      eventType: 'alert_failed',
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send a test email to verify email configuration
 */
export async function sendTestEmail(
  to: string,
  userEmail: string
): Promise<EmailServiceResponse> {
  try {
    console.log('📧 Sending test email to:', to);
    
    const resend = getResendClient();
    
    const testTemplateData: EmailTemplateData = {
      user: { name: 'Test User', email: userEmail },
      preferences: {
        zipCodes: ['10001'],
        radiusMi: 50,
        frequency: 'daily',
      },
      matches: [
        {
          id: 'test-dog-1',
          name: 'Buddy',
          breeds: ['Golden Retriever', 'Labrador Mix'],
          age: 'young',
          size: 'large',
          energy: 'medium',
          temperament: ['friendly', 'playful'],
          location: { city: 'New York', state: 'NY', distanceMi: 5 },
          photos: ['https://example.com/dog1.jpg'],
          matchScore: 95,
          reasons: {
            primary150: 'Buddy is a perfect match for your active lifestyle!',
            blurb50: 'Great family dog',
          },
          shelter: { name: 'Test Shelter', email: 'test@shelter.com' },
          url: 'https://example.com/dog1',
        },
      ],
      unsubscribeUrl: `${EMAIL_CONFIG.unsubscribeUrl}?email=${encodeURIComponent(userEmail)}`,
      dashboardUrl: EMAIL_CONFIG.dashboardUrl,
      totalMatches: 1,
      generatedAt: new Date().toISOString(),
    };

    const htmlContent = generateEmailHTML(testTemplateData);
    const textContent = generateEmailText(testTemplateData);
    
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [to],
      replyTo: EMAIL_CONFIG.replyTo,
      subject: '🐕 DogFinder Test Email - Email Alerts Setup Complete!',
      html: htmlContent,
      text: textContent,
      headers: {
        'X-Entity-Ref-ID': `test-email-${to}-${Date.now()}`,
      },
      tags: [
        { name: 'type', value: 'test-email' },
        { name: 'user', value: userEmail },
      ],
    });

    if (result.error) {
      console.error('❌ Test email failed:', result.error);
      return {
        success: false,
        error: result.error.message || 'Failed to send test email',
      };
    }

    console.log('✅ Test email sent successfully:', result.data?.id);
    
    await logEmailEvent({
      userId: userEmail,
      eventType: 'test_email',
      emailProvider: 'resend',
      messageId: result.data?.id,
      metadata: { testEmail: to },
    });

    return {
      success: true,
      messageId: result.data?.id,
    };

  } catch (error) {
    console.error('❌ Test email service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Log email events to the database
 */
async function logEmailEvent(event: {
  userId: string;
  eventType: EmailEventType;
  emailProvider?: string;
  messageId?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    const client = getSupabaseClient();
    
    // First, get the actual user ID from email if needed
    const { data: userData } = await client
      .from('users' as any)
      .select('id')
      .eq('email', event.userId)
      .single();

    const userId = (userData as any)?.id || event.userId;

    await (client as any)
      .from('email_events')
      .insert({
        user_id: userId,
        event_type: event.eventType,
        email_provider: event.emailProvider,
        message_id: event.messageId,
        metadata: event.metadata || {},
      });

    console.log('📝 Email event logged:', event.eventType, event.userId);
  } catch (error) {
    console.error('❌ Failed to log email event:', error);
    // Don't throw - logging failures shouldn't break email sending
  }
}

/**
 * Generate email subject line
 */
function generateEmailSubject(data: EmailTemplateData): string {
  const matchCount = data.matches.length;
  const totalCount = data.totalMatches;
  
  if (matchCount === 1) {
    return `🐕 ${data.matches[0].name} is waiting for you!`;
  } else if (matchCount === totalCount) {
    return `🐕 New matches galore!`;
  } else {
    return `🐕 ${matchCount} new matches found -- take a look`;
  }
}

/**
 * Generate HTML email content
 */
function generateEmailHTML(data: EmailTemplateData): string {
  const { user, matches, preferences, unsubscribeUrl, dashboardUrl } = data;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Dog Matches Found</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
        .content { padding: 30px 20px; }
        .greeting { font-size: 18px; margin-bottom: 20px; color: #2d3748; }
        .summary { background-color: #f7fafc; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .summary h2 { margin: 0 0 10px 0; color: #2d3748; font-size: 20px; }
        .summary p { margin: 5px 0; color: #4a5568; }
        .dog-card { border: 1px solid #e2e8f0; border-radius: 12px; margin: 20px 0; overflow: hidden; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .dog-header { background-color: #f8fafc; padding: 15px 20px; border-bottom: 1px solid #e2e8f0; }
        .dog-name { font-size: 22px; font-weight: 700; color: #2d3748; margin: 0 0 5px 0; }
        .dog-basic { color: #4a5568; font-size: 14px; margin: 0; }
        .dog-content { padding: 20px; }
        .dog-photo { width: 100%; max-width: 300px; height: 200px; object-fit: cover; border-radius: 8px; margin: 0 0 15px 0; }
        .dog-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
        .detail-item { background-color: #f7fafc; padding: 8px 12px; border-radius: 6px; font-size: 14px; }
        .detail-label { font-weight: 600; color: #4a5568; }
        .detail-value { color: #2d3748; }
        .match-score { background: linear-gradient(135deg, #48bb78, #38a169); color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; display: inline-block; margin-bottom: 15px; }
        .reasoning { background-color: #edf2f7; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .reasoning h4 { margin: 0 0 10px 0; color: #2d3748; font-size: 16px; }
        .reasoning p { margin: 0; color: #4a5568; line-height: 1.5; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 10px 0; }
        .footer { background-color: #2d3748; color: white; padding: 30px 20px; text-align: center; }
        .footer p { margin: 5px 0; opacity: 0.8; font-size: 14px; }
        .footer a { color: #90cdf4; text-decoration: none; }
        .unsubscribe { margin-top: 20px; padding-top: 20px; border-top: 1px solid #4a5568; }
        @media (max-width: 600px) {
            .container { margin: 0; }
            .dog-details { grid-template-columns: 1fr; }
            .header h1 { font-size: 24px; }
            .content { padding: 20px 15px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🐕 New Dog Matches!</h1>
            <p>We found ${data.matches.length} amazing dog${data.matches.length > 1 ? 's' : ''} that match your preferences</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hi ${user.name || 'there'}! 👋
            </div>
            
            <div class="summary">
                <h2>Your Search Summary</h2>
                <p><strong>Location:</strong> ${preferences.zipCodes.join(', ')} (within ${preferences.radiusMi} miles)</p>
                <p><strong>Frequency:</strong> ${preferences.frequency} alerts</p>
                <p><strong>Matches Found:</strong> ${data.totalMatches} total, showing top ${data.matches.length}</p>
            </div>
            
            ${matches.map(dog => `
                <div class="dog-card">
                    <div class="dog-header">
                        <h3 class="dog-name">${dog.name}</h3>
                        <p class="dog-basic">${dog.breeds.join(', ')} • ${dog.age} • ${dog.size}</p>
                    </div>
                    <div class="dog-content">
                        ${dog.photos.length > 0 ? `<img src="${dog.photos[0]}" alt="${dog.name}" class="dog-photo" />` : ''}
                        
                        <div class="match-score">
                            ${dog.matchScore}% Match Score
                        </div>
                        
                        <div class="dog-details">
                            <div class="detail-item">
                                <div class="detail-label">Age</div>
                                <div class="detail-value">${dog.age}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Size</div>
                                <div class="detail-value">${dog.size}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Energy</div>
                                <div class="detail-value">${dog.energy}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Location</div>
                                <div class="detail-value">${dog.location.city}, ${dog.location.state}${dog.location.distanceMi ? ` (${dog.location.distanceMi} mi)` : ''}</div>
                            </div>
                        </div>
                        
                        ${dog.reasons.primary150 ? `
                            <div class="reasoning">
                                <h4>Why ${dog.name} is perfect for you:</h4>
                                <p>${dog.reasons.primary150}</p>
                            </div>
                        ` : ''}
                        
                        <a href="${dog.url}" class="cta-button">View ${dog.name}'s Profile →</a>
                    </div>
                </div>
            `).join('')}
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" class="cta-button">View All Matches in Dashboard</a>
            </div>
        </div>
        
        <div class="footer">
            <p>Happy dog hunting! 🐕</p>
            <p>The DogYenta Team</p>
            
            <div class="unsubscribe">
                <p>Don't want these alerts? <a href="${unsubscribeUrl}">Unsubscribe here</a></p>
                <p>Or <a href="${dashboardUrl}">manage your preferences</a> to customize your alerts</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Generate plain text email content
 */
function generateEmailText(data: EmailTemplateData): string {
  const { user, matches, preferences } = data;
  
  let text = `Hi ${user.name || 'there'}! 👋\n\n`;
  text += `We found ${matches.length} amazing dog${matches.length > 1 ? 's' : ''} that match your preferences!\n\n`;
  
  text += `Your Search Summary:\n`;
  text += `- Location: ${preferences.zipCodes.join(', ')} (within ${preferences.radiusMi} miles)\n`;
  text += `- Frequency: ${preferences.frequency} alerts\n`;
  text += `- Matches Found: ${data.totalMatches} total, showing top ${matches.length}\n\n`;
  
  matches.forEach((dog, index) => {
    text += `${index + 1}. ${dog.name} - ${dog.matchScore}% Match\n`;
    text += `   Breed: ${dog.breeds.join(', ')}\n`;
    text += `   Age: ${dog.age}, Size: ${dog.size}, Energy: ${dog.energy}\n`;
    text += `   Location: ${dog.location.city}, ${dog.location.state}${dog.location.distanceMi ? ` (${dog.location.distanceMi} mi)` : ''}\n`;
    if (dog.reasons.primary150) {
      text += `   Why perfect for you: ${dog.reasons.primary150}\n`;
    }
    text += `   View profile: ${dog.url}\n\n`;
  });
  
  text += `View all matches in your dashboard: ${data.dashboardUrl}\n\n`;
  text += `Happy dog hunting! 🐕\n`;
  text += `The DogYenta Team\n\n`;
  text += `Don't want these alerts? Unsubscribe here: ${data.unsubscribeUrl}\n`;
  text += `Or manage your preferences: ${data.dashboardUrl}\n`;
  
  return text;
}
