import { useState, useMemo, useEffect } from 'react';
import { Filter, SortAsc } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../../components/search/SearchBar';
import SearchResultCard from '../../components/search/SearchResultCard';
import { usePeopleStore } from '../../stores/peopleStore';
import { useUIStore } from '../../stores/uiStore';
import { computeRelationship } from '../../engine/relationshipLabel';
import { searchPeople } from '../../lib/fuzzySearch';

type SortMode = 'relevance' | 'degree' | 'name';

export default function Search() {
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('relevance');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [filterLiving, setFilterLiving] = useState<string>('all');

  const people = usePeopleStore(s => s.people);
  const graph = usePeopleStore(s => s.graph);
  const selectPerson = usePeopleStore(s => s.selectPerson);
  const openDrawer = useUIStore(s => s.openMemberDrawer);
  const focusPerson = useUIStore(s => s.focusPerson);
  const setSearchQuery = useUIStore(s => s.setSearchQuery);
  const navigate = useNavigate();

  const peopleList = Object.values(people);

  // Clear global search query on unmount
  useEffect(() => {
    return () => {
      setSearchQuery('');
    };
  }, [setSearchQuery]);

  const viewerPersonId = useMemo(() => {
    const keys = Object.keys(people);
    return keys.find(k => people[k].bio?.includes("That's me!")) ?? keys[0];
  }, [people]);

  const results = useMemo(() => {
    const searched = query
      ? searchPeople(query, peopleList)
      : peopleList.map(p => ({ person: p, score: 1 }));

    let filtered = searched.filter(({ person }) => {
      if (filterGender !== 'all' && person.gender !== filterGender) return false;
      if (filterLiving === 'living' && person.dod) return false;
      if (filterLiving === 'deceased' && !person.dod) return false;
      return true;
    });

    const withRelationship = filtered.map(({ person, score }) => ({
      person,
      score,
      relationship: viewerPersonId && person.id !== viewerPersonId
        ? computeRelationship(graph, people, viewerPersonId, person.id)
        : null,
    }));

    if (sortMode === 'degree') {
      withRelationship.sort((a, b) => {
        const aDeg = a.relationship?.degree ?? Infinity;
        const bDeg = b.relationship?.degree ?? Infinity;
        if (aDeg === Infinity && bDeg === Infinity) return a.person.name.localeCompare(b.person.name);
        return aDeg - bDeg;
      });
    } else if (sortMode === 'name') {
      withRelationship.sort((a, b) => a.person.name.localeCompare(b.person.name));
    }

    return withRelationship;
  }, [query, peopleList, sortMode, filterGender, filterLiving, viewerPersonId, graph, people]);

  const handleResultClick = (personId: string) => {
    selectPerson(personId);
    // Navigate to tree, focus on person node, open drawer
    navigate('/tree');
    setTimeout(() => {
      focusPerson(personId);
      openDrawer();
    }, 100);
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '28px 32px', maxWidth: 780 }}>
      <h1 className="font-serif" style={{ fontSize: 30, margin: '0 0 20px' }}>
        Search Family
      </h1>

      <SearchBar placeholder="Search by name, profession, location…" onQuery={setQuery} autoFocus />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
          <Filter size={14} /> Filters:
        </span>

        {[
          { label: 'Everyone', val: 'all' },
          { label: 'Living', val: 'living' },
          { label: 'Deceased', val: 'deceased' },
        ].map(f => (
          <button
            key={f.val}
            onClick={() => setFilterLiving(f.val)}
            style={{
              padding: '4px 12px',
              borderRadius: 100,
              border: `1.5px solid ${filterLiving === f.val ? 'var(--color-accent)' : 'var(--surface-2)'}`,
              background: filterLiving === f.val ? 'rgba(194,103,42,0.1)' : 'white',
              color: filterLiving === f.val ? 'var(--color-accent)' : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <SortAsc size={14} color="var(--text-muted)" />
          <select
            value={sortMode}
            onChange={e => setSortMode(e.target.value as SortMode)}
            style={{
              border: '1px solid var(--surface-2)', borderRadius: 6, padding: '4px 8px',
              fontSize: 12, background: 'white', color: 'var(--text-primary)', cursor: 'pointer',
            }}
          >
            <option value="relevance">Sort: Relevance</option>
            <option value="degree">Sort: Closeness</option>
            <option value="name">Sort: Name A–Z</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      {query && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          {results.length} result{results.length !== 1 ? 's' : ''} for "{query}" — click to view in family tree
        </p>
      )}

      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {results.map(({ person, relationship }) => (
          <SearchResultCard
            key={person.id}
            person={person}
            relationship={relationship ?? undefined}
            onClick={() => handleResultClick(person.id)}
          />
        ))}
        {results.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: 48 }}>🔍</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {query ? `No results for "${query}"` : 'Start typing to search your family members'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
