import { AnimatePresence, motion } from 'framer-motion';
import { ease } from '@/lib/constants';
import { useDashboardStore } from '@/store/dashboardStore';

interface PageTransitionProps {
  children: React.ReactNode;
  pageKey: string;
}

export function PageTransition({ children, pageKey }: PageTransitionProps) {
  const reduced = useDashboardStore((s) => s.reducedMotion);

  if (reduced) return <>{children}</>;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
        transition={{ duration: 0.45, ease }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
