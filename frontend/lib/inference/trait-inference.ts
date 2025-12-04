/**
 * Trait Inference Service
 * Batch processes dogs to infer traits from descriptions
 */

import { Dog } from '../schemas';
import { InferredTraits } from '@/app/api/infer-traits/route';

/**
 * Simple hash function for description (works in browser and Node)
 */
export function getDescriptionHash(description: string): string {
  let hash = 0;
  const str = description.substring(0, 500); // Use first 500 chars for hash
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Batch infer traits for multiple dogs
 * Returns a Map of petfinderId -> InferredTraits
 */
export async function inferDogTraitsBatch(
  dogs: Dog[],
  batchSize: number = 10
): Promise<Map<string, InferredTraits>> {
  const results = new Map<string, InferredTraits>();
  
  // Filter dogs that have descriptions
  const dogsWithDescriptions = dogs.filter(
    dog => (dog.rawDescription || '').trim().length > 0
  );
  
  if (dogsWithDescriptions.length === 0) {
    return results;
  }
  
  // Process in batches to avoid rate limits
  for (let i = 0; i < dogsWithDescriptions.length; i += batchSize) {
    const batch = dogsWithDescriptions.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (dog) => {
      try {
        const description = dog.rawDescription || '';
        const tags = dog.tags || [];
        
        // Resolve API URL for server-side calls
        const apiUrl = typeof window === 'undefined' 
          ? (() => {
              const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'http://localhost:3000';
              const normalized = String(base).startsWith('http') ? String(base) : `https://${base}`;
              return `${normalized}/api/infer-traits`;
            })()
          : '/api/infer-traits';
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description, tags }),
        });
        
        if (!response.ok) {
          console.warn(`Failed to infer traits for dog ${dog.id}: ${response.status}`);
          return null;
        }
        
        const traits: InferredTraits = await response.json();
        return { dogId: dog.id, traits };
      } catch (error) {
        console.warn(`Error inferring traits for dog ${dog.id}:`, error);
        return null;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    // Add successful results to map
    batchResults.forEach(result => {
      if (result) {
        results.set(result.dogId, result.traits);
      }
    });
    
    // Small delay between batches to avoid rate limits
    if (i + batchSize < dogsWithDescriptions.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

