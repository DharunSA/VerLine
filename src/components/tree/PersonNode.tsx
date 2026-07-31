import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, UserPlus, Eye, Edit, Heart, UserCheck, Users } from 'lucide-react';
import type { Person, RelationInput } from '../../engine/types';
import { usePeopleStore } from '../../stores/peopleStore';
import { useUIStore } from '../../stores/uiStore';
import { useAIStore } from '../../stores/aiStore';

interface PersonNodeData {
  person: Person;
  branchColor: string;
  collapsedCount?: number;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatYear(dateStr?: string): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).getFullYear().toString();
  } catch {
    return null;
  }
}

const PersonNode = memo(({ data, selected }: NodeProps) => {
  const { person, branchColor, collapsedCount } = (data as unknown as PersonNodeData) || {};
  if (!person) return null;

  const selectPerson = usePeopleStore(s => s.selectPerson);
  const openDrawer = useUIStore(s => s.openMemberDrawer);
  const openAddModal = useUIStore(s => s.openAddMemberModal);
  const openEditModal = useUIStore(s => s.openEditModal);
  const toggleBranch = useUIStore(s => s.toggleBranchCollapse);
  const isBranchCollapsed = useUIStore(s => s.isBranchCollapsed);
  const setNLResult = useAIStore(s => s.setNLResult);
  const graph = usePeopleStore(s => s.graph);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasChildren = (graph.childrenOf.get(person.id)?.length ?? 0) > 0;
  const collapsed = isBranchCollapsed(person.id);

  const handleClick = useCallback(() => {
    selectPerson(person.id);
    openDrawer();
  }, [person.id, selectPerson, openDrawer]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(true);
  }, []);

  const handleCollapseToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleBranch(person.id);
    },
    [person.id, toggleBranch]
  );

  const handleQuickAdd = useCallback(
    (type: 'PARENT_OF' | 'CHILD_OF' | 'SPOUSE_OF' | 'SIBLING_OF') => {
      setMenuOpen(false);
      selectPerson(person.id);
      setNLResult({
        newPersonName: '',
        anchorPersonId: person.id,
        relationshipType: type,
        confidence: 1,
      });
      openAddModal();
    },
    [person.id, selectPerson, setNLResult, openAddModal]
  );

  // Close context menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const birthYear = formatYear(person.dob);
  const deathYear = formatYear(person.dod);
  const lifespan = birthYear
    ? deathYear
      ? `${birthYear} – ${deathYear}`
      : `b. ${birthYear}`
    : null;

  return (
    <div style={{ position: 'relative' }}>
      <motion.div
        className={`person-node ${selected ? 'selected' : ''}`}
        style={{
          width: 180,
          padding: '14px 16px',
          borderTop: `3.5px solid ${branchColor}`,
          position: 'relative',
        }}
        whileHover={{ y: -2, boxShadow: '0 12px 32px rgba(44,36,32,0.14)' }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        layout
      >
        {/* Target handle (parent edge connection / top connector) */}
        <Handle
          type="target"
          position={Position.Top}
          id="top-target"
          style={{ background: branchColor, width: 10, height: 10, border: '2px solid white', cursor: 'crosshair', zIndex: 10 }}
        />
        <Handle
          type="source"
          position={Position.Top}
          id="top-source"
          style={{ background: branchColor, width: 10, height: 10, border: '2px solid white', opacity: 0, cursor: 'crosshair', zIndex: 9 }}
        />

        {/* Left & Right handles for horizontal spouse / sibling connections */}
        <Handle
          type="source"
          position={Position.Left}
          id="left-source"
          style={{ background: branchColor, width: 8, height: 8, border: '2px solid white', cursor: 'crosshair', opacity: 0.8 }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left-target"
          style={{ background: branchColor, width: 8, height: 8, border: '2px solid white', cursor: 'crosshair', opacity: 0 }}
        />

        <Handle
          type="source"
          position={Position.Right}
          id="right-source"
          style={{ background: branchColor, width: 8, height: 8, border: '2px solid white', cursor: 'crosshair', opacity: 0.8 }}
        />
        <Handle
          type="target"
          position={Position.Right}
          id="right-target"
          style={{ background: branchColor, width: 8, height: 8, border: '2px solid white', cursor: 'crosshair', opacity: 0 }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Avatar */}
          {person.photoUrl ? (
            <img
              src={person.photoUrl}
              alt={person.name}
              className="person-avatar"
              style={{ width: 44, height: 44, flexShrink: 0 }}
              loading="lazy"
            />
          ) : (
            <div
              className="person-avatar-placeholder"
              style={{
                width: 44,
                height: 44,
                background: `linear-gradient(135deg, ${branchColor}cc, ${branchColor})`,
                flexShrink: 0,
                fontSize: 16,
              }}
            >
              {getInitials(person.name)}
            </div>
          )}

          {/* Info */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              className="font-serif"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--color-charcoal)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.2,
              }}
            >
              {person.name.split(' ')[0]}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                marginTop: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {person.name.split(' ').slice(1).join(' ')}
            </div>
            {lifespan && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                {lifespan}
              </div>
            )}
          </div>
        </div>

        {/* Profession pill */}
        {person.profession && (
          <div
            style={{
              marginTop: 8,
              fontSize: 10,
              color: 'var(--text-secondary)',
              background: 'var(--surface-1)',
              padding: '2px 8px',
              borderRadius: 100,
              display: 'inline-block',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {person.profession}
          </div>
        )}

        {/* Collapsed branch indicator badge */}
        {collapsed && (collapsedCount ?? 0) > 0 && (
          <div
            style={{
              marginTop: 6,
              fontSize: 10,
              fontWeight: 600,
              color: 'white',
              background: branchColor,
              padding: '2px 8px',
              borderRadius: 100,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            +{collapsedCount} hidden
          </div>
        )}

        {/* Collapse/expand toggle button */}
        {hasChildren && (
          <button
            onClick={handleCollapseToggle}
            title={collapsed ? 'Expand branch' : 'Collapse branch'}
            style={{
              position: 'absolute',
              bottom: -12,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: branchColor,
              color: 'white',
              border: '2px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              zIndex: 10,
            }}
          >
            {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
        )}

        {/* Source handle (child edge connection / bottom connector) */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom-source"
          style={{ background: branchColor, width: 10, height: 10, border: '2px solid white', cursor: 'crosshair', zIndex: 10 }}
        />
        <Handle
          type="target"
          position={Position.Bottom}
          id="bottom-target"
          style={{ background: branchColor, width: 10, height: 10, border: '2px solid white', opacity: 0, cursor: 'crosshair', zIndex: 9 }}
        />
      </motion.div>

      {/* Right-click Context Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 5 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 8,
              background: 'white',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--surface-2)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 100,
              minWidth: 160,
              overflow: 'hidden',
              padding: '4px 0',
            }}
          >
            <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--surface-2)' }}>
              {person.name.split(' ')[0]}'s Family
            </div>
            <button
              onClick={() => handleQuickAdd('PARENT_OF')}
              style={menuItemStyle}
            >
              <UserPlus size={13} color="var(--color-accent)" /> Add Parent
            </button>
            <button
              onClick={() => handleQuickAdd('CHILD_OF')}
              style={menuItemStyle}
            >
              <UserCheck size={13} color="var(--color-accent)" /> Add Child
            </button>
            <button
              onClick={() => handleQuickAdd('SPOUSE_OF')}
              style={menuItemStyle}
            >
              <Heart size={13} color="var(--color-accent)" /> Add Spouse
            </button>
            <button
              onClick={() => handleQuickAdd('SIBLING_OF')}
              style={menuItemStyle}
            >
              <Users size={13} color="var(--color-accent)" /> Add Sibling
            </button>
            <div style={{ height: 1, background: 'var(--surface-2)', margin: '4px 0' }} />
            <button
              onClick={() => { setMenuOpen(false); selectPerson(person.id); openDrawer(); }}
              style={menuItemStyle}
            >
              <Eye size={13} /> View Details
            </button>
            <button
              onClick={() => { setMenuOpen(false); openEditModal(person.id); }}
              style={menuItemStyle}
            >
              <Edit size={13} /> Edit Person
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  background: 'none',
  border: 'none',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-primary)',
  cursor: 'pointer',
  textAlign: 'left',
};

PersonNode.displayName = 'PersonNode';
export default PersonNode;
