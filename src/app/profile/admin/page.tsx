"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ExerciseSubmission, MuscleGroup } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { motion } from "framer-motion";
import Link from "next/link";

export default function AdminPage() {
  const [submissions, setSubmissions] = useState<(ExerciseSubmission & { muscle_group?: MuscleGroup })[]>([]);
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
      <p className="text-sm text-subtext mb-6">Review exercise submissions</p>

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
    </div>
  );
}
