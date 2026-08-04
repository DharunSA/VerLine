const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, ...payload } = await req.json();

    const geminiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GEMINI_API_KEY');
    const groqKey = Deno.env.get('GROQ_API_KEY') || Deno.env.get('VITE_GROQ_API_KEY');
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (action === 'extract_relationship') {
      const { text, existingPeople, preferFastPath } = payload as {
        text: string;
        existingPeople: { id: string; name: string }[];
        preferFastPath?: boolean;
      };

      const peopleContext = existingPeople
        .map(p => `- ${p.name} (id: ${p.id})`)
        .join('\n');

      const systemPrompt = `You are a precision family tree AI parser.
Extract structured member & relationship data into JSON.

Existing people in the family tree:
${peopleContext || 'No existing people yet.'}

Extract the new person's name, their relationship to an existing person (if mentioned), and any attributes like profession, location, or birth year. Match the anchor person to one of the existing people by ID if possible.

Return ONLY valid JSON matching this schema:
{
  "newPersonName": "string",
  "anchorPersonId": "string or null",
  "relationshipType": "PARENT_OF" | "CHILD_OF" | "SPOUSE_OF" | "SIBLING_OF",
  "extractedAttributes": {
    "profession": "string or null",
    "location": "string or null",
    "gender": "male" | "female" | "other" | "unspecified",
    "dob": "YYYY-MM-DD or YYYY"
  },
  "confidence": number (0 to 1)
}`;

      // Fast-path check: Groq Llama 3.1 8B
      if (preferFastPath && groqKey) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text },
              ],
              response_format: { type: 'json_object' },
              temperature: 0.1,
            }),
          });

          if (groqRes.ok) {
            const data = await groqRes.json();
            const content = data.choices?.[0]?.message?.content;
            if (content) {
              return new Response(content, {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          }
        } catch (e) {
          console.warn('Edge function Groq fast path failed:', e);
        }
      }

      // Primary LLM: Google Gemini 1.5/2.5 Flash
      if (geminiKey) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
          const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemPrompt}\n\nUser Input: "${text}"` }],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
              },
            }),
          });

          if (geminiRes.ok) {
            const data = await geminiRes.json();
            const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (jsonText) {
              return new Response(jsonText, {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          }
        } catch (e) {
          console.warn('Edge function Gemini Flash failed:', e);
        }
      }

      // Fallback LLM: Groq Llama 3.1 8B
      if (groqKey) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text },
              ],
              response_format: { type: 'json_object' },
              temperature: 0.1,
            }),
          });

          if (groqRes.ok) {
            const data = await groqRes.json();
            const content = data.choices?.[0]?.message?.content;
            if (content) {
              return new Response(content, {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          }
        } catch (e) {
          console.warn('Edge function Groq fallback failed:', e);
        }
      }

      return new Response(JSON.stringify({ error: 'No AI API keys configured on edge function' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'narrate_relationship') {
      const { fromName, toName, label, pathSummary } = payload as {
        fromName: string;
        toName: string;
        label: string;
        pathSummary: string;
      };

      const prompt = `Write one warm, human sentence (max 30 words) explaining how "${toName}" is related to "${fromName}".
Relationship: ${label}
Connection path: ${pathSummary}

Write it in second person ("${toName} is your..."). Be warm and conversational, not clinical.`;

      // Try Groq first for sub-second fast narration
      if (groqKey) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
              max_tokens: 150,
            }),
          });

          if (groqRes.ok) {
            const data = await groqRes.json();
            const sentence = data.choices?.[0]?.message?.content?.trim();
            if (sentence) {
              return new Response(JSON.stringify({ sentence }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          }
        } catch (e) {
          console.warn('Groq narration failed:', e);
        }
      }

      // Try Gemini Flash
      if (geminiKey) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
          const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
            }),
          });

          if (geminiRes.ok) {
            const data = await geminiRes.json();
            const sentence = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (sentence) {
              return new Response(JSON.stringify({ sentence }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          }
        } catch (e) {
          console.warn('Gemini Flash narration failed:', e);
        }
      }

      return new Response(JSON.stringify({ sentence: `${toName} is your ${label.toLowerCase()}.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'generate_story') {
      const { people } = payload as {
        people: { name: string; dob?: string; dod?: string; profession?: string; location?: string }[];
      };

      const context = people
        .map(p => {
          const parts = [p.name];
          if (p.dob) parts.push(`born ${new Date(p.dob).getFullYear()}`);
          if (p.dod) parts.push(`died ${new Date(p.dod).getFullYear()}`);
          if (p.profession) parts.push(p.profession);
          if (p.location) parts.push(p.location);
          return parts.join(', ');
        })
        .join('\n');

      const prompt = `You are writing a warm, elegant family history narrative for a family tree app called Verline.

Family members:
${context}

Write a short (3-4 paragraph) narrated family story in an heirloom style — warm, biographical, and rich with character. Focus on the arc of generations, the places they lived, and the professions that defined them. Do not mention the app. End with a line about preserving family memories.`;

      // Use Gemini Flash for rich story generation
      if (geminiKey) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
          const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
            }),
          });

          if (geminiRes.ok) {
            const data = await geminiRes.json();
            const narrative = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (narrative) {
              return new Response(JSON.stringify({ narrative }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          }
        } catch (e) {
          console.warn('Gemini story generation failed:', e);
        }
      }

      return new Response(JSON.stringify({ error: 'Gemini key required for story generation' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('AI proxy error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
