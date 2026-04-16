"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/ui/loader";

interface LoadingScreenProps {
  variant?: "fullscreen" | "contained" | "inline";
  text?: string;
  className?: string;
}

export default function LoadingScreen({
  variant = "fullscreen",
  text,
  className = "",
}: LoadingScreenProps) {
  const containerVariants = {
    fullscreen:
      "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm",
    contained:
      "w-full h-full min-h-[200px] flex flex-col items-center justify-center bg-neutral-900/50 rounded-lg",
    inline: "flex items-center justify-center py-4",
  };

  return (
    <div className={cn(containerVariants[variant], className)}>
      <div className="flex flex-col items-center gap-4">
        {variant === "fullscreen" && (
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
            yudoku
          </h1>
        )}

        <Loader size="lg" className="text-white/80" />

        {text && (
          <p className="text-neutral-400 text-sm font-medium animate-pulse">
            {text}
          </p>
        )}
      </div>
    </div>
  );
}
