"use client";

import { useEffect } from "react";

export default function TimezoneDetector() {
  useEffect(() => {
    try {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const currentCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("user-timezone="))
        ?.split("=")[1];

      if (currentCookie !== detectedTimezone) {
        // Set timezone cookie with 365 day expiry
        document.cookie = `user-timezone=${detectedTimezone}; path=/; max-age=${
          365 * 24 * 60 * 60
        }; samesite=lax`;

        // Only reload if this is not the initial page load
        if (currentCookie) {
          window.location.reload();
        }
      }
    } catch (error) {
      console.warn("Failed to detect timezone:", error);
    }
  }, []);

  return null;
}
