"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Program, ProgramWorkout, WorkoutExercise } from "@/types";
import Badge from "@/components/ui/Badge";
import YouTubeEmbed from "@/components/exercises/YouTubeEmbed";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { motion } from "framer-motion";

export default function ProgramDetailPage() {
  const params = useParams();
  const [program, setProgram] = useState<Program | null>(null);
  const [workouts, setWorkouts] = useState<(ProgramWorkout & { workout_exercises: (WorkoutExercise & { exercise: { name: string; muscle_group: { name: string; icon: string }; youtube_url: string | null } })[] })[]>([]);
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: prog } = await supabase
        .from("programs")
        .select("*")
        .eq("id", params.id)
        .single();

      const { data: wkts } = await supabase
        .from("program_workouts")
        .select("*, workout_exercises(*, exercise:exercises(name, youtube_url, muscle_group:muscle_groups(name, icon)))")
        .eq("program_id", params.id)
        .order("day_order");

      setProgram(prog);
      setWorkouts(wkts || []);
      if (wkts && wkts.length > 0) setExpandedWorkout(wkts[0].id);
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="px-4 pt-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-card rounded-lg" />
          <div className="h-40 bg-card rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="px-4 pt-6 text-center">
        <p className="text-subtext">Program not found.</p>
        <Link href="/programs"><Button variant="secondary" className="mt-4">Back to Programs</Button></Link>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <Link href="/programs" className="text-xs text-subtext hover:text-primary mb-2 inline-block">&larr; Back</Link>
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-foreground">{program.name}</h1>
        {program.is_public && <Badge variant="primary">Official</Badge>}
      </div>
      <p className="text-sm text-subtext mb-6">{program.description}</p>

      {/* Workouts Accordion */}
      <div className="space-y-3">
        {workouts.map((workout) => (
          <motion.div
            key={workout.id}
            layout
            className="rounded-2xl bg-card border border-border overflow-hidden"
          >
            <button
              onClick={() => setExpandedWorkout(expandedWorkout === workout.id ? null : workout.id)}
              className="w-full p-4 text-left flex items-center justify-between"
            >
              <div>
                <span className="text-xs text-subtext">Day {workout.day_order}</span>
                <h3 className="font-semibold text-foreground">{workout.name}</h3>
              </div>
              <span className="text-subtext text-sm">
                {workout.workout_exercises?.length || 0} exercises
                <span className="ml-2">{expandedWorkout === workout.id ? "▲" : "▼"}</span>
              </span>
            </button>

            {expandedWorkout === workout.id && workout.workout_exercises && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="px-4 pb-4 space-y-2"
              >
                {workout.workout_exercises
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((we) => (
                    <div key={we.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface">
                      <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center text-sm">
                        {we.exercise?.muscle_group?.icon || "💪"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {we.exercise?.name}
                        </p>
                        <p className="text-xs text-subtext">
                          {we.target_sets} sets × {we.target_reps} reps
                        </p>
                      </div>
                      {we.exercise?.youtube_url && (
                        <Badge variant="primary" className="shrink-0">▶</Badge>
                      )}
                    </div>
                  ))}
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
