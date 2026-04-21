"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { invalidateCache } from "@/lib/query-cache";
import type { Program } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { motion } from "framer-motion";
import Link from "next/link";

interface ProgramsListData {
  userId: string | null;
  publicPrograms: Program[];
  myPrograms: Program[];
}

export default function ProgramsPage() {
  const [tab, setTab] = useState<"browse" | "mine">("browse");

  const { data, loading, refetch } = useCachedQuery<ProgramsListData>(
    "programs:list",
    async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const [{ data: pub }, { data: mine }] = await Promise.all([
        supabase
          .from("programs")
          .select("*, program_workouts(id, name, day_order)")
          .eq("is_public", true)
          .order("name"),
        user
          ? supabase
              .from("programs")
              .select("*, program_workouts(id, name, day_order)")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

      return {
        userId: user?.id || null,
        publicPrograms: (pub as Program[]) || [],
        myPrograms: (mine as Program[]) || [],
      };
    },
  );

  const userId = data?.userId ?? null;
  const publicPrograms = data?.publicPrograms ?? [];
  const myPrograms = data?.myPrograms ?? [];

  const handleClone = async (program: Program) => {
    if (!userId) return;
    const supabase = createClient();

    // Create cloned program
    const { data: cloned, error } = await supabase
      .from("programs")
      .insert({
        name: `${program.name} (Copy)`,
        description: program.description,
        user_id: userId,
        is_public: false,
      })
      .select()
      .single();

    if (error || !cloned) return;

    // Clone workouts and their exercises
    if (program.program_workouts) {
      for (const workout of program.program_workouts) {
        const { data: clonedWorkout } = await supabase
          .from("program_workouts")
          .insert({
            program_id: cloned.id,
            name: workout.name,
            day_order: workout.day_order,
          })
          .select()
          .single();

        if (clonedWorkout) {
          const { data: exercises } = await supabase
            .from("workout_exercises")
            .select("*")
            .eq("program_workout_id", workout.id);

          if (exercises && exercises.length > 0) {
            await supabase.from("workout_exercises").insert(
              exercises.map((ex) => ({
                program_workout_id: clonedWorkout.id,
                exercise_id: ex.exercise_id,
                target_sets: ex.target_sets,
                target_reps: ex.target_reps,
                sort_order: ex.sort_order,
              }))
            );
          }
        }
      }
    }

    invalidateCache("programs:");
    await refetch();
    setTab("mine");
  };

  const handleDelete = async (programId: string) => {
    const supabase = createClient();
    await supabase.from("programs").delete().eq("id", programId);
    invalidateCache("programs:");
    await refetch();
  };

  if (loading) {
    return (
      <div className="px-4 pt-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-card rounded-lg" />
          <div className="h-10 bg-card rounded-xl" />
          <div className="h-40 bg-card rounded-2xl" />
        </div>
      </div>
    );
  }

  const programs = tab === "browse" ? publicPrograms : myPrograms;

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground">Programs</h1>
        <Link href="/programs/new">
          <Button size="sm">+ Create</Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="relative flex gap-1 p-1 bg-surface/80 backdrop-blur-sm border border-white/5 rounded-xl mb-5">
        {(["browse", "mine"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative flex-1 py-2 text-sm font-medium rounded-lg transition-colors z-10"
          >
            {tab === t && (
              <motion.div
                layoutId="programs-tab"
                className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 rounded-lg"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className={`relative z-10 ${tab === t ? "text-primary" : "text-subtext"}`}>
              {t === "browse" ? "Browse" : "My Programs"}
            </span>
          </button>
        ))}
      </div>

      {/* Program List */}
      <div className="space-y-3">
        {programs.map((program, i) => (
          <motion.div
            key={program.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-foreground">{program.name}</h3>
                <p className="text-xs text-subtext mt-0.5 line-clamp-2">{program.description}</p>
              </div>
              {program.is_public && <Badge variant="primary">Official</Badge>}
            </div>

            {/* Workout list */}
            {program.program_workouts && program.program_workouts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 mb-3">
                {program.program_workouts
                  .sort((a, b) => a.day_order - b.day_order)
                  .map((w) => (
                    <span key={w.id} className="px-2 py-1 text-xs bg-surface rounded-lg text-subtext">
                      {w.name}
                    </span>
                  ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              <Link href={`/programs/${program.id}`} className="flex-1">
                <Button variant="secondary" size="sm" className="w-full">
                  View
                </Button>
              </Link>
              {tab === "browse" ? (
                <Button variant="secondary" size="sm" onClick={() => handleClone(program)}>
                  Clone
                </Button>
              ) : (
                <>
                  <Link href={`/programs/${program.id}/edit`}>
                    <Button variant="secondary" size="sm">Edit</Button>
                  </Link>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(program.id)}>
                    Delete
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        ))}
        {programs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-subtext text-sm mb-4">
              {tab === "browse" ? "No programs available yet." : "You haven't created any programs yet."}
            </p>
            {tab === "mine" && (
              <Link href="/programs/new">
                <Button>Create Your First Program</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
