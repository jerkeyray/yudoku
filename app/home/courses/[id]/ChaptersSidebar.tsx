"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Check, PanelRightClose, PanelRightOpen } from "lucide-react";

export type ChapterForSidebar = {
  id: string;
  title: string;
  startSeconds: number;
  endSeconds: number;
  order: number;
  progress?: Array<{ completed: boolean }>;
};

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ChaptersSidebar({
  chapters,
  currentChapterIndex,
}: {
  chapters: ChapterForSidebar[];
  currentChapterIndex: number;
}) {
  const [localCurrent, setLocalCurrent] = useState(currentChapterIndex);
  const [collapsed, setCollapsed] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    for (const ch of chapters) {
      if (ch.progress?.some((p) => p.completed)) ids.add(ch.id);
    }
    return ids;
  });
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalCurrent(currentChapterIndex);
  }, [currentChapterIndex]);

  useEffect(() => {
    const handler = (event: CustomEvent) => {
      const { chapterIndex } = event.detail as { chapterIndex: number };
      if (typeof chapterIndex === "number") setLocalCurrent(chapterIndex);
    };

    window.addEventListener("chapterIndexChange", handler as EventListener);
    return () =>
      window.removeEventListener(
        "chapterIndexChange",
        handler as EventListener
      );
  }, []);

  useEffect(() => {
    const handler = (event: CustomEvent) => {
      const { chapterId, completed } = event.detail as {
        chapterId: string;
        completed: boolean;
      };
      if (!chapterId) return;
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (completed) next.add(chapterId);
        else next.delete(chapterId);
        return next;
      });
    };

    window.addEventListener("chapterProgressUpdate", handler as EventListener);
    return () =>
      window.removeEventListener(
        "chapterProgressUpdate",
        handler as EventListener
      );
  }, []);

  // Dispatch collapse state so the page layout can react
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("chaptersSidebarCollapse", {
        detail: { collapsed },
      })
    );
  }, [collapsed]);

  useEffect(() => {
    const container = listRef.current;
    if (!container || collapsed) return;
    const el = container.querySelector<HTMLElement>(
      "[data-chapter-active='true']"
    );
    if (!el) return;

    const id = window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    return () => window.cancelAnimationFrame(id);
  }, [localCurrent, collapsed]);

  const onClickChapter = (index: number) => {
    window.dispatchEvent(
      new CustomEvent("chapterIndexChange", {
        detail: { chapterIndex: index, source: "user" },
      })
    );
  };

  if (collapsed) {
    return (
      <div className="pt-4 flex justify-center">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Show chapters"
        >
          <PanelRightOpen className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="sticky top-4 flex flex-col h-fit max-h-[calc(100vh-8rem)]">
        <div className="px-4 pt-3 pb-3 border-b border-border flex items-center justify-between">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Chapters
          </h3>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Hide chapters"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto max-h-[calc(100vh-12rem)]"
        >
          {chapters.map((ch, index) => {
            const isActive = index === localCurrent;
            const isCompleted = completedIds.has(ch.id);

            return (
              <button
                key={ch.id}
                data-chapter-index={index}
                data-chapter-active={isActive ? "true" : "false"}
                onClick={() => onClickChapter(index)}
                className={cn(
                  "w-full relative text-left transition-colors border-b border-border",
                  isActive ? "bg-accent" : "hover:bg-accent/50"
                )}
                title={ch.title}
              >
                <div className="flex items-start gap-3 px-4 py-2.5">
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-foreground" />
                  )}

                  <div className="flex-shrink-0 pt-[2px]">
                    {isCompleted ? (
                      <Check
                        className={cn(
                          "h-3.5 w-3.5",
                          isActive ? "text-foreground/80" : "text-muted-foreground"
                        )}
                      />
                    ) : (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {formatTime(ch.startSeconds)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "line-clamp-2 leading-snug text-sm",
                        isActive
                          ? "text-foreground font-semibold"
                          : isCompleted
                          ? "text-muted-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {ch.title}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
