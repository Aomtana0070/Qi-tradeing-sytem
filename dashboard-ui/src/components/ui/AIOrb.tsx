import { motion } from 'framer-motion';
import { useDashboardStore } from '@/store/dashboardStore';

interface AIOrbProps {
  active?: boolean;
  onClick?: () => void;
}

export function AIOrb({ active, onClick }: AIOrbProps) {
  const reduced = useDashboardStore((s) => s.reducedMotion);

  return (
    <motion.button
      type="button"
      aria-label="Open AI assistant"
      onClick={onClick}
      className="relative flex h-14 w-14 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
      whileHover={reduced ? undefined : { scale: 1.06 }}
      whileTap={reduced ? undefined : { scale: 0.95 }}
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.35), transparent 50%), radial-gradient(circle, var(--accent), #312e81)',
          boxShadow: active
            ? '0 0 48px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.25)'
            : '0 0 32px var(--accent-glow)',
        }}
        animate={
          reduced
            ? undefined
            : {
                scale: active ? [1, 1.08, 1] : [1, 1.04, 1],
                opacity: active ? [0.95, 1, 0.95] : [0.85, 1, 0.85],
              }
        }
        transition={{ duration: active ? 2 : 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        aria-hidden
        className="relative z-10 text-lg font-semibold text-white"
        animate={reduced ? undefined : { y: [0, -1, 0] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        ✦
      </motion.span>
      {!reduced && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border border-white/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          style={{
            background:
              'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.15), transparent 30%)',
          }}
        />
      )}
    </motion.button>
  );
}
