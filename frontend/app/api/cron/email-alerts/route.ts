import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { sendDogMatchAlert } from '@/lib/email/service';
import { RATE_LIMITS } from '@/lib/email/config';
import { appConfig } from '@/lib/config';
import crypto from 'crypto';

// POST /api/cron/email-alerts - Cron job to send email alerts
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request with constant-time comparison
    const authHeader = request.headers.get('authorization');
    
    // Get the appropriate cron secret based on environment
    // VERCEL_ENV: 'development' (local), 'preview' (staging), 'production' (prod)
    const isProduction = process.env.VERCEL_ENV === 'production';
    const cronSecret = isProduction 
      ? appConfig.cronSecretProd 
      : appConfig.cronSecretStaging;
    
    console.log('🔍 Cron auth debug:', {
      vercelEnv: process.env.VERCEL_ENV,
      nodeEnv: process.env.NODE_ENV,
      isProduction,
      hasCronSecretProd: !!appConfig.cronSecretProd,
      hasCronSecretStaging: !!appConfig.cronSecretStaging,
      hasCronSecret: !!cronSecret,
      authHeaderPresent: !!authHeader,
      cronSecretLength: cronSecret?.length || 0
    });
    
    if (cronSecret && !isValidCronAuth(authHeader, cronSecret)) {
      console.error('❌ Invalid cron authentication attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Starting email alerts cron job...');
    
    const client = getSupabaseClient();
    
    // Get all users with enabled email alerts
    // For now, we'll send to all users with enabled alerts regardless of cadence
    // since we're simplifying to daily at 12pm Eastern
    // Fetch alert settings with the related user only. We'll fetch
    // preferences in a follow-up query per user to avoid FK join issues
    const { data: alertSettings, error: alertError } = await client
      .from('alert_settings' as any)
      .select(`
        *,
        users!inner(email, name)
      `)
      .eq('enabled', true);

    if (alertError) {
      console.error('❌ Error fetching alert settings:', alertError);
      return NextResponse.json(
        { error: 'Failed to fetch alert settings' },
        { status: 500 }
      );
    }

    if (!alertSettings || alertSettings.length === 0) {
      console.log('ℹ️ No users with enabled email alerts found');
      return NextResponse.json({
        message: 'No users with enabled email alerts',
        processed: 0,
        sent: 0,
        errors: 0,
      });
    }

    console.log(`📧 Processing ${alertSettings.length} users with enabled alerts`);

    let processed = 0;
    let sent = 0;
    let errors = 0;
    const results: Array<{
      user: string;
      status: string;
      reason?: string;
      error?: string;
      matchesCount?: number;
      messageId?: string;
    }> = [];

    // Process each user with individual error handling
    for (const alertSetting of alertSettings) {
      const userEmail = (alertSetting as any).users?.email;
      if (!userEmail) {
        console.error('❌ Alert setting missing user email:', alertSetting);
        errors++;
        results.push({
          user: 'unknown',
          status: 'error',
          error: 'Missing user email in alert setting',
        });
        continue;
      }

      try {
        processed++;
        const user = (alertSetting as any).users;

        // Fetch preferences for this user (no FK join dependency)
        const { data: prefs, error: prefsError } = await (client as any)
          .from('preferences')
          .select('*')
          .eq('user_id', (alertSetting as any).user_id)
          .single();

        if (prefsError || !prefs) {
          console.log(`ℹ️ No preferences found for ${userEmail}:`, prefsError?.message || 'No data');
          results.push({
            user: userEmail,
            status: 'no_prefs',
            reason: prefsError?.message || 'No preferences found for user',
          });
          continue;
        }

        const preferences = prefs as any;
        
        console.log(`👤 Processing user: ${user.email}`);

        // Check if we already sent an email today (simplified rate limiting)
        const today = new Date();
        const lastSent = (alertSetting as any).last_sent_at_utc ? new Date((alertSetting as any).last_sent_at_utc) : null;
        
        if (lastSent) {
          const todayStart = new Date(today);
          todayStart.setHours(0, 0, 0, 0);
          
          if (lastSent >= todayStart) {
            console.log(`⏰ Email already sent today for ${user.email}`);
            results.push({
              user: user.email,
              status: 'already_sent_today',
              reason: 'Email already sent today',
            });
            continue;
          }
        }

        // Check if user is paused
        if ((alertSetting as any).paused_until && new Date((alertSetting as any).paused_until) > new Date()) {
          console.log(`⏸️ User ${user.email} is paused until ${(alertSetting as any).paused_until}`);
          results.push({
            user: user.email,
            status: 'paused',
            reason: 'User has paused alerts',
          });
          continue;
        }

        // Convert preferences to search parameters
        const searchParams = convertPreferencesToSearchParams(preferences);
        
        // Search for dogs via internal Next.js API route (single hop on Vercel)
        console.log(`🔍 Searching for dogs for ${userEmail}...`);
        let dogsResponse: any;
        try {
          // Construct base URL for server-side fetch
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

          const queryParams = new URLSearchParams();
          if (searchParams.zip) queryParams.append('zip', searchParams.zip);
          if (searchParams.radius) queryParams.append('radius', searchParams.radius.toString());
          if (searchParams.age && Array.isArray(searchParams.age) && searchParams.age.length > 0) {
            queryParams.append('age', searchParams.age.join(','));
          }
          if (searchParams.size && Array.isArray(searchParams.size) && searchParams.size.length > 0) {
            queryParams.append('size', searchParams.size.join(','));
          }
          if (searchParams.includeBreeds && Array.isArray(searchParams.includeBreeds) && searchParams.includeBreeds.length > 0) {
            queryParams.append('breed', searchParams.includeBreeds.join(','));
          }
          queryParams.append('sort', searchParams.sort || 'freshness');
          queryParams.append('limit', (searchParams.limit || 20).toString()); // cap inside route too

          const apiUrl = `${baseUrl}/api/dogs?${queryParams.toString()}`;
          console.log(`📡 Calling internal API route: ${apiUrl}`);

          // Single attempt with 30s timeout (internal route has its own retry/limits)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          const response = await fetch(apiUrl, { cache: 'no-store', signal: controller.signal });
          clearTimeout(timeoutId);

          if (!response.ok) {
            const errText = await response.text().catch(() => '');
            throw new Error(`Internal API error: ${response.status} ${response.statusText}${errText ? ` - ${errText.substring(0, 120)}` : ''}`);
          }

          const data = await response.json();
          dogsResponse = {
            dogs: data.items || [],
            total: data.total || 0,
          };
        } catch (searchError) {
          console.error(`❌ Dog search failed for ${userEmail}:`, searchError);
          errors++;
          results.push({
            user: userEmail,
            status: 'error',
            error: `Dog search failed: ${searchError instanceof Error ? searchError.message : 'Unknown error'}`,
          });
          continue;
        }
        
        if (!dogsResponse.dogs || dogsResponse.dogs.length === 0) {
          console.log(`ℹ️ No dogs found for ${userEmail}`);
          results.push({
            user: userEmail,
            status: 'no_matches',
            reason: 'No dogs found matching preferences',
          });
          continue;
        }

        // Filter out dogs that were already seen
        const lastSeenIds = (alertSetting as any).last_seen_ids || [];
        const newDogs = dogsResponse.dogs.filter((dog: any) => 
          !lastSeenIds.includes(dog.id)
        );

        if (newDogs.length === 0) {
          console.log(`ℹ️ No new dogs found for ${user.email}`);
          results.push({
            user: user.email,
            status: 'no_new_matches',
            reason: 'No new dogs since last alert',
          });
          continue;
        }

        // Limit number of dogs per email
        const maxDogs = 5; // Could be configurable per user
        const dogsToSend = newDogs.slice(0, maxDogs);

        // Fetch AI reasoning for dogs (with timeout/error handling)
        console.log(`🤖 Fetching AI reasoning for ${dogsToSend.length} dogs for ${userEmail}...`);
        let aiReasons: Record<string, string> = {};
        try {
          const { fetchAIReasoningForDogs } = await import('@/lib/email/service');
          aiReasons = await fetchAIReasoningForDogs((alertSetting as any).user_id, dogsToSend, preferences).catch((err) => {
            console.warn(`⚠️ AI reasoning fetch failed for ${userEmail}, continuing with fallback:`, err instanceof Error ? err.message : 'Unknown error');
            return {};
          });
        } catch (importError) {
          console.warn(`⚠️ Failed to import fetchAIReasoningForDogs for ${userEmail}:`, importError instanceof Error ? importError.message : 'Unknown error');
        }

        // Convert dogs to email format (Petfinder raw -> template)
        const emailMatches = dogsToSend.map((dog: any) => {
          const dogIdStr = String(dog.id);
          const aiReason = aiReasons[dogIdStr] || '';
          if (!aiReason) {
            console.log(`⚠️ No AI reasoning for dog ${dogIdStr} (${dog.name || 'unknown'}) - will be omitted from email`);
          }

          // Breeds
          const breeds: string[] = [];
          if (dog.breeds?.primary) breeds.push(dog.breeds.primary);
          if (dog.breeds?.secondary) breeds.push(dog.breeds.secondary);
          if (breeds.length === 0) breeds.push('Mixed Breed');

          // Photos -> array of URLs
          const photos: string[] = Array.isArray(dog.photos)
            ? dog.photos.reduce((acc: string[], p: any) => {
                if (p?.large) acc.push(p.large);
                else if (p?.medium) acc.push(p.medium);
                else if (p?.small) acc.push(p.small);
                return acc;
              }, [])
            : [];

          return {
            id: dogIdStr,
            name: dog.name || 'Unknown',
            breeds,
            age: dog.age || 'Unknown',
            size: dog.size || 'Unknown',
            energy: 'medium',
            temperament: Array.isArray(dog.tags) ? dog.tags : [],
            location: {
              city: dog.contact?.address?.city || 'Unknown',
              state: dog.contact?.address?.state || 'Unknown',
              distanceMi: dog.distance,
            },
            photos,
            matchScore: Math.floor(Math.random() * 30) + 70,
            reasons: { primary150: aiReason, blurb50: '' },
            shelter: {
              name: dog.organization?.name || 'Local Shelter',
              email: dog.contact?.email || undefined,
              phone: dog.contact?.phone || undefined,
            },
            url: dog.url || '#',
            publishedAt: dog.published_at,
          };
        });

        // Send email alert with retry logic
        console.log(`📧 Sending email alert to ${userEmail} with ${emailMatches.length} matches`);
        
        // Normalize zipCodes - handle both location string and zip_codes array
        let zipCodes: string[] = [];
        if (preferences.zip_codes && Array.isArray(preferences.zip_codes) && preferences.zip_codes.length > 0) {
          zipCodes = preferences.zip_codes;
        } else if (preferences.location) {
          zipCodes = [preferences.location];
        } else {
          zipCodes = ['Unknown'];
        }

        const emailResult = await sendEmailWithRetry({
          user: {
            name: user.name || 'Dog Lover',
            email: userEmail,
          },
          preferences: {
            zipCodes,
            radiusMi: preferences.radius || preferences.radius_mi || 50,
            frequency: (alertSetting as any).cadence || 'daily',
            // Spread all other preference fields for email template
            ...preferences,
          },
          matches: emailMatches,
          unsubscribeUrl: `${appConfig.publicBaseUrl || 'https://dogyenta.com'}/unsubscribe?email=${encodeURIComponent(userEmail)}`,
          dashboardUrl: `${appConfig.publicBaseUrl || 'https://dogyenta.com'}/profile`,
          totalMatches: dogsResponse.total,
          generatedAt: new Date().toISOString(),
        });

        if (emailResult.success) {
          sent++;
          
          // Update alert settings with new last seen IDs and timestamp
          const newLastSeenIds = [
            ...lastSeenIds,
            ...dogsToSend.map((dog: any) => dog.id)
          ].slice(-100); // Keep only last 100 IDs
          
          try {
            await (client as any)
              .from('alert_settings')
              .update({
                last_sent_at_utc: new Date().toISOString(),
                last_seen_ids: newLastSeenIds,
              })
              .eq('user_id', (alertSetting as any).user_id);
          } catch (updateError) {
            console.error(`❌ Failed to update alert settings for ${userEmail}:`, updateError);
            // Don't fail the whole process for this
          }

          results.push({
            user: userEmail,
            status: 'sent',
            matchesCount: emailMatches.length,
            messageId: emailResult.messageId,
          });
        } else {
          errors++;
          results.push({
            user: userEmail,
            status: 'error',
            error: emailResult.error,
          });
        }

      } catch (error) {
        errors++;
        console.error(`❌ Error processing user ${userEmail}:`, error);
        results.push({
          user: userEmail,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`✅ Email alerts cron job completed: ${processed} processed, ${sent} sent, ${errors} errors`);

    return NextResponse.json({
      message: 'Email alerts cron job completed',
      processed,
      sent,
      errors,
      results,
      debug: {
        vercelEnv: process.env.VERCEL_ENV,
        isProduction,
        hasCronSecret: !!cronSecret,
        authHeaderPresent: !!authHeader,
        cronSecretLength: cronSecret?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Email alerts cron job failed:', error);
    return NextResponse.json(
      { error: 'Email alerts cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Rate limiting is now simplified to daily emails only

/**
 * Constant-time comparison for cron authentication
 */
function isValidCronAuth(authHeader: string | null, secret: string): boolean {
  console.log('🔍 isValidCronAuth debug:', {
    hasAuthHeader: !!authHeader,
    authHeaderPrefix: authHeader?.substring(0, 10),
    secretLength: secret?.length || 0,
    providedSecretLength: authHeader?.slice(7)?.length || 0
  });
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ Auth header missing or invalid prefix');
    return false;
  }
  
  const providedSecret = authHeader.slice(7); // Remove 'Bearer '
  
  // Simple length check first, then timing-safe comparison
  if (providedSecret.length !== secret.length) {
    console.log('❌ Secret length mismatch');
    return false;
  }
  
  const isValid = crypto.timingSafeEqual(
    Buffer.from(providedSecret, 'utf8'),
    Buffer.from(secret, 'utf8')
  );
  
  console.log('🔍 Auth comparison result:', { isValid });
  return isValid;
}

/**
 * Send email with retry logic for transient failures
 */
async function sendEmailWithRetry(
  templateData: any,
  maxRetries: number = 3
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendDogMatchAlert(templateData);
      
      if (result.success) {
        return result;
      }
      
      // If it's a transient error, retry
      if (isTransientError(result.error)) {
        console.log(`⚠️ Transient error on attempt ${attempt}/${maxRetries}:`, result.error);
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
          continue;
        }
      }
      
      // Non-transient error or max retries reached
      return result;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (isTransientError(lastError.message)) {
        console.log(`⚠️ Transient error on attempt ${attempt}/${maxRetries}:`, lastError.message);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
          continue;
        }
      }
      
      // Non-transient error or max retries reached
      break;
    }
  }
  
  return {
    success: false,
    error: lastError?.message || 'Max retries exceeded',
  };
}

/**
 * Check if an error is transient and worth retrying
 */
function isTransientError(error: string | undefined): boolean {
  if (!error) return false;
  
  const transientPatterns = [
    /timeout/i,
    /network/i,
    /connection/i,
    /rate limit/i,
    /temporary/i,
    /service unavailable/i,
    /internal server error/i,
    /bad gateway/i,
    /gateway timeout/i,
  ];
  
  return transientPatterns.some(pattern => pattern.test(error));
}

/**
 * Convert user preferences to search parameters
 */
function convertPreferencesToSearchParams(preferences: any) {
  // Handle both zip_codes array and location string
  let zip = preferences.location;
  if (preferences.zip_codes && Array.isArray(preferences.zip_codes) && preferences.zip_codes.length > 0) {
    zip = preferences.zip_codes[0]; // Use first zip code
  }
  
  return {
    zip: zip,
    radius: preferences.radius || preferences.radius_mi || 50,
    age: preferences.age_preferences || preferences.age || [],
    size: preferences.size_preferences || preferences.size || [],
    includeBreeds: preferences.include_breeds || preferences.breed || [],
    sort: 'freshness' as const,
    limit: 50, // Get more results to filter new ones
  };
}
