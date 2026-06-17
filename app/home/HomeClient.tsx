import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CourseDashboardData } from "@/lib/data/course-summary";

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return "";

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

interface HomeClientProps {
  dashboardData: CourseDashboardData;
}

export default function HomeClient({ dashboardData }: HomeClientProps) {
  const { courses, currentTask: nextTask } = dashboardData;
  const recentlyWatchedVideos = dashboardData.recentActivity.slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground flex flex-col">
      <main className="flex-1 flex items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-5xl">
          <div className="flex flex-col items-start gap-6">
            {/* 1. DOMINANT ACTION CARD */}
            {nextTask ? (
              <div className="w-full">
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                    Current Commitment
                  </span>
                </div>

                <Link
                  href={`/home/courses/${nextTask.courseId}?videoId=${nextTask.videoId}`}
                  className="group block relative overflow-hidden rounded-2xl bg-foreground/[0.04] backdrop-blur-2xl border border-border shadow-2xl shadow-black/50 hover:bg-foreground/[0.06] hover:border-border transition-all duration-500"
                >
                  <div className="p-6 md:p-8 space-y-6">
                    {/* Course Info */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <h1 className="text-2xl font-medium text-foreground leading-tight">
                          {nextTask.courseTitle}
                        </h1>
                        {nextTask.daysRemaining !== null && (
                          <div
                            className={cn(
                              "shrink-0 px-2 py-0.5 rounded text-[10px] font-medium border",
                              nextTask.isUrgent
                                ? "bg-destructive/10 border-destructive/20 text-destructive"
                                : "bg-muted/40 border-border text-muted-foreground"
                            )}
                          >
                            {nextTask.daysRemaining <= 0
                              ? "Due today"
                              : `${nextTask.daysRemaining}d left`}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-medium">
                            {nextTask.remainingInCourse} Lessons Remaining
                          </span>
                          <span className="text-muted-foreground">
                            {Math.round(
                              nextTask.completionPercentage
                            )}
                            %
                          </span>
                        </div>
                        <div className="h-1 w-full bg-muted/60 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-500 ease-out"
                            style={{
                              width: `${Math.max(
                                5,
                                nextTask.completionPercentage
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center justify-between pt-5 border-t border-border">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          Up next
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs text-muted-foreground font-mono">
                            {String(nextTask.videoOrder).padStart(2, "0")}
                          </span>
                          <span className="text-sm text-foreground/90 font-medium line-clamp-1">
                            {nextTask.videoTitle}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pl-4">
                        <span className="inline-flex items-center gap-2 text-xs font-medium text-primary transition-colors">
                          Resume
                          <Play
                            size={14}
                            fill="currentColor"
                            className="text-primary"
                          />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ) : (
              <div className="w-full text-center py-12 border border-dashed border-border rounded-lg bg-card/40">
                <h2 className="text-lg font-medium text-foreground mb-2">
                  No active courses
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Start a new learning journey today.
                </p>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-border hover:bg-accent hover:text-foreground"
                >
                  <Link href="/home/courses/create">Create Course</Link>
                </Button>
              </div>
            )}

            {/* 2. SECONDARY ACTIONS */}
            {(recentlyWatchedVideos.length > 0 || courses.length > 0) && (
              <div className="w-full p-5">
                <div className="space-y-5">
                  {/* Recent Activity (Muted / Collapsible) */}
                  {recentlyWatchedVideos.length > 0 && (
                    <details className="group" open>
                      <summary className="list-none cursor-pointer select-none px-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider">
                        Recent Activity ({recentlyWatchedVideos.length})
                      </summary>
                      <div className="mt-3 space-y-2">
                        {recentlyWatchedVideos.map((video) => (
                          <Link
                            key={video.id}
                            href={`/home/courses/${video.courseId}?videoId=${video.id}`}
                            className="flex items-start justify-between gap-4 rounded-md px-3 py-2.5 hover:bg-accent transition-colors group/item"
                          >
                            <div className="flex min-w-0 flex-col">
                              <span className="text-sm font-medium text-foreground/90 group-hover/item:text-foreground transition-colors truncate">
                                {video.title}
                              </span>
                              <span className="text-xs text-muted-foreground truncate">
                                {video.courseTitle}
                              </span>
                            </div>

                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                              {formatRelativeTime(video.updatedAt)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Library Link */}
                  <div className="flex items-center justify-between pt-4">
                    <span className="text-xs text-muted-foreground">
                      {courses.length} total courses
                    </span>
                    <Link
                      href="/home/mycourses"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      View Library
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
