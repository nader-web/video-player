/**
 * Pinned third-party assets and page defaults.
 * Pin the exact version: a minor bump changes skins and layouts.
 */
export const VIDEOJS_VERSION = "10.0.1";

export const CDN_BASE = `https://cdn.jsdelivr.net/npm/@videojs/cdn@${VIDEOJS_VERSION}`;

/** Demo clip, so the page is never empty. Replaced by `?url=`. */
export const DEMO_SRC =
  "https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4";

/**
 * Chrome answers `canPlayType("application/vnd.apple.mpegurl")` with "maybe"
 * and then fails to play it, so native HLS is a user-agent question.
 */
export const NATIVE_HLS =
  /Safari/.test(navigator.userAgent) && !/(Chrome|Chromium|Edg|OPR|Android)/.test(navigator.userAgent);