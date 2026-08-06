import { useEffect, useState } from 'react';
import { Sparkles, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIStore } from '../../stores/aiStore';
import { narrateRelationship } from '../../lib/ai';
import type { RelationshipResult } from '../../engine/types';

interface RelationshipNarratorProps {
  fromName: string;
  toName: string;
  relationship: RelationshipResult;
  cacheKey: string;
}

export default function RelationshipNarrator({
  fromName,
  toName,
  relationship,
  cacheKey,
}: RelationshipNarratorProps) {
  const [sentence, setSentence] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const narratorCache = useAIStore(s => s.narratorCache);
  const setNarratorResult = useAIStore(s => s.setNarratorResult);

  useEffect(() => {
    if (narratorCache[cacheKey]) {
      setSentence(narratorCache[cacheKey].sentence);
      return;
    }

    if (relationship.label === 'Unrelated' || relationship.label === 'Self') return;

    setLoading(true);
    narrateRelationship(fromName, toName, relationship.label, relationship.pathSummary)
      .then(result => {
        setSentence(result.sentence);
        setNarratorResult(cacheKey, result);
      })
      .catch(() => {
        setSentence(`${toName} is your ${relationship.label.toLowerCase()}${
          relationship.pathSummary ? ` — ${relationship.pathSummary}` : ''
        }.`);
      })
      .finally(() => setLoading(false));
  }, [cacheKey]);

  if (relationship.label === 'Unrelated' || relationship.label === 'Self') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '14px 16px',
          background: 'rgba(229, 169, 60, 0.08)',
          borderRadius: 'var(--radius-md)',
          borderLeft: '4px solid var(--color-amber-glow)',
          borderTop: '1px solid rgba(229, 169, 60, 0.2)',
          borderRight: '1px solid rgba(229, 169, 60, 0.2)',
          borderBottom: '1px solid rgba(229, 169, 60, 0.2)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}
      >
        <Quote size={18} color="var(--color-amber-glow)" style={{ marginTop: 2, flexShrink: 0, opacity: 0.8 }} />
        <div style={{ flex: 1, fontSize: 14, color: 'var(--color-cream)', fontStyle: 'italic', lineHeight: 1.6 }}>
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-warm-gray)' }}>
              <span className="spinner" style={{ borderTopColor: 'var(--color-amber-glow)' }} />
              Weaving kinship connection narrative…
            </span>
          ) : (
            sentence ?? `${toName} is your ${relationship.label.toLowerCase()}.`
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
