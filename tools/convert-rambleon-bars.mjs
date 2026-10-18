// One-off: turn the hand-built Bar Guide (bars/index.html as first published, commit ca3b8a9) into
// characters/rambleon-birdsong/character.json, so the page is generated from data like every other guide.
// Run: node tools/convert-rambleon-bars.mjs   (reads the original from git, so it can be run again)
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import vm from "node:vm";

const ORIGINAL = "ca3b8a9:bars/index.html";
const html = execFileSync("git", ["show", ORIGINAL], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const img = html.match(/<img src="(data:image\/jpeg;base64,[^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)">/);
if (!img) throw new Error("screenshot not found");

// The page's own data block: ICONS, IMG, ROLES, BARS, CALLOUTS. Our own file, evaluated in an empty context.
const start = html.indexOf("const ICONS =");
const end = html.indexOf("const shot =");
const ctx = {};
vm.runInNewContext(html.slice(start, end).replace(/^const (\w+) =/gm, "this.$1 ="), ctx);
const { ICONS, IMG, ROLES, BARS, CALLOUTS } = ctx;

// Role colours: the first --r-* list is the light theme, the second the dark one.
const lists = [...html.matchAll(/--r-melee:[^}]*?--r-track: #[0-9a-f]+;/g)].map(m => Object.fromEntries(
  [...m[0].matchAll(/--r-([a-z]+): (#[0-9a-f]+)/g)].map(x => [x[1], x[2]])));
const roles = {};
for (const [key, [label]] of Object.entries(ROLES)) roles[key] = { label, color: lists[0][key], dark: lists[1][key] };

const r4 = v => Math.round(v * 10000) / 10000;
const bars = BARS.map(bar => ({
  id: bar.id,
  title: bar.title,
  sub: bar.sub,
  buttons: bar.slots.map(([key, name, role, note, flag], i) => ({
    key, name, rank: (note.match(/^Rank \d+/) || [""])[0], kind: bar.id === "pet" ? "pet" : "spell", description: "",
    role, note, unbound: flag === "unbound",
    box: { x: r4((bar.x(i) - IMG.x0) / IMG.w), y: r4((bar.y - IMG.y0) / IMG.h), w: r4(bar.size / IMG.w), h: r4(bar.size / IMG.h) },
    icon: ICONS[bar.id + i],
  })),
}));

const callouts = CALLOUTS.map(c => ({
  label: c.label, hint: c.hint, from: r4((c.from - IMG.x0) / IMG.w), to: r4((c.to - IMG.x0) / IMG.w), pos: c.pos,
  ...(c.bracket ? { bracket: true } : {}),
}));

const character = {
  formatVersion: 1,
  character: {
    displayName: "Rambleon Birdsong", slug: "rambleon-birdsong", level: 30,
    race: "Night Elf", class: "Hunter", classFile: "HUNTER", faction: "Alliance", gender: "male",
    realm: "World of Warcraft: Forever", pet: "Scarletfire",
    bio: "A Night Elf Hunter who started out in Teldrassil. His nights are remembered by Rambleon, the journal named after him.",
  },
  bars: {
    capturedAt: Date.UTC(2026, 9, 16, 21, 45) / 1000,
    title: "Rambleon's Hunter Bars",
    lede: "Your real bars, straight from the game. Hover or tap any button for its tooltip. Every pull lives on 1 to =, situational spells on Shift, and out-of-combat spells on a click-only bar.",
    shot: { src: img[1], alt: img[2], width: Number(img[3]), height: Number(img[4]) },
    roles,
    bars,
    callouts,
    rulesEyebrow: "Use it on any character",
    rulesTitle: "Rules behind the layout",
    rules: [
      { title: "Keep muscle memory", text: "Leave spells you already press in their slots. Fill new spells into slots you freed up instead of reshuffling the whole bar." },
      { title: "Sort by when, not by spellbook tab", text: "Every pull goes on the number row. Situational goes on Shift. Out of combat goes on a click-only bar." },
      { title: "Group by job", text: "Keep all traps next to each other and all aspects next to each other, so you can find a whole group without looking." },
      { title: "Re-drag after training", text: "A spell already on a bar can stay at its old rank. After a trainer visit, drag it from the spellbook again so the bar has the top rank." },
      { title: "Check movement keys first", text: "Before binding anything, look at Movement Keys. A new binding silently takes the key from whatever had it." },
      { title: "Cut buttons you never press", text: "If you always open with Arcane Shot, Auto Shot doesn't need a slot." },
    ],
    boxes: [
      { title: "Still to finish", items: ["Esc → Options → Keybindings → Action Bar 2", "Click Button 11, press [[Shift]] + [[−]]", "Click Button 12, press [[Shift]] + [[=]]"] },
      { title: "Left in the spellbook", items: ["Auto Shot: you open with Arcane Shot instead", "Beast Training and Beast Lore: rarely used, open from the spellbook (P)"] },
      { title: "Unchanged", items: ["Pet bar on [[Ctrl]] + 1–4 and 8–0", "Movement: W S, Q E turn, A D strafe, R autorun"] },
    ],
  },
  links: [
    { kind: "Journal", title: "Rambleon's journal", href: "https://realworldbuilder.github.io/rambleon/example/",
      text: "Every night he played, as a timeline, a story page and a chapter. Written by Rambleon, the AddOn named after him.", go: "Read the journal →" },
    { kind: "Wrapped", title: "Rambleon's Wrapped", href: "https://realworldbuilder.github.io/wowwrapped/example/wrapped-rambleon-birdsong.html",
      text: "His nights summed up as cards: hours, levels, enemies, zones, the company he kept and the deaths.", go: "Open the Wrapped →" },
  ],
};

mkdirSync("characters/rambleon-birdsong", { recursive: true });
writeFileSync("characters/rambleon-birdsong/character.json", JSON.stringify(character, null, 1) + "\n");
console.log(`characters/rambleon-birdsong/character.json: ${bars.reduce((n, b) => n + b.buttons.length, 0)} buttons, ${callouts.length} callouts, ${Object.keys(roles).length} roles`);
