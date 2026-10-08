import { useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import clsx from 'clsx';
import { useDashboardStore } from '@/store/dashboardStore';

interface MagneticButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

export function MagneticButton({
  children,
  className,
  variant = 'primary',
  size = 'md',
  disabled,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 20 });
  const sy = useSpring(y, { stiffness: 300, damping: 20 });
  const reduced = useDashboardStore((s) => s.reducedMotion);

  const variants = {
    primary: 'bg-[var(--accent)] text-white shadow-glow hover:brightness-110',
    ghost: 'bg-[var(--surface-raised)] text-ink border border-[var(--border)] hover:bg-[var(--surface-overlay)]',
    danger: 'bg-red-500/15 text-red-300 border border-red-500/25 hover:bg-red-500/25',
    success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-5 py-3 text-base rounded-xl',
  };

  const handleMove = (e: React.MouseEvent) => {
    if (reduced || disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * 0.18);
    y.set((e.clientY - cy) * 0.18);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={disabled}
      style={{ x: sx, y: sy }}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      className={clsx(
        'relative inline-flex items-center justify-center gap-2 font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
        'disabled:opacity-40 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
