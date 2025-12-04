import { NextRequest, NextResponse } from 'next/server';
import { inferDogTraitsBatch } from '@/lib/inference/trait-inference';
import { storeInferredTraits, getInferredTraits } from '@/lib/inference/trait-storage';
import { Dog as SchemaDog } from '@/lib/schemas';
import { getActiveDogProvider, type SearchDogsParams } from '@/lib/dogProviders';
import type { Dog as ProviderDog } from '@/lib/api';

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
    
    // Normalize query for provider
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 20);
    const page = parseInt(searchParams.get('page') || '1', 10) || 1;
    const providerParams: SearchDogsParams = {
      zip: searchParams.get('zip') || undefined,
      radius: searchParams.get('radius') ? parseInt(searchParams.get('radius') as string, 10) : undefined,
      age: searchParams.get('age') || undefined,
      size: searchParams.get('size') || undefined,
      includeBreeds: searchParams.get('breed') || undefined,
      sort: (searchParams.get('sort') as any) || 'freshness',
      page,
      limit,
    };

    const provider = getActiveDogProvider();

    const attemptStart = Date.now();
    const { items: dogs, page: currentPage, pageSize, total } = await provider.searchDogs(providerParams);
    const backendDuration = Date.now() - attemptStart;

    const totalDuration = Date.now() - startTime;
    const responseHeaders = new Headers();
    responseHeaders.set('X-Request-ID', requestId);
    responseHeaders.set('X-Backend-Duration', `${backendDuration}`);
    responseHeaders.set('X-Total-Duration', `${totalDuration}`);
    responseHeaders.set('X-Route', '/api/dogs');

    // Simple 60s in-memory cache per normalized query
    try {
      (globalThis as any).__DOGS_CACHE__ = (globalThis as any).__DOGS_CACHE__ || new Map<string, { data: any; exp: number }>();
      const cacheKey = `q:${JSON.stringify(providerParams)}`;
      const cache = (globalThis as any).__DOGS_CACHE__ as Map<string, { data: any; exp: number }>;
      const now = Date.now();
      // Write-through cache
      const payload = { items: dogs, page: currentPage, pageSize, total };
      cache.set(cacheKey, { data: payload, exp: now + 60_000 });
      responseHeaders.set('X-Cache', 'MISS');
      
      // V2: Trigger batch inference asynchronously (don't block response)
      if (dogs.length > 0) {
        // Fire and forget - run in background using Promise (works in both Node and Edge)
        Promise.resolve().then(async () => {
          try {
            // Transform provider Dogs to SchemaDog format for inference
            const dogsForInference: SchemaDog[] = (dogs as ProviderDog[]).map((dog) => ({
              id: String(dog.id || ''),
              name: dog.name || 'Unknown',
              breeds: dog.breeds && dog.breeds.length > 0 ? dog.breeds : ['Mixed Breed'],
              age: dog.age || 'Unknown',
              size: dog.size || 'Unknown',
              energy: 'medium', // Default, will be inferred
              temperament: [],
              location: {
                zip: `${dog.location?.city || 'Unknown'}, ${dog.location?.state || 'Unknown'}`,
                distanceMi: dog.location?.distanceMi || 0
              },
              gender: dog.gender || 'Unknown',
              tags: dog.tags || [],
              url: dog.url || '#',
              shelter: {
                name: dog.shelter?.name || 'Unknown Shelter',
                email: dog.shelter?.email || '',
                phone: dog.shelter?.phone || ''
              },
              rawDescription: dog.description || undefined
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
      const payload = { items: dogs, page: currentPage, pageSize, total };
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
