import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface SerializedCourse {
  id: string;
  title: string;
  playlistId: string;
  userId: string;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  videos: Array<{
    id: string;
    title: string;
    videoId: string;
    order: number;
    createdAt: string;
    updatedAt: string;
    progress: Array<{
      id: string;
      userId: string;
      videoId: string;
      completed: boolean;
      updatedAt: string;
    }>;
  }>;
}

interface HomeClientProps {
  courses: SerializedCourse[];
}

export default function HomeClient({ courses }: HomeClientProps) {
  // --- LOGIC: Dominant "Continue" Card ---
  let nextTask: {
    courseId: string;
    courseTitle: string;
    videoTitle: string;
    videoId: string;
    videoOrder: number;
    remainingInCourse: number;
    totalVideos: number;
    daysRemaining: number | null;
    isUrgent: boolean;
  } | null = null;

  // Flatten video progress to find the absolute most recent activity
  const allProgress = courses
    .flatMap((c) =>
      c.videos.map((v) => ({ course: c, video: v, progress: v.progress[0] }))
    )
    .filter((item) => item.progress)
    .sort(
      (a, b) =>
        new Date(b.progress.updatedAt).getTime() -
        new Date(a.progress.updatedAt).getTime()
    );

  const today = new Date();

  const calculateUrgency = (deadline: string | null) => {
    if (!deadline) return { daysRemaining: null, isUrgent: false };
    const deadlineDate = new Date(deadline);
    const daysRemaining = Math.ceil(
      (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      daysRemaining,
      isUrgent: daysRemaining <= 3 && daysRemaining >= 0,
    };
  };

  if (allProgress.length > 0) {
    const mostRecent = allProgress[0];
    const course = mostRecent.course;

    // Find first uncompleted video in this course
    const uncompletedVideo = course.videos
      .sort((a, b) => a.order - b.order)
      .find((v) => !v.progress.some((p) => p.completed));

    if (uncompletedVideo) {
      const remaining = course.videos.filter(
        (v) => !v.progress.some((p) => p.completed)
      ).length;
      const { daysRemaining, isUrgent } = calculateUrgency(course.deadline);

      nextTask = {
        courseId: course.id,
        courseTitle: course.title,
        videoTitle: uncompletedVideo.title,
        videoId: uncompletedVideo.id,
        videoOrder: uncompletedVideo.order,
        remainingInCourse: remaining,
        totalVideos: course.videos.length,
        daysRemaining,
        isUrgent,
      };
    } else {
      // Fallback to next available course
      const nextCourse = courses.find((c) =>
        c.videos.some((v) => !v.progress.some((p) => p.completed))
      );
      if (nextCourse) {
        const nextVideo = nextCourse.videos
          .sort((a, b) => a.order - b.order)
          .find((v) => !v.progress.some((p) => p.completed));
        if (nextVideo) {
          const remaining = nextCourse.videos.filter(
            (v) => !v.progress.some((p) => p.completed)
          ).length;
          const { daysRemaining, isUrgent } = calculateUrgency(
            nextCourse.deadline
          );

          nextTask = {
            courseId: nextCourse.id,
            courseTitle: nextCourse.title,
            videoTitle: nextVideo.title,
            videoId: nextVideo.id,
            videoOrder: nextVideo.order,
            remainingInCourse: remaining,
            totalVideos: nextCourse.videos.length,
            daysRemaining,
            isUrgent,
          };
        }
      }
    }
  } else if (courses.length > 0) {
    // No progress yet, pick the first course
    const course = courses[0];
    const video = course.videos.sort((a, b) => a.order - b.order)[0];
    if (video) {
      const { daysRemaining, isUrgent } = calculateUrgency(course.deadline);
      nextTask = {
        courseId: course.id,
        courseTitle: course.title,
        videoTitle: video.title,
        videoId: video.id,
        videoOrder: video.order,
        remainingInCourse: course.videos.length,
        totalVideos: course.videos.length,
        daysRemaining,
        isUrgent,
      };
    }
  }

  // --- LOGIC: Recently Watched (History) ---
  const recentlyWatchedVideos = courses
    .flatMap((course) =>
      course.videos
        .filter((video) => video.progress.length > 0)
        .map((video) => ({
          id: video.id,
          title: video.title,
          videoId: video.id,
          courseId: course.id,
          courseTitle: course.title,
          updatedAt: video.progress[0].updatedAt,
        }))
    )
    .filter((v) => !nextTask || v.videoId !== nextTask.videoId)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 3);

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
                              ((nextTask.totalVideos -
                                nextTask.remainingInCourse) /
                                nextTask.totalVideos) *
                                100
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
                                ((nextTask.totalVideos -
                                  nextTask.remainingInCourse) /
                                  nextTask.totalVideos) *
                                  100
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
