import { prisma } from "@/lib/prisma";
import { subDays, isSameDay } from "date-fns";

interface UserActivity {
  id: string;
  userId: string;
  date: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface VideoProgress {
  id: string;
  userId: string;
  videoId: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  video: {
    id: string;
    title: string;
    courseId: string;
    durationSeconds: number;
  };
}

export async function getProfileData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      bio: true,
      createdAt: true,
    },
  });

  if (!user) {
    return null;
  }

  await createMissingCertificatesForUser(userId);

  const [activities, certificates, completedProgress, recentProgress] =
    await Promise.all([
      prisma.userActivity.findMany({
        where: { userId },
        orderBy: { date: "asc" },
      }),
      prisma.certificate.findMany({
        where: { userId },
        select: {
          id: true,
          courseId: true,
          createdAt: true,
          course: {
            select: {
              id: true,
              title: true,
              _count: { select: { videos: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.videoProgress.findMany({
        where: { userId, completed: true },
        select: {
          id: true,
          userId: true,
          videoId: true,
          completed: true,
          createdAt: true,
          updatedAt: true,
          video: {
            select: {
              id: true,
              title: true,
              courseId: true,
              durationSeconds: true,
            },
          },
        },
      }),
      prisma.videoProgress.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: {
          updatedAt: true,
          video: {
            select: {
              courseId: true,
              course: { select: { id: true, title: true } },
            },
          },
        },
      }),
    ]);

  const currentStreak = calculateCurrentStreak(activities);
  const longestStreak = calculateLongestStreak(activities);
  const coursesCompleted = certificates.length;
  const totalWatchTime = calculateTotalWatchTime(completedProgress);
  let activeCourse = null;
  let lastStudied = null;

  if (recentProgress) {
    lastStudied = recentProgress.updatedAt.toISOString();
    const courseId = recentProgress.video.courseId;
    const [totalVideos, completedVideos] = await Promise.all([
      prisma.video.count({ where: { courseId } }),
      prisma.videoProgress.count({
        where: {
          userId,
          completed: true,
          video: { courseId },
        },
      }),
    ]);
    const progressPercentage =
      totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

    activeCourse = {
      id: recentProgress.video.course.id,
      title: recentProgress.video.course.title,
      progress: progressPercentage,
      totalVideos,
      completedVideos,
      lastWatched: recentProgress.updatedAt.toISOString(),
    };
  }

  const completedSecondsByCourse = new Map<string, number>();
  for (const progress of completedProgress) {
    const previous = completedSecondsByCourse.get(progress.video.courseId) ?? 0;
    completedSecondsByCourse.set(
      progress.video.courseId,
      previous + progress.video.durationSeconds
    );
  }

  const completedCourses = certificates.map((certificate) => {
    const totalSeconds =
      completedSecondsByCourse.get(certificate.courseId) ||
      certificate.course._count.videos * 15 * 60;
    return {
      id: certificate.course.id,
      title: certificate.course.title,
      completedAt: certificate.createdAt.toISOString(),
      totalHours: Math.round(totalSeconds / 3600),
      totalVideos: certificate.course._count.videos,
    };
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      bio: user.bio,
      createdAt: user.createdAt.toISOString(),
    },
    stats: {
      currentStreak,
      longestStreak,
      coursesCompleted,
      totalWatchTime,
      lastStudied,
    },
    activeCourse,
    completedCourses,
    activities: activities.map((a) => ({
      ...a,
      date: a.date,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
  };
}

async function createMissingCertificatesForUser(userId: string) {
  const courses = await prisma.course.findMany({
    where: { userId },
    select: {
      id: true,
      _count: { select: { videos: true } },
    },
  });

  if (courses.length === 0) return;

  const courseIds = courses.map((course) => course.id);
  const [
    chapterRows,
    completedVideoProgress,
    completedChapterProgress,
    existingCertificates,
  ] = await Promise.all([
    prisma.chapter.findMany({
      where: { video: { courseId: { in: courseIds } } },
      select: {
        id: true,
        video: { select: { courseId: true } },
      },
    }),
    prisma.videoProgress.findMany({
      where: {
        userId,
        completed: true,
        video: { courseId: { in: courseIds } },
      },
      select: {
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
        chapter: { select: { video: { select: { courseId: true } } } },
      },
    }),
    prisma.certificate.findMany({
      where: { userId, courseId: { in: courseIds } },
      select: { courseId: true },
    }),
  ]);

  const chapterCountByCourse = new Map<string, number>();
  for (const chapter of chapterRows) {
    const courseId = chapter.video.courseId;
    chapterCountByCourse.set(
      courseId,
      (chapterCountByCourse.get(courseId) ?? 0) + 1
    );
  }

  const completedVideoCountByCourse = new Map<string, number>();
  for (const progress of completedVideoProgress) {
    const courseId = progress.video.courseId;
    completedVideoCountByCourse.set(
      courseId,
      (completedVideoCountByCourse.get(courseId) ?? 0) + 1
    );
  }

  const completedChapterCountByCourse = new Map<string, number>();
  for (const progress of completedChapterProgress) {
    const courseId = progress.chapter.video.courseId;
    completedChapterCountByCourse.set(
      courseId,
      (completedChapterCountByCourse.get(courseId) ?? 0) + 1
    );
  }

  const certifiedCourseIds = new Set(
    existingCertificates.map((certificate) => certificate.courseId)
  );
  const missingCertificates = courses
    .filter((course) => {
      if (certifiedCourseIds.has(course.id)) return false;
      const chapterCount = chapterCountByCourse.get(course.id) ?? 0;
      const isChapterCourse = course._count.videos === 1 && chapterCount > 0;
      const totalUnits = isChapterCourse ? chapterCount : course._count.videos;
      const completedUnits = isChapterCourse
        ? completedChapterCountByCourse.get(course.id) ?? 0
        : completedVideoCountByCourse.get(course.id) ?? 0;

      return totalUnits > 0 && completedUnits >= totalUnits;
    })
    .map((course) => ({ userId, courseId: course.id }));

  if (missingCertificates.length === 0) return;

  await prisma.certificate.createMany({
    data: missingCertificates,
    skipDuplicates: true,
  });
}

function calculateCurrentStreak(activities: UserActivity[]) {
  if (!activities || activities.length === 0) return 0;

  // Get completed activities sorted by date descending
  const completedActivities = activities
    .filter((a) => a.completed)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (completedActivities.length === 0) return 0;

  const today = new Date();
  const yesterday = subDays(today, 1);

  // Check if user has activity today or yesterday
  const hasActivityToday = completedActivities.some((activity) =>
    isSameDay(new Date(activity.date), today)
  );
  const hasActivityYesterday = completedActivities.some((activity) =>
    isSameDay(new Date(activity.date), yesterday)
  );

  if (!hasActivityToday && !hasActivityYesterday) {
    return 0;
  }

  // Start counting streak from the most recent activity
  let currentDate = hasActivityToday ? today : yesterday;
  let currentStreak = 1;

  // Count consecutive days
  for (let i = 1; i < completedActivities.length; i++) {
    const prevDate = subDays(currentDate, 1);
    const hasActivity = completedActivities.some((activity) =>
      isSameDay(new Date(activity.date), prevDate)
    );

    if (hasActivity) {
      currentStreak++;
      currentDate = prevDate;
    } else {
      break;
    }
  }

  return currentStreak;
}

function calculateLongestStreak(activities: UserActivity[]) {
  if (!activities || activities.length === 0) return 0;

  const completedActivities = activities
    .filter((a) => a.completed)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (completedActivities.length === 0) return 0;

  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const activity of completedActivities) {
    const currentDate = new Date(activity.date);

    if (prevDate) {
      const daysDiff = Math.floor(
        (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    } else {
      tempStreak = 1;
    }

    longestStreak = Math.max(longestStreak, tempStreak);
    prevDate = currentDate;
  }

  return longestStreak;
}

function calculateTotalWatchTime(videoProgress: VideoProgress[]) {
  if (!videoProgress || videoProgress.length === 0) return 0;

  const totalSeconds = videoProgress.reduce(
    (sum, progress) => sum + progress.video.durationSeconds,
    0
  );

  if (totalSeconds > 0) {
    return Math.round(totalSeconds / 60);
  }

  return videoProgress.length * 15;
}
