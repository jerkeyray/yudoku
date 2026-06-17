import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ServerTimer, timedJson } from "@/lib/performance";

export async function GET(req: Request) {
  const timer = new ServerTimer();
  try {
    const session = await timer.time("auth", () => auth());
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    const bookmarks = await timer.time("bookmarks", () =>
      prisma.bookmark.findMany({
        where: {
          userId: session.user.id,
          ...(courseId ? { video: { courseId } } : {}),
        },
      orderBy: { createdAt: "desc" },
      select: {
        timestamp: true,
        createdAt: true,
        video: {
          select: {
            id: true,
            title: true,
            videoId: true,
            courseId: true,
            course: { select: { title: true } },
          },
        },
      },
      })
    );

    // Transform the data to match the expected VideoCard format
    const formattedBookmarks = bookmarks.map((bookmark) => {
      return {
        id: bookmark.video.id,
        title: bookmark.video.title,
        thumbnailUrl: `https://img.youtube.com/vi/${bookmark.video.videoId}/maxresdefault.jpg`,
        duration: "00:00", // This may need to be fetched from YouTube API if required
        youtubeId: bookmark.video.videoId,
        courseTitle: bookmark.video.course?.title || "Unknown Course",
        courseId: bookmark.video.courseId,
        timestamp: bookmark.timestamp,
        createdAt: bookmark.createdAt,
      };
    });

    return timedJson(formattedBookmarks, timer, {
      headers: {
        "Cache-Control": "private, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch {
    // console.error("Error fetching bookmarks:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookmarks" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { videoId, note, timestamp } = await req.json();
    if (!videoId) {
      return new NextResponse("Video ID is required", { status: 400 });
    }

    // Check if video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return new NextResponse("Video not found", { status: 404 });
    }

    const bookmark = await prisma.bookmark.upsert({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId,
        },
      },
      update: {
        note,
        timestamp,
      },
      create: {
        userId: session.user.id,
        videoId,
        note,
        timestamp,
      },
      include: { video: true },
    });

    return NextResponse.json(bookmark);
  } catch (error) {
    // console.error("Error creating bookmark:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation Error", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create bookmark" },
      { status: 500 }
    );
  }
}
