export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  is_admin: boolean;
  weight_unit: "kg" | "lbs";
  goal: "strength" | "hypertrophy" | "fat_loss" | "maintenance" | null;
  weekly_session_goal: number;
  onboarding_completed: boolean;
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
  alternatives?: string[];
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
  fat_percentage: number | null;
  muscle_percentage: number | null;
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

export interface CoachProfile {
  id: string;
  user_id: string;
  bio: string;
  experience: string;
  photo_url: string | null;
  status: "pending" | "approved" | "suspended";
  max_clients: number;
  monthly_rate: number | null;
  specialty: string[];
  created_at: string;
  user?: UserProfile;
}

export interface CoachClient {
  id: string;
  coach_id: string;
  client_id: string;
  status: "pending" | "active" | "expired";
  initiated_by: "coach" | "client";
  started_at: string | null;
  expires_at: string | null;
  price: number | null;
  notes: string | null;
  created_at: string;
  client?: UserProfile;
  coach_profile?: CoachProfile;
}

export interface MacroTarget {
  id: string;
  coach_client_id: string;
  protein: number;
  carbs: number;
  fat: number;
  effective_date: string;
  created_at: string;
}

export interface CoachProgramAssignment {
  id: string;
  coach_client_id: string;
  program_id: string;
  duration_weeks: number | null;
  started_at: string;
  ended_at: string | null;
  status: "active" | "completed" | "swapped";
  created_at: string;
  program?: Program;
}

export interface CoachSubscription {
  id: string;
  coach_id: string;
  base_fee: number;
  per_client_fee: number;
  status: "active" | "expired" | "cancelled";
  current_period_start: string;
  current_period_end: string;
  created_at: string;
}

export interface UserAgreement {
  id: string;
  user_id: string;
  document_type: "tos" | "coaching_waiver";
  document_version: string;
  accepted_at: string;
  ip_address: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "coach_invite" | "client_request" | "invite_accepted" | "invite_declined";
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  coach_client_id: string | null;
  created_at: string;
}
