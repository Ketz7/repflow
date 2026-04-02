"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import NotificationBell from "./NotificationBell";
import NotificationPanel from "./NotificationPanel";

export default function NotificationBar() {
  const [panelOpen, setPanelOpen] = useState(false);
  const pathname = usePathname();

  // Hide during active workout sessions (same guard as BottomNav)
  if (pathname.startsWith("/session")) return null;

  return (
    <>
      {/* Sticky top bar — z-40 sits below BottomNav (z-50) but above page content */}
      <div className="fixed top-0 left-0 right-0 z-40 h-11 flex items-center justify-end px-3 bg-background/60 backdrop-blur-xl border-b border-white/5">
        <NotificationBell onClick={() => setPanelOpen(true)} />
      </div>

      <NotificationPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
      />
    </>
  );
}
