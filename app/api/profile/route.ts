import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getProfileData } from "@/lib/data/profile";
import { ServerTimer, timedJson } from "@/lib/performance";

const updateProfileSchema = z.object({
  bio: z.string().max(500).nullable().optional(),
});

export async function GET() {
  const timer = new ServerTimer();
  try {
    const session = await timer.time("auth", () => auth());
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const profileData = await timer.time("profile-data", () =>
      getProfileData(session.user.id)
    );
    if (!profileData) {
      return new NextResponse("User not found", { status: 404 });
    }

    return timedJson(profileData, timer, {
      headers: {
        "Cache-Control": "private, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error fetching profile data:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile data" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = updateProfileSchema.parse(await req.json());
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { bio: body.bio },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
