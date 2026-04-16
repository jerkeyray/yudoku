"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";

import {
  BookOpen,
  Bookmark,
  Clock,
  User,
  LogOut,
  Home,
  HelpCircle,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const learningRoutes = [
  {
    label: "Home",
    icon: Home,
    href: "/home",
  },
  {
    label: "My Courses",
    icon: BookOpen,
    href: "/home/mycourses",
  },
];

const toolRoutes = [
  {
    label: "Moments",
    icon: Clock,
    href: "/home/moments",
  },
  {
    label: "Bookmarks",
    icon: Bookmark,
    href: "/home/bookmarks",
  },
  {
    label: "Profile",
    icon: User,
    href: "/home/profile",
  },
];

import { Session } from "next-auth";

interface DashboardSidebarProps {
  isCollapsed: boolean;
  session: Session | null;
}

export function DashboardSidebar({
  isCollapsed,
  session,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const isWhyYudokuActive = pathname === "/why-yudoku";

  return (
    <div className="flex flex-col h-full justify-between py-6">
      {/* Navigation Routes */}
      <div className="space-y-1 px-3">
        {/* Learning section */}
        <div className="space-y-1">
          {learningRoutes.map((route) => {
            const isActive = pathname === route.href;
            return (
              <Link
                key={route.href}
                href={route.href}
                prefetch={true}
                className={cn(
                  "flex items-center gap-x-3 text-sm px-3 py-2.5 rounded-lg transition-colors duration-150 relative group",
                  isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground font-normal",
                  isCollapsed ? "justify-center px-2" : ""
                )}
              >
                {/* Background for active and hover */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-lg transition-colors",
                    isActive
                      ? "bg-accent"
                      : "bg-transparent group-hover:bg-accent/50"
                  )}
                />
                <route.icon
                  className={cn(
                    "h-[18px] w-[18px] relative z-10 transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {!isCollapsed && (
                  <span className="relative z-10">{route.label}</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-2" />

        {/* Tools section */}
        <div className="space-y-1">
          {toolRoutes.map((route) => {
            const isActive = pathname === route.href;
            return (
              <Link
                key={route.href}
                href={route.href}
                prefetch={true}
                className={cn(
                  "flex items-center gap-x-3 text-sm px-3 py-2.5 rounded-lg transition-colors duration-150 relative group",
                  isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground font-normal",
                  isCollapsed ? "justify-center px-2" : ""
                )}
              >
                {/* Background for active and hover */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-lg transition-colors",
                    isActive
                      ? "bg-accent"
                      : "bg-transparent group-hover:bg-accent/50"
                  )}
                />
                <route.icon
                  className={cn(
                    "h-[18px] w-[18px] relative z-10 transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {!isCollapsed && (
                  <span className="relative z-10">{route.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Section - Profile */}
      <div className="px-3 pt-2">
        <Link
          href="/why-yudoku"
          prefetch={true}
          className={cn(
            "mb-2 flex items-center gap-x-3 text-sm px-3 py-2.5 rounded-lg transition-colors duration-150 relative group",
            isWhyYudokuActive
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground font-normal",
            isCollapsed ? "justify-center px-2" : ""
          )}
        >
          <div
            className={cn(
              "absolute inset-0 rounded-lg transition-colors",
              isWhyYudokuActive
                ? "bg-accent"
                : "bg-transparent group-hover:bg-accent/50"
            )}
          />
          <HelpCircle
            className={cn(
              "h-[18px] w-[18px] relative z-10 transition-colors",
              isWhyYudokuActive
                ? "text-foreground"
                : "text-muted-foreground group-hover:text-foreground"
            )}
          />
          {!isCollapsed && <span className="relative z-10">Why Yudoku</span>}
        </Link>

        <ThemeToggle isCollapsed={isCollapsed} />

        {/* Profile Section with Dropdown */}
        {session?.user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                id="user-menu-trigger"
                suppressHydrationWarning
                variant="ghost"
                className={cn(
                  "flex items-center gap-x-3 text-sm px-3 py-2.5 text-muted-foreground w-full transition-colors duration-150 hover:bg-accent/50 hover:text-foreground h-auto relative group",
                  isCollapsed
                    ? "justify-center rounded-md px-2"
                    : "rounded-md justify-start"
                )}
              >
                {session.user.image ? (
                  <div className="relative h-6 w-6 rounded-full overflow-hidden ring-1 ring-border">
                    <Image
                      src={session.user.image}
                      alt={session.user.name || "Profile"}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                ) : (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-foreground text-xs font-medium ring-1 ring-border">
                    {session.user.name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                {!isCollapsed && (
                  <div className="flex flex-col items-start text-left overflow-hidden">
                    <p className="text-sm truncate max-w-[120px]">
                      {session.user.name || "User"}
                    </p>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={isCollapsed ? "center" : "start"}
              side="top"
              className="w-56 mb-2 z-[90] bg-popover border border-border text-muted-foreground"
            >
              <DropdownMenuItem
                className="cursor-pointer hover:bg-accent focus:bg-accent focus:text-foreground"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
