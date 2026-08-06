import { useState, useMemo, useEffect } from 'react';
import { X, MapPin, Briefcase, TreePine, Edit3, Trash2, AlertTriangle, Link, Search, Check, Unlink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usePeopleStore } from '../../stores/peopleStore';
import { useUIStore } from '../../stores/uiStore';
import { computeRelationship } from '../../engine/relationshipLabel';
import RelationshipBadge from '../search/RelationshipBadge';
import RelationshipNarrator from '../ai/RelationshipNarrator';

type TabId = 'details' | 'family' | 'timeline';

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

const AVATAR_COLORS = ['#E5A93C', '#3A755C', '#5B6EA6', '#8B5EA6', '#C2672A', '#5E8B7A'];
function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function MemberDrawer() {
  const isOpen = useUIStore(s => s.isMemberDrawerOpen);
  const closeDrawer = useUIStore(s => s.closeMemberDrawer);
  const focusPerson = useUIStore(s => s.focusPerson);
  const openEditModal = useUIStore(s => s.openEditModal);
  const addToast = useUIStore(s => s.addToast);
  const navigate = useNavigate();

  const selectedId = usePeopleStore(s => s.selectedPersonId);
  const people = usePeopleStore(s => s.people);
  const relationships = usePeopleStore(s => s.relationships);
  const graph = usePeopleStore(s => s.graph);
  const deletePerson = usePeopleStore(s => s.deletePerson);
  const addRelationship = usePeopleStore(s => s.addRelationship);
  const removeRelationship = usePeopleStore(s => s.removeRelationship);
  const selectPerson = usePeopleStore(s => s.selectPerson);

  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Inline connection UI state
  const [isConnecting, setIsConnecting] = useState(false);
  const [targetPersonId, setTargetPersonId] = useState<string | null>(null);
  const [connectRelType, setConnectRelType] = useState<'PARENT' | 'CHILD' | 'SPOUSE' | 'SIBLING'>('CHILD');
  const [targetSearch, setTargetSearch] = useState('');

  const person = selectedId ? people[selectedId] : null;

  // Close drawer when person is deleted (selectedId becomes null)
  useEffect(() => {
    if (isOpen && !person && !selectedId) {
      closeDrawer();
    }
  }, [person, selectedId, isOpen, closeDrawer]);

  // Reset tab & confirm on person change
  useEffect(() => {
    setActiveTab('details');
    setConfirmDelete(false);
    setIsConnecting(false);
    setTargetPersonId(null);
    setTargetSearch('');
  }, [selectedId]);

  // Immediate family
  const immediateFamily = useMemo(() => {
    if (!selectedId || !graph) return { parents: [], children: [], siblings: [], spouses: [] };
    const parents = (graph.parentsOf.get(selectedId) ?? []).map(id => people[id]).filter(Boolean);
    const children = (graph.childrenOf.get(selectedId) ?? []).map(id => people[id]).filter(Boolean);
    const spouses = (graph.spousesOf.get(selectedId) ?? []).map(id => people[id]).filter(Boolean);

    const parentIds = new Set(graph.parentsOf.get(selectedId) ?? []);
    const siblings: typeof parents = [];
    for (const parentId of parentIds) {
      for (const childId of graph.childrenOf.get(parentId) ?? []) {
        if (childId !== selectedId && !siblings.find(s => s.id === childId) && people[childId]) {
          siblings.push(people[childId]);
        }
      }
    }

    return { parents, children, siblings, spouses };
  }, [selectedId, graph, people]);

  // Filter available targets for linking
  const availableTargets = useMemo(() => {
    if (!selectedId) return [];
    const all = Object.values(people).filter(p => p.id !== selectedId);
    if (!targetSearch) return all.slice(0, 6);
    const q = targetSearch.toLowerCase();
    return all.filter(p => p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [people, selectedId, targetSearch]);

  // Relationship to self
  const viewerPersonId = useMemo(() => {
    const keys = Object.keys(people);
    return keys.find(k => people[k].bio?.includes("That's me!")) ?? keys[0];
  }, [people]);

  const relationship = useMemo(() => {
    if (!selectedId || !viewerPersonId || selectedId === viewerPersonId) return null;
    return computeRelationship(graph, people, viewerPersonId, selectedId);
  }, [selectedId, viewerPersonId, graph, people]);

  const viewerName = viewerPersonId ? people[viewerPersonId]?.name ?? 'You' : 'You';

  if (!isOpen || !person) return null;

  const birthYear = person.dob ? new Date(person.dob).getFullYear() : null;
  const deathYear = person.dod ? new Date(person.dod).getFullYear() : null;
  const age = birthYear
    ? deathYear
      ? `${deathYear - birthYear} years`
      : `${new Date().getFullYear() - birthYear} years old`
    : null;

  const avatarColor = getAvatarColor(person.id);

  const handleViewInTree = () => {
    closeDrawer();
    setTimeout(() => {
      focusPerson(person.id);
      navigate('/tree');
    }, 0);
  };

  const handleEditClick = () => {
    openEditModal(person.id);
  };

  const handleDeleteConfirm = async () => {
    const personName = person.name;
    await deletePerson(person.id);
    addToast(`${personName} removed from your family tree`, 'info');
    setConfirmDelete(false);
    closeDrawer();
  };

  const handleFamilyMemberClick = (memberId: string) => {
    selectPerson(memberId);
  };

  const handleSaveConnection = async () => {
    if (!targetPersonId) return;
    const target = people[targetPersonId];
    if (!target) return;

    await addRelationship(person.id, targetPersonId, connectRelType);
    addToast(`Connected ${person.name} with ${target.name}`, 'success');
    setIsConnecting(false);
    setTargetPersonId(null);
    setTargetSearch('');
  };

  const handleUnlinkRelationship = async (e: React.MouseEvent, targetMember: (typeof people)[string]) => {
    e.stopPropagation();
    const relEdge = relationships.find(
      r => (r.fromPersonId === person.id && r.toPersonId === targetMember.id) ||
           (r.fromPersonId === targetMember.id && r.toPersonId === person.id)
    );
    if (relEdge) {
      await removeRelationship(relEdge.id);
      addToast(`Removed relationship between ${person.name} and ${targetMember.name}`, 'info');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(10, 14, 18, 0.65)',
              backdropFilter: 'blur(6px)',
              zIndex: 50,
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="member-drawer"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 400,
              zIndex: 51,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--surface-0)',
              borderLeft: '1px solid var(--surface-2)',
            }}
          >
            {/* Header */}
            <div
              style={{
                background: `linear-gradient(135deg, ${avatarColor}25, rgba(22, 28, 34, 0.95))`,
                padding: '24px 24px 20px',
                borderBottom: '1px solid var(--surface-2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleViewInTree}
                    title="View in tree"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', background: 'var(--surface-1)',
                      border: '1px solid var(--surface-2)', borderRadius: 'var(--radius-sm)',
                      fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--color-cream)',
                    }}
                  >
                    <TreePine size={13} color="var(--color-amber-glow)" />
                    View in tree
                  </button>
                  <button
                    onClick={handleEditClick}
                    title="Edit member details"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', background: 'var(--surface-1)',
                      border: '1px solid var(--surface-2)', borderRadius: 'var(--radius-sm)',
                      fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--color-cream)',
                    }}
                  >
                    <Edit3 size={13} />
                    Edit
                  </button>
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      title="Remove from tree"
                      style={{
                        width: 32, height: 32, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', background: 'var(--surface-1)',
                        border: '1px solid var(--surface-2)', borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer', color: '#F87171',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{ display: 'flex', gap: 6, alignItems: 'center' }}
                    >
                      <span style={{ fontSize: 11, color: '#F87171', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertTriangle size={12} /> Sure?
                      </span>
                      <button
                        onClick={handleDeleteConfirm}
                        style={{
                          padding: '4px 10px', background: '#EF4444', color: 'white',
                          border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 11,
                          fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        style={{
                          padding: '4px 10px', background: 'var(--surface-1)', color: 'var(--color-cream)',
                          border: '1px solid var(--surface-2)', borderRadius: 'var(--radius-sm)',
                          fontSize: 11, cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </motion.div>
                  )}
                </div>
                <button
                  onClick={closeDrawer}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    border: '1px solid var(--surface-2)', background: 'var(--surface-1)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: 'var(--text-muted)',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Avatar + Editorial Title */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {person.photoUrl ? (
                  <img
                    src={person.photoUrl}
                    alt={person.name}
                    style={{
                      width: 76, height: 76, borderRadius: '50%', objectFit: 'cover',
                      border: `3px solid ${avatarColor}`, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 76, height: 76, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${avatarColor}dd, ${avatarColor})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 700,
                      color: '#12161A', border: `3px solid ${avatarColor}`, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(person.name)}
                  </div>
                )}

                <div style={{ flex: 1 }}>
                  <h2 className="font-serif" style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.1, color: 'var(--color-cream)' }}>
                    {person.name}
                  </h2>
                  {age && (
                    <div style={{ fontSize: 12, color: 'var(--color-warm-gray)', marginBottom: 8, fontWeight: 500 }}>
                      {person.dob && new Date(person.dob).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                      {person.dod ? ` – ${new Date(person.dod).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}` : ''}
                    </div>
                  )}

                  {/* Relationship badge */}
                  {relationship && relationship.label !== 'Unrelated' && (
                    <RelationshipBadge
                      label={relationship.label}
                      degree={relationship.degree}
                      degreeLabel={relationship.degreeLabel}
                      isDirectFamily={relationship.isDirectFamily}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--surface-2)', padding: '12px 24px', gap: 18, flexWrap: 'wrap' }}>
              {person.profession && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-warm-gray)', fontWeight: 500 }}>
                  <Briefcase size={13} color="var(--color-amber-glow)" /> {person.profession}
                </span>
              )}
              {person.location && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-warm-gray)', fontWeight: 500 }}>
                  <MapPin size={13} color="var(--color-emerald-leaf)" /> {person.location}
                </span>
              )}
            </div>

            {/* Tabs */}
            <div className="tab-list" style={{ padding: '0 24px' }}>
              {(['details', 'family', 'timeline'] as TabId[]).map(tab => (
                <button
                  key={tab}
                  className={`tab-trigger ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ padding: '24px', flex: 1 }}>
              {activeTab === 'details' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {person.bio && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-amber-glow)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                        Biography & Heirloom Notes
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--color-cream)', lineHeight: 1.6, margin: 0, background: 'var(--surface-1)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--surface-2)' }}>
                        {person.bio}
                      </p>
                    </div>
                  )}

                  {/* AI Relationship Narrator */}
                  {relationship && relationship.label !== 'Unrelated' && relationship.label !== 'Self' && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-amber-glow)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                        Lineage Path
                      </div>
                      <RelationshipNarrator
                        fromName={viewerName}
                        toName={person.name}
                        relationship={relationship}
                        cacheKey={`${viewerPersonId}-${selectedId}`}
                      />
                    </div>
                  )}

                  {/* Self indicator */}
                  {selectedId === viewerPersonId && (
                    <div
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(229, 169, 60, 0.12)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(229, 169, 60, 0.3)',
                        fontSize: 13,
                        color: 'var(--color-amber-glow)',
                        fontStyle: 'italic',
                      }}
                    >
                      👤 This is you — the root of your family tree.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'family' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Connect to existing member button */}
                  {!isConnecting ? (
                    <button
                      onClick={() => setIsConnecting(true)}
                      className="btn-secondary"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        fontSize: 13,
                        padding: '10px 14px',
                        color: 'var(--color-amber-glow)',
                        borderColor: 'rgba(229, 169, 60, 0.3)',
                        background: 'rgba(229, 169, 60, 0.08)',
                      }}
                    >
                      <Link size={14} />
                      + Connect to Existing Member
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      style={{
                        padding: 16,
                        background: 'var(--surface-1)',
                        border: '1.5px solid var(--color-amber-glow)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-amber-glow)', textTransform: 'uppercase' }}>
                          Connect {person.name.split(' ')[0]} to…
                        </span>
                        <button onClick={() => setIsConnecting(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)' }}>
                          ✕
                        </button>
                      </div>

                      {/* Target search */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-0)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--surface-2)' }}>
                        <Search size={14} color="var(--text-muted)" />
                        <input
                          value={targetSearch}
                          onChange={e => setTargetSearch(e.target.value)}
                          placeholder="Search for family member…"
                          style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, background: 'transparent', color: 'var(--color-cream)' }}
                        />
                      </div>

                      {/* Target candidates */}
                      {availableTargets.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
                          {availableTargets.map(t => (
                            <button
                              key={t.id}
                              onClick={() => setTargetPersonId(t.id)}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '8px 12px', background: targetPersonId === t.id ? 'rgba(229, 169, 60, 0.18)' : 'var(--surface-0)',
                                border: `1px solid ${targetPersonId === t.id ? 'var(--color-amber-glow)' : 'var(--surface-2)'}`,
                                borderRadius: 6, cursor: 'pointer', textAlign: 'left', fontSize: 13,
                              }}
                            >
                              <span style={{ fontWeight: 500, color: 'var(--color-cream)' }}>{t.name}</span>
                              {targetPersonId === t.id && <Check size={14} color="var(--color-amber-glow)" />}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Relationship type buttons */}
                      {targetPersonId && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          {[
                            { value: 'CHILD', label: `${person.name.split(' ')[0]} is Child of` },
                            { value: 'PARENT', label: `${person.name.split(' ')[0]} is Parent of` },
                            { value: 'SPOUSE', label: `${person.name.split(' ')[0]} is Spouse of` },
                            { value: 'SIBLING', label: `${person.name.split(' ')[0]} is Sibling of` },
                          ].map(rt => (
                            <button
                              key={rt.value}
                              onClick={() => setConnectRelType(rt.value as typeof connectRelType)}
                              style={{
                                padding: '8px 10px', fontSize: 11, fontWeight: 600,
                                background: connectRelType === rt.value ? 'var(--color-amber-glow)' : 'var(--surface-0)',
                                color: connectRelType === rt.value ? '#12161A' : 'var(--color-cream)',
                                border: `1px solid ${connectRelType === rt.value ? 'var(--color-amber-glow)' : 'var(--surface-2)'}`,
                                borderRadius: 6, cursor: 'pointer', textAlign: 'center',
                              }}
                            >
                              {rt.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Save Connection button */}
                      <button
                        onClick={handleSaveConnection}
                        disabled={!targetPersonId}
                        className="btn-primary"
                        style={{ padding: '9px', fontSize: 13, width: '100%', opacity: targetPersonId ? 1 : 0.5, cursor: targetPersonId ? 'pointer' : 'default' }}
                      >
                        Save Connection
                      </button>
                    </motion.div>
                  )}

                  {[
                    { label: 'Parents', items: immediateFamily.parents },
                    { label: 'Spouses / Partners', items: immediateFamily.spouses },
                    { label: 'Children', items: immediateFamily.children },
                    { label: 'Siblings', items: immediateFamily.siblings },
                  ].map(({ label, items }) =>
                    items.length > 0 ? (
                      <div key={label}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-amber-glow)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                          {label} ({items.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {items.map(p => (
                            <div
                              key={p.id}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                                background: p.id === selectedId ? 'rgba(229, 169, 60, 0.12)' : 'var(--surface-1)',
                                border: `1px solid ${p.id === selectedId ? 'rgba(229,169,60,0.3)' : 'var(--surface-2)'}`,
                                borderRadius: 'var(--radius-sm)', transition: 'all 150ms',
                              }}
                            >
                              <button
                                onClick={() => handleFamilyMemberClick(p.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 12, flex: 1,
                                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0,
                                }}
                              >
                                <div
                                  style={{
                                    width: 38, height: 38, borderRadius: '50%',
                                    background: getAvatarColor(p.id),
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#12161A', fontSize: 14, fontWeight: 700, flexShrink: 0,
                                    fontFamily: 'Cormorant Garamond, serif',
                                  }}
                                >
                                  {getInitials(p.name)}
                                </div>
                                <div>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-cream)' }}>{p.name}</div>
                                  {p.profession && <div style={{ fontSize: 11, color: 'var(--color-warm-gray)' }}>{p.profession}</div>}
                                </div>
                              </button>

                              {/* Unlink button */}
                              <button
                                onClick={(e) => handleUnlinkRelationship(e, p)}
                                title={`Unlink relationship with ${p.name}`}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                                  background: 'var(--surface-0)', border: '1px solid var(--surface-2)',
                                  color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0,
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.borderColor = '#EF4444'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--surface-2)'; }}
                              >
                                <Unlink size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null
                  )}
                  {!immediateFamily.parents.length && !immediateFamily.children.length && !immediateFamily.spouses.length && !immediateFamily.siblings.length && !isConnecting && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', paddingTop: 20 }}>
                      No immediate family connected yet. Click "+ Connect to Existing Member" above to link them!
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'timeline' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    person.dob && { year: new Date(person.dob).getFullYear(), label: 'Born', icon: '🌱', dateStr: person.dob },
                    person.dod && { year: new Date(person.dod).getFullYear(), label: 'Passed away', icon: '🕊️', dateStr: person.dod },
                  ].filter(Boolean).map((event, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: 'var(--surface-1)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--surface-2)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-0)', border: '1px solid var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                        {(event as { icon: string }).icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-cream)' }}>{(event as { label: string }).label}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-warm-gray)', marginTop: 2 }}>
                          {new Date((event as { dateStr: string }).dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!person.dob && !person.dod && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', paddingTop: 20 }}>
                      No life dates recorded yet.{' '}
                      <button
                        onClick={handleEditClick}
                        style={{ color: 'var(--color-amber-glow)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}
                      >
                        Add dates
                      </button>
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
