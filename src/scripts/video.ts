// The car page's video buttons (anything with data-video). Nothing from the
// video's host loads with the page: pointing at a button (or focusing it)
// only warms up a connection to the host, and pressing it loads the player
// (./video-player.ts, its own small file) and the video, full screen. The
// video's details come from <script type="application/json" id="car-video">
// (src/lib/video.ts).
export interface VideoData {
  kind: "embed" | "file";
  src: string;
  title: string;
  caption: string;
}

export function wireVideo() {
  const el = document.getElementById("car-video");
  const triggers = document.querySelectorAll<HTMLElement>("[data-video]");
  if (!el || !triggers.length) return;
  const data: VideoData = JSON.parse(el.textContent ?? "{}");

  let warmed = false;
  const warm = () => {
    if (warmed) return;
    warmed = true;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = new URL(data.src, location.href).origin;
    document.head.append(link);
  };
  for (const t of triggers) {
    t.addEventListener("pointerenter", warm, { once: true });
    t.addEventListener("focus", warm, { once: true });
    t.addEventListener("click", async (e) => {
      e.preventDefault();
      const { playVideo } = await import("./video-player.ts");
      playVideo(data, t);
    });
  }
}
