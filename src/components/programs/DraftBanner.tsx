"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { formatRelativeTime } from "@/lib/utils";

interface DraftBannerProps {
  savedAt: number;
  onResume: () => void;
  onDiscard: () => void;
}

export default function DraftBanner({ savedAt, onResume, onDiscard }: DraftBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mb-4 rounded-2xl border border-primary/30 bg-primary/10 p-4"
      role="region"
      aria-label="Resume draft"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">You have an unsaved draft</p>
          <p className="text-xs text-subtext mt-0.5">
            Saved {formatRelativeTime(savedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="ghost" onClick={onDiscard}>
            Discard
          </Button>
          <Button size="sm" onClick={onResume}>
            Resume
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
