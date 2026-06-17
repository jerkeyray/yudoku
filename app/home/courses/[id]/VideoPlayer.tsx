import React, { useEffect, useRef, memo, useCallback, useMemo } from "react";
import YouTube, { YouTubeProps, YouTubePlayer } from "react-youtube";

interface VideoPlayerProps {
  videoId: string;
  initialTimestamp?: number;
  onReady: (player: YouTubePlayer) => void;
  onProgress: (time: number, options?: { force?: boolean }) => void;
  isReadingMode?: boolean;
}

const VideoPlayer = memo(
  ({
    videoId,
    initialTimestamp,
    onReady,
    onProgress,
    isReadingMode = false,
  }: VideoPlayerProps) => {
    const playerRef = useRef<YouTubePlayer | null>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const previousPlaybackRateRef = useRef<number>(1);
    const isSoftPausedRef = useRef(false);

    // Freeze videoId and initialTimestamp to prevent updates during lifecycle
    const videoIdRef = useRef(videoId);
    const initialTimestampRef = useRef(initialTimestamp);

    // Store callbacks in refs to avoid re-creating handlers
    const onReadyRef = useRef(onReady);
    const onProgressRef = useRef(onProgress);

    useEffect(() => {
      onReadyRef.current = onReady;
      onProgressRef.current = onProgress;
    }, [onReady, onProgress]);

    // Cleanup interval on unmount
    useEffect(() => {
      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    }, []);

    const handleReady = useCallback((event: { target: YouTubePlayer }) => {
      playerRef.current = event.target;
      if (onReadyRef.current) onReadyRef.current(event.target);
    }, []);

    const handleStateChange = useCallback(
      (event: { data: number; target: YouTubePlayer }) => {
        // 1 = Playing, 2 = Paused
        if (event.data === 1) {
          // Start interval to save progress
          if (progressIntervalRef.current)
            clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = setInterval(() => {
            const currentTime = event.target.getCurrentTime();
            if (onProgressRef.current) onProgressRef.current(currentTime);
          }, 20000);
        } else {
          // Clear interval and save immediately
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
          // Only save if we have a valid player instance
          if (
            event.target &&
            typeof event.target.getCurrentTime === "function"
          ) {
            const currentTime = event.target.getCurrentTime();
            if (onProgressRef.current)
              onProgressRef.current(currentTime, { force: true });
          }
        }
      },
      []
    );

    // Handle reading mode (soft pause)
    useEffect(() => {
      const player = playerRef.current;
      if (!player || typeof player.getPlaybackRate !== "function") return;

      if (isReadingMode) {
        // Enter reading mode: soft pause
        // Only apply if currently playing to avoid unpausing a real pause
        if (player.getPlayerState() === 1) {
          const currentRate = player.getPlaybackRate();
          previousPlaybackRateRef.current = currentRate;
          player.setPlaybackRate(0);
          isSoftPausedRef.current = true;
        }
      } else {
        // Exit reading mode: resume
        if (isSoftPausedRef.current) {
          player.setPlaybackRate(previousPlaybackRateRef.current);
          isSoftPausedRef.current = false;
        }
      }
    }, [isReadingMode]);

    const opts: YouTubeProps["opts"] = useMemo(
      () => ({
        height: "100%",
        width: "100%",
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3, // Hide video annotations
          fs: 1, // Allow fullscreen
          start:
            initialTimestampRef.current && initialTimestampRef.current > 0
              ? Math.floor(initialTimestampRef.current)
              : undefined,
        },
      }),
      []
    );

    return (
      <div className="w-full h-full">
        <YouTube
          videoId={videoIdRef.current}
          opts={opts}
          onReady={handleReady}
          onStateChange={handleStateChange}
          className="h-full w-full"
          iframeClassName="h-full w-full rounded-lg"
        />
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if videoId changes.
    return prevProps.videoId === nextProps.videoId;
  }
);

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
