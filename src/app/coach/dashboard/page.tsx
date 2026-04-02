"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { CoachClient, CoachProfile, MacroTarget, CoachProgramAssignment } from "@/types";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { motion } from "framer-motion";

interface ClientCardData extends CoachClient {
  todayLog: { protein: number | null; carbs: number | null; fat: number | null; steps: number | null } | null;
  todaySession: boolean;
  currentMacroTarget: MacroTarget | null;
  currentAssignment: (CoachProgramAssignment & { program?: { name: string } }) | null;
}

export default function CoachDashboardPage() {
  const router = useRouter();
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null);
  const [clients, setClients] = useState<ClientCardData[]>([]);
  const [pendingRequests, setPendingRequests] = useState<CoachClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [showAddClient, setShowAddClient] = useState(false);
  const [addingClient, setAddingClient] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("coach_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!profile || profile.status !== "approved") {
        router.push("/profile");
        return;
      }
      setCoachProfile(profile);

      // Load all client relationships
      const { data: allClients } = await supabase
        .from("coach_clients")
        .select("*, client:users(id, display_name, avatar_url, email)")
        .eq("coach_id", profile.id)
        .order("created_at", { ascending: false });

      const active = (allClients || []).filter((c) => c.status === "active");
      const pending = (allClients || []).filter((c) => c.status === "pending");
      setPendingRequests(pending);

      const today = new Date().toISOString().split("T")[0];

      // Enrich active clients with today's data
      const enriched: ClientCardData[] = await Promise.all(
        active.map(async (client) => {
          const { data: log } = await supabase
            .from("body_weight_logs")
            .select("protein, carbs, fat, steps")
            .eq("user_id", client.client_id)
            .eq("date", today)
            .single();

          const { count } = await supabase
            .from("workout_sessions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", client.client_id)
            .gte("started_at", `${today}T00:00:00`)
            .not("ended_at", "is", null);

          const { data: target } = await supabase
            .from("macro_targets")
            .select("*")
            .eq("coach_client_id", client.id)
            .lte("effective_date", today)
            .order("effective_date", { ascending: false })
            .limit(1)
            .single();

          const { data: assignment } = await supabase
            .from("coach_program_assignments")
            .select("*, program:programs(name)")
            .eq("coach_client_id", client.id)
            .eq("status", "active")
            .limit(1)
            .single();

          return {
            ...client,
            todayLog: log || null,
            todaySession: (count || 0) > 0,
            currentMacroTarget: target || null,
            currentAssignment: assignment || null,
          };
        })
      );

      setClients(enriched);
      setLoading(false);
    }
    load();
  }, [router]);

  const handleAcceptClient = async (clientRelId: string) => {
    const supabase = createClient();
    await supabase
      .from("coach_clients")
      .update({ status: "active", started_at: new Date().toISOString().split("T")[0] })
      .eq("id", clientRelId);
    window.location.reload();
  };

  const handleDeclineClient = async (clientRelId: string) => {
    const supabase = createClient();
    await supabase
      .from("coach_clients")
      .update({ status: "expired" })
      .eq("id", clientRelId);
    setPendingRequests((prev) => prev.filter((r) => r.id !== clientRelId));
  };

  const handleAddClient = async () => {
    if (!searchEmail.trim() || !coachProfile) return;
    setAddingClient(true);

    const supabase = createClient();
    const { data: targetUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", searchEmail.trim())
      .single();

    if (!targetUser) {
      alert("User not found with that email.");
      setAddingClient(false);
      return;
    }

    await supabase.from("coach_clients").insert({
      coach_id: coachProfile.id,
      client_id: targetUser.id,
      initiated_by: "coach",
    });

    setAddingClient(false);
    setShowAddClient(false);
    setSearchEmail("");
    window.location.reload();
  };

  const getCalories = (log: ClientCardData["todayLog"], target: MacroTarget | null) => {
    if (!log || (log.protein == null && log.carbs == null && log.fat == null)) return null;
    const actual = ((log.protein || 0) * 4) + ((log.carbs || 0) * 4) + ((log.fat || 0) * 9);
    const targetCal = target ? (target.protein * 4 + target.carbs * 4 + target.fat * 9) : null;
    return { actual, target: targetCal };
  };

  const getCalorieColor = (actual: number, target: number | null) => {
    if (!target) return "text-foreground";
    const diff = actual - target;
    if (diff <= 0) return "text-success";
    if (diff <= 300) return "text-warning";
    return "text-error";
  };

  const getBarColor = (actual: number, target: number | null) => {
    if (!target) return "bg-primary";
    const diff = actual - target;
    if (diff <= 0) return "bg-success";
    if (diff <= 300) return "bg-warning";
    return "bg-error";
  };

  const getDaysUntilExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 pt-8 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Clients</h1>
          <p className="text-sm text-subtext">{clients.length} active · {pendingRequests.length} pending</p>
        </div>
        <Button size="sm" onClick={() => setShowAddClient(!showAddClient)}>
          + Add Client
        </Button>
      </div>

      {/* Add Client Form */}
      {showAddClient && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mb-4 bg-card border border-border rounded-2xl p-4">
          <p className="text-sm text-foreground mb-2">Invite by email</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="client@email.com"
              className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-xl text-foreground placeholder:text-subtext/50"
            />
            <Button size="sm" onClick={handleAddClient} disabled={addingClient}>
              {addingClient ? "..." : "Invite"}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">Pending Requests</h2>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div key={req.id} className="bg-warning/5 border border-warning/20 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-warning/15 flex items-center justify-center">
                    <span className="text-xs text-warning font-medium">
                      {req.client?.display_name?.[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{req.client?.display_name}</p>
                    <p className="text-xs text-subtext">{req.initiated_by === "client" ? "Requested you" : "Invite sent"}</p>
                  </div>
                </div>
                {req.initiated_by === "client" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleDeclineClient(req.id)} className="px-3 py-1.5 text-xs rounded-lg bg-surface border border-border text-subtext">
                      Decline
                    </button>
                    <button onClick={() => handleAcceptClient(req.id)} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-background font-medium">
                      Accept
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Clients */}
      <div className="space-y-3">
        {clients.map((client, i) => {
          const cals = getCalories(client.todayLog, client.currentMacroTarget);
          const daysLeft = getDaysUntilExpiry(client.expires_at);

          return (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/coach/clients/${client.id}`}>
                <div className="bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${
                        daysLeft !== null && daysLeft <= 0 ? "bg-error" :
                        daysLeft !== null && daysLeft <= 7 ? "bg-warning" : "bg-success"
                      }`} />
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden">
                        {client.client?.avatar_url ? (
                          <img src={client.client.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-primary font-medium">
                            {client.client?.display_name?.[0]?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-foreground">{client.client?.display_name}</span>
                    </div>
                    {daysLeft !== null && (
                      <span className={`text-xs font-medium ${daysLeft <= 0 ? "text-error" : daysLeft <= 7 ? "text-warning" : "text-subtext"}`}>
                        {daysLeft <= 0 ? "Expired" : `${daysLeft}d left`}
                      </span>
                    )}
                  </div>

                  {/* Program Progress */}
                  {client.currentAssignment && (
                    <p className="text-xs text-subtext mb-2">
                      {client.currentAssignment.program?.name}
                      {client.currentAssignment.duration_weeks && (
                        <> — Week {Math.min(
                          Math.ceil((Date.now() - new Date(client.currentAssignment.started_at).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1,
                          client.currentAssignment.duration_weeks
                        )} of {client.currentAssignment.duration_weeks}</>
                      )}
                    </p>
                  )}

                  {/* Macro Bar */}
                  {cals && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={getCalorieColor(cals.actual, cals.target)}>
                          {Math.round(cals.actual)} {cals.target ? `/ ${Math.round(cals.target)}` : ""} kcal
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-surface rounded-full">
                        <div
                          className={`h-full rounded-full transition-all ${getBarColor(cals.actual, cals.target)}`}
                          style={{ width: `${Math.min((cals.actual / (cals.target || cals.actual)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Activity Indicators */}
                  <div className="flex gap-3 text-xs">
                    <span className={client.todayLog ? "text-success" : "text-subtext/40"}>
                      {client.todayLog ? "\u2713" : "\u25CB"} Logged today
                    </span>
                    <span className={client.todaySession ? "text-success" : "text-subtext/40"}>
                      {client.todaySession ? "\u2713" : "\u25CB"} Worked out
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}

        {clients.length === 0 && (
          <div className="text-center py-16">
            <p className="text-subtext">No active clients yet.</p>
            <p className="text-xs text-subtext/60 mt-1">Add clients using the button above or wait for requests.</p>
          </div>
        )}
      </div>
    </div>
  );
}
