"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import Image from "next/image";
import { BookOpen, Clock, CheckCircle, Calendar, Activity } from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import { Session } from "next-auth";

interface UserStats {
  currentStreak: number;
  longestStreak: number;
  coursesCompleted: number;
  totalWatchTime: number;
  lastStudied: string | null;
}

interface ActiveCourse {
  id: string;
  title: string;
  progress: number;
  totalVideos: number;
  completedVideos: number;
  lastWatched: string;
}

interface CompletedCourseType {
  id: string;
  title: string;
  completedAt: string;
  totalHours: number;
  totalVideos: number;
}

interface SerializedActivity {
  id: string;
  userId: string;
  date: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProfileData {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    bio: string | null;
    createdAt: string;
  };
  stats: UserStats;
  activeCourse: ActiveCourse | null;
  completedCourses: CompletedCourseType[];
  activities: SerializedActivity[];
}

interface ProfileClientProps {
  profileData: ProfileData | null;
  session: Session | null;
}

function getLearningIdentity(stats: UserStats) {
  if (stats.coursesCompleted > 2)
    return "Exploring multiple domains with steady progress.";
  if (stats.currentStreak > 5)
    return "Consistent learner focused on deep technical topics.";
  if (stats.totalWatchTime > 600)
    return "Burst learner with long-form sessions.";
  return "";
}

function getLastStudiedText(dateString: string | null) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return format(date, "MMM d");
}

export default function ProfileClient({
  profileData,
  session,
}: ProfileClientProps) {
  if (!profileData || !session?.user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <main className="container py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-4">
                <p className="text-blue-400 text-lg">
                  No profile data available or not signed in.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="container py-12 px-4 max-w-4xl mx-auto space-y-12">
        {/* Profile Header & Identity */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              {session.user.image ? (
                <div className="relative h-20 w-20 overflow-hidden rounded-full ring-2 ring-zinc-800 grayscale hover:grayscale-0 transition-all duration-500">
                  <Image
                    src={session.user.image}
                    alt={session.user.name || "Profile"}
                    fill
                    className="object-cover"
                    sizes="128px"
                    quality={85}
                    priority
                  />
                </div>
              ) : (
                <div className="h-32 w-32 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 text-4xl font-bold ring-2 ring-zinc-800">
                  {session.user.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {session.user.name || "User"}
              </h1>
              <div className="flex items-center gap-4 text-sm text-zinc-500 pt-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Joined{" "}
                    {format(new Date(profileData.user.createdAt), "MMMM yyyy")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Focus Card */}
        {profileData.activeCourse && (
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">
              Active Focus
            </h2>
            <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors group">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                      <Activity className="h-4 w-4" />
                      <span>In Progress</span>
                    </div>
                    <h3 className="text-2xl font-semibold text-white group-hover:text-blue-100 transition-colors">
                      {profileData.activeCourse.title}
                    </h3>
                    <div className="space-y-2 max-w-md">
                      <div className="flex justify-between text-sm text-zinc-400">
                        <span>
                          {profileData.activeCourse.progress}% Complete
                        </span>
                        <span>
                          {profileData.activeCourse.completedVideos} /{" "}
                          {profileData.activeCourse.totalVideos} Videos
                        </span>
                      </div>
                      <Progress
                        value={profileData.activeCourse.progress}
                        className="h-1.5 bg-zinc-800"
                      />
                    </div>
                  </div>
                  <Link
                    href={`/home/courses/${profileData.activeCourse.id}`}
                    className="w-full sm:w-auto"
                  >
                    <Button className="w-full sm:w-auto bg-white text-black hover:bg-zinc-200 font-medium px-8">
                      Resume Learning
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Stats Grid */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">
            Metrics
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-zinc-900/30 border-zinc-800/50">
              <CardContent className="p-6">
                <div className="text-sm text-zinc-500 mb-1">Last Studied</div>
                <div className="text-2xl font-bold text-white">
                  {getLastStudiedText(profileData.stats.lastStudied)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/30 border-zinc-800/50">
              <CardContent className="p-6">
                <div className="text-sm text-zinc-500 mb-1">Longest Streak</div>
                <div className="text-2xl font-bold text-zinc-300">
                  {profileData.stats.longestStreak}{" "}
                  <span className="text-sm font-normal text-zinc-600">
                    days
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/30 border-zinc-800/50">
              <CardContent className="p-6">
                <div className="text-sm text-zinc-500 mb-1">Completed</div>
                <div className="text-2xl font-bold text-zinc-300">
                  {profileData.stats.coursesCompleted}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/30 border-zinc-800/50">
              <CardContent className="p-6">
                <div className="text-sm text-zinc-500 mb-1">Hours Watched</div>
                <div className="text-2xl font-bold text-zinc-300">
                  {Math.round(profileData.stats.totalWatchTime / 60)}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Contribution Graph */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">
            Study Rhythm
          </h2>
          <div className="overflow-hidden py-2">
            <ActivityHeatmap activities={profileData.activities} />
          </div>
        </section>

        {/* Achievements / Completed Courses */}
        {profileData.completedCourses.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">
              Milestones
            </h2>
            <div className="grid gap-4">
              {profileData.completedCourses.map((course) => (
                <div
                  key={course.id}
                  className="group flex items-center justify-between p-6 rounded-lg bg-zinc-900/30 border border-zinc-800/50 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-green-900/20 flex items-center justify-center border border-green-900/30">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white group-hover:text-zinc-200 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-sm text-zinc-500">
                        Completed on{" "}
                        {format(new Date(course.completedAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-6 text-sm text-zinc-600">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{course.totalHours}h</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>{course.totalVideos} videos</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
