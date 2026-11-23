const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Returns the 11-character YouTube video id for a watch/share/embed/shorts URL, or null. */
export function getYouTubeId(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] && ["embed", "shorts", "live", "v"].includes(parts[0])) id = parts[1] ?? null;
    }
  }
  return id && ID_RE.test(id) ? id : null;
}

export function isValidHttpUrl(input: string): boolean {
  try {
    const u = new URL(input.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function youTubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youTubeEmbed(id: string): string {
  return `https://www.youtube.com/embed/${id}?rel=0`;
}
