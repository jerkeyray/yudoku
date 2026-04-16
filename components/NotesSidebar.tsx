"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Note {
  id: string;
  timestampSeconds: number;
  content: string;
}

interface NotesSidebarProps {
  courseId: string;
  videoId: string;
  getCurrentTime: () => number;
  seekTo: (seconds: number) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

const NOTE_MAX_EFFECTIVE_CHARS = 280;
// Make new lines consume some of the budget so users can't add tons of empty lines.
// With +9, each "\n" counts as 10 total (1 + 9).
const NOTE_NEWLINE_EXTRA_CHARS = 9;

function effectiveNoteLength(text: string) {
  const newlines = (text.match(/\n/g) || []).length;
  return text.length + newlines * NOTE_NEWLINE_EXTRA_CHARS;
}

function truncateToEffectiveLimit(text: string, maxEffective: number) {
  let out = "";
  let effective = 0;

  for (const ch of text) {
    const add = ch === "\n" ? 1 + NOTE_NEWLINE_EXTRA_CHARS : 1;
    if (effective + add > maxEffective) break;
    out += ch;
    effective += add;
  }

  return out;
}

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

export function NotesSidebar({
  courseId,
  videoId,
  getCurrentTime,
  seekTo,
  isOpen,
  onOpenChange,
  className,
}: NotesSidebarProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(
    null
  );
  const [sheetSide, setSheetSide] = useState<"right" | "bottom">("right");
  const [rightDrawerWidthPx, setRightDrawerWidthPx] = useState<number | null>(
    null
  );
  const [rightDrawerOffsetPx, setRightDrawerOffsetPx] = useState<number | null>(
    null
  );

  const { data: notes, isLoading } = useQuery<Note[]>({
    queryKey: ["notes", videoId],
    queryFn: async () => {
      const res = await fetch(`/api/notes?videoId=${videoId}`);
      if (!res.ok) throw new Error("Failed to fetch notes");
      return res.json();
    },
  });

  const addNoteMutation = useMutation<
    Note,
    Error,
    { timestamp: number; content: string },
    { previousNotes?: Note[]; optimisticId: string }
  >({
    mutationFn: async ({
      timestamp,
      content,
    }: {
      timestamp: number;
      content: string;
    }) => {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          videoId,
          timestampSeconds: Math.floor(timestamp),
          content,
        }),
      });
      if (!res.ok) {
        let message = "Failed to save moment";
        try {
          const json = await res.json();
          if (typeof json?.error === "string") message = json.error;
        } catch {
          // ignore
        }
        throw new Error(message);
      }
      return (await res.json()) as Note;
    },
    onMutate: async (newNote) => {
      await queryClient.cancelQueries({ queryKey: ["notes", videoId] });
      const previousNotes = queryClient.getQueryData<Note[]>([
        "notes",
        videoId,
      ]);

      const optimisticId = "temp-" + Date.now();

      queryClient.setQueryData<Note[]>(["notes", videoId], (old) => {
        const optimisticNote: Note = {
          id: optimisticId,
          timestampSeconds: Math.floor(newNote.timestamp),
          content: newNote.content,
        };
        const newNotes = [...(old || []), optimisticNote];
        return newNotes.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
      });

      setNewNoteContent("");
      return { previousNotes: previousNotes ?? undefined, optimisticId };
    },
    onSuccess: (createdNote, _newNote, context) => {
      const { id, timestampSeconds, content } = createdNote;

      queryClient.setQueryData<Note[]>(["notes", videoId], (old) => {
        if (!old?.length || !context?.optimisticId) return old;
        return old
          .map((n) =>
            n.id === context.optimisticId
              ? { id, timestampSeconds, content }
              : n
          )
          .sort((a, b) => a.timestampSeconds - b.timestampSeconds);
      });
    },
    onError: (err, newNote, context) => {
      queryClient.setQueryData(["notes", videoId], context?.previousNotes);
      toast.error(err instanceof Error ? err.message : "Failed to save moment");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", videoId] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      if (!res.ok) {
        let message = "Failed to delete note";
        try {
          const json = await res.json();
          if (typeof json?.error === "string") message = json.error;
        } catch {
          // ignore
        }
        throw new Error(message);
      }
    },
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: ["notes", videoId] });
      const previousNotes = queryClient.getQueryData<Note[]>([
        "notes",
        videoId,
      ]);
      queryClient.setQueryData<Note[]>(["notes", videoId], (old) =>
        old?.filter((note) => note.id !== noteId)
      );
      return { previousNotes };
    },
    onError: (err, noteId, context) => {
      queryClient.setQueryData(["notes", videoId], context?.previousNotes);
      toast.error(err instanceof Error ? err.message : "Failed to delete note");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", videoId] });
    },
  });

  const handleAddNote = () => {
    const content = newNoteContent.trim();
    if (!content) return;
    const time = getCurrentTime();
    addNoteMutation.mutate({ timestamp: time || 0, content });
  };

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 640px)");
    const apply = () => setSheetSide(mql.matches ? "bottom" : "right");
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (sheetSide !== "right") {
      setRightDrawerWidthPx(null);
      return;
    }

    const panel = document.querySelector<HTMLElement>(
      "[data-course-video-list-panel]"
    );
    if (!panel) {
      setRightDrawerWidthPx(null);
      return;
    }

    const lgMql = window.matchMedia("(min-width: 1024px)");

    const update = () => {
      // Only match the course video's right-column panel on lg+.
      if (!lgMql.matches) {
        setRightDrawerWidthPx(null);
        setRightDrawerOffsetPx(null);
        return;
      }

      const rect = panel.getBoundingClientRect();
      const width = Math.round(rect.width);
      // The panel is inside a padded container; SheetContent is fixed to the viewport.
      // Offset the drawer so its right edge aligns with the panel's right edge.
      const rightInset = Math.max(
        0,
        Math.round(window.innerWidth - rect.right)
      );
      // Protect against transient 0-width measurements during transitions.
      if (width >= 280) {
        setRightDrawerWidthPx(width);
        setRightDrawerOffsetPx(rightInset);
      }
    };

    update();

    lgMql.addEventListener("change", update);

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => {
        lgMql.removeEventListener("change", update);
        window.removeEventListener("resize", update);
      };
    }

    const ro = new ResizeObserver(() => update());
    ro.observe(panel);
    return () => {
      lgMql.removeEventListener("change", update);
      ro.disconnect();
    };
  }, [sheetSide]);

  const rightDrawerStyle =
    sheetSide === "right" && rightDrawerWidthPx
      ? ({
          width: `${rightDrawerWidthPx}px`,
          right:
            typeof rightDrawerOffsetPx === "number"
              ? `${rightDrawerOffsetPx}px`
              : undefined,
        } as const)
      : undefined;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          "p-0",
          sheetSide === "right" && "sm:max-w-none",
          className
        )}
        side={sheetSide}
        style={rightDrawerStyle}
      >
        <SheetHeader>
          <SheetTitle>Saved moments</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0 p-4">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notes?.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm mt-10 px-4">
              <p>No saved moments yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes?.map((note) => {
                const isOptimistic = note.id.startsWith("temp-");
                const isHighlighted = highlightedNoteId === note.id;
                const label = note.content?.trim();

                return (
                  <div
                    key={note.id}
                    className={cn(
                      "group relative border rounded-md p-3 transition-colors cursor-pointer bg-card",
                      isHighlighted ? "bg-accent/50" : "hover:bg-accent/50"
                    )}
                    onClick={() => {
                      seekTo(note.timestampSeconds);
                      setHighlightedNoteId(note.id);
                      window.setTimeout(() => setHighlightedNoteId(null), 800);
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-mono font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {formatTime(note.timestampSeconds)}
                      </span>
                      <p
                        className={cn(
                          "text-sm flex-1 min-w-0 whitespace-pre-wrap break-words leading-snug",
                          label ? "text-foreground/90" : "text-muted-foreground"
                        )}
                      >
                        {label || "Saved moment"}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                        disabled={deleteNoteMutation.isPending || isOptimistic}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isOptimistic) return;
                          deleteNoteMutation.mutate(note.id);
                        }}
                        aria-label="Delete moment"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 bg-background">
          <Textarea
            ref={inputRef}
            placeholder="Type a note…"
            value={newNoteContent}
            onChange={(e) => {
              const next = e.target.value;
              if (effectiveNoteLength(next) <= NOTE_MAX_EFFECTIVE_CHARS) {
                setNewNoteContent(next);
                return;
              }
              setNewNoteContent(
                truncateToEffectiveLimit(next, NOTE_MAX_EFFECTIVE_CHARS)
              );
            }}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddNote();
              }
            }}
            className="text-sm resize-none"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[10px] text-muted-foreground">
              Enter to save • Shift+Enter for new line
            </p>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {effectiveNoteLength(newNoteContent)}/{NOTE_MAX_EFFECTIVE_CHARS}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
