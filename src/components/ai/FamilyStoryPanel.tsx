import { useState, useCallback, useMemo } from 'react';
import { BookOpen, RefreshCw, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePeopleStore } from '../../stores/peopleStore';
import { generateFamilyStory } from '../../lib/ai';
import { useAIStore } from '../../stores/aiStore';

/** Generate a template story when AI is unavailable */
function generateFallbackStory(people: { name: string; dob?: string; dod?: string; profession?: string; location?: string }[]): string {
  const withDob = people.filter(p => p.dob);
  const living = people.filter(p => !p.dod);
  const locations = [...new Set(people.filter(p => p.location).map(p => p.location!))];
  const professions = [...new Set(people.filter(p => p.profession).map(p => p.profession!))];

  const oldest = withDob.sort((a, b) =>
    new Date(a.dob!).getTime() - new Date(b.dob!).getTime()
  )[0];

  const paragraphs: string[] = [];

  // Opening
  if (oldest) {
    const birthYear = new Date(oldest.dob!).getFullYear();
    const locationStr = oldest.location ? ` in ${oldest.location}` : '';
    paragraphs.push(
      `The story of this family begins with ${oldest.name}, born${locationStr} in ${birthYear}. ` +
      `Their life laid the foundation for the generations that followed — a legacy built through dedication, love, and sacrifice.`
    );
  } else {
    paragraphs.push(
      `This family's story spans generations of resilience and connection. Each member has contributed a unique chapter to a shared legacy that continues to grow.`
    );
  }

  // Middle — generations & locations
  if (locations.length > 0) {
    const locationList = locations.slice(0, 3).join(', ');
    paragraphs.push(
      `Across ${people.length} recorded members, this family has put down roots in ${locationList}${locations.length > 3 ? ' and beyond' : ''}. ` +
      `The journeys between cities and generations reflect a family that has always sought new horizons while holding on to its roots.`
    );
  }

  // Professions paragraph
  if (professions.length > 1) {
    const profList = professions.slice(0, 4).join(', ');
    paragraphs.push(
      `Among them, the family has counted ${profList} — a diverse tapestry of callings that speaks to a lineage of curious minds and dedicated hearts. ` +
      `${living.length} members continue that tradition today.`
    );
  }

  // Closing
  paragraphs.push(
    `Every name in this tree is a thread in a larger story — one still being written. By preserving these memories, we honour those who came before and give those who come after a place to stand.`
  );

  return paragraphs.join('\n\n');
}

export default function FamilyStoryPanel() {
  const people = usePeopleStore(s => s.people);
  const storyLoading = useAIStore(s => s.storyLoading);
  const setStoryLoading = useAIStore(s => s.setStoryLoading);
  const [story, setStory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAIGenerated, setIsAIGenerated] = useState(false);

  const cacheKey = useMemo(() => {
    const names = Object.values(people).map(p => p.name).sort().join(',');
    return btoa(names).slice(0, 32);
  }, [people]);

  const generate = useCallback(async () => {
    setStoryLoading(true);
    setError(null);
    try {
      const peopleList = Object.values(people).map(p => ({
        name: p.name,
        dob: p.dob,
        dod: p.dod,
        profession: p.profession,
        location: p.location,
      }));

      try {
        const result = await generateFamilyStory(peopleList, cacheKey);
        setStory(result.narrative);
        setIsAIGenerated(true);
      } catch {
        // AI unavailable — use template fallback
        const fallback = generateFallbackStory(peopleList);
        setStory(fallback);
        setIsAIGenerated(false);
        setError('AI story generation unavailable — showing a generated summary instead.');
      }
    } finally {
      setStoryLoading(false);
    }
  }, [people, cacheKey, setStoryLoading]);

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--surface-2)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--surface-2)',
          background: 'rgba(194, 103, 42, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={16} color="var(--color-accent)" />
          <h3 className="font-serif" style={{ fontSize: 17, margin: 0, fontWeight: 600 }}>
            Family Story
          </h3>
          {isAIGenerated && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#8B5EA6', fontWeight: 600, background: 'rgba(139,94,166,0.1)', padding: '2px 8px', borderRadius: 100 }}>
              <Sparkles size={10} /> AI
            </span>
          )}
        </div>
        <button
          onClick={generate}
          disabled={storyLoading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
            background: 'var(--color-accent)', color: 'white', border: 'none',
            borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600,
            cursor: storyLoading ? 'default' : 'pointer', opacity: storyLoading ? 0.7 : 1,
          }}
        >
          {storyLoading ? <span className="spinner" style={{ borderTopColor: 'white' }} /> : <RefreshCw size={12} />}
          {story ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      <div style={{ padding: '16px 20px' }}>
        <AnimatePresence mode="wait">
          {storyLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)', fontSize: 13 }}
            >
              <span className="spinner" />
              Weaving your family story…
            </motion.div>
          ) : story ? (
            <motion.div
              key="story"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, fontStyle: 'italic' }}>
                  ℹ️ {error}
                </div>
              )}
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic' }}>
                {story.split('\n').map((para, i) => (
                  <p key={i} style={{ margin: '0 0 12px' }}>{para}</p>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ textAlign: 'center', padding: '20px 0' }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>📖</div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Click "Generate" to create a narrated family story.{' '}
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Works offline too — powered by Claude AI when available.
                </span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
