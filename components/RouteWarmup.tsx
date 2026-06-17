"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const warmRoutes = [
  "/home",
  "/home/mycourses",
  "/home/bookmarks",
  "/home/moments",
  "/home/profile",
  "/home/courses/create",
];

export function RouteWarmup() {
  const router = useRouter();

  useEffect(() => {
    const warm = () => {
      for (const route of warmRoutes) {
        router.prefetch(route);
      }
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(warm, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }

    const id = globalThis.setTimeout(warm, 1200);
    return () => globalThis.clearTimeout(id);
  }, [router]);

  return null;
}
