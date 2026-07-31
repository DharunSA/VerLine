import Anthropic from 'npm:@anthropic-ai/sdk@0.27.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const client = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
});

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, ...payload } = await req.json();

    if (action === 'extract_relationship') {
      const { text, existingPeople } = payload as {
        text: string;
        existingPeople: { id: string; name: string }[];
      };

      const peopleContext = existingPeople
        .map(p => `- ${p.name} (id: ${p.id})`)
        .join('\n');

      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        tools: [
          {
            name: 'extract_relationship',
            description: 'Extract structured relationship data from a natural language sentence describing a family relationship.',
            input_schema: {
              type: 'object' as const,
              properties: {
                newPersonName: { type: 'string', description: 'Name of the new person being added' },
                anchorPersonId: {
                  type: 'string',
                  description: 'ID of the existing person this new person is related to. Must match one of the provided person IDs, or null if no match.',
                },
                relationshipType: {
                  type: 'string',
                  enum: ['PARENT_OF', 'CHILD_OF', 'SPOUSE_OF', 'SIBLING_OF'],
                  description: 'How the new person relates to the anchor person (from the new person\'s perspective)',
                },
                extractedAttributes: {
                  type: 'object',
                  properties: {
                    profession: { type: 'string' },
                    location: { type: 'string' },
                    gender: { type: 'string', enum: ['male', 'female', 'other', 'unspecified'] },
                  },
                },
                confidence: { type: 'number', description: '0-1 confidence score' },
              },
              required: ['newPersonName', 'relationshipType', 'confidence'],
            },
          },
        ],
        tool_choice: { type: 'auto' },
        messages: [
          {
            role: 'user',
            content: `You are extracting relationship information from a natural language description for a family tree app.

Existing people in the tree:
${peopleContext || 'No existing people yet.'}

User input: "${text}"

Extract the new person's name, their relationship to an existing person (if mentioned), and any attributes like profession or location. Match the anchor person to one of the existing people by name if possible.`,
          },
        ],
      });

      const toolUse = response.content.find(c => c.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') {
        return new Response(JSON.stringify({ error: 'Could not extract relationship' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(toolUse.input), {
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

      const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: `Write one warm, human sentence (max 30 words) explaining how "${toName}" is related to "${fromName}".
Relationship: ${label}
Connection path: ${pathSummary}

Write it in second person ("${toName} is your..."). Be warm and conversational, not clinical.`,
          },
        ],
      });

      const sentence = response.content[0]?.type === 'text' ? response.content[0].text : '';

      return new Response(JSON.stringify({ sentence }), {
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

      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 600,
        messages: [
          {
            role: 'user',
            content: `You are writing a warm, elegant family history narrative for a family tree app called Verline.

Family members:
${context}

Write a short (3-4 paragraph) narrated family story in an heirloom style — warm, biographical, and rich with character. Focus on the arc of generations, the places they lived, and the professions that defined them. Do not mention the app. End with a line about preserving family memories.`,
          },
        ],
      });

      const narrative = response.content[0]?.type === 'text' ? response.content[0].text : '';

      return new Response(JSON.stringify({ narrative }), {
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
