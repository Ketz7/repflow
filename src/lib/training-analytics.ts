/**
 * training-analytics.ts
 *
 * Pure-function analytics library for RepFlow.
 * No React, no Supabase, no DOM. Every function takes already-fetched rows
 * and returns computed metrics — trivially testable and reusable across
 * session/progress/dashboard surfaces.
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface SetLog {
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  muscle_group_name: string;
  muscle_group_id: string;
  set_number: number;
  reps_completed: number;
  weight_used: number | null;
  rpe: number | null; // 1-10 or null
  created_at: string; // ISO timestamp
  session_date: string; // YYYY-MM-DD (derived from session.started_at)
}

export type TrainingGoal =
  | "strength"
  | "hypertrophy"
  | "fat_loss"
  | "maintenance"
  | null;

export type Unit = "kg" | "lbs";

// ─────────────────────────────────────────────────────────────
// RTS %1RM lookup (reps-to-failure → % of 1RM)
// ─────────────────────────────────────────────────────────────

const PCT_1RM: Record<number, number> = {
  1: 100, 2: 95, 3: 92, 4: 89, 5: 86, 6: 83, 7: 81, 8: 79,
  9: 76, 10: 74, 11: 72, 12: 70, 13: 68, 14: 66, 15: 65,
  16: 63, 17: 61, 18: 60, 19: 59, 20: 58,
};

function rtsPercentOfMax(repsToFailure: number): number {
  const r = Math.max(1, Math.min(20, Math.round(repsToFailure)));
  return PCT_1RM[r] ?? 58;
}

/**
 * Inverse of rtsPercentOfMax: given a %1RM (0–1), estimate reps-to-failure.
 * Used for calibration drift.
 */
function repsAtPct(pct: number): number {
  // pct is a ratio 0..1. Walk table to find the reps whose %1RM is closest.
  const target = Math.max(0, Math.min(1, pct)) * 100;
  let best = 1;
  let bestDiff = Infinity;
  for (let r = 1; r <= 20; r++) {
    const diff = Math.abs((PCT_1RM[r] ?? 58) - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = r;
    }
  }
  return best;
}

// ─────────────────────────────────────────────────────────────
// Volume tables
// ─────────────────────────────────────────────────────────────

const VOLUME_RANGES: Record<
  string,
  { mev: number; mav: [number, number]; mrv: number }
> = {
  Chest: { mev: 8, mav: [12, 20], mrv: 22 },
  Back: { mev: 10, mav: [14, 22], mrv: 25 },
  Shoulders: { mev: 8, mav: [14, 22], mrv: 26 },
  Arms: { mev: 8, mav: [12, 20], mrv: 26 },
  Biceps: { mev: 8, mav: [12, 20], mrv: 26 },
  Triceps: { mev: 6, mav: [10, 16], mrv: 18 },
  Legs: { mev: 10, mav: [14, 20], mrv: 24 },
  Quads: { mev: 8, mav: [12, 18], mrv: 20 },
  Hamstrings: { mev: 6, mav: [10, 16], mrv: 20 },
  Glutes: { mev: 4, mav: [8, 16], mrv: 20 },
  Calves: { mev: 8, mav: [12, 16], mrv: 20 },
  Core: { mev: 6, mav: [12, 20], mrv: 25 },
};

// ─────────────────────────────────────────────────────────────
// Function 1: estimatedOneRepMax
// ─────────────────────────────────────────────────────────────

/**
 * Estimate a 1-rep max from a completed set.
 *
 * - Epley formula when RPE unknown: weight * (1 + reps/30).
 * - RPE-adjusted (RTS chart) when RPE provided: treat the set as leaving
 *   (10 - rpe) reps in reserve, then look up %1RM at (reps + RIR).
 *
 * @param weight Kilograms (or pounds — unit is symmetric).
 * @param reps Reps completed on the set.
 * @param rpe Optional RPE 1–10. Omit / null for Epley.
 * @returns Estimated 1RM. Returns 0 for invalid input.
 *
 * @example
 *   estimatedOneRepMax(100, 5, 8) // ≈ 123.5 (RIR 2 → 7 reps to failure → 81%)
 *   estimatedOneRepMax(100, 5)     // ≈ 116.7 (Epley)
 */
export function estimatedOneRepMax(
  weight: number | null | undefined,
  reps: number,
  rpe?: number | null,
): number {
  if (weight == null || weight <= 0 || reps <= 0) return 0;
  if (rpe == null) {
    return weight * (1 + reps / 30);
  }
  const rir = Math.max(0, 10 - rpe);
  const repsToFailure = reps + rir;
  const pct = rtsPercentOfMax(repsToFailure);
  return weight / (pct / 100);
}

// ─────────────────────────────────────────────────────────────
// Function 2: bestE1RMByExercise
// ─────────────────────────────────────────────────────────────

export interface BestE1RM {
  e1rm: number;
  weight: number;
  reps: number;
  rpe: number | null;
  date: string;
  exercise_name: string;
}

/**
 * For each exercise, find the set with the highest computed e1RM.
 *
 * @param sets SetLog array across any timeframe.
 * @returns Map keyed by exercise_id.
 *
 * @example
 *   const m = bestE1RMByExercise(sets);
 *   m.get("bench-press-id")?.e1rm // 123.5
 */
export function bestE1RMByExercise(sets: SetLog[]): Map<string, BestE1RM> {
  const out = new Map<string, BestE1RM>();
  for (const s of sets) {
    if (s.weight_used == null || s.weight_used <= 0 || s.reps_completed <= 0)
      continue;
    const e1rm = estimatedOneRepMax(s.weight_used, s.reps_completed, s.rpe);
    const prev = out.get(s.exercise_id);
    if (!prev || e1rm > prev.e1rm) {
      out.set(s.exercise_id, {
        e1rm,
        weight: s.weight_used,
        reps: s.reps_completed,
        rpe: s.rpe,
        date: s.session_date,
        exercise_name: s.exercise_name,
      });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Function 3: detectPRs
// ─────────────────────────────────────────────────────────────

export interface PRRecord {
  exercise_id: string;
  exercise_name: string;
  e1rm: number;
  previousE1rm: number;
  weight: number;
  reps: number;
  rpe: number | null;
  date: string;
}

/**
 * For each exercise, compare the best e1RM on/after `sinceDate` with the
 * best e1RM before `sinceDate`. Recent > previous by ≥1% → PR record.
 *
 * @param sets All sets to consider.
 * @param sinceDate ISO date string (YYYY-MM-DD) — boundary.
 * @returns PR records sorted by % improvement descending.
 *
 * @example
 *   detectPRs(sets, "2026-01-01") // [{ exercise_id, e1rm, previousE1rm, ... }]
 */
export function detectPRs(sets: SetLog[], sinceDate: string): PRRecord[] {
  const before: SetLog[] = [];
  const after: SetLog[] = [];
  for (const s of sets) {
    if (s.session_date < sinceDate) before.push(s);
    else after.push(s);
  }
  const prevBest = bestE1RMByExercise(before);
  const recentBest = bestE1RMByExercise(after);

  const prs: Array<PRRecord & { _impPct: number }> = [];
  for (const [exId, recent] of recentBest) {
    const prev = prevBest.get(exId);
    const prevVal = prev?.e1rm ?? 0;
    if (prevVal === 0) {
      // First-ever record — count as PR
      prs.push({
        exercise_id: exId,
        exercise_name: recent.exercise_name,
        e1rm: recent.e1rm,
        previousE1rm: 0,
        weight: recent.weight,
        reps: recent.reps,
        rpe: recent.rpe,
        date: recent.date,
        _impPct: Infinity,
      });
      continue;
    }
    const impPct = (recent.e1rm - prevVal) / prevVal;
    if (impPct >= 0.01) {
      prs.push({
        exercise_id: exId,
        exercise_name: recent.exercise_name,
        e1rm: recent.e1rm,
        previousE1rm: prevVal,
        weight: recent.weight,
        reps: recent.reps,
        rpe: recent.rpe,
        date: recent.date,
        _impPct: impPct,
      });
    }
  }
  prs.sort((a, b) => b._impPct - a._impPct);
  return prs.map(({ _impPct, ...rest }) => rest);
}

// ─────────────────────────────────────────────────────────────
// Function 4: autoregulationPrescription
// ─────────────────────────────────────────────────────────────

export interface PrescriptionLastSet {
  weight: number | null;
  reps: number;
  rpe: number | null;
  date: string;
}

export interface PrescriptionSuggestion {
  weight: number;
  reps: number;
  rpe: number;
}

export interface AutoregulationResult {
  last?: PrescriptionLastSet;
  suggested?: PrescriptionSuggestion;
}

function roundToIncrement(value: number, unit: Unit): number {
  const inc = unit === "kg" ? 2.5 : 5;
  return Math.round(value / inc) * inc;
}

/**
 * Suggest next prescription (weight × reps @ target RPE) for an exercise
 * based on the user's most recent top set.
 *
 * Heuristics:
 *   - RPE null → repeat same weight/reps at target RPE.
 *   - Last RPE > targetRPE + 1 → too hard: repeat (deload-ish).
 *   - Last RPE < targetRPE - 1 → too easy: bump weight to match targetRPE.
 *   - Otherwise: solve weight that would produce targetRPE at same reps.
 *
 * @param sets All sets for this user.
 * @param exerciseId Which exercise to prescribe.
 * @param targetRPE Default 8.
 * @param unit "kg" (default) or "lbs" — controls rounding increment.
 *
 * @example
 *   // last: 100×5 @ RPE 7 → implied e1RM≈123.5 → weight @ RPE 8, 5 reps (RIR 2, 7 RTF, 81%) ≈ 100
 *   autoregulationPrescription(sets, "squat-id", 8) // { last, suggested: { weight: 100, reps: 5, rpe: 8 } }
 */
export function autoregulationPrescription(
  sets: SetLog[],
  exerciseId: string,
  targetRPE: number = 8,
  unit: Unit = "kg",
): AutoregulationResult {
  const forEx = sets.filter((s) => s.exercise_id === exerciseId);
  if (forEx.length === 0) return {};

  // Most recent session date
  let latestDate = forEx[0].session_date;
  for (const s of forEx) if (s.session_date > latestDate) latestDate = s.session_date;

  const latestSessionSets = forEx.filter((s) => s.session_date === latestDate);
  // Top set: highest weight, tiebreak highest reps
  let top: SetLog | null = null;
  for (const s of latestSessionSets) {
    if (!top) {
      top = s;
      continue;
    }
    const topW = top.weight_used ?? -1;
    const sW = s.weight_used ?? -1;
    if (sW > topW || (sW === topW && s.reps_completed > top.reps_completed)) {
      top = s;
    }
  }
  if (!top) return {};

  const last: PrescriptionLastSet = {
    weight: top.weight_used,
    reps: top.reps_completed,
    rpe: top.rpe,
    date: top.session_date,
  };

  // Bodyweight / no-weight exercise: no numeric suggestion possible
  if (top.weight_used == null || top.weight_used <= 0) {
    return { last };
  }

  // RPE unknown: repeat same weight/reps at target RPE
  if (top.rpe == null) {
    return {
      last,
      suggested: {
        weight: roundToIncrement(top.weight_used, unit),
        reps: top.reps_completed,
        rpe: targetRPE,
      },
    };
  }

  // Too hard last time → repeat (don't push)
  if (top.rpe > targetRPE + 1) {
    return {
      last,
      suggested: {
        weight: roundToIncrement(top.weight_used, unit),
        reps: top.reps_completed,
        rpe: targetRPE,
      },
    };
  }

  const lastE1rm = estimatedOneRepMax(
    top.weight_used,
    top.reps_completed,
    top.rpe,
  );
  const targetRir = Math.max(0, 10 - targetRPE);
  const targetRTF = top.reps_completed + targetRir;
  const targetPct = rtsPercentOfMax(targetRTF) / 100;
  const rawSuggestedWeight = lastE1rm * targetPct;

  // Too easy last time → aggressive bump: ensure we at least progress by one increment
  if (top.rpe < targetRPE - 1) {
    const inc = unit === "kg" ? 2.5 : 5;
    const bumped = Math.max(rawSuggestedWeight, top.weight_used + inc);
    return {
      last,
      suggested: {
        weight: roundToIncrement(bumped, unit),
        reps: top.reps_completed,
        rpe: targetRPE,
      },
    };
  }

  return {
    last,
    suggested: {
      weight: roundToIncrement(rawSuggestedWeight, unit),
      reps: top.reps_completed,
      rpe: targetRPE,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Function 5: detectStagnation
// ─────────────────────────────────────────────────────────────

export interface StagnationRecord {
  exercise_id: string;
  exercise_name: string;
  weeksFlat: number;
  currentE1rm: number;
  peakE1rm: number;
  avgRPE: number;
}

function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(aISO + "T00:00:00Z").getTime();
  const b = new Date(bISO + "T00:00:00Z").getTime();
  return (b - a) / 86_400_000;
}

function linearRegress(points: Array<{ x: number; y: number }>): {
  slope: number;
  intercept: number;
} {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
  }
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/**
 * Detect exercises whose e1RM has stalled despite high effort.
 *
 * @param sets All sets across history.
 * @param opts weeks (lookback window, default 6), minSessions (default 4).
 * @returns Stagnant exercises sorted by avgRPE desc.
 *
 * @example
 *   detectStagnation(sets, { weeks: 6, minSessions: 4 })
 */
export function detectStagnation(
  sets: SetLog[],
  opts: { weeks?: number; minSessions?: number } = {},
): StagnationRecord[] {
  const weeks = opts.weeks ?? 6;
  const minSessions = opts.minSessions ?? 4;
  const now = new Date();
  const cutoff = new Date(now.getTime() - weeks * 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const byEx = new Map<string, SetLog[]>();
  for (const s of sets) {
    if (s.session_date < cutoff) continue;
    const arr = byEx.get(s.exercise_id) ?? [];
    arr.push(s);
    byEx.set(s.exercise_id, arr);
  }

  const out: StagnationRecord[] = [];
  for (const [exId, exSets] of byEx) {
    const bySession = new Map<string, { best: number; rpes: number[] }>();
    for (const s of exSets) {
      if (s.weight_used == null || s.weight_used <= 0) continue;
      const e = estimatedOneRepMax(s.weight_used, s.reps_completed, s.rpe);
      const entry = bySession.get(s.session_date) ?? { best: 0, rpes: [] };
      if (e > entry.best) entry.best = e;
      if (s.rpe != null) entry.rpes.push(s.rpe);
      bySession.set(s.session_date, entry);
    }
    if (bySession.size < minSessions) continue;

    const dates = Array.from(bySession.keys()).sort();
    const first = dates[0];
    const points = dates.map((d) => ({
      x: daysBetween(first, d),
      y: bySession.get(d)!.best,
    }));
    const { slope } = linearRegress(points);

    const peak = points.reduce((m, p) => Math.max(m, p.y), 0);
    const current = points[points.length - 1].y;
    // slope is e1rm/day. 0.5% per week tolerance → 0.005/7 per day of peak.
    const tolerancePerDay = (peak * 0.005) / 7;

    if (slope > tolerancePerDay) continue; // progressing

    const allRpes = dates.flatMap((d) => bySession.get(d)!.rpes);
    const avgRPE =
      allRpes.length > 0
        ? allRpes.reduce((a, b) => a + b, 0) / allRpes.length
        : 0;
    if (avgRPE <= 8) continue; // easy weeks, not real stagnation

    const name = exSets[0]?.exercise_name ?? "";
    const weeksFlat =
      Math.round(
        (daysBetween(first, dates[dates.length - 1]) / 7) * 10,
      ) / 10;
    out.push({
      exercise_id: exId,
      exercise_name: name,
      weeksFlat,
      currentE1rm: current,
      peakE1rm: peak,
      avgRPE,
    });
  }

  out.sort((a, b) => b.avgRPE - a.avgRPE);
  return out;
}

// ─────────────────────────────────────────────────────────────
// Function 6: goalAlignmentScore
// ─────────────────────────────────────────────────────────────

export interface GoalAlignmentBreakdown {
  strengthSets: number;
  hypertrophySets: number;
  enduranceSets: number;
  totalSets: number;
}

export interface GoalAlignmentResult {
  score: number; // 0-100
  breakdown: GoalAlignmentBreakdown;
  message: string;
}

/**
 * Score how well the last `windowDays` of training matched the stated goal.
 *
 * Set classification:
 *   - Strength: 1–5 reps, RPE ≥ 7
 *   - Hypertrophy: 6–15 reps, RPE ≥ 6
 *   - Endurance: 16+ reps
 *   - Below RPE thresholds → warm-up (excluded).
 *
 * @example
 *   goalAlignmentScore(sets, "hypertrophy", 14)
 *   // { score: 65, breakdown: { ... }, message: "65% of your working sets..." }
 */
export function goalAlignmentScore(
  sets: SetLog[],
  goal: TrainingGoal,
  windowDays: number = 14,
): GoalAlignmentResult {
  const cutoff = new Date(Date.now() - windowDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const windowed = sets.filter((s) => s.session_date >= cutoff);

  let strength = 0;
  let hypertrophy = 0;
  let endurance = 0;
  let working = 0;

  for (const s of windowed) {
    const reps = s.reps_completed;
    const rpe = s.rpe;
    if (reps >= 16) {
      endurance++;
      working++;
      continue;
    }
    if (reps >= 1 && reps <= 5 && rpe != null && rpe >= 7) {
      strength++;
      working++;
      continue;
    }
    if (reps >= 6 && reps <= 15 && rpe != null && rpe >= 6) {
      hypertrophy++;
      working++;
      continue;
    }
    // No RPE reported but rep count is in a working range → count as working
    if (rpe == null && reps >= 1 && reps <= 5) {
      strength++;
      working++;
    } else if (rpe == null && reps >= 6 && reps <= 15) {
      hypertrophy++;
      working++;
    }
  }

  const breakdown: GoalAlignmentBreakdown = {
    strengthSets: strength,
    hypertrophySets: hypertrophy,
    enduranceSets: endurance,
    totalSets: working,
  };

  if (working === 0) {
    return {
      score: 0,
      breakdown,
      message: "No working sets logged in the window.",
    };
  }

  let score = 0;
  let message = "";
  const pct = (n: number) => Math.round((n / working) * 100);

  switch (goal) {
    case "strength":
      score = (strength / working) * 100;
      message = `${pct(strength)}% of your working sets matched your strength goal (1–5 reps, RPE ≥ 7). ${pct(
        hypertrophy,
      )}% were hypertrophy-biased.`;
      break;
    case "hypertrophy":
      score = (hypertrophy / working) * 100;
      message = `${pct(hypertrophy)}% of your working sets matched your hypertrophy goal. ${pct(
        strength,
      )}% were strength-biased (heavy + low reps).`;
      break;
    case "fat_loss":
      score = ((hypertrophy * 0.6 + endurance * 0.4) / working) * 100;
      message = `${pct(hypertrophy)}% hypertrophy + ${pct(
        endurance,
      )}% endurance sets — good fat-loss blend.`;
      break;
    case "maintenance":
    case null:
    default:
      score = 100;
      message = `No explicit goal set — logged ${working} working sets.`;
      break;
  }

  return { score: Math.round(score), breakdown, message };
}

// ─────────────────────────────────────────────────────────────
// Function 7: weeklyVolumeByMuscle
// ─────────────────────────────────────────────────────────────

export interface MuscleVolume {
  sets: number;
  tonnage: number;
}

function startOfIsoWeek(d: Date): Date {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = copy.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1 - day); // back to Monday
  copy.setUTCDate(copy.getUTCDate() + diff);
  return copy;
}

/**
 * Count working sets and tonnage per muscle group for the week containing
 * `weekStart` (defaults to current week; Monday–Sunday, UTC).
 *
 * Working set = weight > 0, reps ≥ 3, rpe null OR rpe ≥ 6.
 *
 * @example
 *   weeklyVolumeByMuscle(sets) // Map<"Chest", { sets: 14, tonnage: 12000 }>
 */
export function weeklyVolumeByMuscle(
  sets: SetLog[],
  weekStart?: Date,
): Map<string, MuscleVolume> {
  const anchor = weekStart ?? new Date();
  const start = startOfIsoWeek(anchor);
  const end = new Date(start.getTime() + 7 * 86_400_000);
  const startISO = start.toISOString().slice(0, 10);
  const endISO = end.toISOString().slice(0, 10);

  const out = new Map<string, MuscleVolume>();
  for (const s of sets) {
    if (s.session_date < startISO || s.session_date >= endISO) continue;
    if (s.weight_used == null || s.weight_used <= 0) continue;
    if (s.reps_completed < 3) continue;
    if (s.rpe != null && s.rpe < 6) continue;

    const key = s.muscle_group_name;
    const prev = out.get(key) ?? { sets: 0, tonnage: 0 };
    prev.sets += 1;
    prev.tonnage += s.weight_used * s.reps_completed;
    out.set(key, prev);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Function 8: volumeRecommendation
// ─────────────────────────────────────────────────────────────

export type VolumeStatus =
  | "below_mev"
  | "at_mev"
  | "in_range"
  | "above_mrv";

/**
 * Classify weekly set count for a muscle group against MEV/MAV/MRV.
 *
 * @example
 *   volumeRecommendation("Chest", 6)  // "below_mev"
 *   volumeRecommendation("Chest", 14) // "in_range"
 *   volumeRecommendation("Chest", 25) // "above_mrv"
 */
export function volumeRecommendation(
  muscleGroup: string,
  sets: number,
): VolumeStatus {
  const key = Object.keys(VOLUME_RANGES).find(
    (k) => k.toLowerCase() === muscleGroup.toLowerCase(),
  );
  if (!key) return "in_range";
  const r = VOLUME_RANGES[key];
  if (sets < r.mev) return "below_mev";
  if (sets < r.mav[0]) return "at_mev";
  if (sets <= r.mrv) return "in_range"; // folds at_mav-high into in_range
  return "above_mrv";
}

// ─────────────────────────────────────────────────────────────
// Function 9: rpeCalibrationDrift
// ─────────────────────────────────────────────────────────────

export interface CalibrationDrift {
  drift: number | null;
  samples: number;
  direction: "low" | "accurate" | "high" | null;
}

/**
 * Estimate whether the user systematically over- or under-reports RPE by
 * comparing reported RPE to the RPE implied by their lifetime best e1RM.
 *
 * For each of the last 20 sessions with this exercise, take the top set.
 * If RPE reported: theoretical RPE = 10 − (repsAtPct(weight / bestE1rm) − reps).
 * drift = mean(reported − theoretical) across sessions.
 *
 * Direction: drift > 0.75 → "high" (over-reports); drift < -0.75 → "low"
 * (under-reports); else "accurate". Needs ≥ 6 samples; otherwise returns
 * { drift: null, direction: null, samples }.
 *
 * @example
 *   rpeCalibrationDrift(sets, "bench-id") // { drift: -1.2, samples: 12, direction: "low" }
 */
export function rpeCalibrationDrift(
  sets: SetLog[],
  exerciseId: string,
): CalibrationDrift {
  const forEx = sets.filter((s) => s.exercise_id === exerciseId);
  if (forEx.length === 0) return { drift: null, samples: 0, direction: null };

  // Lifetime best e1RM
  const bestMap = bestE1RMByExercise(forEx);
  const best = bestMap.get(exerciseId);
  if (!best || best.e1rm <= 0) {
    return { drift: null, samples: 0, direction: null };
  }

  // Group by session, pick top set (highest weight) per session
  const bySession = new Map<string, SetLog>();
  for (const s of forEx) {
    if (s.weight_used == null || s.weight_used <= 0) continue;
    if (s.rpe == null) continue;
    const prev = bySession.get(s.session_id);
    if (!prev || (s.weight_used ?? 0) > (prev.weight_used ?? 0)) {
      bySession.set(s.session_id, s);
    }
  }

  // Sort by session_date desc, keep last 20
  const tops = Array.from(bySession.values())
    .sort((a, b) => (a.session_date < b.session_date ? 1 : -1))
    .slice(0, 20);

  const drifts: number[] = [];
  for (const t of tops) {
    if (t.weight_used == null) continue;
    const pct = t.weight_used / best.e1rm;
    if (pct <= 0 || pct > 1.1) continue; // sanity
    const rtf = repsAtPct(pct);
    const rir = Math.max(0, rtf - t.reps_completed);
    const theoreticalRPE = Math.max(1, Math.min(10, 10 - rir));
    drifts.push((t.rpe ?? 0) - theoreticalRPE);
  }

  const samples = drifts.length;
  if (samples < 6) {
    return { drift: null, samples, direction: null };
  }
  const drift = drifts.reduce((a, b) => a + b, 0) / samples;
  const direction: CalibrationDrift["direction"] =
    drift > 0.75 ? "high" : drift < -0.75 ? "low" : "accurate";
  return { drift, samples, direction };
}

// ─────────────────────────────────────────────────────────────
// Function 10: linearProjection
// ─────────────────────────────────────────────────────────────

export interface LinearProjection {
  slope: number; // e1RM per day
  projectedE1rm: number;
  confidence: "low" | "medium" | "high";
}

/**
 * Fit a line through (days-since-first, best-e1RM-per-session) and project
 * forward by `weeksAhead` weeks.
 *
 * @returns null if fewer than 4 data points.
 *
 * @example
 *   linearProjection(sets, "squat-id", 8)
 *   // { slope: 0.12, projectedE1rm: 137.2, confidence: "medium" }
 */
export function linearProjection(
  sets: SetLog[],
  exerciseId: string,
  weeksAhead: number = 8,
): LinearProjection | null {
  const forEx = sets.filter(
    (s) => s.exercise_id === exerciseId && s.weight_used != null && s.weight_used > 0,
  );
  if (forEx.length === 0) return null;

  const bySession = new Map<string, number>();
  for (const s of forEx) {
    const e = estimatedOneRepMax(s.weight_used, s.reps_completed, s.rpe);
    const prev = bySession.get(s.session_date) ?? 0;
    if (e > prev) bySession.set(s.session_date, e);
  }
  if (bySession.size < 4) return null;

  const dates = Array.from(bySession.keys()).sort();
  const first = dates[0];
  const points = dates.map((d) => ({
    x: daysBetween(first, d),
    y: bySession.get(d)!,
  }));
  const { slope, intercept } = linearRegress(points);

  const today = new Date().toISOString().slice(0, 10);
  const daysFromFirstToToday = daysBetween(first, today);
  const projectedX = daysFromFirstToToday + weeksAhead * 7;
  const projectedE1rm = slope * projectedX + intercept;

  const n = points.length;
  const confidence: LinearProjection["confidence"] =
    n >= 20 ? "high" : n >= 10 ? "medium" : "low";

  return { slope, projectedE1rm, confidence };
}

// ─────────────────────────────────────────────────────────────
// Function 11: sessionReadiness
// ─────────────────────────────────────────────────────────────

export type ReadinessLevel = "fresh" | "moderate" | "fatigued";

export interface ReadinessResult {
  level: ReadinessLevel;
  score: number; // 0-100, higher = fresher
  reasons: string[];
  avgRecentRPE: number | null;
  muscleRest: Array<{ muscle: string; daysAgo: number | null }>;
}

/**
 * Estimate training readiness for an upcoming session.
 *
 * Signals:
 *  1. Avg RPE over the last 7 days (>=9 → fatigued, 8–8.9 → moderate).
 *  2. For each target muscle group, days since last working set.
 *     - Worked yesterday or today → fatigue penalty.
 *     - >= 2 days rest → neutral.
 *  3. Volume in the last 3 days relative to recent baseline (soft penalty
 *     when recent 3d tonnage > 1.5x the prior 7d avg).
 *
 * @param sets All historical sets for the user.
 * @param targetMuscles Muscle group names this upcoming session will hit.
 * @param now Optional override for "now" (testing).
 *
 * @example
 *   sessionReadiness(sets, ["Chest", "Triceps"])
 *   // { level: "moderate", score: 72, reasons: [...], ... }
 */
export function sessionReadiness(
  sets: SetLog[],
  targetMuscles: string[],
  now: Date = new Date(),
): ReadinessResult {
  const todayISO = now.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const threeDaysAgo = new Date(now.getTime() - 3 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const tenDaysAgo = new Date(now.getTime() - 10 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  let score = 100;
  const reasons: string[] = [];

  // Signal 1: recent RPE
  const recentRpes = sets
    .filter((s) => s.session_date >= sevenDaysAgo && s.rpe != null)
    .map((s) => s.rpe as number);
  const avgRecentRPE =
    recentRpes.length > 0
      ? recentRpes.reduce((a, b) => a + b, 0) / recentRpes.length
      : null;
  if (avgRecentRPE != null) {
    if (avgRecentRPE >= 9) {
      score -= 35;
      reasons.push(`7-day avg RPE ${avgRecentRPE.toFixed(1)} — high fatigue signal.`);
    } else if (avgRecentRPE >= 8) {
      score -= 15;
      reasons.push(`7-day avg RPE ${avgRecentRPE.toFixed(1)} — pushing hard lately.`);
    }
  }

  // Signal 2: days since muscle last hit
  const muscleRest: ReadinessResult["muscleRest"] = [];
  const normalizedTargets = targetMuscles.map((m) => m.toLowerCase());
  for (const target of targetMuscles) {
    const hits = sets.filter(
      (s) =>
        s.muscle_group_name.toLowerCase() === target.toLowerCase() &&
        (s.weight_used ?? 0) > 0 &&
        s.reps_completed >= 3,
    );
    if (hits.length === 0) {
      muscleRest.push({ muscle: target, daysAgo: null });
      continue;
    }
    const latest = hits.reduce((m, s) =>
      s.session_date > m ? s.session_date : m, "0000-00-00",
    );
    const days = Math.floor(daysBetween(latest, todayISO));
    muscleRest.push({ muscle: target, daysAgo: days });
    if (days <= 0) {
      score -= 25;
      reasons.push(`${target} trained today already.`);
    } else if (days === 1) {
      score -= 12;
      reasons.push(`${target} trained yesterday — limited recovery.`);
    }
  }

  // Signal 3: recent tonnage spike
  const base = sets.filter(
    (s) => s.session_date >= tenDaysAgo && (s.weight_used ?? 0) > 0,
  );
  const tonnageIn = (fromISO: string) =>
    base
      .filter((s) => s.session_date >= fromISO)
      .reduce((a, s) => a + (s.weight_used! * s.reps_completed), 0);
  const recent3 = tonnageIn(threeDaysAgo);
  const prior7 = tonnageIn(sevenDaysAgo) - recent3;
  const prior7Avg = prior7 / 7;
  const recent3Avg = recent3 / 3;
  if (prior7Avg > 0 && recent3Avg > prior7Avg * 1.5) {
    score -= 10;
    reasons.push("Recent 3-day tonnage well above baseline.");
  }

  score = Math.max(0, Math.min(100, score));
  const level: ReadinessLevel =
    score >= 75 ? "fresh" : score >= 50 ? "moderate" : "fatigued";

  if (reasons.length === 0) {
    reasons.push("Low stress signals — good to train.");
  }

  // Suppress unused warning for normalizedTargets; kept for potential future use.
  void normalizedTargets;

  return { level, score, reasons, avgRecentRPE, muscleRest };
}

/* Self-check examples (documentation only — not executed)
 *
 * estimatedOneRepMax(100, 5, 8)   ≈ 123.5kg  (RIR 2, 7 reps-to-failure, 81% of 1RM → 100/0.81)
 * estimatedOneRepMax(100, 5)      ≈ 116.7kg  (Epley: 100 * (1 + 5/30))
 * estimatedOneRepMax(100, 1, 10)  === 100kg  (already max)
 * estimatedOneRepMax(null, 5, 8)  === 0      (invalid input)
 *
 * volumeRecommendation("Chest", 6)  === "below_mev"
 * volumeRecommendation("Chest", 10) === "at_mev"        (>=8 mev, <12 mav[0])
 * volumeRecommendation("Chest", 15) === "in_range"
 * volumeRecommendation("chest", 25) === "above_mrv"     (case-insensitive)
 * volumeRecommendation("Neck",  10) === "in_range"      (unknown muscle → safe default)
 *
 * autoregulationPrescription for a single set 100×5 @ RPE 7 on 2026-01-01 (targetRPE 8, kg)
 *   lastE1rm = estimatedOneRepMax(100, 5, 7) = 100 / 0.79 ≈ 126.6
 *   targetPct at reps=5, RIR=2 → RTF=7 → 81%
 *   suggestedWeight = 126.6 * 0.81 ≈ 102.5 → rounds to 102.5kg
 *   → { last: {...}, suggested: { weight: 102.5, reps: 5, rpe: 8 } }
 *
 * goalAlignmentScore over window with 10 sets of 8-rep @ RPE 7 and goal="hypertrophy"
 *   → { score: 100, breakdown: { hypertrophySets: 10, totalSets: 10, ... } }
 */
