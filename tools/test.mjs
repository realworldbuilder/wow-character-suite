// Tests: the AddOn under its Lua stub, then the browser code under node. Run from the repo root: node tools/test.mjs
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { parseSavedVariables, TornFile, LuaParseError } from "../lib/luaparse.js";
import { snapshotsOf, characterOf, layoutOf, guideOf, keyLabel, barSub, matchScreenshot, carryOver, slugify } from "../lib/bars.js";
import { renderBarsPage, renderCharacterPage } from "../lib/render.js";

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`ok  ${name}`); };

// The Lua side writes the fixture the rest reads.
for (const f of ["Core.lua", "Bars.lua"]) execFileSync("luac", ["-p", `addon/CharacterSuite/${f}`]);
console.log(execFileSync("lua", ["addon/tests/run.lua"], { encoding: "utf8" }).trim());

test("parser: Blizzard's SavedVariables shapes", () => {
  const v = parseSavedVariables(`
-- a comment
DB = {
  ["a"] = "x\\"y\\\\z\\n\\65",
  ["n"] = -1.5e2, [3] = 0x1F, ["inf"] = 1.#INF, ["neg"] = -inf, ["nanKey"] = nan,
  ["list"] = { "one", nil, "three", -- [3]
  },
  plain = true; ["t"] = { [1] = 1, [2] = 2, },
  [ [[long]] ] = [==[with ]] inside]==],
}
Other = nil
Name = "Ä"`);
  assert.equal(v.DB.a, 'x"y\\z\nA');
  assert.equal(v.DB.n, -150);
  assert.equal(v.DB["3"], 31);
  assert.equal(v.DB.inf, Infinity);
  assert.equal(v.DB.neg, -Infinity);
  assert.ok(Number.isNaN(v.DB.nanKey));
  assert.deepEqual(v.DB.list, { 1: "one", 3: "three" });   // a gap: not a list
  assert.equal(v.DB.plain, true);
  assert.deepEqual(v.DB.t, [1, 2]);
  assert.equal(v.DB.long, "with ]] inside");
  assert.equal("Other" in v, false);
  assert.equal(v.Name, "Ä");
  assert.equal(parseSavedVariables('S = "\\195\\132"').S, "Ä", "\\ddd bytes are UTF-8");
});

test("parser: torn and broken files, nothing executed", () => {
  assert.throws(() => parseSavedVariables('DB = { ["a"] = 1,'), TornFile);
  assert.throws(() => parseSavedVariables('DB = { "unfinished'), TornFile);
  assert.throws(() => parseSavedVariables("DB = os.exit()"), LuaParseError);
  assert.throws(() => parseSavedVariables("DB = { [1] = function() end }"), LuaParseError);
  assert.throws(() => parseSavedVariables("DB = " + "{".repeat(600) + "}".repeat(600)), /deeply/);
  const big = "DB = {" + '"x",'.repeat(200000) + "}";
  const t0 = Date.now();
  assert.equal(parseSavedVariables(big).DB.length, 200000);
  assert.ok(Date.now() - t0 < 3000, "large files parse in linear time");
});

test("keys as players write them", () => {
  assert.equal(keyLabel("1"), "1");
  assert.equal(keyLabel("-"), "−");
  assert.equal(keyLabel("SHIFT-1"), "⇧1");
  assert.equal(keyLabel("CTRL-0"), "Ctrl 0");
  assert.equal(keyLabel("SHIFT-CTRL-Q"), "Ctrl ⇧Q");
  assert.equal(keyLabel("ALT-BUTTON4"), "Alt Mouse 4");
  assert.equal(keyLabel("MOUSEWHEELUP"), "Wheel ↑");
  assert.equal(keyLabel("NUMPAD5"), "Num 5");
  assert.equal(keyLabel("F11"), "F11");
  assert.equal(keyLabel("SPACE"), "Space");
  assert.equal(keyLabel(undefined), "Click");
  assert.equal(barSub([{ key1: "1" }, { key1: "=" }]), "Keys 1 to =");
  assert.equal(barSub([{ key1: "SHIFT-1" }, {}, { key1: "SHIFT-0" }]), "Shift + 1 to 0");
  assert.equal(barSub([{}, {}]), "Click only");
  assert.equal(barSub([{ key1: "1" }, { key1: "CTRL-2" }]), "Mixed keys");
});

test("screenshot matching by its local time stamp", () => {
  const snap = { localStamp: "101626_214500" };
  assert.equal(matchScreenshot(snap, ["WoWScrnShot_101626_214459.jpg", "WoWScrnShot_101626_214501.jpg", "WoWScrnShot_101626_214530.jpg"]), "WoWScrnShot_101626_214459.jpg");
  assert.equal(matchScreenshot(snap, ["WoWScrnShot_101626_214600.jpg", "holiday.jpg"]), null);
  assert.equal(matchScreenshot(snap, ["WoWScrnShot_103126_235959.jpg"]), null);
  assert.equal(matchScreenshot({ localStamp: "010127_000005" }, ["WoWScrnShot_123126_235958.jpg"]), "WoWScrnShot_123126_235958.jpg", "across midnight and the new year");
});

const saved = parseSavedVariables(readFileSync("tests/fixtures/CharacterSuite.lua", "utf8"));
const snap = snapshotsOf(saved).at(-1);
const SHOT_W = 2532, SHOT_H = 1583;   // tests/fixtures/WoWScrnShot_101626_214500.jpg
const layout = layoutOf(snap, SHOT_W, SHOT_H);

test("the fixture: Rambleon's capture reads back", () => {
  const c = characterOf(snap);
  assert.equal(c.displayName, "Rambleon Birdsong");
  assert.equal(c.slug, "rambleon-birdsong");
  assert.equal(c.pet, "Scarletfire");
  assert.deepEqual(layout.bars.map(b => [b.title, b.sub, b.buttons.length]), [
    ["Main bar", "Keys 1 to =", 12], ["Action Bar 2", "Shift + 1 to 0", 12], ["Action Bar 3", "Click only", 12], ["Pet bar", "Ctrl + 1 to 0", 7]]);
  assert.equal(layout.warnings.length, 0);
  assert.equal(layout.bars[1].buttons[0].key, "⇧1");
  assert.equal(layout.bars[3].buttons[0].key, "Ctrl 1");
});

test("geometry: generated boxes land on the hand-measured buttons", () => {
  // The hand-made page placed every button by eye on the same screenshot (crop at 314,712 in 1440x900 units).
  const hand = JSON.parse(readFileSync("characters/rambleon-birdsong/character.json", "utf8")).bars;
  const handCrop = { x: 314, y: 712, w: 816, h: 107 };
  const sx = SHOT_W / 1440, sy = SHOT_H / 900, { crop } = layout;
  let worst = 0;
  layout.bars.forEach((bar, i) => {
    const handButtons = hand.bars[i].buttons;
    bar.buttons.forEach((b, j) => {
      const h = handButtons[j];
      // both centres in screenshot pixels
      const gx = crop.x + b.box.x * crop.w, gy = crop.y + b.box.y * crop.h;
      const hx = (handCrop.x + h.box.x * handCrop.w) * sx, hy = (handCrop.y + h.box.y * handCrop.h) * sy;
      worst = Math.max(worst, Math.hypot(gx - hx, gy - hy));
      assert.ok(Math.abs(b.box.w * crop.w - h.box.w * handCrop.w * sx) < 1, `${b.name}: size`);
    });
  });
  assert.ok(worst < 1.5, `centres within 1.5 px (worst ${worst.toFixed(2)})`);
});

test("callouts: one lane above, one below, never overlapping", () => {
  for (const lane of ["top", "bottom"]) {
    const spans = layout.callouts.filter(c => c.pos === lane).sort((a, b) => a.from - b.from);
    for (let i = 1; i < spans.length; i++) assert.ok(spans[i].from >= spans[i - 1].to, `${lane} lane overlaps`);
  }
  assert.ok(layout.callouts.some(c => c.label === "Main bar" && c.pos === "bottom"));
});

test("a second capture keeps the player's words", () => {
  const first = guideOf(snap, layout);
  first.bars[0].buttons[1].note = "Next swing";
  first.bars[0].buttons[1].role = "damage";
  first.bars[0].title = "Number row";
  first.title = "My bars";
  const again = carryOver(guideOf(snap, layoutOf(snap, SHOT_W, SHOT_H)), first);
  assert.equal(again.bars[0].buttons[1].note, "Next swing");
  assert.equal(again.bars[0].buttons[1].role, "damage");
  assert.equal(again.bars[0].title, "Number row");
  assert.equal(again.title, "My bars");
});

test("a screenshot of another shape is called out", () => {
  assert.equal(layoutOf(snap, 1920, 1080).warnings.length, 1);
  assert.throws(() => layoutOf({ screen: {}, bars: [] }, 100, 100), /screen size/);
});

test("pages: escaped, self-contained, with the non-affiliation note", () => {
  const guide = guideOf(snap, layout);
  guide.shot = { src: "data:image/jpeg;base64,AAAA", width: 1426, height: 208 };
  guide.bars[0].buttons[0].note = '</script><img src=x onerror=alert(1)>';
  const c = { ...characterOf(snap), bio: "Likes [[Shift]] & <b>bold</b>" };
  const page = renderCharacterPage(c, { guide, links: [{ kind: "Journal", title: "J", href: "https://example.com/?a=1&b=2", text: "t" }] });
  assert.ok(!page.includes("</script><img"), "note cannot close the data script");
  assert.ok(page.includes("Likes <kbd>Shift</kbd> &amp; &lt;b&gt;bold&lt;/b&gt;"));
  assert.ok(page.includes('href="https://example.com/?a=1&amp;b=2"'));
  assert.ok(page.includes("not affiliated with or endorsed by Blizzard"));
  assert.ok(!/<script[^>]+src=/.test(page), "no external scripts");
  const data = JSON.parse(page.match(/<script id="guide-data" type="application\/json">(.*?)<\/script>/s)[1]);
  assert.equal(data.bars[0].buttons[0].note, guide.bars[0].buttons[0].note, "the note survives the round trip");
  const bars = renderBarsPage(c, guide);
  assert.ok(bars.includes("<title>Rambleon&#39;s Hunter Bars</title>"));
  assert.equal(slugify("Ælfrida Østergård"), "aelfrida-ostergard");
});

test("the site's generated pages are current", () => {
  const data = JSON.parse(readFileSync("characters/rambleon-birdsong/character.json", "utf8"));
  const built = readFileSync("bars/index.html", "utf8");
  assert.equal(built, renderBarsPage(data.character, data.bars, { homeHref: "../", characterHref: "../characters/rambleon-birdsong/", makeHref: "../make/" }), "run node tools/build.mjs");
});

console.log(`\n${passed} tests passed`);
