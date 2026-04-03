"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile, CoachProfile, CoachClient, MacroTarget } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { motion } from "framer-motion";
import Link from "next/link";
import { useWeightUnit } from "@/context/WeightUnitContext";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [weight, setWeight] = useState("");
  const [steps, setSteps] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fatPct, setFatPct] = useState("");
  const [musclePct, setMusclePct] = useState("");
  const [savingLog, setSavingLog] = useState(false);
  const [logSaved, setLogSaved] = useState(false);
  const [todayWeight, setTodayWeight] = useState<number | null>(null);
  const [todayFatPct, setTodayFatPct] = useState<number | null>(null);
  const [todayMusclePct, setTodayMusclePct] = useState<number | null>(null);
  const [todayLog, setTodayLog] = useState<{ steps: number | null; protein: number | null; carbs: number | null; fat: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null);
  const [coachRelationship, setCoachRelationship] = useState<CoachClient | null>(null);
  const [macroTarget, setMacroTarget] = useState<MacroTarget | null>(null);
  const [pendingCoachInvite, setPendingCoachInvite] = useState<(CoachClient & { coach_profile?: CoachProfile & { user?: UserProfile } }) | null>(null);
  const { unit, setUnit } = useWeightUnit();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(prof);

      // Check if weight already logged today
      const today = new Date().toISOString().split("T")[0];
      const { data: existingLog } = await supabase
        .from("body_weight_logs")
        .select("weight, steps, protein, carbs, fat, fat_percentage, muscle_percentage")
        .eq("user_id", user.id)
        .eq("date", today)
        .single();

      if (existingLog) {
        if (existingLog.weight) {
          setTodayWeight(existingLog.weight);
          setWeight(existingLog.weight.toString());
        }
        if (existingLog.steps) setSteps(existingLog.steps.toString());
        if (existingLog.protein) setProtein(existingLog.protein.toString());
        if (existingLog.carbs) setCarbs(existingLog.carbs.toString());
        if (existingLog.fat) setFat(existingLog.fat.toString());
        if (existingLog.fat_percentage) { setTodayFatPct(existingLog.fat_percentage); setFatPct(existingLog.fat_percentage.toString()); }
        if (existingLog.muscle_percentage) { setTodayMusclePct(existingLog.muscle_percentage); setMusclePct(existingLog.muscle_percentage.toString()); }
        setTodayLog({ steps: existingLog.steps, protein: existingLog.protein, carbs: existingLog.carbs, fat: existingLog.fat });
      }

      // Check if user is a coach
      const { data: coachData } = await supabase
        .from("coach_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (coachData) setCoachProfile(coachData);

      // Check if user has an active coach
      const { data: coaching } = await supabase
        .from("coach_clients")
        .select("*, coach_profile:coach_profiles(*, user:users(display_name, avatar_url))")
        .eq("client_id", user.id)
        .eq("status", "active")
        .limit(1)
        .single();
      if (coaching) {
        setCoachRelationship(coaching);

        // Load coach's macro targets for this user
        const { data: target } = await supabase
          .from("macro_targets")
          .select("*")
          .eq("coach_client_id", coaching.id)
          .lte("effective_date", today)
          .order("effective_date", { ascending: false })
          .limit(1)
          .single();
        if (target) setMacroTarget(target);
      }

      // Check for pending coach invites
      const { data: invite } = await supabase
        .from("coach_clients")
        .select("*, coach_profile:coach_profiles(*, user:users(display_name, avatar_url))")
        .eq("client_id", user.id)
        .eq("status", "pending")
        .eq("initiated_by", "coach")
        .limit(1)
        .single();
      if (invite) setPendingCoachInvite(invite);

      setLoading(false);
    }
    load();
  }, []);

  const handleLogDaily = async () => {
    if (!profile) return;
    const w = parseFloat(weight) || null;
    const s = parseInt(steps) || null;
    const p = parseFloat(protein) || null;
    const c = parseFloat(carbs) || null;
    const f = parseFloat(fat) || null;
    const fp = parseFloat(fatPct) || null;
    const mp = parseFloat(musclePct) || null;

    if (!w && !s && !p && !c && !f && !fp && !mp) return;

    setSavingLog(true);
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    await supabase.from("body_weight_logs").upsert(
      { user_id: profile.id, date: today, weight: w, steps: s, protein: p, carbs: c, fat: f, fat_percentage: fp, muscle_percentage: mp },
      { onConflict: "user_id,date" }
    );

    if (w) setTodayWeight(w);
    if (fp) setTodayFatPct(fp);
    if (mp) setTodayMusclePct(mp);
    setTodayLog({ steps: s, protein: p, carbs: c, fat: f });
    setLogSaved(true);
    setSavingLog(false);
    setTimeout(() => setLogSaved(false), 2000);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const adjustWeight = (delta: number) => {
    const current = parseFloat(weight) || 0;
    setWeight((current + delta).toFixed(1));
  };

  if (loading) {
    return (
      <div className="px-4 pt-6">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-card rounded-2xl" />
          <div className="h-40 bg-card rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-foreground mb-6">Profile</h1>

      {/* User Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg p-4 flex items-center gap-4 mb-6"
      >
        {profile?.avatar_url ? (
          <div className="p-0.5 rounded-full bg-gradient-to-br from-primary to-accent">
            <img
              src={profile.avatar_url}
              alt=""
              className="w-14 h-14 rounded-full border-2 border-background"
            />
          </div>
        ) : (
          <div className="p-0.5 rounded-full bg-gradient-to-br from-primary to-accent">
            <div className="w-14 h-14 rounded-full bg-background flex items-center justify-center text-xl text-primary font-bold">
              {profile?.display_name?.[0]?.toUpperCase() || "?"}
            </div>
          </div>
        )}
        <div className="flex-1">
          <p className="font-semibold text-foreground">{profile?.display_name}</p>
          <p className="text-xs text-subtext">{profile?.email}</p>
        </div>
        {profile?.is_admin && <Badge variant="warning">Admin</Badge>}
      </motion.div>

      {/* Weight Unit Toggle */}
      <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg p-4 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Weight Unit</h2>
        <div className="flex gap-2">
          {(["kg", "lbs"] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                unit === u
                  ? "bg-primary text-background"
                  : "bg-surface border border-border text-subtext"
              }`}
            >
              {u === "kg" ? "Kilograms (kg)" : "Pounds (lbs)"}
            </button>
          ))}
        </div>
      </div>

      {/* Daily Log */}
      <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg p-5 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Today&apos;s Log
        </h2>

        {/* Weight */}
        <div className="mb-4">
          <label className="text-xs text-subtext mb-1.5 block">
            Weight ({unit})
            {todayWeight && <span className="text-primary ml-1">(logged: {todayWeight})</span>}
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustWeight(-0.1)}
              className="w-10 h-10 rounded-xl bg-surface border border-border text-foreground flex items-center justify-center text-lg active:scale-95"
            >
              −
            </button>
            <Input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g., 75.5"
              className="text-center text-lg font-medium flex-1"
              step={0.1}
              min={0}
            />
            <button
              onClick={() => adjustWeight(0.1)}
              className="w-10 h-10 rounded-xl bg-surface border border-border text-foreground flex items-center justify-center text-lg active:scale-95"
            >
              +
            </button>
          </div>
        </div>

        {/* Body Composition */}
        <div className="mb-4">
          <label className="text-xs text-subtext mb-1.5 block">Body Composition (optional)</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-error/80 mb-1 block text-center">
                Fat %{todayFatPct ? <span className="text-primary ml-1">({todayFatPct}%)</span> : null}
              </label>
              <Input
                type="number"
                value={fatPct}
                onChange={(e) => setFatPct(e.target.value)}
                placeholder="e.g., 18"
                className="text-center"
                min={1}
                max={60}
                step={0.1}
              />
            </div>
            <div>
              <label className="text-[10px] text-success/80 mb-1 block text-center">
                Muscle %{todayMusclePct ? <span className="text-primary ml-1">({todayMusclePct}%)</span> : null}
              </label>
              <Input
                type="number"
                value={musclePct}
                onChange={(e) => setMusclePct(e.target.value)}
                placeholder="e.g., 42"
                className="text-center"
                min={1}
                max={80}
                step={0.1}
              />
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="mb-4">
          <label className="text-xs text-subtext mb-1.5 block">
            Steps
            {todayLog?.steps && <span className="text-primary ml-1">(logged: {todayLog.steps.toLocaleString()})</span>}
          </label>
          <Input
            type="number"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder="e.g., 8000"
            min={0}
            step={100}
          />
        </div>

        {/* Macros */}
        <div className="mb-4">
          <label className="text-xs text-subtext mb-2 block">Macros (g)</label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-primary/80 mb-1 block text-center">Protein</label>
              <Input
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="0"
                className="text-center"
                min={0}
              />
            </div>
            <div>
              <label className="text-[10px] text-accent/80 mb-1 block text-center">Carbs</label>
              <Input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="0"
                className="text-center"
                min={0}
              />
            </div>
            <div>
              <label className="text-[10px] text-warning/80 mb-1 block text-center">Fat</label>
              <Input
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="0"
                className="text-center"
                min={0}
              />
            </div>
          </div>
          {(protein || carbs || fat) && (
            <p className="text-xs text-subtext mt-2 text-center">
              Total: {Math.round(((parseFloat(protein) || 0) * 4) + ((parseFloat(carbs) || 0) * 4) + ((parseFloat(fat) || 0) * 9))} kcal
            </p>
          )}
          {macroTarget && (protein || carbs || fat) && (() => {
            const actualCal = ((parseFloat(protein) || 0) * 4) + ((parseFloat(carbs) || 0) * 4) + ((parseFloat(fat) || 0) * 9);
            const targetCal = (macroTarget.protein * 4) + (macroTarget.carbs * 4) + (macroTarget.fat * 9);
            const diff = actualCal - targetCal;
            const color = diff <= 0 ? "text-success" : diff <= 300 ? "text-warning" : "text-error";
            const bgColor = diff <= 0 ? "bg-success/10 border-success/20" : diff <= 300 ? "bg-warning/10 border-warning/20" : "bg-error/10 border-error/20";
            return (
              <div className={`mt-3 p-3 rounded-xl border ${bgColor}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-subtext">Coach Target</span>
                  <span className="text-xs font-medium text-foreground">{Math.round(targetCal)} kcal</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-subtext">Your Total</span>
                  <span className={`text-xs font-medium ${color}`}>{Math.round(actualCal)} kcal</span>
                </div>
                {diff > 0 && (
                  <p className={`text-xs mt-1 ${color}`}>
                    {Math.round(diff)} kcal over target
                  </p>
                )}
                {diff <= 0 && (
                  <p className="text-xs mt-1 text-success">On target</p>
                )}
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <span className="text-subtext">P: </span>
                    <span className={(parseFloat(protein) || 0) > macroTarget.protein ? "text-warning" : "text-success"}>
                      {parseFloat(protein) || 0}/{macroTarget.protein}g
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-subtext">C: </span>
                    <span className={(parseFloat(carbs) || 0) > macroTarget.carbs ? "text-warning" : "text-success"}>
                      {parseFloat(carbs) || 0}/{macroTarget.carbs}g
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-subtext">F: </span>
                    <span className={(parseFloat(fat) || 0) > macroTarget.fat ? "text-warning" : "text-success"}>
                      {parseFloat(fat) || 0}/{macroTarget.fat}g
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        <Button
          size="md"
          className="w-full"
          disabled={(!weight && !steps && !protein && !carbs && !fat && !fatPct && !musclePct) || savingLog}
          onClick={handleLogDaily}
        >
          {savingLog ? "Saving..." : logSaved ? "✓ Saved!" : "Save Daily Log"}
        </Button>
      </div>

      {/* Admin Panel Link */}
      {profile?.is_admin && (
        <Link href="/profile/admin">
          <div className="rounded-2xl bg-warning/10 border border-warning/20 p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Admin Panel</p>
              <p className="text-xs text-subtext">Review submissions, manage programs</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-warning">
              <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </div>
        </Link>
      )}

      {/* Coach Invite Banner */}
      {pendingCoachInvite && (
        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 mb-4">
          <p className="text-sm font-medium text-foreground mb-1">
            {pendingCoachInvite.coach_profile?.user?.display_name || "A coach"} wants to coach you
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={async () => {
                const supabase = createClient();
                await supabase.from("coach_clients").update({ status: "expired" }).eq("id", pendingCoachInvite.id);
                setPendingCoachInvite(null);
              }}
              className="flex-1 py-2 rounded-xl text-sm bg-surface border border-border text-subtext"
            >
              Decline
            </button>
            <button
              onClick={async () => {
                const supabase = createClient();
                await supabase.from("coach_clients").update({ status: "active", started_at: new Date().toISOString().split("T")[0] }).eq("id", pendingCoachInvite.id);
                setPendingCoachInvite(null);
                window.location.reload();
              }}
              className="flex-1 py-2 rounded-xl text-sm bg-primary text-background font-medium"
            >
              Accept
            </button>
          </div>
        </div>
      )}

      {/* Coaching Section */}
      <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Coaching</h3>
        <div className="space-y-2">
          {coachProfile?.status === "approved" && (
            <Link href="/coach/dashboard" className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl">
              <span className="text-sm font-medium text-primary">Coach Dashboard</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-primary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
          {!coachProfile && (
            <Link href="/coaches/apply" className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
              <span className="text-sm text-foreground">Become a Coach</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-subtext">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
          {coachProfile?.status === "pending" && (
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl">
              <span className="text-sm text-warning">Coach application under review</span>
            </div>
          )}
          <Link href="/coaches" className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
            <span className="text-sm text-foreground">Find a Coach</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-subtext">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Sign Out */}
      <Button variant="danger" className="w-full" onClick={handleSignOut}>
        Sign Out
      </Button>
    </div>
  );
}
