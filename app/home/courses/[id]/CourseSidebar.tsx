"use client";

import { useState, useEffect, useRef } from "react";
import { Course, Video, VideoProgress } from "@prisma/client";
import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Helper to clean video titles for sidebar
function cleanSidebarTitle(title: string): string {
  // Remove common YouTube patterns
  let cleaned = title
    .replace(/^(Lecture|Video|Episode|Part|Chapter)\s*\d+[\.\-\:]?\s*/i, "")
    .replace(/^Statistics\s+(Lecture|Video|Lec)?\s*\d+[\.\-\:]?\s*/i, "")
    .trim();

  // Extract meaningful part after colon or dash
  const colonMatch = cleaned.match(/^[^:]+:\s*(.+)$/);
  if (colonMatch) {
    return colonMatch[1].trim();
  }

  const dashMatch = cleaned.match(/^[^-]+-\s*(.+)$/);
  if (dashMatch) {
    return dashMatch[1].trim();
  }

  return cleaned || title;
}

type CourseWithProgress = Course & {
  videos: (Video & {
    progress: VideoProgress[];
  })[];
  completionPercentage: number;
};

interface CourseSidebarProps {
  course: CourseWithProgress;
  currentVideoIndex: number;
  watchedVideos: string[];
}

export default function CourseSidebar({
  course,
  currentVideoIndex,
  watchedVideos,
}: CourseSidebarProps) {
  const [localCurrentVideoIndex, setLocalCurrentVideoIndex] =
    useState(currentVideoIndex);
  const [localWatchedVideos, setLocalWatchedVideos] = useState<Set<string>>(
    new Set(watchedVideos)
  );
  const playlistContainerRef = useRef<HTMLDivElement>(null);

  // Update local state when props change
  useEffect(() => {
    setLocalCurrentVideoIndex(currentVideoIndex);
  }, [currentVideoIndex]);

  useEffect(() => {
    setLocalWatchedVideos(new Set(watchedVideos));
  }, [watchedVideos]);

  // Auto-scroll to current video when video index changes
  useEffect(() => {
    const scrollToCurrentVideo = () => {
      if (playlistContainerRef.current) {
        const container = playlistContainerRef.current;
        const videoElements = container.querySelectorAll("[data-video-index]");

        // Scroll to the video before the current one (or first if current is first)
        const targetIndex = Math.max(0, localCurrentVideoIndex - 1);
        const targetVideoElement = Array.from(videoElements).find(
          (el) => el.getAttribute("data-video-index") === targetIndex.toString()
        );

        if (targetVideoElement) {
          targetVideoElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "nearest",
          });
        }
      }
    };

    // Add a small delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(scrollToCurrentVideo, 100);

    return () => clearTimeout(timeoutId);
  }, [localCurrentVideoIndex]);

  // Listen for video index changes from CoursePlayer
  useEffect(() => {
    const handleVideoIndexChange = (event: CustomEvent) => {
      const { videoIndex } = event.detail;
      setLocalCurrentVideoIndex(videoIndex);
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
  }, []);

  // Listen for progress updates
  useEffect(() => {
    const handleProgressUpdate = (event: CustomEvent) => {
      const { videoId, completed } = event.detail;
      setLocalWatchedVideos((prev) => {
        const newSet = new Set(prev);
        if (completed) {
          newSet.add(videoId);
        } else {
          newSet.delete(videoId);
        }
        return newSet;
      });
    };

    window.addEventListener(
      "videoProgressUpdate",
      handleProgressUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "videoProgressUpdate",
        handleProgressUpdate as EventListener
      );
    };
  }, []);

  const handleVideoClick = (index: number) => {
    setLocalCurrentVideoIndex(index);
    // Emit event to update video player
    window.dispatchEvent(
      new CustomEvent("videoIndexChange", {
        detail: { videoIndex: index },
      })
    );
  };

  const totalVideos = course.videos.length;
  const completedCount = localWatchedVideos.size;
  const progressPercent =
    totalVideos > 0 ? (completedCount / totalVideos) * 100 : 0;

  // Show all lessons
  const visibleVideos = course.videos;

  return (
    <div className="pt-4">
      <div className="sticky top-4 flex flex-col h-fit max-h-[calc(100vh-8rem)]">
        {/* Header with overall progress */}
        <div className="px-4 pt-3 pb-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Chapters
            </h3>
            <span className="text-xs text-muted-foreground">
              {completedCount}/{totalVideos} · {Math.round(progressPercent)}%
            </span>
          </div>
          <Progress value={progressPercent} className="h-1" />
        </div>

        {/* Lesson list */}
        <div
          ref={playlistContainerRef}
          className="flex-1 overflow-y-auto max-h-[calc(100vh-14rem)]"
        >
          <div>
            {visibleVideos.map((video) => {
              const index = course.videos.findIndex((v) => v.id === video.id);
              const isActive = localCurrentVideoIndex === index;
              const isCompleted = localWatchedVideos.has(video.id);
              const isUpcoming = index > localCurrentVideoIndex;
              const cleanedTitle = cleanSidebarTitle(video.title);

              return (
                <button
                  key={video.id}
                  data-video-index={index}
                  onClick={() => handleVideoClick(index)}
                  className={`w-full relative text-left transition-colors border-b border-border ${
                    isActive ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                  title={video.title}
                >
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    {/* Left accent bar for active lesson */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-foreground" />
                    )}

                    {/* State indicator - only show check for completed, nothing for others */}
                    <div className="flex-shrink-0">
                      {isCompleted && (
                        <Check
                          className={`h-3.5 w-3.5 ${
                            isActive ? "text-foreground/80" : "text-muted-foreground"
                          }`}
                        />
                      )}
                    </div>

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`line-clamp-2 leading-snug ${
                          isActive
                            ? "text-foreground text-sm font-medium"
                            : isCompleted
                            ? "text-muted-foreground text-sm"
                            : isUpcoming
                            ? "text-muted-foreground text-sm"
                            : "text-muted-foreground text-sm"
                        }`}
                      >
                        {cleanedTitle}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
