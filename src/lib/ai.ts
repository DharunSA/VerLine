/**
 * AI client — all Claude calls route through a Supabase Edge Function.
 * The Anthropic API key is never exposed to the browser.
 */

import { supabase } from './supabaseClient';

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
 * Call the AI proxy Edge Function.
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
 * Extract structured relationship data from a natural-language sentence.
 */
export async function extractRelationshipFromNL(
  text: string,
  existingPeople: { id: string; name: string }[]
): Promise<NLExtractionResult> {
  return callAIProxy<NLExtractionResult>('extract_relationship', {
    text,
    existingPeople,
  });
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
  return callAIProxy<NarratorResult>('narrate_relationship', {
    fromName,
    toName,
    label,
    pathSummary,
  });
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

  const result = await callAIProxy<StoryResult>('generate_story', { people });
  const withTimestamp = { ...result, cachedAt: Date.now() };
  storyCache.set(cacheKey, withTimestamp);
  return withTimestamp;
}
