"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CoachProfile } from "@/types";
import Link from "next/link";
import { motion } from "framer-motion";

const GOAL_FILTERS = [
  { label: "All", value: "all" },
  { label: "Strength", value: "strength" },
  { label: "Muscle", value: "hypertrophy" },
  { label: "Fat Loss", value: "fat_loss" },
  { label: "Maintain", value: "maintenance" },
] as const;

const PRICE_FILTERS = [
  { label: "Any Price", value: "all" },
  { label: "Free", value: "free" },
  { label: "< $50", value: "under50" },
  { label: "$50–$100", value: "50to100" },
  { label: "$100+", value: "over100" },
] as const;

type GoalFilter = (typeof GOAL_FILTERS)[number]["value"];
type PriceFilter = (typeof PRICE_FILTERS)[number]["value"];

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [goalFilter, setGoalFilter] = useState<GoalFilter>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return coaches.filter((coach) => {
      // Search: name or bio
      if (q) {
        const name = coach.user?.display_name?.toLowerCase() || "";
        const bio = coach.bio?.toLowerCase() || "";
        if (!name.includes(q) && !bio.includes(q)) return false;
      }
      // Goal filter
      if (goalFilter !== "all") {
        if (!coach.specialty?.includes(goalFilter)) return false;
      }
      // Price filter
      if (priceFilter !== "all") {
        const rate = coach.monthly_rate;
        if (priceFilter === "free" && rate != null && rate > 0) return false;
        if (priceFilter === "under50" && (rate == null || rate >= 50)) return false;
        if (priceFilter === "50to100" && (rate == null || rate < 50 || rate > 100)) return false;
        if (priceFilter === "over100" && (rate == null || rate <= 100)) return false;
      }
      return true;
    });
  }, [coaches, search, goalFilter, priceFilter]);

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
      <p className="text-sm text-subtext mb-4">Browse coaches and get personalized guidance.</p>

      {/* Search */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtext" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text"
          placeholder="Search by name or specialty..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-subtext/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-subtext hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        )}
      </div>

      {/* Goal filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-2 no-scrollbar">
        {GOAL_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setGoalFilter(f.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              goalFilter === f.value
                ? "bg-primary text-background shadow-[0_0_12px_rgba(56,189,248,0.4)]"
                : "bg-white/5 border border-white/10 text-subtext hover:border-primary/30"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Price filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 no-scrollbar">
        {PRICE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setPriceFilter(f.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              priceFilter === f.value
                ? "bg-accent/20 border border-accent/50 text-accent"
                : "bg-white/5 border border-white/10 text-subtext hover:border-accent/30"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      {(search || goalFilter !== "all" || priceFilter !== "all") && (
        <p className="text-xs text-subtext mb-3">
          {filtered.length} coach{filtered.length !== 1 ? "es" : ""} found
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-subtext text-sm">
            {coaches.length === 0 ? "No coaches available yet." : "No coaches match your filters."}
          </p>
          {coaches.length > 0 && (
            <button
              onClick={() => { setSearch(""); setGoalFilter("all"); setPriceFilter("all"); }}
              className="mt-3 text-xs text-primary underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((coach, i) => (
            <motion.div
              key={coach.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.3) }}
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
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {coach.user?.display_name || "Coach"}
                        </h3>
                        <span className={`text-xs font-medium shrink-0 ${coach.monthly_rate ? "text-accent" : "text-success"}`}>
                          {coach.monthly_rate ? `$${coach.monthly_rate}/mo` : "Free"}
                        </span>
                      </div>
                      <p className="text-xs text-subtext mt-1 line-clamp-2">{coach.bio}</p>
                      {/* Specialty tags */}
                      {coach.specialty?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {coach.specialty.map((s) => (
                            <span
                              key={s}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                s === goalFilter && goalFilter !== "all"
                                  ? "bg-primary/20 text-primary border border-primary/30"
                                  : "bg-white/5 text-subtext border border-white/10"
                              }`}
                            >
                              {s.replace("_", " ")}
                            </span>
                          ))}
                        </div>
                      )}
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
