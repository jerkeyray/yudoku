"use client";

import { useEffect, useState } from "react";

export default function ChaptersLayout({
  player,
  sidebar,
}: {
  player: React.ReactNode;
  sidebar: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handler = (event: CustomEvent) => {
      setCollapsed(event.detail.collapsed);
    };
    window.addEventListener(
      "chaptersSidebarCollapse",
      handler as EventListener
    );
    return () =>
      window.removeEventListener(
        "chaptersSidebarCollapse",
        handler as EventListener
      );
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:h-full min-h-0">
      <div className="flex-1 lg:h-full min-h-0 lg:overflow-y-auto">
        {player}
      </div>
      <div
        className={`lg:h-full min-h-0 lg:overflow-y-auto transition-all duration-300 ${
          collapsed ? "lg:w-16" : "lg:w-[340px] lg:flex-shrink-0"
        }`}
        data-course-video-list-panel
      >
        {sidebar}
      </div>
    </div>
  );
}
