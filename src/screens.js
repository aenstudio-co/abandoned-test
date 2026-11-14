import { TITLE, LOGO, EXPLORER, PLANETS, LAUNCH, COMMANDER, ENDING, ALL_EQUIPMENT } from "./data.js";
import { state, save, markFound, isFound, countFound, resetProgress, newExplorerId } from "./state.js";
import { esc, ICON, idCardHTML, openArchive, runDialogue, showToast, setBack } from "./ui.js";
import { FOCUS, zoomTo, resetZoom, setRotation, setRotateTarget, setLighting, resetViewer } from "./engine.js";

/* Each screen is a function. It draws its buttons into `root`
   and uses go("sceneId") to move to another scene.
   It can return a cleanup function that runs when the scene is left.
   The top-left Home / Back / Archive buttons live in main.js. */

const withName = (s) =>
  s
    .replaceAll("{name}", state.name || "Explorer")
    .replaceAll("{id}", state.id || EXPLORER.idPrefix + "-0000")
    .replaceAll("{rank}", EXPLORER.rank);

/* ---------------- Scene 1: Home (title screen) ----------------
   The logo is the file  public/logo.svg  - replace it with your own. */
function home({ root, go }) {
  root.innerHTML = `
    <div class="screen center">
      <img class="logo" src="${esc(LOGO)}" alt="${esc(TITLE)}" />
      <p class="tagline">An interactive story</p>
      <button class="btn primary" id="start">Start</button>
    </div>`;

  // If there is no logo file yet, show the title as text instead
  root.querySelector(".logo").onerror = (ev) => {
    const h = document.createElement("h1");
    h.className = "title";
    h.textContent = TITLE;
    ev.target.replaceWith(h);
  };

  root.querySelector("#start").onclick = () => go("register");
}

/* ---------------- Scene 1b: Explorer registration ----------------
   The ID card fills in while the player types their name. */
function register({ root, go }) {
  const id = newExplorerId();
  let timer;
  let locked = false;

  root.innerHTML = `
    <div class="screen center">
      <p class="eyebrow">${esc(EXPLORER.registerEyebrow)}</p>
      <h2 class="register-title">Register as an explorer</h2>
      ${idCardHTML({ name: state.name, id, badge: "Identity verified" })}
      <div class="field">
        <label for="name">Your name</label>
        <input id="name" maxlength="20" autocomplete="off" placeholder="Type your name" />
        <small class="hint">${esc(EXPLORER.registerHint)}</small>
      </div>
      <button class="btn primary" id="confirm">Confirm identity</button>
    </div>`;

  const input = root.querySelector("#name");
  const nameOnCard = root.querySelector(".idcard-name");
  const card = root.querySelector(".idcard");

  input.value = state.name;
  const paint = () => (nameOnCard.textContent = input.value.trim() || "—");
  paint();

  input.addEventListener("input", () => {
    input.classList.remove("error");
    paint();
  });

  const confirm = () => {
    if (locked) return;
    const value = input.value.trim();
    if (!value) {
      input.classList.remove("error");
      void input.offsetWidth; // restart the shake
      input.classList.add("error");
      input.focus();
      return;
    }
    locked = true;
    state.name = value;
    state.id = id;
    resetProgress(); // a new story starts with an empty archive
    save();
    card.classList.add("verified"); // shows the "Identity verified" line
    timer = setTimeout(() => go("launch"), 1400);
  };

  root.querySelector("#confirm").onclick = confirm;
  input.addEventListener("keydown", (e) => e.key === "Enter" && confirm());
  setBack(() => !locked && go("home")); // top-left Back goes to the title screen
  setTimeout(() => input.focus(), 700);

  return () => clearTimeout(timer);
}

/* ---------------- Scene 2: Launch ----------------
   One small line of text with a number counting down. */
function launch({ root, go }) {
  root.innerHTML = `
    <div class="screen center">
      <p class="launch-text" id="launch-text"></p>
      <div class="line"><span id="line"></span></div>
      <button class="btn sm ghost skip" id="skip">Skip</button>
    </div>`;

  const textEl = root.querySelector("#launch-text");
  const lineEl = root.querySelector("#line");
  const [before, after = ""] = LAUNCH.text.split("{n}");
  const duration = LAUNCH.seconds * 1000;
  const start = performance.now();
  let raf;
  let timer;

  const frame = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const n = Math.round(LAUNCH.from - (LAUNCH.from - LAUNCH.to) * p);
    textEl.innerHTML = `${esc(before)}<b class="num">${n}</b>${esc(after)}`;
    lineEl.style.width = p * 100 + "%";
    if (p < 1) raf = requestAnimationFrame(frame);
    else timer = setTimeout(() => go("commander"), 1200);
  };
  raf = requestAnimationFrame(frame);

  root.querySelector("#skip").onclick = () => go("commander");
  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(timer);
  };
}

/* ---------------- Scene 3: Commander dialogue + task pop-up ---------------- */
function commander({ root, go }) {
  root.innerHTML = `<div class="screen" id="scr"></div>`;
  const screen = root.querySelector("#scr");
  document.body.classList.add("cinema"); // black bars slide in

  const showTask = () => {
    document.body.classList.remove("cinema");
    const tasks = Object.values(PLANETS).map(
      (p) => `Find ${p.equipment.length} pieces of equipment on ${p.short}`
    );
    tasks.push("Everything you find is saved in your archive");

    screen.insertAdjacentHTML(
      "beforeend",
      `<div class="modal">
         <div class="modal-card">
           <p class="eyebrow">Mission briefing · ${esc(state.id)}</p>
           <h2>Your task</h2>
           <ul class="tasks">${tasks.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
           <button class="btn primary" id="accept">Accept task</button>
         </div>
       </div>`
    );
    screen.querySelector("#accept").onclick = () => go("moon");
  };

  const dlg = runDialogue({
    root: screen,
    lines: COMMANDER.lines,
    speaker: COMMANDER.speaker,
    onEnd: showTask,
  });

  return () => {
    dlg.destroy();
    document.body.classList.remove("cinema");
  };
}

/* ---------------- Scene 4 and 5: Moon and Mars ----------------
   1. The player sees "unknown signals" and picks one.
   2. The camera zooms into it and the equipment screen appears.
   3. "Read story" plays the dialogue.
   Back (top-left), Esc or the arrow keys move around. */
const LIGHTS = [["Day", 1], ["Dusk", 0.45], ["Night", 0.15]];

function explore(planetId) {
  return function ({ root, go }) {
    const planet = PLANETS[planetId];
    const list = planet.equipment;
    const total = list.length;

    root.innerHTML = `
      <div class="screen explore" id="scr">
        <div class="location">
          <p class="eyebrow">Location</p>
          <h2>${esc(planet.title)}</h2>
          <p class="muted">${esc(planet.intro)}</p>
        </div>
        <aside class="tracker" id="tracker"></aside>
        <div class="nodes" id="nodes"></div>
        <div class="continue hidden" id="continue">
          <button class="btn primary" id="go-next">${esc(planet.nextLabel)}</button>
        </div>
        <div class="inspect" id="inspect" data-phase="focus"></div>
      </div>`;

    const screen = root.querySelector("#scr");
    const nodesBox = root.querySelector("#nodes");
    const tracker = root.querySelector("#tracker");
    const cont = root.querySelector("#continue");
    const inspect = root.querySelector("#inspect");

    let active = null; // equipment being inspected
    let dlg = null; // running dialogue
    let timer = null;
    let scanTimer = null;

    /* ----- The clickable signals ----- */
    const labelHTML = (e) =>
      isFound(e.id)
        ? `<b>${esc(e.name)}</b><small>${esc(e.subtitle)}</small>`
        : `<b>Unknown signal</b><small>Select to investigate</small>`;

    list.forEach((e) => {
      const node = document.createElement("button");
      node.className = "node";
      node.dataset.id = e.id;
      node.style.left = e.x + "%";
      node.style.top = e.y + "%";
      if (e.x > 60) node.classList.add("flip"); // label opens to the left near the right edge
      node.setAttribute("aria-label", "Investigate signal");
      node.innerHTML = `<span class="orb"></span><span class="label"></span>`;
      node.onclick = () => openInspect(e);
      nodesBox.appendChild(node);
    });

    // Updates labels, the objective list, and the continue button
    function refresh() {
      const n = countFound(planetId);

      nodesBox.querySelectorAll(".node").forEach((node) => {
        const e = list.find((x) => x.id === node.dataset.id);
        node.classList.toggle("found", isFound(e.id));
        node.querySelector(".label").innerHTML = labelHTML(e);
      });

      tracker.innerHTML = `
        <header class="panel-head"><span>Objective</span><span class="num">${n} / ${total}</span></header>
        <p class="obj">Find ${total} pieces of equipment on ${esc(planet.short)}</p>
        <ul>
          ${list
            .map((e) => `<li class="${isFound(e.id) ? "done" : ""}">${isFound(e.id) ? esc(e.name) : "Unknown signal"}</li>`)
            .join("")}
        </ul>`;

      cont.classList.toggle("hidden", n < total || !!active);
    }

    /* ----- The equipment screen ----- */
    function rowsHTML(rows) {
      return rows.map(([k, v], i) => `<div style="--i:${i}"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
    }

    function buildInspect(e) {
      const idx = list.indexOf(e);
      const code = `${planet.code}-${String(idx + 1).padStart(2, "0")}`;
      inspect.style.setProperty("--fx", FOCUS.x * 100 + "%");
      inspect.style.setProperty("--fy", FOCUS.y * 100 + "%");

      inspect.innerHTML = `
        <div class="reticle"></div>

        <div class="pager">
          <button class="round sm" id="prev" aria-label="Previous equipment" title="Previous">${ICON.prev}</button>
          <span class="num">${idx + 1} / ${total}</span>
          <button class="round sm" id="next" aria-label="Next equipment" title="Next">${ICON.next}</button>
        </div>

        <div class="locator">
          <div class="map"><span class="map-tag">${esc(planet.code)}</span><i style="left:${e.x}%;top:${e.y}%"></i></div>
        </div>

        <section class="view">
          <header class="panel-head">
            <span>View</span>
            <button class="linkbtn" id="reset-view">${ICON.reset}<span>Reset</span></button>
          </header>
          <div class="view-body">
            <div class="ctl"><span>Zoom</span><input type="range" id="zoom" min="1" max="2.5" step="0.05" value="1" /><output id="zoom-v">1.0×</output></div>
            <p class="group">Rotation</p>
            <div class="ctl"><span>X</span><input type="range" id="rot-x" min="-180" max="180" step="1" value="0" /><output id="rot-x-v">0°</output></div>
            <div class="ctl"><span>Y</span><input type="range" id="rot-y" min="-180" max="180" step="1" value="0" /><output id="rot-y-v">0°</output></div>
            <div class="ctl"><span>Z</span><input type="range" id="rot-z" min="-180" max="180" step="1" value="0" /><output id="rot-z-v">0°</output></div>
            <div class="ctl"><span>Light</span>
              <div class="seg" id="light">
                ${LIGHTS.map(([label], i) => `<button data-i="${i}" class="${i === 0 ? "on" : ""}">${label}</button>`).join("")}
              </div>
            </div>
          </div>
        </section>

        <div class="target-name"><small>${esc(code)}</small><b>${esc(e.name)}</b></div>
        <div class="target-actions">
          <button class="btn sm" id="read">${ICON.story}<span>Read story</span></button>
          <button class="btn sm" id="analyze">${ICON.scan}<span>Analyze</span></button>
        </div>

        <p class="disclaimer">Disclaimer: This is only a visual representation of ${esc(e.name)}.</p>

        <div class="stats">
          ${e.specs
            .map(([k, v], i) => `<div class="stat"><small>${esc(k)}</small><b style="--i:${i}">${esc(v)}</b></div>`)
            .join("")}
        </div>

        <aside class="data" id="data">
          <header class="panel-head"><span>Data</span><span id="scan-state">Ready</span></header>
          <dl>${rowsHTML([["Equipment Name", e.name], ...e.details])}</dl>
        </aside>`;
    }

    const setPhase = (p) => (inspect.dataset.phase = p);

    // Read story: the dialogue
    function startStory(e) {
      dlg?.destroy();
      setPhase("talk");
      document.body.classList.add("cinema");
      dlg = runDialogue({
        root: screen,
        lines: e.dialogue,
        speaker: e.name,
        onEnd: () => {
          dlg = null;
          document.body.classList.remove("cinema");
          setPhase("data");
        },
      });
    }

    // Analyze: the data rows fade in one by one
    function runScan() {
      const label = inspect.querySelector("#scan-state");
      if (label) label.textContent = "Scanning…";
      inspect.classList.remove("scanning");
      void inspect.offsetHeight; // restart the animation
      inspect.classList.add("scanning");
      clearTimeout(scanTimer);
      scanTimer = setTimeout(() => {
        inspect.classList.remove("scanning");
        const s = inspect.querySelector("#scan-state");
        if (s) s.textContent = "Complete";
      }, 2000);
    }

    function openInspect(e) {
      clearTimeout(timer);
      clearTimeout(scanTimer);
      dlg?.destroy();
      dlg = null;
      document.body.classList.remove("cinema");

      const isNew = !isFound(e.id);
      markFound(e.id);
      active = e;

      resetViewer();
      setRotateTarget(e.node);

      screen.classList.add("inspecting");
      document.body.classList.add("inspecting");
      inspect.classList.remove("scanning");
      buildInspect(e);
      setPhase("focus");
      zoomTo(e.x / 100, e.y / 100, e.zoom || 2); // animated zoom
      setBack(closeInspect); // top-left button becomes Back
      refresh();

      if (isNew) {
        showToast(screen, {
          title: "Equipment discovered",
          text: `${countFound()} of ${ALL_EQUIPMENT.length} saved to your archive`,
        });
      }
      timer = setTimeout(() => setPhase("data"), 1200);
    }

    function closeInspect() {
      clearTimeout(timer);
      clearTimeout(scanTimer);
      dlg?.destroy();
      dlg = null;
      active = null;
      resetZoom();
      resetViewer();
      inspect.innerHTML = "";
      inspect.classList.remove("scanning");
      screen.classList.remove("inspecting");
      document.body.classList.remove("inspecting", "cinema");
      setBack(null); // top-left button becomes Home again
      refresh();
    }

    /* ----- Controls on the left ----- */
    const val = (id) => Number(inspect.querySelector("#" + id).value);
    const setText = (id, text) => {
      const el = inspect.querySelector("#" + id);
      if (el) el.textContent = text;
    };

    function applyZoom() {
      zoomTo(active.x / 100, active.y / 100, (active.zoom || 2) * val("zoom"));
      setText("zoom-v", val("zoom").toFixed(1) + "×");
    }
    function applyRotation() {
      setRotation(val("rot-x"), val("rot-y"), val("rot-z"));
      ["x", "y", "z"].forEach((a) => setText(`rot-${a}-v`, val(`rot-${a}`) + "°"));
    }
    function applyLight(i) {
      setLighting(LIGHTS[i][1]);
      inspect.querySelectorAll("#light button").forEach((b) => b.classList.toggle("on", Number(b.dataset.i) === i));
    }
    function resetView() {
      inspect.querySelector("#zoom").value = 1;
      ["x", "y", "z"].forEach((a) => (inspect.querySelector(`#rot-${a}`).value = 0));
      applyZoom();
      applyRotation();
      applyLight(0);
    }

    inspect.addEventListener("click", (ev) => {
      const btn = ev.target.closest("button");
      if (!btn || !active) return;

      if (btn.dataset.i !== undefined) return applyLight(Number(btn.dataset.i));

      switch (btn.id) {
        case "prev":
          return openInspect(list[(list.indexOf(active) - 1 + total) % total]);
        case "next":
          return openInspect(list[(list.indexOf(active) + 1) % total]);
        case "read":
          return startStory(active);
        case "analyze":
          return runScan();
        case "reset-view":
          return resetView();
      }
    });

    inspect.addEventListener("input", (ev) => {
      if (!active) return;
      if (ev.target.id === "zoom") applyZoom();
      if (ev.target.id.startsWith("rot-")) applyRotation();
    });

    // Esc = back, left / right arrows = previous / next equipment
    const onKey = (ev) => {
      if (!active || dlg || ev.target.tagName === "INPUT") return;
      if (!document.getElementById("archive").classList.contains("hidden")) return;
      if (ev.key === "Escape") closeInspect();
      if (ev.key === "ArrowRight") openInspect(list[(list.indexOf(active) + 1) % total]);
      if (ev.key === "ArrowLeft") openInspect(list[(list.indexOf(active) - 1 + total) % total]);
    };
    window.addEventListener("keydown", onKey);

    root.querySelector("#go-next").onclick = () => go(planet.next);
    refresh();

    return () => {
      clearTimeout(timer);
      clearTimeout(scanTimer);
      dlg?.destroy();
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("cinema", "inspecting");
      setBack(null);
      resetZoom(true);
      resetViewer();
    };
  };
}

/* ---------------- Ending ---------------- */
function ending({ root, go }) {
  root.innerHTML = `
    <div class="screen center">
      <p class="eyebrow">${esc(ENDING.eyebrow)}</p>
      <h1 class="title">${esc(TITLE)}</h1>
      ${idCardHTML({
        name: state.name,
        id: state.id,
        badge: "Mission complete",
        verified: true,
        extra: [["Found", `${countFound()} / ${ALL_EQUIPMENT.length}`]],
      })}
      <p class="lead">${esc(withName(ENDING.text))}</p>
      <div class="actions">
        <button class="btn primary" id="repeat">Repeat story</button>
        <button class="btn" id="home">Go home</button>
        <button class="btn ghost" id="archive">View archive</button>
      </div>
    </div>`;

  root.querySelector("#repeat").onclick = () => {
    resetProgress(); // starts again with an empty archive
    go("launch");
  };
  root.querySelector("#home").onclick = () => go("home");
  root.querySelector("#archive").onclick = openArchive;
}

export const screens = {
  home,
  register,
  launch,
  commander,
  moon: explore("moon"),
  mars: explore("mars"),
  ending,
};