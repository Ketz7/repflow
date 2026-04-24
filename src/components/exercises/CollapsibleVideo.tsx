"use client";

/**
 * Collapsible wrapper around YouTubeEmbed for the active session screen.
 *
 * Why this exists:
 *   The 16:9 embed eats ~32% of the viewport on small phones, which pushes
 *   the bottom "Next / End Session" action off-screen and forces a page
 *   scroll. Most of the time the user wants that space back — they only
 *   need the video to glance at form once per exercise.
 *
 * Behavior:
 *   - Renders a ~44px pill (tap target safe) that expands the full embed.
 *   - `defaultOpen` is controlled by the parent, which passes a stable
 *     `key` per exercise. That gives us "open on first visit to an
 *     exercise, collapsed once you've started logging sets" without any
 *     effect-based reconciliation — each new exercise is a fresh mount.
 *   - Once mounted, the pill is user-controlled. We don't forcibly
 *     collapse it mid-exercise when a set gets completed; yanking the
 *     video out from under someone's thumb is worse UX than letting them
 *     decide.
 *
 * Not extending YouTubeEmbed itself:
 *   YouTubeEmbed stays a pure presentational component so preview pages
 *   and other callers that want the always-on embed aren't affected.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import YouTubeEmbed from "./YouTubeEmbed";

interface CollapsibleVideoProps {
  url: string;
  defaultOpen?: boolean;
}

export default function CollapsibleVideo({ url, defaultOpen = false }: CollapsibleVideoProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-surface border border-border hover:border-primary/40 active:scale-[0.99] transition-all"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 translate-x-[1px]">
              <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" />
            </svg>
          </span>
          <span className="text-sm font-medium text-foreground truncate">
            {open ? "Hide form video" : "Watch form video"}
          </span>
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 text-subtext shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2">
              <YouTubeEmbed url={url} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
