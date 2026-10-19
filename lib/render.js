// Data in, HTML out: the Bar Guide page and the character page. Used by tools/build.mjs (node) for the site
// and by make/ (the browser) for the preview and the exported file, so all three are the same page.
// Every page is one self-contained file: styles, data, pictures and script inline; only the fonts are fetched.

export const SUITE_URL = "https://realworldbuilder.github.io/wow-character-suite/";

const NOT_AFFILIATED = "World of Warcraft is a trademark of Blizzard Entertainment. This page is not affiliated with or endorsed by Blizzard.";

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Player text may mark keys as [[Shift]]; everything else is plain text.
export function inline(s) {
  return esc(s).replace(/\[\[(.+?)\]\]/g, "<kbd>$1</kbd>");
}

const safeJSON = v => JSON.stringify(v).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
const cssKey = k => String(k).replace(/[^a-z0-9_-]/gi, "");
const cssColor = c => /^#[0-9a-f]{3,8}$/i.test(c || "") ? c : "#6b7280";

export function characterLine(c) {
  const who = [c.level ? `Level ${c.level}` : "", c.race, c.class].filter(Boolean).join(" ");
  return who || "Adventurer";
}

// ---- the shell ---------------------------------------------------------------------------------------------

const TOKENS_LIGHT = `--bg: #eef1f6; --surface: #ffffff; --ink: #1b2033; --muted: #5a627a; --line: #d3d9e6;
  --accent: #4b5fb0; --gold: #a77c00; --key-bg: #e4e8f1; --key-ink: #2a3150;`;
const TOKENS_DARK = `--bg: #0f1322; --surface: #171c30; --ink: #e6e9f4; --muted: #9aa3bf; --line: #2a3150;
  --accent: #9fb0ff; --gold: #ffd100; --key-bg: #232a45; --key-ink: #d9def0; color-scheme: dark;`;

function shell({ title, description, css, body, script = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta name="generator" content="WoW Character Suite">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya+SC:wght@500;700&family=Alegreya+Sans:wght@400;500;700&family=IBM+Plex+Mono:wght@500;600&display=swap">
<style>
:root {
  ${TOKENS_LIGHT}
  --frame: #07090f; --frame-ink: #e9ecf6; --frame-rule: #6b7393;
  --tip-bg: #0b0e1c; --tip-edge: #8b93ad; --tip-name: #ffffff; --tip-gold: #ffd100; --tip-text: #d8dbe6; --tip-dim: #9aa0b4;
  --f-display: "Alegreya SC", "Palatino Linotype", Georgia, serif;
  --f-body: "Alegreya Sans", "Segoe UI", system-ui, sans-serif;
  --f-mono: "IBM Plex Mono", ui-monospace, Menlo, monospace;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${TOKENS_DARK} } }
:root[data-theme="dark"] { ${TOKENS_DARK} }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
html, body { margin: 0; }
body { background: var(--bg); color: var(--ink); font-family: var(--f-body); font-size: 16px; line-height: 1.5; }
.wrap {
  max-width: 1180px; margin: 0 auto;
  padding-left: max(16px, env(safe-area-inset-left, 0px));
  padding-right: max(16px, env(safe-area-inset-right, 0px));
  padding-block: 40px 64px;
  display: grid; gap: 48px;
}
h1, h2, h3 { font-family: var(--f-display); font-weight: 700; text-wrap: balance; margin: 0; letter-spacing: .01em; }
h1 { font-size: clamp(2rem, 5vw, 3rem); line-height: 1.05; }
h2 { font-size: 1.5rem; }
h3 { font-size: 1.15rem; }
p { margin: 0; max-width: 65ch; }
a { color: var(--accent); }
.eyebrow { font-family: var(--f-mono); font-size: .75rem; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); }
.eyebrow a { color: inherit; }
.lede { color: var(--muted); font-size: 1.1rem; }
header { display: grid; gap: 12px; }
.meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.meta span, .meta a { font-family: var(--f-mono); font-size: .78rem; padding: 3px 10px; border: 1px solid var(--line); border-radius: 999px; color: var(--muted); text-decoration: none; }
.meta a:hover { border-color: var(--accent); color: var(--accent); }
section { display: grid; gap: 20px; }
.section-head { display: grid; gap: 6px; }
.section-head p { color: var(--muted); }
kbd, .kbd {
  font-family: var(--f-mono); font-weight: 600; font-size: .78rem;
  background: var(--key-bg); color: var(--key-ink);
  border: 1px solid var(--line); border-bottom-width: 3px;
  border-radius: 6px; padding: 2px 7px; white-space: nowrap; display: inline-block; line-height: 1.4;
}
.kbd.unbound { border-style: dashed; border-bottom-width: 1px; background: transparent; color: var(--muted); }
footer { font-size: .85rem; color: var(--muted); display: grid; gap: 4px; padding-top: 18px; border-top: 1px solid var(--line); }
footer a { color: inherit; }
${css}
</style>
</head>
<body>
<div class="wrap">
${body}
</div>
${script}
</body>
</html>
`;
}

function footer() {
  return `  <footer>
    <span>Made with <a href="${SUITE_URL}">WoW Character Suite</a>, free and open.</span>
    <span>${esc(NOT_AFFILIATED)}</span>
  </footer>`;
}

// ---- the Bar Guide -----------------------------------------------------------------------------------------

const BARS_CSS = `
.shot-wrap { position: relative; }
.shot-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 12px; border: 1px solid var(--line); background: var(--frame); }
.stage { position: relative; padding: 14px 0; }
.stage.wide { min-width: 920px; }
.stage.has-top { padding-top: 48px; }
.stage.has-bottom { padding-bottom: 50px; }
.shot { position: relative; }
.shot img { display: block; width: 100%; max-width: none; height: auto; user-select: none; -webkit-user-drag: none; }
.hot { position: absolute; transform: translate(-50%, -50%); border: 0; padding: 0; margin: 0; background: transparent; cursor: pointer; border-radius: 5px; }
.hot:focus { outline: none; }
.hot::after { content: ""; position: absolute; inset: -2px; border-radius: 6px; box-shadow: 0 0 0 2px transparent; transition: box-shadow .12s; }
.hot:hover::after, .hot:focus-visible::after, .hot.on::after { box-shadow: 0 0 0 2px var(--tip-gold), 0 0 12px 2px rgba(255, 209, 0, .45); }
.callout { position: absolute; color: var(--frame-ink); font-family: var(--f-mono); font-size: .72rem; letter-spacing: .06em; text-transform: uppercase; display: grid; gap: 4px; pointer-events: none; }
.callout b { font-weight: 600; color: var(--tip-gold); }
.callout .rule { height: 7px; border: 1px solid var(--frame-rule); }
.callout.top { top: 10px; }
.callout.top .rule { border-top: 0; display: none; }
.callout.top.bracket .rule { display: block; border-top: 1px solid var(--frame-rule); border-bottom: 0; }
.callout.bottom { bottom: 8px; }
.callout.bottom .rule { border-bottom: 0; order: -1; }
.callout span { white-space: nowrap; }
.tip { position: absolute; z-index: 5; width: 260px; pointer-events: none; background: var(--tip-bg); color: var(--tip-text); border: 1px solid var(--tip-edge); border-radius: 6px; padding: 10px 12px; box-shadow: 0 8px 24px rgba(0,0,0,.5); font-size: .86rem; line-height: 1.35; display: grid; gap: 4px; }
.tip .tname { color: var(--tip-name); font-weight: 700; font-size: 1rem; }
.tip .trow { display: flex; justify-content: space-between; gap: 8px; color: var(--tip-dim); font-size: .78rem; }
.tip .tnote { color: var(--tip-gold); }
.tip .tdesc { color: var(--tip-text); font-size: .8rem; }
.tip .tkey { font-family: var(--f-mono); color: var(--tip-text); }
.detail { display: grid; grid-template-columns: 56px 1fr; gap: 14px; align-items: center; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; }
.detail img, .detail .noicon { width: 56px; height: 56px; border-radius: 6px; display: block; }
.detail .dname { font-family: var(--f-display); font-size: 1.25rem; font-weight: 700; line-height: 1.1; }
.detail .dline { color: var(--muted); font-size: .95rem; display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: center; margin-top: 4px; }
.hint { font-size: .85rem; color: var(--muted); }
.bars { display: grid; gap: 28px; }
.bar { display: grid; gap: 10px; }
.bar-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 6px 16px; }
.bar-head .sub { font-size: .9rem; color: var(--muted); }
.slots { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(176px, 1fr)); }
.slot { display: grid; grid-template-columns: 44px 1fr; gap: 10px; align-items: center; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; min-width: 0; cursor: pointer; text-align: left; font: inherit; color: inherit; }
.slot:hover, .slot.on { border-color: var(--accent); }
.slot:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.slot img, .slot .noicon { width: 44px; height: 44px; border-radius: 5px; display: block; }
.noicon { background: var(--key-bg); color: var(--muted); display: grid !important; place-items: center; font-family: var(--f-display); font-weight: 700; }
.slot .txt { display: grid; gap: 2px; min-width: 0; }
.slot .name { font-weight: 700; font-size: .92rem; line-height: 1.2; overflow-wrap: anywhere; }
.slot .sub { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: .76rem; color: var(--muted); }
.slot .kbd { font-size: .68rem; padding: 0 5px; }
.role { display: inline-flex; align-items: center; gap: 5px; }
.role i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; background: var(--c); }
.rules { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px 32px; }
.rule-item { display: grid; gap: 6px; padding-top: 14px; border-top: 1px solid var(--line); }
.rule-item p { color: var(--muted); font-size: .95rem; }
.aside { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.box { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 18px 20px; display: grid; gap: 8px; align-content: start; }
.box ul { margin: 0; padding-left: 1.2em; display: grid; gap: 4px; color: var(--muted); font-size: .95rem; }
@media (prefers-reduced-motion: reduce) { .hot::after { transition: none; } }
`;

function roleCss(roles) {
  const light = [], dark = [];
  for (const [k, r] of Object.entries(roles || {})) {
    light.push(`--r-${cssKey(k)}: ${cssColor(r.color)};`);
    dark.push(`--r-${cssKey(k)}: ${cssColor(r.dark || r.color)};`);
  }
  if (!light.length) return "";
  return `:root { ${light.join(" ")} }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${dark.join(" ")} } }
:root[data-theme="dark"] { ${dark.join(" ")} }`;
}

function barsSection(guide, { headingLevel = 2 } = {}) {
  const H = `h${headingLevel}`;
  const sh = guide.shot || {};
  const wide = sh.width && sh.height && sh.width / sh.height > 3;
  const lanes = new Set((guide.callouts || []).map(c => c.pos));
  const stageClass = ["stage", wide ? "wide" : "", lanes.has("top") ? "has-top" : "", lanes.has("bottom") ? "has-bottom" : ""].filter(Boolean).join(" ");
  const rules = (guide.rules || []).filter(r => r && (r.title || r.text));
  const boxes = (guide.boxes || []).filter(b => b && b.title);
  return `
  <section id="bars-shot">
    <div class="section-head">
      <div class="eyebrow">In game</div>
      <${H}>Hover any button</${H}>
    </div>
    <div class="shot-wrap" id="shot-wrap">
      <div class="shot-scroll">
        <div class="${stageClass}" id="stage">
          <div class="shot" id="shot">
            <img src="${esc(sh.src || "")}" alt="${esc(sh.alt || "In-game screenshot of the action bars")}" width="${Number(sh.width) || ""}" height="${Number(sh.height) || ""}">
          </div>
        </div>
      </div>
      <div class="tip" id="tip" hidden></div>
    </div>
    <div class="detail" id="detail" aria-live="polite"></div>
    <p class="hint">${wide ? "On a phone, scroll the screenshot sideways and tap a button." : "Tap a button on the screenshot, or a row below."}</p>
  </section>

  <section id="bars-list">
    <div class="section-head">
      <div class="eyebrow">Every button</div>
      <${H}>Slot by slot</${H}>
      <p>Click a row to highlight it on the screenshot.</p>
    </div>
    <div class="bars" id="bars"></div>
  </section>
${rules.length ? `
  <section id="bars-rules">
    <div class="section-head">
      <div class="eyebrow">${esc(guide.rulesEyebrow || "Use it on any character")}</div>
      <${H}>${esc(guide.rulesTitle || "Rules behind the layout")}</${H}>
    </div>
    <div class="rules">
${rules.map(r => `      <div class="rule-item"><h3>${inline(r.title)}</h3><p>${inline(r.text)}</p></div>`).join("\n")}
    </div>
  </section>` : ""}
${boxes.length ? `
  <section>
    <div class="aside">
${boxes.map(b => `      <div class="box">
        <h3>${inline(b.title)}</h3>
        <ul>${(b.items || []).map(i => `<li>${inline(i)}</li>`).join("")}</ul>
      </div>`).join("\n")}
    </div>
  </section>` : ""}`;
}

// The page's script. It runs in the page, so it may use nothing from this module: data comes in as JSON.
function barsRuntime() {
  const data = JSON.parse(document.getElementById("guide-data").textContent);
  const shot = document.getElementById("shot");
  const stage = document.getElementById("stage");
  const tip = document.getElementById("tip");
  const wrap = document.getElementById("shot-wrap");   // the tip lives outside the scrolling frame, so it is never clipped
  const detail = document.getElementById("detail");
  const host = document.getElementById("bars");
  const roles = data.roles || {};
  const escH = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const pct = v => (v * 100) + "%";
  const icon = (item, size) => item.icon
    ? `<img src="${escH(item.icon)}" alt="" width="${size}" height="${size}">`
    : `<span class="noicon" aria-hidden="true">${escH((item.name || "?").slice(0, 1))}</span>`;
  const roleOf = item => roles[item.role];
  const all = [];

  data.bars.forEach(bar => {
    const wrap = document.createElement("div");
    wrap.className = "bar";
    wrap.innerHTML = `<div class="bar-head"><h3>${escH(bar.title)}</h3><span class="sub">${escH(bar.sub)}</span></div><div class="slots"></div>`;
    const grid = wrap.querySelector(".slots");
    bar.buttons.forEach(b => {
      const item = Object.assign({ bar }, b);
      all.push(item);
      const hot = document.createElement("button");
      hot.className = "hot";
      hot.type = "button";
      hot.style.left = pct(b.box.x);
      hot.style.top = pct(b.box.y);
      hot.style.width = pct(b.box.w);
      hot.style.height = pct(b.box.h);
      hot.setAttribute("aria-label", `${b.key}: ${b.name}`);
      shot.appendChild(hot);
      item.hot = hot;

      const row = document.createElement("button");
      row.type = "button";
      row.className = "slot";
      const role = roleOf(b);
      if (role) row.style.setProperty("--c", `var(--r-${String(b.role).replace(/[^a-z0-9_-]/gi, "")})`);
      row.innerHTML = icon(b, 44) +
        `<span class="txt"><span class="name">${escH(b.name)}</span>` +
        `<span class="sub"><span class="kbd${b.unbound ? " unbound" : ""}"${b.unbound ? ' title="Not bound yet"' : ""}>${escH(b.key)}</span>` +
        (role ? `<span class="role"><i></i>${escH(role.label)}</span>` : (b.rank ? `<span>${escH(b.rank)}</span>` : "")) +
        `</span></span>`;
      grid.appendChild(row);
      item.row = row;

      hot.addEventListener("mouseenter", () => show(item, true));
      hot.addEventListener("mouseleave", hideTip);
      hot.addEventListener("focus", () => show(item, true));
      hot.addEventListener("blur", hideTip);
      hot.addEventListener("click", () => show(item, true));
      row.addEventListener("click", () => {
        show(item, false);
        stage.parentElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    });
    host.appendChild(wrap);
  });

  (data.callouts || []).forEach(c => {
    const el = document.createElement("div");
    el.className = "callout " + c.pos + (c.bracket ? " bracket" : "");
    el.style.left = pct(c.from);
    el.style.width = pct(c.to - c.from);
    el.innerHTML = `<span><b>${escH(c.label)}</b>${c.hint ? " · " + escH(c.hint) : ""}</span><div class="rule"></div>`;
    stage.appendChild(el);
  });

  let current = null;
  function show(item, withTip) {
    if (current) { current.hot.classList.remove("on"); current.row.classList.remove("on"); }
    current = item;
    item.hot.classList.add("on");
    item.row.classList.add("on");
    const unb = item.unbound ? " (not bound yet)" : "";
    const barName = item.bar.title.replace(/ \(.*\)/, "");
    const role = roleOf(item);
    const words = item.note || item.rank || "";
    detail.innerHTML = icon(item, 56) +
      `<div><div class="dname">${escH(item.name)}</div>` +
      `<div class="dline"><span class="kbd${item.unbound ? " unbound" : ""}">${escH(item.key)}</span>` +
      `<span>${escH(barName)}</span>${words ? `<span>·</span><span>${escH(words)}${unb}</span>` : ""}</div></div>`;
    if (!withTip) { tip.hidden = true; return; }
    const desc = !item.note && item.description ? item.description.slice(0, 180) + (item.description.length > 180 ? "…" : "") : "";
    tip.innerHTML =
      `<div class="tname">${escH(item.name)}</div>` +
      `<div class="trow"><span class="tkey">${escH(item.key)}${unb}</span><span>${escH(barName)}</span></div>` +
      (item.note ? `<div class="tnote">${escH(item.note)}</div>` : "") +
      (desc ? `<div class="tdesc">${escH(desc)}</div>` : "") +
      `<div class="trow"><span>${escH(role ? role.label : item.rank || "")}</span></div>`;
    tip.hidden = false;
    const s = wrap.getBoundingClientRect(), h = item.hot.getBoundingClientRect();
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let left = h.left - s.left + h.width / 2 - tw / 2;
    left = Math.max(8, Math.min(left, s.width - tw - 8));
    // above the button when it fits on screen, else below it
    let top = h.top - s.top - th - 10;
    if (h.top - th - 10 < 4) top = h.bottom - s.top + 10;
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }
  function hideTip() { tip.hidden = true; }
  if (all.length) show(all[0], false);
}

function guideScript(guide) {
  const { shot, ...rest } = guide;   // the screenshot is already in the <img>
  return `<script id="guide-data" type="application/json">${safeJSON(rest)}</script>
<script>(${barsRuntime.toString()})();</script>`;
}

// The Bar Guide on its own page.
export function renderBarsPage(character, guide, { homeHref = SUITE_URL, characterHref = "", makeHref = SUITE_URL + "make/" } = {}) {
  const meta = [`<span>${esc(character.displayName)}</span>`, `<span>${esc(characterLine(character))}</span>`];
  if (character.pet) meta.push(`<span>Pet: ${esc(character.pet)}</span>`);
  if (characterHref) meta.push(`<a href="${esc(characterHref)}">Character page →</a>`);
  if (makeHref) meta.push(`<a href="${esc(makeHref)}">Make your own →</a>`);
  const body = `  <header>
    <div class="eyebrow"><a href="${esc(homeHref)}">WoW Character Suite</a> · Action bar field guide</div>
    <h1>${esc(guide.title)}</h1>
    <p class="lede">${inline(guide.lede)}</p>
    <div class="meta">${meta.join("")}</div>
  </header>
${barsSection(guide)}
${footer()}`;
  return shell({
    title: guide.title,
    description: `${character.displayName}'s action bars, straight from the game: hover any button for its tooltip.`,
    css: BARS_CSS + roleCss(guide.roles),
    body,
    script: guideScript(guide),
  });
}

// ---- the character page ------------------------------------------------------------------------------------

const CHARACTER_CSS = `
.who { font-size: 1.15rem; color: var(--muted); }
.who b { color: var(--ink); font-weight: 700; }
.bio { font-size: 1.05rem; }
.chapter-nav { display: flex; flex-wrap: wrap; gap: 8px; }
.chapter-nav a { font-family: var(--f-mono); font-size: .78rem; letter-spacing: .06em; text-transform: uppercase; padding: 5px 12px; border: 1px solid var(--line); border-radius: 999px; color: var(--ink); text-decoration: none; background: var(--surface); }
.chapter-nav a:hover { border-color: var(--accent); color: var(--accent); }
.part { display: grid; gap: 28px; padding-top: 8px; }
.part > .section-head h2 { font-size: 1.9rem; }
.links { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
.link { display: grid; gap: 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 20px; color: inherit; text-decoration: none; }
.link:hover, .link:focus-visible { border-color: var(--accent); outline: none; }
.link .kind { font-family: var(--f-mono); font-size: .72rem; letter-spacing: .1em; text-transform: uppercase; color: var(--gold); }
.link p { color: var(--muted); font-size: .98rem; }
.link .go { font-weight: 700; color: var(--accent); font-size: .95rem; }
.empty { color: var(--muted); }
`;

export function renderCharacterPage(character, { guide = null, links = [], homeHref = SUITE_URL, barsHref = "" } = {}) {
  const parts = [];
  const nav = [];
  if (guide) {
    nav.push(`<a href="#bars">Action bars</a>`);
    parts.push(`  <div class="part" id="bars">
    <div class="section-head">
      <div class="eyebrow">How ${esc(character.displayName.split(" ")[0])} plays</div>
      <h2>${esc(guide.title)}</h2>
      <p>${inline(guide.lede)}${barsHref ? ` <a href="${esc(barsHref)}">Open on its own page</a>.` : ""}</p>
    </div>
${barsSection(guide, { headingLevel: 3 })}
  </div>`);
  }
  if (links.length) {
    nav.push(`<a href="#more">More</a>`);
    parts.push(`  <section class="part" id="more">
    <div class="section-head">
      <div class="eyebrow">Elsewhere</div>
      <h2>More of ${esc(character.displayName.split(" ")[0])}</h2>
    </div>
    <div class="links">
${links.map(l => `      <a class="link" href="${esc(l.href)}">
        <span class="kind">${esc(l.kind)}</span>
        <h3>${esc(l.title)}</h3>
        <p>${inline(l.text || "")}</p>
        <span class="go">${esc(l.go || "Open →")}</span>
      </a>`).join("\n")}
    </div>
  </section>`);
  }
  if (!parts.length) parts.push(`  <p class="empty">Nothing here yet. Capture your bars with <kbd>/suite bars</kbd> to start.</p>`);

  const who = [characterLine(character), character.faction].filter(Boolean).join(" · ");
  const body = `  <header>
    <div class="eyebrow"><a href="${esc(homeHref)}">WoW Character Suite</a> · Character</div>
    <h1>${esc(character.displayName)}</h1>
    <p class="who"><b>${esc(who)}</b>${character.pet ? ` · with ${esc(character.pet)}` : ""}${character.realm ? ` · ${esc(character.realm)}` : ""}</p>
    ${character.bio ? `<p class="bio">${inline(character.bio)}</p>` : ""}
    ${nav.length > 1 ? `<nav class="chapter-nav" aria-label="On this page">${nav.join("")}</nav>` : ""}
  </header>
${parts.join("\n")}
${footer()}`;
  return shell({
    title: character.displayName,
    description: `${character.displayName}, ${characterLine(character)}: how they play and where they have been, outside the game.`,
    css: CHARACTER_CSS + (guide ? BARS_CSS + roleCss(guide.roles) : ""),
    body,
    script: guide ? guideScript(guide) : "",
  });
}
