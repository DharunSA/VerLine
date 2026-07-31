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
  '#C2672A', '#4A7A5E', '#5B6EA6', '#8B5EA6', '#A65E5E', '#5E8B7A',
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
  return (
    <motion.div
      className="search-card"
      onClick={onClick}
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Avatar */}
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
            }}
          />
        ) : (
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${getAvatarColor(person.id)}cc, ${getAvatarColor(person.id)})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 20,
              fontWeight: 600,
              color: 'white',
              flexShrink: 0,
            }}
          >
            {getInitials(person.name)}
          </div>
        )}

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              className="font-serif"
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: 'var(--text-primary)',
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
              gap: 12,
              marginTop: 4,
              flexWrap: 'wrap',
            }}
          >
            {person.profession && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                }}
              >
                <Briefcase size={12} />
                {person.profession}
              </span>
            )}
            {person.location && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                }}
              >
                <MapPin size={12} />
                {person.location}
              </span>
            )}
          </div>

          {/* Path summary */}
          {relationship && relationship.pathSummary && relationship.label !== 'Unrelated' && relationship.label !== 'Self' && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: 'var(--text-muted)',
                fontStyle: 'italic',
              }}
            >
              {relationship.pathSummary}
            </div>
          )}
        </div>

        <ChevronRight size={16} color="var(--text-muted)" />
      </div>
    </motion.div>
  );
}
