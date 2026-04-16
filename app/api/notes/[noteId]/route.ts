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

const updateNoteSchema = z.object({
  content: z
    .string()
    .transform(normalizeMomentContent)
    .refine((s) => effectiveMomentLength(s) <= MOMENT_MAX_EFFECTIVE_CHARS, {
      message: `Moment note must be at most ${MOMENT_MAX_EFFECTIVE_CHARS} characters (new lines consume more)`,
    }),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { noteId } = await params;
    if (!noteId) {
      return NextResponse.json({ error: "Missing noteId" }, { status: 400 });
    }

    const json = await req.json();
    const body = updateNoteSchema.parse(json);

    const note = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (note.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: { content: body.content },
    });

    return NextResponse.json(updatedNote);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    // eslint-disable-next-line no-console
    console.warn("Error updating note:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { noteId } = await params;
    if (!noteId) {
      return NextResponse.json({ error: "Missing noteId" }, { status: 400 });
    }

    const note = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (note.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.note.delete({
      where: { id: noteId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Error deleting note:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
