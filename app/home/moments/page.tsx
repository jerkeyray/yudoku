"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { PageSkeleton } from "@/components/PageSkeleton";

type Moment = {
  id: string;
  timestampSeconds: number;
  content: string;
  courseId: string;
  videoId: string;
  course?: { id: string; title: string };
  video?: { id: string; title: string };
};

const MOMENT_MAX_LINES = 4;

function clampMomentLines(text: string) {
  const label = text.trim();
  if (!label) return "";
  const lines = label.split(/\r\n?|\n/);
  if (lines.length <= MOMENT_MAX_LINES) return label;
  const first = lines.slice(0, MOMENT_MAX_LINES);
  first[MOMENT_MAX_LINES - 1] = first[MOMENT_MAX_LINES - 1].trimEnd() + " …";
  return first.join("\n");
}

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function getMoments() {
  const res = await fetch("/api/notes?all=true");
  if (!res.ok) throw new Error("Failed to fetch moments");
  return (await res.json()) as Moment[];
}

export default function MomentsPage() {
  const queryClient = useQueryClient();
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["moments"],
    queryFn: getMoments,
  });

  const deleteMoment = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        let message = "Failed to delete moment";
        try {
          const json = await res.json();
          if (typeof json?.error === "string") message = json.error;
        } catch {
          // ignore
        }
        throw new Error(message);
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["moments"] });
      const previous = queryClient.getQueryData<Moment[]>(["moments"]);
      queryClient.setQueryData<Moment[]>(["moments"], (old) =>
        old?.filter((m) => m.id !== id)
      );
      return { previous };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["moments"], ctx.previous);
      toast.error(
        err instanceof Error ? err.message : "Failed to delete moment"
      );
    },
    onSuccess: () => {
      toast.success("Moment deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["moments"] });
    },
  });

  const grouped = useMemo(() => {
    const byCourse = new Map<
      string,
      {
        courseId: string;
        courseTitle: string;
        videos: Map<
          string,
          { videoId: string; videoTitle: string; moments: Moment[] }
        >;
      }
    >();

    for (const m of data) {
      const courseId = m.course?.id ?? m.courseId;
      const courseTitle = m.course?.title ?? "Course";
      const videoId = m.video?.id ?? m.videoId;
      const videoTitle = m.video?.title ?? "Video";

      if (!byCourse.has(courseId)) {
        byCourse.set(courseId, {
          courseId,
          courseTitle,
          videos: new Map(),
        });
      }

      const course = byCourse.get(courseId)!;
      if (!course.videos.has(videoId)) {
        course.videos.set(videoId, { videoId, videoTitle, moments: [] });
      }
      course.videos.get(videoId)!.moments.push(m);
    }

    return Array.from(byCourse.values()).map((course) => ({
      ...course,
      videos: Array.from(course.videos.values()),
    }));
  }, [data]);

  if (error) {
    toast.error("Failed to load moments");
  }

  if (isLoading) {
    return <PageSkeleton titleWidth="w-28" cards={4} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="p-8 md:p-12">
        <div className="max-w-6xl">
          <div className="mb-10">
            <h1 className="text-xl font-medium text-muted-foreground">Moments</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Saved timestamps across your courses.
            </p>
          </div>

          {grouped.length === 0 ? (
            <div className="py-20">
              <p className="text-muted-foreground text-lg">No moments yet.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {grouped.map((course) => (
                <section key={course.courseId}>
                  <h2 className="text-sm font-medium text-foreground uppercase tracking-wider mb-4">
                    {course.courseTitle}
                  </h2>

                  <div className="space-y-6">
                    {course.videos.map((video) => (
                      <div
                        key={video.videoId}
                        className="rounded-lg border border-border bg-card"
                      >
                        <div className="px-4 py-3 border-b border-border">
                          <p className="text-sm text-foreground truncate">
                            {video.videoTitle}
                          </p>
                        </div>

                        <div className="p-4 space-y-2">
                          {video.moments
                            .slice()
                            .sort(
                              (a, b) => a.timestampSeconds - b.timestampSeconds
                            )
                            .map((moment) => {
                              const label = clampMomentLines(
                                moment.content ?? ""
                              );
                              const href = `/home/courses/${course.courseId}?videoId=${video.videoId}&t=${moment.timestampSeconds}`;
                              return (
                                <div
                                  key={moment.id}
                                  className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent transition-colors"
                                >
                                  <Link
                                    href={href}
                                    className="flex items-center gap-3 flex-1 min-w-0 px-1 py-1"
                                  >
                                    <span className="text-[10px] font-mono font-medium text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                      {formatTime(moment.timestampSeconds)}
                                    </span>
                                    <span
                                      className={
                                        label
                                          ? "text-sm text-foreground whitespace-pre-wrap break-words leading-snug"
                                          : "text-sm text-muted-foreground"
                                      }
                                    >
                                      {label || "Saved moment"}
                                    </span>
                                  </Link>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:bg-transparent hover:text-red-400 hover:scale-110 transition-transform focus-visible:ring-0 focus-visible:ring-offset-0"
                                    aria-label="Delete moment"
                                    title="Delete"
                                    disabled={deleteMoment.isPending}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      deleteMoment.mutate(moment.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
