import { NextRequest, NextResponse } from 'next/server';
import { inferDogTraitsBatch } from '@/lib/inference/trait-inference';
import { storeInferredTraits, getInferredTraits } from '@/lib/inference/trait-storage';
import { Dog as SchemaDog } from '@/lib/schemas';

// Simple in-memory Petfinder token cache (scoped to the serverless instance)
let pfToken: { accessToken: string; expiresAt: number } | null = null;

async function getPetfinderAccessToken(requestId: string): Promise<string> {
  const now = Date.now();
  if (pfToken && pfToken.expiresAt - 60_000 > now) {
    return pfToken.accessToken;
  }
  const clientId = process.env.PETFINDER_CLIENT_ID;
  const clientSecret = process.env.PETFINDER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Petfinder credentials missing');
  }
  const resp = await fetch('https://api.petfinder.com/v2/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret })
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Failed to get Petfinder token: ${resp.status} ${resp.statusText} ${txt.substring(0,120)}`);
  }
  const data = await resp.json();
  const expiresInMs = (data.expires_in || 3600) * 1000;
  pfToken = { accessToken: data.access_token, expiresAt: now + expiresInMs };
  return pfToken.accessToken;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Get the search params from the request
    const { searchParams } = new URL(request.url);
    const zipParam = searchParams.get('zip') || '';
    const coarseZip = zipParam.split(',')[0]?.slice(0, 3) || '';
    
    // Log request details
    const hasGuidance = searchParams.has('guidance');
    const guidanceLength = searchParams.get('guidance')?.length || 0;
    console.log(`[${requestId}] 🔄 /api/dogs called`, {
      hasGuidance,
      guidanceLength,
      params: Object.fromEntries(searchParams.entries()),
      zipCoarse: coarseZip,
      timestamp: new Date().toISOString()
    });
    
    // Build Petfinder query
    const normalized = new URLSearchParams();
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 20);
    const page = parseInt(searchParams.get('page') || '1', 10) || 1;
    normalized.set('limit', String(limit));
    normalized.set('page', String(page));
    ['zip','radius','age','size','breed','sort'].forEach((k) => {
      const v = searchParams.get(k);
      if (v) normalized.set(k, v);
    });

    const pfParams = new URLSearchParams();
    pfParams.set('type', 'dog');
    const zip = normalized.get('zip');
    const radius = normalized.get('radius');
    if (zip) pfParams.set('location', zip);
    if (zip && radius) {
      pfParams.set('distance', radius);
    } else if (radius) {
      console.warn(`[${requestId}] ⚠️ Skipping Petfinder distance param because no location was provided`);
    }
    if (normalized.get('age')) pfParams.set('age', normalized.get('age') as string);
    if (normalized.get('size')) pfParams.set('size', normalized.get('size') as string);
    if (normalized.get('breed')) pfParams.set('breed', normalized.get('breed') as string);
    pfParams.set('sort', normalized.get('sort') === 'distance' ? 'distance' : 'recent');
    pfParams.set('limit', String(limit));
    pfParams.set('page', String(page));

    const pfUrl = `https://api.petfinder.com/v2/animals?${pfParams.toString()}`;
    let backendDuration = 0;
    let animals: any[] = [];
    let total = 0;
    let currentPage = page;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const attemptStart = Date.now();
      try {
        const token = await getPetfinderAccessToken(requestId);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), attempt === 1 ? 20000 : 35000);
        const resp = await fetch(pfUrl, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        backendDuration = Date.now() - attemptStart;
        if (resp.status === 401 && attempt === 1) { pfToken = null; continue; }
        if (!resp.ok) {
          const txt = await resp.text().catch(() => '');
          throw new Error(`Petfinder error: ${resp.status} ${resp.statusText} ${txt.substring(0,120)}`);
        }
        const data = await resp.json();
        animals = Array.isArray(data.animals) ? data.animals : [];
        total = data.pagination?.total_count || animals.length;
        currentPage = data.pagination?.current_page || currentPage;
        break;
      } catch (e) {
        backendDuration = Date.now() - attemptStart;
        console.warn(`[${requestId}] ⚠️ Petfinder attempt ${attempt} failed after ${backendDuration}ms:`, (e as Error)?.message);
        if (attempt === 2) throw e;
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    const totalDuration = Date.now() - startTime;
    const responseHeaders = new Headers();
    responseHeaders.set('X-Request-ID', requestId);
    responseHeaders.set('X-Backend-Duration', `${backendDuration}`);
    responseHeaders.set('X-Total-Duration', `${totalDuration}`);
    responseHeaders.set('X-Route', '/api/dogs');

    // Simple 60s in-memory cache per normalized query
    try {
      (globalThis as any).__DOGS_CACHE__ = (globalThis as any).__DOGS_CACHE__ || new Map<string, { data: any; exp: number }>();
      const cacheKey = `q:${pfParams.toString()}`;
      const cache = (globalThis as any).__DOGS_CACHE__ as Map<string, { data: any; exp: number }>;
      const now = Date.now();
      // Write-through cache
      const payload = { items: animals, page: currentPage, pageSize: animals.length, total };
      cache.set(cacheKey, { data: payload, exp: now + 60_000 });
      responseHeaders.set('X-Cache', 'MISS');
      
      // V2: Trigger batch inference asynchronously (don't block response)
      if (animals.length > 0) {
        // Fire and forget - run in background using Promise (works in both Node and Edge)
        Promise.resolve().then(async () => {
          try {
            // Transform animals to SchemaDog format for inference
            const dogsForInference: SchemaDog[] = animals.map((animal: any) => ({
              id: String(animal.id || ''),
              name: animal.name || 'Unknown',
              breeds: animal.breeds ? [
                animal.breeds.primary,
                animal.breeds.secondary
              ].filter(Boolean) : ['Mixed Breed'],
              age: animal.age || 'Unknown',
              size: animal.size || 'Unknown',
              energy: 'medium', // Default, will be inferred
              temperament: [],
              location: {
                zip: `${animal.contact?.address?.city || 'Unknown'}, ${animal.contact?.address?.state || 'Unknown'}`,
                distanceMi: animal.distance || 0
              },
              tags: animal.tags || [],
              url: animal.url || '#',
              shelter: {
                name: animal.organization?.name || 'Unknown Shelter',
                email: animal.contact?.email || '',
                phone: animal.contact?.phone || ''
              },
              rawDescription: animal.description || undefined
            }));
            
            // Filter dogs that need inference (have description, don't have cached traits)
            const dogsNeedingInference: SchemaDog[] = [];
            for (const dog of dogsForInference) {
              const description = dog.rawDescription || '';
              if (description.trim().length > 0) {
                // Check if we already have inferred traits
                const existing = await getInferredTraits(dog.id);
                if (!existing) {
                  dogsNeedingInference.push(dog);
                }
              }
            }
            
            if (dogsNeedingInference.length > 0) {
              console.log(`[${requestId}] 🔍 Batch inferring traits for ${dogsNeedingInference.length} dogs...`);
              const inferredMap = await inferDogTraitsBatch(dogsNeedingInference, 10);
              
              // Store results
              for (const [dogId, traits] of inferredMap.entries()) {
                await storeInferredTraits(dogId, traits);
              }
              
              console.log(`[${requestId}] ✅ Stored inferred traits for ${inferredMap.size} dogs`);
            }
          } catch (error) {
            console.error(`[${requestId}] ⚠️ Background trait inference failed:`, error);
            // Don't throw - this is fire-and-forget
          }
        }).catch(() => {
          // Silently handle any promise rejection
        });
      }
      
      return NextResponse.json(payload, { headers: responseHeaders });
    } catch {
      // If cache fails, still return the payload
      const payload = { items: animals, page: currentPage, pageSize: animals.length, total };
      return NextResponse.json(payload, { headers: responseHeaders });
    }
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Error proxying to backend after ${totalDuration}ms:`, error);
    
    // Handle timeout/abort specifically
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      console.error(`[${requestId}] ⏱️ TIMEOUT - Request exceeded 15s limit (actual: ${totalDuration}ms)`);
      const timeoutHeaders = new Headers();
      timeoutHeaders.set('X-Request-ID', requestId);
      timeoutHeaders.set('X-Backend-Duration', '0');
      timeoutHeaders.set('X-Total-Duration', `${totalDuration}`);
      timeoutHeaders.set('X-Route', '/api/dogs');
      return NextResponse.json(
        { 
          error: 'Backend timeout', 
          message: 'The backend API is taking too long to respond. Please try again later.',
          details: `Backend API timeout after ${totalDuration}ms`
        },
        { status: 504, headers: timeoutHeaders }
      );
    }
    
    const errorHeaders = new Headers();
    errorHeaders.set('X-Request-ID', requestId);
    errorHeaders.set('X-Backend-Duration', '0');
    errorHeaders.set('X-Total-Duration', `${totalDuration}`);
    errorHeaders.set('X-Route', '/api/dogs');
    return NextResponse.json(
      { error: 'Failed to fetch dogs from backend', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: errorHeaders }
    );
  }
}
