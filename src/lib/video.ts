// A car's walkaround video: a YouTube or Vimeo link, or a video file's web
// address (.mp4 or .webm). The car's page shows one of its own photos as the
// poster, so nothing from the video's host loads until someone presses play
// (src/scripts/video.ts); then it plays in a full-screen player.
import type { Car } from "./cars.ts";
import type { Photo } from "./photos.ts";

export interface CarVideo {
  /** As pasted into the admin. */
  url: string;
  /** Shown on the page, e.g. "2:14"; optional. */
  length?: string;
  /** The id of the car photo shown as the poster; the second photo if unset. */
  poster?: string;
}

export type Source =
  | { kind: "youtube"; id: string }
  | { kind: "vimeo"; id: string; hash?: string }
  | { kind: "file"; src: string };

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const NUM = /^\d{4,12}$/;
const HASH = /^[0-9a-f]{6,20}$/i;
const FILE = /\.(mp4|webm|m4v)$/i;

/** What the link points at, or null when it isn't a video we can play. */
export function videoSource(link: string): Source | null {
  const raw = link.trim();
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return FILE.test(raw.split(/[?#]/)[0]) ? { kind: "file", src: raw } : null;
  }
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  // An http:// YouTube or Vimeo link is fine (the player is always https);
  // a video file must be https, or the browser would block it.
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") return YT_ID.test(parts[0] ?? "") ? { kind: "youtube", id: parts[0] } : null;
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id = u.searchParams.get("v") ?? (["embed", "shorts", "live", "v"].includes(parts[0]) ? parts[1] : undefined);
    return id && YT_ID.test(id) ? { kind: "youtube", id } : null;
  }
  if (host === "vimeo.com") {
    // vimeo.com/123456789, or an unlisted one: vimeo.com/123456789/abc123def
    const i = parts.findIndex((p) => NUM.test(p));
    if (i < 0) return null;
    const hash = parts[i + 1] && HASH.test(parts[i + 1]) ? parts[i + 1] : undefined;
    return { kind: "vimeo", id: parts[i], hash };
  }
  if (host === "player.vimeo.com" && parts[0] === "video" && NUM.test(parts[1] ?? "")) {
    const h = u.searchParams.get("h");
    return { kind: "vimeo", id: parts[1], hash: h && HASH.test(h) ? h : undefined };
  }
  return u.protocol === "https:" && FILE.test(u.pathname) ? { kind: "file", src: u.href } : null;
}

/** The player's address: YouTube without cookies and showing only related videos from the same channel. */
function embedUrl(s: Source): string {
  if (s.kind === "youtube") return `https://www.youtube-nocookie.com/embed/${s.id}?autoplay=1&rel=0&playsinline=1`;
  if (s.kind === "vimeo") return `https://player.vimeo.com/video/${s.id}?autoplay=1&dnt=1${s.hash ? `&h=${s.hash}` : ""}`;
  return s.src;
}

/** "2:14", "12:05" or "1:02:30". */
export const LENGTH = /^(\d{1,2}:)?[0-5]?\d:[0-5]\d$/;

/** "2 minutes 14", for screen readers. */
export function spokenLength(length: string): string {
  const [s, m, h] = length.split(":").reverse().map(Number);
  return [h && `${h} hour${h > 1 ? "s" : ""}`, m && `${m} minute${m > 1 ? "s" : ""}`, s && `${s}`].filter(Boolean).join(" ");
}

export interface PageVideo {
  poster?: Photo;
  length?: string;
  /** "Play the walkaround video, 2 minutes 14" */
  label: string;
  /** For the page to embed as <script type="application/json" id="car-video">. */
  json: string;
}

/** What a car's page needs for its video, or undefined when it has none (or the link isn't usable). */
export function pageVideo(car: Car): PageVideo | undefined {
  const v = car.video;
  const source = v && videoSource(v.url);
  if (!v || !source) return undefined;
  const poster = car.photos.find((p) => p.id === v.poster) ?? car.photos[1] ?? car.photos[0];
  const title = `${car.make} ${car.model} walkaround video`;
  const data = {
    kind: source.kind === "file" ? "file" : "embed",
    src: embedUrl(source),
    title,
    caption: [`${car.make} ${car.model} walkaround`, v.length].filter(Boolean).join(" · "),
  };
  return {
    poster,
    length: v.length,
    label: `Play the walkaround video${v.length ? `, ${spokenLength(v.length)}` : ""}`,
    // Safe inside <script>: no "</script>" can appear.
    json: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}
