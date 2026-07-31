import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
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
        // Fallback to engine-generated description
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
          gap: 8,
          padding: '10px 14px',
          background: 'rgba(194, 103, 42, 0.06)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(194, 103, 42, 0.15)',
        }}
      >
        <Sparkles size={14} color="var(--color-accent)" style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="spinner" />
              Generating…
            </span>
          ) : (
            sentence ?? `${toName} is your ${relationship.label.toLowerCase()}.`
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
