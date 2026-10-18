// From a /suite bars snapshot (CharacterSuiteDB.bars[n]) to Bar Guide data: which bars, which buttons, the keys
// as players write them, and where every button sits on the screenshot. Pure: no DOM, no images. The pixel work
// (cropping the bars and the icons) is make/make.js; the page is render.js.

export const FORMAT_VERSION = 1;

// Optional roles a player can give a button. Colours: light theme, dark theme.
export const ROLE_PRESETS = {
  damage:    { label: "Damage",          color: "#b4562c", dark: "#e0835a" },
  burst:     { label: "Burst cooldown",  color: "#c0303f", dark: "#f0626f" },
  dot:       { label: "Over time",       color: "#7a4bb5", dark: "#b48cf0" },
  control:   { label: "Crowd control",   color: "#d07a12", dark: "#f0a040" },
  defensive: { label: "Defensive",       color: "#2f73c4", dark: "#6fa8ef" },
  heal:      { label: "Healing",         color: "#3f8a3a", dark: "#74c46c" },
  buff:      { label: "Buff & stance",   color: "#1f8a86", dark: "#4cc3bd" },
  pet:       { label: "Pet",             color: "#9a7414", dark: "#d8b045" },
  racial:    { label: "Racial",          color: "#8a6aa8", dark: "#c3a6e0" },
  utility:   { label: "Utility",         color: "#6b7280", dark: "#9aa1ae" },
};

const BAR_TITLES = { main: "Main bar", pet: "Pet bar", stance: "Stance bar" };

const LETTERS = { æ: "ae", ø: "o", ß: "ss", þ: "th", ð: "d", đ: "d", ł: "l", œ: "oe" };

export function slugify(s) {
  return String(s || "adventurer").toLowerCase().replace(/[æøßþðđłœ]/g, c => LETTERS[c]).normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "adventurer";
}

// Every snapshot in a parsed CharacterSuite.lua, oldest first.
export function snapshotsOf(saved) {
  const db = saved && saved.CharacterSuiteDB;
  const list = db && Array.isArray(db.bars) ? db.bars : [];
  return list.filter(s => s && Array.isArray(s.bars) && s.screen);
}

export function characterOf(snap) {
  const c = snap.character || {};
  const name = c.displayName || c.name || "Adventurer";
  return {
    displayName: name, slug: slugify(name), level: c.level ?? null,
    race: c.race || "", class: c.class || "", classFile: c.classFile || "", faction: c.faction || "",
    gender: c.gender || "", realm: c.realm || "", pet: c.pet || "",
  };
}

// ---- keys --------------------------------------------------------------------------------------------------

const MODS = [["SHIFT", "⇧"], ["CTRL", "Ctrl "], ["ALT", "Alt "], ["META", "Cmd "]];
const NAMED = {
  "-": "−", "=": "=", SPACE: "Space", TAB: "Tab", ENTER: "Enter", ESCAPE: "Esc", BACKSPACE: "Backspace",
  MOUSEWHEELUP: "Wheel ↑", MOUSEWHEELDOWN: "Wheel ↓", UP: "↑", DOWN: "↓", LEFT: "←", RIGHT: "→",
  BUTTON1: "Left click", BUTTON2: "Right click", BUTTON3: "Mouse 3",
};

function splitKey(binding) {
  let rest = String(binding);
  const mods = [];
  for (;;) {
    const m = MODS.find(([p]) => rest.startsWith(p + "-") && rest.length > p.length + 1);
    if (!m) break;
    mods.push(m);
    rest = rest.slice(m[0].length + 1);
  }
  let base = NAMED[rest];
  if (!base) {
    const mouse = rest.match(/^BUTTON(\d+)$/);
    const num = rest.match(/^NUMPAD(.+)$/);
    if (mouse) base = "Mouse " + mouse[1];
    else if (num) base = "Num " + (NAMED[num[1]] || num[1].replace(/^(DIVIDE|MULTIPLY|MINUS|PLUS|DECIMAL)$/, s => ({ DIVIDE: "/", MULTIPLY: "*", MINUS: "−", PLUS: "+", DECIMAL: "." })[s]));
    else if (rest.length > 1 && !/^F\d+$/.test(rest)) base = rest[0] + rest.slice(1).toLowerCase();
    else base = rest;
  }
  // Ctrl and Alt before Shift, the way the game writes them
  mods.sort((a, b) => (a[0] === "SHIFT") - (b[0] === "SHIFT"));
  return { mods: mods.map(m => m[0]).join("+"), prefix: mods.map(m => m[1]).join(""), base };
}

export function keyLabel(binding) {
  if (!binding) return "Click";
  const k = splitKey(binding);
  return k.prefix + k.base;
}

const MOD_WORDS = { SHIFT: "Shift", CTRL: "Ctrl", ALT: "Alt", META: "Cmd" };

// "Keys 1 to =", "Shift + 1 to 0", "Ctrl + key", "Click only"
export function barSub(buttons) {
  const bound = buttons.map(b => b.key1).filter(Boolean).map(splitKey);
  if (!bound.length) return "Click only";
  const mods = new Set(bound.map(k => k.mods));
  if (mods.size > 1) return "Mixed keys";
  const mod = [...mods][0];
  const head = mod ? mod.split("+").map(m => MOD_WORDS[m]).join(" + ") + " + " : (bound.length > 1 ? "Keys " : "Key ");
  const first = bound[0].base, last = bound[bound.length - 1].base;
  return bound.length === 1 ? head + first : `${head}${first} to ${last}`;
}

// ---- geometry ----------------------------------------------------------------------------------------------

// Where every button sits on a screenshot of `width` x `height` pixels, the crop around all of them, and each
// button's box as fractions of that crop. Warnings say when the picture does not look like this screen.
export function layoutOf(snap, width, height) {
  const sc = snap.screen || {};
  const uw = (sc.uiWidth || 0) * (sc.uiScale || 1);
  const uh = (sc.uiHeight || 0) * (sc.uiScale || 1);
  if (!(uw > 0 && uh > 0)) throw new Error("This snapshot has no screen size; capture it again with /suite bars.");
  const warnings = [];
  const ratioShot = width / height, ratioUI = uw / uh;
  if (Math.abs(ratioShot / ratioUI - 1) > 0.02) {
    warnings.push(`The screenshot is ${width}×${height}, but the game's screen was ${Math.round(uw)}×${Math.round(uh)} in UI units ` +
      "(a different shape). Buttons may be misplaced: use the screenshot taken by /suite bars.");
  }
  const px = r => ({
    x: r.l * r.s / uw * width,
    y: (1 - (r.b + r.h) * r.s / uh) * height,
    w: r.w * r.s / uw * width,
    h: r.h * r.s / uh * height,
  });

  const bars = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const sizes = [];
  for (const bar of snap.bars) {
    const buttons = [];
    for (const b of bar.buttons || []) {
      if (!b || !b.rect) continue;
      const src = px(b.rect);
      if (src.x + src.w < 0 || src.y + src.h < 0 || src.x > width || src.y > height) continue;  // off screen
      minX = Math.min(minX, src.x); minY = Math.min(minY, src.y);
      maxX = Math.max(maxX, src.x + src.w); maxY = Math.max(maxY, src.y + src.h);
      sizes.push(Math.min(src.w, src.h));
      buttons.push({
        key: keyLabel(b.key1), key1: b.key1 || "", key2: b.key2 || "",
        name: b.name || "Unknown", rank: b.rank || "", kind: b.kind || "", description: b.description || "",
        role: "", note: "", unbound: false, src,
      });
    }
    if (!buttons.length) continue;
    bars.push({ id: bar.id, title: BAR_TITLES[bar.id] || bar.title || bar.id, sub: barSub(bar.buttons || []), buttons });
  }
  if (!bars.length) throw new Error("No action buttons were on screen in this snapshot.");

  sizes.sort((a, b) => a - b);
  const pad = Math.max(2, sizes[Math.floor(sizes.length / 2)] * 0.25);
  const crop = {
    x: Math.max(0, Math.floor(minX - pad)), y: Math.max(0, Math.floor(minY - pad)),
  };
  crop.w = Math.min(width, Math.ceil(maxX + pad)) - crop.x;
  crop.h = Math.min(height, Math.ceil(maxY + pad)) - crop.y;
  for (const bar of bars) for (const b of bar.buttons) {
    b.box = {
      x: round((b.src.x + b.src.w / 2 - crop.x) / crop.w), y: round((b.src.y + b.src.h / 2 - crop.y) / crop.h),
      w: round(b.src.w / crop.w), h: round(b.src.h / crop.h),
    };
  }
  return { crop, bars, callouts: autoCallouts(bars), warnings };
}

const round = v => Math.round(v * 10000) / 10000;

// A label over or under each bar on the dark frame around the screenshot; one lane above, one below, no overlaps.
export function autoCallouts(bars) {
  const lanes = { top: [], bottom: [] };
  const out = [];
  for (const bar of bars) {
    const from = Math.min(...bar.buttons.map(b => b.box.x - b.box.w / 2));
    const to = Math.max(...bar.buttons.map(b => b.box.x + b.box.w / 2));
    const cy = bar.buttons.reduce((s, b) => s + b.box.y, 0) / bar.buttons.length;
    const order = cy < 0.5 ? ["top", "bottom"] : ["bottom", "top"];
    const free = order.find(l => lanes[l].every(([a, b]) => to <= a || from >= b));
    if (!free) continue;
    lanes[free].push([from - 0.01, to + 0.01]);
    out.push({ label: bar.title, hint: bar.sub, from: round(from), to: round(to), pos: free });
  }
  return out;
}

// ---- screenshots -------------------------------------------------------------------------------------------

const STAMP = /(\d{2})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/;
function stampSeconds(s) {
  const m = String(s || "").match(STAMP);
  if (!m) return null;
  const [, mo, d, y, h, mi, se] = m.map(Number);
  return Date.UTC(2000 + y, mo - 1, d, h, mi, se) / 1000;   // local wall time, compared with local wall time
}

// The screenshot taken by this snapshot: WoWScrnShot_MMDDYY_HHMMSS within 20 s of its local stamp.
export function matchScreenshot(snap, names) {
  const want = stampSeconds(snap.localStamp);
  if (want === null) return null;
  let best = null, bestGap = 21;
  for (const name of names) {
    if (!/^WoWScrnShot_/i.test(name)) continue;
    const got = stampSeconds(name);
    if (got === null) continue;
    const gap = Math.abs(got - want);
    if (gap < bestGap) { best = name; bestGap = gap; }
  }
  return best;
}

// ---- the guide's data --------------------------------------------------------------------------------------

// Bar Guide data from a layout. Icons and the cropped shot are added by the caller (they need pixels).
export function guideOf(snap, layout) {
  const ch = characterOf(snap);
  const first = ch.displayName.split(" ")[0];
  const possessive = /s$/i.test(first) ? `${first}'` : `${first}'s`;
  return {
    capturedAt: snap.takenAt || null,
    title: `${possessive} ${ch.class || "Action"} Bars`.replace("  ", " "),
    lede: "Real bars, straight from the game. Hover or tap any button for its tooltip.",
    roles: structuredClone(ROLE_PRESETS),
    bars: layout.bars.map(bar => ({
      id: bar.id, title: bar.title, sub: bar.sub,
      buttons: bar.buttons.map(({ src, key1, key2, ...b }) => b),
    })),
    callouts: layout.callouts,
    rules: [],
    boxes: [],
  };
}

// Keep the player's words when a bar is captured again: notes and roles follow the spell, titles the bar.
export function carryOver(fresh, old) {
  if (!old) return fresh;
  const byName = new Map();
  for (const bar of old.bars || []) for (const b of bar.buttons || []) if (!byName.has(b.name)) byName.set(b.name, b);
  const barById = new Map((old.bars || []).map(b => [b.id, b]));
  for (const bar of fresh.bars) {
    const ob = barById.get(bar.id);
    if (ob) { bar.title = ob.title; bar.sub = ob.sub; }
    for (const b of bar.buttons) {
      const o = byName.get(b.name);
      if (o) { b.note = o.note || ""; b.role = o.role || ""; }
    }
  }
  for (const k of ["title", "lede", "rules", "boxes", "roles"]) if (old[k] !== undefined) fresh[k] = old[k];
  return fresh;
}
