import { motion } from 'framer-motion';
import { MapPin, Briefcase, ChevronRight } from 'lucide-react';
import type { Person } from '../../engine/types';
import type { RelationshipResult } from '../../engine/types';
import RelationshipBadge from './RelationshipBadge';

interface SearchResultCardProps {
  person: Person;
  relationship?: RelationshipResult;
  onClick: () => void;
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

const AVATAR_COLORS = [
  '#E5A93C', '#3A755C', '#5B6EA6', '#8B5EA6', '#C2672A', '#5E8B7A',
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function SearchResultCard({
  person,
  relationship,
  onClick,
}: SearchResultCardProps) {
  const avatarColor = getAvatarColor(person.id);

  return (
    <motion.div
      className="search-card"
      onClick={onClick}
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--surface-2)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 18px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Avatar with golden theme ring */}
        {person.photoUrl ? (
          <img
            src={person.photoUrl}
            alt={person.name}
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              objectFit: 'cover',
              flexShrink: 0,
              border: `2px solid ${avatarColor}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          />
        ) : (
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${avatarColor}dd, ${avatarColor})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 22,
              fontWeight: 700,
              color: '#12161A',
              flexShrink: 0,
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            {getInitials(person.name)}
          </div>
        )}

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span
              className="font-serif"
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: 'var(--color-cream)',
                lineHeight: 1.2,
              }}
            >
              {person.name}
            </span>
            {relationship && relationship.label !== 'Unrelated' && (
              <RelationshipBadge
                label={relationship.label}
                degree={relationship.degree}
                degreeLabel={relationship.degreeLabel}
                isDirectFamily={relationship.isDirectFamily}
              />
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginTop: 4,
              flexWrap: 'wrap',
            }}
          >
            {person.profession && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 13,
                  color: 'var(--color-warm-gray)',
                  fontWeight: 500,
                }}
              >
                <Briefcase size={13} color="var(--color-amber-glow)" />
                {person.profession}
              </span>
            )}
            {person.location && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 13,
                  color: 'var(--color-warm-gray)',
                  fontWeight: 500,
                }}
              >
                <MapPin size={13} color="var(--color-emerald-leaf)" />
                {person.location}
              </span>
            )}
          </div>

          {/* Path summary */}
          {relationship && relationship.pathSummary && relationship.label !== 'Unrelated' && relationship.label !== 'Self' && (
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: 'var(--text-muted)',
                fontStyle: 'italic',
              }}
            >
              {relationship.pathSummary}
            </div>
          )}
        </div>

        <ChevronRight size={18} color="var(--color-warm-gray)" />
      </div>
    </motion.div>
  );
}
