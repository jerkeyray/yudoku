export type ProgressSaveSnapshot = {
  videoId: string;
  seconds: number;
  savedAt: number;
} | null;

export function shouldSaveProgress(input: {
  previous: ProgressSaveSnapshot;
  videoId: string;
  seconds: number;
  force?: boolean;
  minDeltaSeconds?: number;
}) {
  const minDeltaSeconds = input.minDeltaSeconds ?? 10;

  if (input.force) return true;
  if (!input.previous) return true;
  if (input.previous.videoId !== input.videoId) return true;

  return Math.abs(input.seconds - input.previous.seconds) >= minDeltaSeconds;
}
