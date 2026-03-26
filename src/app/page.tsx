import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="mb-8">
        <p className="text-subtext text-sm">Welcome back,</p>
        <h1 className="text-2xl font-bold text-foreground">
          {user?.user_metadata?.full_name?.split(" ")[0] || "Athlete"}
        </h1>
      </div>

      {/* Today's Workout Card */}
      <div className="rounded-2xl bg-card border border-border p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Today&apos;s Workout</h2>
          <span className="text-xs text-subtext px-2 py-1 rounded-full bg-surface">
            No phase active
          </span>
        </div>
        <p className="text-subtext text-sm mb-4">
          Create a phase to get started with your training program.
        </p>
        <button className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-background font-semibold text-sm transition-all duration-200 active:scale-[0.98]">
          Get Started
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-subtext text-xs mb-1">This Week</p>
          <p className="text-2xl font-bold text-foreground">0</p>
          <p className="text-subtext text-xs">sessions</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-subtext text-xs mb-1">Streak</p>
          <p className="text-2xl font-bold text-foreground">0</p>
          <p className="text-subtext text-xs">days</p>
        </div>
      </div>
    </div>
  );
}
