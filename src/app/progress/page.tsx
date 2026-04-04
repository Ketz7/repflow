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
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import { toLocalDate } from "@/lib/utils";

interface PersonalRecord {
  exercise_name: string;
  max_weight: number;
  date: string;
}

export default function ProgressPage() {
  const { formatWeight, unitLabel } = useWeightUnit();
  const [tab, setTab] = useState<"body" | "nutrition" | "history" | "records" | "volume">("body");
  const [weightLogs, setWeightLogs] = useState<BodyWeightLog[]>([]);
  const [sessions, setSessions] = useState<(WorkoutSession & { program_workout?: { name: string } })[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [volumeData, setVolumeData] = useState<{ date: string; rawDate: string; tonnage: number }[]>([]);
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

      // Volume: fetch sets for these sessions, compute daily tonnage
      if (sess && sess.length > 0) {
        const { data: sets } = await supabase
          .from("session_sets")
          .select("session_id, reps_completed, weight_used")
          .in("session_id", sess.map((s) => s.id))
          .not("weight_used", "is", null);

        if (sets) {
          const sessionDateMap = new Map(
            sess.map((s) => [s.id, toLocalDate(new Date(s.started_at))])
          );
          const tonnageByDate = new Map<string, number>();
          for (const set of sets) {
            const date = sessionDateMap.get(set.session_id);
            if (date && set.weight_used) {
              tonnageByDate.set(date, (tonnageByDate.get(date) || 0) + set.reps_completed * set.weight_used);
            }
          }
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 60);
          const sorted = Array.from(tonnageByDate.entries())
            .filter(([date]) => new Date(date) >= cutoff)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, tonnage]) => ({
              rawDate: date,
              date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              tonnage: Math.round(tonnage),
            }));
          setVolumeData(sorted);
        }
      }

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
      <div className="relative flex gap-1 p-1 bg-surface/80 backdrop-blur-sm border border-white/5 rounded-xl mb-5">
        {(["body", "nutrition", "history", "records", "volume"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative flex-1 py-2 text-sm font-medium rounded-lg transition-colors capitalize z-10"
          >
            {tab === t && (
              <motion.div
                layoutId="progress-tab"
                className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 rounded-lg"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className={`relative z-10 ${tab === t ? "text-primary" : "text-subtext"}`}>
              {t}
            </span>
          </button>
        ))}
      </div>

      {tab === "body" && (
        <div className="space-y-4">
          {weightLogs.length > 0 ? (
            <>
              {/* Weight chart (existing) */}
              <WeightChart data={weightLogs} />

              {/* Trend indicator */}
              {weightLogs.length >= 7 && (() => {
                const recent = weightLogs.slice(-7);
                const first = recent[0].weight ?? 0;
                const last = recent[recent.length - 1].weight ?? 0;
                const diff = last - first;
                const trend = diff < -0.2 ? "losing" : diff > 0.2 ? "gaining" : "maintaining";
                return (
                  <div className={`p-3 rounded-xl border ${
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
                      {formatWeight(Math.abs(diff))} {unitLabel} {trend === "losing" ? "lost" : trend === "gaining" ? "gained" : "change"} in last 7 entries
                    </p>
                  </div>
                );
              })()}

              {/* Fat % chart */}
              {weightLogs.some((l) => l.fat_percentage != null) && (() => {
                const compData = weightLogs
                  .filter((l) => l.fat_percentage != null || l.muscle_percentage != null)
                  .map((l) => ({
                    date: new Date(l.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    fat: l.fat_percentage ?? null,
                    muscle: l.muscle_percentage ?? null,
                  }));
                const fats = compData.map((d) => d.fat).filter((v): v is number => v != null);
                const muscles = compData.map((d) => d.muscle).filter((v): v is number => v != null);
                const allVals = [...fats, ...muscles];
                const minY = allVals.length ? Math.floor(Math.min(...allVals) - 2) : 0;
                const maxY = allVals.length ? Math.ceil(Math.max(...allVals) + 2) : 80;
                return (
                  <div className="rounded-2xl bg-card border border-border p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Body Composition (%)</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={compData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
                          <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={{ stroke: "#1E2D45" }} tickLine={false} />
                          <YAxis domain={[minY, maxY]} tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={{ stroke: "#1E2D45" }} tickLine={false} width={30} unit="%" />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#1A2540", border: "1px solid #1E2D45", borderRadius: "12px", fontSize: "12px", color: "#E2E8F0" }}
                            formatter={(v, name) => [`${v ?? ""}%`, name === "fat" ? "Fat %" : "Muscle %"]}
                          />
                          {fats.length > 0 && (
                            <Line type="monotone" dataKey="fat" stroke="#F87171" strokeWidth={2} dot={{ fill: "#F87171", r: 3 }} activeDot={{ r: 5 }} connectNulls />
                          )}
                          {muscles.length > 0 && (
                            <Line type="monotone" dataKey="muscle" stroke="#34D399" strokeWidth={2} dot={{ fill: "#34D399", r: 3 }} activeDot={{ r: 5 }} connectNulls />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-4 mt-2 justify-center">
                      {fats.length > 0 && <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-red-400 rounded-full" /><span className="text-xs text-subtext">Fat %</span></div>}
                      {muscles.length > 0 && <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-success rounded-full" /><span className="text-xs text-subtext">Muscle %</span></div>}
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="rounded-2xl bg-card border border-border p-8 text-center">
              <p className="text-subtext text-sm mb-2">No body data yet.</p>
              <p className="text-xs text-subtext/60">Log your weight and body composition from the Profile tab.</p>
            </div>
          )}
        </div>
      )}

      {tab === "nutrition" && (
        <div>
          {weightLogs.some((l) => l.steps || l.protein || l.carbs || l.fat) ? (
            <div className="space-y-3">
              {/* Steps chart */}
              {weightLogs.some((l) => l.steps != null) && (() => {
                const stepsData = weightLogs
                  .filter((l) => l.steps != null)
                  .map((l) => ({
                    date: new Date(l.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    steps: l.steps,
                  }));
                const allSteps = stepsData.map((d) => d.steps as number);
                const minY = Math.floor(Math.min(...allSteps) * 0.9 / 1000) * 1000;
                const maxY = Math.ceil(Math.max(...allSteps) * 1.1 / 1000) * 1000;
                return (
                  <div className="rounded-2xl bg-card border border-border p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Daily Steps</h3>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stepsData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
                          <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={{ stroke: "#1E2D45" }} tickLine={false} />
                          <YAxis domain={[minY, maxY]} tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={{ stroke: "#1E2D45" }} tickLine={false} width={42} tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#1A2540", border: "1px solid #1E2D45", borderRadius: "12px", fontSize: "12px", color: "#E2E8F0" }}
                            formatter={(v) => [Number(v).toLocaleString(), "Steps"]}
                          />
                          <Line type="monotone" dataKey="steps" stroke="#818CF8" strokeWidth={2} dot={{ fill: "#818CF8", r: 3 }} activeDot={{ r: 5 }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}

              {/* Recent daily summaries */}
              {[...weightLogs]
                .filter((l) => l.steps || l.protein || l.carbs || l.fat)
                .reverse()
                .slice(0, 14)
                .map((log, i) => {
                  const totalCal = Math.round(
                    ((log.protein || 0) * 4) + ((log.carbs || 0) * 4) + ((log.fat || 0) * 9)
                  );
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{formatDate(log.date)}</span>
                        {totalCal > 0 && (
                          <Badge variant="primary">{totalCal} kcal</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        {log.steps != null && (
                          <span className="text-subtext">
                            <span className="text-foreground font-medium">{log.steps.toLocaleString()}</span> steps
                          </span>
                        )}
                        {log.protein != null && (
                          <span className="text-subtext">
                            <span className="text-primary font-medium">{log.protein}g</span> P
                          </span>
                        )}
                        {log.carbs != null && (
                          <span className="text-subtext">
                            <span className="text-accent font-medium">{log.carbs}g</span> C
                          </span>
                        )}
                        {log.fat != null && (
                          <span className="text-subtext">
                            <span className="text-warning font-medium">{log.fat}g</span> F
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          ) : (
            <div className="rounded-2xl bg-card border border-border p-8 text-center">
              <p className="text-subtext text-sm mb-2">No nutrition data yet.</p>
              <p className="text-xs text-subtext/60">Log steps and macros from the Profile tab.</p>
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

      {tab === "volume" && (() => {
        if (volumeData.length === 0) {
          return (
            <div className="rounded-2xl bg-card border border-border p-8 text-center">
              <p className="text-subtext text-sm mb-2">No volume data yet.</p>
              <p className="text-xs text-subtext/60">Complete workouts with weights to see tonnage trends.</p>
            </div>
          );
        }

        // Weekly tonnage: this week vs last week
        const getWeekStart = (d: Date) => { const s = new Date(d); s.setDate(s.getDate() - s.getDay()); s.setHours(0,0,0,0); return s; };
        const thisWeekStart = getWeekStart(new Date());
        const lastWeekStart = getWeekStart(new Date(thisWeekStart.getTime() - 7 * 86400000));
        const thisWeekTonnage = volumeData.filter((d) => new Date(d.rawDate) >= thisWeekStart).reduce((a, d) => a + d.tonnage, 0);
        const lastWeekTonnage = volumeData.filter((d) => { const dt = new Date(d.rawDate); return dt >= lastWeekStart && dt < thisWeekStart; }).reduce((a, d) => a + d.tonnage, 0);
        const weekDiff = thisWeekTonnage - lastWeekTonnage;
        const maxTonnage = Math.max(...volumeData.map((d) => d.tonnage));

        return (
          <div className="space-y-4">
            {/* Weekly comparison */}
            {(thisWeekTonnage > 0 || lastWeekTonnage > 0) && (
              <div className="rounded-2xl bg-card border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Weekly Tonnage</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/5 p-3 text-center">
                    <p className="text-xs text-subtext mb-1">This Week</p>
                    <p className="text-lg font-bold text-primary">{(thisWeekTonnage / 1000).toFixed(1)}t</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3 text-center">
                    <p className="text-xs text-subtext mb-1">Last Week</p>
                    <p className="text-lg font-bold text-foreground">{(lastWeekTonnage / 1000).toFixed(1)}t</p>
                  </div>
                </div>
                {lastWeekTonnage > 0 && (
                  <div className={`mt-3 flex items-center gap-2 text-xs font-medium ${weekDiff > 0 ? "text-success" : weekDiff < 0 ? "text-error" : "text-subtext"}`}>
                    <span>{weekDiff > 0 ? "↑" : weekDiff < 0 ? "↓" : "→"}</span>
                    <span>{weekDiff > 0 ? "+" : ""}{Math.round(weekDiff).toLocaleString()} kg vs last week</span>
                  </div>
                )}
              </div>
            )}

            {/* Tonnage chart */}
            <div className="rounded-2xl bg-card border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Daily Tonnage (kg lifted)</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeData} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 9 }} axisLine={{ stroke: "#1E2D45" }} tickLine={false}
                      interval={Math.max(0, Math.ceil(volumeData.length / 8) - 1)}
                    />
                    <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={{ stroke: "#1E2D45" }} tickLine={false} width={42}
                      tickFormatter={(v) => v >= 1000 ? `${(Number(v) / 1000).toFixed(0)}t` : String(v)}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1A2540", border: "1px solid #1E2D45", borderRadius: "12px", fontSize: "12px", color: "#E2E8F0" }}
                      formatter={(v) => [`${Number(v).toLocaleString()} kg`, "Tonnage"]}
                    />
                    <Bar dataKey="tonnage" radius={[4, 4, 0, 0]}
                      fill="url(#tonnageGrad)"
                    />
                    <defs>
                      <linearGradient id="tonnageGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38BDF8" stopOpacity={1} />
                        <stop offset="100%" stopColor="#818CF8" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-subtext/60 mt-2 text-center">Peak: {maxTonnage.toLocaleString()} kg</p>
            </div>

            {/* Per-session breakdown */}
            <div className="rounded-2xl bg-card border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Recent Sessions</h3>
              <div className="space-y-2">
                {[...volumeData].reverse().slice(0, 10).map((d) => {
                  const pct = maxTonnage > 0 ? (d.tonnage / maxTonnage) * 100 : 0;
                  return (
                    <div key={d.rawDate} className="flex items-center gap-3">
                      <span className="text-xs text-subtext w-20 shrink-0">{d.date}</span>
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-foreground font-medium w-20 text-right">{d.tonnage.toLocaleString()} kg</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

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
