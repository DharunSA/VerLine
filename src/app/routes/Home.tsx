import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Trophy, Sparkles, TrendingUp, Cake, ArrowRight, GitBranch } from 'lucide-react';
import { usePeopleStore } from '../../stores/peopleStore';
import { useUIStore } from '../../stores/uiStore';
import { computeRelationship } from '../../engine/relationshipLabel';
import SearchBar from '../../components/search/SearchBar';
import SearchResultCard from '../../components/search/SearchResultCard';
import FamilyStoryPanel from '../../components/ai/FamilyStoryPanel';
import NLAddMemberBar from '../../components/ai/NLAddMemberBar';
import { searchPeople } from '../../lib/fuzzySearch';
import familyTreeBg from '../../assets/Family_tree.jpeg';

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
    <div style={{ height: '100%', overflowY: 'auto', position: 'relative' }}>
      {/* Subtle Hero Overlay Background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 380,
          backgroundImage: `linear-gradient(to bottom, rgba(18, 22, 26, 0.45), rgba(18, 22, 26, 0.98)), url(${familyTreeBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 20%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, padding: '36px 40px' }}>
        {/* Editorial Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 32 }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 14px',
              borderRadius: 100,
              background: 'rgba(229, 169, 60, 0.14)',
              border: '1px solid rgba(229, 169, 60, 0.3)',
              color: 'var(--color-amber-glow)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            <GitBranch size={14} />
            <span>Interactive Living Ancestry</span>
          </div>

          <h1
            className="font-serif"
            style={{
              fontSize: 42,
              fontWeight: 700,
              margin: '0 0 8px',
              color: 'var(--color-cream)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            VerLine — Your Roots, in One Line.
          </h1>
          <p style={{ color: 'var(--color-warm-gray)', fontSize: 16, margin: 0, maxWidth: 640, lineHeight: 1.5 }}>
            {peopleList.length === 0
              ? 'Plant your family roots and map generations with real-time AI parsing and topological graph rendering.'
              : `Preserving ${peopleList.length} family members across ${stats?.generations ?? 1} generation${(stats?.generations ?? 1) > 1 ? 's' : ''}. Map connections, explore lineages, and generate heirloom stories.`}
          </p>
        </motion.div>

        {/* Elevated AI Feature Input Bar & Quick Search */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 36, maxWidth: 1000 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-amber-glow)', marginBottom: 8, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
              ✨ Dual AI Member Parser
            </label>
            <NLAddMemberBar />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-warm-gray)', marginBottom: 8, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
              🔍 Kinship & Name Search
            </label>
            <SearchBar placeholder="Search members by name, profession, or location…" />
          </div>
        </div>

        {/* Search results overlay */}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640 }}>
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
                <StatCard icon={<Users size={20} />} label="Family Members" value={stats.total} color="var(--color-amber-glow)" />
                <StatCard icon={<TrendingUp size={20} />} label="Generations" value={stats.generations} color="var(--color-emerald-leaf)" />
                {stats.topProfession && (
                  <StatCard icon={<Trophy size={20} />} label="Top Profession" value={stats.topProfession} color="#5B6EA6" />
                )}
                <div className="stat-card" style={{ gridColumn: 'span 1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'rgba(229, 169, 60, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={18} color="var(--color-amber-glow)" />
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
                      style={{ height: '100%', background: 'var(--color-amber-glow)', borderRadius: 3 }}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    Add dates, professions, and bios to enrich heirloom records
                  </p>
                </div>
              </>
            )}

            {/* Upcoming birthdays */}
            {upcomingBirthdays.length > 0 && (
              <div className="stat-card" style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Cake size={18} color="var(--color-amber-glow)" />
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                    Upcoming Birthdays (Next 30 Days)
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
                        background: 'var(--surface-0)',
                        border: '1px solid var(--surface-2)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: 13,
                        color: 'var(--text-primary)',
                        transition: 'all 150ms',
                      }}
                    >
                      <span>🎂</span>
                      <span style={{ fontWeight: 500 }}>{person.name}</span>
                      <span style={{ color: 'var(--color-amber-glow)', fontSize: 11, fontWeight: 600 }}>
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

            {/* All members grid */}
            {peopleList.length > 0 && (
              <div className="stat-card" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 className="font-serif" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
                    Family Directory
                  </h3>
                  <button
                    onClick={() => navigate('/tree')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-amber-glow)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span>View Interactive Canvas</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
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
            background: `${color}20`,
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
