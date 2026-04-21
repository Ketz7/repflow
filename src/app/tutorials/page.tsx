"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import Input from "@/components/ui/Input";
import YouTubeEmbed from "@/components/exercises/YouTubeEmbed";

interface MuscleGroupLite {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

interface TutorialExercise {
  id: string;
  name: string;
  youtube_url: string;
  muscle_group_id: string;
  muscle_group: MuscleGroupLite | null;
}

interface TutorialData {
  exercises: TutorialExercise[];
  muscleGroups: MuscleGroupLite[];
}

export default function TutorialsPage() {
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, loading } = useCachedQuery<TutorialData>(
    "tutorials:library",
    async () => {
      const supabase = createClient();
      const [{ data: exs }, { data: groups }] = await Promise.all([
        supabase
          .from("exercises")
          .select(
            "id, name, youtube_url, muscle_group_id, muscle_group:muscle_groups(id, name, icon, sort_order)",
          )
          .eq("is_approved", true)
          .not("youtube_url", "is", null)
          .order("name"),
        supabase
          .from("muscle_groups")
          .select("id, name, icon, sort_order")
          .order("sort_order"),
      ]);
      // Supabase's typed relation join can return an array when it can't infer
      // a unique FK; normalise to a single object for our UI.
      const normalised: TutorialExercise[] = (exs || []).map((e: {
        id: string;
        name: string;
        youtube_url: string;
        muscle_group_id: string;
        muscle_group: MuscleGroupLite | MuscleGroupLite[] | null;
      }) => ({
        id: e.id,
        name: e.name,
        youtube_url: e.youtube_url,
        muscle_group_id: e.muscle_group_id,
        muscle_group: Array.isArray(e.muscle_group)
          ? e.muscle_group[0] ?? null
          : e.muscle_group,
      }));
      return { exercises: normalised, muscleGroups: groups || [] };
    },
  );

  const exercises = data?.exercises ?? [];
  const muscleGroups = data?.muscleGroups ?? [];

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return exercises.filter((e) => {
      const matchesSearch = !needle || e.name.toLowerCase().includes(needle);
      const matchesGroup = !selectedGroup || e.muscle_group_id === selectedGroup;
      return matchesSearch && matchesGroup;
    });
  }, [exercises, search, selectedGroup]);

  const grouped = useMemo(() => {
    const map = new Map<string, TutorialExercise[]>();
    for (const ex of filtered) {
      const key = ex.muscle_group?.name || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ex);
    }
    // Order by muscle-group sort_order
    return Array.from(map.entries()).sort(([a], [b]) => {
      const sa = muscleGroups.find((g) => g.name === a)?.sort_order ?? 999;
      const sb = muscleGroups.find((g) => g.name === b)?.sort_order ?? 999;
      return sa - sb;
    });
  }, [filtered, muscleGroups]);

  if (loading) {
    return (
      <div className="px-4 pt-6 max-w-lg mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-40 bg-card rounded-lg" />
          <div className="h-4 w-64 bg-card rounded" />
          <div className="h-10 bg-card rounded-xl" />
          <div className="h-8 bg-card rounded-full w-3/4" />
          <div className="h-20 bg-card rounded-2xl" />
          <div className="h-20 bg-card rounded-2xl" />
          <div className="h-20 bg-card rounded-2xl" />
        </div>
      </div>
    );
  }

  const renderRow = (ex: TutorialExercise) => {
    const isOpen = expandedId === ex.id;
    return (
      <motion.div
        key={ex.id}
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        className="rounded-2xl bg-surface border border-border overflow-hidden"
      >
        <button
          type="button"
          onClick={() => setExpandedId(isOpen ? null : ex.id)}
          className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl shrink-0" aria-hidden>
              {ex.muscle_group?.icon || "💪"}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {ex.name}
              </div>
              {ex.muscle_group?.name && (
                <div className="text-[11px] text-subtext truncate">
                  {ex.muscle_group.name}
                </div>
              )}
            </div>
          </div>
          <span
            className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              isOpen
                ? "bg-primary text-background"
                : "bg-card text-subtext border border-border"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-3 h-3"
            >
              <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
            {isOpen ? "Close" : "Watch"}
          </span>
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="video"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-3 pt-0">
                <YouTubeEmbed url={ex.youtube_url} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-1">Tutorials</h1>
      <p className="text-sm text-subtext mb-6">
        Learn proper form from curated video guides.
      </p>

      <Input
        placeholder="Search exercises…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3"
      />

      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        <button
          type="button"
          onClick={() => setSelectedGroup(null)}
          className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            !selectedGroup
              ? "bg-primary text-background"
              : "bg-card text-subtext border border-border"
          }`}
        >
          All
        </button>
        {muscleGroups.map((g) => (
          <button
            type="button"
            key={g.id}
            onClick={() =>
              setSelectedGroup(selectedGroup === g.id ? null : g.id)
            }
            className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedGroup === g.id
                ? "bg-primary text-background"
                : "bg-card text-subtext border border-border"
            }`}
          >
            {g.icon} {g.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-subtext text-sm">
            No tutorials match your filters yet.
          </p>
        </div>
      ) : selectedGroup ? (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {filtered.map(renderRow)}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([groupName, exs]) => (
            <div key={groupName}>
              <h3 className="text-sm font-semibold text-subtext uppercase tracking-wider mb-2">
                {groupName}{" "}
                <span className="text-subtext/70 font-normal">
                  ({exs.length})
                </span>
              </h3>
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {exs.map(renderRow)}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
