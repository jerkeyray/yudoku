import { describe, expect, it } from "vitest";
import { shouldSaveProgress } from "@/lib/progress-save";

describe("shouldSaveProgress", () => {
  it("saves the first progress write", () => {
    expect(
      shouldSaveProgress({ previous: null, videoId: "v1", seconds: 5 })
    ).toBe(true);
  });

  it("skips small movement on the same video", () => {
    expect(
      shouldSaveProgress({
        previous: { videoId: "v1", seconds: 10, savedAt: 1 },
        videoId: "v1",
        seconds: 19,
      })
    ).toBe(false);
  });

  it("saves movement at or above the minimum delta", () => {
    expect(
      shouldSaveProgress({
        previous: { videoId: "v1", seconds: 10, savedAt: 1 },
        videoId: "v1",
        seconds: 20,
      })
    ).toBe(true);
  });

  it("saves on video switch", () => {
    expect(
      shouldSaveProgress({
        previous: { videoId: "v1", seconds: 10, savedAt: 1 },
        videoId: "v2",
        seconds: 11,
      })
    ).toBe(true);
  });

  it("saves forced writes from pause or unload", () => {
    expect(
      shouldSaveProgress({
        previous: { videoId: "v1", seconds: 10, savedAt: 1 },
        videoId: "v1",
        seconds: 11,
        force: true,
      })
    ).toBe(true);
  });
});
