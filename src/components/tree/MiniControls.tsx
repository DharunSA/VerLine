import { useReactFlow, MiniMap } from '@xyflow/react';
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
          background: 'rgba(30, 38, 47, 0.94)',
          backdropFilter: 'blur(8px)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--surface-2)',
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
          padding: 2,
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
              width: 38,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'none',
              color: 'var(--color-cream)',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
              (e.currentTarget as HTMLElement).style.color = 'var(--color-amber-glow)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'none';
              (e.currentTarget as HTMLElement).style.color = 'var(--color-cream)';
            }}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>

      {/* Minimap */}
      {showMinimap && (
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => {
            const color = (node.data as { branchColor?: string })?.branchColor;
            return color ?? 'var(--color-amber-glow)';
          }}
          maskColor="rgba(18, 22, 26, 0.75)"
          style={{
            borderRadius: 12,
            border: '1px solid var(--surface-2)',
            background: 'var(--surface-0)',
          }}
        />
      )}
    </>
  );
}
