import { useEffect } from 'react';
import { Plus } from 'lucide-react';
import TreeCanvas from '../../components/tree/TreeCanvas';
import { useUIStore } from '../../stores/uiStore';
import { usePeopleStore } from '../../stores/peopleStore';

export default function Tree() {
  const openAddModal = useUIStore(s => s.openAddMemberModal);
  const treeId = usePeopleStore(s => s.treeId);
  const fetchTree = usePeopleStore(s => s.fetchTree);

  useEffect(() => {
    if (treeId && treeId !== 'demo-tree') {
      fetchTree(treeId);
    }
  }, [treeId, fetchTree]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Canvas */}
      <TreeCanvas />

      {/* Add Member FAB */}
      <button
        className="fab"
        onClick={openAddModal}
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: 'var(--radius-md)',
          width: 'auto',
          padding: '0 20px',
          height: 48,
          fontSize: 14,
          fontWeight: 600,
        }}
        title="Add family member"
      >
        <Plus size={20} />
        Add Member
      </button>
    </div>
  );
}
