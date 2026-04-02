"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CoachProfile } from "@/types";
import Link from "next/link";
import { motion } from "framer-motion";

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("coach_profiles")
        .select("*, user:users(display_name, avatar_url)")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      setCoaches(data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 pt-8 pb-24">
      <h1 className="text-2xl font-bold text-foreground mb-2">Find a Coach</h1>
      <p className="text-sm text-subtext mb-6">Browse coaches and get personalized guidance.</p>

      {coaches.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-subtext">No coaches available yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {coaches.map((coach, i) => (
            <motion.div
              key={coach.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/coaches/${coach.id}`} className="block">
                <div className="bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {coach.photo_url || coach.user?.avatar_url ? (
                        <img
                          src={coach.photo_url || coach.user?.avatar_url || ""}
                          alt={coach.user?.display_name || "Coach"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg text-primary">
                          {coach.user?.display_name?.[0]?.toUpperCase() || "C"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {coach.user?.display_name || "Coach"}
                        </h3>
                        {coach.monthly_rate && (
                          <span className="text-xs font-medium text-accent">${coach.monthly_rate}/mo</span>
                        )}
                      </div>
                      <p className="text-xs text-subtext mt-1 line-clamp-2">{coach.bio}</p>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
