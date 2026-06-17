import { auth } from "@/lib/auth-compat";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format, startOfDay } from "date-fns";
import { z } from "zod";
import { isCourseCompleteFromCounts } from "@/lib/data/certificates";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const bodySchema = z.object({
      completed: z.boolean().optional(),
      lastWatchedSeconds: z.number().min(0).optional(),
    });

    const body = await req.json();
    const { completed, lastWatchedSeconds } = bodySchema.parse(body);

    const video = await prisma.video.findFirst({
      where: { id: videoId, course: { userId } },
      select: { id: true, courseId: true },
    });

    if (!video) {
      return new NextResponse("Video not found or access denied", {
        status: 404,
      });
    }

    const updateData: {
      completed?: boolean;
      lastWatchedSeconds?: number;
    } = {};
    if (completed !== undefined) updateData.completed = completed;
    if (lastWatchedSeconds !== undefined)
      updateData.lastWatchedSeconds = Math.floor(lastWatchedSeconds);

    const progress = await prisma.videoProgress.upsert({
      where: {
        userId_videoId: { userId, videoId },
      },
      update: updateData,
      create: {
        userId,
        videoId,
        completed: completed || false,
        lastWatchedSeconds: lastWatchedSeconds
          ? Math.floor(lastWatchedSeconds)
          : 0,
      },
    });

    // If video is completed, record activity for today and check course completion
    if (completed) {
      const today = format(startOfDay(new Date()), "yyyy-MM-dd");

      await prisma.userActivity.upsert({
        where: { userId_date: { userId, date: today } },
        update: { completed: true },
        create: { userId, date: today, completed: true },
      });

      await checkAndCreateCertificate(userId, video.courseId);
    }

    return NextResponse.json(progress);
  } catch (error) {
    // console.error("Error updating video progress:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation Error", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update video progress" },
      { status: 500 }
    );
  }
}

async function checkAndCreateCertificate(userId: string, courseId: string) {
  try {
    const totalVideos = await prisma.video.count({ where: { courseId } });
    const completedVideos = await prisma.videoProgress.count({
      where: { userId, completed: true, video: { courseId } },
    });

    if (
      isCourseCompleteFromCounts({
        totalUnits: totalVideos,
        completedUnits: completedVideos,
      })
    ) {
      await prisma.certificate.upsert({
        where: { userId_courseId: { userId, courseId } },
        update: {},
        create: { userId, courseId },
      });
    }
  } catch (error) {
    console.error("Error checking course completion:", error);
  }
}
