"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { clearDraft } from "@/lib/session-draft";

interface InProgressSession {
  id: string;
  started_at: string;
  program_workout: { name: string } | null;
}

function StartSessionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inProgress, setInProgress] = useState<InProgressSession | null>(null);
  const [cancelling, setCancelling] = useState(false);
  // Store resolved user + phase so handleCancel can create the new session
  // directly without re-entering the effect (router.replace(same URL) is a no-op).
  const userIdRef   = useRef<string | null>(null);
  const phaseIdRef  = useRef<string | null>(null);

  useEffect(() => {
    async function startSession() {
      const workoutId  = searchParams.get("workout");
      const scheduleId = searchParams.get("schedule") || null;
      if (!workoutId) { router.push("/calendar"); return; }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      userIdRef.current = user.id;

      // Check for any open session (ended_at IS NULL)
      const { data: openSessions } = await supabase
        .from("workout_sessions")
        .select("id, started_at, program_workout_id, program_workout:program_workouts(name)")
        .eq("user_id", user.id)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1);

      const open = openSessions?.[0];

      if (open) {
        const ABANDON_THRESHOLD_MS = 4 * 60 * 60 * 1000;
        const sessionAge = Date.now() - new Date(open.started_at).getTime();

        if (sessionAge > ABANDON_THRESHOLD_MS) {
          // Abandoned >4h ago: DELETE the row rather than setting ended_at.
          // Every "completed workout" query in the app filters by
          // `ended_at IS NOT NULL`, so marking ended_at would inflate
          // session counts, calendar completion, and progress stats with
          // workouts the user never actually did. session_sets cascade.
          await supabase.from("workout_sessions").delete().eq("id", open.id);
          clearDraft(open.id);
          // fall through to create fresh session
        } else if (open.program_workout_id === workoutId) {
          router.replace(`/session/${open.id}`);
          return;
        } else {
          setInProgress({
            id: open.id,
            started_at: open.started_at,
            program_workout: Array.isArray(open.program_workout)
              ? open.program_workout[0]
              : open.program_workout,
          });
          return;
        }
      }

      // Resolve active phase id (cache for handleCancel use)
      const { data: phases } = await supabase
        .from("phases")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1);

      phaseIdRef.current = phases?.[0]?.id ?? null;

      const { data: session } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: user.id,
          program_workout_id: workoutId,
          phase_id: phaseIdRef.current,
          phase_schedule_id: scheduleId,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (session) {
        router.replace(`/session/${session.id}`);
      } else {
        router.push("/calendar");
      }
    }
    startSession();
  }, [router, searchParams]);

  const handleResume = () => {
    if (inProgress) router.replace(`/session/${inProgress.id}`);
  };

  const handleCancel = async () => {
    if (!inProgress) return;
    setCancelling(true);
    const supabase = createClient();

    // "Cancel" must truly cancel — DELETE the row (and its cascade of
    // session_sets), don't set ended_at. Every completion-oriented query
    // treats `ended_at IS NOT NULL` as "done", so marking it here would
    // make cancelled workouts pollute session counts, streaks, volume
    // stats, and the calendar. Also drop the local draft for this id.
    await supabase.from("workout_sessions").delete().eq("id", inProgress.id);
    clearDraft(inProgress.id);

    // Create the new session directly — do NOT rely on router.replace(same URL)
    // to re-trigger the effect, as Next.js App Router treats same-URL replaces
    // as no-ops and the effect will not re-run.
    const workoutId  = searchParams.get("workout");
    const scheduleId = searchParams.get("schedule") || null;

    if (!workoutId || !userIdRef.current) {
      router.push("/calendar");
      return;
    }

    // Resolve phase if not yet cached
    if (!phaseIdRef.current) {
      const { data: phases } = await supabase
        .from("phases")
        .select("id")
        .eq("user_id", userIdRef.current)
        .eq("is_active", true)
        .limit(1);
      phaseIdRef.current = phases?.[0]?.id ?? null;
    }

    const { data: session } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: userIdRef.current,
        program_workout_id: workoutId,
        phase_id: phaseIdRef.current,
        phase_schedule_id: scheduleId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (session) {
      router.replace(`/session/${session.id}`);
    } else {
      router.push("/calendar");
    }
  };

  // Compute "started Xm ago" once when the prompt appears. Wall-clock reads
  // during render violate React Compiler purity; pinning at discovery time
  // is also more honest — the prompt shouldn't tick as the user reads it.
  const startedAtMs = inProgress ? new Date(inProgress.started_at).getTime() : 0;
  const timeAgo = useMemo(() => {
    if (!inProgress) return "";
    const mins = Math.round((Date.now() - startedAtMs) / 60000);
    return mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
    // Intentionally keyed only on session id: we want a single snapshot per
    // discovered unfinished session, not a ticking clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inProgress?.id]);

  // Show resume/cancel prompt
  if (inProgress) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg p-6">
            <div className="w-12 h-12 rounded-xl bg-warning/15 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-warning">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">Unfinished Workout</h2>
            <p className="text-sm text-subtext mb-1">
              <span className="text-foreground font-medium">
                {inProgress.program_workout?.name ?? "A workout"}
              </span>{" "}
              was started {timeAgo} and never finished.
            </p>
            <p className="text-xs text-subtext/70 mb-6">Resume it to keep your progress, or cancel it and start fresh.</p>

            <div className="space-y-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleResume}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-accent text-background font-bold text-sm shadow-[0_4px_20px_rgba(56,189,248,0.3)]"
              >
                Resume Workout
              </motion.button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full py-3 rounded-xl border border-error/30 text-error text-sm font-medium disabled:opacity-50 transition-colors hover:bg-error/5"
              >
                {cancelling ? "Starting new workout..." : "Cancel & Start New"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-subtext text-sm">Starting workout...</p>
      </div>
    </div>
  );
}

export default function StartSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <StartSessionInner />
    </Suspense>
  );
}
