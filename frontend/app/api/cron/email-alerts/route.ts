import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { sendDogMatchAlert } from '@/lib/email/service';
import { searchDogs } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/email/config';

// POST /api/cron/email-alerts - Cron job to send email alerts
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (in production, add proper auth)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
    const { data: alertSettings, error: alertError } = await client
      .from('alert_settings')
      .select(`
        *,
        users!inner(email, name),
        preferences!inner(*)
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
    const results = [];

    for (const alertSetting of alertSettings) {
      try {
        processed++;
        const user = alertSetting.users;
        const preferences = alertSetting.preferences;
        
        console.log(`👤 Processing user: ${user.email}`);

        // Check if we already sent an email today (simplified rate limiting)
        const today = new Date();
        const lastSent = alertSetting.last_sent_at_utc ? new Date(alertSetting.last_sent_at_utc) : null;
        
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
        if (alertSetting.paused_until && new Date(alertSetting.paused_until) > new Date()) {
          console.log(`⏸️ User ${user.email} is paused until ${alertSetting.paused_until}`);
          results.push({
            user: user.email,
            status: 'paused',
            reason: 'User has paused alerts',
          });
          continue;
        }

        // Convert preferences to search parameters
        const searchParams = convertPreferencesToSearchParams(preferences);
        
        // Search for dogs
        console.log(`🔍 Searching for dogs for ${user.email}...`);
        const dogsResponse = await searchDogs(searchParams);
        
        if (!dogsResponse.dogs || dogsResponse.dogs.length === 0) {
          console.log(`ℹ️ No dogs found for ${user.email}`);
          results.push({
            user: user.email,
            status: 'no_matches',
            reason: 'No dogs found matching preferences',
          });
          continue;
        }

        // Filter out dogs that were already seen
        const lastSeenIds = alertSetting.last_seen_ids || [];
        const newDogs = dogsResponse.dogs.filter(dog => 
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

        // Convert dogs to email format
        const emailMatches = dogsToSend.map(dog => ({
          id: dog.id,
          name: dog.name,
          breeds: dog.breeds,
          age: dog.age,
          size: dog.size,
          energy: dog.energy || 'medium',
          temperament: dog.temperament || [],
          location: {
            city: dog.city || 'Unknown',
            state: dog.state || 'Unknown',
            distanceMi: dog.distanceMi,
          },
          photos: dog.photos || [],
          matchScore: Math.floor(Math.random() * 30) + 70, // Placeholder - would use actual matching score
          reasons: {
            primary150: `This ${dog.age} ${dog.size} ${dog.breeds[0] || 'dog'} is a great match for your lifestyle!`,
            blurb50: 'Perfect family companion',
          },
          shelter: {
            name: dog.shelter?.name || 'Local Shelter',
            email: dog.shelter?.email,
            phone: dog.shelter?.phone,
          },
          url: dog.url || '#',
        }));

        // Send email alert
        console.log(`📧 Sending email alert to ${user.email} with ${emailMatches.length} matches`);
        
        const emailResult = await sendDogMatchAlert({
          user: {
            name: user.name || 'Dog Lover',
            email: user.email,
          },
          preferences: {
            zipCodes: [preferences.location] || ['Unknown'],
            radiusMi: preferences.radius || 50,
            frequency: alertSetting.cadence,
          },
          matches: emailMatches,
          unsubscribeUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://dogyenta.com'}/unsubscribe?email=${encodeURIComponent(user.email)}`,
          dashboardUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://dogyenta.com'}/profile`,
          totalMatches: dogsResponse.total,
          generatedAt: new Date().toISOString(),
        });

        if (emailResult.success) {
          sent++;
          
          // Update alert settings with new last seen IDs and timestamp
          const newLastSeenIds = [
            ...lastSeenIds,
            ...dogsToSend.map(dog => dog.id)
          ].slice(-100); // Keep only last 100 IDs
          
          await client
            .from('alert_settings')
            .update({
              last_sent_at_utc: new Date().toISOString(),
              last_seen_ids: newLastSeenIds,
            })
            .eq('user_id', alertSetting.user_id);

          results.push({
            user: user.email,
            status: 'sent',
            matchesCount: emailMatches.length,
            messageId: emailResult.messageId,
          });
        } else {
          errors++;
          results.push({
            user: user.email,
            status: 'error',
            error: emailResult.error,
          });
        }

      } catch (error) {
        errors++;
        console.error(`❌ Error processing user ${alertSetting.users?.email}:`, error);
        results.push({
          user: alertSetting.users?.email || 'unknown',
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
 * Convert user preferences to search parameters
 */
function convertPreferencesToSearchParams(preferences: any) {
  return {
    zip: preferences.location,
    radius: preferences.radius || 50,
    age: preferences.age || [],
    size: preferences.size || [],
    includeBreeds: preferences.breed || [],
    sort: 'freshness' as const,
    limit: 50, // Get more results to filter new ones
  };
}
