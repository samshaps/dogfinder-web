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
        .map((err: any) => `${err.path.join('.')}: ${err.message}`)
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
        'List-Unsubscribe': `<${withLink.unsubscribeUrl}>, <mailto:${EMAIL_CONFIG.replyTo}?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'List-ID': 'DogYenta Alerts <alerts.dogyenta.com>',
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

    // Fetch real dogs from the internal API with timeout protection
    // Wrap in try-catch to gracefully fall back if it fails
    let emailMatches: EmailDogMatch[] = [];
    let totalMatches = 0;

    try {
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
      
      // Timeout based on benchmark data:
      // - Warm requests: ~100-230ms
      // - Cold starts: 3-5.5s (backend spin-up on Render.com)
      // - P95: 3.3s, P99: 5.5s
      // Using 8s to handle cold starts while still failing fast
      // NOTE: If generating AI reasoning for matches, add OpenAI timeout (6s) = ~14s total
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const dogsResponse = await fetch(`${baseUrl}/api/dogs?${searchParams.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
            url: dog.url ? dog.url : (dog.id ? `https://dogyenta.com/results?dog=${dog.id}` : '#'),
            publishedAt: dog.published_at || dog.publishedAt,
          };
        });
      } else {
        console.warn('⚠️ Failed to fetch dogs (status:', dogsResponse.status, '), falling back to stub data');
      }
    } catch (fetchError) {
      // Handle timeout or network errors gracefully
      if (fetchError instanceof Error && (fetchError.name === 'AbortError' || fetchError.message.includes('timeout'))) {
        console.warn('⚠️ Dog fetch timed out, using stub data with real preferences');
      } else {
        console.warn('⚠️ Dog fetch failed, using stub data with real preferences:', fetchError instanceof Error ? fetchError.message : 'Unknown error');
      }
    }

    // If no dogs found, use stub data but with real preferences
    if (emailMatches.length === 0) {
      console.log('⚠️ No dogs found, using stub data with real preferences');
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
        'List-Unsubscribe': `<${testWithLink.unsubscribeUrl}>, <mailto:${EMAIL_CONFIG.replyTo}?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'List-ID': 'DogYenta Alerts <alerts.dogyenta.com>',
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
 * Generate personalized email subject line
 */
function generateEmailSubject(data: EmailTemplateData): string {
  const { matches, totalMatches, preferences, user } = data;
  const zip = preferences?.zipCodes?.[0] || 'your area';
  
  if (matches.length === 1) {
    const d = matches[0];
    const dist = d.location.distanceMi ? ` (${Math.round(d.location.distanceMi)} mi)` : '';
    return `${user.name ? user.name + ', ' : ''}meet ${d.name} — ${d.matchScore}% in ${d.location.city}${dist}`;
  }
  
  const nearby = matches.filter((m: EmailDogMatch) => (m.location.distanceMi ?? 9999) <= 15).length;
  const nearbyBit = nearby > 0 ? `, ${nearby} ≤15mi` : '';
  return `${user.name ? user.name + ', ' : ''}${matches.length} new matches near ${zip}${nearbyBit}`;
}

/**
 * Build URL with UTM tracking parameters
 */
function buildUTMUrl(baseUrl: string, dogId: string, frequency: string, contentType: string = 'card'): string {
  try {
    // Ensure we have a full URL
    let fullUrl = baseUrl;
    if (!baseUrl.includes('://')) {
      fullUrl = baseUrl.startsWith('/') 
        ? `https://dogyenta.com${baseUrl}`
        : `https://dogyenta.com/${baseUrl}`;
    }
    const url = new URL(fullUrl);
    url.searchParams.set('utm_source', 'email');
    url.searchParams.set('utm_medium', 'alert');
    url.searchParams.set('utm_campaign', `alerts_${frequency}`);
    url.searchParams.set('utm_content', `${contentType}_${dogId}`);
    return url.toString();
  } catch (error) {
    // Fallback: append as query string if URL parsing fails
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}utm_source=email&utm_medium=alert&utm_campaign=alerts_${frequency}&utm_content=${contentType}_${dogId}`;
  }
}

/**
 * Format "Posted X hours ago" from ISO datetime
 */
function formatTimeAgo(isoString?: string): string {
  if (!isoString) return '';
  try {
    const posted = new Date(isoString);
    const now = new Date();
    const hoursAgo = Math.floor((now.getTime() - posted.getTime()) / (1000 * 60 * 60));
    
    if (hoursAgo < 1) return 'Posted just now';
    if (hoursAgo === 1) return 'Posted 1 hour ago';
    if (hoursAgo < 24) return `Posted ${hoursAgo} hours ago`;
    const daysAgo = Math.floor(hoursAgo / 24);
    if (daysAgo === 1) return 'Posted 1 day ago';
    return `Posted ${daysAgo} days ago`;
  } catch {
    return '';
  }
}

/**
 * Generate a single dog card HTML using table-based layout for email compatibility
 */
function generateDogCard(dog: EmailDogMatch, preferences: EmailTemplateData['preferences']): string {
  const photo = dog.photos?.[0] || 'https://dogyenta.com/email/placeholder-dog.png';
  const alt = `${dog.name} — ${dog.breeds.join(', ')}`;
  const distance = dog.location.distanceMi ? ` (${Math.round(dog.location.distanceMi)} mi)` : '';
  const timeAgo = formatTimeAgo(dog.publishedAt);
  const dogUrl = buildUTMUrl(dog.url, dog.id, preferences.frequency, 'card');
  const separator = dogUrl.includes('?') ? '&' : '?';
  
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" 
         style="border:1px solid #e2e8f0;border-radius:12px;margin:16px 0;background:#fff;max-width:600px;">
    <tr>
      <td style="padding:0;">
        <img src="${photo}" width="600" height="320" alt="${alt}" 
             style="width:100%;max-width:600px;height:auto;border-radius:12px 12px 0 0;display:block;border:none;">
      </td>
    </tr>
    <tr>
      <td style="padding:16px 20px;">
        <div style="color:#6b7280;font-size:14px;margin-bottom:8px;">
          ${dog.breeds.join(', ')} • ${dog.age} • ${dog.size}
        </div>
        <h3 style="margin:0 0 12px 0;font-size:20px;line-height:1.2;color:#1f2937;font-weight:700;">${dog.name}</h3>
        <div style="margin:0 0 12px 0;">
          <span style="display:inline-block;background:#10b981;color:#fff;
                       padding:6px 12px;border-radius:20px;font-weight:700;font-size:14px;line-height:1.4;">
            ${dog.matchScore}% match
          </span>
          <span style="color:#6b7280;font-size:13px;margin-left:8px;">
            ${dog.location.city}, ${dog.location.state}${distance}${timeAgo ? ' · ' + timeAgo : ''}
          </span>
        </div>
        ${dog.shelter.name ? `
        <div style="color:#9ca3af;font-size:12px;margin-bottom:12px;">
          From: ${dog.shelter.name} · ${dog.location.city}, ${dog.location.state}
        </div>` : ''}
        ${dog.reasons?.primary150 ? `
        <div style="background:#f3f4f6;border-radius:8px;padding:12px;margin:12px 0;color:#374151;font-size:14px;line-height:1.5;">
          <strong>Why ${dog.name} fits:</strong> ${dog.reasons.primary150}
        </div>` : ''}
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${dogUrl}" 
                     arcsize="8%" fillcolor="#667eea" stroke="f" 
                     style="height:44px;v-text-anchor:middle;width:260px;margin-top:8px;">
          <w:anchorlock/>
          <center style="color:#ffffff;font-family:Segoe UI, Arial, sans-serif;font-size:16px;font-weight:700;">
            View ${dog.name}'s Profile →
          </center>
        </v:roundrect>
        <![endif]-->
        <![if !mso]>
        <a href="${dogUrl}" 
           style="display:inline-block;background:#667eea;color:#fff;padding:12px 24px;border-radius:8px;
                  font-weight:700;font-size:16px;text-decoration:none;margin-top:8px;min-height:44px;line-height:44px;text-align:center;">
          View ${dog.name}'s Profile →
        </a>
        <![endif]>
      </td>
    </tr>
  </table>`;
}

/**
 * Generate HTML email content with improved layout and deliverability
 */
function generateEmailHTML(data: EmailTemplateData): string {
  const { user, matches, preferences, unsubscribeUrl, dashboardUrl } = data;
  const preheader = `New matches near ${preferences.zipCodes[0]} · Edit prefs or snooze anytime.`;
  const viewOnlineUrl = buildUTMUrl(`${dashboardUrl}?view=email-${encodeURIComponent(user.email)}`, 'view-online', preferences.frequency, 'view_online');
  const snoozeUrl = `${appConfig.publicBaseUrl || 'https://dogyenta.com'}/api/alerts/snooze?days=7&u=${encodeURIComponent(user.email)}`;
  const dashboardUrlWithUTM = buildUTMUrl(dashboardUrl, 'dashboard-top', preferences.frequency, 'dashboard_cta');
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <title>New Dog Matches Found</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1f2937;">
    <!-- Preheader (hidden) -->
    <div style="display:none!important;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;mso-hide:all;">
        ${preheader}
    </div>
    
    <!-- View in browser link -->
    <div style="text-align:right;font-size:12px;padding:8px 12px;color:#6b7280;">
        <a href="${viewOnlineUrl}" style="color:#6b7280;text-decoration:underline;">View in browser</a>
    </div>
    
    <!-- Container -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;">
        <tr>
            <td align="center" style="padding:0;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" 
                       style="max-width:600px;background-color:#ffffff;margin:0 auto;">
                    <!-- Header -->
                    <tr>
                        <td style="background-color:#667eea;padding:30px 20px;text-align:center;">
                            <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;line-height:1.2;">🐕 New Dog Matches!</h1>
                            <p style="margin:10px 0 0 0;font-size:16px;color:#ffffff;opacity:0.95;">
                                We found ${data.matches.length} amazing dog${data.matches.length > 1 ? 's' : ''} that match your preferences
                            </p>
                        </td>
                    </tr>
                    <!-- Dashboard CTA (top) -->
                    <tr>
                        <td style="padding:12px 20px 0 20px;text-align:center;">
                            <a href="${dashboardUrlWithUTM}" 
                               style="color:#667eea;text-decoration:underline;font-size:14px;">
                                View all matches in your dashboard →
                            </a>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding:20px;">
                            <!-- Greeting -->
                            <div style="font-size:18px;margin-bottom:20px;color:#1f2937;">
                                Hi ${user.name || 'there'}! 👋
                            </div>
                            
                            <!-- Summary Box -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" 
                                   style="background-color:#f7fafc;border-left:4px solid #667eea;border-radius:0 8px 8px 0;margin:20px 0;">
                                <tr>
                                    <td style="padding:20px;">
                                        <h2 style="margin:0 0 10px 0;color:#1f2937;font-size:20px;font-weight:700;">Your Search Summary</h2>
                                        <p style="margin:5px 0;color:#4b5563;font-size:14px;line-height:1.6;">
                                            <strong>Location:</strong> ${preferences.zipCodes.join(', ')} (within ${preferences.radiusMi} miles)
                                        </p>
                                        <p style="margin:5px 0;color:#4b5563;font-size:14px;line-height:1.6;">
                                            <strong>Frequency:</strong> ${preferences.frequency} alerts
                                        </p>
                                        <p style="margin:5px 0;color:#4b5563;font-size:14px;line-height:1.6;">
                                            <strong>Matches Found:</strong> ${data.totalMatches} total, showing top ${data.matches.length}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Control Strip -->
                            <div style="text-align:center;font-size:12px;color:#6b7280;margin:16px 0 24px 0;padding-top:16px;border-top:1px solid #e5e7eb;">
                                <a href="${dashboardUrl}" style="color:#6b7280;text-decoration:underline;">Edit preferences</a>
                                &nbsp;·&nbsp;
                                <a href="${snoozeUrl}" style="color:#6b7280;text-decoration:underline;">Snooze 7 days</a>
                                &nbsp;·&nbsp;
                                <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
                            </div>
                            
                            <!-- Dog Cards -->
                            ${matches.map((dog: EmailDogMatch) => generateDogCard(dog, preferences)).join('')}
                            
                            <!-- Bottom CTA -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:30px 0;">
                                <tr>
                                    <td align="center" style="padding:0;">
                                        <!--[if mso]>
                                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" 
                                                     href="${buildUTMUrl(dashboardUrl, 'dashboard-bottom', preferences.frequency, 'dashboard_cta')}" 
                                                     arcsize="8%" fillcolor="#667eea" stroke="f" 
                                                     style="height:44px;v-text-anchor:middle;width:280px;">
                                            <w:anchorlock/>
                                            <center style="color:#ffffff;font-family:Segoe UI, Arial, sans-serif;font-size:16px;font-weight:700;">
                                                View All Matches in Dashboard →
                                            </center>
                                        </v:roundrect>
                                        <![endif]-->
                                        <![if !mso]>
                                        <a href="${buildUTMUrl(dashboardUrl, 'dashboard-bottom', preferences.frequency, 'dashboard_cta')}" 
                                           style="display:inline-block;background:#667eea;color:#fff;padding:12px 24px;border-radius:8px;
                                                  font-weight:700;font-size:16px;text-decoration:none;min-height:44px;line-height:44px;text-align:center;">
                                            View All Matches in Dashboard →
                                        </a>
                                        <![endif]>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#1f2937;color:#ffffff;padding:30px 20px;text-align:center;">
                            <p style="margin:5px 0;opacity:0.9;font-size:14px;line-height:1.6;">Happy dog hunting! 🐕</p>
                            <p style="margin:5px 0;opacity:0.9;font-size:14px;line-height:1.6;">The DogYenta Team</p>
                            <p style="margin:20px 0 5px 0;opacity:0.7;font-size:12px;line-height:1.6;padding-top:20px;border-top:1px solid #374151;">
                                DogYenta, 123 Example Ave, Brooklyn, NY 11211
                            </p>
                            <div style="margin-top:20px;padding-top:20px;border-top:1px solid #374151;">
                                <p style="margin:5px 0;opacity:0.8;font-size:13px;line-height:1.6;">
                                    Don't want these alerts? <a href="${unsubscribeUrl}" style="color:#90cdf4;text-decoration:underline;">Unsubscribe here</a>
                                </p>
                                <p style="margin:5px 0;opacity:0.8;font-size:13px;line-height:1.6;">
                                    Or <a href="${dashboardUrl}" style="color:#90cdf4;text-decoration:underline;">manage your preferences</a> to customize your alerts
                                </p>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

/**
 * Generate plain text email content with improved formatting
 */
function generateEmailText(data: EmailTemplateData): string {
  const { user, matches, preferences, dashboardUrl, unsubscribeUrl } = data;
  const preheader = `New matches near ${preferences.zipCodes[0]} · Edit prefs or snooze anytime.`;
  const snoozeUrl = `${appConfig.publicBaseUrl || 'https://dogyenta.com'}/api/alerts/snooze?days=7&u=${encodeURIComponent(user.email)}`;
  
  let text = `${preheader}\n\n`;
  text += `Hi ${user.name || 'there'},\n\n`;
  text += `We found ${matches.length} new match(es) within ${preferences.radiusMi} miles.\n\n`;
  
  matches.forEach((dog: EmailDogMatch, i: number) => {
    const dist = dog.location.distanceMi ? ` (${Math.round(dog.location.distanceMi)} mi)` : '';
    const dogUrl = buildUTMUrl(dog.url, dog.id, preferences.frequency, 'card');
    const timeAgo = formatTimeAgo(dog.publishedAt);
    
    text += `${i+1}. ${dog.name} — ${dog.matchScore}% match\n`;
    text += `   ${dog.breeds.join(', ')} • ${dog.age} • ${dog.size}\n`;
    text += `   ${dog.location.city}, ${dog.location.state}${dist}${timeAgo ? ' · ' + timeAgo : ''}\n`;
    if (dog.shelter.name) {
      text += `   From: ${dog.shelter.name} · ${dog.location.city}, ${dog.location.state}\n`;
    }
    if (dog.reasons?.primary150) {
      text += `   Why: ${dog.reasons.primary150}\n`;
    }
    text += `   ${dogUrl}\n\n`;
  });
  
  text += `All matches: ${buildUTMUrl(dashboardUrl, 'dashboard-text', preferences.frequency, 'dashboard_cta')}\n`;
  text += `Snooze 7 days: ${snoozeUrl}\n`;
  text += `Unsubscribe: ${unsubscribeUrl}\n\n`;
  text += `Happy dog hunting! 🐕\n`;
  text += `The DogYenta Team\n\n`;
  text += `DogYenta, 123 Example Ave, Brooklyn, NY 11211\n`;
  
  return text;
}
