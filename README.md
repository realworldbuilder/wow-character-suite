# WoW Character Suite

Tools for your World of Warcraft characters' life outside the game: what they did, how they play, and the stories worth sharing.

Live site: https://realworldbuilder.github.io/wow-character-suite/

## What's here

- **[Make your own](https://realworldbuilder.github.io/wow-character-suite/make/)**: the Bar Guide for any character. Install the AddOn, type `/suite bars` in game, drop `CharacterSuite.lua` and the screenshot on the page, add your reasons, download one self-contained page. Everything runs in the browser; nothing is uploaded.
- **[Rambleon Birdsong](https://realworldbuilder.github.io/wow-character-suite/characters/rambleon-birdsong/)**: the first character page, and his **[Action Bar Guide](https://realworldbuilder.github.io/wow-character-suite/bars/)** on its own.
- **[Keyboard Heatmap](https://realworldbuilder.github.io/wow-character-suite/keys/)**: the same Hunter's keybinds as a heatmap, before and after fixing them, with the macros and rebinds to copy.
- **[Rambleon](https://github.com/realworldbuilder/rambleon)**: an Azeroth adventure journal. A passive WoW AddOn plus a Mac companion.
- **[WoW Wrapped](https://github.com/realworldbuilder/wowwrapped)**: Spotify Wrapped for your World of Warcraft characters.

The plan for folding them into one AddOn and this site is [docs/PLAN.md](docs/PLAN.md).

## Layout

```
index.html                 the hub
make/                      the web app (index.html + make.js)
lib/                       shared ES modules: luaparse.js (safe SavedVariables reader), bars.js (snapshot → guide data), render.js (data → page)
characters/<slug>/         character.json (the data) + index.html (generated)
bars/index.html            Rambleon's Bar Guide (generated from characters/rambleon-birdsong/)
addon/CharacterSuite/      the AddOn; addon/tests/run.lua runs it under a stub client
downloads/                 the AddOn zip (generated)
tests/fixtures/            the stub's SavedVariables and a matching screenshot (the page's "Try it with a sample")
tools/                     build.mjs, test.mjs, convert-rambleon-bars.mjs (one-off)
```

The site is static and has no build step to serve; the generated files are committed.

## Dev loop

```bash
node tools/test.mjs              # Lua stub test, parser, geometry, rendering (needs lua/luac and node)
node tools/build.mjs             # regenerate characters/*/index.html, bars/index.html and the AddOn zip
python3 -m http.server 8765      # then open http://127.0.0.1:8765/make/ and press "Try it with a sample"
```

In game: copy `addon/CharacterSuite` into `Interface/AddOns`, `/suite bars`, Reload. Files land in
`WTF/Account/<ACCOUNT>/<realm>/<Character>/SavedVariables/CharacterSuite.lua` and `Screenshots/`.

World of Warcraft is a trademark of Blizzard Entertainment. This project is not affiliated with or endorsed by Blizzard.
