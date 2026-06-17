"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/PageSkeleton";
import ProfileClient, { type ProfileData } from "./ProfileClient";

async function getProfile() {
  const response = await fetch("/api/profile");
  if (!response.ok) {
    throw new Error("Failed to load profile");
  }
  return (await response.json()) as ProfileData;
}

export default function ProfilePageClient() {
  const { data: session, status } = useSession();
  const {
    data: profileData = null,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    enabled: status === "authenticated",
  });

  useEffect(() => {
    if (error) toast.error("Failed to load profile");
  }, [error]);

  if (status === "loading" || isLoading) {
    return <PageSkeleton titleWidth="w-28" cards={4} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="container py-12 px-4 max-w-4xl mx-auto">
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <h2 className="mb-2 text-xl font-medium text-foreground">
              Error loading profile
            </h2>
            <p className="text-muted-foreground">Please try refreshing.</p>
          </div>
        </main>
      </div>
    );
  }

  return <ProfileClient profileData={profileData} session={session} />;
}
