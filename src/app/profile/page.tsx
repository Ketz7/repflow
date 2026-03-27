"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types";
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
  const [savingWeight, setSavingWeight] = useState(false);
  const [weightSaved, setWeightSaved] = useState(false);
  const [todayWeight, setTodayWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
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
      const { data: todayLog } = await supabase
        .from("body_weight_logs")
        .select("weight")
        .eq("user_id", user.id)
        .eq("date", today)
        .single();

      if (todayLog) {
        setTodayWeight(todayLog.weight);
        setWeight(todayLog.weight.toString());
      }

      setLoading(false);
    }
    load();
  }, []);

  const handleLogWeight = async () => {
    const w = parseFloat(weight);
    if (!w || !profile) return;
    setSavingWeight(true);

    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    // Upsert (insert or update if exists)
    await supabase.from("body_weight_logs").upsert(
      { user_id: profile.id, date: today, weight: w },
      { onConflict: "user_id,date" }
    );

    setTodayWeight(w);
    setWeightSaved(true);
    setSavingWeight(false);
    setTimeout(() => setWeightSaved(false), 2000);
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
      <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-4 mb-6">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="w-14 h-14 rounded-full border-2 border-border"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center text-xl">
            {profile?.display_name?.[0]?.toUpperCase() || "?"}
          </div>
        )}
        <div className="flex-1">
          <p className="font-semibold text-foreground">{profile?.display_name}</p>
          <p className="text-xs text-subtext">{profile?.email}</p>
        </div>
        {profile?.is_admin && <Badge variant="warning">Admin</Badge>}
      </div>

      {/* Weight Unit Toggle */}
      <div className="rounded-2xl bg-card border border-border p-4 mb-4">
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

      {/* Quick Weight Log */}
      <div className="rounded-2xl bg-card border border-border p-5 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Log Today&apos;s Weight
          {todayWeight && <span className="text-subtext font-normal ml-2">(logged: {todayWeight} {unit})</span>}
        </h2>
        <div className="flex items-center gap-2 mb-3">
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
        <Button
          size="md"
          className="w-full"
          disabled={!weight || savingWeight}
          onClick={handleLogWeight}
        >
          {savingWeight ? "Saving..." : weightSaved ? "✓ Saved!" : "Log Weight"}
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
            <span className="text-subtext">→</span>
          </div>
        </Link>
      )}

      {/* Sign Out */}
      <Button variant="danger" className="w-full" onClick={handleSignOut}>
        Sign Out
      </Button>
    </div>
  );
}
