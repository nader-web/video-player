/** Everything that touches the page chrome around the player. */

const el = (id) => document.getElementById(id);

const ALERT_ICON = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
  <circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16.5h.01"/>
</svg>`;

const HINT_ICON = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="2.5" y="4.5" width="19" height="15" rx="3"/><path d="M10 9.2l5 2.8-5 2.8z"/>
</svg>`;

/** Swap the player for an explanation. Errors announce; hints do not interrupt. */
export function showMessage(message, kind = "hint") {
  const msg = el("msg");

  msg.dataset.kind = kind;
  msg.setAttribute("role", kind === "error" ? "alert" : "status");
  msg.innerHTML = (kind === "error" ? ALERT_ICON : HINT_ICON) + `<p>${message}</p>`;

  msg.hidden = false;
  el("skin").hidden = true;
  el("stage").dataset.state = "idle";
}

export function showPlayer() {
  el("msg").hidden = true;
  el("skin").hidden = false;
  el("stage").dataset.state = "loading";
}

export function setStageState(state) {
  el("stage").dataset.state = state;
}

/** Media kind and duration once the browser knows it. */
export function setMeta({ kind, duration }) {
  el("meta-kind").textContent = kind;
  if (duration !== undefined) el("meta-duration").textContent = duration;
}

/** The URL bar mirrors the input, so the address is always the truth. */
export function setInputValue(value) {
  el("source").value = value;
}

export function wireSourceForm(onSubmit) {
  const form = el("load");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const value = el("source").value.trim();
    if (value) onSubmit(value);
  });
}

export function setHeading(title) {
  el("title").textContent = title;
  document.title = `${title} · video player`;
  el("stage").setAttribute("aria-label", title);
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "—:—";

  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, "0");

  return mins >= 60 ? `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}:${secs}` : `${mins}:${secs}`;
}

export function wireCopyLink() {
  const button = el("copy");
  const label = button.textContent;
  let timer;

  button.addEventListener("click", async () => {
    try {
      // Rebuilt, not copied from the address bar: the bar may hold a raw
      // unencoded ?url=, while a share link must always be canonical.
      // Other params (poster, captions, title, start) are preserved.
      const params = new URLSearchParams(location.search);
      params.set("url", el("source").value.trim());
      await copyText(`${location.origin}${location.pathname}?${params}`);
      button.dataset.copied = "";
      button.textContent = "Copied";
    } catch {
      // Clipboard blocked (insecure origin, denied permission) — say so, don't lie.
      button.textContent = "Copy blocked";
    }

    clearTimeout(timer);
    timer = setTimeout(() => {
      delete button.dataset.copied;
      button.textContent = label;
    }, 1600);
  });
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Fallback for insecure contexts, where the Clipboard API does not exist.
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();

  if (!document.execCommand("copy")) {
    area.remove();
    throw new Error("copy failed");
  }

  area.remove();
}