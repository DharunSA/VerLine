/**
 * Live Production Multi-Provider AI Engine for VerLine
 *
 * 1. Primary LLM: Google Gemini Flash (Google AI Studio)
 *    - Deep language understanding for complex, messy real-world family descriptions.
 * 2. Fast Path / Fallback LLM: Groq (Llama 3.1 8B Instant)
 *    - Sub-second responses for fast path extraction or fallback.
 * 3. Client-side Regex Engine: Offline safety fallback.
 */

import type { NLExtractionResult, NarratorResult, StoryResult } from './ai';

export interface PersonContext {
  id: string;
  name: string;
  dob?: string;
  profession?: string;
  location?: string;
}

// Environment Keys
export const getGeminiKey = (): string | undefined =>
  import.meta.env.VITE_GEMINI_API_KEY;

export const getGroqKey = (): string | undefined =>
  import.meta.env.VITE_GROQ_API_KEY;

/**
 * 1. GOOGLE GEMINI FLASH (Primary LLM via AI Studio API)
 */
export async function callGeminiFlash(
  prompt: string,
  systemInstruction?: string,
  apiKey?: string
): Promise<string> {
  const key = apiKey || getGeminiKey();
  if (!key) throw new Error('GEMINI_API_KEY not configured');

  // Using Gemini Flash endpoint via AI Studio REST API
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: (systemInstruction ? `${systemInstruction}\n\n` : '') + prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini API');
  return text;
}

/**
 * 2. GROQ (Fast Path & Sub-Second Fallback via Llama 3.1 8B Instant)
 */
export async function callGroq(
  prompt: string,
  systemInstruction?: string,
  apiKey?: string
): Promise<string> {
  const key = apiKey || getGroqKey();
  if (!key) throw new Error('GROQ_API_KEY not configured');

  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const messages: { role: string; content: string }[] = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from Groq API');
  return text;
}

/**
 * Multi-Provider Structured Extraction Pipeline
 * Tries Gemini Flash -> Groq -> Throws for Offline Fallback
 */
export async function extractRelationshipMultiProvider(
  text: string,
  existingPeople: PersonContext[],
  preferFastPath = false
): Promise<{ result: NLExtractionResult; provider: 'gemini' | 'groq' }> {
  const peopleContext = JSON.stringify(
    existingPeople.map(p => ({ id: p.id, name: p.name, profession: p.profession, location: p.location })),
    null,
    2
  );

  const systemInstruction = `You are a precision family tree AI parser.
Extract structured member & relationship data into JSON.

Rules:
1. "newPersonName": Full name of the new person being added (remove prefixes like Dr. if part of title, or include full name).
2. "anchorPersonId": Match one of the provided existing person IDs if their name (or first name) is mentioned. Null if no match.
3. "relationshipType": How the new person relates to the anchor person (from the new person's perspective). MUST be one of:
   - "PARENT_OF" (e.g. father, mother, parent)
   - "CHILD_OF" (e.g. son, daughter, child)
   - "SPOUSE_OF" (e.g. husband, wife, spouse, partner, married to)
   - "SIBLING_OF" (e.g. brother, sister, sibling)
4. "extractedAttributes":
   - "profession": Job title if mentioned (e.g. "Doctor", "Designer", "Surgeon")
   - "location": City or country if mentioned (e.g. "Mumbai", "Jaipur", "London")
   - "dob": Birth year string e.g. "1965-01-01" or "1965" if mentioned
   - "gender": "male", "female", "other", or "unspecified"
5. "confidence": Number between 0.1 and 1.0.

Return ONLY valid JSON matching this schema:
{
  "newPersonName": string,
  "anchorPersonId": string | null,
  "relationshipType": "PARENT_OF" | "CHILD_OF" | "SPOUSE_OF" | "SIBLING_OF",
  "extractedAttributes": {
    "profession"?: string,
    "location"?: string,
    "dob"?: string,
    "gender"?: string
  },
  "confidence": number
}`;

  const prompt = `Existing Family Tree Members:
${peopleContext}

User Input Sentence:
"${text}"`;

  const geminiKey = getGeminiKey();
  const groqKey = getGroqKey();

  // If fast path requested and Groq is available, try Groq first
  if (preferFastPath && groqKey) {
    try {
      const rawJson = await callGroq(prompt, systemInstruction, groqKey);
      const parsed = JSON.parse(rawJson);
      return { result: sanitizeExtractionResult(parsed, existingPeople), provider: 'groq' };
    } catch (err) {
      console.warn('Groq fast-path failed, trying Gemini Flash:', err);
    }
  }

  // Primary LLM: Google Gemini Flash
  if (geminiKey) {
    try {
      const rawJson = await callGeminiFlash(prompt, systemInstruction, geminiKey);
      const parsed = JSON.parse(rawJson);
      return { result: sanitizeExtractionResult(parsed, existingPeople), provider: 'gemini' };
    } catch (err) {
      console.warn('Gemini Flash primary failed, attempting Groq fallback:', err);
    }
  }

  // Fallback LLM: Groq (Llama 3.1 8B Instant)
  if (groqKey) {
    try {
      const rawJson = await callGroq(prompt, systemInstruction, groqKey);
      const parsed = JSON.parse(rawJson);
      return { result: sanitizeExtractionResult(parsed, existingPeople), provider: 'groq' };
    } catch (err) {
      console.warn('Groq fallback failed:', err);
    }
  }

  throw new Error('No AI provider API keys configured or all AI providers failed');
}

/**
 * Sanitize and validate extracted JSON payload
 */
function sanitizeExtractionResult(
  raw: any,
  existingPeople: PersonContext[]
): NLExtractionResult {
  const validRelTypes = ['PARENT_OF', 'CHILD_OF', 'SPOUSE_OF', 'SIBLING_OF'];
  let relType = raw.relationshipType;
  if (!validRelTypes.includes(relType)) {
    relType = 'CHILD_OF';
  }

  // Match anchor person by ID or fuzzy name match if ID is invalid
  let anchorId = raw.anchorPersonId;
  if (anchorId && !existingPeople.some(p => p.id === anchorId)) {
    anchorId = null;
  }

  if (!anchorId && raw.anchorPersonName) {
    const match = existingPeople.find(p =>
      p.name.toLowerCase().includes(String(raw.anchorPersonName).toLowerCase()) ||
      String(raw.anchorPersonName).toLowerCase().includes(p.name.split(' ')[0].toLowerCase())
    );
    if (match) anchorId = match.id;
  }

  let dob = raw.extractedAttributes?.dob;
  if (dob) {
    const dobStr = String(dob).trim();
    if (/^\d{4}$/.test(dobStr)) {
      dob = `${dobStr}-01-01`;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dobStr)) {
      dob = dobStr;
    }
  }

  return {
    newPersonName: raw.newPersonName || 'New Member',
    anchorPersonId: anchorId ?? null,
    relationshipType: relType,
    extractedAttributes: {
      profession: raw.extractedAttributes?.profession,
      location: raw.extractedAttributes?.location,
      dob: dob,
      gender: raw.extractedAttributes?.gender ?? 'unspecified',
    },
    confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.85,
  };
}
