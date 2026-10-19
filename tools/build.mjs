// Regenerate the site's generated pages from their data, and zip the AddOn for download.
// Run from the repo root: node tools/build.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname } from "node:path";
import { renderBarsPage, renderCharacterPage } from "../lib/render.js";

// Each character's page, and where its Bar Guide lives on its own. Rambleon's stays at /bars/, its first URL.
const PAGES = [
  { data: "characters/rambleon-birdsong/character.json", page: "characters/rambleon-birdsong/index.html", bars: "bars/index.html",
    home: "../../", barsHref: "../../bars/", characterHref: "../characters/rambleon-birdsong/", barsHome: "../", make: "../make/" },
];

const write = (path, text) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); console.log(`wrote ${path} (${Math.round(text.length / 1024)} KB)`); };

for (const p of PAGES) {
  const data = JSON.parse(readFileSync(p.data, "utf8"));
  write(p.page, renderCharacterPage(data.character, { guide: data.bars, links: data.links || [], homeHref: p.home, barsHref: p.barsHref }));
  if (p.bars && data.bars) write(p.bars, renderBarsPage(data.character, data.bars, { homeHref: p.barsHome, characterHref: p.characterHref, makeHref: p.make }));
}

// The AddOn download: the CharacterSuite folder only, ready to drop into Interface/AddOns.
const version = readFileSync("addon/CharacterSuite/CharacterSuite.toc", "utf8").match(/## Version: (\S+)/)[1];
const zip = `downloads/CharacterSuite-${version}.zip`;
mkdirSync("downloads", { recursive: true });
if (existsSync(zip)) rmSync(zip);
execFileSync("zip", ["-q", "-X", "-r", `../${zip}`, "CharacterSuite"], { cwd: "addon" });
console.log(`wrote ${zip}`);
writeFileSync("downloads/latest.json", JSON.stringify({ version, file: `CharacterSuite-${version}.zip` }) + "\n");
