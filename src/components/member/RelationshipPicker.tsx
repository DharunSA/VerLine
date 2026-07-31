import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { usePeopleStore } from '../../stores/peopleStore';
import type { RelationInput } from '../../engine/types';

const RELATIONSHIP_TYPES = [
  { value: 'PARENT', label: 'Parent of', description: 'New person is the parent of the anchor' },
  { value: 'CHILD', label: 'Child of', description: 'New person is the child of the anchor' },
  { value: 'SPOUSE', label: 'Spouse / Partner of', description: 'New person is the spouse of the anchor' },
  { value: 'SIBLING', label: 'Sibling of', description: 'New person is the sibling of the anchor' },
] as const;

interface RelationshipPickerProps {
  value: RelationInput | null;
  onChange: (r: RelationInput | null) => void;
}

export default function RelationshipPicker({ value, onChange }: RelationshipPickerProps) {
  const people = usePeopleStore(s => s.people);
  const [personSearch, setPersonSearch] = useState('');

  const filteredPeople = useMemo(() => {
    const all = Object.values(people);
    if (!personSearch) return all.slice(0, 8);
    const q = personSearch.toLowerCase();
    return all.filter(p => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [people, personSearch]);

  const selectedAnchor = value?.anchorPersonId ? people[value.anchorPersonId] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 8,
          }}
        >
          Relationship to existing member
        </label>

        {/* Anchor person picker */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: 'var(--surface-1)',
            borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--surface-2)',
            marginBottom: 8,
          }}
        >
          <Search size={14} color="var(--text-muted)" />
          <input
            value={personSearch}
            onChange={e => setPersonSearch(e.target.value)}
            placeholder={selectedAnchor ? selectedAnchor.name : 'Search for a person…'}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              color: 'var(--text-primary)',
            }}
          />
          {selectedAnchor && (
            <button
              type="button"
              onClick={() => onChange(null)}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 11,
                color: 'var(--text-muted)',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Person list */}
        {filteredPeople.length > 0 && (
          <div
            style={{
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--surface-2)',
              overflow: 'hidden',
              maxHeight: 200,
              overflowY: 'auto',
            }}
          >
            {filteredPeople.map(p => (
              <button
                type="button"
                key={p.id}
                onClick={() =>
                  onChange({
                    anchorPersonId: p.id,
                    type: value?.type ?? 'CHILD',
                  })
                }
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  background: value?.anchorPersonId === p.id
                    ? 'rgba(194, 103, 42, 0.08)'
                    : 'white',
                  border: 'none',
                  borderBottom: '1px solid var(--surface-2)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 100ms',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--color-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'Cormorant Garamond, serif',
                    flexShrink: 0,
                  }}
                >
                  {p.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {p.name}
                  </div>
                  {p.profession && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.profession}</div>
                  )}
                </div>
                {value?.anchorPersonId === p.id && (
                  <span style={{ marginLeft: 'auto', color: 'var(--color-accent)', fontSize: 16 }}>
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Relationship type selector */}
      {value?.anchorPersonId && (
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 8,
            }}
          >
            Relationship Type
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {RELATIONSHIP_TYPES.map(rt => (
              <button
                type="button"
                key={rt.value}
                onClick={() =>
                  onChange({ ...value!, type: rt.value as RelationInput['type'] })
                }
                style={{
                  padding: '10px 12px',
                  background: value?.type === rt.value
                    ? 'rgba(194, 103, 42, 0.10)'
                    : 'white',
                  border: `1.5px solid ${value?.type === rt.value ? 'var(--color-accent)' : 'var(--surface-2)'}`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 150ms',
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: value?.type === rt.value ? 'var(--color-accent)' : 'var(--text-primary)',
                  }}
                >
                  {rt.label}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  {rt.description}
                </div>
              </button>
            ))}
          </div>

          {/* Adopted option for PARENT/CHILD */}
          {(value?.type === 'PARENT' || value?.type === 'CHILD') && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 10,
                fontSize: 13,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={value?.isAdopted ?? false}
                onChange={e =>
                  onChange({ ...value!, isAdopted: e.target.checked })
                }
                style={{ accentColor: 'var(--color-accent)' }}
              />
              Adopted / Step child
            </label>
          )}
        </div>
      )}

      {/* Info notice when no anchor person is selected */}
      {!value?.anchorPersonId && (
        <div
          style={{
            padding: '12px 14px',
            background: 'var(--surface-1)',
            border: '1px solid var(--surface-2)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}
        >
          💡 <strong>How relationship linking works:</strong> Select a family member above to connect this new person directly into your tree layout (as their Parent, Child, Spouse, or Sibling). Unlinked members will appear as standalone cards.
        </div>
      )}
    </div>
  );
}
