import { useState, useCallback } from 'react';
import { Sparkles, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIStore } from '../../stores/aiStore';
import { useUIStore } from '../../stores/uiStore';
import { usePeopleStore } from '../../stores/peopleStore';
import { extractRelationshipFromNL, type NLExtractionResult } from '../../lib/ai';

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
  const cleanText = text.trim();
  let newPersonName = '';
  let anchorName = '';
  let relWord = '';

  const matchOf = cleanText.match(/^(?:add\s+)?(.+?)\s+(?:is|was|as)\s+(?:the\s+)?(.+?)\s+of\s+(.+)$/i);
  const matchPossessive = cleanText.match(/^(?:add\s+)?(.+?)\s+(?:is|was|as)\s+(.+?)'s?\s+(.+)$/i);
  const matchMarried = cleanText.match(/^(?:add\s+)?(.+?)\s+(?:is\s+)?married\s+to\s+(.+)$/i);
  const matchComma = cleanText.match(/^(.+?),\s*(?:the\s+)?(?:(.+?)\s+of\s+(.+)|(.+?)'s?\s+(.+))$/i);

  if (matchOf) {
    newPersonName = matchOf[1].trim();
    relWord = matchOf[2].trim();
    anchorName = matchOf[3].trim();
  } else if (matchPossessive) {
    newPersonName = matchPossessive[1].trim();
    anchorName = matchPossessive[2].trim();
    relWord = matchPossessive[3].trim();
  } else if (matchMarried) {
    newPersonName = matchMarried[1].trim();
    anchorName = matchMarried[2].trim();
    relWord = 'spouse';
  } else if (matchComma) {
    newPersonName = matchComma[1].trim();
    if (matchComma[2] && matchComma[3]) {
      relWord = matchComma[2].trim();
      anchorName = matchComma[3].trim();
    } else if (matchComma[4] && matchComma[5]) {
      anchorName = matchComma[4].trim();
      relWord = matchComma[5].trim();
    }
  } else {
    const foundPerson = existingPeople.find(p =>
      cleanText.toLowerCase().includes(p.name.toLowerCase()) ||
      cleanText.toLowerCase().includes(p.name.split(' ')[0].toLowerCase())
    );
    if (foundPerson) {
      anchorName = foundPerson.name;
      const nameMatch = cleanText.match(/^([A-Za-z\s]+?)\s+(?:is|was|as)/i);
      newPersonName = nameMatch ? nameMatch[1].trim() : 'New Member';
      relWord = cleanText;
    } else {
      return null;
    }
  }

  const anchorMatch = existingPeople.find(p =>
    p.name.toLowerCase().includes(anchorName.toLowerCase()) ||
    anchorName.toLowerCase().includes(p.name.toLowerCase()) ||
    p.name.toLowerCase().split(' ')[0] === anchorName.toLowerCase().split(' ')[0]
  );

  let relationshipType: NLExtractionResult['relationshipType'] = 'CHILD_OF';
  for (const { regex, type } of RELATIONSHIP_PATTERNS) {
    if (regex.test(relWord)) {
      relationshipType = type;
      break;
    }
  }

  return {
    newPersonName: newPersonName || 'New Member',
    anchorPersonId: anchorMatch?.id ?? null,
    relationshipType,
    confidence: anchorMatch ? 0.8 : 0.4,
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
        const fallback = parseNLFallback(text, existingPeople);
        if (fallback) {
          result = fallback;
          addToast('AI unavailable — using basic parsing', 'info');
        } else {
          throw new Error('Could not parse input');
        }
      }

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
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'rgba(229, 169, 60, 0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Sparkles size={15} color="var(--color-amber-glow)" />
      </div>
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && !nlLoading && handleSubmit()}
        placeholder="Add via AI… e.g. 'Raj is Meena's son, doctor born 1955'"
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
          height: 38,
          paddingInline: 18,
          background: text.trim() ? 'var(--color-accent)' : 'var(--surface-2)',
          color: text.trim() ? '#12161A' : 'var(--text-muted)',
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
          boxShadow: text.trim() ? '0 0 15px rgba(229, 169, 60, 0.35)' : 'none',
        }}
      >
        {nlLoading ? <span className="spinner" style={{ borderTopColor: '#12161A' }} /> : <Send size={14} />}
        {nlLoading ? '' : 'Parse'}
      </button>

      {nlError && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 8,
            padding: '10px 14px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            color: '#F87171',
            zIndex: 10,
          }}
        >
          {nlError}
        </div>
      )}
    </div>
  );
}
