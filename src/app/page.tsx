"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useWeightUnit } from "@/context/WeightUnitContext";
import { localToday, toLocalDate } from "@/lib/utils";

interface TodayStats {
  weight: number | null;
  fatPct: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

interface MacroTargets {
  protein: number;
  carbs: number;
  fat: number;
}

export default function HomePage() {
  const { formatWeight, unitLabel } = useWeightUnit();
  const [firstName, setFirstName] = useState("Athlete");
  const [todayWorkout, setTodayWorkout] = useState<{ name: string; workoutId: string; date: string } | null>(null);
  const [activePhase, setActivePhase] = useState<{ name: string } | null>(null);
  const [weekSessions, setWeekSessions] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  const [showCoachView, setShowCoachView] = useState(false);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [macroTargets, setMacroTargets] = useState<MacroTargets | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setFirstName(user.user_metadata?.full_name?.split(" ")[0] || "Athlete");

      // Check if user is an approved coach
      const { data: coachProfile } = await supabase
        .from("coach_profiles")
        .select("status")
        .eq("user_id", user.id)
        .single();
      if (coachProfile?.status === "approved") setIsCoach(true);

      // Get active phase
      const { data: phases } = await supabase
        .from("phases")
        .select("*, phase_schedule:phase_schedule(*, program_workout:program_workouts(id, name))")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1);

      const phase = phases?.[0];
      if (phase) {
        setActivePhase({ name: phase.name });
        const today = localToday();
        const todayEntry = phase.phase_schedule?.find(
          (s: { scheduled_date: string }) => s.scheduled_date === today
        );
        if (todayEntry?.program_workout) {
          setTodayWorkout({
            name: todayEntry.program_workout.name,
            workoutId: todayEntry.program_workout.id,
            date: today,
          });
        }
      }

      // Week sessions
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const { count } = await supabase
        .from("workout_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("ended_at", "is", null)
        .gte("started_at", startOfWeek.toISOString());
      setWeekSessions(count || 0);

      // Streak
      const { data: recentSessions } = await supabase
        .from("workout_sessions")
        .select("started_at")
        .eq("user_id", user.id)
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(30);

      let s = 0;
      if (recentSessions && recentSessions.length > 0) {
        const sessionDates = new Set(
          recentSessions.map((sess) => toLocalDate(sess.started_at))
        );
        const checkDate = new Date();
        if (!sessionDates.has(toLocalDate(checkDate))) {
          checkDate.setDate(checkDate.getDate() - 1);
        }
        while (sessionDates.has(toLocalDate(checkDate))) {
          s++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }
      setStreak(s);

      // Today's body stats
      const today = localToday();
      const { data: todayLog } = await supabase
        .from("body_weight_logs")
        .select("weight, fat_percentage, protein, carbs, fat")
        .eq("user_id", user.id)
        .eq("date", today)
        .single();

      if (todayLog) {
        setTodayStats({
          weight: todayLog.weight,
          fatPct: todayLog.fat_percentage,
          protein: todayLog.protein,
          carbs: todayLog.carbs,
          fat: todayLog.fat,
        });

        // Fetch macro targets from active coach-client relationship
        const { data: ccRow } = await supabase
          .from("coach_clients")
          .select("id")
          .eq("client_id", user.id)
          .eq("status", "active")
          .single();

        if (ccRow) {
          const { data: mt } = await supabase
            .from("macro_targets")
            .select("protein, carbs, fat")
            .eq("coach_client_id", ccRow.id)
            .order("effective_date", { ascending: false })
            .limit(1)
            .single();
          if (mt) setMacroTargets({ protein: mt.protein, carbs: mt.carbs, fat: mt.fat });
        }
      }

      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="px-4 pt-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-card rounded-lg" />
          <div className="h-44 bg-card/50 rounded-2xl animate-shimmer" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 bg-card/50 rounded-xl animate-shimmer" />
            <div className="h-24 bg-card/50 rounded-xl animate-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <p className="text-subtext text-sm">Welcome back,</p>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          {firstName}
        </h1>
      </motion.div>

      {/* Coach Toggle */}
      {isCoach && (
        <div className="flex bg-surface rounded-xl p-1 mb-4">
          <button
            onClick={() => setShowCoachView(false)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              !showCoachView ? "bg-primary/15 text-primary" : "text-subtext"
            }`}
          >
            My Workouts
          </button>
          <button
            onClick={() => setShowCoachView(true)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              showCoachView ? "bg-primary/15 text-primary" : "text-subtext"
            }`}
          >
            My Clients
          </button>
        </div>
      )}

      {/* Coach View */}
      {showCoachView && (
        <div className="space-y-4">
          <Link href="/coach/dashboard" className="block">
            <div className="bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center hover:border-primary/30 transition-colors">
              <h3 className="text-lg font-semibold text-foreground mb-2">Coach Dashboard</h3>
              <p className="text-sm text-subtext">View and manage your clients</p>
            </div>
          </Link>
        </div>
      )}

      {/* Today's Workout Card — glassmorphism */}
      {!showCoachView && (<><motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg p-5 mb-4 overflow-hidden"
      >
        {/* Subtle gradient glow behind */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Today&apos;s Workout</h2>
          {activePhase ? (
            <span className="text-xs text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              {activePhase.name}
            </span>
          ) : (
            <span className="text-xs text-subtext px-2.5 py-1 rounded-full bg-surface border border-border">
              No phase active
            </span>
          )}
        </div>

        <div className="relative">
          {todayWorkout ? (
            <>
              <p className="text-foreground font-medium mb-1">{todayWorkout.name}</p>
              <p className="text-subtext text-sm mb-4">Ready when you are.</p>
              <Link href={`/session/start?workout=${todayWorkout.workoutId}&date=${todayWorkout.date}`}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-background font-semibold text-sm shadow-[0_4px_20px_rgba(56,189,248,0.3)]"
                >
                  Start Workout
                </motion.button>
              </Link>
            </>
          ) : activePhase ? (
            <p className="text-subtext text-sm">Rest day. Recover and come back stronger.</p>
          ) : (
            <>
              <p className="text-subtext text-sm mb-4">
                Create a phase to get started with your training program.
              </p>
              <Link href="/calendar">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-background font-semibold text-sm shadow-[0_4px_20px_rgba(56,189,248,0.3)]"
                >
                  Get Started
                </motion.button>
              </Link>
            </>
          )}
        </div>
      </motion.div>

      {/* Quick Stats — glassmorphism */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-primary">
                <path d="M5.127 3.502 5.25 3.5h9.5c.041 0 .082 0 .123.002A2.251 2.251 0 0 0 12.75 2h-5.5a2.25 2.25 0 0 0-2.123 1.502ZM1 10.25A2.25 2.25 0 0 1 3.25 8h13.5A2.25 2.25 0 0 1 19 10.25v5.5A2.25 2.25 0 0 1 16.75 18H3.25A2.25 2.25 0 0 1 1 15.75v-5.5ZM3.25 6.5c-.04 0-.082 0-.123.002A2.25 2.25 0 0 1 5.25 5h9.5c.98 0 1.814.627 2.123 1.502a3.819 3.819 0 0 0-.123-.002H3.25Z" />
              </svg>
            </div>
            <p className="text-subtext text-xs">This Week</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{weekSessions}</p>
          <p className="text-subtext text-xs">sessions</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-accent">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 0 0-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 0 0-.613 3.58 2.64 2.64 0 0 1-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 0 0 5.05 6.05 6.981 6.981 0 0 0 3 11a7 7 0 1 0 9.395-6.447ZM12 15a3 3 0 0 1-5.712 1.29A4.956 4.956 0 0 1 5 12.62c.166.105.336.2.513.282a4.64 4.64 0 0 0 3.703.175A3.002 3.002 0 0 1 12 15Z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-subtext text-xs">Streak</p>
          </div>
          <p className={`text-2xl font-bold ${streak >= 7 ? "text-accent" : streak >= 3 ? "text-primary" : "text-foreground"}`}>
            {streak}
          </p>
          <p className="text-subtext text-xs">days</p>
        </motion.div>
      </div>

      {/* Today's Stats Row */}
      {todayStats && (todayStats.weight != null || todayStats.fatPct != null || todayStats.protein != null) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-3"
        >
          <Link href="/profile">
            <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg p-3">
              <p className="text-xs text-subtext mb-2 font-medium">Today&apos;s Stats</p>
              <div className="flex items-center gap-2 flex-wrap">
                {todayStats.weight != null && (
                  <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1.5">
                    <span className="text-xs text-subtext">⚖️</span>
                    <span className="text-xs font-semibold text-primary">{formatWeight(todayStats.weight)} {unitLabel}</span>
                  </div>
                )}
                {todayStats.fatPct != null && (
                  <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5">
                    <span className="text-xs text-subtext">🔴</span>
                    <span className="text-xs font-semibold text-red-400">{todayStats.fatPct}% fat</span>
                  </div>
                )}
                {todayStats.protein != null && (
                  <div className="flex items-center gap-1.5 bg-success/10 border border-success/20 rounded-lg px-2.5 py-1.5">
                    <span className="text-xs font-semibold text-success">{todayStats.protein}g P</span>
                  </div>
                )}
                {todayStats.carbs != null && (
                  <div className="flex items-center gap-1.5 bg-accent/10 border border-accent/20 rounded-lg px-2.5 py-1.5">
                    <span className="text-xs font-semibold text-accent">{todayStats.carbs}g C</span>
                  </div>
                )}
                {todayStats.fat != null && (
                  <div className="flex items-center gap-1.5 bg-warning/10 border border-warning/20 rounded-lg px-2.5 py-1.5">
                    <span className="text-xs font-semibold text-warning">{todayStats.fat}g F</span>
                  </div>
                )}
              </div>
              {/* Macro progress bars vs targets */}
              {macroTargets && todayStats.protein != null && (
                <div className="mt-3 space-y-1.5">
                  {(["protein", "carbs", "fat"] as const).map((macro) => {
                    const logged = (todayStats[macro] ?? 0) as number;
                    const target = macroTargets[macro];
                    const pct = Math.min((logged / target) * 100, 100);
                    const colors = { protein: "bg-success", carbs: "bg-accent", fat: "bg-warning" };
                    const labels = { protein: "Protein", carbs: "Carbs", fat: "Fat" };
                    return (
                      <div key={macro}>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-[10px] text-subtext">{labels[macro]}</span>
                          <span className="text-[10px] text-subtext">{logged}g / {target}g</span>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colors[macro]} rounded-full transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Link>
        </motion.div>
      )}
      </>)}
    </div>
  );
}
