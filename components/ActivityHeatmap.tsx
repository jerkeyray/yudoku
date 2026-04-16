"use client";

import React from "react";
import {
  format,
  subDays,
  startOfDay,
  differenceInCalendarDays,
  getDay,
  addDays,
} from "date-fns";

interface SerializedActivity {
  id: string;
  userId: string;
  date: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ActivityHeatmapProps {
  activities: SerializedActivity[];
  cellSize?: number;
}

export default function ActivityHeatmap({
  activities = [],
  cellSize = 12,
}: ActivityHeatmapProps) {
  const today = startOfDay(new Date());

  // Calculate start date (Sunday 52 weeks ago for full year context)
  const weeks = 52;
  const todayDay = getDay(today); // 0 = Sunday
  const daysToSubtract = (weeks - 1) * 7 + todayDay;
  const startDate = subDays(today, daysToSubtract);

  // Map date string to activity status
  const activityMap = new Map<string, boolean>();
  (activities || []).forEach((a) => {
    if (a.completed) activityMap.set(a.date, true);
  });

  // Build grid: columns = weeks, rows = days (0=Sun, 6=Sat)
  const grid: { date: Date; active: boolean }[][] = [];

  for (let w = 0; w < weeks; w++) {
    const week: { date: Date; active: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const cellDate = addDays(startDate, w * 7 + d);
      const dateStr = format(cellDate, "yyyy-MM-dd");

      week.push({
        date: cellDate,
        active: activityMap.get(dateStr) || false,
      });
    }
    grid.push(week);
  }

  return (
    <div className="w-full overflow-x-auto no-scrollbar">
      <div className="flex gap-1 min-w-fit">
        {grid.map((week, wIdx) => (
          <div key={wIdx} className="flex flex-col gap-1">
            {week.map((cell, dIdx) => {
              const daysDifference = differenceInCalendarDays(today, cell.date);
              const isFuture = daysDifference < 0;

              if (isFuture) return null;

              return (
                <div
                  key={dIdx}
                  style={{
                    width: `${cellSize}px`,
                    height: `${cellSize}px`,
                  }}
                  className={`rounded-[1px] ${
                    cell.active ? "bg-emerald-900/60" : "bg-muted"
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
