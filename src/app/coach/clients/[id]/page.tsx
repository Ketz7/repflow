"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CoachClient, MacroTarget, CoachProgramAssignment, BodyWeightLog, WorkoutSession, Program } from "@/types";
import Button from "@/components/ui/Button";
import WeightChart from "@/components/charts/WeightChart";
import { motion } from "framer-motion";
import { useWeightUnit } from "@/context/WeightUnitContext";

type Tab = "overview" | "macros" | "program" | "activity" | "settings";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { unitLabel } = useWeightUnit();
  const [tab, setTab] = useState<Tab>("overview");
  const [client, setClient] = useState<CoachClient | null>(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [weightLogs, setWeightLogs] = useState<BodyWeightLog[]>([]);
  const [macroTarget, setMacroTarget] = useState<MacroTarget | null>(null);
  const [macroHistory, setMacroHistory] = useState<MacroTarget[]>([]);
  const [assignment, setAssignment] = useState<(CoachProgramAssignment & { program?: Program }) | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [coachPrograms, setCoachPrograms] = useState<{ id: string; name: string }[]>([]);

  // Edit states
  const [editProtein, setEditProtein] = useState("");
  const [editCarbs, setEditCarbs] = useState("");
  const [editFat, setEditFat] = useState("");
  const [savingMacros, setSavingMacros] = useState(false);
  const [editExpiry, setEditExpiry] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Program assignment
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("");
  const [assigningProgram, setAssigningProgram] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load client relationship
    const { data: clientData } = await supabase
      .from("coach_clients")
      .select("*, client:users(id, display_name, avatar_url, email)")
      .eq("id", params.id)
      .single();

    if (!clientData) { router.push("/coach/dashboard"); return; }
    setClient(clientData);
    setEditExpiry(clientData.expires_at || "");
    setEditPrice(clientData.price?.toString() || "");
    setEditNotes(clientData.notes || "");

    const clientId = clientData.client_id;
    const today = new Date().toISOString().split("T")[0];

    // Weight logs (last 30 days)
    const { data: logs } = await supabase
      .from("body_weight_logs")
      .select("*")
      .eq("user_id", clientId)
      .order("date", { ascending: false })
      .limit(30);
    setWeightLogs((logs || []).reverse());

    // Current macro target
    const { data: target } = await supabase
      .from("macro_targets")
      .select("*")
      .eq("coach_client_id", clientData.id)
      .lte("effective_date", today)
      .order("effective_date", { ascending: false })
      .limit(1)
      .single();
    if (target) {
      setMacroTarget(target);
      setEditProtein(target.protein.toString());
      setEditCarbs(target.carbs.toString());
      setEditFat(target.fat.toString());
    }

    // Macro target history
    const { data: history } = await supabase
      .from("macro_targets")
      .select("*")
      .eq("coach_client_id", clientData.id)
      .order("effective_date", { ascending: false });
    setMacroHistory(history || []);

    // Current program assignment
    const { data: prog } = await supabase
      .from("coach_program_assignments")
      .select("*, program:programs(id, name, description)")
      .eq("coach_client_id", clientData.id)
      .eq("status", "active")
      .limit(1)
      .single();
    setAssignment(prog);

    // Recent sessions
    const { data: sess } = await supabase
      .from("workout_sessions")
      .select("*, program_workout:program_workouts(name)")
      .eq("user_id", clientId)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(20);
    setSessions(sess || []);

    // Coach's own programs (for assignment)
    const { data: myPrograms } = await supabase
      .from("programs")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name");
    setCoachPrograms(myPrograms || []);

    setLoading(false);
  }, [params.id, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveMacros = async () => {
    if (!client || !editProtein || !editCarbs || !editFat) return;
    setSavingMacros(true);
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    await supabase.from("macro_targets").insert({
      coach_client_id: client.id,
      protein: parseFloat(editProtein),
      carbs: parseFloat(editCarbs),
      fat: parseFloat(editFat),
      effective_date: today,
    });

    setSavingMacros(false);
    loadData();
  };

  const handleAssignProgram = async () => {
    if (!client || !selectedProgramId) return;
    setAssigningProgram(true);
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    // End current assignment if exists
    if (assignment) {
      await supabase
        .from("coach_program_assignments")
        .update({ status: "swapped", ended_at: today })
        .eq("id", assignment.id);
    }

    await supabase.from("coach_program_assignments").insert({
      coach_client_id: client.id,
      program_id: selectedProgramId,
      duration_weeks: durationWeeks ? parseInt(durationWeeks) : null,
      started_at: today,
    });

    setAssigningProgram(false);
    setSelectedProgramId("");
    setDurationWeeks("");
    loadData();
  };

  const handleSaveSettings = async () => {
    if (!client) return;
    setSavingSettings(true);
    const supabase = createClient();

    await supabase
      .from("coach_clients")
      .update({
        expires_at: editExpiry || null,
        price: editPrice ? parseFloat(editPrice) : null,
        notes: editNotes || null,
      })
      .eq("id", client.id);

    setSavingSettings(false);
    loadData();
  };

  const handleDisconnect = async () => {
    if (!client || !confirm("Disconnect this client? This will end the coaching relationship.")) return;
    const supabase = createClient();
    await supabase.from("coach_clients").update({ status: "expired" }).eq("id", client.id);
    router.push("/coach/dashboard");
  };

  const formatDurationShort = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  if (loading || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "macros", label: "Macros" },
    { key: "program", label: "Program" },
    { key: "activity", label: "Activity" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-8 pb-4">
        <button onClick={() => router.push("/coach/dashboard")} className="text-xs text-subtext mb-3 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden">
            {client.client?.avatar_url ? (
              <img src={client.client.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg text-primary">{client.client?.display_name?.[0]?.toUpperCase() || "?"}</span>
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">{client.client?.display_name}</h1>
            <p className="text-xs text-subtext">{client.client?.email}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 mb-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? "bg-primary/15 text-primary" : "text-subtext hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4">
        {/* Overview Tab */}
        {tab === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {weightLogs.length > 0 && (
              <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Weight Trend</h3>
                <WeightChart data={weightLogs} />
              </div>
            )}
            {assignment && (
              <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-1">Current Program</h3>
                <p className="text-foreground/70 text-sm">{assignment.program?.name}</p>
                {assignment.duration_weeks && (
                  <p className="text-xs text-subtext mt-1">
                    Week {Math.min(
                      Math.ceil((Date.now() - new Date(assignment.started_at).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1,
                      assignment.duration_weeks
                    )} of {assignment.duration_weeks}
                  </p>
                )}
              </div>
            )}
            {macroTarget && (
              <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Macro Targets</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary">{macroTarget.protein}g</p>
                    <p className="text-xs text-subtext">Protein</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-accent">{macroTarget.carbs}g</p>
                    <p className="text-xs text-subtext">Carbs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-warning">{macroTarget.fat}g</p>
                    <p className="text-xs text-subtext">Fat</p>
                  </div>
                </div>
                <p className="text-xs text-subtext text-center mt-2">
                  {Math.round(macroTarget.protein * 4 + macroTarget.carbs * 4 + macroTarget.fat * 9)} kcal/day
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Macros Tab */}
        {tab === "macros" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Set Macro Targets</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-xs text-subtext block mb-1">Protein (g)</label>
                  <input type="number" value={editProtein} onChange={(e) => setEditProtein(e.target.value)}
                    className="w-full px-2 py-2 text-center text-sm bg-card border border-border rounded-lg text-foreground" />
                </div>
                <div>
                  <label className="text-xs text-subtext block mb-1">Carbs (g)</label>
                  <input type="number" value={editCarbs} onChange={(e) => setEditCarbs(e.target.value)}
                    className="w-full px-2 py-2 text-center text-sm bg-card border border-border rounded-lg text-foreground" />
                </div>
                <div>
                  <label className="text-xs text-subtext block mb-1">Fat (g)</label>
                  <input type="number" value={editFat} onChange={(e) => setEditFat(e.target.value)}
                    className="w-full px-2 py-2 text-center text-sm bg-card border border-border rounded-lg text-foreground" />
                </div>
              </div>
              {editProtein && editCarbs && editFat && (
                <p className="text-xs text-subtext text-center mb-3">
                  = {Math.round(parseFloat(editProtein || "0") * 4 + parseFloat(editCarbs || "0") * 4 + parseFloat(editFat || "0") * 9)} kcal/day
                </p>
              )}
              <Button size="sm" className="w-full" onClick={handleSaveMacros} disabled={savingMacros}>
                {savingMacros ? "Saving..." : "Save Targets"}
              </Button>
            </div>

            {/* Recent Logs vs Targets */}
            <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Recent Daily Logs</h3>
              <div className="space-y-2">
                {weightLogs.filter((l) => l.protein != null || l.carbs != null || l.fat != null).slice(-14).reverse().map((log) => {
                  const actual = ((log.protein || 0) * 4) + ((log.carbs || 0) * 4) + ((log.fat || 0) * 9);
                  const targetCal = macroTarget ? (macroTarget.protein * 4 + macroTarget.carbs * 4 + macroTarget.fat * 9) : null;
                  const diff = targetCal ? actual - targetCal : null;
                  return (
                    <div key={log.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                      <span className="text-subtext">{new Date(log.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      <span className="text-foreground/70">{log.protein || 0}P / {log.carbs || 0}C / {log.fat || 0}F</span>
                      <span className={
                        diff === null ? "text-foreground" :
                        diff <= 0 ? "text-success" :
                        diff <= 300 ? "text-warning" : "text-error"
                      }>
                        {Math.round(actual)} kcal
                      </span>
                    </div>
                  );
                })}
                {weightLogs.filter((l) => l.protein != null).length === 0 && (
                  <p className="text-xs text-subtext/60 text-center py-4">No nutrition logs yet</p>
                )}
              </div>
            </div>

            {/* Target History */}
            {macroHistory.length > 1 && (
              <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Target History</h3>
                {macroHistory.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-subtext">{new Date(t.effective_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    <span className="text-foreground/70">{t.protein}P / {t.carbs}C / {t.fat}F</span>
                    <span className="text-subtext">{Math.round(t.protein * 4 + t.carbs * 4 + t.fat * 9)} kcal</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Program Tab */}
        {tab === "program" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {assignment && (
              <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Current Program</h3>
                <p className="text-foreground/70 text-sm">{assignment.program?.name}</p>
                <div className="flex gap-4 mt-2 text-xs text-subtext">
                  <span>Started: {new Date(assignment.started_at).toLocaleDateString()}</span>
                  {assignment.duration_weeks && <span>Duration: {assignment.duration_weeks} weeks</span>}
                  {!assignment.duration_weeks && <span>Open-ended</span>}
                </div>
              </div>
            )}

            <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Assign Program</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-subtext block mb-1">Program</label>
                  <select
                    value={selectedProgramId}
                    onChange={(e) => setSelectedProgramId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-xl text-foreground"
                  >
                    <option value="">Select a program...</option>
                    {coachPrograms.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-subtext block mb-1">Duration (weeks, leave empty for open-ended)</label>
                  <input
                    type="number"
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(e.target.value)}
                    placeholder="e.g. 8"
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-subtext/50"
                  />
                </div>
                <Button size="sm" className="w-full" onClick={handleAssignProgram} disabled={!selectedProgramId || assigningProgram}>
                  {assigningProgram ? "Assigning..." : assignment ? "Swap Program" : "Assign Program"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Activity Tab */}
        {tab === "activity" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="space-y-2">
              {sessions.map((s) => {
                const duration = s.ended_at ? Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000) : 0;
                return (
                  <div key={s.id} className="bg-white/[0.05] border border-white/10 rounded-2xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.program_workout?.name || "Workout"}</p>
                        <p className="text-xs text-subtext">
                          {new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {formatDurationShort(duration)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {sessions.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-subtext text-sm">No workout sessions yet</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Settings Tab */}
        {tab === "settings" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Subscription</h3>
              <div>
                <label className="text-xs text-subtext block mb-1">Expires at</label>
                <input type="date" value={editExpiry} onChange={(e) => setEditExpiry(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-card border border-border rounded-xl text-foreground" />
              </div>
              <div>
                <label className="text-xs text-subtext block mb-1">Price ($)</label>
                <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-card border border-border rounded-xl text-foreground" />
              </div>
              <div>
                <label className="text-xs text-subtext block mb-1">Private Notes</label>
                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3}
                  className="w-full px-3 py-2 text-sm bg-card border border-border rounded-xl text-foreground resize-none" />
              </div>
              <Button size="sm" className="w-full" onClick={handleSaveSettings} disabled={savingSettings}>
                {savingSettings ? "Saving..." : "Save Settings"}
              </Button>
            </div>

            <button
              onClick={handleDisconnect}
              className="w-full p-3 rounded-xl border border-error/30 text-error text-sm font-medium hover:bg-error/10 transition-colors"
            >
              Disconnect Client
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
