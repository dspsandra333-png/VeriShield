import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../api/client.js";

export const WakeBanner: React.FC = () => {
  const [isWaking, setIsWaking] = useState<boolean>(false);
  const [attempts, setAttempts] = useState<number>(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let count = 0;
    const maxAttempts = 30; // 30 * 3s = 90 seconds

    const pingHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`${API_BASE_URL}/api/health`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          setIsWaking(false);
          return;
        }
      } catch {
        // Server might be sleeping
      }

      count++;
      setAttempts(count);
      if (count >= 1 && count <= maxAttempts) {
        setIsWaking(true);
        timer = setTimeout(pingHealth, 3000);
      } else {
        setIsWaking(false);
      }
    };

    pingHealth();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!isWaking) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-500/20 border-b border-amber-500/40 text-amber-200 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2"
    >
      <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
      <span>
        Waking up the server (Render free servers sleep on idle)... Attempt {attempts} of 30.
      </span>
    </div>
  );
};
