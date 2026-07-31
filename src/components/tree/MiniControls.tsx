import { useReactFlow, Controls, MiniMap } from '@xyflow/react';
import { ZoomIn, ZoomOut, Maximize2, Map } from 'lucide-react';
import { useState } from 'react';

export default function MiniControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [showMinimap, setShowMinimap] = useState(true);

  return (
    <>
      {/* Custom control panel */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          zIndex: 10,
          background: 'white',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--surface-2)',
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
        }}
      >
        {[
          { icon: ZoomIn, action: () => zoomIn({ duration: 300 }), title: 'Zoom In' },
          { icon: ZoomOut, action: () => zoomOut({ duration: 300 }), title: 'Zoom Out' },
          { icon: Maximize2, action: () => fitView({ duration: 500, padding: 0.15 }), title: 'Fit View' },
          { icon: Map, action: () => setShowMinimap(v => !v), title: 'Toggle Minimap' },
        ].map(({ icon: Icon, action, title }) => (
          <button
            key={title}
            onClick={action}
            title={title}
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'background 150ms, color 150ms',
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.background = 'var(--surface-1)';
              (e.target as HTMLElement).style.color = 'var(--color-accent)';
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.background = 'none';
              (e.target as HTMLElement).style.color = 'var(--text-secondary)';
            }}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>

      {/* Minimap */}
      {showMinimap && (
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => {
            const color = (node.data as { branchColor?: string })?.branchColor;
            return color ?? '#C2672A';
          }}
          maskColor="rgba(250, 247, 242, 0.7)"
          style={{ borderRadius: 12, border: '1px solid var(--surface-2)' }}
        />
      )}
    </>
  );
}
