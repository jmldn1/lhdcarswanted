// The full-screen video player, loaded on the first press of a video button
// (./video.ts). A modal <dialog>: Escape, the close button or a tap outside
// the video closes it, and closing removes the player, which stops the video
// and leaves nothing running. Focus goes back to the button that opened it.
import type { VideoData } from "./video.ts";

const CSS = `
.vplayer{width:100vw;height:100vh;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;background:rgb(10 12 16 / .96);color:#fff}
.vplayer[open]{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px}
.vplayer::backdrop{background:transparent}
html:has(.vplayer[open]){overflow:hidden}
.vscreen{width:min(1100px,calc(100vw - 32px),calc((100dvh - 150px) * 16 / 9));aspect-ratio:16/9;background:#000}
.vscreen iframe,.vscreen video{display:block;width:100%;height:100%;border:0;background:#000}
.vclose{position:absolute;top:max(14px,env(safe-area-inset-top,0px));right:max(14px,env(safe-area-inset-right,0px));display:grid;place-items:center;width:48px;height:48px;border:0;border-radius:50%;background:#fff;color:#16181d;cursor:pointer}
.vclose svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.5;stroke-linecap:round}
.vclose:focus-visible{outline:3px solid #fff;outline-offset:3px}
.vcap{margin:0;padding:0 16px;color:#d4d8de;font-size:15px;text-align:center}
@media (max-width:639px){.vscreen{width:100vw}}
`;

let dialog: HTMLDialogElement | undefined;
let opener: HTMLElement | undefined;

function build(): HTMLDialogElement {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const d = document.createElement("dialog");
  d.className = "vplayer";
  d.innerHTML = `
    <button class="vclose" type="button" aria-label="Close the video">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
    </button>
    <div class="vscreen"></div>
    <p class="vcap"></p>`;
  document.body.append(d);
  d.querySelector(".vclose")!.addEventListener("click", () => d.close());
  // A tap on the dark area around the video (the dialog itself) closes it.
  d.addEventListener("click", (e) => {
    if (e.target === d) d.close();
  });
  d.addEventListener("close", () => {
    d.querySelector(".vscreen")!.replaceChildren();
    opener?.focus();
  });
  return d;
}

export function playVideo(v: VideoData, from?: HTMLElement) {
  dialog ??= build();
  opener = from;
  dialog.setAttribute("aria-label", v.title);
  dialog.querySelector(".vcap")!.textContent = v.caption;

  let player: HTMLIFrameElement | HTMLVideoElement;
  if (v.kind === "file") {
    const video = document.createElement("video");
    video.src = v.src;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = "auto";
    player = video;
  } else {
    const frame = document.createElement("iframe");
    frame.src = v.src;
    frame.title = v.title;
    frame.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture";
    frame.allowFullscreen = true;
    // YouTube refuses to play embeds that send no referrer.
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    player = frame;
  }
  dialog.querySelector(".vscreen")!.replaceChildren(player);
  dialog.showModal();
  dialog.querySelector<HTMLButtonElement>(".vclose")!.focus();
}
