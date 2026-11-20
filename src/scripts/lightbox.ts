// Full-screen photos with lightGallery (as on London LHD Centre v1; its free
// GPLv3 build for now, see BRIEF.md). Its script loads on the first open.
// Settings as on v1: a fade between photos, zoom, a fullscreen button, swipe
// down to close on phones, and smaller thumbnails there (with a button to
// hide them) so the photo gets the screen. The photos come from the page's
// <script type="application/json" id="lightbox-photos"> (src/lib/lightbox.ts).
import "lightgallery/css/lightgallery.css";
import "lightgallery/css/lg-zoom.css";
import "lightgallery/css/lg-thumbnail.css";
import "lightgallery/css/lg-fullscreen.css";

let gallery: { openGallery: (i: number) => void; index: number } | undefined;
let closed: ((index: number) => void) | undefined;

/** Opens at photo `i`; `onClose` gets the photo showing when it closes. */
export async function openLightbox(i: number, onClose?: (index: number) => void) {
  closed = onClose;
  if (!gallery) {
    const [{ default: lightGallery }, { default: lgZoom }, { default: lgThumbnail }, { default: lgFullscreen }] =
      await Promise.all([
        import("lightgallery"),
        import("lightgallery/plugins/zoom"),
        import("lightgallery/plugins/thumbnail"),
        import("lightgallery/plugins/fullscreen"),
      ]);
    const items = JSON.parse(document.getElementById("lightbox-photos")?.textContent ?? "[]");
    const host = document.createElement("div");
    document.body.append(host);
    const phone = matchMedia("(max-width: 639px)").matches;
    const lg = lightGallery(host, {
      dynamic: true,
      dynamicEl: items,
      plugins: [lgZoom, lgThumbnail, lgFullscreen],
      download: false,
      mode: "lg-fade",
      speed: 450,
      swipeToClose: true,
      allowMediaOverlap: phone,
      toggleThumb: phone,
      thumbWidth: phone ? 64 : 100,
      thumbHeight: phone ? "48px" : "64px",
      thumbMargin: 6,
      mobileSettings: { controls: false, showCloseIcon: true, download: false },
    });
    host.addEventListener("lgBeforeClose", () => closed?.(lg.index));
    gallery = lg;
  }
  gallery.openGallery(i);
}
