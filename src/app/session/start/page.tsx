"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";

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

  useEffect(() => {
    async function startSession() {
      const workoutId = searchParams.get("workout");
      const scheduleId = searchParams.get("schedule") || null;
      if (!workoutId) { router.push("/calendar"); return; }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Check for any open session (ended_at IS NULL) — for ANY workout, not just this one
      const { data: openSessions } = await supabase
        .from("workout_sessions")
        .select("id, started_at, program_workout_id, program_workout:program_workouts(name)")
        .eq("user_id", user.id)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1);

      const open = openSessions?.[0];

      if (open) {
        // Same workout? Silently resume. Different workout? Show the prompt.
        if (open.program_workout_id === workoutId) {
          router.replace(`/session/${open.id}`);
          return;
        }
        setInProgress({
          id: open.id,
          started_at: open.started_at,
          program_workout: Array.isArray(open.program_workout)
            ? open.program_workout[0]
            : open.program_workout,
        });
        return;
      }

      // No open session — create a fresh one
      const { data: phases } = await supabase
        .from("phases")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1);

      const { data: session } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: user.id,
          program_workout_id: workoutId,
          phase_id: phases?.[0]?.id || null,
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
    // Mark the old session as ended now so it doesn't linger
    await supabase
      .from("workout_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", inProgress.id);
    setInProgress(null);
    setCancelling(false);
    // Re-run the start flow by refreshing without the in-progress guard
    router.replace(window.location.pathname + window.location.search);
  };

  // Show resume/cancel prompt
  if (inProgress) {
    const startedMins = Math.round(
      (Date.now() - new Date(inProgress.started_at).getTime()) / 60000
    );
    const timeAgo = startedMins < 60
      ? `${startedMins}m ago`
      : `${Math.round(startedMins / 60)}h ago`;

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
                {cancelling ? "Cancelling..." : "Cancel & Start New"}
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
