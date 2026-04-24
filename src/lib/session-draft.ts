/**
 * Session draft persistence — in-progress workout state survives tab
 * eviction, backgrounding, and route remounts.
 *
 * Why localStorage (not IndexedDB):
 *   - Synchronous API → we can flush from `pagehide` / `visibilitychange`
 *     before the browser freezes us. IndexedDB transactions can be killed
 *     mid-commit on mobile when the tab is suspended.
 *   - Data is tiny (a few KB at most) — nowhere near the 5MB per-origin cap.
 *
 * Shape intent:
 *   Store only the *mutable* slice the user is editing (per-exercise sets,
 *   current index, rest timer). Merge back onto a freshly-fetched template
 *   on load — so if an admin edits the workout upstream, metadata stays
 *   fresh while user entries are preserved.
 */
const PREFIX = "repflow:session-draft:";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24h — abandon anything older

export interface DraftSetEntry {
  set_number: number;
  reps_completed: number;
  weight_used: number | null;
  completed: boolean;
  rpe: number | null;
}

export interface DraftExercise {
  exercise_id: string;
  sets: DraftSetEntry[];
}

export interface SessionDraft {
  sessionId: string;
  savedAt: number;
  currentIndex: number;
  restTimer: { active: boolean; seconds: number };
  exercises: DraftExercise[];
}

function keyFor(sessionId: string): string {
  return `${PREFIX}${sessionId}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Load a draft for this session, if one exists and is fresh.
 * Returns null on missing / corrupt / expired drafts.
 */
export function loadDraft(sessionId: string): SessionDraft | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(keyFor(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionDraft;
    if (
      !parsed ||
      parsed.sessionId !== sessionId ||
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > DRAFT_TTL_MS ||
      !Array.isArray(parsed.exercises)
    ) {
      window.localStorage.removeItem(keyFor(sessionId));
      return null;
    }
    return parsed;
  } catch {
    // Corrupt JSON — drop it silently; never let storage break a workout.
    try { window.localStorage.removeItem(keyFor(sessionId)); } catch {}
    return null;
  }
}

/**
 * Persist the current draft. Synchronous and cheap (microseconds for a few KB).
 * Safe to call on every state change; no debounce needed.
 */
export function saveDraft(
  sessionId: string,
  draft: Omit<SessionDraft, "sessionId" | "savedAt">,
): void {
  if (!isBrowser()) return;
  try {
    const payload: SessionDraft = {
      sessionId,
      savedAt: Date.now(),
      ...draft,
    };
    window.localStorage.setItem(keyFor(sessionId), JSON.stringify(payload));
  } catch {
    // Quota errors / Safari private-mode throw — silently drop. The workout
    // continues; we just don't have a backup. Never surface storage errors
    // into the workout UI.
  }
}

export function clearDraft(sessionId: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(keyFor(sessionId));
  } catch {
    // No-op.
  }
}

/**
 * Garbage-collect drafts older than TTL from any prior sessions.
 * Cheap: runs once on mount, iterates only our own prefixed keys.
 */
export function purgeStaleDrafts(): void {
  if (!isBrowser()) return;
  try {
    const toDelete: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      try {
        const raw = window.localStorage.getItem(k);
        if (!raw) { toDelete.push(k); continue; }
        const parsed = JSON.parse(raw) as Partial<SessionDraft>;
        if (
          typeof parsed?.savedAt !== "number" ||
          Date.now() - parsed.savedAt > DRAFT_TTL_MS
        ) {
          toDelete.push(k);
        }
      } catch {
        toDelete.push(k);
      }
    }
    for (const k of toDelete) window.localStorage.removeItem(k);
  } catch {
    // No-op.
  }
}

/**
 * Merge a saved draft back onto freshly-fetched template exercises.
 * Matched by exercise_id → the draft's sets win (that's the user's work).
 * Unmatched draft exercises (e.g. template changed) are dropped silently;
 * unmatched template exercises keep their pristine empty sets.
 */
export function mergeDraftSets<T extends { exercise_id: string; sets: DraftSetEntry[] }>(
  fromTemplate: T[],
  draft: SessionDraft,
): T[] {
  const bySessionId = new Map<string, DraftExercise>();
  for (const d of draft.exercises) bySessionId.set(d.exercise_id, d);
  return fromTemplate.map((ex) => {
    const saved = bySessionId.get(ex.exercise_id);
    if (!saved || saved.sets.length === 0) return ex;
    return { ...ex, sets: saved.sets };
  });
}
