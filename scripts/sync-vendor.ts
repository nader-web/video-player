/**
 * Mirror the browser-ready Video.js bundles into `vendor/videojs/`.
 *
 * Why vendored instead of a <script> CDN tag: the page must make no outbound
 * requests. `@videojs/cdn` ships prebuilt, dependency-free browser bundles, so
 * this needs no bundler and no build step — the docs' "mirror the CDN files" route.
 *
 * The entry file `video.js` imports hundreds of sibling chunks by relative path,
 * so the whole tree is copied, not just the entry and its stylesheet.
 *
 * Run after bumping @videojs/cdn:  bun run vendor
 */
import { copyFile, mkdir, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import * as posix from "node:path/posix";

const SOURCE = "node_modules/@videojs/cdn";
const TARGET = "vendor/videojs";

/** Dev builds and sourcemaps are never requested by the production entry. */
const keep = (path) => !path.endsWith(".map") && !path.endsWith(".dev.js") && !path.endsWith(".d.ts");

const { version } = await Bun.file(`${SOURCE}/package.json`).json();

await rm(TARGET, { recursive: true, force: true });

let files = 0;
let bytes = 0;

for await (const relative of new Bun.Glob("**/*.{js,css}").scan({ cwd: SOURCE })) {
  if (!keep(relative)) continue;

  const from = join(SOURCE, relative);
  const to = join(TARGET, relative);

  await mkdir(dirname(to), { recursive: true });
  await copyFile(from, to);

  files += 1;
  bytes += (await stat(from)).size;
}

// Apache-2.0 attribution travels with the code.
await copyFile(join(SOURCE, "LICENSE"), join(TARGET, "LICENSE"));
await Bun.write(join(TARGET, "VERSION"), version);

/**
 * Walk the entry's whole relative-import graph and confirm every target was
 * copied. A missing chunk otherwise surfaces only as a bundler error in CI.
 */
const pending = ["video.js"];
const seen = new Set<string>();
const missing: string[] = [];

while (pending.length) {
  const relative = pending.pop()!;

  if (seen.has(relative)) continue;
  seen.add(relative);

  const file = Bun.file(join(TARGET, relative));

  if (!(await file.exists())) {
    missing.push(relative);
    continue;
  }

  const code = await file.text();

  for (const [, specifier] of code.matchAll(/(?:from|import)\s*\(?\s*["'](\.[^"']+)["']/g)) {
    pending.push(posix.join(posix.dirname(relative), specifier));
  }
}

if (missing.length) {
  throw new Error(`incomplete vendor tree, missing:\n  ${missing.join("\n  ")}`);
}

console.log(
  `vendored @videojs/cdn@${version}: ${files} files, ${(bytes / 1048576).toFixed(1)} MB -> ${TARGET}\n` +
    `import graph verified: ${seen.size} modules reachable from video.js`,
);
