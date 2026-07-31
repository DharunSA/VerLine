# Phase 3 Notes — AI Features

## Accomplished
1. **Supabase Edge Function (`supabase/functions/ai-proxy/index.ts`)**:
   - Secure proxy for Anthropic Claude API calls — API key remains strictly server-side.
   - Handlers for `extract_relationship`, `narrate_relationship`, and `generate_story`.
2. **Natural Language Add Member (`NLAddMemberBar.tsx`)**:
   - User inputs e.g. "Raj is Meena's son and a teacher in Mumbai".
   - Claude extracts structured JSON (`newPersonName`, `anchorPersonId`, `relationshipType`, attributes).
   - Opens pre-filled `AddMemberModal` for mandatory user confirmation before writing to state.
3. **Relationship Narrator (`RelationshipNarrator.tsx`)**:
   - Generates warm, conversational narration for relationship paths.
   - Fallback to engine-computed path summary if offline/AI unavailable.
4. **Family Story Generator (`FamilyStoryPanel.tsx`)**:
   - Generates a multi-paragraph heirloom family narrative based on tree context.
   - Caches narrative in `aiStore` by subtree hash to prevent redundant API calls.

## Acceptance Criteria
- [x] Natural language sentence opens pre-filled confirmation form.
- [x] Relationships feature narrated context sentences.
