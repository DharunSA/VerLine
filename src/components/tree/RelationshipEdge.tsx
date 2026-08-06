import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getStraightPath, type EdgeProps } from '@xyflow/react';

type EdgeType = 'blood' | 'marriage' | 'adopted' | 'divorced';

interface RelEdgeData {
  edgeType: EdgeType;
  relationshipId: string;
}

const EDGE_STYLES: Record<EdgeType, React.CSSProperties> = {
  blood: {
    stroke: '#8C7E70',
    strokeWidth: 2,
    strokeDasharray: 'none',
  },
  marriage: {
    stroke: '#E5A93C',
    strokeWidth: 2,
    strokeDasharray: '5 3',
  },
  adopted: {
    stroke: '#5E8B7A',
    strokeWidth: 2,
    strokeDasharray: '2 4',
  },
  divorced: {
    stroke: '#64748B',
    strokeWidth: 2,
    strokeDasharray: '4 4',
  },
};

const RelationshipEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
  }: EdgeProps) => {
    const edgeType = (data as unknown as RelEdgeData)?.edgeType ?? 'blood';
    const style = EDGE_STYLES[edgeType];
    const isMarriage = edgeType === 'marriage' || edgeType === 'divorced';

    const [straightPath] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });

    let finalPath = straightPath;
    if (!isMarriage) {
      // Smooth vertical bezier curve going from parent top handle to child bottom handle
      const midY = sourceY + (targetY - sourceY) * 0.5;
      finalPath = `M ${sourceX},${sourceY} C ${sourceX},${midY} ${targetX},${midY} ${targetX},${targetY}`;
    }

    return (
      <>
        <BaseEdge
          id={id}
          path={finalPath}
          style={style}
          markerEnd={!isMarriage ? 'url(#arrow)' : undefined}
        />
        {isMarriage && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${(sourceX + targetX) / 2}px, ${(sourceY + targetY) / 2}px)`,
                pointerEvents: 'none',
                fontSize: 11,
                color: 'var(--color-amber-glow)',
                fontWeight: 700,
                background: 'var(--surface-0)',
                padding: '2px 8px',
                borderRadius: 100,
                border: '1.5px solid var(--color-amber-glow)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 10px rgba(229, 169, 60, 0.3)',
                zIndex: 10,
              }}
            >
              {edgeType === 'divorced' ? 'ex' : '♡'}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  }
);

RelationshipEdge.displayName = 'RelationshipEdge';
export default RelationshipEdge;
