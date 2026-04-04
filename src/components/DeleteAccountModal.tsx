"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

interface Props {
  onClose: () => void;
  onDeleted: () => void;
}

const DELETED_LIST = [
  "Profile, name & avatar",
  "All workout sessions & logged sets",
  "Training phases & schedules",
  "Body weight & composition logs",
  "Nutrition & step logs",
  "Notifications history",
  "Push notification subscriptions",
  "Coach relationship & messages",
];

const KEPT_LIST = [
  "Programs you created (become unclaimed templates)",
  "Exercises you submitted (author name removed)",
];

export default function DeleteAccountModal({ onClose, onDeleted }: Props) {
  const [step, setStep] = useState<"warn" | "confirm">("warn");
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = typed.trim() === "DELETE";

  const handleDelete = async () => {
    if (!canDelete || deleting) return;
    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("delete_account");
    if (rpcError) {
      setError("Something went wrong. Please try again or contact support.");
      setDeleting(false);
      return;
    }
    await supabase.auth.signOut();
    onDeleted();
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-[70]"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        key="sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-3xl bg-surface border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-6 pb-2 pt-3 max-h-[88vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* ── Step 1: Warning ── */}
            {step === "warn" && (
              <motion.div
                key="warn"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Icon + title */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-error/15 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-error">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-error">Delete Account</h2>
                    <p className="text-xs text-subtext">This cannot be undone.</p>
                  </div>
                </div>

                {/* What gets deleted */}
                <div className="rounded-2xl bg-error/8 border border-error/20 p-4 mb-3">
                  <p className="text-xs font-semibold text-error uppercase tracking-wide mb-2">Permanently deleted</p>
                  <div className="space-y-1.5">
                    {DELETED_LIST.map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-error shrink-0 mt-0.5">
                          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                        </svg>
                        <span className="text-xs text-foreground/80">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* What's kept */}
                <div className="rounded-2xl bg-success/8 border border-success/20 p-4 mb-5">
                  <p className="text-xs font-semibold text-success uppercase tracking-wide mb-2">Kept for the community</p>
                  <div className="space-y-1.5">
                    {KEPT_LIST.map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-success shrink-0 mt-0.5">
                          <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs text-foreground/80">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3.5 rounded-2xl border border-white/10 text-subtext text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setStep("confirm")}
                    className="flex-1 py-3.5 rounded-2xl bg-error/15 border border-error/30 text-error text-sm font-semibold"
                  >
                    Continue →
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Type confirmation ── */}
            {step === "confirm" && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  onClick={() => setStep("warn")}
                  className="flex items-center gap-1 text-xs text-subtext mb-4 -ml-0.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                  </svg>
                  Back
                </button>

                <h2 className="text-lg font-bold text-foreground mb-1">Are you absolutely sure?</h2>
                <p className="text-sm text-subtext mb-6">
                  All your personal data will be deleted immediately and permanently. Type{" "}
                  <span className="font-mono font-bold text-error">DELETE</span>{" "}
                  in the box below to confirm.
                </p>

                <div className="mb-4">
                  <input
                    type="text"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder="Type DELETE here"
                    autoCapitalize="characters"
                    className={`w-full px-4 py-3.5 rounded-xl border text-sm font-mono transition-colors bg-surface focus:outline-none ${
                      typed.length === 0
                        ? "border-border text-foreground"
                        : canDelete
                        ? "border-error bg-error/8 text-error"
                        : "border-warning/40 text-foreground"
                    }`}
                  />
                  {typed.length > 0 && !canDelete && (
                    <p className="text-xs text-subtext mt-1.5 ml-1">
                      Keep typing — must match <span className="font-mono text-error">DELETE</span> exactly
                    </p>
                  )}
                </div>

                {error && (
                  <p className="text-xs text-error mb-3 text-center">{error}</p>
                )}

                <motion.button
                  onClick={handleDelete}
                  disabled={!canDelete || deleting}
                  animate={canDelete ? { scale: [1, 1.02, 1] } : {}}
                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1.5 }}
                  className={`w-full py-4 rounded-2xl font-bold text-sm transition-all ${
                    canDelete
                      ? "bg-error text-white shadow-[0_4px_20px_rgba(239,68,68,0.4)]"
                      : "bg-white/5 text-subtext cursor-not-allowed"
                  }`}
                >
                  {deleting ? "Deleting everything..." : "Permanently Delete My Account"}
                </motion.button>

                <p className="text-[11px] text-subtext/60 text-center mt-3">
                  This action is immediate and irreversible. There is no recovery.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
