# How Our App Leverages AI: A Technical Overview

## Executive Summary

Our dog adoption matching platform uses a multi-layered AI system to understand user preferences, assess dog characteristics, match users to dogs, and generate personalized explanations. The system combines deterministic scoring algorithms with LLM-powered reasoning to create accurate, explainable matches.

---

## 1. Assessing User Characteristics

### Multi-Source Preference Extraction

We assess user characteristics through a **three-tier preference system** that combines explicit user input with AI-powered extraction from free-form text:

#### A. Explicit User Input
- **Structured preferences**: Age (baby/young/adult/senior), size (small/medium/large/XL), energy level (low/medium/high)
- **Breed preferences**: Include/exclude lists with fuzzy matching support
- **Temperament traits**: Selected from predefined traits (e.g., "eager-to-please", "calm-indoors", "kid-friendly")
- **Location**: ZIP codes and radius for geographic filtering

#### B. AI-Powered Guidance Extraction
When users provide free-form text (e.g., "I'm looking for a calm dog for my apartment"), we use **rule-based NLP tokenization** to extract implicit preferences:

- **Age hints**: Detects mentions of "puppy", "young", "adult", "senior"
- **Size hints**: Identifies "small", "medium", "large", "apartment-sized"
- **Energy hints**: Extracts "low energy", "high energy", "active", "calm"
- **Temperament hints**: Recognizes "quiet", "kid-friendly", "cat-friendly", "hypoallergenic"
- **Lifestyle flags**: Detects "low-maintenance", "first-time owner", "apartment", "quiet preferred"

**Example**: The text "I want a quiet, low-maintenance dog for my apartment" automatically extracts:
- `quietPreferred: true`
- `lowMaintenance: true`
- `apartmentOk: true`

#### C. Preference Normalization with Origin Tracking

All preferences are normalized into an `EffectivePreferences` structure that tracks the **origin** of each preference:
- **"user"**: Explicitly selected by the user (highest weight: 1.0)
- **"guidance"**: Extracted from free-form text (medium weight: 0.7)
- **"default"**: System defaults when no preference specified (lowest weight: 0.5)

This origin tracking enables **weighted scoring** where explicit user preferences carry more weight than inferred ones.

#### D. Breed Expansion with Fuzzy Matching

User breed preferences are expanded using fuzzy matching to handle:
- **Exact matches**: "Labrador Retriever" → exact match
- **Aliases**: "Lab" → expands to "Labrador Retriever"
- **Breed families**: "Retriever" → expands to all retriever breeds
- **Phonetic/typo tolerance**: Handles misspellings and variations

---

## 2. Assessing Dog Characteristics

### Multi-Source Dog Feature Extraction

We assess dog characteristics through a combination of structured data and AI-powered inference:

#### A. Structured Dog Data
From the Petfinder API and our database, we extract:
- **Basic attributes**: Age, size, gender, breeds
- **Temperament tags**: Explicit temperament traits assigned by shelters
- **Energy level**: If provided by shelter
- **Location**: Distance from user's ZIP code
- **Shelter description**: Free-form text description

#### B. Breed-Based Feature Inference

When explicit dog data is missing, we use **breed knowledge bases** to infer characteristics:

- **Energy level**: Breed-specific defaults (e.g., Border Collies = high energy)
- **Grooming needs**: Breed-based grooming requirements
- **Shedding level**: Breed shedding characteristics
- **Temperament priors**: Breed temperament database with 0-3 scale confidence scores

**Example**: A "Border Collie mix" without explicit energy data gets inferred as "high energy" based on breed knowledge.

#### C. AI-Powered Trait Inference (V2 Feature)

For dogs with detailed shelter descriptions, we use **GPT-4o-mini** to extract structured traits from unstructured text:

**Inference Process**:
1. **Input**: Dog's description text + tags
2. **AI Model**: GPT-4o-mini with JSON schema output
3. **Extracted Traits**:
   - `energy`: "low" | "medium" | "high" | null
   - `barky`: boolean | null
   - `kidFriendly`: "yes" | "no" | "unknown"
   - `apartmentOk`: boolean | null
4. **Evidence tracking**: Each trait includes source quotes from the description
5. **Confidence scoring**: Model provides 0.0-1.0 confidence for each extraction

**Example**: Description "This calm couch potato loves kids and is perfect for apartments" → extracts:
```json
{
  "energy": "low",
  "barky": false,
  "kidFriendly": "yes",
  "apartmentOk": true,
  "evidence": [
    {"field": "energy", "quote": "calm couch potato"},
    {"field": "kidFriendly", "quote": "loves kids"},
    {"field": "apartmentOk", "quote": "perfect for apartments"}
  ],
  "confidence": 0.9
}
```

**Caching Strategy**: Inferred traits are cached in the database to avoid redundant API calls and improve performance.

#### D. Temperament Evidence Classification

For temperament matching, we classify evidence quality:
- **"proven"**: Dog has explicit temperament tag matching user preference
- **"likely"**: Breed temperament database shows strong prior (≥67% confidence)
- **"none"**: No evidence for the trait

This classification ensures AI-generated descriptions use appropriate language:
- Proven traits: "is kid-friendly" (definitive)
- Likely traits: "tends to be kid-friendly" (tentative)

---

## 3. Matching Users to Dogs

### Hybrid Scoring Algorithm

Our matching system uses a **deterministic scoring algorithm** with OR-based logic (partial matches are acceptable):

#### A. Filtering Layer
First, we apply hard filters:
- **Geographic**: Dogs within user's radius
- **Breed exclusions**: Remove dogs with excluded breeds
- **Critical mismatches**: Filter out dogs that violate hard constraints

#### B. Scoring Layer

Each dog receives a **base score of 100**, with bonuses for matches and penalties for mismatches:

**Scoring Components**:

1. **Age Matching** (OR logic for multiple selections)
   - Match: +15 points × weight
   - Mismatch: -5 points × weight

2. **Size Matching** (OR logic)
   - Match: +15 points × weight
   - Mismatch: -5 points × weight

3. **Energy Matching**
   - Match: +15 points × weight
   - Mismatch: -8 points × weight

4. **Breed Matching** (tiered bonuses for precision)
   - Tier 1 (exact match): +25 points × weight
   - Tier 2 (alias): +20 points × weight
   - Tier 3 (family): +15 points × weight
   - Tier 4 (phonetic/edit): +12 points × weight
   - Tier 5 (ngram): +8 points × weight
   - Mismatch: -10 points × weight

5. **Temperament Matching** (blended scoring)
   - **60% dog evidence** + **40% breed prior**
   - Match threshold: blended score ≥ 0.5
   - Match: +12 points × weight per trait
   - Mismatch: -6 points × weight per trait

6. **Flag-Based Adjustments**
   - Low-maintenance preference: Penalties for puppies, high-grooming, high-energy dogs
   - Quiet preference: Penalty for barky breeds
   - Apartment preference: Penalty for XL dogs

7. **OR-Based Bonus**
   - Calculates match percentage: `actualMatches / totalPossibleMatches`
   - Bonus: +20 points × match percentage
   - **Key insight**: Even 50% matches receive bonuses, encouraging partial matches

8. **Inferred Trait Bonuses** (V2 feature)
   - When AI-inferred traits match user preferences:
     - Bonus = `min(maxBonusPerTrait, confidence × 2.0)`
     - Capped at `maxTotalInferredBonus` per dog
   - Only applied if confidence ≥ threshold (configurable)

#### C. Ranking Algorithm

Dogs are sorted by:
1. **Primary**: Overall score (highest first)
2. **Secondary**: Number of matched facets (more matches rank higher)
3. **Tertiary**: Distance (closer dogs rank higher on ties)

**Philosophy**: The OR-based approach means dogs are never filtered out for missing a single criterion. Instead, we reward overall fit across all dimensions.

---

## 4. AI-Powered Description Generation

### GPT-4o-mini for Personalized Explanations

For the **top 3 matches**, we use **GPT-4o-mini** to generate personalized explanations of why each dog is a good fit.

#### A. Prompt Engineering

**System Prompt** includes:
- Role: "Expert dog adoption counselor"
- **OR-based matching logic**: Emphasizes partial matches are acceptable
- **Citation requirements**: Must quote user's own words when explaining matches
- **Temperament guidance**: Use "proven" vs "likely" language based on evidence quality
- **Hallucination prevention**: "ONLY cite user preferences explicitly provided"

**User Prompt** includes:
- User preferences (normalized list)
- Dog facts (age, size, energy, breeds, temperament)
- Matched facets (which preferences were satisfied)
- Temperament evidence classification (proven/likely/none)
- Shelter description (sanitized, if available)
- Dog pronouns (for gender-appropriate language)

#### B. Structured Output

The AI generates JSON with:
- `primary`: Main explanation (150 characters max)
- `additional`: Additional positive traits
- `cited`: Array of user preferences cited in the explanation

#### C. Post-Processing & Sanitization

Before displaying, we apply multiple sanitization layers:

1. **PII Scrubbing**: Removes names, emails, phone numbers
2. **Perspective Correction**: Fixes cases where AI addresses the dog as "you"
3. **Preference Language Sanitization**: Removes preference language when no preferences provided
4. **Temperament Claim Verification**: Ensures "proven" traits use definitive language, "likely" traits use tentative language
5. **Length Enforcement**: Clamps to 150 characters with word-boundary awareness

#### D. Fallback System

If AI generation fails, we use a **deterministic fallback** that:
- Cites matched preferences from scoring
- Highlights breed characteristics
- Ensures basic quality standards

---

## 5. Model Output Evaluation

### Multi-Layer Verification System

We evaluate AI output through a **comprehensive verification pipeline**:

#### A. Preference Citation Verification

**Requirement**: When user preferences exist, the description must cite at least one preference.

**Verification**:
- Checks if description text contains any user preference terms
- Uses synonym matching (e.g., "calm" matches "quiet")
- If missing, automatically appends a preference citation

**Example**: If user prefers "quiet" but description doesn't mention it, we append: "Matches your quiet preference."

#### B. Banned Term Detection

**Banned terms** (unless justified by facts):
- "apartment" (unless user mentioned it)
- "house-trained", "crate-trained"
- "purebred", "service dog"
- "rare", "hypoallergenic" (unless explicitly in dog data)

**Verification**: Scans description for banned terms and removes them if not justified by user preferences or dog traits.

#### C. Temperament Claim Verification

**Requirement**: Temperament claims must match evidence quality.

**Verification**:
- Scans for temperament trait mentions
- Checks evidence classification (proven/likely/none)
- **Proven traits**: Must use definitive phrasing ("is kid-friendly")
- **Likely traits**: Must use tentative phrasing ("tends to be kid-friendly")
- **Auto-correction**: Replaces incorrect phrasing automatically

**Example**: If description says "is kid-friendly" but only breed prior exists (not proven), it's corrected to "tends to be kid-friendly".

#### D. Length & Format Validation

**Requirements**:
- Top 3 descriptions: ≤150 characters
- Must end with terminal punctuation (. ! ?)
- No mid-word cutoffs

**Verification**:
- Clamps to length with word-boundary awareness
- Ensures terminal punctuation
- Removes trailing fragments

#### E. Preference Language Validation

**When no preferences provided**:
- Removes phrases like "matches your preferences"
- Removes "for someone like you"
- Focuses on dog traits only

**Verification**: Regex-based detection and removal of preference language when inappropriate.

#### F. Hallucination Prevention

**Multiple safeguards**:
1. **Fact pack validation**: Description can only reference preferences/traits in the fact pack
2. **Citation tracking**: AI must return array of cited preferences
3. **Banned term filtering**: Prevents unsupported claims
4. **Evidence-based temperament**: Only allows temperament claims with evidence

#### G. Quality Metrics

We track:
- **Verification pass rate**: % of descriptions passing all checks
- **Auto-correction rate**: % requiring fixes
- **Citation accuracy**: % correctly citing user preferences
- **Temperament claim accuracy**: % using correct evidence language

#### H. Structured Response Validation

**JSON Schema Enforcement**:
- AI must return valid JSON matching schema
- Required fields: `primary`, `additional`, `concerns`
- Type validation for all fields
- Fallback parsing with error recovery

---

## Technical Architecture Summary

### AI Models Used
- **GPT-4o-mini**: Primary model for trait inference and description generation
- **Temperature**: 0.1 for descriptions (deterministic), 0.0 for trait extraction (fully deterministic)
- **JSON Schema**: Structured outputs for reliability

### Performance Optimizations
- **Batch inference**: Inferred traits loaded in batches
- **Caching**: Inferred traits cached in database
- **Server-side execution**: Direct OpenAI calls when possible (faster than HTTP API)
- **Timeout handling**: 15-second timeout for AI calls with fallbacks

### Reliability Features
- **Multi-layer verification**: Prevents hallucinations and errors
- **Fallback systems**: Deterministic alternatives when AI fails
- **Error recovery**: Graceful degradation on API failures
- **Observability**: Comprehensive logging for debugging

---

## Key Differentiators

1. **OR-Based Matching**: Unlike systems requiring all criteria to match, we reward partial matches
2. **Multi-Source Assessment**: Combines explicit data, breed knowledge, and AI inference
3. **Evidence-Based Reasoning**: Temperament claims are grounded in evidence quality
4. **Comprehensive Verification**: Multi-layer validation prevents hallucinations
5. **Explainable AI**: Every match includes AI-generated explanation with citations
6. **Weighted Preferences**: User preferences weighted higher than inferred ones

---

## Future Enhancements

- **Fine-tuned models**: Custom models trained on adoption success data
- **Multi-modal inference**: Image analysis for breed/characteristic detection
- **User feedback loop**: Learning from user interactions to improve matching
- **A/B testing framework**: Systematic testing of prompt variations
- **Real-time trait inference**: On-the-fly extraction without caching delays




