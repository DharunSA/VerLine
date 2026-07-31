import { forwardRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useUIStore, type Toast } from '../../stores/uiStore';

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const COLORS = {
  success: { bg: '#F0FAF5', border: '#4A7A5E', icon: '#4A7A5E', text: '#2D4A38' },
  error: { bg: '#FFF0EE', border: '#E55B44', icon: '#E55B44', text: '#8B2E1F' },
  info: { bg: '#FFF8F0', border: '#C2672A', icon: '#C2672A', text: '#7A3D12' },
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useUIStore(s => s.removeToast);
  const Icon = ICONS[toast.type];
  const colors = COLORS[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', damping: 24, stiffness: 300 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        minWidth: 260,
        maxWidth: 380,
        pointerEvents: 'all',
      }}
    >
      <Icon size={16} color={colors.icon} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 500, color: colors.text, flex: 1, lineHeight: 1.4 }}>
        {toast.message}
      </span>
      <button
        onClick={() => removeToast(toast.id)}
        style={{
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: colors.icon,
          display: 'flex',
          padding: 2,
          opacity: 0.6,
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export default function ToastContainer() {
  const toasts = useUIStore(s => s.toasts);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
