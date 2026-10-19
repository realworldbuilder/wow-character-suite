# WoW Character Suite: plan

Status: approved 2026-10-18. Shape: **one AddOn + a web page**. First slice: **the Bar Guide generator**, built
locally on branch `slice-1-bar-guide-generator` (not pushed); see "Slice 1: where it stands" at the end.

## What exists today

| | Rambleon 0.4.0 | WoW Wrapped 0.1.0 | Action Bar Guide |
|---|---|---|---|
| Repo | realworldbuilder/rambleon | realworldbuilder/wowwrapped | this repo, `bars/` |
| Collects | AddOn `Rambleon`, per-character SavedVariables `RambleonDB`: sessions with events (zones, levels, quests, first kills, loot, deaths, group members, notes, marks, bosses) and `Screenshot()` at level ups, marks, new zones | The same AddOn, forked and renamed (`WoWwrappedDB`, `/wrapped`) | nothing: hand-made from one screenshot |
| Stores | Mac watcher (launchd) → `archive/`: raw SavedVariables snapshots (never edited) + normalized session JSON (never shrinks) | the same archive; also reads `RambleonDB` snapshots | one 646 KB HTML file, image and icons inlined, hand-measured coordinates |
| Outputs | per night: Markdown log, story page, AI chapter (Claude CLI), route guide, `Chapters.lua` read in game, X posts, `ramble share` → GitHub Pages | per character: the Wrapped (cards: hours, levels, enemies, zones, companions, deaths, rhythm, notes, pictures, persona) + a facts page per night | `/bars/`: hover a button for its tooltip |
| Install | `brew install uv` · `uv tool install "git+…/rambleon@v0.4.0#subdirectory=companion"` · `ramble setup` | the same with `wrapped setup`; not yet verified in game | — |

WoW Wrapped is a fork of Rambleon 0.4.0, and the two cannot record at the same time. The suite therefore has
**one recorder and several outputs**, not three bundled tools.

## Shape: one AddOn + a web page

```
WoW ──► CharacterSuite AddOn ──► WTF/…/<Character>/SavedVariables/CharacterSuite.lua   (+ Screenshots/)
                                        │  the player drops the files into the page
                                        ▼
        realworldbuilder.github.io/wow-character-suite/make/   (static, runs in the browser, uploads nothing)
           parse SavedVariables safely (never executed) ─► character.json ─► character page
                                                                              ├─ Bars     (slice 1)
                                                                              ├─ Wrapped  (slice 3)
                                                                              └─ Journal  (slice 4)
           export: one self-contained <slug>.html to host anywhere, + <slug>.character.json to keep editing
```

- **The download is the AddOn**, a zip on the site (`downloads/`). No Python, no service, any OS that runs WoW.
- **The page is the app.** Everything happens in the browser tab: parsing, cropping, rendering. Nothing is sent
  anywhere. Sharing is the player's act: they host the exported file (GitHub Pages, Neocities, a Discord upload).
- **`character.json` is the contract** between the AddOn data and every output (see "Data" below). A page can be
  reopened later by dropping the JSON back in, so notes and choices are never lost.
- **Mac users of Rambleon / WoW Wrapped** keep their watcher. A later slice lets the page import their archive
  (normalized session JSON) so years of history feed the same character page.

### What this shape costs, and how we answer it

- **No watcher, so no automatic history.** Forever does not restore SavedVariables on a cold start (verified
  by Rambleon), so the AddOn's own file only holds recent sessions. Answer: the page keeps a per-character archive
  in the browser (IndexedDB), merging each dropped file by session id with Rambleon's rule (never shrink, never
  delete), and offers "export archive" / "import archive". Rambleon / Wrapped archives import too.
- **No AI chapter in the page.** Answer: the page writes the same prompt file Rambleon writes; the player pastes it
  into any assistant and pastes the chapter back. Facts-only pages are always complete.
- **Screenshots are separate files.** Answer: the AddOn records the local-time stamp of every picture it takes;
  the page matches dropped `WoWScrnShot_MMDDYY_HHMMSS.jpg` files to it and asks when unsure.

## Data: `character.json` (formatVersion 1)

```json
{
  "formatVersion": 1,
  "character": { "displayName": "Rambleon Birdsong", "slug": "rambleon-birdsong", "level": 30,
                 "race": "Night Elf", "class": "Hunter", "classFile": "HUNTER", "faction": "Alliance",
                 "realm": "Classic Beta PvE", "pet": "Scarletfire" },
  "bars": {
    "capturedAt": 1792000000,
    "title": "Rambleon's Hunter Bars", "lede": "…",
    "shot": { "src": "data:image/jpeg;base64,…", "width": 1435, "height": 188 },
    "roles": { "shot": { "label": "Shot", "color": "#1f8a86" } },
    "bars": [ { "id": "main", "title": "Main bar", "sub": "Keys 1 to =",
                "buttons": [ { "key": "1", "name": "Attack", "rank": "", "kind": "spell", "role": "melee",
                               "note": "Starts auto-attack", "unbound": false,
                               "box": { "x": 0.031, "y": 0.84, "w": 0.037, "h": 0.28 },
                               "icon": "data:image/png;base64,…" } ] } ],
    "callouts": [ { "label": "Pet bar", "hint": "Ctrl + key", "from": 0.03, "to": 0.29, "pos": "top" } ],
    "rules": [ { "title": "Keep muscle memory", "text": "…" } ],
    "boxes": [ { "title": "Still to finish", "items": ["…"] } ]
  },
  "links": [ { "kind": "journal", "title": "Rambleon's journal", "href": "…" } ]
}
```

- `box` is the button's centre and size as **fractions of the cropped screenshot**, so any resolution and UI
  scale works. `callouts`, `roles`, `rules`, `boxes`, `note`, `role` are optional: the page is complete without them.
- Later slices add `sessions` (normalized like Rambleon's), `wrapped` (the numbers `build_wrapped` makes) and
  `journal` (chapters the player pasted back).

## The AddOn: `CharacterSuite`

- Lua 5.1 syntax, retail 12.x-style API, Rambleon's rules: register events only through `pcall`, store only plain
  values, no combat log, no protected API, no automation, one login line in chat, `ReloadUI` only from a popup the
  player clicks.
- Slice 1 holds only `/suite bars` (alias `/charsuite`). It records no sessions, so it runs next to Rambleon.
- `/suite bars`: for every visible, filled action button (main bar, Action Bars 2–8, pet bar, stance bar) it stores
  the action (spell / item / macro), its name, rank, icon file id, binding and the button's rectangle in UI units
  with its effective scale; plus `UIParent`'s size and scale, the character, and the local time stamp. Then it
  calls `Screenshot()` and, once the picture is taken, offers a Reload button so the file is written now.
- Later slices fold Rambleon's recorder in (sessions and events, same schema), so one AddOn feeds everything.

## The page: `make/`

1. Download the AddOn, unzip into `Interface/AddOns/`.
2. In game: `/suite bars`, click Reload.
3. Drop `WTF/Account/<ACCOUNT>/<realm>/<Character>/SavedVariables/CharacterSuite.lua` and the new screenshot
   from `Screenshots/` onto the page.
4. The page crops the bars and every icon out of the screenshot, places a hotspot on every button from the
   recorded geometry, and shows the guide. Notes, roles, titles, the bars' names are editable in place.
5. Download `<slug>.html` (self-contained: the character page with its Bar Guide) and `<slug>.character.json`.

## Repo layout (static, served by GitHub Pages from `main`, no build step needed to serve)

```
index.html                     hub (live)
bars/index.html                Rambleon's Bar Guide; from slice 1 generated from characters/rambleon-birdsong/
characters/<slug>/             character.json + index.html (the character page)
make/                          the web app
lib/                           shared ES modules: luaparse.js, bars.js (capture → data), render.js (data → HTML)
addon/CharacterSuite/          the AddOn; addon/tests/ (Lua stub + scripted capture)
downloads/CharacterSuite-<v>.zip
tools/build.mjs                regenerates bars/ and characters/*/index.html from their JSON; zips the AddOn
tools/test.mjs                 node tests (parser, capture → data, render), plus the Lua test
docs/PLAN.md
```

`/` and `/bars/` keep working at every commit.

## Slices

1. **Bar Guide generator** (this session): the AddOn's `/suite bars`, the Lua stub test, `lib/` (safe parser,
   capture → bars data, renderer), `make/`, Rambleon's guide regenerated from `characters/rambleon-birdsong/` at
   `/bars/`, his first character page, the hub's "make your own" card. Verified locally; needs one run in game.
2. **Character page grows up**: header from the AddOn's character data, editable bio, the exported page polished
   for phones and link previews (Open Graph image cut from the bar shot), the browser archive (IndexedDB).
3. **Wrapped in the page**: fold Rambleon's recorder into the AddOn (one recorder), port `build_wrapped` and the
   cards to JS, import Rambleon / Wrapped archives.
4. **Journal in the page**: night pages from sessions, the prompt file, paste-back chapters.
5. Decide the fate of the rambleon and wowwrapped repos (point them here, or keep them as the Mac path).

## Not doing

Rambleon's and WoW Wrapped's "NOT" lists hold for the whole suite: no meter, no rotation help, no leveling guide,
no ranking against other players, no automation. The Bar Guide shows the player's own layout and their own
reasons; it never suggests a layout.

World of Warcraft is a trademark of Blizzard Entertainment. This project is not affiliated with or endorsed by
Blizzard. The name "WoW Character Suite" needs the same name check WoW Wrapped's roadmap plans before any wider launch.

## Slice 1: where it stands (2026-10-18)

Done and checked locally: the AddOn under a stub client (`addon/tests/run.lua`, Rambleon's real layout, 43 buttons on
4 bars), the parser, snapshot → guide data, the renderer, `make/` end to end with the sample (43 hotspots on the
right icons, notes and roles editable, preview identical to the export), `/bars/` regenerated from data and
visually the same as the hand-made original, the first character page, the hub's new cards. No sideways scroll at
375 px. `node tools/test.mjs`: 11 tests.

Verified in game (2026-10-18, Forever, Rambleon Birdsong in Stormwind):
- `/suite bars` captured 43 buttons on 4 bars: frame names, `btn.action`, `GetActionInfo`, ranks from
  `C_Spell.GetSpellSubtext`, spell descriptions, `GetPetActionInfo` tokens, `GetBindingKey` all work.
  `SCREENSHOT_SUCCEEDED` fired and the Reload popup was not in the picture.
- The screen was 2560 x 1440 at UI scale 0.64 (2133 x 1200 UI units); the screenshot was the same shape and its
  file name stamp matched the snapshot to the second. The page placed every hotspot on its button.
- The first run threw: `UnitName("player")` returns the surname as a second value, which `CleanString` took as a
  length limit. Fixed (one-argument `CleanString`, `CleanText` for cutting) and the stub now returns both values.
- Still unchecked: a cold start (does the snapshot reach disk when the next login wipes SavedVariables? It only has
  to be written once, by the Reload), another class, a stance bar, Action Bars 4-8.

Known limits, for slice 2:
- The crop is the box around every button: bars on the right edge make it a tall, mostly-world picture. Cut one
  picture per cluster of bars instead.
- Callouts get one lane above and one below; a third overlapping bar loses its label (the pet bar in the sample).
- Icons are cut from the screenshot, so they keep the keybind number in their corner (and any cooldown swipe).
  The AddOn records each icon's file id; a clean icon needs a file id → icon source.
