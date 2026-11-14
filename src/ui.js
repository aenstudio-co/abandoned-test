import { TITLE, EXPLORER, PLANETS, ALL_EQUIPMENT } from "./data.js";
import { isFound, state } from "./state.js";

// Makes text safe to put inside HTML (names typed by the user, etc.)
export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------------- Icons ---------------- */
const svg = (paths, size = 19) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const ICON = {
  home: svg('<path d="M4 11.2 12 4.5l8 6.7"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>'),
  book: svg('<path d="M12 6.6C10.4 5.5 8.2 5 4.8 5.2v12.6c3.4-.2 5.6.3 7.2 1.4 1.6-1.1 3.8-1.6 7.2-1.4V5.2C15.8 5 13.6 5.5 12 6.6z"/><path d="M12 6.6v12.6"/>'),
  back: svg('<path d="M19 12H5.5"/><path d="M11 6.5 5.5 12l5.5 5.5"/>'),
  prev: svg('<path d="M14.5 6 8.5 12l6 6"/>', 17),
  next: svg('<path d="M9.5 6l6 6-6 6"/>', 17),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 15),
  down: svg('<path d="M6.5 9.5 12 15l5.5-5.5"/>', 17),
  arrow: svg('<path d="M5 12h13M13 6.5 18.5 12 13 17.5"/>', 15),
  reset: svg('<path d="M4.5 12a7.5 7.5 0 1 1 2.3 5.4"/><path d="M4.5 18v-5h5"/>', 15),
  story: svg('<path d="M5 5.5h14a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1h-7l-4.5 3.5V16H5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z"/>', 16),
  scan: svg('<path d="M4 8.5V5h3.5M16.5 5H20v3.5M20 15.5V19h-3.5M7.5 19H4v-3.5"/><path d="M4 12h16"/>', 16),
};

/* ---------------- Top-left button (Home or Back) ----------------
   Screens call setBack(fn) to turn the Home button into a Back button.
   setBack(null) turns it back into Home. */
let backFn = null;
export function setBack(fn) {
  backFn = fn || null;
  window.dispatchEvent(new Event("navchange"));
}
export const getBack = () => backFn;

/* ---------------- Typewriter ----------------
   Types text letter by letter.
   Returns { skip(), cancel(), typing }. onDone runs when the text is complete. */
export function typewriter(el, text, speed = 22, onDone) {
  let i = 0;
  let typing = true;
  el.textContent = "";

  function stop() {
    clearInterval(id);
    typing = false;
  }
  const id = setInterval(() => {
    i++;
    el.textContent = text.slice(0, i);
    if (i >= text.length) {
      stop();
      onDone?.();
    }
  }, speed);

  return {
    get typing() {
      return typing;
    },
    skip() {
      if (!typing) return;
      stop();
      el.textContent = text;
      onDone?.();
    },
    cancel: stop,
  };
}

/* ---------------- Dialogue ----------------
   runDialogue({ root, lines, speaker, onEnd })
   - click anywhere, or press Space / Enter, to continue
   - Auto plays on its own, Skip jumps to the end
   - a line with "choices" shows options the player must pick
   Returns { destroy() }. */
export function runDialogue({ root, lines, speaker = "", onEnd }) {
  const vars = {
    name: state.name || "Explorer",
    id: state.id || EXPLORER.idPrefix + "-0000",
    rank: EXPLORER.rank,
  };
  const fill = (s) => String(s ?? "").replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  const script = lines.map((l) => (typeof l === "string" ? { speaker, text: l } : { speaker, ...l }));

  const layer = document.createElement("div");
  layer.className = "dlg-layer";
  layer.innerHTML = `
    <div class="dlg-tools">
      <button class="chip" data-auto>Auto</button>
      <button class="chip" data-skip>Skip</button>
    </div>
    <div class="dlg-choices"></div>
    <div class="dlg-box">
      <div class="dlg-name"><span></span></div>
      <p class="dlg-text"></p>
      <div class="dlg-next">${ICON.down}</div>
    </div>`;
  root.appendChild(layer);

  const nameEl = layer.querySelector(".dlg-name span");
  const textEl = layer.querySelector(".dlg-text");
  const boxEl = layer.querySelector(".dlg-box");
  const choicesEl = layer.querySelector(".dlg-choices");

  let i = 0;
  let line = null;
  let typer = null;
  let timer = null;
  let auto = false;
  let closed = false;

  function show(n) {
    clearTimeout(timer);
    choicesEl.innerHTML = "";
    boxEl.classList.remove("ready");
    if (n >= script.length) return finish();

    i = n;
    line = script[i];
    nameEl.textContent = fill(line.speaker);
    typer?.cancel();
    typer = typewriter(textEl, fill(line.text), 24, onTyped);
  }

  function onTyped() {
    if (line.choices?.length) {
      line.choices.forEach((c) => {
        const b = document.createElement("button");
        b.className = "dlg-choice";
        b.innerHTML = `<span class="ico">${ICON.arrow}</span><span></span>`;
        b.lastChild.textContent = fill(c.text);
        b.onclick = (ev) => {
          ev.stopPropagation();
          show(c.goto ?? i + 1);
        };
        choicesEl.appendChild(b);
      });
      return;
    }
    boxEl.classList.add("ready");
    if (auto) timer = setTimeout(advance, 1800);
  }

  function advance() {
    if (closed) return;
    if (typer?.typing) return typer.skip(); // first click finishes the sentence
    if (line.choices?.length) return; // the player must pick an option
    show(line.goto ?? i + 1);
  }

  function destroy() {
    if (closed) return;
    closed = true;
    typer?.cancel();
    clearTimeout(timer);
    window.removeEventListener("keydown", onKey);
    layer.remove();
  }

  function finish() {
    if (closed) return;
    destroy();
    onEnd?.();
  }

  layer.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button");
    if (btn?.hasAttribute("data-auto")) {
      auto = !auto;
      btn.classList.toggle("active", auto);
      btn.blur();
      if (auto && boxEl.classList.contains("ready")) timer = setTimeout(advance, 800);
      return;
    }
    if (btn?.hasAttribute("data-skip")) return finish();
    advance();
  });

  function onKey(ev) {
    if (ev.key !== " " && ev.key !== "Enter") return;
    if (ev.target.closest?.("button")) return;
    ev.preventDefault();
    advance();
  }
  window.addEventListener("keydown", onKey);

  show(0);
  return { destroy };
}

/* ---------------- “Equipment discovered” notice ---------------- */
export function showToast(root, { title, text }) {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `
    <span class="toast-icon">${ICON.check}</span>
    <div><b>${esc(title)}</b><small>${esc(text)}</small></div>`;
  root.appendChild(el);
  setTimeout(() => el.classList.add("out"), 3800);
  setTimeout(() => el.remove(), 4400);
}

/* ---------------- Explorer ID card ----------------
   Used on the registration screen and on the ending. No photo/barcode. */
export function idCardHTML({ name = "", id = "", badge = "", verified = false, extra = [] } = {}) {
  const issued = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return `
    <div class="idcard${verified ? " verified" : ""}">
      <div class="idcard-top"><span>Explorer ID</span><span>${esc(TITLE)}</span></div>
      <dl class="idcard-fields">
        <div class="wide"><dt>Name</dt><dd class="idcard-name">${esc(name || "—")}</dd></div>
        <div><dt>ID</dt><dd class="num">${esc(id || EXPLORER.idPrefix + "-0000")}</dd></div>
        <div><dt>Rank</dt><dd>${esc(EXPLORER.rank)}</dd></div>
        <div><dt>Issued</dt><dd class="num">${issued}</dd></div>
        ${extra.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd class="num">${esc(v)}</dd></div>`).join("")}
      </dl>
      ${badge ? `<div class="idcard-foot"><span class="badge">${ICON.check}${esc(badge)}</span></div>` : ""}
    </div>`;
}

/* ---------------- Archive pop-up ----------------
   Shows the explorer and one small name-only card per equipment. */
const box = document.getElementById("archive");

function render() {
  const found = ALL_EQUIPMENT.filter((e) => isFound(e.id)).length;

  const sections = Object.values(PLANETS)
    .map((p) => {
      const n = p.equipment.filter((e) => isFound(e.id)).length;
      const cards = p.equipment
        .map((e, i) => {
          const code = `${p.code}-${String(i + 1).padStart(2, "0")}`;
          return isFound(e.id)
            ? `<article class="acard"><small>${code}</small><b>${esc(e.name)}</b></article>`
            : `<article class="acard locked"><small>${code}</small><b>Not discovered</b></article>`;
        })
        .join("");
      return `
        <section>
          <h4><span>${esc(p.title)}</span><span class="num">${n} / ${p.equipment.length}</span></h4>
          <div class="cards">${cards}</div>
        </section>`;
    })
    .join("");

  box.innerHTML = `
    <div class="archive-card">
      <header class="archive-head">
        <div class="explorer-badge">
          <b>${esc(state.name || "Unregistered")}</b>
          <small class="num">${esc(state.id || "—")} · ${esc(EXPLORER.rank)}</small>
        </div>
        <div class="archive-meta"><span>Archive</span><b class="num">${found} / ${ALL_EQUIPMENT.length}</b></div>
        <button class="round sm" id="archive-close" aria-label="Close" title="Close">${ICON.close}</button>
      </header>
      <div class="archive-body">${sections}</div>
    </div>`;

  box.querySelector("#archive-close").onclick = closeArchive;
}

export function openArchive() {
  render();
  box.classList.remove("hidden");
}

export function closeArchive() {
  box.classList.add("hidden");
}

// Click the dark area outside to close
box.addEventListener("click", (e) => {
  if (e.target === box) closeArchive();
});