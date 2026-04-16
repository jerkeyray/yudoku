import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
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
  };
}

interface UserWithData {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  createdAt: Date;
  courses: Array<{
    id: string;
    title: string;
    videos: Array<{
      id: string;
      title: string;
      progress: Array<{
        id: string;
        completed: boolean;
      }>;
    }>;
  }>;
  activities: UserActivity[];
  certificates: Array<{
    id: string;
    courseId: string;
    course: {
      id: string;
      title: string;
    };
  }>;
  videoProgress: VideoProgress[];
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        courses: {
          include: {
            videos: {
              include: {
                progress: {
                  where: { userId: session.user.id },
                },
              },
            },
          },
        },
        activities: true,
        certificates: {
          include: {
            course: true,
          },
        },
        videoProgress: {
          where: { completed: true },
          include: {
            video: true,
          },
        },
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Check for completed courses without certificates and create them
    await createMissingCertificates(user as UserWithData);

    // Re-fetch user data to get the newly created certificates
    const updatedUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        certificates: {
          include: {
            course: true,
          },
        },
        videoProgress: {
          where: { completed: true },
          include: {
            video: true,
          },
        },
      },
    });

    if (!updatedUser) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Calculate stats
    const currentStreak = calculateCurrentStreak(user.activities);
    const longestStreak = calculateLongestStreak(user.activities);
    const coursesCompleted = updatedUser.certificates.length;
    const totalWatchTime = calculateTotalWatchTime(updatedUser.videoProgress);

    // Get active course (most recently accessed)
    const recentProgress = await prisma.videoProgress.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        video: {
          include: {
            course: {
              include: {
                videos: {
                  include: {
                    progress: {
                      where: { userId: session.user.id },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    let activeCourse = null;
    let lastStudied = null;

    if (recentProgress) {
      lastStudied = recentProgress.updatedAt.toISOString();
      const course = recentProgress.video.course;
      const totalVideos = course.videos.length;
      const completedVideos = course.videos.filter((v) =>
        v.progress.some((p) => p.completed)
      ).length;
      const progressPercentage =
        totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

      activeCourse = {
        id: course.id,
        title: course.title,
        progress: progressPercentage,
        totalVideos,
        completedVideos,
        lastWatched: recentProgress.updatedAt.toISOString(),
      };
    }

    // Get completed courses from certificates with additional data
    const completedCourses = await Promise.all(
      updatedUser.certificates.map(async (certificate) => {
        // Get all videos for this course with their progress
        const courseVideos = await prisma.video.findMany({
          where: { courseId: certificate.courseId },
          include: {
            progress: {
              where: {
                userId: session.user.id,
                completed: true,
              },
            },
          },
        });

        // Calculate total hours (assuming average video length of 15 minutes)
        const totalVideos = courseVideos.length;
        const totalHours = Math.round((totalVideos * 15) / 60); // 15 minutes per video

        // Get the latest completion date from video progress
        const latestCompletion = await prisma.videoProgress.findFirst({
          where: {
            videoId: { in: courseVideos.map((v) => v.id) },
            userId: session.user.id,
            completed: true,
          },
          orderBy: { updatedAt: "desc" },
        });

        return {
          id: certificate.course.id,
          title: certificate.course.title,
          completedAt: certificate.createdAt.toISOString(),
          totalHours: totalHours,
          totalVideos: totalVideos,
        };
      })
    );

    return NextResponse.json({
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
      activities: user.activities.map((a) => ({
        ...a,
        date: a.date, // Ensure date is string
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
    }, {
      headers: { "Cache-Control": "private, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("Error fetching profile data:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile data" },
      { status: 500 }
    );
  }
}

async function createMissingCertificates(user: UserWithData) {
  try {
    for (const course of user.courses) {
      const totalVideos = course.videos.length;
      const completedVideos = course.videos.filter((video) =>
        video.progress.some((p) => p.completed)
      ).length;

      // Check if course is completed (all videos done)
      if (totalVideos > 0 && completedVideos === totalVideos) {
        // Check if certificate already exists
        const existingCertificate = await prisma.certificate.findUnique({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: course.id,
            },
          },
        });

        // Create certificate if it doesn't exist
        if (!existingCertificate) {
          await prisma.certificate.create({
            data: {
              userId: user.id,
              courseId: course.id,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error("Error creating missing certificates:", error);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { bio } = await req.json();

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { bio },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
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

  // Calculate total watch time based on completed videos
  // Assuming average video length of 15 minutes (900 seconds)
  const averageVideoLengthMinutes = 15;
  return videoProgress.length * averageVideoLengthMinutes;
}
