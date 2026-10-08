import { motion } from 'framer-motion';
import { useCursorPosition } from '@/hooks/useBotData';
import { useDashboardStore } from '@/store/dashboardStore';

export function Spotlight() {
  const { x, y } = useCursorPosition();
  const reduced = useDashboardStore((s) => s.reducedMotion);

  if (reduced) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1]"
      animate={{
        background: `radial-gradient(600px circle at ${x}px ${y}px, var(--spotlight), transparent 65%)`,
      }}
      transition={{ type: 'tween', duration: 0.12, ease: 'linear' }}
    />
  );
}
