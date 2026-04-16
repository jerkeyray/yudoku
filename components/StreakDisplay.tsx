"use client";

import { Session } from "next-auth";
import { Flame, Trophy, Calendar, Zap, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format, subDays, differenceInDays } from "date-fns";

interface StreakDisplayProps {
  activities: Array<{
    id: string;
    userId: string;
    date: string;
    completed: boolean;
  }>;
  session: Session | null;
}

export function StreakDisplay({ activities, session }: StreakDisplayProps) {
  if (!session?.user) {
    return null;
  }

  // Calculate current streak
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = subDays(today, 1);

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Create a map of dates with activity
  const activityDates = new Map<string, boolean>();
  let lastActiveDate: Date | null = null;

  activities.forEach((activity) => {
    if (activity.completed) {
      activityDates.set(activity.date, true);
      const activityDate = new Date(activity.date);
      if (!lastActiveDate || activityDate > lastActiveDate) {
        lastActiveDate = activityDate;
      }
    }
  });

  // Calculate streaks
  // First, create an array of dates with activity
  const sortedDates = Array.from(activityDates.keys())
    .map((date) => new Date(date))
    .sort((a, b) => a.getTime() - b.getTime());

  if (sortedDates.length > 0) {
    // Initialize temp streak
    tempStreak = 1;
    longestStreak = 1;

    // Check if the most recent activity was today or yesterday to count current streak
    const mostRecent = sortedDates[sortedDates.length - 1];
    const isActive =
      format(mostRecent, "yyyy-MM-dd") === format(today, "yyyy-MM-dd") ||
      format(mostRecent, "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd");

    // Calculate streaks by checking consecutive days
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = sortedDates[i - 1];
      const currDate = sortedDates[i];

      // Check if dates are consecutive
      const expectedNextDate = new Date(prevDate);
      expectedNextDate.setDate(expectedNextDate.getDate() + 1);

      if (
        format(currDate, "yyyy-MM-dd") ===
        format(expectedNextDate, "yyyy-MM-dd")
      ) {
        tempStreak++;
      } else {
        // Streak broken, check if it was longest
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }

    // Check final streak
    longestStreak = Math.max(longestStreak, tempStreak);

    // Set current streak if active
    if (isActive) {
      // Recalculate current streak from the end
      let currentStreakCount = 1;
      for (let i = sortedDates.length - 1; i > 0; i--) {
        const currDate = sortedDates[i];
        const prevDate = sortedDates[i - 1];

        const expectedPrevDate = new Date(currDate);
        expectedPrevDate.setDate(expectedPrevDate.getDate() - 1);

        if (
          format(prevDate, "yyyy-MM-dd") ===
          format(expectedPrevDate, "yyyy-MM-dd")
        ) {
          currentStreakCount++;
        } else {
          break;
        }
      }
      currentStreak = currentStreakCount;
    } else {
      currentStreak = 0;
    }
  }

  // Calculate last active string
  let lastActiveString = "Never";
  if (lastActiveDate) {
    const diffDays = differenceInDays(today, lastActiveDate);
    if (diffDays === 0) lastActiveString = "Today";
    else if (diffDays === 1) lastActiveString = "Yesterday";
    else lastActiveString = `${diffDays} days ago`;
  }

  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      <Card className="bg-card border-border">
        <CardContent className="p-4 flex flex-col justify-center h-full">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
            Last Studied
          </p>
          <p className="text-lg font-medium text-foreground">{lastActiveString}</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-4 flex flex-col justify-center h-full">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
            Longest Streak
          </p>
          <p className="text-lg font-medium text-foreground">
            {longestStreak}{" "}
            <span className="text-sm text-muted-foreground font-normal">days</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
