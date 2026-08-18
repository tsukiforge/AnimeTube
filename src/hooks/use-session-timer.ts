/**
 * use-session-timer
 * ─────────────────
 * Tracks how long the user has been on the website in the current session.
 * Timer lives in memory only — resets to 0 when tab is closed or refreshed.
 *
 * At 5 hours (18000 seconds) → fires a support toast with Saweria & Sozibuzz links.
 * Toast fires only once per session.
 */

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const THRESHOLD_SECS = 5 * 60 * 60; // 5 hours

const Tako = "https://tako.id/c/SiMahiro";

// In-memory counter — shared across hook instances but only one instance runs (root)
let sessionSeconds = 0;
let supportFired   = false;

function fireSupportToast() {
  // Toast 1 — main CTA
  toast("Suka AnimeTube? ❤️", {
    description: "Kamu sudah 5 jam di sini! Bantu kami tetap online dengan support kecil-kecilan 🙏",
    duration: 15000,
    action: {
      label: "🌸 Saweria",
      onClick: () => window.open(Tako, "_blank", "noopener,noreferrer"),
    }
  });
}

export function useSessionTimer() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Reset in-memory counter on fresh mount (new session)
    sessionSeconds = 0;
    supportFired   = false;

    intervalRef.current = setInterval(() => {
      sessionSeconds += 1;

      if (!supportFired && sessionSeconds >= THRESHOLD_SECS) {
        supportFired = true;
        fireSupportToast();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
