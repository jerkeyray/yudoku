"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import VideoCard from "@/components/VideoCard";
import { Skeleton } from "@/components/ui/skeleton";

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration: string;
  youtubeId: string;
  courseTitle: string;
  courseId: string;
  timestamp?: number | null;
  createdAt?: string;
}

async function getBookmarks() {
  const response = await fetch("/api/bookmarks");
  if (!response.ok) {
    throw new Error("Failed to fetch bookmarks");
  }
  return response.json() as Promise<Video[]>;
}

export default function BookmarksPage() {
  const {
    data: videos = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: getBookmarks,
  });

  if (error) {
    toast.error("Failed to load bookmarks");
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="p-6 md:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <h2 className="mb-2 text-xl font-medium text-foreground">
                Error loading bookmarks
              </h2>
              <p className="mb-4 text-muted-foreground">
                Please try refreshing the page
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="p-8 md:p-12">
          <div className="max-w-6xl">
            <div className="mb-16">
              <Skeleton className="h-7 w-32 bg-muted" />
            </div>

            <div className="space-y-16">
              <section>
                <div className="mb-6 flex items-center gap-2">
                  <Skeleton className="w-1.5 h-1.5 rounded-full bg-muted" />
                  <Skeleton className="h-4 w-32 bg-muted" />
                </div>
                <div className="max-w-md">
                  <div className="rounded-lg border border-border bg-muted/50 overflow-hidden">
                    <Skeleton className="aspect-[16/9] w-full bg-muted" />
                    <div className="p-3 space-y-3">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full bg-muted" />
                        <Skeleton className="h-4 w-2/3 bg-muted" />
                      </div>
                      <Skeleton className="h-3 w-1/3 bg-muted" />
                      <div className="flex gap-2 pt-2">
                        <Skeleton className="h-8 flex-1 bg-muted" />
                        <Skeleton className="h-8 w-8 bg-muted" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-6 flex items-center gap-2">
                  <Skeleton className="w-1.5 h-1.5 rounded-full bg-muted" />
                  <Skeleton className="h-4 w-24 bg-muted" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border bg-muted/50 overflow-hidden"
                    >
                      <Skeleton className="aspect-[16/9] w-full bg-muted" />
                      <div className="p-3 space-y-3">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full bg-muted" />
                          <Skeleton className="h-4 w-2/3 bg-muted" />
                        </div>
                        <Skeleton className="h-3 w-1/3 bg-muted" />
                        <div className="flex gap-2 pt-2">
                          <Skeleton className="h-8 flex-1 bg-muted" />
                          <Skeleton className="h-8 w-8 bg-muted" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const nextVideo = videos[0];
  const queueVideos = videos.slice(1);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="p-8 md:p-12">
        <div className="max-w-6xl">
          {/* Header */}
          <div className="mb-16">
            <h1 className="text-xl font-medium text-muted-foreground">Bookmarks</h1>
          </div>

          {videos.length === 0 ? (
            <div className="py-20">
              <p className="text-muted-foreground text-lg">
                No saved bookmarks yet.
              </p>
            </div>
          ) : (
            <div className="space-y-16">
              {/* Primary/First Bookmark */}
              <section>
                <h2 className="text-sm font-medium text-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Last Viewed
                </h2>
                <div className="max-w-md">
                  <VideoCard
                    video={nextVideo}
                    onRemove={() => refetch()}
                    type="bookmark"
                  />
                </div>
              </section>

              {queueVideos.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6 pl-1">
                    In Queue
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {queueVideos.map((video) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        onRemove={() => refetch()}
                        type="bookmark"
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
