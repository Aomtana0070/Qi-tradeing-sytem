import { motion, type HTMLMotionProps } from 'framer-motion';
import clsx from 'clsx';
import { spring } from '@/lib/constants';
import { useDashboardStore } from '@/store/dashboardStore';

interface GlassPanelProps extends HTMLMotionProps<'div'> {
  holographic?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function GlassPanel({
  children,
  className,
  holographic,
  padding = 'md',
  ...props
}: GlassPanelProps) {
  const globalHolo = useDashboardStore((s) => s.holographic);
  const showHolo = holographic ?? globalHolo;
  const reduced = useDashboardStore((s) => s.reducedMotion);

  const pad = { none: 'p-0', sm: 'p-3', md: 'p-5', lg: 'p-6' }[padding];

  return (
    <motion.div
      className={clsx('glass-panel relative overflow-hidden rounded-2xl', pad, className)}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.soft}
      {...props}
    >
      {showHolo && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 holographic-sheen animate-shimmer opacity-40"
        />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
