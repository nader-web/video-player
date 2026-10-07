/**
 * Points the plain <video> element at its source.
 *
 * Setting attributes on the media element works before the custom elements
 * upgrade, so there is no store, controller, or ordering to get wrong.
 */
export function mount({ src, poster, captions, start }) {
  const media = document.getElementById("media");

  // Re-loading through the input must not keep the previous captions track.
  media.querySelectorAll("track").forEach((track) => track.remove());
  media.removeAttribute("poster");

  media.src = src;

  if (poster) {
    media.poster = new URL(poster, location.href).href;
  }

  if (captions) {
    const track = document.createElement("track");
    track.kind = "captions";
    track.srclang = "en";
    track.label = "English";
    track.src = new URL(captions, location.href).href;
    media.append(track);
  }

  if (start) {
    media.addEventListener(
      "loadedmetadata",
      () => {
        // Clamped, so ?start=999 on a 12s clip seeks to the end instead of throwing.
        media.currentTime = Math.min(start, media.duration || start);
      },
      { once: true },
    );
  }

  return media;
}