/**
 * AI Client for Verline
 *
 * Supports Dual Live Production AI Configuration:
 * 1. Primary LLM: Google Gemini Flash (Google AI Studio)
 *    - Best overall language understanding for complex/messy real-world sentences.
 * 2. Fast Path / Fallback LLM: Groq (Llama 3.1 8B Instant)
 *    - Sub-second responses for simple queries or when Gemini Flash is rate-limited.
 * 3. Client-side Regex Engine: Offline safety fallback.
 */

import { supabase } from './supabaseClient';
import { extractRelationshipMultiProvider, getGeminiKey, getGroqKey } from './aiProviders';

export interface NLExtractionResult {
  newPersonName: string;
  anchorPersonId: string | null;
  relationshipType: 'PARENT_OF' | 'CHILD_OF' | 'SPOUSE_OF' | 'SIBLING_OF';
  extractedAttributes?: {
    profession?: string;
    location?: string;
    dob?: string;
    gender?: string;
  };
  confidence: number;
  provider?: 'gemini' | 'groq' | 'edge-proxy' | 'fallback';
}

export interface NarratorResult {
  sentence: string;
}

export interface StoryResult {
  narrative: string;
  cachedAt: number;
}

// In-memory cache for story panel
const storyCache = new Map<string, StoryResult>();

/**
 * Call the AI proxy Edge Function if set up.
 */
async function callAIProxy<T>(
  action: string,
  payload: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: { action, ...payload },
  });

  if (error) throw new Error(error.message);
  return data as T;
}

/**
 * Extract structured relationship data using live AI providers:
 * 1. Direct client call (if VITE_GEMINI_API_KEY or VITE_GROQ_API_KEY set)
 * 2. Supabase Edge Function call (if Edge Function secrets configured)
 */
export async function extractRelationshipFromNL(
  text: string,
  existingPeople: { id: string; name: string; dob?: string; profession?: string; location?: string }[],
  preferFastPath = false
): Promise<NLExtractionResult> {
  const hasClientKeys = Boolean(getGeminiKey() || getGroqKey());

  if (hasClientKeys) {
    try {
      const { result, provider } = await extractRelationshipMultiProvider(text, existingPeople, preferFastPath);
      return { ...result, provider };
    } catch (err) {
      console.warn('Client multi-provider AI failed, trying Edge Function proxy:', err);
    }
  }

  // Try Edge Function proxy
  try {
    const res = await callAIProxy<NLExtractionResult>('extract_relationship', {
      text,
      existingPeople,
      preferFastPath,
    });
    return { ...res, provider: 'edge-proxy' };
  } catch (err) {
    console.warn('Edge Function proxy unavailable:', err);
    throw err;
  }
}

/**
 * Generate a warm narration sentence for a relationship path.
 */
export async function narrateRelationship(
  fromName: string,
  toName: string,
  label: string,
  pathSummary: string
): Promise<NarratorResult> {
  try {
    return await callAIProxy<NarratorResult>('narrate_relationship', {
      fromName,
      toName,
      label,
      pathSummary,
    });
  } catch {
    return { sentence: `${toName} is your ${label.toLowerCase()}.` };
  }
}

/**
 * Generate a family story for a given subtree.
 * Cached by a hash of the people list.
 */
export async function generateFamilyStory(
  people: { name: string; dob?: string; dod?: string; profession?: string; location?: string }[],
  cacheKey: string
): Promise<StoryResult> {
  const cached = storyCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < 1000 * 60 * 10) {
    return cached;
  }

  try {
    const result = await callAIProxy<StoryResult>('generate_story', { people });
    const withTimestamp = { ...result, cachedAt: Date.now() };
    storyCache.set(cacheKey, withTimestamp);
    return withTimestamp;
  } catch (err) {
    throw err;
  }
}
