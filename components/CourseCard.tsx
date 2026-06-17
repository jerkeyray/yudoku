"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DeleteCourseDialog } from "./DeleteCourseDialog";

export interface SerializedCourse {
  id: string;
  title: string;
  playlistId: string;
  userId: string;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  totalUnits: number;
  completedUnits: number;
  completionPercentage: number;
  nextVideoId: string | null;
  nextChapterId?: string | null;
  nextVideoTitle?: string | null;
  lastWatchedSeconds?: number | null;
  lastActivityAt?: string | null;
  isChapterCourse?: boolean;
}

interface CourseCardProps {
  course: SerializedCourse;
  isPrimary?: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, isPrimary }) => {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const completionPercentage = course.completionPercentage;

  const isCompleted = completionPercentage === 100;
  const isStarted = completionPercentage > 0;
  const isInProgress = isStarted && !isCompleted;
  const nextVideoId = course.nextVideoId;

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/courses/${course.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete course");
      }

      toast.success("Course deleted successfully");
      router.refresh();
    } catch {
      toast.error("Failed to delete course");
    }
  };

  return (
    <>
      <div
        className={`text-foreground overflow-hidden rounded-lg border transition-colors ${
          isCompleted
            ? "border-border bg-card/50 opacity-60 hover:opacity-100"
            : isPrimary
            ? "border-primary/30 bg-card hover:border-primary/50"
            : "border-border bg-card hover:border-border"
        }`}
      >
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="truncate text-lg font-medium text-foreground tracking-tight">
              {course.title}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-transparent hover:text-red-400 hover:scale-110 transition-transform focus-visible:ring-0 focus-visible:ring-offset-0"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-muted-foreground mb-4 font-light text-sm uppercase tracking-wide">
            {course.totalUnits}{" "}
            {course.totalUnits === 1 ? "lesson" : "lessons"}
          </p>

          {/* Progress bar and percentage */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-muted-foreground mb-2 font-mono">
              <span>Progress</span>
              <span>{completionPercentage}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-blue-500"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>

          <div className="mt-4">
            <Button
              asChild
              variant="outline"
              className="w-full border-border bg-transparent text-foreground hover:bg-accent hover:text-foreground"
              disabled={!nextVideoId}
            >
              <Link
                href={
                  nextVideoId
                    ? `/home/courses/${course.id}?videoId=${nextVideoId}`
                    : `/home/courses/${course.id}`
                }
              >
                {isCompleted ? "Review" : isInProgress ? "Resume" : "Start"}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <DeleteCourseDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        courseTitle={course.title}
      />
    </>
  );
};

export default CourseCard;
