import { useState, useCallback, useRef } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../stores/uiStore';

interface SearchBarProps {
  placeholder?: string;
  onQuery?: (q: string) => void;
  autoFocus?: boolean;
}

export default function SearchBar({
  placeholder = 'Search family members…',
  onQuery,
  autoFocus = false,
}: SearchBarProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const setSearchQuery = useUIStore(s => s.setSearchQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      setValue(q);
      setSearchQuery(q);
      onQuery?.(q);
    },
    [setSearchQuery, onQuery]
  );

  const handleClear = useCallback(() => {
    setValue('');
    setSearchQuery('');
    onQuery?.('');
    inputRef.current?.focus();
  }, [setSearchQuery, onQuery]);

  return (
    <motion.div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
      }}
      animate={{
        boxShadow: focused
          ? '0 0 0 3px rgba(229, 169, 60, 0.25), 0 4px 16px rgba(0,0,0,0.3)'
          : 'var(--shadow-sm)',
      }}
      transition={{ duration: 0.15 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          background: 'var(--surface-1)',
          borderRadius: 'var(--radius-lg)',
          border: `1.5px solid ${focused ? 'var(--color-amber-glow)' : 'var(--surface-2)'}`,
          transition: 'border-color 150ms',
          padding: '11px 18px',
          gap: 12,
        }}
      >
        <SearchIcon
          size={18}
          color={focused ? 'var(--color-amber-glow)' : 'var(--text-muted)'}
          style={{ flexShrink: 0, transition: 'color 150ms' }}
        />
        <input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'Inter, sans-serif',
            fontSize: 15,
            color: 'var(--text-primary)',
          }}
        />
        <AnimatePresence>
          {value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              onClick={handleClear}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                padding: 2,
                borderRadius: '50%',
              }}
            >
              <X size={16} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
