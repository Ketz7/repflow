"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";

interface Guide {
  id: string;
  icon: string;
  title: string;
  summary: string;
  intro: string;
  steps: string[];
  tip?: string;
  cta: { label: string; href: string };
}

const GUIDES: Guide[] = [
  {
    id: "getting-started",
    icon: "🚀",
    title: "Getting Started",
    summary: "New to RepFlow? Start here.",
    intro:
      "RepFlow keeps your training, nutrition, and body-composition trends in one place. A few minutes of setup unlocks everything.",
    steps: [
      "Sign up with your email and a strong password.",
      "Verify your email via the confirmation link we send.",
      "You'll land on the home dashboard — your daily hub.",
      "Tap the Profile tab and fill in your weight, height, activity level, and goal.",
      "That's it — you're ready to build your first program.",
    ],
    cta: { label: "Open profile", href: "/profile" },
  },
  {
    id: "building-program",
    icon: "🏗️",
    title: "Building a Program",
    summary: "Design a reusable workout template you can assign to any day.",
    intro:
      "Programs are reusable workout templates. Build one, assign it to the calendar, and you'll know exactly what to do on any given day.",
    steps: [
      'From the Programs tab, tap "+ New Program".',
      'Give it a name and optional description (e.g. "PPL 6-day split").',
      'Add workouts — one per training day. Name them (e.g. "Push Day").',
      "Inside each workout, add exercises from the picker and set target sets × reps.",
      "Reorder exercises by dragging the ⋮⋮ handle.",
      'Tap "Create Program" — you\'re done. Drafts auto-save so you won\'t lose progress if you navigate away.',
    ],
    tip: "Closed the tab mid-edit? The resume banner will let you pick up where you left off on your next visit.",
    cta: { label: "Build a program", href: "/programs/new" },
  },
  {
    id: "tracking-workout",
    icon: "🏋️",
    title: "Tracking a Workout",
    summary: "Log sets in real time with a built-in rest timer.",
    intro:
      "Open a scheduled workout to log your sets in real time — no more scribbling numbers between sets.",
    steps: [
      'From the calendar or Programs tab, tap "Start Workout".',
      "Tap each set as you complete it to mark it done.",
      "The rest timer floats into view — drag it anywhere on screen.",
      "Log your reps and weight for every set.",
      "Tap Finish when you've wrapped the session.",
    ],
    tip: "The rest timer pops up automatically between sets. Tap +30s to extend or Skip to move on.",
    cta: { label: "See your programs", href: "/programs" },
  },
  {
    id: "reading-progress",
    icon: "📈",
    title: "Reading Your Progress",
    summary: "Turn workout history into trends you can act on.",
    intro:
      "The Progress tab turns your workout history into trends you can actually act on — volume, muscle balance, and PRs.",
    steps: [
      "Tap the Progress tab.",
      "Browse volume over time, per-muscle-group breakdowns, and your best-ever lifts.",
      "Tap any exercise to see a strength-progression chart.",
      "Use the date-range filter to focus on a specific training block.",
    ],
    cta: { label: "Open progress", href: "/progress" },
  },
  {
    id: "calendar",
    icon: "📅",
    title: "Using the Calendar",
    summary: "Plan your training days and review what you actually did.",
    intro:
      "Assign programs to specific days and track what you actually did. The calendar is your training ledger.",
    steps: [
      "Open the Calendar tab.",
      "Tap a date to pick a day.",
      "Assign a workout from your active program.",
      "Tap a completed session on any past date to review it.",
    ],
    tip: "Completed sessions show with a ring. Missed sessions are greyed — tap to log them retroactively.",
    cta: { label: "Open calendar", href: "/calendar" },
  },
  {
    id: "profile",
    icon: "👤",
    title: "Customizing Your Profile",
    summary: "Drive calorie targets, macro goals, and body-comp trends.",
    intro:
      "Your profile drives calorie targets, macro goals, and body-composition trends. Keep it current for accurate recommendations.",
    steps: [
      "Go to the Profile tab.",
      "Update your weight, height, activity level, and goal.",
      "Optionally add a profile photo.",
      "Log body-weight changes regularly for accurate trend charts.",
    ],
    cta: { label: "Open profile", href: "/profile" },
  },
  {
    id: "exercise-library",
    icon: "💪",
    title: "Exercise Library",
    summary: "Search the full exercise catalogue with form videos.",
    intro:
      "Looking up an exercise? The Exercises tab has the full library with form videos and cues.",
    steps: [
      "Open the Exercises tab.",
      "Search by name or filter by muscle group.",
      "Tap any exercise to watch the form video and read tips.",
    ],
    cta: { label: "Browse exercises", href: "/exercises" },
  },
];

export default function TutorialsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-2">
        How to use RepFlow
      </h1>
      <p className="text-sm text-subtext mb-6">
        Quick guides to every feature.
      </p>

      <div className="space-y-3">
        {GUIDES.map((guide) => {
          const isOpen = expandedId === guide.id;
          return (
            <motion.div
              key={guide.id}
              layout
              className="rounded-2xl bg-card border border-border overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : guide.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0" aria-hidden>
                    {guide.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {guide.title}
                    </div>
                    <div className="text-xs text-subtext truncate">
                      {guide.summary}
                    </div>
                  </div>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-all ${
                    isOpen
                      ? "bg-primary text-background rotate-180"
                      : "bg-surface text-subtext border border-border"
                  }`}
                  aria-hidden
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-3 h-3"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-0 space-y-4 border-t border-border">
                      <p className="text-sm text-subtext pt-4">
                        {guide.intro}
                      </p>

                      <ol className="space-y-3">
                        {guide.steps.map((step, i) => (
                          <li key={i} className="flex gap-3">
                            <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold">
                              {i + 1}
                            </span>
                            <span className="text-sm text-foreground leading-relaxed">
                              {step}
                            </span>
                          </li>
                        ))}
                      </ol>

                      {guide.tip && (
                        <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 text-sm text-foreground">
                          <span className="mr-1" aria-hidden>
                            💡
                          </span>
                          <span className="font-medium text-primary">Tip:</span>{" "}
                          <span className="text-subtext">{guide.tip}</span>
                        </div>
                      )}

                      <Link href={guide.cta.href} className="block">
                        <Button variant="primary" size="md" className="w-full">
                          {guide.cta.label} →
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
