export interface YouTubeEmbed {
  id: string;
  embedUrl: string;
  thumbnailUrl: string;
  fallbackThumbnailUrl: string;
}

export function getYouTubeEmbed(url?: string): YouTubeEmbed | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    let id = "";

    if (host === "youtu.be") {
      id = parsed.pathname.split("/").filter(Boolean)[0] || "";
    } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (parsed.pathname.startsWith("/watch")) {
        id = parsed.searchParams.get("v") || "";
      } else if (parsed.pathname.startsWith("/embed/") || parsed.pathname.startsWith("/shorts/")) {
        id = parsed.pathname.split("/").filter(Boolean)[1] || "";
      }
    }

    if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;

    return {
      id,
      embedUrl: `https://www.youtube.com/embed/${id}`,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
      fallbackThumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  } catch {
    return null;
  }
}
