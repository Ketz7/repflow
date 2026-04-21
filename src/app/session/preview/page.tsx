"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  sessionReadiness,
  type ReadinessResult,
  type SetLog,
} from "@/lib/training-analytics";
import ReadinessBadge from "@/components/session/ReadinessBadge";
import { toLocalDate } from "@/lib/utils";

interface ExerciseRow {
  exercise_id: string;
  name: string;
  muscle_group: string | null;
  muscle_icon: string | null;
  target_sets: number;
  target_reps: number;
  sort_order: number;
}

interface WorkoutInfo {
  id: string;
  name: string;
}

function WorkoutPreviewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const scheduleId = searchParams.get("schedule") || "";
  const workoutId  = searchParams.get("workout")  || "";
  const date       = searchParams.get("date")      || "";

  const [loading, setLoading]           = useState(true);
  const [workout, setWorkout]           = useState<WorkoutInfo | null>(null);
  const [exercises, setExercises]       = useState<ExerciseRow[]>([]);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const [alreadyDone, setAlreadyDone]   = useState(false);
  const [readiness, setReadiness]       = useState<ReadinessResult | null>(null);

  useEffect(() => {
    if (!workoutId) { router.replace("/calendar"); return; }

    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const [
        { data: workoutData },
        { data: workoutExercises },
        { data: openSessions },
        { data: doneSessions },
      ] = await Promise.all([
        // Workout name
        supabase
          .from("program_workouts")
          .select("id, name")
          .eq("id", workoutId)
          .single(),

        // Exercises list
        supabase
          .from("workout_exercises")
          .select("exercise_id, target_sets, target_reps, sort_order, exercise:exercises(name, muscle_group:muscle_groups(name, icon))")
          .eq("program_workout_id", workoutId)
          .order("sort_order"),

        // Any open session for this user + workout (recent, not timed-out)
        supabase
          .from("workout_sessions")
          .select("id, started_at")
          .eq("user_id", user.id)
          .eq("program_workout_id", workoutId)
          .is("ended_at", null)
          .order("started_at", { ascending: false })
          .limit(1),

        // Already completed session for this specific schedule slot
        scheduleId
          ? supabase
              .from("workout_sessions")
              .select("id")
              .eq("user_id", user.id)
              .eq("phase_schedule_id", scheduleId)
              .not("ended_at", "is", null)
              .limit(1)
          : Promise.resolve({ data: [] }),
      ]);

      setWorkout(workoutData as WorkoutInfo | null);

      if (workoutExercises) {
        setExercises(
          workoutExercises.map((we: any) => ({
            exercise_id: we.exercise_id,
            name: we.exercise?.name || "Unknown",
            muscle_group: we.exercise?.muscle_group?.name || null,
            muscle_icon: we.exercise?.muscle_group?.icon || null,
            target_sets: we.target_sets,
            target_reps: we.target_reps,
            sort_order: we.sort_order,
          }))
        );
      }

      // Check open session age — ignore if older than 4h (will be auto-abandoned)
      const ABANDON_MS = 4 * 60 * 60 * 1000;
      const freshOpen = (openSessions || []).find(
        (s) => Date.now() - new Date(s.started_at).getTime() < ABANDON_MS
      );
      setOpenSessionId(freshOpen?.id ?? null);

      setAlreadyDone((doneSessions || []).length > 0);

      // Compute readiness from last ~14 days of training
      type WeRow = {
        exercise?: { muscle_group?: { name?: string | null } | null } | null;
      };
      const targetMuscles = Array.from(
        new Set(
          ((workoutExercises as WeRow[] | null) || [])
            .map((we) => we.exercise?.muscle_group?.name ?? null)
            .filter((m): m is string => !!m)
        )
      );
      const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000).toISOString();
      const { data: recentSess } = await supabase
        .from("workout_sessions")
        .select("id, started_at")
        .eq("user_id", user.id)
        .gte("started_at", fourteenDaysAgo);
      const recentSessionIds = (recentSess || []).map((s) => s.id);
      if (recentSessionIds.length > 0) {
        const { data: recentSets } = await supabase
          .from("session_sets")
          .select(
            "session_id, exercise_id, set_number, reps_completed, weight_used, rpe, created_at, exercise:exercises(name, muscle_group:muscle_groups(id, name))"
          )
          .in("session_id", recentSessionIds);

        const sessDateById = new Map(
          (recentSess || []).map((s) => [s.id, toLocalDate(new Date(s.started_at))])
        );
        type RecentSetRow = {
          session_id: string;
          exercise_id: string;
          set_number: number;
          reps_completed: number;
          weight_used: number | null;
          rpe: number | null;
          created_at: string;
          exercise: {
            name: string | null;
            muscle_group: { id: string; name: string | null } | null;
          } | null;
        };
        const logs: SetLog[] = ((recentSets as RecentSetRow[] | null) || [])
          .filter((s) => sessDateById.has(s.session_id))
          .map((s) => ({
            session_id: s.session_id,
            exercise_id: s.exercise_id,
            exercise_name: s.exercise?.name ?? "(unknown)",
            muscle_group_name: s.exercise?.muscle_group?.name ?? "(unknown)",
            muscle_group_id: s.exercise?.muscle_group?.id ?? "",
            set_number: s.set_number,
            reps_completed: s.reps_completed,
            weight_used: s.weight_used,
            rpe: s.rpe,
            created_at: s.created_at,
            session_date: sessDateById.get(s.session_id)!,
          }));
        setReadiness(sessionReadiness(logs, targetMuscles));
      } else {
        // No history — assume fresh
        setReadiness(sessionReadiness([], targetMuscles));
      }

      setLoading(false);
    }
    load();
  }, [workoutId, scheduleId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const formattedDate = date
    ? new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : null;

  // Build the CTA URL
  const startUrl = `/session/start?workout=${workoutId}${scheduleId ? `&schedule=${scheduleId}` : ""}${date ? `&date=${date}` : ""}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 bg-gradient-to-b from-surface/80 to-transparent">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-subtext text-sm mb-4 -ml-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Calendar
        </button>

        <h1 className="text-2xl font-bold text-foreground">{workout?.name || "Workout"}</h1>
        {formattedDate && <p className="text-sm text-subtext mt-0.5">{formattedDate}</p>}
        <p className="text-xs text-subtext/60 mt-1">{exercises.length} exercises</p>
      </div>

      {/* Readiness indicator */}
      {readiness && <ReadinessBadge result={readiness} />}

      {/* Redo warning banner */}
      {alreadyDone && !openSessionId && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-2 rounded-xl bg-warning/10 border border-warning/25 px-4 py-3 flex items-start gap-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-warning shrink-0 mt-0.5">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-warning">Already completed</p>
            <p className="text-xs text-warning/80 mt-0.5">
              Starting again will log a new session — it will not replace your existing record for this slot.
            </p>
          </div>
        </motion.div>
      )}

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 pb-32">
        {exercises.map((ex, i) => (
          <motion.div
            key={ex.exercise_id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.05] border border-white/10"
          >
            {/* Muscle icon or fallback */}
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {ex.muscle_icon ? (
                <span className="text-lg">{ex.muscle_icon}</span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-primary/50">
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{ex.name}</p>
              {ex.muscle_group && (
                <p className="text-xs text-subtext">{ex.muscle_group}</p>
              )}
            </div>

            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-primary">{ex.target_sets} × {ex.target_reps}</p>
              <p className="text-[10px] text-subtext">sets × reps</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-gradient-to-t from-background via-background/95 to-transparent">
        {openSessionId ? (
          // Resume in-progress session
          <div className="space-y-2">
            <Link href={`/session/${openSessionId}`} className="block">
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-accent text-background font-bold text-base shadow-[0_4px_24px_rgba(56,189,248,0.35)]"
              >
                Resume Workout
              </motion.button>
            </Link>
            <Link href={startUrl} className="block">
              <button className="w-full py-3 rounded-2xl border border-error/30 text-error text-sm font-medium">
                Cancel & Start Fresh
              </button>
            </Link>
          </div>
        ) : (
          <Link href={startUrl} className="block">
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-accent text-background font-bold text-base shadow-[0_4px_24px_rgba(56,189,248,0.35)]"
            >
              {alreadyDone ? "Start Again" : "Start Workout"}
            </motion.button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default function WorkoutPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <WorkoutPreviewInner />
    </Suspense>
  );
}
