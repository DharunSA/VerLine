import type { Person } from '../../engine/types';

interface RelationshipBadgeProps {
  label: string;
  degree: number;
  degreeLabel: string;
  isDirectFamily: boolean;
  compact?: boolean;
}

export default function RelationshipBadge({
  label,
  degree,
  degreeLabel,
  isDirectFamily,
  compact = false,
}: RelationshipBadgeProps) {
  const isSpouse = label === 'Spouse';
  const isSelf = label === 'Self';

  return (
    <span
      className={`rel-badge ${isDirectFamily || isSpouse ? 'rel-badge-direct' : 'rel-badge-extended'}`}
      style={{
        fontSize: compact ? 10 : 11,
        padding: compact ? '2px 8px' : '3px 10px',
      }}
    >
      {isSelf ? (
        'You'
      ) : isSpouse ? (
        '♡ Spouse'
      ) : (
        <>
          {!compact && (
            <span style={{ opacity: 0.8, marginRight: 4 }}>{degreeLabel} ·</span>
          )}
          {label}
        </>
      )}
    </span>
  );
}
