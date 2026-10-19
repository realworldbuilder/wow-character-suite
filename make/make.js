// The page that makes a character page: read the dropped files, cut the bars and icons out of the screenshot,
// let the player add their words, and hand back one self-contained HTML file plus the JSON to edit it again.
import { parseSavedVariables, LuaParseError, TornFile } from "../lib/luaparse.js";
import { snapshotsOf, characterOf, layoutOf, guideOf, matchScreenshot, carryOver, ROLE_PRESETS, FORMAT_VERSION } from "../lib/bars.js";
import { renderCharacterPage, renderBarsPage, characterLine } from "../lib/render.js";

const $ = id => document.getElementById(id);
const SHOT_MAX_WIDTH = 1600;
const ICON_SIZE = 56;
const ICON_INSET = 0.07;   // the button's border, left out of the icon
const DRAFT_KEY = "wcs-make-draft";

const state = {
  saved: null,            // parsed CharacterSuite.lua
  savedName: "",
  images: new Map(),      // name -> File
  previous: null,         // an earlier character.json
  doc: null,              // the character.json being edited
  view: "character",
};

// ---- messages ----------------------------------------------------------------------------------------------

function say(text, kind = "warn") {
  const el = document.createElement("div");
  el.className = `msg ${kind}`;
  el.textContent = text;
  $("messages").appendChild(el);
}
const clearMessages = () => { $("messages").textContent = ""; };

// ---- reading files -----------------------------------------------------------------------------------------

async function addFiles(files) {
  clearMessages();
  for (const f of files) {
    const name = f.name;
    if (/\.lua$/i.test(name)) {
      try {
        const saved = parseSavedVariables(await f.text());
        if (!saved.CharacterSuiteDB) { say(`${name} is not Character Suite's file. Look for CharacterSuite.lua in the same SavedVariables folder.`, "bad"); continue; }
        state.saved = saved; state.savedName = name;
      } catch (e) {
        if (e instanceof TornFile) say(`${name} looks half written. Log out or /reload in game, then drop it again.`, "bad");
        else if (e instanceof LuaParseError) say(`${name} could not be read: ${e.message}.`, "bad");
        else throw e;
      }
    } else if (/\.json$/i.test(name)) {
      try {
        const doc = JSON.parse(await f.text());
        if (doc.formatVersion !== FORMAT_VERSION || !doc.character) throw new Error("not a character file");
        state.previous = doc;
      } catch { say(`${name} is not a .character.json from this page.`, "bad"); }
    } else if (/\.(jpe?g|png)$/i.test(name)) {
      state.images.set(name, f);
    } else if (/\.tga$/i.test(name)) {
      say(`${name} is a TGA picture, which browsers cannot open. In game type /console screenshotFormat jpeg, then /suite bars again.`, "bad");
    } else {
      say(`${name}: not a file this page uses.`);
    }
  }
  showFiles();
  await build();
}

function showFiles() {
  const names = [state.savedName, ...state.images.keys(), state.previous ? `${state.previous.character.slug}.character.json` : ""].filter(Boolean);
  $("files").innerHTML = names.map(n => `<span>${n.replace(/[&<>]/g, "")}</span>`).join("");
}

const loadImage = file => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error(`${file.name} could not be opened as a picture.`));
  img.src = url;
});

function cut(img, r, w, h, type, quality) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  const g = c.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
  return c.toDataURL(type, quality);
}

// ---- building the guide ------------------------------------------------------------------------------------

async function build() {
  if (!state.saved) {
    if (state.images.size) say("Now drop CharacterSuite.lua too: it says where every button is.");
    else if (state.previous) { state.doc = state.previous; return showWork(); }
    return;
  }
  const snaps = snapshotsOf(state.saved);
  if (!snaps.length) { say("This CharacterSuite.lua has no captured bars yet. In game: /suite bars, then Reload.", "bad"); return; }
  const snap = snaps[snaps.length - 1];
  const names = [...state.images.keys()];
  let shotName = matchScreenshot(snap, names);
  if (!shotName && names.length === 1) {
    shotName = names[0];
    say(`${shotName} was not taken by /suite bars (its time does not match), so buttons may not line up. Use the picture /suite bars took.`);
  }
  if (!shotName) {
    const stamp = snap.localStamp ? `WoWScrnShot_${snap.localStamp}` : "the screenshot taken by /suite bars";
    say(`Now drop the screenshot: look for ${stamp} in your Screenshots folder.`);
    return;
  }

  const img = await loadImage(state.images.get(shotName));
  let layout;
  try { layout = layoutOf(snap, img.naturalWidth, img.naturalHeight); }
  catch (e) { say(e.message, "bad"); return; }
  layout.warnings.forEach(w => say(w));

  const { crop } = layout;
  const scale = Math.min(1, SHOT_MAX_WIDTH / crop.w);
  const guide = guideOf(snap, layout);
  guide.shot = {
    src: cut(img, crop, crop.w * scale, crop.h * scale, "image/jpeg", 0.86),
    width: Math.round(crop.w * scale), height: Math.round(crop.h * scale),
    alt: `In-game screenshot of ${characterOf(snap).displayName}'s action bars`,
  };
  layout.bars.forEach((bar, i) => bar.buttons.forEach((b, j) => {
    const r = b.src, ix = r.w * ICON_INSET, iy = r.h * ICON_INSET;
    guide.bars[i].buttons[j].icon = cut(img, { x: r.x + ix, y: r.y + iy, w: r.w - 2 * ix, h: r.h - 2 * iy }, ICON_SIZE, ICON_SIZE, "image/png");
  }));

  const character = characterOf(snap);
  const prev = state.previous && state.previous.character.slug === character.slug ? state.previous : draftFor(character.slug);
  if (prev) {
    carryOver(guide, prev.bars);
    if (prev.character.bio) character.bio = prev.character.bio;
  }
  state.doc = { formatVersion: FORMAT_VERSION, character, bars: guide, links: prev?.links || [] };
  showWork();
}

// ---- the editor --------------------------------------------------------------------------------------------

const escA = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function field(label, path, value, { area = false, placeholder = "" } = {}) {
  const id = "f-" + path.replace(/\W+/g, "-");
  const input = area
    ? `<textarea id="${id}" data-path="${path}" placeholder="${escA(placeholder)}">${escA(value)}</textarea>`
    : `<input type="text" id="${id}" data-path="${path}" value="${escA(value)}" placeholder="${escA(placeholder)}">`;
  return `<div class="field"><label for="${id}">${label}</label>${input}</div>`;
}

function showWork() {
  const { character: c, bars: g } = state.doc;
  $("work").hidden = false;
  const roles = g.roles || ROLE_PRESETS;
  const roleOptions = sel => `<option value="">No role</option>` +
    Object.entries(roles).map(([k, r]) => `<option value="${escA(k)}"${k === sel ? " selected" : ""}>${escA(r.label)}</option>`).join("");
  $("editor").innerHTML = `
    <div class="field"><span class="lbl">Character</span><b>${escA(c.displayName)}</b><span class="privacy">${escA(characterLine(c))}${c.pet ? " · " + escA(c.pet) : ""}</span></div>
    ${field("About them (optional)", "character.bio", c.bio || "", { area: true, placeholder: "Who they are, in your words" })}
    ${field("Guide title", "bars.title", g.title)}
    ${field("Intro", "bars.lede", g.lede, { area: true })}
    ${g.bars.map((bar, i) => `
    <details class="group"${i === 0 ? " open" : ""}>
      <summary>${escA(bar.title)}</summary>
      ${field("Bar name", `bars.bars.${i}.title`, bar.title)}
      ${field("Keys", `bars.bars.${i}.sub`, bar.sub)}
      <div>${bar.buttons.map((b, j) => `
        <div class="btn-row">
          ${b.icon ? `<img src="${b.icon}" alt="">` : `<span class="noicon"></span>`}
          <div class="top"><b>${escA(b.name)}</b><code>${escA(b.key)}</code></div>
          <div class="inputs">
            <input type="text" aria-label="Your note on ${escA(b.name)}" placeholder="Why it's here" data-path="bars.bars.${i}.buttons.${j}.note" value="${escA(b.note)}">
            <select aria-label="Role of ${escA(b.name)}" data-path="bars.bars.${i}.buttons.${j}.role">${roleOptions(b.role)}</select>
          </div>
        </div>`).join("")}</div>
    </details>`).join("")}
    <div class="group exports">
      <span class="lbl">Download</span>
      <button class="btn" type="button" id="dl-page">Character page (.html)</button>
      <button class="btn ghost" type="button" id="dl-bars">Bar Guide only (.html)</button>
      <button class="btn ghost" type="button" id="dl-json">Data to edit later (.json)</button>
      <span class="privacy">Keep the .json: drop it here next time with a new capture, and your notes come back.</span>
    </div>`;
  $("dl-page").onclick = () => download(`${c.slug}.html`, pageHTML("character"), "text/html");
  $("dl-bars").onclick = () => download(`${c.slug}-bars.html`, pageHTML("bars"), "text/html");
  $("dl-json").onclick = () => download(`${c.slug}.character.json`, JSON.stringify(state.doc, null, 1), "application/json");
  render();
}

function setPath(obj, path, value) {
  const keys = path.split(".");
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k];
  o[keys[keys.length - 1]] = value;
}

let timer = 0;
$("editor").addEventListener("input", e => {
  const path = e.target.dataset.path;
  if (!path || !state.doc) return;
  setPath(state.doc, path, e.target.value);
  if (/^bars\.bars\.\d+\.(title|sub)$/.test(path)) {   // the callouts on the screenshot follow the bar's name
    const i = Number(path.split(".")[2]);
    const bar = state.doc.bars.bars[i];
    const old = e.target.defaultValue;
    for (const c of state.doc.bars.callouts || []) {
      if (path.endsWith("title") && c.label === old) c.label = bar.title;
      if (path.endsWith("sub") && c.hint === old) c.hint = bar.sub;
    }
    e.target.defaultValue = e.target.value;
  }
  clearTimeout(timer);
  timer = setTimeout(render, 250);
});

// ---- preview and export ------------------------------------------------------------------------------------

const SITE = "https://realworldbuilder.github.io/wow-character-suite/";

function pageHTML(view) {
  const { character, bars, links } = state.doc;
  return view === "bars"
    ? renderBarsPage(character, bars, { homeHref: SITE, makeHref: SITE + "make/" })
    : renderCharacterPage(character, { guide: bars, links: links || [], homeHref: SITE });
}

function render() {
  const html = pageHTML(state.view);
  const frame = $("preview");
  frame.onload = () => {
    try { frame.style.height = Math.max(600, frame.contentDocument.documentElement.scrollHeight + 4) + "px"; } catch { /* keep the default height */ }
  };
  frame.srcdoc = html;
  $("size").textContent = `${Math.round(html.length / 1024)} KB, one file`;
  saveDraft();
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.querySelectorAll(".seg button").forEach(b => b.addEventListener("click", () => {
  state.view = b.dataset.view;
  document.querySelectorAll(".seg button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  if (state.doc) render();
}));

// A draft survives a reload of this page, in this browser only.
function saveDraft() {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state.doc)); } catch { /* full or blocked: the download is the real save */ }
}
function draftFor(slug) {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    return d && d.character && d.character.slug === slug ? d : null;
  } catch { return null; }
}

// ---- input -------------------------------------------------------------------------------------------------

const drop = $("drop");
["dragenter", "dragover"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", e => addFiles([...e.dataTransfer.files]));
window.addEventListener("dragover", e => e.preventDefault());
window.addEventListener("drop", e => { e.preventDefault(); if (!drop.contains(e.target)) addFiles([...e.dataTransfer.files]); });
$("pick").addEventListener("change", e => { addFiles([...e.target.files]); e.target.value = ""; });

// The sample: Rambleon Birdsong's capture from the AddOn's test, and a screenshot made to match it.
$("sample").addEventListener("click", async () => {
  const get = async (path, name, type) => new File([await (await fetch(path)).blob()], name, { type });
  state.saved = null; state.images.clear(); state.previous = null;
  await addFiles([
    await get("../tests/fixtures/CharacterSuite.lua", "CharacterSuite.lua", "text/plain"),
    await get("../tests/fixtures/WoWScrnShot_101626_214500.jpg", "WoWScrnShot_101626_214500.jpg", "image/jpeg"),
  ]);
  $("work").scrollIntoView({ behavior: "smooth", block: "start" });
});

fetch("../downloads/latest.json").then(r => r.ok ? r.json() : null).then(v => {
  if (v && v.file) $("addon-link").href = "../downloads/" + v.file;
}).catch(() => {});
