"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Extend the Navigator interface for iOS-specific property
interface IOSNavigator extends Navigator {
  standalone?: boolean;
}

// Extend Window for beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Don't show if already dismissed or installed
    if (localStorage.getItem("repflow_install_dismissed")) return;

    const nav = navigator as IOSNavigator;

    // Already running as installed PWA — no need to prompt
    if (nav.standalone || window.matchMedia("(display-mode: standalone)").matches) return;

    const ua = navigator.userAgent.toLowerCase();
    const isIOS =
      /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(ua);

    if (isIOS) {
      // iOS: show custom prompt after a short delay
      setPlatform("ios");
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }

    if (isAndroid) {
      // Android: listen for the native install prompt event
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setPlatform("android");
        setShow(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShow(false);
    // Don't show again for 7 days
    localStorage.setItem(
      "repflow_install_dismissed",
      (Date.now() + 7 * 24 * 60 * 60 * 1000).toString()
    );
  }, []);

  // Check if dismissal has expired
  useEffect(() => {
    const expiry = localStorage.getItem("repflow_install_dismissed");
    if (expiry && Date.now() > parseInt(expiry, 10)) {
      localStorage.removeItem("repflow_install_dismissed");
    }
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 200, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-24 left-4 right-4 z-[60] mx-auto max-w-md"
        >
          <div className="relative overflow-hidden rounded-2xl bg-white/[0.07] backdrop-blur-xl border border-white/10 shadow-2xl p-5">
            {/* Glow accent */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-accent/20 rounded-full blur-3xl" />

            <div className="relative">
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="w-5 h-5 text-primary"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 18v-6m0 0V6m0 6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Install RepFlow
                  </h3>
                  <p className="text-xs text-subtext">
                    Add to your home screen for the full experience
                  </p>
                </div>
              </div>

              {platform === "ios" ? (
                /* iOS instructions */
                <div className="space-y-2.5 mb-4">
                  <div className="flex items-center gap-3 text-sm text-foreground/80">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    <span className="flex items-center gap-1.5">
                      Tap the{" "}
                      {/* iOS Share icon */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        className="w-4 h-4 text-primary inline"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 4v12m0-12L8 8m4-4l4 4M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4"
                        />
                      </svg>{" "}
                      <strong>Share</strong> button below
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-foreground/80">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    <span className="flex items-center gap-1.5">
                      Scroll down, tap{" "}
                      <strong>&quot;Add to Home Screen&quot;</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-foreground/80">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
                      3
                    </span>
                    <span>
                      Tap <strong>&quot;Add&quot;</strong> to confirm
                    </span>
                  </div>
                </div>
              ) : (
                /* Android prompt */
                <div className="mb-4">
                  <p className="text-sm text-foreground/70">
                    Get quick access, offline support, and a full-screen
                    experience.
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-subtext hover:text-foreground transition-colors"
                >
                  Not now
                </button>
                {platform === "android" && deferredPrompt ? (
                  <button
                    onClick={handleInstall}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-background hover:bg-primary/90 transition-colors"
                  >
                    Install
                  </button>
                ) : (
                  <button
                    onClick={handleDismiss}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                  >
                    Got it
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
