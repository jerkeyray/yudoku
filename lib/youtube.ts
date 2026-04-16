/* eslint-disable @typescript-eslint/no-explicit-any */
import { youtube as youtubeClient } from "@googleapis/youtube";

const youtube = youtubeClient("v3");

interface PlaylistVideo {
  title: string;
  youtubeId: string;
}

interface PlaylistDetails {
  title: string;
  videos: PlaylistVideo[];
}

export function extractVideoId(url: string): string | null {
  try {
    // Supports:
    // - https://www.youtube.com/watch?v=VIDEOID
    // - https://youtu.be/VIDEOID
    // - https://www.youtube.com/shorts/VIDEOID
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id ? id : null;
    }

    if (host.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;

      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" && parts[1]) return parts[1];
    }

    return null;
  } catch {
    return null;
  }
}

function parseIsoDurationToSeconds(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  return hours * 3600 + minutes * 60 + seconds;
}

export async function fetchSingleVideoDetails(videoId: string): Promise<{
  title: string;
  description: string;
  durationSeconds: number;
}> {
  const response = await youtube.videos.list({
    key: process.env.YOUTUBE_API_KEY,
    part: ["snippet", "contentDetails"],
    id: [videoId],
  });

  const item = response.data.items?.[0];
  if (!item) throw new Error("Video not found");

  const title = item.snippet?.title ?? "Untitled Video";
  const description = item.snippet?.description ?? "";
  const duration = item.contentDetails?.duration ?? "PT0S";
  const durationSeconds = parseIsoDurationToSeconds(duration);

  return { title, description, durationSeconds };
}

export function extractPlaylistId(url: string): string | null {
  const regex = /[?&]list=([a-zA-Z0-9_-]+)/;
  const match = regex.exec(url);
  return match?.[1] ?? null;
}

export async function fetchPlaylistDetails(
  playlistId: string
): Promise<PlaylistDetails> {
  try {
    // First, get the playlist info
    const playlistResponse = await youtube.playlists.list({
      key: process.env.YOUTUBE_API_KEY,
      part: ["snippet"],
      id: [playlistId],
    });

    if (!playlistResponse.data.items?.[0]) {
      throw new Error("Playlist not found");
    }

    // Fetch all videos with pagination support
    const videos: PlaylistVideo[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
      // Type annotation for videosResponse
      const videosResponse: any = await youtube.playlistItems.list({
        key: process.env.YOUTUBE_API_KEY,
        part: ["snippet", "contentDetails"],
        playlistId,
        maxResults: 50,
        pageToken: nextPageToken,
      });

      if (videosResponse.data.items?.length) {
        // Extract video information from each item
        videosResponse.data.items.forEach((item: any) => {
          if (item.snippet && item.contentDetails?.videoId) {
            videos.push({
              title: item.snippet.title ?? "Untitled Video",
              youtubeId: item.contentDetails.videoId,
            });
          }
        });
      }

      nextPageToken = videosResponse.data.nextPageToken;
    } while (nextPageToken);

    if (videos.length === 0) {
      throw new Error("No videos found in playlist");
    }

    return {
      title:
        playlistResponse.data.items[0].snippet?.title ?? "Untitled Playlist",
      videos,
    };
  } catch {
    // Handle error silently
    throw new Error("Failed to fetch playlist details");
  }
}

export async function getPlaylistTitle(playlistId: string): Promise<string> {
  try {
    const response = await youtube.playlists.list({
      key: process.env.YOUTUBE_API_KEY,
      part: ["snippet"],
      id: [playlistId],
    });

    if (!response.data.items?.[0]) {
      throw new Error("Playlist not found");
    }

    return response.data.items[0].snippet?.title ?? "Untitled Playlist";
  } catch {
    // Handle error silently
    throw new Error("Failed to fetch playlist title");
  }
}

export async function getPlaylistVideos(playlistUrlOrId: string) {
  try {
    let playlistId = playlistUrlOrId;

    // Check if it's a URL and extract the playlist ID if it is
    if (
      playlistUrlOrId.includes("youtube.com") ||
      playlistUrlOrId.includes("youtu.be")
    ) {
      const match = playlistUrlOrId.match(/[&?]list=([^&]+)/);
      if (!match || !match[1]) {
        throw new Error("Invalid playlist URL");
      }
      playlistId = match[1];
    }

    // Collect all videos with pagination
    const allVideos: any[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
      // Type annotation for response
      const response: any = await youtube.playlistItems.list({
        key: process.env.YOUTUBE_API_KEY,
        part: ["snippet", "contentDetails"],
        playlistId,
        maxResults: 50,
        pageToken: nextPageToken,
      });

      if (response.data.items?.length) {
        allVideos.push(...response.data.items);
      }

      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);

    const videos = allVideos.map((item) => ({
      id: item.contentDetails?.videoId,
      title: item.snippet?.title,
      duration: 0, // Duration requires additional API call
    }));

    return videos.filter(
      (v): v is { id: string; title: string; duration: number } =>
        Boolean(v.id && v.title)
    );
  } catch {
    // Handle error silently
    throw new Error("Failed to fetch playlist videos");
  }
}

export async function getVideoDetails(videoId: string) {
  try {
    const response = await youtube.videos.list({
      key: process.env.YOUTUBE_API_KEY,
      part: ["contentDetails"],
      id: [videoId],
    });

    if (!response.data.items?.[0]) {
      throw new Error("Video not found");
    }

    const duration = response.data.items[0].contentDetails?.duration;
    if (!duration) {
      throw new Error("Duration not found");
    }

    // Convert ISO 8601 duration to MM:SS format
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) {
      throw new Error("Invalid duration format");
    }

    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const formattedMinutes = Math.floor(totalSeconds / 60);
    const formattedSeconds = totalSeconds % 60;

    return `${formattedMinutes}:${formattedSeconds
      .toString()
      .padStart(2, "0")}`;
  } catch {
    // Handle error silently
    return "0:00";
  }
}
