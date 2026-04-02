"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import TermsOfService, { TOS_VERSION } from "./TermsOfService";
import CoachingWaiver, { COACHING_WAIVER_VERSION } from "./CoachingWaiver";

interface AgreementModalProps {
  type: "tos" | "coaching_waiver";
  onAccepted: () => void;
  onDeclined?: () => void;
}

export default function AgreementModal({ type, onAccepted, onDeclined }: AgreementModalProps) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const version = type === "tos" ? TOS_VERSION : COACHING_WAIVER_VERSION;

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 40) {
      setScrolledToBottom(true);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("user_agreements").insert({
      user_id: user.id,
      document_type: type,
      document_version: version,
    });

    setAccepting(false);
    onAccepted();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-lg max-h-[85vh] bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col"
        >
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">
              {type === "tos" ? "Terms of Service" : "Coaching Services Waiver"}
            </h2>
            <p className="text-xs text-subtext mt-1">
              Please read and scroll to the bottom to accept
            </p>
          </div>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4"
          >
            {type === "tos" ? <TermsOfService /> : <CoachingWaiver />}
          </div>

          <div className="p-4 border-t border-border flex gap-3">
            {onDeclined && (
              <Button variant="secondary" className="flex-1" onClick={onDeclined}>
                Decline
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={!scrolledToBottom || accepting}
            >
              {!scrolledToBottom
                ? "Scroll to accept"
                : accepting
                ? "Accepting..."
                : "I Accept"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
