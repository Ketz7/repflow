"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkoutDraft } from "@/types/programs";
import {
  clearDraft as clearDraftStorage,
  isDraftMeaningful,
  readDraft,
  writeDraft,
  type DraftKey,
  type ProgramDraft,
} from "@/lib/program-drafts";

interface UseProgramDraftOptions {
  /** Key this draft is stored under. Stable across renders. */
  key: DraftKey;
  /** Reactive form state to persist. */
  name: string;
  description: string;
  workouts: WorkoutDraft[];
  /**
   * When false, the hook does not read or write. Used by the edit page to
   * block draft reads until the initial server load has completed.
   */
  enabled: boolean;
}

interface UseProgramDraftResult {
  /** The draft discovered on mount, or null. Caller renders banner if truthy. */
  pendingDraft: ProgramDraft | null;
  /** Accept the draft: caller hydrates its own form state, then calls this. */
  dismissBanner: () => void;
  /** Discard and clear: hides banner AND removes from storage. */
  discardDraft: () => void;
  /** Clear without hiding banner (used after successful submit). */
  clearDraft: () => void;
  /** Whether the small "Draft saved" indicator should show right now. */
  savedIndicatorVisible: boolean;
}

const DEBOUNCE_MS = 500;
const INDICATOR_MS = 1500;

export function useProgramDraft({
  key,
  name,
  description,
  workouts,
  enabled,
}: UseProgramDraftOptions): UseProgramDraftResult {
  const [pendingDraft, setPendingDraft] = useState<ProgramDraft | null>(null);
  const [savedIndicatorVisible, setSavedIndicatorVisible] = useState(false);
  const hasMountedRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mount read — once per `enabled` becoming true.
  // We can't use a lazy `useState` initializer because `enabled` may start
  // false (edit page waits for server load) and flip true later. The
  // setState-in-effect is intentional and fires at most once per key.
  useEffect(() => {
    if (!enabled || hasMountedRef.current) return;
    hasMountedRef.current = true;

    const draft = readDraft(key);
    if (!draft) return;
    if (isDraftMeaningful(draft)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingDraft(draft);
    } else {
      clearDraftStorage(key);
    }
  }, [enabled, key]);

  // Debounced write on state change
  useEffect(() => {
    if (!enabled) return;
    // Skip the very first pass so we don't re-write the draft we just read.
    if (!hasMountedRef.current) return;
    // Skip if a resume banner is pending — the form is still empty at this
    // point, and writing would overwrite the user's real draft with empty state.
    if (pendingDraft) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      writeDraft(key, { name, description, workouts });

      // Trigger the "Draft saved" indicator
      setSavedIndicatorVisible(true);
      if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
      indicatorTimerRef.current = setTimeout(() => {
        setSavedIndicatorVisible(false);
      }, INDICATOR_MS);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [enabled, key, name, description, workouts, pendingDraft]);

  // Cleanup indicator timer on unmount
  useEffect(() => {
    return () => {
      if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
    };
  }, []);

  const dismissBanner = useCallback(() => {
    setPendingDraft(null);
  }, []);

  const discardDraft = useCallback(() => {
    clearDraftStorage(key);
    setPendingDraft(null);
  }, [key]);

  const clearDraft = useCallback(() => {
    clearDraftStorage(key);
  }, [key]);

  return {
    pendingDraft,
    dismissBanner,
    discardDraft,
    clearDraft,
    savedIndicatorVisible,
  };
}
