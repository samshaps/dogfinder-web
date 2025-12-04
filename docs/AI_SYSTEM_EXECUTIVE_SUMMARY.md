# AI System Executive Summary - Interview Talking Points

## Quick Overview

Our dog adoption platform uses a **hybrid AI system** combining deterministic algorithms with LLM-powered reasoning to match users with dogs and generate personalized explanations.

---

## 1. User Assessment (Multi-Source)

**Three-tier system:**
- **Explicit input**: User selects age, size, energy, breeds, temperament
- **AI extraction**: NLP tokenization extracts preferences from free-form text ("I want a calm apartment dog" → quiet + apartment flags)
- **Origin tracking**: Preferences tagged as "user" (weight 1.0), "guidance" (0.7), or "default" (0.5) for weighted scoring

**Key innovation**: Fuzzy breed matching handles typos, aliases, and breed families.

---

## 2. Dog Assessment (Structured + AI Inference)

**Three data sources:**
- **Structured data**: Age, size, breeds, temperament tags from Petfinder API
- **Breed knowledge base**: Inferred characteristics when explicit data missing (e.g., Border Collie → high energy)
- **AI trait extraction** (V2): GPT-4o-mini extracts energy, barkiness, kid-friendliness, apartment-suitability from shelter descriptions with confidence scores and evidence quotes

**Key innovation**: Blended temperament scoring (60% dog evidence + 40% breed prior) for accurate matching.

---

## 3. Matching Algorithm (OR-Based Scoring)

**Deterministic scoring with weighted preferences:**
- Base score: 100 points
- Bonuses: +15-25 points per matched preference (weighted by origin)
- Penalties: -5 to -10 points per mismatch (reduced to encourage partial matches)
- **OR-based bonus**: +20 points × match percentage (even 50% matches get bonuses)

**Ranking**: Score → matched facets count → distance

**Key innovation**: OR-based logic means dogs aren't filtered out for missing single criteria—we reward overall fit.

---

## 4. AI Description Generation (GPT-4o-mini)

**For top 3 matches:**
- **Model**: GPT-4o-mini with temperature 0.1
- **Prompt engineering**: 
  - System prompt emphasizes OR-based matching and citation requirements
  - User prompt includes preferences, dog facts, matched facets, evidence classifications
- **Output**: JSON with primary explanation (≤150 chars), additional traits, cited preferences
- **Post-processing**: PII scrubbing, perspective correction, temperament claim verification, length enforcement

**Key innovation**: Evidence-based language—"is kid-friendly" (proven) vs "tends to be kid-friendly" (breed prior).

---

## 5. Output Evaluation (Multi-Layer Verification)

**Seven verification layers:**
1. **Preference citation**: Must cite ≥1 user preference when preferences exist
2. **Banned term detection**: Removes unsupported claims (e.g., "purebred" unless in data)
3. **Temperament claim verification**: Ensures "proven" vs "likely" language matches evidence
4. **Length validation**: Enforces 150-char limit with word-boundary awareness
5. **Preference language sanitization**: Removes preference language when no preferences provided
6. **Hallucination prevention**: Only allows claims supported by fact pack
7. **JSON schema validation**: Ensures structured output format

**Key innovation**: Auto-correction system fixes errors rather than rejecting outputs, ensuring 100% of matches have explanations.

---

## Technical Highlights

- **Models**: GPT-4o-mini for inference and generation
- **Caching**: Inferred traits cached to reduce API calls
- **Fallbacks**: Deterministic alternatives when AI fails
- **Performance**: Batch processing, server-side execution, 15s timeouts
- **Observability**: Comprehensive logging for debugging

---

## Key Differentiators

1. **OR-based matching** (not AND-based) - rewards partial matches
2. **Multi-source assessment** - combines explicit data, breed knowledge, AI inference
3. **Evidence-based reasoning** - temperament claims grounded in evidence quality
4. **Comprehensive verification** - 7-layer validation prevents hallucinations
5. **Explainable AI** - every match includes AI-generated explanation with citations
6. **Weighted preferences** - user preferences weighted higher than inferred ones

---

## Interview Talking Points

**When asked about AI usage:**
- "We use a hybrid approach: deterministic scoring for matching, LLM for explanation generation"
- "Our system uses OR-based logic—we reward partial matches rather than requiring all criteria"
- "We have a 7-layer verification system to prevent hallucinations and ensure accuracy"
- "We track preference origin (user/guidance/default) to weight explicit preferences higher"
- "Our AI extracts traits from unstructured descriptions with confidence scores and evidence quotes"

**When asked about evaluation:**
- "We use multi-layer verification: preference citation, banned term detection, temperament claim verification, and hallucination prevention"
- "Our system auto-corrects errors rather than rejecting outputs, ensuring 100% of matches have explanations"
- "We track quality metrics: verification pass rate, auto-correction rate, citation accuracy"

**When asked about challenges:**
- "Balancing explainability with performance—we use structured outputs and verification to ensure reliability"
- "Preventing hallucinations—we use fact packs, citation tracking, and evidence-based reasoning"
- "Handling missing data—we use breed knowledge bases and AI inference to fill gaps"




