"use client";

import { Session } from "next-auth";
import Image from "next/image";
import { format } from "date-fns";

interface UserProfileDetailsProps {
  createdAt: string;
  session: Session | null;
}

export function UserProfileDetails({
  createdAt,
  session,
}: UserProfileDetailsProps) {
  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      {session.user.image ? (
        <div className="relative h-10 w-10 overflow-hidden rounded-full">
          <Image
            src={session.user.image}
            alt={session.user.name || "Profile"}
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>
      ) : (
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
          {session.user.name?.[0]?.toUpperCase() || "U"}
        </div>
      )}
      <div>
        <p className="font-medium">{session.user.name}</p>
        <p className="text-sm text-muted-foreground">
          Joined {format(new Date(createdAt), "MMMM yyyy")}
        </p>
      </div>
    </div>
  );
}
