"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ExerciseSubmission, MuscleGroup, CoachProfile, UserProfile } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { motion } from "framer-motion";
import Link from "next/link";

export default function AdminPage() {
  const [submissions, setSubmissions] = useState<(ExerciseSubmission & { muscle_group?: MuscleGroup })[]>([]);
  const [coachApplications, setCoachApplications] = useState<(CoachProfile & { user?: UserProfile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      const { data: subs } = await supabase
        .from("exercise_submissions")
        .select("*, muscle_group:muscle_groups(*)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      setSubmissions(subs || []);

      // Load coach applications
      const { data: coaches } = await supabase
        .from("coach_profiles")
        .select("*, user:users(display_name, email, avatar_url)")
        .order("created_at", { ascending: false });
      setCoachApplications(coaches || []);

      setLoading(false);
    }
    load();
  }, []);

  const handleReview = async (submissionId: string, action: "approved" | "rejected") => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const submission = submissions.find((s) => s.id === submissionId);

    // Update submission status
    await supabase
      .from("exercise_submissions")
      .update({ status: action, reviewed_by: user?.id })
      .eq("id", submissionId);

    // If approved, create the exercise
    if (action === "approved" && submission) {
      await supabase.from("exercises").insert({
        name: submission.name,
        muscle_group_id: submission.muscle_group_id,
        youtube_url: submission.youtube_url,
        description: submission.description,
        is_approved: true,
        submitted_by: submission.submitted_by,
      });
    }

    setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
  };

  const handleCoachStatus = async (coachId: string, newStatus: "approved" | "suspended") => {
    const supabase = createClient();
    await supabase
      .from("coach_profiles")
      .update({ status: newStatus })
      .eq("id", coachId);
    setCoachApplications((prev) =>
      prev.map((c) => c.id === coachId ? { ...c, status: newStatus } : c)
    );
  };

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

  if (!isAdmin) {
    return (
      <div className="px-4 pt-6 text-center">
        <p className="text-error text-sm">Access denied. Admin only.</p>
        <Link href="/profile"><Button variant="secondary" className="mt-4">Back</Button></Link>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <Link href="/profile" className="text-xs text-subtext hover:text-primary mb-2 inline-block">&larr; Back to Profile</Link>
      <h1 className="text-2xl font-bold text-foreground mb-2">Admin Panel</h1>
      <p className="text-sm text-subtext mb-6">Review submissions &amp; manage coaches</p>

      {submissions.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-8 text-center">
          <p className="text-subtext text-sm">No pending submissions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub, i) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl bg-card border border-border p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-foreground">{sub.name}</h3>
                  <Badge>{sub.muscle_group?.icon} {sub.muscle_group?.name}</Badge>
                </div>
                <Badge variant="warning">Pending</Badge>
              </div>
              {sub.description && (
                <p className="text-xs text-subtext mb-2">{sub.description}</p>
              )}
              {sub.youtube_url && (
                <p className="text-xs text-primary mb-3 truncate">{sub.youtube_url}</p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleReview(sub.id, "approved")}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  className="flex-1"
                  onClick={() => handleReview(sub.id, "rejected")}
                >
                  Reject
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Coach Management */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Coach Management</h2>
        {coachApplications.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-8 text-center">
            <p className="text-sm text-subtext">No coach applications.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {coachApplications.map((coach) => (
              <div key={coach.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden">
                      {coach.user?.avatar_url ? (
                        <img src={coach.user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm text-primary">{coach.user?.display_name?.[0]?.toUpperCase() || "?"}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{coach.user?.display_name}</p>
                      <p className="text-xs text-subtext">{coach.user?.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    coach.status === "approved" ? "bg-success/15 text-success" :
                    coach.status === "pending" ? "bg-warning/15 text-warning" :
                    "bg-error/15 text-error"
                  }`}>
                    {coach.status}
                  </span>
                </div>
                <p className="text-xs text-foreground/70 mb-1"><strong>Bio:</strong> {coach.bio || "\u2014"}</p>
                <p className="text-xs text-foreground/70 mb-3"><strong>Experience:</strong> {coach.experience || "\u2014"}</p>
                <div className="flex gap-2">
                  {coach.status !== "approved" && (
                    <button
                      onClick={() => handleCoachStatus(coach.id, "approved")}
                      className="px-3 py-1.5 text-xs rounded-lg bg-success/15 text-success font-medium hover:bg-success/25 transition-colors"
                    >
                      Approve
                    </button>
                  )}
                  {coach.status !== "suspended" && (
                    <button
                      onClick={() => handleCoachStatus(coach.id, "suspended")}
                      className="px-3 py-1.5 text-xs rounded-lg bg-error/15 text-error font-medium hover:bg-error/25 transition-colors"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
