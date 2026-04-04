"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

type Goal = "strength" | "hypertrophy" | "fat_loss" | "maintenance";

interface Props {
  userId: string;
  onComplete: (goal: Goal, weeklyGoal: number, unit: "kg" | "lbs") => void;
}

const GOALS: { value: Goal; label: string; icon: string; desc: string }[] = [
  { value: "strength",     label: "Strength",    icon: "🏋️", desc: "Lift heavier, get stronger" },
  { value: "hypertrophy",  label: "Muscle",      icon: "💪", desc: "Build size and definition" },
  { value: "fat_loss",     label: "Fat Loss",    icon: "🔥", desc: "Burn fat, lean out" },
  { value: "maintenance",  label: "Maintain",    icon: "⚖️", desc: "Stay consistent, feel good" },
];

export default function OnboardingWizard({ userId, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    if (!goal) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("users").update({
      goal,
      weekly_session_goal: weeklyGoal,
      weight_unit: unit,
      onboarding_completed: true,
    }).eq("id", userId);
    onComplete(goal, weeklyGoal, unit);
  };

  const TOTAL_STEPS = 3;
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Progress bar */}
      <div className="h-1 bg-white/10 shrink-0">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-accent"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      <div className="flex-1 flex flex-col px-6 pt-10 pb-8 overflow-y-auto">
        {/* Step indicator */}
        <p className="text-xs text-subtext mb-2">Step {step + 1} of {TOTAL_STEPS}</p>

        <AnimatePresence mode="wait">
          {/* ── Step 0: Goal selection ── */}
          {step === 0 && (
            <motion.div
              key="step-goal"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col"
            >
              <h1 className="text-2xl font-bold text-foreground mb-1">Welcome to RepFlow</h1>
              <p className="text-subtext text-sm mb-8">What&apos;s your primary training goal?</p>
              <div className="grid grid-cols-2 gap-3 mb-auto">
                {GOALS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGoal(g.value)}
                    className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 transition-all ${
                      goal === g.value
                        ? "border-primary bg-primary/15 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <span className="text-3xl">{g.icon}</span>
                    <span className={`text-sm font-semibold ${goal === g.value ? "text-primary" : "text-foreground"}`}>
                      {g.label}
                    </span>
                    <span className="text-[11px] text-subtext text-center leading-tight">{g.desc}</span>
                  </button>
                ))}
              </div>
              <button
                disabled={!goal}
                onClick={() => setStep(1)}
                className="mt-8 w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-accent text-background font-bold text-sm disabled:opacity-30 shadow-[0_4px_20px_rgba(56,189,248,0.25)] transition-opacity"
              >
                Continue
              </button>
            </motion.div>
          )}

          {/* ── Step 1: Training frequency ── */}
          {step === 1 && (
            <motion.div
              key="step-freq"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col"
            >
              <h1 className="text-2xl font-bold text-foreground mb-1">Training Frequency</h1>
              <p className="text-subtext text-sm mb-8">How many days per week do you plan to train?</p>

              <div className="flex gap-2 mb-auto justify-center flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    onClick={() => setWeeklyGoal(n)}
                    className={`w-14 h-14 rounded-2xl border-2 font-bold text-lg transition-all ${
                      weeklyGoal === n
                        ? "border-primary bg-primary/15 text-primary shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                        : "border-white/10 bg-white/5 text-foreground"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-center text-subtext text-xs mt-4 mb-auto">
                {weeklyGoal === 1 ? "1 day — recovery focus" :
                 weeklyGoal <= 3 ? `${weeklyGoal} days — great balance` :
                 weeklyGoal <= 5 ? `${weeklyGoal} days — dedicated athlete` :
                 `${weeklyGoal} days — elite commitment`}
              </p>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setStep(0)} className="flex-1 py-4 rounded-2xl border border-white/10 text-subtext text-sm font-medium">
                  Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent text-background font-bold text-sm shadow-[0_4px_20px_rgba(56,189,248,0.25)]"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Unit preference ── */}
          {step === 2 && (
            <motion.div
              key="step-unit"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col"
            >
              <h1 className="text-2xl font-bold text-foreground mb-1">Weight Unit</h1>
              <p className="text-subtext text-sm mb-8">How do you measure your weight and lifts?</p>

              <div className="grid grid-cols-2 gap-4 mb-auto">
                {(["kg", "lbs"] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnit(u)}
                    className={`flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 transition-all ${
                      unit === u
                        ? "border-primary bg-primary/15 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <span className="text-4xl font-black text-foreground">{u}</span>
                    <span className={`text-sm ${unit === u ? "text-primary font-semibold" : "text-subtext"}`}>
                      {u === "kg" ? "Kilograms" : "Pounds"}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-2xl border border-white/10 text-subtext text-sm font-medium">
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent text-background font-bold text-sm disabled:opacity-60 shadow-[0_4px_20px_rgba(56,189,248,0.25)]"
                >
                  {saving ? "Setting up..." : "Let's go!"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
