import { ALL_EQUIPMENT, EXPLORER } from "./data.js";

// Remembers the explorer’s name and found equipment in the browser
const KEY = "remember-me-v1";

let saved = {};
try {
  saved = JSON.parse(localStorage.getItem(KEY)) || {};
} catch {
  saved = {};
}

export const state = {
  name: saved.name || "",
  id: saved.id || "",
  found: Array.isArray(saved.found) ? saved.found : [],
};

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage not available, ignore */
  }
}

export const isFound = (id) => state.found.includes(id);

export function markFound(id) {
  if (isFound(id)) return;
  state.found.push(id);
  save();
  window.dispatchEvent(new Event("progress"));
}

export function resetProgress() {
  state.found = [];
  save();
  window.dispatchEvent(new Event("progress"));
}

// How many found (optionally only for one planet: "moon" or "mars")
export const countFound = (planet) =>
  ALL_EQUIPMENT.filter((e) => isFound(e.id) && (!planet || e.planet === planet)).length;

// Makes a new explorer ID, like EX-4821
export function newExplorerId() {
  return EXPLORER.idPrefix + "-" + Math.floor(1000 + Math.random() * 9000);
}
