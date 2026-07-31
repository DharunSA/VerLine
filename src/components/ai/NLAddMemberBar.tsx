import { useState, useCallback } from 'react';
import { Sparkles, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIStore } from '../../stores/aiStore';
import { useUIStore } from '../../stores/uiStore';
import { usePeopleStore } from '../../stores/peopleStore';
import { extractRelationshipFromNL, type NLExtractionResult } from '../../lib/ai';
import type { MemberFormValues } from '../member/AddMemberModal';

// ─── Client-side regex fallback ────────────────────────────────────────────────
// Handles patterns like:
//  "Raj is Meena's father"  → Raj PARENT_OF Meena
//  "Priya is Arjun's wife"  → Priya SPOUSE_OF Arjun
//  "Rohan is Sunita's son"  → Rohan CHILD_OF Sunita
//  "Kavya is Aditya's sister" → Kavya SIBLING_OF Aditya
const RELATIONSHIP_PATTERNS: Array<{ regex: RegExp; type: NLExtractionResult['relationshipType'] }> = [
  { regex: /\b(father|dad|papa|grandfather|granddad|grandpa)\b/i, type: 'PARENT_OF' },
  { regex: /\b(mother|mom|mama|grandmother|grandma|nani|nana)\b/i, type: 'PARENT_OF' },
  { regex: /\b(parent|uncle|aunt)\b/i, type: 'PARENT_OF' },
  { regex: /\b(son|boy|grandson|nephew)\b/i, type: 'CHILD_OF' },
  { regex: /\b(daughter|girl|granddaughter|niece)\b/i, type: 'CHILD_OF' },
  { regex: /\b(child|kid)\b/i, type: 'CHILD_OF' },
  { regex: /\b(husband|wife|spouse|partner|married to)\b/i, type: 'SPOUSE_OF' },
  { regex: /\b(brother|sister|sibling|twin)\b/i, type: 'SIBLING_OF' },
];

function parseNLFallback(
  text: string,
  existingPeople: { id: string; name: string }[]
): NLExtractionResult | null {
  // Pattern: "[NewPerson] is [ExistingPerson]'s [relationship]"
  const match = text.match(/^(.+?)\s+is\s+(.+?)'s?\s+(.+)$/i);
  if (!match) return null;

  const [, newPersonRaw, anchorNameRaw, relWord] = match;
  const newPersonName = newPersonRaw.trim();
  const anchorName = anchorNameRaw.trim();

  // Fuzzy-match anchor name against existing people
  const anchorMatch = existingPeople.find(p =>
    p.name.toLowerCase().includes(anchorName.toLowerCase()) ||
    anchorName.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
  );

  let relationshipType: NLExtractionResult['relationshipType'] = 'CHILD_OF';
  for (const { regex, type } of RELATIONSHIP_PATTERNS) {
    if (regex.test(relWord)) {
      relationshipType = type;
      break;
    }
  }

  return {
    newPersonName,
    anchorPersonId: anchorMatch?.id ?? null,
    relationshipType,
    confidence: anchorMatch ? 0.7 : 0.4,
  };
}

export default function NLAddMemberBar() {
  const [text, setText] = useState('');
  const nlLoading = useAIStore(s => s.nlLoading);
  const nlError = useAIStore(s => s.nlError);
  const setNLLoading = useAIStore(s => s.setNLLoading);
  const setNLError = useAIStore(s => s.setNLError);
  const setNLResult = useAIStore(s => s.setNLResult);
  const openModal = useUIStore(s => s.openAddMemberModal);
  const addToast = useUIStore(s => s.addToast);
  const people = usePeopleStore(s => s.people);

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) return;
    setNLLoading(true);
    setNLError(null);
    try {
      const existingPeople = Object.values(people).map(p => ({ id: p.id, name: p.name }));
      let result: NLExtractionResult;

      try {
        result = await extractRelationshipFromNL(text, existingPeople);
      } catch {
        // AI unavailable — use client-side fallback
        const fallback = parseNLFallback(text, existingPeople);
        if (fallback) {
          result = fallback;
          addToast('AI unavailable — using basic parsing', 'info');
        } else {
          throw new Error('Could not parse input');
        }
      }

      // If AI returned null anchorPersonId, fuzzy-match by name
      if (!result.anchorPersonId) {
        const nameHint = result.newPersonName;
        const anchorMatch = existingPeople.find(p =>
          text.toLowerCase().includes(p.name.toLowerCase().split(' ')[0].toLowerCase())
            && p.name.toLowerCase() !== nameHint.toLowerCase()
        );
        if (anchorMatch) {
          result = { ...result, anchorPersonId: anchorMatch.id };
        }
      }

      setNLResult(result);
      openModal();
      setText('');
    } catch {
      setNLError('Could not understand that. Try: "Priya is Arjun\'s daughter"');
    } finally {
      setNLLoading(false);
    }
  }, [text, people, setNLLoading, setNLError, setNLResult, openModal, addToast]);

  return (
    <div className="nl-bar" style={{ width: '100%', position: 'relative' }}>
      <Sparkles size={16} color="var(--color-accent)" style={{ flexShrink: 0 }} />
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && !nlLoading && handleSubmit()}
        placeholder="Add in natural language… e.g. 'Raj is Meena's son'"
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontFamily: 'Inter, sans-serif',
          fontSize: 14,
          color: 'var(--text-primary)',
          padding: '6px 0',
        }}
      />
      <AnimatePresence>
        {text && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setText('')}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4 }}
          >
            <X size={14} />
          </motion.button>
        )}
      </AnimatePresence>
      <button
        onClick={handleSubmit}
        disabled={nlLoading || !text.trim()}
        style={{
          height: 36,
          paddingInline: 16,
          background: text.trim() ? 'var(--color-accent)' : 'var(--surface-2)',
          color: text.trim() ? 'white' : 'var(--text-muted)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          cursor: text.trim() ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: 600,
          fontSize: 13,
          transition: 'all 200ms',
          flexShrink: 0,
        }}
      >
        {nlLoading ? <span className="spinner" style={{ borderTopColor: 'white' }} /> : <Send size={14} />}
        {nlLoading ? '' : 'Add'}
      </button>

      {nlError && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 8,
            padding: '8px 14px',
            background: '#FFF3F0',
            border: '1px solid #F5C0B8',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            color: '#E55B44',
            zIndex: 10,
          }}
        >
          {nlError}
        </div>
      )}
    </div>
  );
}
