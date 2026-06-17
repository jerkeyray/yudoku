"use client";

import { useMemo, useState } from "react";
import type {
  Chapter,
  ChapterProgress,
  Course,
  Video,
  VideoProgress,
} from "@prisma/client";
import CoursePlayer from "./CoursePlayer";
import CourseSidebar from "./CourseSidebar";

type CourseWithProgress = Course & {
  videos: (Video & {
    progress: VideoProgress[];
    chapters: (Chapter & { progress: ChapterProgress[] })[];
  })[];
  completionPercentage: number;
};

interface CourseSessionProps {
  course: CourseWithProgress;
  initialVideoIndex: number;
  initialTimestamp?: number;
}

export default function CourseSession({
  course,
  initialVideoIndex,
  initialTimestamp,
}: CourseSessionProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(initialVideoIndex);
  const [watchedVideoIds, setWatchedVideoIds] = useState(
    () =>
      new Set(
        course.videos
          .filter((video) => video.progress.some((p) => p.completed))
          .map((video) => video.id)
      )
  );

  const watchedVideos = useMemo(
    () => Array.from(watchedVideoIds),
    [watchedVideoIds]
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:h-full min-h-0">
      <div className="lg:col-span-8 lg:h-full min-h-0 lg:overflow-y-auto">
        <CoursePlayer
          course={course}
          initialVideoIndex={initialVideoIndex}
          initialTimestamp={initialTimestamp}
          requestedVideoIndex={currentVideoIndex}
          onVideoIndexChange={setCurrentVideoIndex}
          onVideoProgressChange={(videoId, completed) => {
            setWatchedVideoIds((prev) => {
              const next = new Set(prev);
              if (completed) next.add(videoId);
              else next.delete(videoId);
              return next;
            });
          }}
        />
      </div>
      <div
        className="lg:col-span-4 lg:h-full min-h-0 lg:overflow-y-auto"
        data-course-video-list-panel
      >
        <CourseSidebar
          course={course}
          currentVideoIndex={currentVideoIndex}
          watchedVideos={watchedVideos}
          onVideoSelect={setCurrentVideoIndex}
        />
      </div>
    </div>
  );
}
