"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Youtube } from "lucide-react";
import { format, parse, isValid, isBefore } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import LoadingScreen from "@/components/LoadingScreen";

interface CreateCourseClientProps {
  userId: string;
}

export default function CreateCourseClient({
  userId,
}: CreateCourseClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [dateInput, setDateInput] = useState("");

  useEffect(() => {
    if (deadline) {
      setDateInput(format(deadline, "MM/dd/yyyy"));
    }
  }, [deadline]);

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDateInput(val);

    // Only attempt to parse if input length is sufficient (e.g., could be a full date)
    if (val.length >= 8) {
      const parsed = parse(val, "MM/dd/yyyy", new Date());
      if (isValid(parsed) && !isBefore(parsed, new Date())) {
        setDeadline(parsed);
      }
      // Don't unset deadline on invalid input immediately to avoid jumping UI,
      // but maybe we should if the user clears it?
      if (val === "") setDeadline(undefined);
    } else if (val === "") {
      setDeadline(undefined);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userId) {
      toast.error("Please sign in to create a course");
      return;
    }

    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      playlistUrl: formData.get("playlistUrl") as string,
      deadline: deadline?.toISOString(),
    };

    try {
      const response = await fetch("/api/courses/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          // ignore
        }

        const message = (() => {
          if (typeof payload !== "object" || payload === null) {
            return "Failed to create course";
          }

          const obj = payload as Record<string, unknown>;
          if (typeof obj.error === "string" && obj.error.trim())
            return obj.error;
          if (typeof obj.message === "string" && obj.message.trim())
            return obj.message;
          return "Failed to create course";
        })();

        throw new Error(message);
      }

      const course = await response.json();
      toast.success("Course created successfully!");
      router.push(`/home/courses/${course.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
        <div className="w-full max-w-xl space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground hover:bg-accent -ml-4"
              asChild
            >
              <Link href="/home" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-medium tracking-tight text-foreground">
              Create a course
            </h1>
            <p className="text-muted-foreground font-light text-lg">
              Paste either a YouTube playlist link, or a single video link.
              Single videos are automatically split into chapters using the
              timestamps in the video description.
            </p>
          </div>

          <Card className="border border-border bg-card shadow-2xl">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                  <label
                    htmlFor="title"
                    className="text-sm font-medium text-foreground"
                  >
                    Course Title
                  </label>
                  <Input
                    id="title"
                    name="title"
                    required
                    placeholder="e.g. Introduction to TypeScript"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring h-12"
                  />
                </div>

                <div className="space-y-3">
                  <label
                    htmlFor="playlistUrl"
                    className="text-sm font-medium text-foreground"
                  >
                    YouTube playlist or video URL
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Youtube className="h-5 w-5" />
                    </div>
                    <Input
                      id="playlistUrl"
                      name="playlistUrl"
                      required
                      type="url"
                      placeholder="https://youtube.com/watch?v=... or ...playlist?list=..."
                      className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring h-12"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Works with public and unlisted playlists. For single videos,
                    timestamps must be in the video description.
                  </p>
                </div>

                <div className="space-y-3 flex flex-col">
                  <label className="text-sm font-normal text-muted-foreground">
                    Target Completion Date{" "}
                    <span className="text-muted-foreground font-normal ml-1">
                      (Optional)
                    </span>
                  </label>
                  <Input
                    placeholder="MM/DD/YYYY"
                    value={dateInput}
                    onChange={handleDateInputChange}
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring h-12"
                  />
                </div>

                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-base transition-all border-0"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4">
                          <LoadingScreen variant="inline" />
                        </div>
                        <span>Creating...</span>
                      </div>
                    ) : (
                      "Create course"
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    You can change details later.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
