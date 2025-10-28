import { getResendClient, EMAIL_CONFIG } from './config';
import { 
  EmailTemplateData, 
  EmailTemplateDataSchema,
  EmailServiceResponse, 
  EmailEventType,
  EmailDogMatch 
} from './types';
import { getSupabaseClient } from '@/lib/supabase';
import { signUnsubToken } from '@/lib/tokens';
import { getUserPreferences } from '@/lib/supabase-auth';
import { appConfig } from '@/lib/config';

/**
 * Send a dog match alert email to a user
 */
export async function sendDogMatchAlert(
  templateData: EmailTemplateData
): Promise<EmailServiceResponse> {
  try {
    console.log('📧 Sending dog match alert email to:', templateData.user.email);
    
    // Validate template data
    const validationResult = EmailTemplateDataSchema.safeParse(templateData);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      console.error('❌ Email template validation failed:', errorMessage);
      
      await logEmailEvent({
        userId: templateData.user.email,
        eventType: 'alert_failed',
        metadata: { 
          error: 'Validation failed',
          validationErrors: validationResult.error.errors 
        },
      });
      
      return {
        success: false,
        error: `Validation failed: ${errorMessage}`,
      };
    }
    
    const resend = getResendClient();
    
    // Generate email HTML content
    const token = signUnsubToken({
      sub: templateData.user.email,
      scope: 'alerts+cancel',
      jti: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    });
    const withLink = {
      ...templateData,
      unsubscribeUrl: `${EMAIL_CONFIG.unsubscribeUrl}?token=${encodeURIComponent(token)}`,
    };
    const htmlContent = generateEmailHTML(withLink);
    const textContent = generateEmailText(withLink);
    
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
        { name: 'user', value: templateData.user.email.replace(/[^a-zA-Z0-9]/g, '_') },
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
 * Uses real user preferences and recent dog postings for proper visual QA
 */
export async function sendTestEmail(
  to: string,
  userEmail: string
): Promise<EmailServiceResponse> {
  try {
    console.log('📧 Sending test email to:', to);
    
    const resend = getResendClient();
    const client = getSupabaseClient();
    
    // Get user ID and name
    const { data: userData, error: userError } = await client
      .from('users')
      .select('id, name')
      .eq('email', userEmail)
      .single();

    if (userError || !userData) {
      console.warn('⚠️ User not found, using default data:', userError?.message);
      // Fall back to stub data if user not found
      return sendTestEmailWithStubData(to, userEmail, resend);
    }

    const userId = (userData as any).id;
    const userName = (userData as any).name || 'Dog Lover';

    // Get user preferences
    const preferences = await getUserPreferences(userId);
    
    // Determine zip codes and radius from preferences
    let zipCodes: string[] = ['10001']; // Default fallback
    let radiusMi = 50; // Default fallback
    
    if (preferences) {
      // Handle both schema formats: zip_codes array or location single string
      if (preferences.zip_codes && Array.isArray(preferences.zip_codes) && preferences.zip_codes.length > 0) {
        zipCodes = preferences.zip_codes;
      } else if (preferences.location) {
        zipCodes = [preferences.location];
      }
      
      radiusMi = preferences.radius || preferences.radius_mi || 50;
    }

    // Convert preferences to search parameters (similar to cron job)
    const searchParams = new URLSearchParams({
      zip: zipCodes[0] || '10001',
      radius: radiusMi.toString(),
      sort: 'freshness',
      limit: '5', // Get top 5 for test email
    });

    // Add optional filters if they exist in preferences
    if (preferences?.age_preferences && Array.isArray(preferences.age_preferences) && preferences.age_preferences.length > 0) {
      searchParams.append('age', preferences.age_preferences.join(','));
    }
    if (preferences?.size_preferences && Array.isArray(preferences.size_preferences) && preferences.size_preferences.length > 0) {
      searchParams.append('size', preferences.size_preferences.join(','));
    }
    if (preferences?.include_breeds && Array.isArray(preferences.include_breeds) && preferences.include_breeds.length > 0) {
      searchParams.append('breed', preferences.include_breeds.join(','));
    }
    if (preferences?.energy_level) {
      searchParams.append('energy', preferences.energy_level);
    }

    // Fetch real dogs from the internal API
    // Construct base URL for server-side fetch
    // Priority: publicBaseUrl env var > VERCEL_URL > localhost (dev) > production default
    let baseUrl = appConfig.publicBaseUrl;
    if (!baseUrl) {
      if (process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`;
      } else if (process.env.NODE_ENV === 'production') {
        baseUrl = 'https://dogyenta.com';
      } else {
        baseUrl = 'http://localhost:3000';
      }
    }
    console.log('🔍 Fetching real dogs for test email with params:', searchParams.toString());
    console.log('🔍 Using base URL:', baseUrl);
    
    const dogsResponse = await fetch(`${baseUrl}/api/dogs?${searchParams.toString()}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    let emailMatches: EmailDogMatch[] = [];
    let totalMatches = 0;

    if (dogsResponse.ok) {
      const dogsData = await dogsResponse.json();
      const dogs = dogsData.items || [];
      totalMatches = dogsData.total || dogs.length;

      // Transform dogs to email format
      emailMatches = dogs.slice(0, 5).map((dog: any) => {
        // Extract breeds
        const breeds: string[] = [];
        if (dog.breeds?.primary) breeds.push(dog.breeds.primary);
        if (dog.breeds?.secondary) breeds.push(dog.breeds.secondary);
        if (breeds.length === 0) breeds.push('Mixed Breed');

        // Extract photos
        const photos: string[] = [];
        if (dog.photos && dog.photos.length > 0) {
          dog.photos.forEach((photo: any) => {
            if (photo.large) photos.push(photo.large);
            else if (photo.medium) photos.push(photo.medium);
            else if (photo.small) photos.push(photo.small);
          });
        }

        // Extract temperament from tags/attributes
        const temperament: string[] = [];
        if (dog.tags) {
          dog.tags.forEach((tag: string) => {
            if (tag && typeof tag === 'string') {
              temperament.push(tag);
            }
          });
        }
        if (dog.attributes) {
          Object.entries(dog.attributes).forEach(([key, value]) => {
            if (value === true) {
              temperament.push(key.replace(/_/g, ' '));
            }
          });
        }

        return {
          id: dog.id || `dog-${Math.random().toString(36).slice(2, 10)}`,
          name: dog.name || 'Unknown',
          breeds,
          age: dog.age || 'Unknown',
          size: dog.size || 'Unknown',
          energy: dog.energy || 'medium',
          temperament,
          location: {
            city: dog.contact?.address?.city || dog.city || 'Unknown',
            state: dog.contact?.address?.state || dog.state || 'Unknown',
            distanceMi: dog.distance || dog.distanceMi,
          },
          photos,
          matchScore: Math.floor(Math.random() * 20) + 80, // 80-100 for test email
          reasons: {
            primary150: `This ${dog.age || 'charming'} ${dog.size || 'wonderful'} ${breeds[0] || 'dog'} is a great match for your preferences!`,
            blurb50: 'Perfect companion',
          },
          shelter: {
            name: dog.organization?.name || dog.shelter?.name || 'Local Shelter',
            email: dog.contact?.email || dog.shelter?.email,
            phone: dog.contact?.phone || dog.shelter?.phone,
          },
          url: dog.url || dog.id ? `https://dogyenta.com/results?dog=${dog.id}` : '#',
        };
      });
    } else {
      console.warn('⚠️ Failed to fetch dogs, falling back to stub data:', dogsResponse.status);
      return sendTestEmailWithStubData(to, userEmail, resend, userName);
    }

    // If no dogs found, use stub data but with real preferences
    if (emailMatches.length === 0) {
      console.warn('⚠️ No dogs found, using stub data with real preferences');
      emailMatches = [
        {
          id: 'test-dog-1',
          name: 'Buddy',
          breeds: ['Golden Retriever', 'Labrador Mix'],
          age: 'young',
          size: 'large',
          energy: 'medium',
          temperament: ['friendly', 'playful'],
          location: { city: 'New York', state: 'NY', distanceMi: 5 },
          photos: ['https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400'],
          matchScore: 95,
          reasons: {
            primary150: 'This is a sample dog match shown in your test email. When alerts are enabled, you\'ll see real dog postings that match your preferences!',
            blurb50: 'Sample match',
          },
          shelter: { name: 'Sample Shelter', email: 'info@sample.org' },
          url: 'https://dogyenta.com/results',
        },
      ];
      totalMatches = 1;
    }

    // Get alert settings for frequency
    const { data: alertSettings } = await client
      .from('alert_settings')
      .select('cadence')
      .eq('user_id', userId)
      .single();
    
    const frequency = (alertSettings as any)?.cadence || 'daily';

    const testTemplateData: EmailTemplateData = {
      user: { name: userName, email: userEmail },
      preferences: {
        zipCodes,
        radiusMi,
        frequency,
      },
      matches: emailMatches,
      unsubscribeUrl: `${EMAIL_CONFIG.unsubscribeUrl}?email=${encodeURIComponent(userEmail)}`,
      dashboardUrl: EMAIL_CONFIG.dashboardUrl,
      totalMatches,
      generatedAt: new Date().toISOString(),
    };

    const testToken = signUnsubToken({
      sub: userEmail,
      scope: 'alerts+cancel',
      jti: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    });
    const testWithLink = {
      ...testTemplateData,
      unsubscribeUrl: `${EMAIL_CONFIG.unsubscribeUrl}?token=${encodeURIComponent(testToken)}`,
    };
    const htmlContent = generateEmailHTML(testWithLink);
    const textContent = generateEmailText(testWithLink);
    
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
        { name: 'user', value: userEmail.replace(/[^a-zA-Z0-9]/g, '_') },
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
 * Fallback function to send test email with stub data
 * Used when user data cannot be fetched or dogs API fails
 */
async function sendTestEmailWithStubData(
  to: string,
  userEmail: string,
  resend: any,
  userName: string = 'Test User'
): Promise<EmailServiceResponse> {
  try {
    const testTemplateData: EmailTemplateData = {
      user: { name: userName, email: userEmail },
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
          photos: ['https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400'],
          matchScore: 95,
          reasons: {
            primary150: 'This is a sample dog match shown in your test email. When alerts are enabled, you\'ll see real dog postings that match your preferences!',
            blurb50: 'Sample match',
          },
          shelter: { name: 'Sample Shelter', email: 'info@sample.org' },
          url: 'https://dogyenta.com/results',
        },
      ],
      unsubscribeUrl: `${EMAIL_CONFIG.unsubscribeUrl}?email=${encodeURIComponent(userEmail)}`,
      dashboardUrl: EMAIL_CONFIG.dashboardUrl,
      totalMatches: 1,
      generatedAt: new Date().toISOString(),
    };

    const testToken = signUnsubToken({
      sub: userEmail,
      scope: 'alerts+cancel',
      jti: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    });
    const testWithLink = {
      ...testTemplateData,
      unsubscribeUrl: `${EMAIL_CONFIG.unsubscribeUrl}?token=${encodeURIComponent(testToken)}`,
    };
    const htmlContent = generateEmailHTML(testWithLink);
    const textContent = generateEmailText(testWithLink);
    
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
        { name: 'user', value: userEmail.replace(/[^a-zA-Z0-9]/g, '_') },
      ],
    });

    if (result.error) {
      console.error('❌ Test email failed:', result.error);
      return {
        success: false,
        error: result.error.message || 'Failed to send test email',
      };
    }

    console.log('✅ Test email sent successfully (with stub data):', result.data?.id);
    
    await logEmailEvent({
      userId: userEmail,
      eventType: 'test_email',
      emailProvider: 'resend',
      messageId: result.data?.id,
      metadata: { testEmail: to, usedStubData: true },
    });

    return {
      success: true,
      messageId: result.data?.id,
    };

  } catch (error) {
    console.error('❌ Test email stub service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Log email events to the database with enhanced error handling
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
    let userId = event.userId;
    
    // If userId looks like an email, resolve to actual user ID
    if (event.userId.includes('@')) {
      const { data: userData, error: userError } = await client
        .from('users' as any)
        .select('id')
        .eq('email', event.userId)
        .single();

      if (userError) {
        console.warn(`⚠️ Could not resolve user ID for email ${event.userId}:`, userError.message);
        // Continue with email as userId for audit purposes
      } else {
        userId = (userData as any)?.id || event.userId;
      }
    }

    // Sanitize metadata to prevent issues
    const sanitizedMetadata = sanitizeMetadata(event.metadata || {});

    const { error: insertError } = await (client as any)
      .from('email_events')
      .insert({
        user_id: userId,
        event_type: event.eventType,
        email_provider: event.emailProvider || 'resend',
        message_id: event.messageId,
        metadata: sanitizedMetadata,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('❌ Failed to insert email event:', insertError);
    } else {
      console.log('📝 Email event logged:', event.eventType, event.userId);
    }
  } catch (error) {
    console.error('❌ Failed to log email event:', error);
    // Don't throw - logging failures shouldn't break email sending
  }
}

/**
 * Sanitize metadata to prevent database issues
 */
function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    // Skip null/undefined values
    if (value === null || value === undefined) {
      continue;
    }
    
    // Convert complex objects to strings if needed
    if (typeof value === 'object' && !Array.isArray(value)) {
      try {
        sanitized[key] = JSON.stringify(value);
      } catch {
        sanitized[key] = String(value);
      }
    } else if (Array.isArray(value)) {
      // Ensure arrays contain only serializable values
      sanitized[key] = value.map(item => 
        typeof item === 'object' ? JSON.stringify(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
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
