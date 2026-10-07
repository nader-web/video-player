/**
 * Production build. Runs in CI only — never on a dev machine.
 *
 * Input:  src/entry.js (app + vendored Video.js) and styles/bundle.css
 *         (skin + app styles + self-hosted fonts).
 * Output: dist/index.html, dist/assets/app.{js,css}, fonts, dist/.nojekyll.
 *
 * `bun run build`
 */
import { cp, mkdir, rm, stat } from "node:fs/promises";
import { build } from "esbuild";

const DIST = "dist";
const ASSETS = `${DIST}/assets`;

await rm(DIST, { recursive: true, force: true });
await mkdir(ASSETS, { recursive: true });

// One self-contained module: the vendor tree (~570 files) becomes one file.
await build({
  entryPoints: ["src/entry.js"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["chrome110", "firefox110", "safari16"],
  minify: true,
  sourcemap: false,
  outdir: ASSETS,
  entryNames: "app",
  logLevel: "info",
});

// Skin + app styles in one sheet; woff2 files are emitted beside it and the
// URLs inside the CSS are rewritten by esbuild.
await build({
  entryPoints: ["styles/bundle.css"],
  bundle: true,
  minify: true,
  outdir: ASSETS,
  entryNames: "app",
  loader: { ".woff2": "file" },
  logLevel: "info",
});

// The dev page points at source paths; the deployed page points at the bundle.
const source = await Bun.file("index.html").text();

const replacements: Array<[string, string]> = [
  [
    '<link rel="stylesheet" href="./styles/app.css">',
    '<link rel="stylesheet" href="./assets/app.css">',
  ],
  [
    [
      "  <!-- Video.js 10, pinned and vendored from @videojs/cdn. video.css is required:",
      "       the script injects no styles, and the skin themes only through --media-*. -->",
      '  <link rel="stylesheet" href="./vendor/videojs/video.css">',
      '  <script type="module" src="./vendor/videojs/video.js"></script>',
      "",
      '  <script type="module" src="./src/main.js"></script>',
    ].join("\n"),
    '  <script type="module" src="./assets/app.js"></script>',
  ],
];

let html = source;

for (const [from, to] of replacements) {
  if (!html.includes(from)) {
    throw new Error(`build: anchor not found in index.html:\n${from.slice(0, 120)}`);
  }

  html = html.replace(from, to);
}

await Bun.write(`${DIST}/index.html`, html);

// Tell Pages to serve the directory as-is instead of running Jekyll over it.
await Bun.write(`${DIST}/.nojekyll`, "");

// Ship committed media verbatim when it exists. Nothing to encode here.
try {
  await stat("media");
  await cp("media", `${DIST}/media`, { recursive: true });
} catch {
  // No media yet — the demo clip covers local runs.
}

const css = await stat(`${ASSETS}/app.css`);
const js = await stat(`${ASSETS}/app.js`);

console.log(
  `dist: index.html + assets/app.js (${(js.size / 1024).toFixed(0)} KB) + ` +
    `assets/app.css (${(css.size / 1024).toFixed(0)} KB)`,
);
