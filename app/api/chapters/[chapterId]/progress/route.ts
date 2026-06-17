import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isCourseCompleteFromCounts } from "@/lib/data/certificates";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chapterId } = await params;
  if (!chapterId) {
    return NextResponse.json(
      { error: "Chapter ID is required" },
      { status: 400 }
    );
  }

  // Ensure the chapter belongs to a course owned by the user.
  const chapter = await db.chapter.findUnique({
    where: { id: chapterId },
    select: {
      id: true,
      video: {
        select: {
          courseId: true,
          course: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
  });

  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  if (chapter.video.course.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.chapterProgress.upsert({
    where: {
      userId_chapterId: {
        userId: session.user.id,
        chapterId,
      },
    },
    create: {
      userId: session.user.id,
      chapterId,
      completed: true,
      completedAt: new Date(),
    },
    update: {
      completed: true,
      completedAt: new Date(),
    },
  });

  await createCertificateIfChapterCourseCompleted(
    session.user.id,
    chapter.video.courseId
  );

  return NextResponse.json({ success: true });
}

async function createCertificateIfChapterCourseCompleted(
  userId: string,
  courseId: string
) {
  const totalChapters = await db.chapter.count({
    where: { video: { courseId } },
  });
  const completedChapters = await db.chapterProgress.count({
    where: {
      userId,
      completed: true,
      chapter: { video: { courseId } },
    },
  });

  if (
    !isCourseCompleteFromCounts({
      totalUnits: totalChapters,
      completedUnits: completedChapters,
    })
  ) {
    return;
  }

  await db.certificate.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: {},
    create: { userId, courseId },
  });
}
