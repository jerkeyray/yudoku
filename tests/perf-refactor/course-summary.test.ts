import { describe, expect, it } from "vitest";
import {
  buildCourseDashboardData,
  type BuildCourseDashboardDataInput,
  type CourseSummaryCourseRow,
} from "@/lib/data/course-summary";

const now = Date.UTC(2026, 0, 10);
const baseDate = new Date(now);

function course(
  id: string,
  overrides: Partial<CourseSummaryCourseRow> = {}
): CourseSummaryCourseRow {
  return {
    id,
    title: `Course ${id}`,
    playlistId: `playlist-${id}`,
    userId: "user-1",
    deadline: null,
    createdAt: baseDate,
    updatedAt: baseDate,
    ...overrides,
  };
}

function build(input: Partial<BuildCourseDashboardDataInput>) {
  return buildCourseDashboardData(
    {
      courses: [],
      videos: [],
      chapters: [],
      completedVideoProgress: [],
      allVideoProgress: [],
      completedChapterProgress: [],
      recentProgress: [],
      ...input,
    },
    { now }
  );
}

describe("buildCourseDashboardData", () => {
  it("returns empty dashboard data when there are no courses", () => {
    expect(build({})).toEqual({
      courses: [],
      currentTask: null,
      recentActivity: [],
    });
  });

  it("selects the first lesson for an unstarted course", () => {
    const result = build({
      courses: [course("c1")],
      videos: [
        { id: "v1", title: "Intro", courseId: "c1", order: 0 },
        { id: "v2", title: "Next", courseId: "c1", order: 1 },
      ],
    });

    expect(result.courses[0]).toMatchObject({
      totalUnits: 2,
      completedUnits: 0,
      completionPercentage: 0,
      nextVideoId: "v1",
    });
    expect(result.currentTask).toMatchObject({
      courseId: "c1",
      videoId: "v1",
      remainingInCourse: 2,
    });
  });

  it("summarizes a partially completed playlist course", () => {
    const result = build({
      courses: [course("c1")],
      videos: [
        { id: "v1", title: "Intro", courseId: "c1", order: 0 },
        { id: "v2", title: "Next", courseId: "c1", order: 1 },
      ],
      completedVideoProgress: [
        {
          videoId: "v1",
          updatedAt: baseDate,
          video: { courseId: "c1", order: 0 },
        },
      ],
      allVideoProgress: [
        {
          videoId: "v1",
          updatedAt: baseDate,
          lastWatchedSeconds: 42,
          video: { courseId: "c1" },
        },
      ],
    });

    expect(result.courses[0]).toMatchObject({
      totalUnits: 2,
      completedUnits: 1,
      completionPercentage: 50,
      nextVideoId: "v2",
      lastWatchedSeconds: 42,
    });
  });

  it("falls back from a completed recent course to an incomplete course", () => {
    const result = build({
      courses: [course("done"), course("open")],
      videos: [
        { id: "done-v1", title: "Done", courseId: "done", order: 0 },
        { id: "open-v1", title: "Open", courseId: "open", order: 0 },
      ],
      completedVideoProgress: [
        {
          videoId: "done-v1",
          updatedAt: new Date(now - 1000),
          video: { courseId: "done", order: 0 },
        },
      ],
      recentProgress: [
        {
          videoId: "done-v1",
          updatedAt: new Date(now),
          video: {
            id: "done-v1",
            title: "Done",
            courseId: "done",
            course: { title: "Done Course" },
          },
        },
      ],
    });

    expect(result.courses.find((c) => c.id === "done")).toMatchObject({
      completionPercentage: 100,
    });
    expect(result.currentTask).toMatchObject({
      courseId: "open",
      videoId: "open-v1",
    });
  });

  it("still returns a review task when all courses are complete", () => {
    const result = build({
      courses: [course("done")],
      videos: [{ id: "v1", title: "Done", courseId: "done", order: 0 }],
      completedVideoProgress: [
        {
          videoId: "v1",
          updatedAt: baseDate,
          video: { courseId: "done", order: 0 },
        },
      ],
      recentProgress: [
        {
          videoId: "v1",
          updatedAt: baseDate,
          video: {
            id: "v1",
            title: "Done",
            courseId: "done",
            course: { title: "Done Course" },
          },
        },
      ],
    });

    expect(result.currentTask).toMatchObject({
      courseId: "done",
      remainingInCourse: 0,
      completionPercentage: 100,
    });
  });

  it("uses chapter progress for single-video chapter courses", () => {
    const result = build({
      courses: [course("chapters")],
      videos: [
        { id: "v1", title: "Long video", courseId: "chapters", order: 0 },
      ],
      chapters: [
        {
          id: "ch1",
          videoId: "v1",
          order: 0,
          video: { courseId: "chapters" },
        },
        {
          id: "ch2",
          videoId: "v1",
          order: 1,
          video: { courseId: "chapters" },
        },
      ],
      completedChapterProgress: [
        {
          chapterId: "ch1",
          chapter: { order: 0, video: { courseId: "chapters" } },
        },
      ],
    });

    expect(result.courses[0]).toMatchObject({
      isChapterCourse: true,
      totalUnits: 2,
      completedUnits: 1,
      completionPercentage: 50,
      nextVideoId: "v1",
      nextChapterId: "ch2",
    });
  });

  it("calculates due-soon and overdue deadline state", () => {
    const dueSoon = build({
      courses: [
        course("soon", { deadline: new Date(now + 2 * 24 * 60 * 60 * 1000) }),
      ],
      videos: [{ id: "v1", title: "Soon", courseId: "soon", order: 0 }],
    });
    const overdue = build({
      courses: [
        course("late", { deadline: new Date(now - 24 * 60 * 60 * 1000) }),
      ],
      videos: [{ id: "v2", title: "Late", courseId: "late", order: 0 }],
    });

    expect(dueSoon.currentTask).toMatchObject({
      daysRemaining: 2,
      isUrgent: true,
    });
    expect(overdue.currentTask).toMatchObject({
      daysRemaining: -1,
      isUrgent: false,
    });
  });
});
