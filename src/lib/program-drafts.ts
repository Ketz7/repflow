import type { WorkoutDraft } from "@/types/programs";

// Branded key type — prevents passing arbitrary strings as draft keys
export type DraftKey = string & { readonly __brand: unique symbol };

const NEW_KEY = "repflow_program_draft_new" as DraftKey;
const EDIT_PREFIX = "repflow_program_draft_edit_";
const CURRENT_VERSION = 1;

export interface ProgramDraft {
  version: 1;
  name: string;
  description: string;
  workouts: WorkoutDraft[];
  savedAt: number;
}

export function newProgramKey(): DraftKey {
  return NEW_KEY;
}

export function editProgramKey(programId: string): DraftKey {
  return `${EDIT_PREFIX}${programId}` as DraftKey;
}

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

export function readDraft(key: DraftKey): ProgramDraft | null {
  if (!hasWindow()) return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ProgramDraft>;
    if (parsed.version !== CURRENT_VERSION) {
      clearDraft(key);
      return null;
    }
    if (
      typeof parsed.name !== "string" ||
      typeof parsed.description !== "string" ||
      !Array.isArray(parsed.workouts) ||
      typeof parsed.savedAt !== "number"
    ) {
      clearDraft(key);
      return null;
    }
    return parsed as ProgramDraft;
  } catch {
    clearDraft(key);
    return null;
  }
}

export function writeDraft(
  key: DraftKey,
  draft: Omit<ProgramDraft, "version" | "savedAt">,
): void {
  if (!hasWindow()) return;
  const payload: ProgramDraft = {
    version: CURRENT_VERSION,
    savedAt: Date.now(),
    ...draft,
  };
  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    // Quota exceeded, private-browsing Safari, etc. Fail silently.
    console.warn("[program-drafts] write failed", err);
  }
}

export function clearDraft(key: DraftKey): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // no-op
  }
}

export function isDraftMeaningful(draft: ProgramDraft): boolean {
  return (
    draft.name.trim() !== "" &&
    draft.workouts.some((w) => w.exercises.length > 0)
  );
}
