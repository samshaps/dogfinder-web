import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-auth';
import { requireSession, okJson, errJson, ApiErrors } from '@/lib/api/helpers';

/**
 * Debug endpoint to check the actual database schema
 * GET /api/debug-schema?table=preferences
 */
export async function GET(request: NextRequest) {
  try {
    const { session, response } = await requireSession(request);
    if (response) return response;

    const tableName = request.nextUrl.searchParams.get('table') || 'preferences';
    const client = getSupabaseClient();

    try {
      // Try to get one row to see the structure - this will show us what columns exist
      const { data, error } = await (client as any)
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        return okJson({
          error: error.message,
          errorCode: error.code,
          hint: error.hint,
          message: `Error querying ${tableName} table. The table might not exist or we might not have permissions.`
        }, request);
      }

      // Get column names from the first row (if exists)
      const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
      
      // Also try querying information_schema via PostgREST using a function or direct access
      // Use the service role key to query information_schema
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      let schemaInfo = null;
      if (supabaseUrl && serviceRoleKey) {
        try {
          // Query information_schema.columns using PostgREST
          // Note: PostgREST might not expose information_schema directly, so we'll use a view if available
          // Or we can create a simple query that exposes column info
          const schemaResponse = await fetch(
            `${supabaseUrl}/rest/v1/information_schema.columns?table_name=eq.${tableName}&table_schema=eq.public&select=column_name,data_type,is_nullable,column_default`,
            {
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Profile': 'public',
              }
            }
          );
          
          if (schemaResponse.ok) {
            schemaInfo = await schemaResponse.json();
          }
        } catch (schemaError) {
          // If that doesn't work, that's okay - we'll just use the sample row approach
          console.log('Could not query information_schema:', schemaError);
        }
      }

      return okJson({
        tableName,
        columnsFromSample: columns,
        sampleRow: data?.[0] || null,
        rowCount: data?.length || 0,
        schemaInfo: schemaInfo || null,
        message: schemaInfo 
          ? 'Schema information retrieved from information_schema'
          : 'Showing columns inferred from sample row. Check Supabase dashboard for full schema.',
      }, request);

    } catch (queryError: any) {
      return okJson({
        error: queryError.message,
        tableName,
        message: 'Could not query table structure'
      }, request);
    }

  } catch (error) {
    console.error('Error checking schema:', error);
    return errJson(ApiErrors.internalError('Failed to check schema'), request);
  }
}
