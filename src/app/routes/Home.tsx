import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Trophy, Sparkles, TrendingUp, Cake } from 'lucide-react';
import { usePeopleStore } from '../../stores/peopleStore';
import { useUIStore } from '../../stores/uiStore';
import { computeRelationship } from '../../engine/relationshipLabel';
import SearchBar from '../../components/search/SearchBar';
import SearchResultCard from '../../components/search/SearchResultCard';
import FamilyStoryPanel from '../../components/ai/FamilyStoryPanel';
import NLAddMemberBar from '../../components/ai/NLAddMemberBar';
import { searchPeople } from '../../lib/fuzzySearch';

export default function Home() {
  const people = usePeopleStore(s => s.people);
  const graph = usePeopleStore(s => s.graph);
  const selectPerson = usePeopleStore(s => s.selectPerson);
  const openDrawer = useUIStore(s => s.openMemberDrawer);
  const focusPerson = useUIStore(s => s.focusPerson);
  const searchQuery = useUIStore(s => s.searchQuery);
  const navigate = useNavigate();

  const peopleList = Object.values(people);

  // Viewer (me) — find the person marked as self
  const viewerPersonId = useMemo(() => {
    const keys = Object.keys(people);
    return keys.find(k => people[k].bio?.includes("That's me!")) ?? keys[0];
  }, [people]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (peopleList.length === 0) return null;

    const withDob = peopleList.filter(p => p.dob);
    const living = peopleList.filter(p => !p.dod);
    const deceased = peopleList.filter(p => p.dod);

    const byYear = withDob.map(p => new Date(p.dob!).getFullYear());
    const oldest = byYear.length ? Math.min(...byYear) : null;
    const youngest = byYear.length ? Math.max(...byYear) : null;

    // Count generations
    const generations = new Set<number>();
    let maxDepth = 0;
    function getDepth(id: string, depth: number) {
      maxDepth = Math.max(maxDepth, depth);
      for (const childId of graph.childrenOf.get(id) ?? []) {
        getDepth(childId, depth + 1);
      }
    }
    for (const id of Object.keys(people)) {
      if (!graph.parentsOf.has(id) || graph.parentsOf.get(id)!.length === 0) {
        getDepth(id, 0);
      }
    }

    // Profession stats
    const professions = peopleList.filter(p => p.profession).map(p => p.profession!);
    const professionCounts = professions.reduce<Record<string, number>>((acc, p) => {
      acc[p] = (acc[p] ?? 0) + 1;
      return acc;
    }, {});
    const topProfession = Object.entries(professionCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Completeness
    const fields = ['dob', 'profession', 'location', 'bio', 'photoUrl'] as const;
    const totalPossible = peopleList.length * fields.length;
    const filled = peopleList.reduce((sum, p) => sum + fields.filter(f => p[f]).length, 0);
    const completeness = Math.round((filled / totalPossible) * 100);

    return {
      total: peopleList.length,
      living: living.length,
      deceased: deceased.length,
      generations: maxDepth + 1,
      oldest,
      youngest,
      topProfession,
      completeness,
    };
  }, [people, graph, peopleList]);

  // ── Upcoming birthdays (rolling 30-day window) ───────────────────────────
  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    const todayMs = today.getTime();
    const windowMs = 30 * 24 * 60 * 60 * 1000; // 30 days

    return peopleList
      .filter(p => p.dob && !p.dod)
      .map(p => {
        const bday = new Date(p.dob!);
        // Compute next occurrence of this birthday in current or next year
        const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
        const nextYear = new Date(today.getFullYear() + 1, bday.getMonth(), bday.getDate());
        const nextOccurrence = thisYear.getTime() >= todayMs ? thisYear : nextYear;
        return { person: p, nextOccurrence, month: bday.getMonth(), day: bday.getDate() };
      })
      .filter(({ nextOccurrence }) => nextOccurrence.getTime() - todayMs <= windowMs)
      .sort((a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime())
      .slice(0, 5);
  }, [peopleList]);

  // ── Search results ────────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const results = searchPeople(searchQuery, peopleList);
    return results.map(({ person }) => {
      const rel =
        viewerPersonId && person.id !== viewerPersonId
          ? computeRelationship(graph, people, viewerPersonId, person.id)
          : null;
      return { person, relationship: rel ?? undefined };
    });
  }, [searchQuery, peopleList, viewerPersonId, graph, people]);

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-serif" style={{ fontSize: 34, margin: '0 0 6px', color: 'var(--color-charcoal)' }}>
          Your Family
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
          {peopleList.length === 0 ? 'Start building your family tree' : `${peopleList.length} members across ${stats?.generations ?? 1} generation${(stats?.generations ?? 1) > 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 24, maxWidth: 560 }}>
        <SearchBar placeholder="Search family members by name, profession, or location…" />
      </div>

      {/* AI NL Bar */}
      <div style={{ marginBottom: 28, maxWidth: 560, position: 'relative' }}>
        <NLAddMemberBar />
      </div>

      {/* Search results */}
      <AnimatePresence>
        {searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ marginBottom: 32 }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 620 }}>
              {searchResults.map(({ person, relationship }) => (
                <SearchResultCard
                  key={person.id}
                  person={person}
                  relationship={relationship}
                  onClick={() => {
                    selectPerson(person.id);
                    navigate('/tree');
                    setTimeout(() => { focusPerson(person.id); openDrawer(); }, 100);
                  }}
                />
              ))}
              {searchResults.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No members found matching "{searchQuery}"</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!searchQuery && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {/* Stats cards */}
          {stats && (
            <>
              <StatCard icon={<Users size={20} />} label="Family Members" value={stats.total} color="#C2672A" />
              <StatCard icon={<TrendingUp size={20} />} label="Generations" value={stats.generations} color="#4A7A5E" />
              {stats.topProfession && (
                <StatCard icon={<Trophy size={20} />} label="Most Common Profession" value={stats.topProfession} color="#5B6EA6" />
              )}
              <div
                className="stat-card"
                style={{ gridColumn: 'span 1' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'rgba(139, 94, 166, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={18} color="#8B5EA6" />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Tree Completeness</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                  <span className="font-serif" style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {stats.completeness}%
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.completeness}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                    style={{ height: '100%', background: '#8B5EA6', borderRadius: 3 }}
                  />
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  Add dates, professions, and photos to improve completeness
                </p>
              </div>
            </>
          )}

          {/* Upcoming birthdays */}
          {upcomingBirthdays.length > 0 && (
            <div className="stat-card" style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Cake size={18} color="var(--color-accent)" />
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                  Upcoming Birthdays
                </h3>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {upcomingBirthdays.map(({ person, month, day }) => (
                  <button
                    key={person.id}
                    onClick={() => { selectPerson(person.id); openDrawer(); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 14px',
                      background: 'var(--surface-1)',
                      border: '1px solid var(--surface-2)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span>🎂</span>
                    <span>{person.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                      {new Date(2000, month, day).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Family story */}
          <div style={{ gridColumn: '1 / -1' }}>
            <FamilyStoryPanel />
          </div>

          {/* Recent members */}
          {peopleList.length > 0 && (
            <div className="stat-card" style={{ gridColumn: '1 / -1' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 14px' }}>
                All Members
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {peopleList.map(person => {
                  const rel = viewerPersonId && person.id !== viewerPersonId
                    ? computeRelationship(graph, people, viewerPersonId, person.id)
                    : null;
                  return (
                    <SearchResultCard
                      key={person.id}
                      person={person}
                      relationship={rel ?? undefined}
                      onClick={() => {
                        selectPerson(person.id);
                        navigate('/tree');
                        setTimeout(() => { focusPerson(person.id); openDrawer(); }, 100);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {peopleList.length === 0 && (
            <div style={{ gridColumn: '1 / -1' }} className="empty-state">
              <div style={{ fontSize: 72 }}>🌱</div>
              <h2 className="font-serif" style={{ fontSize: 28, color: 'var(--text-secondary)' }}>
                Plant your family tree
              </h2>
              <p style={{ color: 'var(--text-muted)', maxWidth: 360, lineHeight: 1.6 }}>
                Every great family tree starts with a single person. Add yourself, then your parents, siblings, and children. The tree will grow with your story.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-sm)',
            background: `${color}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <div className="font-serif" style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>
        {value}
      </div>
    </motion.div>
  );
}
