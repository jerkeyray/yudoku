// /app/api/courses/route.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { extractPlaylistId, fetchPlaylistDetails } from "@/lib/youtube";
import { z } from "zod";
import { getCourseDashboardData } from "@/lib/data/course-summary";
import { ServerTimer, timedJson } from "@/lib/performance";

export const runtime = "nodejs";

export async function GET() {
  const timer = new ServerTimer();
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dashboardData = await timer.time("course-summary", () =>
      getCourseDashboardData(userId)
    );

    return timedJson(
      { courses: dashboardData.courses },
      timer,
      {
        headers: {
          "Cache-Control": "private, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    // console.error("Error fetching courses:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url, deadline } = (await req.json()) as {
    url: string;
    deadline?: string;
  };
  const playlistId = extractPlaylistId(url);
  if (!playlistId) {
    return NextResponse.json(
      { error: "Invalid playlist URL" },
      { status: 400 }
    );
  }

  try {
    const { title, videos } = await fetchPlaylistDetails(playlistId);

    const course = await db.course.create({
      data: {
        title,
        playlistId,
        userId,
        deadline: deadline ? new Date(deadline) : null,
        videos: {
          create: videos.map((video, index) => ({
            title: video.title,
            videoId: video.youtubeId,
            order: index,
          })),
        },
      },
      include: {
        videos: true,
      },
    });

    return NextResponse.json(course);
  } catch (error) {
    // console.error("Error creating course:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
