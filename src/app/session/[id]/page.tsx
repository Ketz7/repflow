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
import { useWeightUnit } from "@/context/WeightUnitContext";
import { enqueueOfflineSession, drainOfflineQueue, hasPendingOfflineSessions } from "@/lib/offline-queue";
import {
  autoregulationPrescription,
  detectPRs,
  type SetLog,
  type PRRecord,
  type AutoregulationResult,
} from "@/lib/training-analytics";
import AutoregHint from "@/components/session/AutoregHint";
import PRCelebrationModal from "@/components/session/PRCelebrationModal";
import {
  loadDraft,
  saveDraft,
  clearDraft,
  mergeDraftSets,
  purgeStaleDrafts,
} from "@/lib/session-draft";

interface SetEntry {
  set_number: number;
  reps_completed: number;
  weight_used: number | null;
  completed: boolean;
  rpe: number | null;
}

interface ExerciseState {
  exercise_id: string;
  exercise: Exercise & { muscle_group?: { name: string; icon: string } };
  target_sets: number;
  target_reps: number;
  alternatives: string[];
  sets: SetEntry[];
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const { unit, setUnit, unitLabel } = useWeightUnit();
  const KG_TO_LBS = 2.20462;
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
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapExercises, setSwapExercises] = useState<(Exercise & { muscle_group?: { name: string; icon: string } })[]>([]);
  const [alternativeExercises, setAlternativeExercises] = useState<(Exercise & { muscle_group?: { name: string; icon: string } })[]>([]);
  const [swapSearch, setSwapSearch] = useState("");
  const [restTimer, setRestTimer] = useState<{ active: boolean; seconds: number }>({ active: false, seconds: 120 });
  const [isOffline, setIsOffline] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [history, setHistory] = useState<SetLog[]>([]);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [pendingPRs, setPendingPRs] = useState<PRRecord[] | null>(null);
  const [showPRModal, setShowPRModal] = useState(false);
  const [pendingStatsData, setPendingStatsData] = useState<{
    duration: number;
    exercises: ExerciseState[];
    sessionId: string;
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Initialized to 0; the mount effect below immediately sets it to Date.now()
  // before any consumer reads it. This keeps render pure (React Compiler).
  const startTimeRef = useRef<number>(0);
  useEffect(() => {
    // Reset synchronously before the async fetch so the timer never shows a
    // stale value from a previous session (Next.js reuses this component across
    // /session/[id] navigations — refs survive without an explicit reset).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    startTimeRef.current = Date.now();

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
        const fromTemplate: ExerciseState[] = workoutExercises.map((we: WorkoutExercise & { exercise: Exercise & { muscle_group?: { name: string; icon: string } }; alternatives?: string[] }) => ({
          exercise_id: we.exercise_id,
          exercise: we.exercise,
          target_sets: we.target_sets,
          target_reps: we.target_reps,
          alternatives: we.alternatives || [],
          sets: Array.from({ length: we.target_sets }, (_, i) => ({
            set_number: i + 1,
            reps_completed: we.target_reps,
            weight_used: null,
            completed: false,
            rpe: null,
          })),
        }));

        // Restore any in-progress draft (survives tab eviction, backgrounding,
        // and route remounts). Draft is the user's work — it wins the merge.
        const draft = loadDraft(params.id as string);
        const merged = draft ? mergeDraftSets(fromTemplate, draft) : fromTemplate;
        setExercises(merged);
        if (draft) {
          setCurrentIndex(Math.min(draft.currentIndex, merged.length - 1));
          setRestTimer(draft.restTimer);
        }

        // Fetch 90-day history for these exercises so we can show autoreg hints.
        // Batched into a single query — per-exercise computation happens client-side.
        const exerciseIds = workoutExercises
          .map((we: WorkoutExercise) => we.exercise_id)
          .filter(Boolean);

        if (exerciseIds.length > 0 && session.user_id) {
          const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString();
          // RLS on session_sets is ownership-scoped via session_id. To stay within
          // policy and avoid a cross-user leak, scope by the user's own sessions.
          const { data: userSessions } = await supabase
            .from("workout_sessions")
            .select("id, started_at")
            .eq("user_id", session.user_id)
            .gte("started_at", ninetyDaysAgo);

          const sessionIds = (userSessions ?? []).map((s) => s.id);
          const sessionStartedAtById = new Map<string, string>(
            (userSessions ?? []).map((s) => [s.id, s.started_at as string]),
          );

          if (sessionIds.length > 0) {
            const { data: rawSets } = await supabase
              .from("session_sets")
              .select(
                "session_id, exercise_id, set_number, reps_completed, weight_used, rpe, created_at, exercise:exercises(name, muscle_group:muscle_groups(id, name))",
              )
              .in("session_id", sessionIds)
              .in("exercise_id", exerciseIds)
              .gte("created_at", ninetyDaysAgo);

            type RawSet = {
              session_id: string;
              exercise_id: string;
              set_number: number;
              reps_completed: number;
              weight_used: number | null;
              rpe: number | null;
              created_at: string;
              exercise?: {
                name?: string;
                muscle_group?: { id?: string; name?: string } | null;
              } | null;
            };

            const mapped: SetLog[] = (rawSets as RawSet[] | null ?? []).map((r) => {
              const startedAt = sessionStartedAtById.get(r.session_id) ?? r.created_at;
              return {
                session_id: r.session_id,
                exercise_id: r.exercise_id,
                exercise_name: r.exercise?.name ?? "",
                muscle_group_name: r.exercise?.muscle_group?.name ?? "",
                muscle_group_id: r.exercise?.muscle_group?.id ?? "",
                set_number: r.set_number,
                reps_completed: r.reps_completed,
                weight_used: r.weight_used,
                rpe: r.rpe,
                created_at: r.created_at,
                session_date: startedAt.slice(0, 10),
              };
            });
            setHistory(mapped);
          }
        }
      }

      startTimeRef.current = new Date(session.started_at).getTime();
      setSessionStartedAt(session.started_at as string);
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

  // Offline detection + queue drain on reconnect
  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = async () => {
      setIsOffline(false);
      const synced = await drainOfflineQueue();
      if (synced > 0) setSavedOffline(false);
    };
    // Syncing from external browser state (navigator.onLine) on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOffline(!navigator.onLine);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    // Drain any leftover queue from previous sessions on mount
    hasPendingOfflineSessions().then((has) => {
      if (has && navigator.onLine) drainOfflineQueue();
    });
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    if (restTimer.active) {
      restTimerRef.current = setInterval(() => {
        setRestTimer((prev) => {
          if (prev.seconds <= 1) {
            clearInterval(restTimerRef.current!);
            return { active: false, seconds: 120 };
          }
          return { ...prev, seconds: prev.seconds - 1 };
        });
      }, 1000);
    } else {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    }
    return () => { if (restTimerRef.current) clearInterval(restTimerRef.current); };
  }, [restTimer.active]);

  // ── Draft persistence ───────────────────────────────────────────────────
  // Save after every meaningful state change. localStorage writes are
  // synchronous and take microseconds for the <5KB payload — no debounce
  // needed, and no debounce means no race with `pagehide`.
  useEffect(() => {
    if (loading || exercises.length === 0) return;
    saveDraft(params.id as string, {
      currentIndex,
      restTimer,
      exercises: exercises.map((ex) => ({
        exercise_id: ex.exercise_id,
        sets: ex.sets,
      })),
    });
  }, [exercises, currentIndex, restTimer, loading, params.id]);

  // Flush synchronously when the tab is hidden or the page is being put
  // into bfcache / terminated. `pagehide` is the reliable mobile signal;
  // `visibilitychange` covers the tab-switch / home-screen case on desktop
  // and some Android builds. Both call the same cheap localStorage write.
  useEffect(() => {
    if (loading || exercises.length === 0) return;
    const flush = () => {
      saveDraft(params.id as string, {
        currentIndex,
        restTimer,
        exercises: exercises.map((ex) => ({
          exercise_id: ex.exercise_id,
          sets: ex.sets,
        })),
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [exercises, currentIndex, restTimer, loading, params.id]);

  // Garbage-collect drafts from long-abandoned sessions once per mount.
  useEffect(() => {
    purgeStaleDrafts();
  }, []);

  const updateSet = (exerciseIdx: number, setIdx: number, field: keyof SetEntry, value: number | boolean | null) => {
    // Trigger rest timer only when marking a set as done (false → true)
    if (field === "completed" && value === true) {
      setRestTimer({ active: true, seconds: 120 });
    }
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
                  rpe: null,
                },
              ],
            }
          : ex
      )
    );
  };

  const removeSet = (exerciseIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, ei) =>
        ei === exerciseIdx && ex.sets.length > 1
          ? { ...ex, sets: ex.sets.slice(0, -1) }
          : ex
      )
    );
  };

  const openSwapModal = async () => {
    const supabase = createClient();
    const currentAlternativeIds = exercises[currentIndex]?.alternatives || [];

    const { data } = await supabase
      .from("exercises")
      .select("*, muscle_group:muscle_groups(name, icon)")
      .eq("is_approved", true)
      .order("name");

    const allExercises = data || [];
    setSwapExercises(allExercises);

    // Filter alternatives from the full list
    if (currentAlternativeIds.length > 0) {
      const alts = allExercises.filter((e) => currentAlternativeIds.includes(e.id));
      setAlternativeExercises(alts);
    } else {
      setAlternativeExercises([]);
    }

    setSwapSearch("");
    setShowSwapModal(true);
  };

  const handleSwapExercise = (newExercise: Exercise & { muscle_group?: { name: string; icon: string } }) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === currentIndex
          ? {
              ...ex,
              exercise_id: newExercise.id,
              exercise: newExercise,
              sets: ex.sets.map((s) => ({ ...s, completed: false, weight_used: null })),
            }
          : ex
      )
    );
    setShowSwapModal(false);
  };

  const handleEndSession = useCallback(async () => {
    const endTime = new Date().toISOString();
    const sessionId = params.id as string;

    const allSets = exercises.flatMap((ex) =>
      ex.sets
        .filter((s) => s.completed)
        .map((s) => ({
          session_id: sessionId,
          exercise_id: ex.exercise_id,
          set_number: s.set_number,
          reps_completed: s.reps_completed,
          weight_used: s.weight_used,
          rpe: s.rpe ?? null,
        }))
    );

    if (!navigator.onLine) {
      // Save to IndexedDB and show offline confirmation
      await enqueueOfflineSession({ sessionId, endedAt: endTime, sets: allSets });
      // Draft's job is done — IDB queue now owns this data until it syncs.
      clearDraft(sessionId);
      // Register background sync so the SW can retry when the device wakes
      if ("serviceWorker" in navigator && "SyncManager" in window) {
        const reg = await navigator.serviceWorker.ready;
        await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync
          .register("repflow-session-sync").catch(() => null);
      }
      setSavedOffline(true);
      if (timerRef.current) clearInterval(timerRef.current);
      setSessionData({ duration: elapsed, exercises, sessionId });
      setShowStats(true);
      setShowEndConfirm(false);
      return;
    }

    const supabase = createClient();

    // ── ended_at MUST be written first and unconditionally ──────────────────
    // Sets are secondary data. If their insert fails for any reason (schema
    // mismatch, RLS, network hiccup), the session is still marked complete and
    // will not appear as "unfinished" next time the user opens the app.
    const { error: sessionError } = await supabase
      .from("workout_sessions")
      .update({ ended_at: endTime })
      .eq("id", sessionId);

    if (sessionError) {
      console.error("[session] failed to write ended_at:", sessionError.message);
      // Even on failure, clear the UI so the user isn't stuck
    }

    // Best-effort sets insert — errors are logged but don't block completion
    if (allSets.length > 0) {
      const { error: setsError } = await supabase.from("session_sets").insert(allSets);
      if (setsError) {
        console.error("[session] sets insert failed (data may be partial):", setsError.message);
      }
    }

    // Session is committed server-side — the local draft is redundant now.
    clearDraft(sessionId);

    if (timerRef.current) clearInterval(timerRef.current);

    // PR detection — best effort, never blocks completion.
    let prsToShow: PRRecord[] = [];
    try {
      if (sessionStartedAt) {
        const trainedExerciseIds = Array.from(
          new Set(
            exercises
              .filter((ex) => ex.sets.some((s) => s.completed))
              .map((ex) => ex.exercise_id),
          ),
        );

        if (trainedExerciseIds.length > 0) {
          // Look back 180d max, or since the user's first tracked session.
          const windowStart = new Date(Date.now() - 180 * 86_400_000).toISOString();
          const { data: userSessions } = await supabase
            .from("workout_sessions")
            .select("id, started_at, user_id")
            .gte("started_at", windowStart);

          const sessionIds = (userSessions ?? []).map((s) => s.id);
          const sessionStartedAtById = new Map<string, string>(
            (userSessions ?? []).map((s) => [s.id, s.started_at as string]),
          );

          if (sessionIds.length > 0) {
            const { data: rawSets } = await supabase
              .from("session_sets")
              .select(
                "session_id, exercise_id, set_number, reps_completed, weight_used, rpe, created_at, exercise:exercises(name, muscle_group:muscle_groups(id, name))",
              )
              .in("session_id", sessionIds)
              .in("exercise_id", trainedExerciseIds)
              .lte("created_at", endTime);

            type RawSet = {
              session_id: string;
              exercise_id: string;
              set_number: number;
              reps_completed: number;
              weight_used: number | null;
              rpe: number | null;
              created_at: string;
              exercise?: {
                name?: string;
                muscle_group?: { id?: string; name?: string } | null;
              } | null;
            };

            const fullHistory: SetLog[] = (rawSets as RawSet[] | null ?? []).map(
              (r) => {
                const startedAt = sessionStartedAtById.get(r.session_id) ?? r.created_at;
                return {
                  session_id: r.session_id,
                  exercise_id: r.exercise_id,
                  exercise_name: r.exercise?.name ?? "",
                  muscle_group_name: r.exercise?.muscle_group?.name ?? "",
                  muscle_group_id: r.exercise?.muscle_group?.id ?? "",
                  set_number: r.set_number,
                  reps_completed: r.reps_completed,
                  weight_used: r.weight_used,
                  rpe: r.rpe,
                  created_at: r.created_at,
                  session_date: startedAt.slice(0, 10),
                };
              },
            );

            // Supplement freshly-inserted sets (server round-trip can lag) with
            // what we just logged locally, so PRs land even on the same-day boundary.
            const localFresh: SetLog[] = exercises.flatMap((ex) =>
              ex.sets
                .filter((s) => s.completed)
                .map((s) => ({
                  session_id: sessionId,
                  exercise_id: ex.exercise_id,
                  exercise_name: ex.exercise.name,
                  muscle_group_name: ex.exercise.muscle_group?.name ?? "",
                  muscle_group_id: "",
                  set_number: s.set_number,
                  reps_completed: s.reps_completed,
                  weight_used: s.weight_used,
                  rpe: s.rpe,
                  created_at: endTime,
                  session_date: sessionStartedAt.slice(0, 10),
                })),
            );
            // Dedupe by session_id+set_number+exercise_id — prefer DB copy if present.
            const seen = new Set(
              fullHistory.map((s) => `${s.session_id}|${s.exercise_id}|${s.set_number}`),
            );
            for (const s of localFresh) {
              const key = `${s.session_id}|${s.exercise_id}|${s.set_number}`;
              if (!seen.has(key)) fullHistory.push(s);
            }

            const sessionStartDate = sessionStartedAt.slice(0, 10);
            prsToShow = detectPRs(fullHistory, sessionStartDate);
          }
        }
      }
    } catch (err) {
      console.error("[session] PR detection failed:", err);
      prsToShow = [];
    }

    const statsData = { duration: elapsed, exercises, sessionId };

    if (prsToShow.length > 0) {
      setPendingPRs(prsToShow);
      setPendingStatsData(statsData);
      setShowPRModal(true);
      setShowEndConfirm(false);
      return;
    }

    setSessionData(statsData);
    setShowStats(true);
    setShowEndConfirm(false);
  }, [exercises, elapsed, params.id, sessionStartedAt]);

  const dismissPRModal = useCallback(() => {
    setShowPRModal(false);
    if (pendingStatsData) {
      setSessionData(pendingStatsData);
      setShowStats(true);
      setPendingStatsData(null);
    }
    setPendingPRs(null);
  }, [pendingStatsData]);

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

  const autoreg: AutoregulationResult = history.length > 0
    ? autoregulationPrescription(history, current.exercise_id, 8, unit)
    : {};

  const completedSets = current.sets.filter((s) => s.completed).length;
  const totalCompletedAll = exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0);
  const totalSetsAll = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden">
      {/* Offline banner */}
      {isOffline && (
        <div className="bg-warning/15 border-b border-warning/30 px-4 py-1.5 flex items-center gap-2 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
          <p className="text-xs text-warning font-medium">Offline — workout will sync when reconnected</p>
        </div>
      )}
      {savedOffline && (
        <div className="bg-success/15 border-b border-success/30 px-4 py-1.5 shrink-0">
          <p className="text-xs text-success font-medium">Saved locally — will sync automatically when online</p>
        </div>
      )}

      {/* Top Bar */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
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
      <div className="flex gap-1.5 px-4 mb-3 shrink-0">
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

      {/* Exercise Content — fills remaining space, no outer scroll */}
      <div className="flex-1 min-h-0 px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2 }}
            className="h-full flex flex-col min-h-0"
          >
            {/* Video */}
            {current.exercise.youtube_url && (
              <div className="mb-3 shrink-0">
                <YouTubeEmbed url={current.exercise.youtube_url} />
              </div>
            )}

            {/* Exercise Info */}
            <div className="mb-3 shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge>{current.exercise.muscle_group?.icon} {current.exercise.muscle_group?.name}</Badge>
                <span className="text-xs text-subtext">Exercise {currentIndex + 1} of {exercises.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground flex-1">{current.exercise.name}</h2>
                <button
                  onClick={openSwapModal}
                  className="p-2 rounded-lg bg-surface border border-border text-subtext hover:text-primary transition-colors"
                  title="Swap exercise"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-subtext mt-1">Target: {current.target_sets} × {current.target_reps}</p>
            </div>

            {/* Sets — header fixed, rows scroll if overflow */}
            <div className="flex flex-col min-h-0 flex-1">
              {(autoreg.last || autoreg.suggested) && (
                <AutoregHint
                  last={autoreg.last ?? null}
                  suggested={autoreg.suggested ?? null}
                  unit={unit}
                />
              )}
              <div className="grid grid-cols-[32px_1fr_1fr_44px] gap-2 px-2 text-xs text-subtext mb-1 shrink-0">
                <span className="text-center">Set</span>
                <span className="text-center">Reps</span>
                <span className="text-center flex items-center justify-center gap-1">
                  Weight
                  <button
                    onClick={() => setUnit(unit === "kg" ? "lbs" : "kg")}
                    className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/15 border border-primary/30 text-primary text-[10px] font-semibold leading-none hover:bg-primary/25 transition-colors"
                  >
                    {unitLabel}
                  </button>
                </span>
                <span className="text-center">Done</span>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pb-1">
                {current.sets.map((set, si) => (
                  <motion.div
                    key={si}
                    layout
                    className={`rounded-xl transition-colors overflow-hidden ${
                      set.completed ? "bg-success/10 border border-success/20" : "bg-card border border-border"
                    }`}
                  >
                    <div className="grid grid-cols-[32px_1fr_1fr_44px] gap-2 items-center px-2 py-2">
                      <span className="text-sm font-medium text-subtext text-center">{set.set_number}</span>
                      <input
                        type="number"
                        value={set.reps_completed}
                        onChange={(e) => updateSet(currentIndex, si, "reps_completed", parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-2 text-center text-sm bg-surface border border-border rounded-lg text-foreground"
                        min={0}
                      />
                      <input
                        type="number"
                        value={
                          set.weight_used === null
                            ? ""
                            : unit === "lbs"
                            ? parseFloat((set.weight_used * KG_TO_LBS).toFixed(1))
                            : set.weight_used
                        }
                        onChange={(e) => {
                          const raw = e.target.value ? parseFloat(e.target.value) : null;
                          const kg = raw === null ? null : unit === "lbs" ? raw / KG_TO_LBS : raw;
                          updateSet(currentIndex, si, "weight_used", kg);
                        }}
                        placeholder="—"
                        className="w-full px-2 py-2 text-center text-sm bg-surface border border-border rounded-lg text-foreground placeholder:text-subtext/30"
                        min={0}
                        step={unit === "lbs" ? 1 : 0.5}
                      />
                      <motion.button
                        onClick={() => updateSet(currentIndex, si, "completed", !set.completed)}
                        whileTap={{ scale: 0.85 }}
                        animate={set.completed ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all ${
                          set.completed
                            ? "bg-success text-background shadow-[0_0_12px_rgba(52,211,153,0.4)]"
                            : "bg-surface border border-border text-subtext"
                        }`}
                      >
                        {set.completed ? "✓" : ""}
                      </motion.button>
                    </div>
                    {/* RPE picker — shown only when set is completed */}
                    <AnimatePresence>
                      {set.completed && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="px-2 pb-2 overflow-hidden"
                        >
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-subtext shrink-0">RPE</span>
                            <div className="flex gap-0.5 flex-1">
                              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                                <button
                                  key={n}
                                  onClick={() => updateSet(currentIndex, si, "rpe", set.rpe === n ? null : n)}
                                  className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${
                                    set.rpe === n
                                      ? n >= 8 ? "bg-error/80 text-white" : n >= 6 ? "bg-warning/80 text-background" : "bg-success/80 text-background"
                                      : "bg-surface text-subtext border border-border"
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Add / Remove Set */}
            <div className="flex gap-2 mt-2 shrink-0">
              {current.sets.length > 1 && (
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => removeSet(currentIndex)}>
                  − Remove Set
                </Button>
              )}
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => addSet(currentIndex)}>
                + Add Set
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Actions */}
      <div className="px-4 pb-6 pt-2 flex gap-3 safe-bottom shrink-0">
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
            className="w-full bg-surface/70 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.4)] rounded-t-3xl p-6"
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

      {/* Rest Timer Popup — draggable, stays within viewport */}
      <AnimatePresence>
        {restTimer.active && (
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.15}
            dragConstraints={{ top: -window.innerHeight + 200, bottom: 0, left: -window.innerWidth + 160, right: 0 }}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            whileDrag={{ scale: 1.05, boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}
            className="fixed bottom-24 right-4 z-40 bg-surface/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col items-center gap-2 w-36 cursor-grab active:cursor-grabbing touch-none"
          >
            <div className="flex items-center justify-between w-full">
              <p className="text-[10px] font-medium text-subtext uppercase tracking-wider">Rest</p>
              <span className="text-subtext/60 text-xs select-none" aria-hidden="true">⋮⋮</span>
            </div>
            {/* Circular countdown ring */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" strokeWidth="3" className="text-border" />
                <circle
                  cx="32" cy="32" r="27" fill="none" stroke="currentColor" strokeWidth="3"
                  className="text-primary transition-all duration-1000 ease-linear"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 27}`}
                  strokeDashoffset={`${2 * Math.PI * 27 * (1 - restTimer.seconds / 120)}`}
                />
              </svg>
              <span className="text-lg font-mono font-bold text-foreground">{restTimer.seconds}s</span>
            </div>
            <div className="flex gap-1.5 w-full">
              <button
                onClick={() => setRestTimer((p) => ({ ...p, seconds: p.seconds + 30 }))}
                className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
              >
                +30s
              </button>
              <button
                onClick={() => setRestTimer({ active: false, seconds: 120 })}
                className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-surface border border-border text-subtext hover:text-foreground transition-colors"
              >
                Skip
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PR Celebration Modal */}
      <PRCelebrationModal
        prs={pendingPRs ?? []}
        open={showPRModal && (pendingPRs?.length ?? 0) > 0}
        onClose={dismissPRModal}
        unit={unit}
      />

      {/* Exercise Swap Modal */}
      {showSwapModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end">
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-h-[80vh] bg-surface/90 backdrop-blur-xl border-t border-white/10 rounded-t-3xl flex flex-col"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Swap Exercise</h3>
              <button onClick={() => setShowSwapModal(false)} className="text-subtext hover:text-foreground p-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-4 pt-3 pb-2">
              <input
                type="text"
                placeholder="Search exercises..."
                value={swapSearch}
                onChange={(e) => setSwapSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-subtext/50"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-6">
              {/* Suggested Alternatives Section */}
              {alternativeExercises.length > 0 && !swapSearch && (
                <div className="mb-5">
                  <p className="text-xs font-medium text-accent uppercase tracking-wider mb-2">Suggested Alternatives</p>
                  <div className="space-y-1">
                    {alternativeExercises.map((ex) => (
                      <button
                        key={ex.id}
                        onClick={() => handleSwapExercise(ex)}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors bg-accent/10 border border-accent/20 text-foreground hover:bg-accent/20"
                      >
                        {ex.muscle_group?.icon} {ex.name}
                        <span className="text-xs text-accent ml-2">recommended</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 border-t border-border" />
                </div>
              )}

              {/* All Exercises Grouped by Muscle */}
              {Object.entries(
                swapExercises
                  .filter((e) => e.name.toLowerCase().includes(swapSearch.toLowerCase()))
                  .reduce((groups, ex) => {
                    const group = ex.muscle_group?.name || "Other";
                    if (!groups[group]) groups[group] = [];
                    groups[group].push(ex);
                    return groups;
                  }, {} as Record<string, typeof swapExercises>)
              ).map(([group, exs]) => (
                <div key={group} className="mb-4">
                  <p className="text-xs font-medium text-subtext uppercase tracking-wider mb-2">{group}</p>
                  <div className="space-y-1">
                    {exs.map((ex) => (
                      <button
                        key={ex.id}
                        onClick={() => handleSwapExercise(ex)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                          ex.id === current.exercise_id
                            ? "bg-primary/15 text-primary border border-primary/20"
                            : "text-foreground hover:bg-card"
                        }`}
                      >
                        {ex.muscle_group?.icon} {ex.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
