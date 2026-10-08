import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDashboardStore } from '@/store/dashboardStore';

export function SettingsParticles() {
  const reduced = useDashboardStore((s) => s.reducedMotion);

  const particles = useMemo(
    () =>
      Array.from({ length: reduced ? 0 : 24 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 2,
        duration: 8 + Math.random() * 12,
        delay: Math.random() * 5,
      })),
    [reduced]
  );

  if (reduced) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-[5] overflow-hidden">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-white/20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.15, 0.45, 0.15],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
