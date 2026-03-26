"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StartSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function startSession() {
      const workoutId = searchParams.get("workout");
      const scheduleDate = searchParams.get("date");
      if (!workoutId) {
        router.push("/calendar");
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Get active phase
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-subtext text-sm">Starting workout...</p>
      </div>
    </div>
  );
}
