import { useState, useCallback, useRef } from 'react';
import { Search, X, Sparkles } from 'lucide-react';
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
      }}
      animate={{
        boxShadow: focused
          ? '0 0 0 3px rgba(194, 103, 42, 0.15), var(--shadow-md)'
          : 'var(--shadow-sm)',
      }}
      transition={{ duration: 0.15 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          border: `1.5px solid ${focused ? 'var(--color-accent)' : 'var(--surface-2)'}`,
          transition: 'border-color 150ms',
          padding: '10px 16px',
          gap: 10,
        }}
      >
        <Search
          size={18}
          color={focused ? 'var(--color-accent)' : 'var(--text-muted)'}
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
