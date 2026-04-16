// components/CoursePlayer.tsx
"use client";

import { useState, useCallback, useEffect, useMemo, useRef, memo } from "react";
import {
  Chapter,
  ChapterProgress,
  Course,
  Video,
  VideoProgress,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { YouTubePlayer } from "react-youtube";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  NotebookPen,
  List,
} from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import VideoPlayer from "./VideoPlayer";

const NotesSidebar = dynamic(
  () => import("@/components/NotesSidebar").then((mod) => ({ default: mod.NotesSidebar })),
);
const ChaptersSheet = dynamic(() => import("./ChaptersSheet"));

type CourseWithProgress = Course & {
  videos: (Video & {
    progress: (VideoProgress & { lastWatchedSeconds: number })[];
    chapters?: (Chapter & { progress: ChapterProgress[] })[];
  })[];
  completionPercentage: number;
};

interface CoursePlayerProps {
  course: CourseWithProgress;
  initialVideoIndex?: number;
  initialTimestamp?: number;
}

// Stable container to prevent re-renders of the video player wrapper
const StableVideoContainer = memo(
  ({
    videoId,
    startTime,
    onReady,
    onProgress,
    isReadingMode,
  }: {
    videoId: string;
    startTime: number;
    onReady: (player: YouTubePlayer) => void;
    onProgress: (time: number) => void;
    isReadingMode: boolean;
  }) => {
    return (
      <div className="w-full h-full bg-black">
        <VideoPlayer
          videoId={videoId}
          initialTimestamp={startTime}
          onReady={onReady}
          onProgress={onProgress}
          isReadingMode={isReadingMode}
        />
      </div>
    );
  },
  (prev, next) =>
    prev.videoId === next.videoId && prev.isReadingMode === next.isReadingMode
);

// Helper function to clean YouTube titles
function cleanVideoTitle(
  title: string,
  lessonNumber: number,
  courseTitle: string
): { primary: string; secondary?: string } {
  // Extract course name (simplify "Statistics" from title patterns)
  const courseName = courseTitle.split(" ")[0] || "Course";

  // Look for patterns like "Topic: Description" or "Topic - Description"
  const colonMatch = title.match(/^([^:]+?):\s*(.+)$/);
  if (colonMatch) {
    const before = colonMatch[1].trim();
    const after = colonMatch[2].trim();

    // Extract lesson number from before part if it exists
    const lessonMatch = before.match(
      /(?:Lecture|Lec|Video|Episode|Part)\s*(\d+[\.\d]*)/i
    );
    const lessonNum = lessonMatch ? lessonMatch[1] : lessonNumber.toString();

    return {
      primary: after,
      secondary: `${courseName} · Lecture ${lessonNum}`,
    };
  }

  // Look for dash patterns
  const dashMatch = title.match(/^([^-]+?)\s*-\s*(.+)$/);
  if (dashMatch) {
    const before = dashMatch[1].trim();
    const after = dashMatch[2].trim();

    const lessonMatch = before.match(
      /(?:Lecture|Lec|Video|Episode|Part)\s*(\d+[\.\d]*)/i
    );
    const lessonNum = lessonMatch ? lessonMatch[1] : lessonNumber.toString();

    return {
      primary: after,
      secondary: `${courseName} · Lecture ${lessonNum}`,
    };
  }

  // Try to remove common prefixes
  let cleaned = title
    .replace(/^(Lecture|Video|Episode|Part|Chapter)\s*\d+[\.\-\:]?\s*/i, "")
    .replace(/^Statistics\s+(Lecture|Video|Lec)?\s*\d+[\.\-\:]?\s*/i, "")
    .replace(/^[^:]+:\s*/, "") // Remove anything before colon
    .trim();

  // If we cleaned it significantly, use the cleaned version
  if (cleaned !== title && cleaned.length > 0) {
    return {
      primary: cleaned,
      secondary: `${courseName} · Lecture ${lessonNumber}`,
    };
  }

  // Fallback: just return the title as primary
  return {
    primary: title,
    secondary: `${courseName} · Lecture ${lessonNumber}`,
  };
}

export default function CoursePlayer({
  course,
  initialVideoIndex = 0,
  initialTimestamp,
}: CoursePlayerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [currentVideoIndex, setCurrentVideoIndex] = useState(initialVideoIndex);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const suppressAutoChapterUntilRef = useRef<number>(0);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [uiTimeSeconds, setUiTimeSeconds] = useState(0);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [chapterCompleteIds, setChapterCompleteIds] = useState<Set<string>>(
    () => {
      const ids = new Set<string>();
      for (const video of course.videos) {
        for (const chapter of video.chapters ?? []) {
          if (chapter.progress?.some((p) => p.completed)) {
            ids.add(chapter.id);
          }
        }
      }
      return ids;
    }
  );
  const [isChaptersOpen, setIsChaptersOpen] = useState(false);
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(
    new Set(
      course.videos
        .filter((video) => video.progress.some((p) => p.completed))
        .map((video) => video.id)
    )
  );
  const [bookmarkedVideos, setBookmarkedVideos] = useState<Set<string>>(
    new Set()
  );

  // Load existing bookmarks so toggling doesn't fail with "already exists"
  useEffect(() => {
    let cancelled = false;

    const loadBookmarks = async () => {
      try {
        const res = await fetch("/api/bookmarks");
        if (!res.ok) return;

        const data = (await res.json()) as Array<{
          id: string;
          courseId: string;
        }>;
        if (cancelled) return;

        const ids = new Set(
          data.filter((b) => b.courseId === course.id).map((b) => b.id)
        );
        setBookmarkedVideos(ids);
      } catch {
        // ignore
      }
    };

    loadBookmarks();
    return () => {
      cancelled = true;
    };
  }, [course.id]);

  // Sync video index changes to other components (like Sidebar)
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("videoIndexChange", {
        detail: { videoIndex: currentVideoIndex },
      })
    );
  }, [currentVideoIndex]);

  const persistCurrentTime = useCallback(async (videoId: string) => {
    const player = playerRef.current;
    if (!player || typeof player.getCurrentTime !== "function") return;

    const time = player.getCurrentTime();
    if (!Number.isFinite(time) || time <= 0) return;

    try {
      await fetch(`/api/videos/${videoId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastWatchedSeconds: Math.floor(time) }),
        keepalive: true,
      });
    } catch {
      // ignore
    }
  }, []);

  // Keep the selected video in the URL so refresh lands on it.
  useEffect(() => {
    const video = course.videos[currentVideoIndex];
    if (!video) return;

    const params = new URLSearchParams(searchParams.toString());
    if (params.get("videoId") === video.id) return;

    params.set("videoId", video.id);
    // Timestamp comes from saved progress; avoid stale deep-link timestamps.
    params.delete("t");

    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [course.videos, currentVideoIndex, pathname, router, searchParams]);

  // Listen for video index changes from sidebar
  useEffect(() => {
    const handleVideoIndexChange = (event: CustomEvent) => {
      const { videoIndex } = event.detail;
      const current = course.videos[currentVideoIndex];
      if (current) persistCurrentTime(current.id);
      setCurrentVideoIndex(videoIndex);
    };

    window.addEventListener(
      "videoIndexChange",
      handleVideoIndexChange as EventListener
    );

    return () => {
      window.removeEventListener(
        "videoIndexChange",
        handleVideoIndexChange as EventListener
      );
    };
  }, [course.videos, currentVideoIndex, persistCurrentTime]);

  const handleVideoProgress = useCallback(
    async (videoId: string) => {
      const isCompleted = watchedVideos.has(videoId);
      // Optimistically update UI
      setWatchedVideos((prev) => {
        const newSet = new Set(prev);
        if (isCompleted) {
          newSet.delete(videoId);
        } else {
          newSet.add(videoId);
        }
        return newSet;
      });
      try {
        const response = await fetch(`/api/videos/${videoId}/progress`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            completed: !isCompleted,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update video progress");
        }

        // Emit custom event for progress update
        window.dispatchEvent(
          new CustomEvent("videoProgressUpdate", {
            detail: { videoId, completed: !isCompleted },
          })
        );

        toast.success(
          isCompleted
            ? "Video marked as not completed"
            : "Video marked as completed"
        );
      } catch {
        // Revert optimistic update
        setWatchedVideos((prev) => {
          const newSet = new Set(prev);
          if (isCompleted) {
            newSet.add(videoId);
          } else {
            newSet.delete(videoId);
          }
          return newSet;
        });
        toast.error("Failed to update video progress");
      }
    },
    [watchedVideos]
  );

  const handleBookmark = useCallback(
    async (videoId: string) => {
      const isBookmarked = bookmarkedVideos.has(videoId);
      const newBookmarkStatus = !isBookmarked;

      // Optimistically update UI
      setBookmarkedVideos((prev) => {
        const newSet = new Set(prev);
        if (newBookmarkStatus) {
          newSet.add(videoId);
        } else {
          newSet.delete(videoId);
        }
        return newSet;
      });

      try {
        let response;
        if (newBookmarkStatus) {
          // Add bookmark
          const currentTime = playerRef.current?.getCurrentTime() || 0;
          response = await fetch("/api/bookmarks", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              videoId,
              timestamp: Math.floor(currentTime),
            }),
          });
        } else {
          // Remove bookmark
          response = await fetch(`/api/bookmarks/${videoId}`, {
            method: "DELETE",
          });
        }

        if (!response.ok) {
          throw new Error("Failed to update bookmark");
        }

        toast.success(
          newBookmarkStatus ? "Video bookmarked" : "Bookmark removed"
        );
      } catch {
        // Revert optimistic update on error
        setBookmarkedVideos((prev) => {
          const newSet = new Set(prev);
          if (newBookmarkStatus) {
            newSet.delete(videoId);
          } else {
            newSet.add(videoId);
          }
          return newSet;
        });
        toast.error("Failed to update bookmark");
      }
    },
    [bookmarkedVideos]
  );

  const handlePreviousVideo = () => {
    if (isSingleVideoChapterCourse) {
      const nextIndex = Math.max(0, currentChapterIndex - 1);
      if (nextIndex === currentChapterIndex) return;
      window.dispatchEvent(
        new CustomEvent("chapterIndexChange", {
          detail: { chapterIndex: nextIndex, source: "user" },
        })
      );
      return;
    }

    if (currentVideoIndex > 0) {
      const current = course.videos[currentVideoIndex];
      if (current) persistCurrentTime(current.id);
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  const handleNextVideo = () => {
    if (isSingleVideoChapterCourse) {
      const nextIndex = Math.min(chapters.length - 1, currentChapterIndex + 1);
      if (nextIndex === currentChapterIndex) return;
      window.dispatchEvent(
        new CustomEvent("chapterIndexChange", {
          detail: { chapterIndex: nextIndex, source: "user" },
        })
      );
      return;
    }

    if (currentVideoIndex < course.videos.length - 1) {
      const current = course.videos[currentVideoIndex];
      if (current) persistCurrentTime(current.id);
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  const currentVideo = useMemo(() => {
    return course.videos[currentVideoIndex];
  }, [course.videos, currentVideoIndex]);

  const chapters = useMemo(() => {
    const list = currentVideo?.chapters ?? [];
    return list.slice().sort((a, b) => a.order - b.order);
  }, [currentVideo]);

  const isSingleVideoChapterCourse =
    course.videos.length === 1 && chapters.length > 0;

  const startTime = useMemo(() => {
    if (
      initialTimestamp &&
      currentVideoIndex === initialVideoIndex &&
      initialTimestamp > 0
    ) {
      return initialTimestamp;
    }
    const progress = currentVideo.progress[0];
    if (progress?.lastWatchedSeconds && progress.lastWatchedSeconds > 0) {
      return progress.lastWatchedSeconds;
    }
    return 0;
  }, [currentVideo, currentVideoIndex, initialTimestamp, initialVideoIndex]);

  // Initialize completed chapters from server-provided progress.
  useEffect(() => {
    if (!isSingleVideoChapterCourse) return;
    const completed = new Set<string>();
    for (const c of chapters) {
      if (c.progress?.some((p) => p.completed)) completed.add(c.id);
    }
    setChapterCompleteIds(completed);
  }, [chapters, isSingleVideoChapterCourse]);

  const saveProgress = useCallback(
    async (time: number) => {
      if (!currentVideo) return;

      try {
        await fetch(`/api/videos/${currentVideo.id}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lastWatchedSeconds: Math.floor(time) }),
        });
      } catch {
        // ignore
      }
    },
    [currentVideo]
  );

  // Save position when tab is hidden or page is unloading.
  useEffect(() => {
    const saveNow = () => {
      const current = course.videos[currentVideoIndex];
      if (current) persistCurrentTime(current.id);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveNow();
    };

    window.addEventListener("beforeunload", saveNow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", saveNow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [course.videos, currentVideoIndex, persistCurrentTime]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const onPlayerReady = useCallback((player: YouTubePlayer) => {
    // VideoPlayer passes the YouTubePlayer directly (not an event object)
    playerRef.current = player;
  }, []);

  const getCurrentTime = useCallback(() => {
    if (
      playerRef.current &&
      typeof playerRef.current.getCurrentTime === "function"
    ) {
      const t = playerRef.current.getCurrentTime();
      return Number.isFinite(t) ? t : 0;
    }
    return 0;
  }, []);

  const uiTimeLabel = useMemo(() => {
    const m = Math.floor(uiTimeSeconds / 60);
    const s = Math.floor(uiTimeSeconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [uiTimeSeconds]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setUiTimeSeconds(getCurrentTime());
    }, 1000);
    return () => window.clearInterval(id);
  }, [getCurrentTime]);

  // Determine current chapter based on playback time.
  useEffect(() => {
    if (!isSingleVideoChapterCourse || chapters.length === 0) return;

    // Avoid a brief "flicker" where the auto-detector fights a user click/seek.
    if (Date.now() < suppressAutoChapterUntilRef.current) return;

    const t = uiTimeSeconds;
    const idx = chapters.findIndex((c, i) => {
      const next = chapters[i + 1];
      const end = next ? next.startSeconds : c.endSeconds;
      return t >= c.startSeconds && (end ? t < end : true);
    });
    if (idx >= 0 && idx !== currentChapterIndex) {
      setCurrentChapterIndex(idx);
      window.dispatchEvent(
        new CustomEvent("chapterIndexChange", {
          detail: { chapterIndex: idx, source: "auto" },
        })
      );
    }
  }, [
    chapters,
    currentChapterIndex,
    isSingleVideoChapterCourse,
    uiTimeSeconds,
  ]);

  // Respond to chapter navigation from the sidebar.
  useEffect(() => {
    if (!isSingleVideoChapterCourse) return;

    const handler = (event: CustomEvent) => {
      const { chapterIndex, source } = event.detail as {
        chapterIndex: number;
        source?: "auto" | "user";
      };
      if (typeof chapterIndex !== "number") return;
      const chapter = chapters[chapterIndex];
      if (!chapter) return;

      setCurrentChapterIndex(chapterIndex);

      // Only seek when user intentionally selects a chapter.
      if (source !== "user") return;

      suppressAutoChapterUntilRef.current = Date.now() + 1250;

      // Update UI time immediately so the highlight feels instant.
      setUiTimeSeconds(chapter.startSeconds);

      // Seek and autoplay on chapter change.
      if (playerRef.current && typeof playerRef.current.seekTo === "function") {
        playerRef.current.seekTo(chapter.startSeconds, true);
        playerRef.current.playVideo();
      }
    };

    window.addEventListener("chapterIndexChange", handler as EventListener);
    return () =>
      window.removeEventListener(
        "chapterIndexChange",
        handler as EventListener
      );
  }, [chapters, isSingleVideoChapterCourse]);

  const markChapterComplete = useCallback(async (chapterId: string) => {
    if (!chapterId) return;
    setChapterCompleteIds((prev) => {
      const next = new Set(prev);
      next.add(chapterId);
      return next;
    });

    window.dispatchEvent(
      new CustomEvent("chapterProgressUpdate", {
        detail: { chapterId, completed: true },
      })
    );

    try {
      const res = await fetch(`/api/chapters/${chapterId}/progress`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to update chapter");
    } catch {
      // If the request failed, allow retry by removing optimistic completion.
      setChapterCompleteIds((prev) => {
        const next = new Set(prev);
        next.delete(chapterId);
        return next;
      });

      window.dispatchEvent(
        new CustomEvent("chapterProgressUpdate", {
          detail: { chapterId, completed: false },
        })
      );
    }
  }, []);

  // Auto-complete when playback passes chapter end.
  useEffect(() => {
    if (!isSingleVideoChapterCourse) return;
    const current = chapters[currentChapterIndex];
    if (!current) return;
    if (chapterCompleteIds.has(current.id)) return;

    // If we have a real end time, mark complete once we pass it.
    if (current.endSeconds > 0 && uiTimeSeconds >= current.endSeconds) {
      markChapterComplete(current.id);
    }
  }, [
    chapterCompleteIds,
    chapters,
    currentChapterIndex,
    isSingleVideoChapterCourse,
    markChapterComplete,
    uiTimeSeconds,
  ]);

  const seekTo = useCallback((seconds: number) => {
    if (playerRef.current && typeof playerRef.current.seekTo === "function") {
      playerRef.current.seekTo(seconds, true);
      playerRef.current.playVideo();
    }
  }, []);

  if (!course.videos.length) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-400">No videos available in this course.</p>
      </div>
    );
  }
  const totalVideos = course.videos.length;
  const currentLessonNumber = currentVideoIndex + 1;
  const titleInfo = cleanVideoTitle(
    currentVideo.title,
    currentLessonNumber,
    course.title
  );
  const isVideoCompleted = watchedVideos.has(currentVideo.id);

  const currentChapter =
    isSingleVideoChapterCourse && chapters.length > 0
      ? chapters[Math.min(currentChapterIndex, chapters.length - 1)]
      : null;
  const isChapterCompleted = currentChapter
    ? chapterCompleteIds.has(currentChapter.id) ||
      Boolean(currentChapter.progress?.[0]?.completed)
    : false;

  return (
    <div className="space-y-4">
      {/* Lesson indicator above video */}
      <p className="text-sm text-neutral-500">
        {isSingleVideoChapterCourse
          ? `Chapter ${Math.min(currentChapterIndex + 1, chapters.length)} of ${
              chapters.length
            }`
          : `Lesson ${currentLessonNumber} of ${totalVideos}`}
      </p>

      {/* Video Player Area */}
      <div className="relative w-full max-w-5xl overflow-hidden rounded-lg bg-black">
        <div className="relative aspect-video">
          <StableVideoContainer
            key={currentVideo.videoId}
            videoId={currentVideo.videoId}
            startTime={startTime}
            onReady={onPlayerReady}
            onProgress={saveProgress}
            isReadingMode={false}
          />
        </div>
      </div>

      {/* Video Title Above Buttons */}
      <div className="mt-4 mb-2">
        <h2 className="text-xl font-semibold text-white">
          {titleInfo.primary}
        </h2>
        <p className="text-xs text-neutral-500 mt-1.5">{course.title}</p>
      </div>

      {/* Action Buttons with hierarchy */}
      <div className="space-y-6">
        {/* Primary action: Mark as Completed - conclusion, not a button */}
        <div>
          <Button
            onClick={() => {
              if (isSingleVideoChapterCourse && currentChapter) {
                markChapterComplete(currentChapter.id);
              } else {
                handleVideoProgress(currentVideo.id);
              }
            }}
            className={`w-full flex items-center justify-center gap-2 font-medium transition-colors duration-150 ${
              (
                isSingleVideoChapterCourse
                  ? isChapterCompleted
                  : isVideoCompleted
              )
                ? "bg-white text-black hover:bg-neutral-200 border-0"
                : "bg-white text-black hover:bg-neutral-200 border-0"
            }`}
          >
            <Check className="h-4 w-4" />
            {isSingleVideoChapterCourse
              ? isChapterCompleted
                ? "Chapter completed"
                : "Mark chapter as completed"
              : isVideoCompleted
              ? "Completed"
              : "Mark as Completed"}
          </Button>
        </div>

        {/* Secondary actions row */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => handleBookmark(currentVideo.id)}
            variant="outline"
            size="icon"
            className={`flex items-center gap-2 bg-transparent border border-white/10 hover:bg-white/5 hover:border-white/20 transition-colors duration-150 ${
              bookmarkedVideos.has(currentVideo.id)
                ? "text-white border-white/30 bg-white/10"
                : "text-neutral-400 hover:text-white"
            }`}
            title="Bookmark"
          >
            <Bookmark
              className={`h-4 w-4 ${
                bookmarkedVideos.has(currentVideo.id) ? "fill-current" : ""
              }`}
            />
          </Button>

          <Button
            onClick={handlePreviousVideo}
            disabled={
              isSingleVideoChapterCourse
                ? currentChapterIndex === 0
                : currentVideoIndex === 0
            }
            variant="outline"
            size="icon"
            className="bg-transparent border border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            title={
              isSingleVideoChapterCourse
                ? "Previous chapter"
                : "Previous lesson"
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            onClick={handleNextVideo}
            disabled={
              isSingleVideoChapterCourse
                ? currentChapterIndex >= chapters.length - 1
                : currentVideoIndex === course.videos.length - 1
            }
            variant="outline"
            size="icon"
            className="bg-transparent border border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            title={isSingleVideoChapterCourse ? "Next chapter" : "Next lesson"}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {isSingleVideoChapterCourse && (
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden bg-transparent border border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 hover:border-white/20 transition-colors duration-150"
              title="Chapters"
              aria-label="Open chapters"
              onClick={() => {
                setIsChaptersOpen(true);
              }}
            >
              <List className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            className={
              "bg-transparent border border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 hover:border-white/20 transition-colors duration-150 " +
              (isNotesOpen ? "text-white border-white/30 bg-white/10" : "")
            }
            title={isNotesOpen ? "Close notes" : "Open notes"}
            aria-label={isNotesOpen ? "Close notes" : "Open notes"}
            onClick={() => {
              const next = !isNotesOpen;
              if (next) {
                try {
                  playerRef.current?.pauseVideo?.();
                } catch {
                  // ignore
                }
              }
              setIsNotesOpen(next);
            }}
          >
            <NotebookPen className="h-4 w-4" />
          </Button>
        </div>

        {isSingleVideoChapterCourse && (
          <ChaptersSheet
            open={isChaptersOpen}
            onOpenChange={setIsChaptersOpen}
            chapters={chapters}
            currentChapterIndex={currentChapterIndex}
          />
        )}

        <NotesSidebar
          courseId={course.id}
          videoId={currentVideo.id}
          getCurrentTime={getCurrentTime}
          seekTo={seekTo}
          isOpen={isNotesOpen}
          onOpenChange={setIsNotesOpen}
        />
      </div>
    </div>
  );
}
