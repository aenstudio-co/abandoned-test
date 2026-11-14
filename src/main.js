import "./style.css";
import { SCENES, ALL_EQUIPMENT } from "./data.js";
import { state, countFound } from "./state.js";
import { loadScene, resetZoom } from "./engine.js";
import { screens } from "./screens.js";
import { esc, ICON, openArchive, closeArchive, setBack, getBack } from "./ui.js";

const ui = document.getElementById("ui");
const hud = document.getElementById("hud");
const fade = document.getElementById("fade");
const dev = document.getElementById("dev");
const fadeText = fade.querySelector("span");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const HIDE_HUD_ON = ["home", "ending"]; // screens without the top bar

let cleanup = null;
let busy = false;

/* ---------------- Top bar ----------------
   Top-left (same place on every screen): Home or Back, then Archive.
   Top-right: who is exploring and how many pieces they found. */
function renderHud(id) {
  hud.classList.toggle("hidden", HIDE_HUD_ON.includes(id));
  hud.innerHTML = `
    <div class="hud-nav">
      <button class="round" id="hud-main"></button>
      <button class="round" id="hud-archive" aria-label="Archive" title="Archive">${ICON.book}</button>
    </div>
    <div class="hud-right">
      <span class="hud-explorer"><b>${esc(state.name || "Explorer")}</b><small class="num">${esc(state.id || "")}</small></span>
      <span class="hud-count num"></span>
    </div>`;

  paintMain();
  updateCount();
  hud.querySelector("#hud-main").onclick = () => {
    const back = getBack();
    if (back) back();
    else go("home");
  };
  hud.querySelector("#hud-archive").onclick = openArchive;
}

// Shows a Back arrow when a screen asked for one, otherwise a Home icon
function paintMain() {
  const btn = hud.querySelector("#hud-main");
  if (!btn) return;
  const back = !!getBack();
  btn.innerHTML = back ? ICON.back : ICON.home;
  btn.title = back ? "Back" : "Home";
  btn.setAttribute("aria-label", btn.title);
}
window.addEventListener("navchange", paintMain);

function updateCount() {
  const el = hud.querySelector(".hud-count");
  if (el) el.textContent = `${countFound()} / ${ALL_EQUIPMENT.length}`;
}
window.addEventListener("progress", updateCount);

/* ---------------- Switch scene ---------------- */
async function go(id) {
  if (busy || !SCENES[id]) return;
  busy = true;
  let failed = false;
  try {
    closeArchive();
    fade.classList.add("on"); // fade to black
    await wait(550);

    cleanup?.();
    cleanup = null;
    ui.innerHTML = "";
    setBack(null);
    document.body.classList.remove("cinema", "inspecting");
    resetZoom(true);

    const cfg = SCENES[id];
    await loadScene(cfg);

    document.body.dataset.scene = id;
    renderHud(id);

    // Small tag while a scene still has no .glb
    dev.textContent = `Placeholder scene · ${cfg.label || id}`;
    dev.classList.toggle("hidden", !!cfg.glb);

    cleanup = screens[id]({ root: ui, go });
    await wait(100);
  } catch (err) {
    failed = true;
    console.error(err);
    fadeText.textContent = `Error: ${err.message} (press F12 and open Console for details)`;
  } finally {
    if (!failed) fade.classList.remove("on");
    busy = false;
  }
}

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeArchive();
});

go("home");