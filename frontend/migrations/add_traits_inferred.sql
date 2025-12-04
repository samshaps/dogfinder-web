-- Migration: Add traits_inferred column to dog_cache table
-- This migration adds support for storing AI-inferred traits from PetFinder descriptions

-- Add traits_inferred JSONB column (nullable)
ALTER TABLE dog_cache 
ADD COLUMN IF NOT EXISTS traits_inferred JSONB;

-- Create index on petfinder_id if it doesn't exist (for fast lookups)
CREATE INDEX IF NOT EXISTS idx_dog_cache_petfinder_id 
ON dog_cache(petfinder_id);

-- Add comment to column for documentation
COMMENT ON COLUMN dog_cache.traits_inferred IS 'AI-inferred traits from PetFinder descriptions. Format: [{trait: string, value: any, probability: number, source: string, updated_at: timestamp}]';




