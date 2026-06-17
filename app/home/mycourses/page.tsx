"use client";

import React, { useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import CourseCard, { SerializedCourse } from "@/components/CourseCard";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/PageSkeleton";

async function getCourses() {
  const response = await fetch("/api/courses");
  if (!response.ok) {
    throw new Error("Failed to fetch courses");
  }
  const data = await response.json();
  return data.courses as SerializedCourse[];
}

export default function MyCoursesPage() {
  const {
    data: courses = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["courses"],
    queryFn: getCourses,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (error) toast.error("Failed to load courses");
  }, [error]);

  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) => {
      // Primary sort: Completion status (Incomplete first)
      const aCompleted = a.completionPercentage === 100;
      const bCompleted = b.completionPercentage === 100;

      if (aCompleted && !bCompleted) return 1;
      if (!aCompleted && bCompleted) return -1;

      // Secondary sort: Recently updated
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [courses]);

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="p-8 md:p-12">
          <div className="max-w-6xl">
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <h2 className="mb-2 text-xl font-medium text-foreground">
                Error loading courses
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
    return <PageSkeleton titleWidth="w-32" cards={6} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="p-8 md:p-12">
        <div className="max-w-6xl">
          {sortedCourses.length > 0 && (
            <div className="mb-16 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-xl font-medium text-muted-foreground">
                  My Courses
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="border-border text-foreground hover:bg-accent hover:text-foreground"
                >
                  <Link href="/home/courses/create">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Add Course
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {sortedCourses.length === 0 ? (
            <div className="py-20">
              <p className="text-muted-foreground text-lg">No courses yet.</p>
              <div className="mt-6">
                <Button
                  asChild
                  variant="outline"
                  className="border-border text-foreground hover:bg-accent hover:text-foreground"
                >
                  <Link href="/home/courses/create">Add your first course</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sortedCourses.map((course: SerializedCourse) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
