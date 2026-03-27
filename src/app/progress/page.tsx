"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BodyWeightLog, WorkoutSession } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import WeightChart from "@/components/charts/WeightChart";
import { formatDuration, formatDate } from "@/lib/utils";
import { motion } from "framer-motion";
import { useWeightUnit } from "@/context/WeightUnitContext";

interface PersonalRecord {
  exercise_name: string;
  max_weight: number;
  date: string;
}

export default function ProgressPage() {
  const { formatWeight, unitLabel } = useWeightUnit();
  const [tab, setTab] = useState<"weight" | "history" | "records">("weight");
  const [weightLogs, setWeightLogs] = useState<BodyWeightLog[]>([]);
  const [sessions, setSessions] = useState<(WorkoutSession & { program_workout?: { name: string } })[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: weights }, { data: sess }, { data: prs }] = await Promise.all([
        supabase
          .from("body_weight_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: true }),
        supabase
          .from("workout_sessions")
          .select("*, program_workout:program_workouts(name)")
          .eq("user_id", user.id)
          .not("ended_at", "is", null)
          .order("ended_at", { ascending: false })
          .limit(50),
        Promise.resolve(supabase.rpc("get_personal_records", { p_user_id: user.id })).catch(() => ({ data: null as PersonalRecord[] | null })),
      ]);

      setWeightLogs(weights || []);
      setSessions(sess || []);

      // If RPC doesn't exist, compute PRs client-side
      if (prs) {
        setRecords(prs);
      } else {
        const { data: allSets } = await supabase
          .from("session_sets")
          .select("exercise_id, weight_used, created_at, exercise:exercises(name)")
          .in("session_id", (sess || []).map((s) => s.id))
          .not("weight_used", "is", null)
          .order("weight_used", { ascending: false });

        if (allSets) {
          const prMap = new Map<string, PersonalRecord>();
          for (const s of allSets) {
            const exName = (s.exercise as unknown as { name: string })?.name || "Unknown";
            if (!prMap.has(s.exercise_id) || (s.weight_used || 0) > prMap.get(s.exercise_id)!.max_weight) {
              prMap.set(s.exercise_id, {
                exercise_name: exName,
                max_weight: s.weight_used || 0,
                date: s.created_at,
              });
            }
          }
          setRecords(Array.from(prMap.values()).sort((a, b) => b.max_weight - a.max_weight));
        }
      }

      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="px-4 pt-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-card rounded-lg" />
          <div className="h-48 bg-card rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-foreground mb-4">Progress</h1>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface rounded-xl mb-5">
        {(["weight", "history", "records"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
              tab === t ? "bg-card text-foreground" : "text-subtext"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "weight" && (
        <div>
          {weightLogs.length > 0 ? (
            <>
              <WeightChart data={weightLogs} />
              {/* Trend indicator */}
              {weightLogs.length >= 7 && (() => {
                const recent = weightLogs.slice(-7);
                const first = recent[0].weight;
                const last = recent[recent.length - 1].weight;
                const diff = last - first;
                const trend = diff < -0.2 ? "losing" : diff > 0.2 ? "gaining" : "maintaining";
                return (
                  <div className={`mt-4 p-3 rounded-xl border ${
                    trend === "losing" ? "bg-success/10 border-success/20" :
                    trend === "gaining" ? "bg-warning/10 border-warning/20" :
                    "bg-card border-border"
                  }`}>
                    <p className="text-sm font-medium text-foreground">
                      {trend === "losing" ? "📉 Downward trend" :
                       trend === "gaining" ? "📈 Upward trend" :
                       "➡️ Maintaining"}
                    </p>
                    <p className="text-xs text-subtext mt-0.5">
                      {formatWeight(Math.abs(diff))} {unitLabel} {trend === "losing" ? "lost" : trend === "gaining" ? "gained" : "change"} in the last 7 entries
                    </p>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="rounded-2xl bg-card border border-border p-8 text-center">
              <p className="text-subtext text-sm mb-2">No weight data yet.</p>
              <p className="text-xs text-subtext/60">Log your weight from the Profile tab.</p>
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-2">
          {sessions.length > 0 ? (
            sessions.map((session, i) => {
              const duration = session.ended_at
                ? Math.floor((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000)
                : 0;
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-3 rounded-xl bg-card border border-border"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {session.program_workout?.name || "Workout"}
                    </span>
                    <span className="text-xs text-subtext">{formatDate(session.started_at)}</span>
                  </div>
                  <p className="text-xs text-subtext">{formatDuration(duration)}</p>
                </motion.div>
              );
            })
          ) : (
            <div className="rounded-2xl bg-card border border-border p-8 text-center">
              <p className="text-subtext text-sm">No completed workouts yet.</p>
            </div>
          )}
        </div>
      )}

      {tab === "records" && (
        <div className="space-y-2">
          {records.length > 0 ? (
            records.map((pr, i) => (
              <motion.div
                key={pr.exercise_name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
              >
                <span className="text-lg">🏆</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{pr.exercise_name}</p>
                  <p className="text-xs text-subtext">{formatDate(pr.date)}</p>
                </div>
                <Badge variant="primary">{formatWeight(pr.max_weight)} {unitLabel}</Badge>
              </motion.div>
            ))
          ) : (
            <div className="rounded-2xl bg-card border border-border p-8 text-center">
              <p className="text-subtext text-sm">No records yet. Start lifting!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
