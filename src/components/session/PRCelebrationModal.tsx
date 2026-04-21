"use client";

import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import type { PRRecord } from "@/lib/training-analytics";

const KG_TO_LBS = 2.20462;

interface PRCelebrationModalProps {
  prs: PRRecord[];
  open: boolean;
  onClose: () => void;
  unit: "kg" | "lbs";
}

function formatWeightDisplay(weightKg: number, unit: "kg" | "lbs"): string {
  if (unit === "lbs") {
    const lbs = weightKg * KG_TO_LBS;
    return `${Math.round(lbs)} lbs`;
  }
  const rounded = Math.round(weightKg * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} kg`;
}

export default function PRCelebrationModal({ prs, open, onClose, unit }: PRCelebrationModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end">
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="w-full max-h-[80vh] bg-surface/90 backdrop-blur-xl border-t border-white/10 rounded-t-3xl flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.4)]"
          >
            <div className="p-5 border-b border-border text-center">
              <div className="text-3xl mb-1" aria-hidden="true">🏆</div>
              <h3 className="text-lg font-semibold text-foreground">
                New Personal Records!
              </h3>
              <p className="text-xs text-subtext mt-1">
                {prs.length === 1
                  ? "You hit a new best this session."
                  : `You hit ${prs.length} new bests this session.`}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {prs.map((pr) => {
                const e1rm = formatWeightDisplay(pr.e1rm, unit);
                const prev = pr.previousE1rm > 0
                  ? formatWeightDisplay(pr.previousE1rm, unit)
                  : null;
                const improvementPct = pr.previousE1rm > 0
                  ? Math.round(((pr.e1rm - pr.previousE1rm) / pr.previousE1rm) * 100)
                  : null;

                return (
                  <div
                    key={pr.exercise_id}
                    className="bg-card border border-border rounded-xl px-4 py-3"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {pr.exercise_name}
                    </p>
                    <p className="text-xs text-subtext mt-0.5">
                      est 1RM{" "}
                      <span className="text-primary font-semibold">{e1rm}</span>
                      {prev && improvementPct != null ? (
                        <>
                          {" "}
                          <span className="text-success">
                            (↑ {improvementPct}% from {prev})
                          </span>
                        </>
                      ) : (
                        <span className="text-success"> (first record)</span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="p-5 pt-3 safe-bottom">
              <Button className="w-full" onClick={onClose}>
                Continue
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
