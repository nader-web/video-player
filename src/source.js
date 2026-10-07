import { NATIVE_HLS } from "./config.js";

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);

const fail = (message, kind = "hint") => ({ ok: false, message, kind });

/**
 * Validate the `?url=` value before it reaches the player, so a bad request
 * gets an explanation instead of the skin's generic alertdialog.
 *
 * Relative paths resolve against the page, which is what makes `?url=/media/clip.mp4`
 * work on Netlify.
 */
export function resolveSource(raw) {
  let url;

  try {
    url = new URL(raw, location.href);
  } catch {
    return fail(`<code>${escapeHtml(raw)}</code> is not a valid url`);
  }

  if (!/^(https?|blob):$/.test(url.protocol)) {
    return fail(
      `<code>${escapeHtml(url.protocol)}</code> cannot be played. Use an http or https url.`,
      "error",
    );
  }

  if (/\.m3u8($|\?)/i.test(url.href) && !NATIVE_HLS) {
    return fail(
      "This browser has no native HLS support. Pass an <code>.mp4</code> or <code>.webm</code> url instead.",
      "error",
    );
  }

  return { ok: true, src: url.href };
}

/** Short human label for the source, shown in the meta row. */
export function kindOf(src) {
  const path = src.split(/[?#]/)[0].toLowerCase();
  if (path.endsWith(".m3u8")) return "HLS stream";
  const match = path.match(/\.(\w{2,5})$/);
  if (!match) return "direct media";
  return `${match[1].toUpperCase()} file`;
}