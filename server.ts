/**
 * Zero-dependency static server for local development: `bun run dev`.
 * The Netlify deploy serves the same folder as static files, no server needed.
 */
import { isAbsolute, join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dir);
const PORT = Number(Bun.env.PORT ?? 4321);

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".vtt": "text/vtt; charset=utf-8",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".m3u8": "application/vnd.apple.mpegurl",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

Bun.serve({
  port: PORT,
  idleTimeout: 60,

  async fetch(request) {
    const { pathname } = new URL(request.url);
    const target = resolve(join(ROOT, decodeURIComponent(pathname)));

    // Refuse anything that escapes the served directory. relative() rather than
    // a prefix test, so Windows backslashes do not defeat the check.
    const inside = relative(ROOT, target);
    if (inside.startsWith("..") || isAbsolute(inside)) {
      return new Response("Forbidden", { status: 403 });
    }

    const path = (await Bun.file(target).exists()) ? target : join(target, "index.html");
    const file = Bun.file(path);

    if (!(await file.exists())) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(file, {
      headers: {
        "content-type": TYPES[path.slice(path.lastIndexOf("."))] ?? "application/octet-stream",
        "cache-control": "no-store",
      },
    });
  },
});

console.log(`video-player dev server → http://localhost:${PORT}`);
