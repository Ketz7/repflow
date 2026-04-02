"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import AgreementModal from "@/components/legal/AgreementModal";
import type { CoachProfile } from "@/types";
import { motion } from "framer-motion";

export default function CoachApplyPage() {
  const router = useRouter();
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [monthlyRate, setMonthlyRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [showTos, setShowTos] = useState(false);
  const [existingProfile, setExistingProfile] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("coach_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) setExistingProfile(data);
      setLoading(false);
    }
    load();
  }, [router]);

  const handleSubmit = () => {
    if (!bio.trim() || !experience.trim()) return;
    setShowTos(true);
  };

  const handleTosAccepted = async () => {
    setShowTos(false);
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("coach_profiles").insert({
      user_id: user.id,
      bio: bio.trim(),
      experience: experience.trim(),
      monthly_rate: monthlyRate ? parseFloat(monthlyRate) : null,
    });

    setSaving(false);
    router.push("/profile");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (existingProfile) {
    return (
      <div className="min-h-screen bg-background px-4 pt-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-4">Coach Application</h1>
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4 ${
              existingProfile.status === "approved"
                ? "bg-success/15 text-success"
                : existingProfile.status === "pending"
                ? "bg-warning/15 text-warning"
                : "bg-error/15 text-error"
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                existingProfile.status === "approved" ? "bg-success" :
                existingProfile.status === "pending" ? "bg-warning" : "bg-error"
              }`} />
              {existingProfile.status === "approved" ? "Approved" :
               existingProfile.status === "pending" ? "Under Review" : "Suspended"}
            </div>
            <p className="text-sm text-foreground/70">
              {existingProfile.status === "pending"
                ? "Your application is being reviewed. You'll get access to the coaching dashboard once approved."
                : existingProfile.status === "approved"
                ? "You're an approved coach! Access your dashboard from the home page."
                : "Your coaching account has been suspended. Contact support for more information."}
            </p>
          </div>
          <Button variant="secondary" className="w-full mt-4" onClick={() => router.push("/profile")}>
            Back to Profile
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 pt-8 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-2">Become a Coach</h1>
        <p className="text-sm text-subtext mb-6">Share your expertise and guide athletes on their fitness journey.</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell potential clients about yourself and your coaching style..."
              rows={4}
              className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-subtext/50 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Experience & Qualifications</label>
            <textarea
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="Your certifications, years of experience, specializations..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-subtext/50 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Monthly Rate (optional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtext">$</span>
              <input
                type="number"
                value={monthlyRate}
                onChange={(e) => setMonthlyRate(e.target.value)}
                placeholder="0"
                className="w-full pl-7 pr-3 py-2.5 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-subtext/50"
              />
            </div>
            <p className="text-xs text-subtext mt-1">Displayed on your public profile. You collect payment externally.</p>
          </div>
        </div>

        <Button
          className="w-full mt-6"
          onClick={handleSubmit}
          disabled={!bio.trim() || !experience.trim() || saving}
        >
          {saving ? "Submitting..." : "Submit Application"}
        </Button>
      </motion.div>

      {showTos && (
        <AgreementModal
          type="tos"
          onAccepted={handleTosAccepted}
          onDeclined={() => setShowTos(false)}
        />
      )}
    </div>
  );
}
