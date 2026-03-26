"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Exercise, MuscleGroup } from "@/types";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ExerciseSubmitForm from "@/components/exercises/ExerciseSubmitForm";
import YouTubeEmbed from "@/components/exercises/YouTubeEmbed";
import { motion, AnimatePresence } from "framer-motion";

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingVideoUrl, setEditingVideoUrl] = useState("");
  const [savingVideo, setSavingVideo] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: groups }, { data: exs }, { data: { user } }] = await Promise.all([
        supabase.from("muscle_groups").select("*").order("sort_order"),
        supabase.from("exercises").select("*, muscle_group:muscle_groups(*)").eq("is_approved", true).order("name"),
        supabase.auth.getUser(),
      ]);
      setMuscleGroups(groups || []);
      setExercises(exs || []);
      if (user) {
        const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
        setIsAdmin(profile?.is_admin || false);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return exercises.filter((e) => {
      const matchesSearch = !search || e.name.toLowerCase().includes(search.toLowerCase());
      const matchesGroup = !selectedGroup || e.muscle_group_id === selectedGroup;
      return matchesSearch && matchesGroup;
    });
  }, [exercises, search, selectedGroup]);

  const grouped = useMemo(() => {
    const map = new Map<string, Exercise[]>();
    for (const ex of filtered) {
      const groupName = ex.muscle_group?.name || "Other";
      if (!map.has(groupName)) map.set(groupName, []);
      map.get(groupName)!.push(ex);
    }
    return map;
  }, [filtered]);

  if (loading) {
    return (
      <div className="px-4 pt-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-card rounded-lg" />
          <div className="h-10 bg-card rounded-xl" />
          <div className="h-32 bg-card rounded-2xl" />
          <div className="h-32 bg-card rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground">Exercises</h1>
        <Button size="sm" onClick={() => setShowSubmitForm(true)}>
          + Submit
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search exercises..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3"
      />

      {/* Muscle Group Filters */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        <button
          onClick={() => setSelectedGroup(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !selectedGroup ? "bg-primary text-background" : "bg-card text-subtext border border-border"
          }`}
        >
          All
        </button>
        {muscleGroups.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelectedGroup(selectedGroup === g.id ? null : g.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedGroup === g.id ? "bg-primary text-background" : "bg-card text-subtext border border-border"
            }`}
          >
            {g.icon} {g.name}
          </button>
        ))}
      </div>

      {/* Exercise List */}
      <div className="space-y-6">
        {Array.from(grouped.entries()).map(([groupName, exs]) => (
          <div key={groupName}>
            <h3 className="text-sm font-semibold text-subtext uppercase tracking-wider mb-2">
              {groupName} ({exs.length})
            </h3>
            <div className="space-y-2">
              <AnimatePresence>
                {exs.map((ex) => (
                  <motion.button
                    key={ex.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={() => setSelectedExercise(ex)}
                    className="w-full text-left p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{ex.name}</span>
                      {ex.youtube_url && (
                        <Badge variant="primary">Video</Badge>
                      )}
                    </div>
                    {ex.description && (
                      <p className="text-xs text-subtext mt-1 line-clamp-1">{ex.description}</p>
                    )}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
        {grouped.size === 0 && (
          <p className="text-center text-subtext text-sm py-8">No exercises found.</p>
        )}
      </div>

      {/* Exercise Detail Modal */}
      <Modal
        isOpen={!!selectedExercise}
        onClose={() => { setSelectedExercise(null); setEditingVideoUrl(""); }}
        title={selectedExercise?.name}
      >
        {selectedExercise && (
          <div className="space-y-4">
            {selectedExercise.youtube_url ? (
              <YouTubeEmbed url={selectedExercise.youtube_url} />
            ) : (
              <div className="rounded-xl bg-surface border border-border p-6 text-center">
                <p className="text-subtext text-sm">No video clip added yet.</p>
              </div>
            )}
            <Badge>{selectedExercise.muscle_group?.name}</Badge>
            <p className="text-sm text-subtext">{selectedExercise.description}</p>

            {/* YouTube URL editor (admin only) */}
            {isAdmin && (
              <div className="pt-2 border-t border-border">
                <label className="text-xs text-subtext mb-1 block">
                  YouTube URL (max 30s clip)
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://youtube.com/..."
                    value={editingVideoUrl || selectedExercise.youtube_url || ""}
                    onChange={(e) => setEditingVideoUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    disabled={savingVideo}
                    onClick={async () => {
                      setSavingVideo(true);
                      const supabase = createClient();
                      const url = editingVideoUrl.trim() || null;
                      await supabase
                        .from("exercises")
                        .update({ youtube_url: url })
                        .eq("id", selectedExercise.id);
                      // Update local state
                      setExercises((prev) =>
                        prev.map((e) =>
                          e.id === selectedExercise.id ? { ...e, youtube_url: url } : e
                        )
                      );
                      setSelectedExercise({ ...selectedExercise, youtube_url: url });
                      setSavingVideo(false);
                    }}
                  >
                    {savingVideo ? "..." : "Save"}
                  </Button>
                </div>
                {selectedExercise.youtube_url && (
                  <button
                    className="text-xs text-error mt-1"
                    onClick={async () => {
                      const supabase = createClient();
                      await supabase
                        .from("exercises")
                        .update({ youtube_url: null })
                        .eq("id", selectedExercise.id);
                      setExercises((prev) =>
                        prev.map((e) =>
                          e.id === selectedExercise.id ? { ...e, youtube_url: null } : e
                        )
                      );
                      setSelectedExercise({ ...selectedExercise, youtube_url: null });
                      setEditingVideoUrl("");
                    }}
                  >
                    Remove video
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Submit Exercise Modal */}
      <Modal
        isOpen={showSubmitForm}
        onClose={() => setShowSubmitForm(false)}
        title="Submit an Exercise"
      >
        <ExerciseSubmitForm
          muscleGroups={muscleGroups}
          onSubmitted={() => setShowSubmitForm(false)}
        />
      </Modal>
    </div>
  );
}
