"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-renders the current server page periodically (used for polling live updates). */
export function AutoRefresh({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
