import { NextResponse } from "next/server";

type TimingEntry = {
  name: string;
  durationMs: number;
};

export class ServerTimer {
  private readonly start = performance.now();
  private readonly entries: TimingEntry[] = [];

  async time<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startedAt = performance.now();
    try {
      return await fn();
    } finally {
      this.entries.push({
        name,
        durationMs: performance.now() - startedAt,
      });
    }
  }

  headers(payload?: unknown): HeadersInit {
    const totalMs = performance.now() - this.start;
    const entries = [
      ...this.entries,
      { name: "total", durationMs: totalMs },
    ];
    const headers: Record<string, string> = {
      "Server-Timing": entries
        .map((entry) => `${entry.name};dur=${entry.durationMs.toFixed(1)}`)
        .join(", "),
    };

    if (payload !== undefined) {
      headers["X-Response-Bytes"] = String(
        Buffer.byteLength(JSON.stringify(payload))
      );
    }

    if (process.env.NODE_ENV === "development" && totalMs > 500) {
      console.warn(
        `[perf] slow request ${totalMs.toFixed(1)}ms`,
        entries.map((entry) => `${entry.name}=${entry.durationMs.toFixed(1)}ms`)
      );
    }

    return headers;
  }
}

export function timedJson<T>(
  payload: T,
  timer: ServerTimer,
  init?: ResponseInit
) {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      ...init?.headers,
      ...timer.headers(payload),
    },
  });
}
