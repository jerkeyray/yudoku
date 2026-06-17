import { describe, expect, it } from "vitest";
import {
  getMissingCertificateCourseIds,
  isCourseCompleteFromCounts,
} from "@/lib/data/certificates";

describe("certificate completion helpers", () => {
  it("detects complete and incomplete unit counts", () => {
    expect(
      isCourseCompleteFromCounts({ totalUnits: 2, completedUnits: 2 })
    ).toBe(true);
    expect(
      isCourseCompleteFromCounts({ totalUnits: 2, completedUnits: 1 })
    ).toBe(false);
    expect(
      isCourseCompleteFromCounts({ totalUnits: 0, completedUnits: 0 })
    ).toBe(false);
  });

  it("returns missing playlist certificates only for complete uncertified courses", () => {
    expect(
      getMissingCertificateCourseIds({
        courses: [
          { id: "complete", totalVideos: 2 },
          { id: "incomplete", totalVideos: 2 },
          { id: "certified", totalVideos: 1 },
        ],
        chapterCountByCourse: new Map(),
        completedVideoCountByCourse: new Map([
          ["complete", 2],
          ["incomplete", 1],
          ["certified", 1],
        ]),
        completedChapterCountByCourse: new Map(),
        certifiedCourseIds: new Set(["certified"]),
      })
    ).toEqual(["complete"]);
  });

  it("uses chapter counts for single-video chapter courses", () => {
    expect(
      getMissingCertificateCourseIds({
        courses: [
          { id: "chapter-complete", totalVideos: 1 },
          { id: "chapter-incomplete", totalVideos: 1 },
        ],
        chapterCountByCourse: new Map([
          ["chapter-complete", 3],
          ["chapter-incomplete", 3],
        ]),
        completedVideoCountByCourse: new Map(),
        completedChapterCountByCourse: new Map([
          ["chapter-complete", 3],
          ["chapter-incomplete", 2],
        ]),
        certifiedCourseIds: new Set(),
      })
    ).toEqual(["chapter-complete"]);
  });
});
