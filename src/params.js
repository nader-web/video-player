/**
 * Query-string contract. Everything is optional; the page falls back to the
 * demo clip so a bare URL still plays something.
 *
 *   ?url=…      media to load (absolute, or a path relative to this page)
 *   ?poster=…   poster image, relative or absolute
 *   ?captions=… WebVTT file, relative or absolute
 *   ?title=…    heading for the source
 *   ?start=…    seconds to begin at
 */
const read = (key) => new URL(location.href).searchParams.get(key);

export function readQuery(fallbackSrc) {
  const start = Number.parseFloat(read("start"));

  return {
    src: read("url") ?? fallbackSrc,
    poster: read("poster"),
    captions: read("captions"),
    title: read("title")?.trim() || null,
    start: Number.isFinite(start) && start > 0 ? start : 0,
  };
}