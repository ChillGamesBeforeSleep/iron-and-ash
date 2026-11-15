# IRON & ASH

Post-apocalyptic armored-train exploration on a pixel-material physics engine.
Drive the line, hold off raiders and machine factions, dig for buried vaults, take the sky — and build every vehicle from two PNG layers.

**Play online:** https://chillgamesbeforesleep.github.io/iron-and-ash/

## Play / develop

```bash
npm run dev      # rebuilds on every save, serves http://localhost:5173 with auto-reload
npm run build    # src/ -> dist/index.html (single self-contained file)
npm run release  # bump version + keep a copy in builds/
npm run deploy   # build and publish to GitHub Pages (gh-pages branch)
```

Needs only Node 18+. No dependencies, no install step.

## Layout

```
src/            the game — edit here
  index.html    page template (HUD markup)
  css/main.css
  js/NN-*.js    36 modules, joined in name order into one closure
  VERSION
tools/          build.mjs, dev.mjs
assets/         unit templates, material palette, example units
art/            my-creations/ (your units) · reference/ (AI image tests, PSDs — not in git)
docs/           LORE · ROADMAP · BALANCE · ARCHITECTURE · AI_DESIGNER
archive/        every old build, the v3.25 modular source, old patch scripts (not in git)
dist/           build output (not in git; npm run deploy publishes it)
```

## Docs
- [World Bible](docs/LORE.md) — story, factions, campaign
- [Roadmap](docs/ROADMAP.md) — strategy, phases, open decisions
- [Architecture](docs/ARCHITECTURE.md) — code map and rules
- [Balance & the Pixel Ledger](docs/BALANCE.md) — the core mechanic: every pixel is an asset; all unit numbers
- [AI Designer](docs/AI_DESIGNER.md) — plan for AI-built vehicles and the AI-vs-AI arena

## Controls (short)
`D/A` throttle · `S/Space` brake · click: cannon · `E` loot · `Q` repair · `Tab` switch train/vehicle · click a **DECK** section to launch its aircraft or driller · `F2` playtest panel · `` ` `` ASCII/pixels · `H` codex
