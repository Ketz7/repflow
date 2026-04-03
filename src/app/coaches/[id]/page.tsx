"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CoachProfile } from "@/types";
import Button from "@/components/ui/Button";
import AgreementModal from "@/components/legal/AgreementModal";
import { motion } from "framer-motion";

export default function CoachProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [coach, setCoach] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [showWaiver, setShowWaiver] = useState(false);
  const [existingRelationship, setExistingRelationship] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      const { data: coachData } = await supabase
        .from("coach_profiles")
        .select("*, user:users(display_name, avatar_url, email)")
        .eq("id", params.id)
        .single();

      if (!coachData) { router.push("/coaches"); return; }
      setCoach(coachData);

      // Check if already connected
      const { data: rel } = await supabase
        .from("coach_clients")
        .select("status")
        .eq("coach_id", params.id)
        .eq("client_id", user.id)
        .single();

      if (rel) setExistingRelationship(rel.status);
      setLoading(false);
    }
    load();
  }, [params.id, router]);

  const handleRequestCoach = () => {
    setShowWaiver(true);
  };

  const handleWaiverAccepted = async () => {
    setShowWaiver(false);
    setRequesting(true);
    setRequestError(null);

    const supabase = createClient();
    const { error } = await supabase.from("coach_clients").insert({
      coach_id: params.id,
      client_id: userId,
      initiated_by: "client",
    });

    if (error) {
      // unique_violation — a pending/active relationship already exists
      if (error.code === "23505") {
        setExistingRelationship("pending");
      } else {
        setRequestError("Could not send request. The coach may not be accepting clients right now.");
      }
    } else {
      setExistingRelationship("pending");
    }

    setRequesting(false);
  };

  if (loading || !coach) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isOwnProfile = coach.user_id === userId;

  return (
    <div className="min-h-screen bg-background px-4 pt-8 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
        {/* Coach Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/15 flex items-center justify-center overflow-hidden flex-shrink-0">
            {coach.photo_url || coach.user?.avatar_url ? (
              <img
                src={coach.photo_url || coach.user?.avatar_url || ""}
                alt={coach.user?.display_name || "Coach"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl text-primary">
                {coach.user?.display_name?.[0]?.toUpperCase() || "C"}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{coach.user?.display_name || "Coach"}</h1>
            {coach.monthly_rate && (
              <p className="text-sm font-medium text-accent">${coach.monthly_rate}/month</p>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-2xl p-4 mb-4">
          <h2 className="text-sm font-semibold text-foreground mb-2">About</h2>
          <p className="text-sm text-foreground/70 whitespace-pre-wrap">{coach.bio}</p>
        </div>

        {/* Experience */}
        <div className="bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-2xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-2">Experience & Qualifications</h2>
          <p className="text-sm text-foreground/70 whitespace-pre-wrap">{coach.experience}</p>
        </div>

        {/* Action Button */}
        {!isOwnProfile && (
          <>
            {requestError && (
              <div className="p-3 mb-3 bg-error/10 border border-error/20 rounded-xl text-center">
                <span className="text-sm font-medium text-error">{requestError}</span>
              </div>
            )}
            {existingRelationship === "active" && (
              <div className="p-3 bg-success/10 border border-success/20 rounded-xl text-center">
                <span className="text-sm font-medium text-success">Currently your coach</span>
              </div>
            )}
            {existingRelationship === "pending" && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl text-center">
                <span className="text-sm font-medium text-warning">Request pending</span>
              </div>
            )}
            {!existingRelationship && (
              <Button className="w-full" onClick={handleRequestCoach} disabled={requesting}>
                {requesting ? "Requesting..." : "Request Coaching"}
              </Button>
            )}
          </>
        )}

        <Button variant="secondary" className="w-full mt-3" onClick={() => router.push("/coaches")}>
          Back to Coaches
        </Button>
      </motion.div>

      {showWaiver && (
        <AgreementModal
          type="coaching_waiver"
          onAccepted={handleWaiverAccepted}
          onDeclined={() => setShowWaiver(false)}
        />
      )}
    </div>
  );
}
