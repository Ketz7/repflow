"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MuscleGroup } from "@/types";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface ExerciseSubmitFormProps {
  muscleGroups: MuscleGroup[];
  onSubmitted: () => void;
}

export default function ExerciseSubmitForm({ muscleGroups, onSubmitted }: ExerciseSubmitFormProps) {
  const [name, setName] = useState("");
  const [muscleGroupId, setMuscleGroupId] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !muscleGroupId) {
      setError("Name and muscle group are required.");
      return;
    }

    setSubmitting(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in.");
      setSubmitting(false);
      return;
    }

    const { error: submitError } = await supabase.from("exercise_submissions").insert({
      submitted_by: user.id,
      name: name.trim(),
      muscle_group_id: muscleGroupId,
      youtube_url: youtubeUrl.trim() || null,
      description: description.trim(),
    });

    if (submitError) {
      setError("Failed to submit. Please try again.");
      setSubmitting(false);
      return;
    }

    onSubmitted();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs text-subtext mb-1 block">Exercise Name *</label>
        <Input
          placeholder="e.g., Cable Lateral Raise"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="text-xs text-subtext mb-1 block">Muscle Group *</label>
        <select
          value={muscleGroupId}
          onChange={(e) => setMuscleGroupId(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground text-sm focus:outline-none focus:border-primary/50"
        >
          <option value="">Select muscle group</option>
          {muscleGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.icon} {g.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-subtext mb-1 block">YouTube URL (max 30s clip)</label>
        <Input
          placeholder="https://youtube.com/..."
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
        />
      </div>

      <div>
        <label className="text-xs text-subtext mb-1 block">Description</label>
        <textarea
          placeholder="Brief description of the exercise..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-subtext/50 focus:outline-none focus:border-primary/50 text-sm resize-none"
        />
      </div>

      {error && <p className="text-error text-xs">{error}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit for Review"}
      </Button>

      <p className="text-xs text-subtext/60 text-center">
        Submissions are reviewed by admins before being added to the library.
      </p>
    </form>
  );
}
