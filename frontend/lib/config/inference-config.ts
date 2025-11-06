/**
 * Inference Configuration
 * Configurable thresholds and caps for trait inference and scoring bonuses
 */

export interface InferenceConfig {
  confidenceThreshold: number;
  maxBonusPerTrait: number;
  maxTotalInferredBonus: number;
}

/**
 * Get inference configuration from environment variables with defaults
 */
export function getInferenceConfig(): InferenceConfig {
  return {
    confidenceThreshold: parseFloat(
      process.env.INFERENCE_CONFIDENCE_THRESHOLD || '0.75'
    ),
    maxBonusPerTrait: parseFloat(
      process.env.MAX_BONUS_PER_TRAIT || '2.0'
    ),
    maxTotalInferredBonus: parseFloat(
      process.env.MAX_TOTAL_INFERRED_BONUS || '5.0'
    ),
  };
}

