"use client";

import { useState, useEffect } from "react";
import {
  getPushSupport,
  getCurrentPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
} from "@/lib/push-notifications";

interface Props {
  userId: string;
}

export default function PushNotificationToggle({ userId }: Props) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<string>("default");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const { supported: s } = getPushSupport();
    setSupported(s);
    if (!s) { setLoading(false); return; }

    Promise.all([getCurrentPushPermission(), isSubscribed()]).then(([perm, sub]) => {
      setPermission(perm);
      setSubscribed(sub);
      setLoading(false);
    });
  }, []);

  if (!supported) return null; // Hide entirely if push isn't available

  const handleToggle = async () => {
    setWorking(true);
    if (subscribed) {
      await unsubscribeFromPush(userId);
      setSubscribed(false);
      setPermission(Notification.permission);
    } else {
      const ok = await subscribeToPush(userId);
      setSubscribed(ok);
      setPermission(Notification.permission);
    }
    setWorking(false);
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-foreground">Push Notifications</p>
        <p className="text-xs text-subtext mt-0.5">
          {permission === "denied"
            ? "Blocked in browser settings — enable in site permissions"
            : subscribed
            ? "You'll get notified about coach messages and milestones"
            : "Get notified even when the app is closed"}
        </p>
      </div>

      {permission === "denied" ? (
        <div className="text-xs text-error/70 font-medium shrink-0">Blocked</div>
      ) : loading ? (
        <div className="w-11 h-6 rounded-full bg-surface animate-pulse shrink-0" />
      ) : (
        <button
          onClick={handleToggle}
          disabled={working}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
            subscribed ? "bg-primary" : "bg-white/10"
          } ${working ? "opacity-50" : ""}`}
          aria-label={subscribed ? "Disable push notifications" : "Enable push notifications"}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              subscribed ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      )}
    </div>
  );
}
