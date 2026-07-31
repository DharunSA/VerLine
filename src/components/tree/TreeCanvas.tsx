import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Focus, Download, RotateCcw, Link2, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import PersonNode from './PersonNode';
import RelationshipEdge from './RelationshipEdge';
import MiniControls from './MiniControls';
import { useAutoLayout, type GenerationBand } from './useAutoLayout';
import { usePeopleStore } from '../../stores/peopleStore';
import { useUIStore } from '../../stores/uiStore';

const nodeTypes = { personNode: PersonNode };
const edgeTypes = { relationshipEdge: RelationshipEdge };

interface TreeCanvasInnerProps {
  viewerPersonId?: string;
}

/** Store absolute positions (not deltas) to localStorage */
function saveNodePosition(nodeId: string, x: number, y: number) {
  try {
    const stored = JSON.parse(localStorage.getItem('verline-node-offsets') ?? '{}');
    stored[nodeId] = { x, y };
    localStorage.setItem('verline-node-offsets', JSON.stringify(stored));
  } catch {
    // ignore localStorage errors
  }
}

function TreeCanvasInner({ viewerPersonId: _viewerPersonId }: TreeCanvasInnerProps) {
  const people = usePeopleStore(s => s.people);
  const relationships = usePeopleStore(s => s.relationships);
  const addRelationship = usePeopleStore(s => s.addRelationship);
  const selectedPersonId = usePeopleStore(s => s.selectedPersonId);
  const collapsedBranches = useUIStore(s => s.collapsedBranches);
  const focusPersonId = useUIStore(s => s.focusPersonId);
  const focusPerson = useUIStore(s => s.focusPerson);
  const closeMemberDrawer = useUIStore(s => s.closeMemberDrawer);
  const addToast = useUIStore(s => s.addToast);
  const { fitView, setCenter, zoomIn, zoomOut } = useReactFlow();

  // Hybrid Manual Connection State (Drag-and-Drop Handle Linking)
  const [pendingConnection, setPendingConnection] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [selectedRelType, setSelectedRelType] = useState<'PARENT' | 'CHILD' | 'SPOUSE' | 'SIBLING'>('CHILD');

  const { nodes: layoutNodes, edges: layoutEdges, generationBands } = useAutoLayout(
    people,
    relationships,
    collapsedBranches
  );

  const displayNodes = useMemo(() => {
    return layoutNodes.map(n => ({
      ...n,
      selected: n.id === selectedPersonId,
    }));
  }, [layoutNodes, selectedPersonId]);

  // Find root/viewer node
  const viewerPersonId = useMemo(() => {
    const keys = Object.keys(people);
    return keys.find(k => people[k].bio?.includes("That's me!")) ?? keys[0];
  }, [people]);

  // Center canvas on a specific person
  const centerOnPerson = useCallback((personId: string) => {
    const node = layoutNodes.find(n => n.id === personId);
    if (node) {
      setCenter(node.position.x + 90, node.position.y + 45, { zoom: 1.1, duration: 600 });
    }
  }, [layoutNodes, setCenter]);

  // Handle focus request from state
  useEffect(() => {
    if (!focusPersonId) return;
    centerOnPerson(focusPersonId);
    focusPerson(null);
  }, [focusPersonId, centerOnPerson, focusPerson]);

  // Initial fitView on layout change (only when node count changes)
  const countRef = useRef(0);
  useEffect(() => {
    if (displayNodes.length > 0 && countRef.current !== displayNodes.length) {
      countRef.current = displayNodes.length;
      const timer = setTimeout(() => {
        fitView({ duration: 600, padding: 0.15 });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [displayNodes.length, fitView]);

  const handleInit = useCallback(() => {
    setTimeout(() => {
      fitView({ duration: 600, padding: 0.15 });
    }, 150);
  }, [fitView]);

  // Save ABSOLUTE positions to localStorage (not deltas)
  const handleNodeDragStop = useCallback((_event: unknown, node: { id: string; position: { x: number; y: number } }) => {
    saveNodePosition(node.id, node.position.x, node.position.y);
  }, []);

  // Handle hybrid manual drag-and-drop connection between nodes
  const handleConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target && connection.source !== connection.target) {
      setPendingConnection({
        sourceId: connection.source,
        targetId: connection.target,
      });
      setSelectedRelType('CHILD');
    }
  }, []);

  const handleSaveDragConnection = async () => {
    if (!pendingConnection) return;
    const { sourceId, targetId } = pendingConnection;
    const personA = people[sourceId];
    const personB = people[targetId];
    if (!personA || !personB) return;

    await addRelationship(sourceId, targetId, selectedRelType);
    addToast(`Connected ${personA.name} with ${personB.name}`, 'success');
    setPendingConnection(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger inside inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key.toLowerCase()) {
        case 'f':
          fitView({ duration: 500, padding: 0.15 });
          break;
        case '+':
        case '=':
          zoomIn({ duration: 300 });
          break;
        case '-':
          zoomOut({ duration: 300 });
          break;
        case 'escape':
          closeMemberDrawer();
          setPendingConnection(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fitView, zoomIn, zoomOut, closeMemberDrawer]);

  // Reset layout to default automatic generation structure
  const handleResetLayout = useCallback(() => {
    localStorage.removeItem('verline-node-offsets');
    addToast('Tree layout reset to auto-aligned structure', 'success');
    setTimeout(() => {
      fitView({ duration: 500, padding: 0.15 });
    }, 50);
  }, [addToast, fitView]);

  // Export tree JSON data
  const handleExportTree = useCallback(() => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      memberCount: Object.keys(people).length,
      people,
      relationships,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(
      JSON.stringify(exportData, null, 2)
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `verline-family-tree-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [people, relationships]);

  const emptyState = Object.keys(people).length === 0;

  const sourcePerson = pendingConnection ? people[pendingConnection.sourceId] : null;
  const targetPerson = pendingConnection ? people[pendingConnection.targetId] : null;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={displayNodes}
        edges={layoutEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={handleInit}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'var(--canvas-bg)' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="var(--surface-2)"
        />

        <MiniControls />

        {/* Arrow marker for blood edges */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <marker
              id="arrow"
              markerWidth="8"
              markerHeight="8"
              refX="4"
              refY="4"
              orient="auto"
            >
              <path
                d="M0,0 L0,8 L8,4 Z"
                fill="var(--color-warm-gray)"
                opacity="0.6"
              />
            </marker>
          </defs>
        </svg>
      </ReactFlow>

      {/* Hybrid Drag Connection Modal */}
      <AnimatePresence>
        {pendingConnection && sourcePerson && targetPerson && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPendingConnection(null)}
            style={{ zIndex: 100 }}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 420, padding: 24 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 className="font-serif" style={{ fontSize: 20, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Link2 size={18} color="var(--color-accent)" />
                  Connect Family Members
                </h3>
                <button
                  onClick={() => setPendingConnection(null)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={16} />
                </button>
              </div>

              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                Select how <strong>{sourcePerson.name}</strong> is related to <strong>{targetPerson.name}</strong>:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                {[
                  { value: 'CHILD', label: `${sourcePerson.name.split(' ')[0]} is Child of` },
                  { value: 'PARENT', label: `${sourcePerson.name.split(' ')[0]} is Parent of` },
                  { value: 'SPOUSE', label: `${sourcePerson.name.split(' ')[0]} is Spouse of` },
                  { value: 'SIBLING', label: `${sourcePerson.name.split(' ')[0]} is Sibling of` },
                ].map(rt => (
                  <button
                    key={rt.value}
                    type="button"
                    onClick={() => setSelectedRelType(rt.value as typeof selectedRelType)}
                    style={{
                      padding: '10px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      background: selectedRelType === rt.value ? 'var(--color-accent)' : 'white',
                      color: selectedRelType === rt.value ? 'white' : 'var(--text-primary)',
                      border: `1.5px solid ${selectedRelType === rt.value ? 'var(--color-accent)' : 'var(--surface-2)'}`,
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 150ms',
                    }}
                  >
                    {rt.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setPendingConnection(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
                  Cancel
                </button>
                <button type="button" onClick={handleSaveDragConnection} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Check size={14} /> Connect Members
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generation background bands (horizontal lanes) */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {generationBands.map((band: GenerationBand) => (
          <div
            key={band.generation}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: band.y,
              height: band.height,
              background: band.generation % 2 === 1 ? 'rgba(44, 36, 32, 0.025)' : 'transparent',
              borderTop: '1px solid rgba(44, 36, 32, 0.05)',
              borderBottom: '1px solid rgba(44, 36, 32, 0.05)',
              paddingLeft: 24,
              paddingTop: 8,
              display: 'flex',
              alignItems: 'flex-start',
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--text-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                background: 'rgba(250, 247, 242, 0.8)',
                padding: '2px 8px',
                borderRadius: 100,
              }}
            >
              {band.label}
            </span>
          </div>
        ))}
      </div>

      {/* Canvas Top Bar Tools */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          display: 'flex',
          gap: 8,
          zIndex: 10,
          background: 'white',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--surface-2)',
          padding: 4,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {viewerPersonId && (
          <button
            onClick={() => centerOnPerson(viewerPersonId)}
            title="Center canvas on me (shortcut: F)"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
              border: 'none', background: 'none', fontSize: 12, fontWeight: 500,
              color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <Focus size={14} color="var(--color-accent)" />
            Center on Me
          </button>
        )}

        <button
          onClick={handleResetLayout}
          title="Reset node positions to clean auto-layout"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            border: 'none', background: 'none', fontSize: 12, fontWeight: 500,
            color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <RotateCcw size={14} />
          Auto Align
        </button>

        <button
          onClick={handleExportTree}
          title="Export family tree JSON"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            border: 'none', background: 'none', fontSize: 12, fontWeight: 500,
            color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <Download size={14} />
          Export JSON
        </button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 16,
          fontSize: 10,
          color: 'var(--text-muted)',
          background: 'rgba(250,247,242,0.85)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px 8px',
          zIndex: 10,
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span>💡 Drag a line between any 2 cards to connect them!</span>
        &nbsp;·&nbsp;
        <kbd style={{ fontFamily: 'monospace' }}>F</kbd> fit view &nbsp;·&nbsp;
        <kbd style={{ fontFamily: 'monospace' }}>+</kbd>/<kbd style={{ fontFamily: 'monospace' }}>-</kbd> zoom &nbsp;·&nbsp;
        <kbd style={{ fontFamily: 'monospace' }}>Esc</kbd> close
      </div>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'white',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--surface-2)',
          padding: '10px 14px',
          fontSize: 11,
          color: 'var(--text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          boxShadow: 'var(--shadow-sm)',
          zIndex: 10,
        }}
      >
        {[
          { label: 'Blood relation', style: { borderBottom: '2px solid var(--color-warm-gray)' } },
          { label: 'Marriage', style: { borderBottom: '2px dashed var(--color-accent-light)' } },
          { label: 'Adopted / Step', style: { borderBottom: '2px dotted var(--color-warm-gray)' } },
        ].map(({ label, style }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, ...style }} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {emptyState && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.3, fontFamily: 'Cormorant Garamond, serif' }}>
            🌳
          </div>
          <h2 className="font-serif" style={{ fontSize: 28, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Plant your family tree
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 320, textAlign: 'center' }}>
            Start by adding yourself, then add parents, siblings, and children.
            The tree grows as your story unfolds.
          </p>
        </div>
      )}
    </div>
  );
}

interface TreeCanvasProps {
  viewerPersonId?: string;
}

export default function TreeCanvas({ viewerPersonId }: TreeCanvasProps) {
  return (
    <ReactFlowProvider>
      <TreeCanvasInner viewerPersonId={viewerPersonId} />
    </ReactFlowProvider>
  );
}
