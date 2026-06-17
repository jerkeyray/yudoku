"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { MobileNav } from "@/components/MobileNav";
import { DashboardSidebarToggle } from "@/components/DashboardSidebarToggle";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Session } from "next-auth";
import { RouteWarmup } from "@/components/RouteWarmup";

interface HomeLayoutClientProps {
  children: React.ReactNode;
  session: Session | null;
}

export default function HomeLayoutClient({
  children,
  session,
}: HomeLayoutClientProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(true);
  // Load collapsed state from local storage
  useEffect(() => {
    const storedCollapsed = localStorage.getItem("sidebarCollapsed");
    if (storedCollapsed !== null) {
      setIsCollapsed(storedCollapsed === "true");
    }
  }, []);

  const handleSidebarToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", String(newState));
  };

  return (
    <div className="h-full relative bg-background min-h-screen">
      <RouteWarmup />
      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden h-full md:flex md:flex-col md:fixed md:inset-y-0 z-[80] bg-background transition-all duration-200 ease-in-out",
          isCollapsed ? "md:w-16" : "md:w-64",
        )}
      >
        <div
          className={cn(
            "flex items-center h-16",
            isCollapsed ? "px-0 justify-center" : "px-3"
          )}
        >
          <DashboardSidebarToggle
            isCollapsed={isCollapsed}
            onToggle={handleSidebarToggle}
          />
          {!isCollapsed && (
            <Link
              href="/"
              className="text-xl font-medium tracking-tighter text-foreground ml-3 hover:text-muted-foreground transition-colors duration-200"
            >
              yudoku
            </Link>
          )}
        </div>
        <DashboardSidebar isCollapsed={isCollapsed} session={session} />
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <MobileNav session={session} />
      </div>

      {/* Main Content */}
      <main
        className={cn(
          "transition-all duration-200 ease-in-out bg-background min-h-screen",
          isCollapsed ? "md:pl-16" : "md:pl-64"
        )}
      >
        <div className="h-full min-h-screen bg-background">
          <div className="md:hidden h-14" />
          <AnimatePresence mode="wait">
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
