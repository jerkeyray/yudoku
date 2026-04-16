import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Define a basic schema for activity validation
const activitySchema = z.object({
  date: z.string(), // Assuming date is received as a string
  completed: z.boolean(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const year = searchParams.get("year");

    let startDate: Date;
    let endDate: Date;

    if (year) {
      const parsedYear = parseInt(year);
      if (isNaN(parsedYear)) {
        return NextResponse.json(
          { error: "Invalid year format" },
          { status: 400 }
        );
      }
      startDate = new Date(parsedYear, 0, 1); // January 1st of the year
      endDate = new Date(parsedYear, 11, 31, 23, 59, 59, 999); // December 31st of the year
    } else {
      // Default to the last 365 days if no year is specified
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 365);
    }

    const activities = await prisma.userActivity.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    return NextResponse.json(activities, {
      headers: { "Cache-Control": "private, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    // console.error("Error in GET /api/activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { date, completed } = activitySchema.parse(body);

    const activity = await prisma.userActivity.upsert({
      where: {
        userId_date: {
          userId: session.user.id,
          date: new Date(date).toISOString(),
        },
      },
      update: {
        completed: completed,
      },
      create: {
        userId: session.user.id,
        date: new Date(date).toISOString(),
        completed: completed,
      },
    });

    return NextResponse.json(activity);
  } catch (error) {
    // console.error("Error in POST /api/activity:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create or update activity" },
      { status: 500 }
    );
  }
}
