import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  userActivity: { findMany: vi.fn() },
  course: { findMany: vi.fn() },
  chapter: { findMany: vi.fn() },
  chapterProgress: { findMany: vi.fn() },
  video: { count: vi.fn() },
  videoProgress: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
  },
  certificate: {
    findMany: vi.fn(),
    createMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

describe("getProfileData certificate backfill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates missing certificates before loading profile certificate data", async () => {
    const { getProfileData } = await import("@/lib/data/profile");
    const createdAt = new Date("2026-01-01T00:00:00.000Z");

    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "User",
      email: "user@example.com",
      image: null,
      bio: null,
      createdAt,
    });
    prismaMock.course.findMany.mockResolvedValue([
      { id: "course-1", _count: { videos: 2 } },
    ]);
    prismaMock.chapter.findMany.mockResolvedValue([]);
    prismaMock.videoProgress.findMany
      .mockResolvedValueOnce([
        { video: { courseId: "course-1" } },
        { video: { courseId: "course-1" } },
      ])
      .mockResolvedValueOnce([]);
    prismaMock.chapterProgress.findMany.mockResolvedValue([]);
    prismaMock.certificate.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "cert-1",
          courseId: "course-1",
          createdAt,
          course: {
            id: "course-1",
            title: "Course 1",
            _count: { videos: 2 },
          },
        },
      ]);
    prismaMock.certificate.createMany.mockResolvedValue({ count: 1 });
    prismaMock.userActivity.findMany.mockResolvedValue([]);
    prismaMock.videoProgress.findFirst.mockResolvedValue(null);

    const result = await getProfileData("user-1");

    expect(prismaMock.certificate.createMany).toHaveBeenCalledWith({
      data: [{ userId: "user-1", courseId: "course-1" }],
      skipDuplicates: true,
    });
    expect(
      prismaMock.certificate.createMany.mock.invocationCallOrder[0]
    ).toBeLessThan(
      prismaMock.certificate.findMany.mock.invocationCallOrder[1]
    );
    expect(result?.stats.coursesCompleted).toBe(1);
  });
});
