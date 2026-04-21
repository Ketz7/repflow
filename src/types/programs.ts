export interface WorkoutExerciseDraft {
  id: string;               // client-side UUID (stable within a session)
  dbId?: string;             // present only when loaded from an existing program
  exercise_id: string;
  exercise_name: string;
  muscle_group_icon: string;
  target_sets: number;
  target_reps: number;
}

export interface WorkoutDraft {
  id: string;               // client-side UUID
  dbId?: string;             // present only when loaded from an existing program
  name: string;
  exercises: WorkoutExerciseDraft[];
}
