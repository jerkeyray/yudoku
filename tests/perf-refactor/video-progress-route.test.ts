import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  video: { findFirst: vi.fn(), count: vi.fn() },
  videoProgress: { upsert: vi.fn(), count: vi.fn() },
  userActivity: { upsert: vi.fn() },
  certificate: { upsert: vi.fn() },
}));

const authMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/auth-compat", () => ({
  auth: authMock,
}));

describe("video progress route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses count-based activity and certificate writes on completion", async () => {
    const { POST } = await import("@/app/api/videos/[videoId]/progress/route");

    authMock.mockResolvedValue({ userId: "user-1" });
    prismaMock.video.findFirst.mockResolvedValue({
      id: "video-1",
      courseId: "course-1",
    });
    prismaMock.videoProgress.upsert.mockResolvedValue({
      id: "progress-1",
      userId: "user-1",
      videoId: "video-1",
      completed: true,
    });
    prismaMock.userActivity.upsert.mockResolvedValue({});
    prismaMock.video.count.mockResolvedValue(2);
    prismaMock.videoProgress.count.mockResolvedValue(2);
    prismaMock.certificate.upsert.mockResolvedValue({});

    const response = await POST(
      new Request("http://yudoku.test/api/videos/video-1/progress", {
        method: "POST",
        body: JSON.stringify({ completed: true }),
      }),
      { params: Promise.resolve({ videoId: "video-1" }) }
    );

    expect(response.status).toBe(200);
    expect(prismaMock.video.findFirst).toHaveBeenCalledWith({
      where: { id: "video-1", course: { userId: "user-1" } },
      select: { id: true, courseId: true },
    });
    expect(prismaMock.userActivity.upsert).toHaveBeenCalled();
    expect(prismaMock.video.count).toHaveBeenCalledWith({
      where: { courseId: "course-1" },
    });
    expect(prismaMock.videoProgress.count).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        completed: true,
        video: { courseId: "course-1" },
      },
    });
    expect(prismaMock.certificate.upsert).toHaveBeenCalledWith({
      where: {
        userId_courseId: { userId: "user-1", courseId: "course-1" },
      },
      update: {},
      create: { userId: "user-1", courseId: "course-1" },
    });
  });
});
