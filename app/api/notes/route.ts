import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const MOMENT_MAX_EFFECTIVE_CHARS = 280;
// Make new lines consume some of the budget so users can't add tons of empty lines.
// With +9, each "\n" counts as 10 total (1 + 9).
const MOMENT_NEWLINE_EXTRA_CHARS = 9;

function normalizeMomentContent(input: string) {
  const normalized = input.replace(/\r\n?/g, "\n");
  const rawLines = normalized.split("\n");
  const lines = rawLines
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    // Trim leading/trailing empty lines
    .join("\n")
    .split("\n");

  while (lines.length > 0 && lines[0] === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();

  return lines.join("\n");
}

function effectiveMomentLength(text: string) {
  const newlines = (text.match(/\n/g) || []).length;
  return text.length + newlines * MOMENT_NEWLINE_EXTRA_CHARS;
}

const momentContentSchema = z
  .string()
  .transform(normalizeMomentContent)
  .refine((s) => effectiveMomentLength(s) <= MOMENT_MAX_EFFECTIVE_CHARS, {
    message: `Moment note must be at most ${MOMENT_MAX_EFFECTIVE_CHARS} characters (new lines consume more)`,
  });

const createNoteSchema = z.object({
  courseId: z.string(),
  videoId: z.string(),
  timestampSeconds: z.number().min(0),
  // Optional multi-line note.
  content: momentContentSchema.optional().default(""),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const body = createNoteSchema.parse(json);

    const note = await prisma.note.create({
      data: {
        userId: session.user.id,
        ...body,
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    // eslint-disable-next-line no-console
    console.warn("Error creating note:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");
    const courseId = searchParams.get("courseId");
    const all = searchParams.get("all") === "true";

    if (!videoId && !courseId && !all) {
      return NextResponse.json(
        { error: "videoId or courseId is required" },
        { status: 400 }
      );
    }

    const where: { userId: string; videoId?: string; courseId?: string } = {
      userId: session.user.id,
    };

    if (videoId) where.videoId = videoId;
    if (courseId) where.courseId = courseId;

    const notes = await prisma.note.findMany({
      where,
      include: {
        course: { select: { id: true, title: true } },
        video: { select: { id: true, title: true } },
      },
      orderBy: [
        { courseId: "asc" },
        { videoId: "asc" },
        { timestampSeconds: "asc" },
      ],
    });

    return NextResponse.json(notes);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Error fetching notes:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
