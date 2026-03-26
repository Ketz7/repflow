import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get active phase
  const { data: phases } = user
    ? await supabase
        .from("phases")
        .select("*, phase_schedule:phase_schedule(*, program_workout:program_workouts(id, name))")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
    : { data: null };

  const activePhase = phases?.[0];
  const today = new Date().toISOString().split("T")[0];

  // Find today's workout from schedule
  const todayWorkout = activePhase?.phase_schedule?.find(
    (s: { scheduled_date: string }) => s.scheduled_date === today
  );

  // Get this week's session count
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const { count: weekSessions } = user
    ? await supabase
        .from("workout_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("ended_at", "is", null)
        .gte("started_at", startOfWeek.toISOString())
    : { count: 0 };

  // Calculate streak (consecutive days with completed sessions)
  const { data: recentSessions } = user
    ? await supabase
        .from("workout_sessions")
        .select("started_at")
        .eq("user_id", user.id)
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(30)
    : { data: null };

  let streak = 0;
  if (recentSessions && recentSessions.length > 0) {
    const sessionDates = new Set(
      recentSessions.map((s) => new Date(s.started_at).toISOString().split("T")[0])
    );
    const checkDate = new Date();
    // If no session today, start checking from yesterday
    if (!sessionDates.has(checkDate.toISOString().split("T")[0])) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (sessionDates.has(checkDate.toISOString().split("T")[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Athlete";

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="mb-8">
        <p className="text-subtext text-sm">Welcome back,</p>
        <h1 className="text-2xl font-bold text-foreground">{firstName}</h1>
      </div>

      {/* Today's Workout Card */}
      <div className="rounded-2xl bg-card border border-border p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Today&apos;s Workout</h2>
          {activePhase ? (
            <span className="text-xs text-primary px-2 py-1 rounded-full bg-primary/10">
              {activePhase.name}
            </span>
          ) : (
            <span className="text-xs text-subtext px-2 py-1 rounded-full bg-surface">
              No phase active
            </span>
          )}
        </div>

        {todayWorkout ? (
          <>
            <p className="text-foreground font-medium mb-1">
              {todayWorkout.program_workout?.name}
            </p>
            <p className="text-subtext text-sm mb-4">Ready when you are.</p>
            <Link href={`/session/start?workout=${todayWorkout.program_workout?.id}&date=${today}`}>
              <button className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-background font-semibold text-sm transition-all duration-200 active:scale-[0.98]">
                Start Workout
              </button>
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
              <button className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-background font-semibold text-sm transition-all duration-200 active:scale-[0.98]">
                Get Started
              </button>
            </Link>
          </>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-subtext text-xs mb-1">This Week</p>
          <p className="text-2xl font-bold text-foreground">{weekSessions || 0}</p>
          <p className="text-subtext text-xs">sessions</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-subtext text-xs mb-1">Streak</p>
          <p className="text-2xl font-bold text-foreground">{streak}</p>
          <p className="text-subtext text-xs">days</p>
        </div>
      </div>
    </div>
  );
}
