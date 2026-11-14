import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

/* The 3D part. It shows one .glb at a time.
   If a scene has no .glb yet, it just stays black.
   It can also smoothly ZOOM toward any point on the screen, and it powers
   the equipment screen controls (wireframe, lighting, X/Y/Z rotation). */

const stage = document.getElementById("stage");
const grid = document.getElementById("grid");

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

// Lights (change the numbers if your scenes look too dark or too bright)
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.position.set(5, 3, 5);
scene.add(sun);

// glb loader (works with normal and Draco-compressed files)
const draco = new DRACOLoader();
draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);

let current = null;
let spin = 0;
let spinAngle = 0;
const camBase = new THREE.Vector3(0, 0, 5);
const lookAt = new THREE.Vector3(0, 0, 0);
const mouse = { x: 0, y: 0 };
const smooth = { x: 0, y: 0 };

/* ---------------- Viewer controls ---------------- */
let rotateObj = null; // the object the X/Y/Z sliders turn (null = whole scene)
const rotBase = new THREE.Euler();
const rotGoal = new THREE.Vector3(); // radians
const rotNow = new THREE.Vector3();
let wireframe = false;

// level 1 = normal light, lower = darker
export function setLighting(level = 1) {
  ambient.intensity = 0.5 * level;
  sun.intensity = 2.5 * level;
}

export function setWireframe(on) {
  wireframe = on;
  current?.traverse((o) => {
    [].concat(o.material || []).forEach((m) => {
      if ("wireframe" in m) m.wireframe = on;
    });
  });
}

// Choose which object in the .glb the rotation sliders turn (by its name).
// Pass null to turn the whole scene.
export function setRotateTarget(nodeName) {
  restoreRotateObj();
  rotGoal.set(0, 0, 0);
  rotNow.set(0, 0, 0);
  rotateObj = nodeName && current ? current.getObjectByName(nodeName) || null : null;
  if (rotateObj) rotBase.copy(rotateObj.rotation);
}

function restoreRotateObj() {
  if (rotateObj) rotateObj.rotation.copy(rotBase);
  rotateObj = null;
}

// Degrees on each axis
export function setRotation(xDeg, yDeg, zDeg) {
  rotGoal.set(xDeg, yDeg, zDeg).multiplyScalar(Math.PI / 180);
}

export function resetViewer() {
  restoreRotateObj();
  rotGoal.set(0, 0, 0);
  rotNow.set(0, 0, 0);
  setWireframe(false);
  setLighting(1);
}

/* ---------------- Zoom ----------------
   zoomTo(cx, cy, z): bring the screen point (cx, cy) to the focus spot
   and magnify it z times. cx and cy go from 0 to 1 (0.5, 0.5 = center).
   FOCUS is where the equipment lands on screen. */
// Where the equipment lands on screen (the box sits here, name/actions flank it).
export const FOCUS = { x: 0.5, y: 0.46 };

const view = { z: 1, cx: 0.5, cy: 0.5, fx: 0.5, fy: 0.5 };
const goal = { ...view };
let viewActive = false;
let dirty = false;

export function zoomTo(cx, cy, z = 2, fx = FOCUS.x, fy = FOCUS.y) {
  Object.assign(goal, { z, cx, cy, fx, fy });
}

export function resetZoom(instant = false) {
  Object.assign(goal, { z: 1, cx: 0.5, cy: 0.5, fx: 0.5, fy: 0.5 });
  if (instant) {
    Object.assign(view, goal);
    applyView();
  }
}

function applyView() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const atRest = view.z === 1 && view.cx === 0.5 && view.cy === 0.5 && view.fx === 0.5 && view.fy === 0.5;

  if (atRest) {
    if (viewActive) {
      camera.clearViewOffset();
      viewActive = false;
    }
    if (grid) grid.style.transform = "";
    return;
  }

  viewActive = true;
  // Render only the zoomed part of the scene at full quality
  camera.setViewOffset(
    W * view.z, H * view.z,
    view.cx * view.z * W - view.fx * W,
    view.cy * view.z * H - view.fy * H,
    W, H
  );

  // Zoom the grid layer the same way so the HUD feels connected
  if (grid) {
    grid.style.transformOrigin = `${view.cx * 100}% ${view.cy * 100}%`;
    grid.style.transform =
      `translate(${(view.fx - view.cx) * 100}vw, ${(view.fy - view.cy) * 100}vh) scale(${view.z})`;
  }
}

function stepView() {
  let changed = false;
  for (const k in view) {
    const before = view[k];
    const d = goal[k] - view[k];
    view[k] = Math.abs(d) > 0.0004 ? view[k] + d * 0.08 : goal[k];
    if (view[k] !== before) changed = true;
  }
  if (changed || dirty) {
    applyView();
    dirty = false;
  }
}

/* ---------------- Loading scenes ---------------- */
function clearCurrent() {
  if (!current) return;
  scene.remove(current);
  current.traverse((o) => {
    o.geometry?.dispose();
    [].concat(o.material || []).forEach((m) => {
      for (const k in m) if (m[k]?.isTexture) m[k].dispose();
      m.dispose();
    });
  });
  current = null;
  rotateObj = null;
}

export function loadScene(cfg) {
  clearCurrent();
  camBase.set(...(cfg.camera || [0, 0, 5]));
  lookAt.set(...(cfg.lookAt || [0, 0, 0]));
  spin = cfg.spin || 0;
  spinAngle = 0;
  rotGoal.set(0, 0, 0);
  rotNow.set(0, 0, 0);
  wireframe = false;
  setLighting(1);

  if (!cfg.glb) return Promise.resolve(); // placeholder: black screen

  return new Promise((resolve) => {
    loader.load(
      cfg.glb,
      (gltf) => {
        const obj = gltf.scene;
        const wrap = new THREE.Group();

        if (cfg.fit !== false) {
          // Auto-center and auto-scale
          const box = new THREE.Box3().setFromObject(obj);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          obj.position.sub(center);
          wrap.scale.setScalar((cfg.size || 3) / Math.max(size.x, size.y, size.z));
        }

        wrap.add(obj);
        scene.add(wrap);
        current = wrap;
        resolve();
      },
      undefined,
      (err) => {
        console.error("Could not load " + cfg.glb, err);
        resolve(); // stay black instead of freezing the site
      }
    );
  });
}

window.addEventListener("pointermove", (e) => {
  mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  dirty = true;
});

function animate() {
  requestAnimationFrame(animate);

  // Soft camera movement that follows the mouse
  smooth.x += (mouse.x - smooth.x) * 0.05;
  smooth.y += (mouse.y - smooth.y) * 0.05;
  camera.position.set(camBase.x + smooth.x * 0.25, camBase.y - smooth.y * 0.15, camBase.z);
  camera.lookAt(lookAt);

  // Slow spin + the rotation sliders
  spinAngle += spin;
  rotNow.lerp(rotGoal, 0.1);
  if (rotateObj) {
    rotateObj.rotation.set(rotBase.x + rotNow.x, rotBase.y + rotNow.y, rotBase.z + rotNow.z);
    if (current) current.rotation.y = spinAngle;
  } else if (current) {
    current.rotation.set(rotNow.x, spinAngle + rotNow.y, rotNow.z);
  }

  stepView();
  renderer.render(scene, camera);
}
animate();