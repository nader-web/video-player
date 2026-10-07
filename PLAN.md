# Video Player — Implementation Plan

**Location:** `video-player/` · **Stack:** Video.js 10 (default skin) via CDN, static HTML, no build step
**Hosting:** Netlify (static deploy, no functions)
**Goal:** play *our own* video from *our own* domain, in a good-looking, accessible player, addressed by `?url=`.

---

## 1. How it works

```
GET /index.html?url=/media/clip.mp4
        │
        ├─ CDN bundle registers <video-player>, <video-skin>  (module script, deferred)
        ├─ inline module script resolves ?url= against the page, validates, sets <video src>
        │
        ├─ invalid url / bad protocol / HLS without an adapter → message, player hidden
        └─ valid → player shown, skin renders all controls
        │
        └─ load failure (404, decode error) → Video.js skin's own alertdialog
```

Three parts, per the Video.js model:

| Part | Element | Job |
|---|---|---|
| Player | `<video-player>` | Owns and shares state. Renders nothing. |
| Skin | `<video-skin>` | The entire UI — every control, layout, and style. |
| Media | `<video>` | Plays the source. No UI. |

The `?url=` value is set as an attribute on the plain `<video>` element **before** the custom
elements upgrade, so no store, controller, or `StoreError` is involved. No `controls`
attribute: the skin provides controls.

### CDN tags (verified against `@videojs/cdn@10.0.1`)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@videojs/cdn@10.0.1/video.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/cdn@10.0.1/video.js"></script>
```

**Both are required.** `video.js` contains zero CSS imports and injects no styles; the skin
lives entirely in `video.css`, which already includes the `global.css` light-DOM rules
(`display: contents` on `<video-player>`, the media box). Loading only the script — as the
generated Installation Guide snippet does — yields an unstyled player. Verified by fetching
the bundle and grepping it for `.css` references and stylesheet construction.

Pin the version. Do not use `@10` or `@latest`; a minor bump changes skins and layouts.

---

## 2. Parameters

| Param | Required | Behaviour |
|---|---|---|
| `url` | no | http(s), `blob:`, or a relative path resolved against the page. Defaults to the Mux demo clip so the page works bare. |
| `poster` | no | Sets `<video poster>`. Relative paths allowed. |

Validation, all inline messages, no player shown:
invalid url · non-http(s)/blob protocol · `.m3u8` on a browser with no native HLS.

**HLS detection is UA-based, not `canPlayType`-based.** Chrome answers
`canPlayType('application/vnd.apple.mpegurl') === 'maybe'` and then fails to play. Only
Safari/iOS get a pass; everything else gets the "needs a playback adapter" message.

---

## 3. Hosting the video on Netlify

| Where the file lives | Verdict |
|---|---|
| `video-player/media/clip.mp4` committed to the repo | **Use this.** Same origin, no CORS, simplest. Fine to ~50–80 MB. |
| Git LFS | **No.** Netlify clones over plain HTTPS; LFS pointers deploy as broken 1 KB files. |
| Pulled from S3/R2 at build time | Only if the file outgrows a commit. |
| Mux / Cloudflare Stream / Bunny | Out of scope. Revisit past ~100 MB or if you want adaptive bitrate. |

```toml
# netlify.toml
[build]
  publish = "."
  command = ""

[[headers]]
  for = "/media/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/index.html"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
```

Deploy by dropping the folder in the Netlify UI, or `netlify deploy --dir=video-player`.

### Gate the launch on these two checks

```bash
curl -sI "https://<site>/media/clip.mp4" | grep -Ei "HTTP/|content-type|content-length|accept-ranges"
curl -sI -H "Range: bytes=0-1023" "https://<site>/media/clip.mp4" | grep -Ei "HTTP/|content-range"   # must be 206
```

`200` on the ranged request means seeking is broken. Also confirm the plan's current
bandwidth/credit limits — they change, and a 40 MB video watched 1 000 times is 40 GB.

---

## 4. Source media (one-time, per video)

```bash
ffmpeg -i source.mov -vf scale=-2:1080 -c:v libx264 -preset slow -crf 21 \
  -c:a aac -b:a 128k -movflags +faststart media/clip-1080.mp4
ffmpeg -i source.mov -vf scale=-2:720  -c:v libx264 -preset slow -crf 22 \
  -c:a aac -b:a 128k -movflags +faststart media/clip-720.mp4

ffmpeg -ss 00:00:05 -i source.mov -frames:v 1 -q:v 3 media/poster.jpg
```

`+faststart` moves the moov atom to the front — without it, playback stalls until the whole
file downloads. Keep 1080p under ~30 MB. Captions are a launch requirement, not a nicety
(WCAG 1.2.2, prerecorded video).

---

## 5. Visual design

Video.js exposes its design as CSS custom properties, so branding is a token swap — no
forks, no skin source needed unless controls themselves must change.

- Set in `:root` today: `--media-accent-color: #4f8cff`, `--media-accent-text-color`,
  `--media-control-background`, `--media-font-family`.
- The `Default` skin is the opinionated Video.js look. `Neutral` is the easy-to-brand one;
  `Compat` is the low-feature, widest-browser option. Switching = swap `video.css` for
  `video-neutral.css` / `video-compat.css`.
- Own the UI (add, remove, rearrange controls) → shadcn route: add the skin source, then
  the files are yours to edit. Only worth it if the control layout itself changes.

---

## 6. What the skin gives you for free

Seek bar with buffered track and hover preview, play/pause, volume + mute, current time and
duration, captions, playback speed, settings menu, PiP, AirPlay, fullscreen, hotkeys,
auto-hiding chrome, buffering indicator, poster, and an accessible error dialog.

Therefore **drop from the original plan**: hand-rolled seek dragging, buffered ranges, the
keyboard map, auto-hide chrome, PiP/fullscreen wiring, and the error surface. All of it is
already built and tested. Effort moves to media prep (§4) and branding (§5).

---

## 7. Remaining work

1. **Media** — encode 1080p + 720p, poster, captions. Verify `+faststart`.
2. **Drop in our own clip** — `media/clip.mp4`, confirm it plays with `?url=/media/clip.mp4`.
3. **Brand** — set the `--media-*` tokens from `DESIGN.md`; decide Default vs Neutral skin.
4. **Polish** — the skin's error dialog shows raw developer text
   (`MEDIA_ELEMENT_ERROR: Format error`). Replace with a human message.
5. **README** — how to add a video, limitations, embed snippet.

## 8. Open decisions

1. **Skin:** Default (as installed) or Neutral for easier branding? *(Default is fine — it is
   already themed by token.)*
2. **Quality ladder or one encode?** Ladder needs multiple `<source>`s or a `<quality-menu>`;
   only worth it past ~25 MB.
3. **Captions** — do you have the transcript?
4. **Self-host the CDN files?** `video.js` + `video.css` are ~190 KB combined. Netlify
   serves them same-origin if you download them into `vendor/`, which removes the
   third-party dependency and the extra DNS lookup. Recommended once this ships.

## 9. Risks

| Risk | Mitigation |
|---|---|
| CDN unreachable or blocked by an ad blocker | Self-host step 8.4 — the bundle is already public |
| Unpinned CDN version changes the skin | Version pinned to `10.0.1`; bump deliberately |
| Video too large for deploy/bandwidth | Encode ladder, keep 1080p < 30 MB |
| No `206` on Netlify → no seeking | §3 curl check gates launch |
| Error dialog leaks developer text | §7 step 4 |
| Captions missing | Blocks launch |