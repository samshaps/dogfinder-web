/**
 * Trait Storage Service
 * Stores and retrieves inferred traits from dog_cache table
 */

import { getSupabaseClient } from '../supabase-auth';
import { InferredTraits } from '@/app/api/infer-traits/route';

/**
 * Store inferred traits for a dog in the database
 */
export async function storeInferredTraits(
  petfinderId: string,
  traits: InferredTraits
): Promise<void> {
  const client = getSupabaseClient();
  
  // Transform InferredTraits to the storage format
  const traitsArray = [];
  
  if (traits.energy !== null && traits.energy !== undefined) {
    traitsArray.push({
      trait: 'energy',
      value: traits.energy,
      probability: traits.confidence,
      source: 'inferred',
      updated_at: new Date().toISOString()
    });
  }
  
  if (traits.barky !== null && traits.barky !== undefined) {
    traitsArray.push({
      trait: 'barky',
      value: traits.barky,
      probability: traits.confidence,
      source: 'inferred',
      updated_at: new Date().toISOString()
    });
  }
  
  if (traits.kidFriendly && traits.kidFriendly !== 'unknown') {
    traitsArray.push({
      trait: 'kidFriendly',
      value: traits.kidFriendly,
      probability: traits.confidence,
      source: 'inferred',
      updated_at: new Date().toISOString()
    });
  }
  
  if (traits.apartmentOk !== null && traits.apartmentOk !== undefined) {
    traitsArray.push({
      trait: 'apartmentOk',
      value: traits.apartmentOk,
      probability: traits.confidence,
      source: 'inferred',
      updated_at: new Date().toISOString()
    });
  }
  
  try {
    const { error } = await client
      .from('dog_cache')
      .update({ 
        traits_inferred: traitsArray,
        updated_at: new Date().toISOString()
      })
      .eq('petfinder_id', petfinderId);
    
    if (error) {
      console.error(`Error storing inferred traits for ${petfinderId}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Failed to store inferred traits for ${petfinderId}:`, error);
    throw error;
  }
}

/**
 * Get inferred traits for a dog from the database
 */
export async function getInferredTraits(
  petfinderId: string
): Promise<InferredTraits | null> {
  const client = getSupabaseClient();
  
  try {
    const { data, error } = await client
      .from('dog_cache')
      .select('traits_inferred')
      .eq('petfinder_id', petfinderId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      console.error(`Error fetching inferred traits for ${petfinderId}:`, error);
      return null;
    }
    
    if (!data || !data.traits_inferred) {
      return null;
    }
    
    // Transform stored format back to InferredTraits
    const traitsArray = data.traits_inferred as Array<{
      trait: string;
      value: any;
      probability: number;
      source: string;
      updated_at: string;
    }>;
    
    const inferred: InferredTraits = {
      evidence: [],
      confidence: 0
    };
    
    traitsArray.forEach(item => {
      if (item.trait === 'energy' && item.value) {
        inferred.energy = item.value;
        inferred.confidence = Math.max(inferred.confidence, item.probability);
      } else if (item.trait === 'barky' && item.value !== null) {
        inferred.barky = item.value;
        inferred.confidence = Math.max(inferred.confidence, item.probability);
      } else if (item.trait === 'kidFriendly' && item.value) {
        inferred.kidFriendly = item.value;
        inferred.confidence = Math.max(inferred.confidence, item.probability);
      } else if (item.trait === 'apartmentOk' && item.value !== null) {
        inferred.apartmentOk = item.value;
        inferred.confidence = Math.max(inferred.confidence, item.probability);
      }
    });
    
    return inferred.confidence > 0 ? inferred : null;
  } catch (error) {
    console.error(`Failed to get inferred traits for ${petfinderId}:`, error);
    return null;
  }
}

/**
 * Batch get inferred traits for multiple dogs
 */
export async function getInferredTraitsBatch(
  petfinderIds: string[]
): Promise<Map<string, InferredTraits>> {
  const results = new Map<string, InferredTraits>();
  
  if (petfinderIds.length === 0) {
    return results;
  }
  
  const client = getSupabaseClient();
  
  try {
    const { data, error } = await client
      .from('dog_cache')
      .select('petfinder_id, traits_inferred')
      .in('petfinder_id', petfinderIds);
    
    if (error) {
      console.error('Error batch fetching inferred traits:', error);
      return results;
    }
    
    if (!data) {
      return results;
    }
    
    data.forEach(row => {
      if (row.traits_inferred) {
        const traitsArray = row.traits_inferred as Array<{
          trait: string;
          value: any;
          probability: number;
          source: string;
          updated_at: string;
        }>;
        
        const inferred: InferredTraits = {
          evidence: [],
          confidence: 0
        };
        
        traitsArray.forEach(item => {
          if (item.trait === 'energy' && item.value) {
            inferred.energy = item.value;
            inferred.confidence = Math.max(inferred.confidence, item.probability);
          } else if (item.trait === 'barky' && item.value !== null) {
            inferred.barky = item.value;
            inferred.confidence = Math.max(inferred.confidence, item.probability);
          } else if (item.trait === 'kidFriendly' && item.value) {
            inferred.kidFriendly = item.value;
            inferred.confidence = Math.max(inferred.confidence, item.probability);
          } else if (item.trait === 'apartmentOk' && item.value !== null) {
            inferred.apartmentOk = item.value;
            inferred.confidence = Math.max(inferred.confidence, item.probability);
          }
        });
        
        if (inferred.confidence > 0) {
          results.set(row.petfinder_id, inferred);
        }
      }
    });
  } catch (error) {
    console.error('Failed to batch get inferred traits:', error);
  }
  
  return results;
}




