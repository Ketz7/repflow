"use client";

import { AnimatePresence, motion } from "framer-motion";

interface DraftSavedIndicatorProps {
  visible: boolean;
}

export default function DraftSavedIndicator({ visible }: DraftSavedIndicatorProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          className="text-xs text-subtext inline-flex items-center gap-1"
          aria-live="polite"
        >
          <span className="text-primary">✓</span> Draft saved
        </motion.span>
      )}
    </AnimatePresence>
  );
}
