"use client";

import { motion } from "framer-motion";
import type { ReadinessResult } from "@/lib/training-analytics";

/**
 * Compact readiness card shown on the workout preview screen.
 * Green / Yellow / Red pill + a couple of reason bullets.
 */
export default function ReadinessBadge({ result }: { result: ReadinessResult }) {
  const { level, score, reasons, muscleRest } = result;

  const style =
    level === "fresh"
      ? {
          pill: "bg-success/15 text-success border-success/30",
          bar: "bg-success",
          label: "Fresh",
          emoji: "🟢",
        }
      : level === "moderate"
      ? {
          pill: "bg-warning/15 text-warning border-warning/30",
          bar: "bg-warning",
          label: "Moderate",
          emoji: "🟡",
        }
      : {
          pill: "bg-error/15 text-error border-error/30",
          bar: "bg-error",
          label: "Fatigued",
          emoji: "🔴",
        };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="mx-4 mb-2 rounded-2xl bg-card border border-border p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{style.emoji}</span>
          <span className="text-sm font-semibold text-foreground">Readiness</span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${style.pill}`}>
            {style.label}
          </span>
        </div>
        <span className="text-xs text-subtext tabular-nums">{score}/100</span>
      </div>

      {/* Score bar */}
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${style.bar}`}
        />
      </div>

      {/* Reasons */}
      <ul className="space-y-1">
        {reasons.slice(0, 3).map((r, i) => (
          <li key={i} className="text-xs text-subtext leading-relaxed flex gap-2">
            <span className="text-subtext/50">•</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>

      {/* Muscle rest chips */}
      {muscleRest.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {muscleRest.map((m) => {
            const isTight = m.daysAgo != null && m.daysAgo <= 1;
            return (
              <span
                key={m.muscle}
                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  isTight
                    ? "bg-warning/10 text-warning border-warning/20"
                    : "bg-white/5 text-subtext border-white/10"
                }`}
              >
                {m.muscle}:{" "}
                {m.daysAgo == null
                  ? "never"
                  : m.daysAgo === 0
                  ? "today"
                  : m.daysAgo === 1
                  ? "1d ago"
                  : `${m.daysAgo}d ago`}
              </span>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
