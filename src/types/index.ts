export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  is_admin: boolean;
  weight_unit: "kg" | "lbs";
  created_at: string;
}

export interface MuscleGroup {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

export interface Exercise {
  id: string;
  name: string;
  muscle_group_id: string;
  youtube_url: string | null;
  description: string;
  is_approved: boolean;
  submitted_by: string | null;
  created_at: string;
  muscle_group?: MuscleGroup;
}

export interface Program {
  id: string;
  name: string;
  description: string;
  user_id: string | null;
  is_public: boolean;
  created_at: string;
  program_workouts?: ProgramWorkout[];
}

export interface ProgramWorkout {
  id: string;
  program_id: string;
  name: string;
  day_order: number;
  created_at: string;
  workout_exercises?: WorkoutExercise[];
}

export interface WorkoutExercise {
  id: string;
  program_workout_id: string;
  exercise_id: string;
  target_sets: number;
  target_reps: number;
  sort_order: number;
  exercise?: Exercise;
}

export interface Phase {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface PhaseSchedule {
  id: string;
  phase_id: string;
  program_workout_id: string;
  scheduled_date: string;
  sort_order: number;
  program_workout?: ProgramWorkout;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  program_workout_id: string | null;
  phase_id: string | null;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  session_sets?: SessionSet[];
  program_workout?: ProgramWorkout;
}

export interface SessionSet {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps_completed: number;
  weight_used: number | null;
  created_at: string;
  exercise?: Exercise;
}

export interface BodyWeightLog {
  id: string;
  user_id: string;
  date: string;
  weight: number | null;
  steps: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  created_at: string;
}

export interface ExerciseSubmission {
  id: string;
  submitted_by: string;
  name: string;
  muscle_group_id: string;
  youtube_url: string | null;
  description: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  created_at: string;
}
