import { prisma } from "@/lib/prisma";

export type CourseSummary = {
  id: string;
  title: string;
  playlistId: string;
  userId: string;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  totalUnits: number;
  completedUnits: number;
  completionPercentage: number;
  nextVideoId: string | null;
  nextChapterId?: string | null;
  nextVideoTitle?: string | null;
  lastWatchedSeconds?: number | null;
  lastActivityAt?: string | null;
  isChapterCourse: boolean;
};

export type DashboardTask = {
  courseId: string;
  courseTitle: string;
  videoTitle: string;
  videoId: string;
  videoOrder: number;
  remainingInCourse: number;
  totalUnits: number;
  completedUnits: number;
  completionPercentage: number;
  daysRemaining: number | null;
  isUrgent: boolean;
  lastWatchedSeconds: number | null;
};

export type RecentActivityItem = {
  id: string;
  title: string;
  videoId: string;
  courseId: string;
  courseTitle: string;
  updatedAt: string;
};

export type CourseDashboardData = {
  courses: CourseSummary[];
  currentTask: DashboardTask | null;
  recentActivity: RecentActivityItem[];
};

export type CourseSummaryCourseRow = {
  id: string;
  title: string;
  playlistId: string;
  userId: string;
  deadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CourseSummaryVideoRow = {
  id: string;
  title: string;
  courseId: string;
  order: number;
};

export type CourseSummaryChapterRow = {
  id: string;
  videoId: string;
  order: number;
  video: { courseId: string };
};

export type CourseSummaryCompletedVideoProgressRow = {
  videoId: string;
  updatedAt: Date;
  video: { courseId: string; order: number };
};

export type CourseSummaryAllVideoProgressRow = {
  videoId: string;
  updatedAt: Date;
  lastWatchedSeconds: number;
  video: { courseId: string };
};

export type CourseSummaryCompletedChapterProgressRow = {
  chapterId: string;
  chapter: {
    order: number;
    video: { courseId: string };
  };
};

export type CourseSummaryRecentProgressRow = {
  videoId: string;
  updatedAt: Date;
  video: {
    id: string;
    title: string;
    courseId: string;
    course: { title: string };
  };
};

export type BuildCourseDashboardDataInput = {
  courses: CourseSummaryCourseRow[];
  videos: CourseSummaryVideoRow[];
  chapters: CourseSummaryChapterRow[];
  completedVideoProgress: CourseSummaryCompletedVideoProgressRow[];
  allVideoProgress: CourseSummaryAllVideoProgressRow[];
  completedChapterProgress: CourseSummaryCompletedChapterProgressRow[];
  recentProgress: CourseSummaryRecentProgressRow[];
};

export function calculateDeadline(deadline: string | null, now = Date.now()) {
  if (!deadline) return { daysRemaining: null, isUrgent: false };
  const deadlineDate = new Date(deadline);
  const daysRemaining = Math.ceil(
    (deadlineDate.getTime() - now) / (1000 * 60 * 60 * 24)
  );
  return {
    daysRemaining,
    isUrgent: daysRemaining <= 3 && daysRemaining >= 0,
  };
}

function serializeCourseBase(course: CourseSummaryCourseRow) {
  return {
    ...course,
    deadline: course.deadline?.toISOString() ?? null,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
  };
}

export function buildCourseDashboardData(
  input: BuildCourseDashboardDataInput,
  options?: { now?: number }
): CourseDashboardData {
  const {
    courses,
    videos,
    chapters,
    completedVideoProgress,
    allVideoProgress,
    completedChapterProgress,
    recentProgress,
  } = input;

  if (courses.length === 0) {
    return { courses: [], currentTask: null, recentActivity: [] };
  }

  const videosByCourse = new Map<string, CourseSummaryVideoRow[]>();
  for (const video of videos) {
    const list = videosByCourse.get(video.courseId) ?? [];
    list.push(video);
    videosByCourse.set(video.courseId, list);
  }

  const chaptersByCourse = new Map<
    string,
    Array<{ id: string; videoId: string; order: number }>
  >();
  for (const chapter of chapters) {
    const courseId = chapter.video.courseId;
    const list = chaptersByCourse.get(courseId) ?? [];
    list.push({
      id: chapter.id,
      videoId: chapter.videoId,
      order: chapter.order,
    });
    chaptersByCourse.set(courseId, list);
  }

  const completedVideoIds = new Set(
    completedVideoProgress.map((progress) => progress.videoId)
  );
  const completedChapterIds = new Set(
    completedChapterProgress.map((progress) => progress.chapterId)
  );

  const latestProgressByCourse = new Map<
    string,
    { updatedAt: Date; lastWatchedSeconds: number; videoId: string }
  >();
  for (const progress of allVideoProgress) {
    const courseId = progress.video.courseId;
    const prev = latestProgressByCourse.get(courseId);
    if (!prev || progress.updatedAt > prev.updatedAt) {
      latestProgressByCourse.set(courseId, {
        updatedAt: progress.updatedAt,
        lastWatchedSeconds: progress.lastWatchedSeconds,
        videoId: progress.videoId,
      });
    }
  }

  const summaries = courses.map((course) => {
    const courseVideos = videosByCourse.get(course.id) ?? [];
    const courseChapters = chaptersByCourse.get(course.id) ?? [];
    const isChapterCourse =
      courseVideos.length === 1 && courseChapters.length > 0;

    const completedUnits = isChapterCourse
      ? courseChapters.filter((chapter) => completedChapterIds.has(chapter.id))
          .length
      : courseVideos.filter((video) => completedVideoIds.has(video.id)).length;

    const totalUnits = isChapterCourse
      ? courseChapters.length
      : courseVideos.length;

    const nextVideo = courseVideos.find(
      (video) => !completedVideoIds.has(video.id)
    ) ?? courseVideos[courseVideos.length - 1];

    const nextChapter = isChapterCourse
      ? courseChapters.find((chapter) => !completedChapterIds.has(chapter.id)) ??
        courseChapters[courseChapters.length - 1]
      : null;

    const latestProgress = latestProgressByCourse.get(course.id);

    return {
      ...serializeCourseBase(course),
      totalUnits,
      completedUnits,
      completionPercentage:
        totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0,
      nextVideoId: nextVideo?.id ?? null,
      nextChapterId: nextChapter?.id ?? null,
      nextVideoTitle: nextVideo?.title ?? null,
      lastWatchedSeconds: latestProgress?.lastWatchedSeconds ?? null,
      lastActivityAt: latestProgress?.updatedAt.toISOString() ?? null,
      isChapterCourse,
    } satisfies CourseSummary;
  });

  const recentActivity = recentProgress.map((progress) => ({
    id: progress.video.id,
    title: progress.video.title,
    videoId: progress.video.id,
    courseId: progress.video.courseId,
    courseTitle: progress.video.course.title,
    updatedAt: progress.updatedAt.toISOString(),
  }));

  const incompleteCourseIds = new Set(
    summaries
      .filter((course) => course.completionPercentage < 100)
      .map((course) => course.id)
  );
  const activeCourseId =
    recentProgress.find((progress) =>
      incompleteCourseIds.has(progress.video.courseId)
    )?.video.courseId ??
    summaries.find((course) => course.completionPercentage < 100)?.id ??
    recentProgress[0]?.video.courseId ??
    summaries[0]?.id;
  const activeSummary = summaries.find((course) => course.id === activeCourseId);
  const activeVideos = activeCourseId
    ? videosByCourse.get(activeCourseId) ?? []
    : [];
  const activeNextVideo = activeSummary?.nextVideoId
    ? activeVideos.find((video) => video.id === activeSummary.nextVideoId)
    : null;

  let currentTask: DashboardTask | null = null;
  if (activeSummary && activeNextVideo) {
    const deadline = calculateDeadline(activeSummary.deadline, options?.now);
    currentTask = {
      courseId: activeSummary.id,
      courseTitle: activeSummary.title,
      videoTitle: activeNextVideo.title,
      videoId: activeNextVideo.id,
      videoOrder: activeNextVideo.order,
      remainingInCourse: Math.max(
        activeSummary.totalUnits - activeSummary.completedUnits,
        0
      ),
      totalUnits: activeSummary.totalUnits,
      completedUnits: activeSummary.completedUnits,
      completionPercentage: activeSummary.completionPercentage,
      daysRemaining: deadline.daysRemaining,
      isUrgent: deadline.isUrgent,
      lastWatchedSeconds: activeSummary.lastWatchedSeconds ?? null,
    };
  }

  return {
    courses: summaries,
    currentTask,
    recentActivity: recentActivity.filter(
      (activity) => activity.videoId !== currentTask?.videoId
    ),
  };
}

export async function getCourseDashboardData(
  userId: string
): Promise<CourseDashboardData> {
  const courses = await prisma.course.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      playlistId: true,
      userId: true,
      deadline: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  if (courses.length === 0) {
    return { courses: [], currentTask: null, recentActivity: [] };
  }

  const courseIds = courses.map((course) => course.id);

  const [
    videos,
    chapters,
    completedVideoProgress,
    allVideoProgress,
    completedChapterProgress,
    recentProgress,
  ] = await Promise.all([
    prisma.video.findMany({
      where: { courseId: { in: courseIds } },
      select: { id: true, title: true, courseId: true, order: true },
      orderBy: [{ courseId: "asc" }, { order: "asc" }],
    }),
    prisma.chapter.findMany({
      where: { video: { courseId: { in: courseIds } } },
      select: {
        id: true,
        videoId: true,
        order: true,
        video: { select: { courseId: true } },
      },
      orderBy: [{ videoId: "asc" }, { order: "asc" }],
    }),
    prisma.videoProgress.findMany({
      where: {
        userId,
        completed: true,
        video: { courseId: { in: courseIds } },
      },
      select: {
        videoId: true,
        updatedAt: true,
        video: { select: { courseId: true, order: true } },
      },
    }),
    prisma.videoProgress.findMany({
      where: { userId, video: { courseId: { in: courseIds } } },
      select: {
        videoId: true,
        updatedAt: true,
        lastWatchedSeconds: true,
        video: { select: { courseId: true } },
      },
    }),
    prisma.chapterProgress.findMany({
      where: {
        userId,
        completed: true,
        chapter: { video: { courseId: { in: courseIds } } },
      },
      select: {
        chapterId: true,
        chapter: {
          select: {
            order: true,
            video: { select: { courseId: true } },
          },
        },
      },
    }),
    prisma.videoProgress.findMany({
      where: { userId, video: { courseId: { in: courseIds } } },
      select: {
        videoId: true,
        updatedAt: true,
        video: {
          select: {
            id: true,
            title: true,
            courseId: true,
            course: { select: { title: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
  ]);

  return buildCourseDashboardData({
    courses,
    videos,
    chapters,
    completedVideoProgress,
    allVideoProgress,
    completedChapterProgress,
    recentProgress,
  });
}
