"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Exercise, MuscleGroup } from "@/types";
import type { WorkoutDraft } from "@/types/programs";
import { newProgramKey } from "@/lib/program-drafts";
import { useProgramDraft } from "@/hooks/useProgramDraft";
import DraftBanner from "@/components/programs/DraftBanner";
import DraftSavedIndicator from "@/components/programs/DraftSavedIndicator";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { motion, AnimatePresence } from "framer-motion";

export default function NewProgramPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [workouts, setWorkouts] = useState<WorkoutDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const draftKey = useMemo(() => newProgramKey(), []);
  const {
    pendingDraft,
    dismissBanner,
    discardDraft,
    clearDraft,
    savedIndicatorVisible,
  } = useProgramDraft({
    key: draftKey,
    name,
    description,
    workouts,
    enabled: true,
  });

  const handleResume = () => {
    if (!pendingDraft) return;
    setName(pendingDraft.name);
    setDescription(pendingDraft.description);
    setWorkouts(pendingDraft.workouts);
    dismissBanner();
  };

  // Exercise picker state
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [pickerWorkoutId, setPickerWorkoutId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseFilter, setExerciseFilter] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: exs }, { data: groups }] = await Promise.all([
        supabase.from("exercises").select("*, muscle_group:muscle_groups(*)").eq("is_approved", true).order("name"),
        supabase.from("muscle_groups").select("*").order("sort_order"),
      ]);
      setExercises(exs || []);
      setMuscleGroups(groups || []);
    }
    load();
  }, []);

  const addWorkout = () => {
    setWorkouts((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: `Workout ${prev.length + 1}`, exercises: [] },
    ]);
  };

  const removeWorkout = (id: string) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  };

  const updateWorkoutName = (id: string, newName: string) => {
    setWorkouts((prev) => prev.map((w) => (w.id === id ? { ...w, name: newName } : w)));
  };

  const openExercisePicker = (workoutId: string) => {
    setPickerWorkoutId(workoutId);
    setExerciseSearch("");
    setExerciseFilter(null);
    setShowExercisePicker(true);
  };

  const addExerciseToWorkout = (exercise: Exercise) => {
    if (!pickerWorkoutId) return;
    setWorkouts((prev) =>
      prev.map((w) => {
        if (w.id !== pickerWorkoutId) return w;
        if (w.exercises.some((e) => e.exercise_id === exercise.id)) return w;
        return {
          ...w,
          exercises: [
            ...w.exercises,
            {
              id: crypto.randomUUID(),
              exercise_id: exercise.id,
              exercise_name: exercise.name,
              muscle_group_icon: exercise.muscle_group?.icon || "💪",
              target_sets: 3,
              target_reps: 10,
            },
          ],
        };
      })
    );
  };

  const removeExercise = (workoutId: string, exerciseEntryId: string) => {
    setWorkouts((prev) =>
      prev.map((w) =>
        w.id === workoutId
          ? { ...w, exercises: w.exercises.filter((e) => e.id !== exerciseEntryId) }
          : w
      )
    );
  };

  const updateExercise = (workoutId: string, exerciseEntryId: string, field: "target_sets" | "target_reps", value: number) => {
    setWorkouts((prev) =>
      prev.map((w) =>
        w.id === workoutId
          ? {
              ...w,
              exercises: w.exercises.map((e) =>
                e.id === exerciseEntryId ? { ...e, [field]: value } : e
              ),
            }
          : w
      )
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: program, error } = await supabase
      .from("programs")
      .insert({ name: name.trim(), description: description.trim(), user_id: user.id, is_public: false })
      .select()
      .single();

    if (error || !program) {
      setSaving(false);
      return;
    }

    for (let i = 0; i < workouts.length; i++) {
      const w = workouts[i];
      const { data: workout } = await supabase
        .from("program_workouts")
        .insert({ program_id: program.id, name: w.name, day_order: i + 1 })
        .select()
        .single();

      if (workout && w.exercises.length > 0) {
        await supabase.from("workout_exercises").insert(
          w.exercises.map((e, j) => ({
            program_workout_id: workout.id,
            exercise_id: e.exercise_id,
            target_sets: e.target_sets,
            target_reps: e.target_reps,
            sort_order: j + 1,
          }))
        );
      }
    }

    clearDraft();
    router.push("/programs");
  };

  const filteredExercises = exercises.filter((e) => {
    const matchesSearch = !exerciseSearch || e.name.toLowerCase().includes(exerciseSearch.toLowerCase());
    const matchesFilter = !exerciseFilter || e.muscle_group_id === exerciseFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="px-4 pt-6 pb-4">
      <AnimatePresence>
        {pendingDraft && (
          <DraftBanner
            savedAt={pendingDraft.savedAt}
            onResume={handleResume}
            onDiscard={discardDraft}
          />
        )}
      </AnimatePresence>
      <h1 className="text-2xl font-bold text-foreground mb-6">New Program</h1>

      <div className="space-y-4 mb-6">
        <div>
          <label className="text-xs text-subtext mb-1 block">Program Name *</label>
          <Input placeholder="e.g., My PPL Split" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-subtext mb-1 block">Description</label>
          <textarea
            placeholder="What's this program about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-subtext/50 focus:outline-none focus:border-primary/50 text-sm resize-none"
          />
        </div>
      </div>

      {/* Workouts */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground">Workouts</h2>
        <Button size="sm" variant="secondary" onClick={addWorkout}>+ Add Workout</Button>
      </div>

      <div className="space-y-4 mb-6">
        <AnimatePresence>
          {workouts.map((workout, wi) => (
            <motion.div
              key={workout.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="rounded-2xl bg-card border border-border p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-subtext">Day {wi + 1}</span>
                <Input
                  value={workout.name}
                  onChange={(e) => updateWorkoutName(workout.id, e.target.value)}
                  className="flex-1 !py-2 !text-sm font-medium"
                />
                <button onClick={() => removeWorkout(workout.id)} className="text-error text-xs px-2 py-1">✕</button>
              </div>

              {/* Exercises in this workout */}
              <div className="space-y-2 mb-3">
                {workout.exercises.map((ex) => (
                  <div key={ex.id} className="flex items-center gap-2 p-2 rounded-xl bg-surface">
                    <span className="text-sm">{ex.muscle_group_icon}</span>
                    <span className="flex-1 text-sm text-foreground truncate">{ex.exercise_name}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={ex.target_sets}
                        onChange={(e) => updateExercise(workout.id, ex.id, "target_sets", parseInt(e.target.value) || 0)}
                        className="w-12 px-1 py-1 text-center text-xs bg-card border border-border rounded-lg text-foreground"
                        min={1}
                      />
                      <span className="text-xs text-subtext">×</span>
                      <input
                        type="number"
                        value={ex.target_reps}
                        onChange={(e) => updateExercise(workout.id, ex.id, "target_reps", parseInt(e.target.value) || 0)}
                        className="w-12 px-1 py-1 text-center text-xs bg-card border border-border rounded-lg text-foreground"
                        min={1}
                      />
                    </div>
                    <button onClick={() => removeExercise(workout.id, ex.id)} className="text-error text-xs px-1">✕</button>
                  </div>
                ))}
              </div>

              <Button size="sm" variant="ghost" onClick={() => openExercisePicker(workout.id)} className="w-full">
                + Add Exercise
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>

        {workouts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-subtext text-sm mb-3">Add workouts to your program</p>
            <Button variant="secondary" onClick={addWorkout}>+ Add First Workout</Button>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        <DraftSavedIndicator visible={savedIndicatorVisible} />
        <Button size="lg" className="flex-1" disabled={!name.trim() || saving} onClick={handleSave}>
          {saving ? "Creating..." : "Create Program"}
        </Button>
      </div>

      {/* Exercise Picker Modal */}
      <Modal isOpen={showExercisePicker} onClose={() => setShowExercisePicker(false)} title="Add Exercise">
        <Input
          placeholder="Search exercises..."
          value={exerciseSearch}
          onChange={(e) => setExerciseSearch(e.target.value)}
          className="mb-3"
        />
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          <button
            onClick={() => setExerciseFilter(null)}
            className={`shrink-0 px-2.5 py-1 rounded-full text-xs ${!exerciseFilter ? "bg-primary text-background" : "bg-card text-subtext"}`}
          >
            All
          </button>
          {muscleGroups.map((g) => (
            <button
              key={g.id}
              onClick={() => setExerciseFilter(exerciseFilter === g.id ? null : g.id)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs ${exerciseFilter === g.id ? "bg-primary text-background" : "bg-card text-subtext"}`}
            >
              {g.icon} {g.name}
            </button>
          ))}
        </div>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {filteredExercises.map((ex) => (
            <button
              key={ex.id}
              onClick={() => {
                addExerciseToWorkout(ex);
                setShowExercisePicker(false);
              }}
              className="w-full text-left p-3 rounded-xl hover:bg-card transition-colors"
            >
              <span className="text-sm text-foreground">{ex.muscle_group?.icon} {ex.name}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
