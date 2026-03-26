"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { WorkoutExercise, Exercise } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import YouTubeEmbed from "@/components/exercises/YouTubeEmbed";
import SessionStats from "@/components/workout/SessionStats";
import { motion, AnimatePresence } from "framer-motion";
import { formatDuration } from "@/lib/utils";

interface SetEntry {
  set_number: number;
  reps_completed: number;
  weight_used: number | null;
  completed: boolean;
}

interface ExerciseState {
  exercise_id: string;
  exercise: Exercise & { muscle_group?: { name: string; icon: string } };
  target_sets: number;
  target_reps: number;
  sets: SetEntry[];
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const [exercises, setExercises] = useState<ExerciseState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [sessionData, setSessionData] = useState<{
    duration: number;
    exercises: ExerciseState[];
    sessionId: string;
  } | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const touchStartX = useRef<number>(0);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: session } = await supabase
        .from("workout_sessions")
        .select("*, program_workout:program_workouts(id, name)")
        .eq("id", params.id)
        .single();

      if (!session?.program_workout_id) {
        router.push("/");
        return;
      }

      const { data: workoutExercises } = await supabase
        .from("workout_exercises")
        .select("*, exercise:exercises(*, muscle_group:muscle_groups(name, icon))")
        .eq("program_workout_id", session.program_workout_id)
        .order("sort_order");

      if (workoutExercises) {
        setExercises(
          workoutExercises.map((we: WorkoutExercise & { exercise: Exercise & { muscle_group?: { name: string; icon: string } } }) => ({
            exercise_id: we.exercise_id,
            exercise: we.exercise,
            target_sets: we.target_sets,
            target_reps: we.target_reps,
            sets: Array.from({ length: we.target_sets }, (_, i) => ({
              set_number: i + 1,
              reps_completed: we.target_reps,
              weight_used: null,
              completed: false,
            })),
          }))
        );
      }

      startTimeRef.current = new Date(session.started_at).getTime();
      setLoading(false);
    }
    load();
  }, [params.id, router]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 60) {
      if (diff < 0 && currentIndex < exercises.length - 1) {
        setCurrentIndex((p) => p + 1);
      } else if (diff > 0 && currentIndex > 0) {
        setCurrentIndex((p) => p - 1);
      }
    }
  };

  const updateSet = (exerciseIdx: number, setIdx: number, field: keyof SetEntry, value: number | boolean | null) => {
    setExercises((prev) =>
      prev.map((ex, ei) =>
        ei === exerciseIdx
          ? {
              ...ex,
              sets: ex.sets.map((s, si) =>
                si === setIdx ? { ...s, [field]: value } : s
              ),
            }
          : ex
      )
    );
  };

  const addSet = (exerciseIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, ei) =>
        ei === exerciseIdx
          ? {
              ...ex,
              sets: [
                ...ex.sets,
                {
                  set_number: ex.sets.length + 1,
                  reps_completed: ex.target_reps,
                  weight_used: ex.sets[ex.sets.length - 1]?.weight_used || null,
                  completed: false,
                },
              ],
            }
          : ex
      )
    );
  };

  const handleEndSession = useCallback(async () => {
    const supabase = createClient();
    const endTime = new Date().toISOString();

    // Save all completed sets
    const allSets = exercises.flatMap((ex) =>
      ex.sets
        .filter((s) => s.completed)
        .map((s) => ({
          session_id: params.id as string,
          exercise_id: ex.exercise_id,
          set_number: s.set_number,
          reps_completed: s.reps_completed,
          weight_used: s.weight_used,
        }))
    );

    if (allSets.length > 0) {
      await supabase.from("session_sets").insert(allSets);
    }

    // Update session end time
    await supabase
      .from("workout_sessions")
      .update({ ended_at: endTime })
      .eq("id", params.id);

    if (timerRef.current) clearInterval(timerRef.current);

    setSessionData({
      duration: elapsed,
      exercises,
      sessionId: params.id as string,
    });
    setShowStats(true);
    setShowEndConfirm(false);
  }, [exercises, elapsed, params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (showStats && sessionData) {
    return <SessionStats {...sessionData} onClose={() => router.push("/")} />;
  }

  const current = exercises[currentIndex];
  if (!current) return null;

  const completedSets = current.sets.filter((s) => s.completed).length;
  const totalCompletedAll = exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0);
  const totalSetsAll = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Top Bar */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <p className="text-xs text-subtext">Session Timer</p>
          <p className="text-xl font-mono font-bold text-primary">{formatDuration(elapsed)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-subtext">{totalCompletedAll}/{totalSetsAll} sets</p>
          <div className="w-24 h-1.5 bg-surface rounded-full mt-1">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
              style={{ width: `${totalSetsAll > 0 ? (totalCompletedAll / totalSetsAll) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Exercise Indicators */}
      <div className="flex gap-1.5 px-4 mb-3">
        {exercises.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i === currentIndex ? "bg-primary" : i < currentIndex ? "bg-accent/50" : "bg-border"
            }`}
          />
        ))}
      </div>

      {/* Exercise Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2 }}
          >
            {/* Video */}
            {current.exercise.youtube_url && (
              <div className="mb-4">
                <YouTubeEmbed url={current.exercise.youtube_url} />
              </div>
            )}

            {/* Exercise Info */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge>{current.exercise.muscle_group?.icon} {current.exercise.muscle_group?.name}</Badge>
                <span className="text-xs text-subtext">Exercise {currentIndex + 1} of {exercises.length}</span>
              </div>
              <h2 className="text-xl font-bold text-foreground">{current.exercise.name}</h2>
              <p className="text-xs text-subtext mt-1">Target: {current.target_sets} × {current.target_reps}</p>
            </div>

            {/* Sets */}
            <div className="space-y-2">
              <div className="grid grid-cols-[40px_1fr_1fr_48px] gap-2 px-2 text-xs text-subtext">
                <span>Set</span>
                <span>Reps</span>
                <span>Weight</span>
                <span className="text-center">Done</span>
              </div>
              {current.sets.map((set, si) => (
                <motion.div
                  key={si}
                  layout
                  className={`grid grid-cols-[40px_1fr_1fr_48px] gap-2 items-center p-2 rounded-xl transition-colors ${
                    set.completed ? "bg-success/10 border border-success/20" : "bg-card border border-border"
                  }`}
                >
                  <span className="text-sm font-medium text-subtext text-center">{set.set_number}</span>
                  <input
                    type="number"
                    value={set.reps_completed}
                    onChange={(e) => updateSet(currentIndex, si, "reps_completed", parseInt(e.target.value) || 0)}
                    className="px-2 py-2 text-center text-sm bg-surface border border-border rounded-lg text-foreground"
                    min={0}
                  />
                  <input
                    type="number"
                    value={set.weight_used ?? ""}
                    onChange={(e) => updateSet(currentIndex, si, "weight_used", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="—"
                    className="px-2 py-2 text-center text-sm bg-surface border border-border rounded-lg text-foreground placeholder:text-subtext/30"
                    min={0}
                    step={0.5}
                  />
                  <button
                    onClick={() => updateSet(currentIndex, si, "completed", !set.completed)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all ${
                      set.completed
                        ? "bg-success text-background"
                        : "bg-surface border border-border text-subtext"
                    }`}
                  >
                    {set.completed ? "✓" : ""}
                  </button>
                </motion.div>
              ))}
            </div>

            <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => addSet(currentIndex)}>
              + Add Set
            </Button>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Actions */}
      <div className="px-4 pb-6 pt-2 flex gap-3 safe-bottom">
        {currentIndex > 0 && (
          <Button variant="secondary" onClick={() => setCurrentIndex((p) => p - 1)} className="flex-1">
            ← Prev
          </Button>
        )}
        {currentIndex < exercises.length - 1 ? (
          <Button onClick={() => setCurrentIndex((p) => p + 1)} className="flex-1">
            Next →
          </Button>
        ) : (
          <Button onClick={() => setShowEndConfirm(true)} className="flex-1">
            End Session
          </Button>
        )}
      </div>

      {/* End Session Confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end">
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="w-full bg-surface border-t border-border rounded-t-3xl p-6"
          >
            <h3 className="text-lg font-semibold text-foreground mb-2">End Session?</h3>
            <p className="text-sm text-subtext mb-4">
              {completedSets} of {current.sets.length} sets completed on current exercise.
              {totalCompletedAll} total sets logged.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowEndConfirm(false)}>
                Keep Going
              </Button>
              <Button className="flex-1" onClick={handleEndSession}>
                End & View Stats
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
