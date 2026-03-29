"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatDuration, calculateVolume } from "@/lib/utils";
import { motion } from "framer-motion";
import { useWeightUnit } from "@/context/WeightUnitContext";

interface ExerciseState {
  exercise_id: string;
  exercise: { name: string; muscle_group?: { name: string; icon: string } };
  target_sets: number;
  target_reps: number;
  sets: { set_number: number; reps_completed: number; weight_used: number | null; completed: boolean }[];
}

interface SessionStatsProps {
  duration: number;
  exercises: ExerciseState[];
  sessionId: string;
  onClose: () => void;
}

export default function SessionStats({ duration, exercises, sessionId, onClose }: SessionStatsProps) {
  const { formatWeight, unitLabel } = useWeightUnit();
  const [previousSets, setPreviousSets] = useState<Map<string, { reps: number; weight: number }[]>>(new Map());
  const [prs, setPrs] = useState<{ exerciseName: string; type: string; value: string }[]>([]);

  useEffect(() => {
    async function loadComparison() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get previous session for same workout
      const { data: prevSessions } = await supabase
        .from("workout_sessions")
        .select("id")
        .eq("user_id", user.id)
        .neq("id", sessionId)
        .not("ended_at", "is", null)
        .order("ended_at", { ascending: false })
        .limit(1);

      if (prevSessions?.[0]) {
        const { data: prevSetData } = await supabase
          .from("session_sets")
          .select("exercise_id, reps_completed, weight_used")
          .eq("session_id", prevSessions[0].id);

        if (prevSetData) {
          const map = new Map<string, { reps: number; weight: number }[]>();
          for (const s of prevSetData) {
            if (!map.has(s.exercise_id)) map.set(s.exercise_id, []);
            map.get(s.exercise_id)!.push({ reps: s.reps_completed, weight: s.weight_used || 0 });
          }
          setPreviousSets(map);
        }
      }

      // Check for PRs (max weight per exercise across all sessions)
      const newPrs: typeof prs = [];
      for (const ex of exercises) {
        const completedSets = ex.sets.filter((s) => s.completed && s.weight_used);
        if (completedSets.length === 0) continue;

        const maxWeight = Math.max(...completedSets.map((s) => s.weight_used || 0));

        const { data: allTimeSets } = await supabase
          .from("session_sets")
          .select("weight_used")
          .eq("exercise_id", ex.exercise_id)
          .not("weight_used", "is", null)
          .order("weight_used", { ascending: false })
          .limit(1);

        const previousMax = allTimeSets?.[0]?.weight_used || 0;
        if (maxWeight > previousMax) {
          newPrs.push({
            exerciseName: ex.exercise.name,
            type: "Weight PR",
            value: `${formatWeight(maxWeight)} ${unitLabel}`,
          });
        }
      }
      setPrs(newPrs);
    }
    loadComparison();
  }, [exercises, sessionId]);

  const completedSets = exercises.flatMap((ex) => ex.sets.filter((s) => s.completed));
  const totalSets = completedSets.length;
  const totalReps = completedSets.reduce((sum, s) => sum + s.reps_completed, 0);
  const totalVolume = calculateVolume(completedSets);
  const totalExercises = exercises.filter((ex) => ex.sets.some((s) => s.completed)).length;

  // Muscle group breakdown
  const muscleBreakdown = new Map<string, number>();
  for (const ex of exercises) {
    const completed = ex.sets.filter((s) => s.completed).length;
    if (completed > 0) {
      const group = ex.exercise.muscle_group?.name || "Other";
      muscleBreakdown.set(group, (muscleBreakdown.get(group) || 0) + completed);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 pt-8 pb-8">
      {/* Confetti for PRs */}
      {prs.length > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center mb-6"
        >
          <span className="text-5xl">🎉</span>
          <h2 className="text-xl font-bold text-primary mt-2">New Personal Record!</h2>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-1">
          Workout Complete
        </h1>
        <p className="text-subtext text-sm">Great session!</p>
      </motion.div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: "Duration", value: formatDuration(duration), icon: "⏱" },
          { label: "Exercises", value: totalExercises.toString(), icon: "🏋️" },
          { label: "Total Sets", value: totalSets.toString(), icon: "📊" },
          { label: "Total Reps", value: totalReps.toString(), icon: "🔄" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg p-4 text-center"
          >
            <span className="text-2xl">{stat.icon}</span>
            <p className="text-xl font-bold text-foreground mt-1">{stat.value}</p>
            <p className="text-xs text-subtext">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Volume */}
      {totalVolume > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 p-4 mb-6 text-center"
        >
          <p className="text-xs text-subtext">Total Volume</p>
          <p className="text-2xl font-bold text-primary">{formatWeight(totalVolume).toLocaleString()} {unitLabel}</p>
        </motion.div>
      )}

      {/* PRs */}
      {prs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">Personal Records</h3>
          {prs.map((pr, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-warning/10 border border-warning/20 mb-2"
            >
              <span className="text-xl">🏆</span>
              <div>
                <p className="text-sm font-medium text-foreground">{pr.exerciseName}</p>
                <p className="text-xs text-warning">{pr.type}: {pr.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Muscle Group Breakdown */}
      {muscleBreakdown.size > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">Muscle Groups</h3>
          <div className="space-y-2">
            {Array.from(muscleBreakdown.entries()).map(([group, sets]) => {
              const maxSets = Math.max(...Array.from(muscleBreakdown.values()));
              return (
                <div key={group} className="flex items-center gap-3">
                  <span className="text-sm text-subtext w-20 truncate">{group}</span>
                  <div className="flex-1 h-6 bg-surface rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(sets / maxSets) * 100}%` }}
                      transition={{ delay: 0.8, duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-end px-2"
                    >
                      <span className="text-xs font-medium text-background">{sets}</span>
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Exercise Comparison */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-foreground mb-2">Exercise Details</h3>
        <div className="space-y-2">
          {exercises
            .filter((ex) => ex.sets.some((s) => s.completed))
            .map((ex) => {
              const completed = ex.sets.filter((s) => s.completed);
              const prev = previousSets.get(ex.exercise_id);
              const currentVolume = calculateVolume(completed);
              const prevVolume = prev ? calculateVolume(prev.map((s) => ({ reps_completed: s.reps, weight_used: s.weight }))) : 0;
              const volumeDiff = prevVolume > 0 ? currentVolume - prevVolume : 0;

              return (
                <div key={ex.exercise_id} className="p-3 rounded-xl bg-card border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{ex.exercise.name}</span>
                    <Badge variant={volumeDiff > 0 ? "success" : volumeDiff < 0 ? "error" : "default"}>
                      {volumeDiff > 0 ? `↑ ${formatWeight(volumeDiff)}${unitLabel}` : volumeDiff < 0 ? `↓ ${formatWeight(Math.abs(volumeDiff))}${unitLabel}` : "—"}
                    </Badge>
                  </div>
                  <p className="text-xs text-subtext">
                    {completed.length} sets · {completed.reduce((s, c) => s + c.reps_completed, 0)} reps
                    {currentVolume > 0 ? ` · ${formatWeight(currentVolume)}${unitLabel} vol` : ""}
                  </p>
                </div>
              );
            })}
        </div>
      </div>

      <Button size="lg" className="w-full" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}
