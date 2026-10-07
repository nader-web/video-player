import { DEMO_SRC } from "./config.js";
import { readQuery } from "./params.js";
import { resolveSource, kindOf } from "./source.js";
import { mount } from "./player.js";
import * as ui from "./ui.js";

/** Reads the query string, validates it, and points the player at the result. */
function init() {
  const query = readQuery(DEMO_SRC);
  const source = resolveSource(query.src);

  ui.setInputValue(query.src);
  ui.setHeading(query.title ?? "Video player");

  if (!source.ok) {
    ui.setMeta({ kind: "no source" });
    ui.showMessage(source.message, source.kind);
    return;
  }

  ui.setMeta({ kind: kindOf(source.src) });
  ui.showPlayer();

  const media = mount(query);

  media.addEventListener(
    "loadedmetadata",
    () => {
      ui.setStageState("ready");
      ui.setMeta({
        kind: kindOf(media.currentSrc || media.src),
        duration: ui.formatDuration(media.duration),
      });
    },
    { once: true },
  );

  media.addEventListener("error", () => {
    // The packaged skin renders its own alertdialog here; this only stops the
    // loading shimmer from spinning forever underneath it.
    ui.setStageState("error");
  });
}

ui.wireCopyLink();
ui.wireSourceForm((value) => {
  const params = new URLSearchParams(location.search);

  params.set("url", value);
  history.pushState(null, "", `?${params}`);
  init();
});

addEventListener("popstate", init);
init();
