# AI Designer — letting models build (and fight with) vehicles

Status: **plan**, not built yet. This is the design for Phase 3 of [ROADMAP.md](ROADMAP.md).

## Why this is easy for this engine
A unit is already pure data — the `train-unit-v2` file the Forge exports:

```json
{ "format": "train-unit-v2", "id": "fire_lancer", "name": "Fire Lancer", "base": "wagon",
  "roles": ["WATER","CANNON","PUMP","AMMO","AXLE","AXLE","AXLE","AXLE"],
  "spec": { "mass": 0.9, "wheels": [{"x":12.5,"y":37.5,"r":5.5}], "points": {"nozzle":[69,1]} },
  "look": "data:image/png;base64,…",       // visual layer
  "material": "data:image/png;base64,…" }  // structural layer (palette colours = materials)
```

A language model cannot paint a PNG, but it can write a **grid of characters**. So we add a text form of the same thing and compile it to the two PNGs in the browser.

## Unit Spec v3 (the format a model writes)

```json
{
  "format": "iron-ash-unit-v3",
  "name": "Ember Lance",
  "base": "wagon",                       // loco | wagon | plane | heli | drone | mole | tank
  "roles": ["AMMO","CANNON","WORKSHOP","SCRAP","AXLE","AXLE","AXLE","AXLE"],
  "legend": {                            // one char -> material (+ optional colour override)
    ".": "EMPTY", "S": "STEEL", "A": "ARMOR", "W": "WOOD", "G": "GLASS",
    "F": "FUEL",  "M": "AMMO",  "O": "WHEEL", "L": "LAMP",
    "r": {"mat": "STEEL", "rgb": [124,62,38]}       // rusty steel
  },
  "grid": [                              // exactly H rows of W chars (wagon: 100×44)
    "....................SSSSSSSS....",
    "..."
  ],
  "wheels": [{"x":12.5,"y":37.5,"r":5.5}],
  "points": {"turret":[50,6], "couplerRear":[0,32], "couplerFront":[99,32]},
  "notes": "designer's intent — shown in the Forge, used by the balance report"
}
```

- **Material layer** = `legend[char].mat` → the palette colour from `assets/material_palette.png`.
- **Look layer** = `rgb` override if given, otherwise the engine's procedural shader for that material (grain, rivets, weathering — the same `brut()/sh()/cyl()` helpers the built-in units use). The model decides *structure and colour blocking*; the engine makes it *pretty*. This is also the path to the richer, less "flat pixel-art" look.
- Compiles through the existing `compileUnit()` — so every existing check (size, wheel circles, section coverage, couplers) applies unchanged.

## Pipeline

```
 prompt ("a heavy flak wagon for AEGIS, budget 900")
   │
   ▼
 [1] Brief builder      rules of the format + material table + size + budget + 1–2 example units
   ▼
 [2] Model call         any provider; must return JSON only
   ▼
 [3] Validator          schema · grid size · legend chars · budget · compileUnit() report
   │        └── errors → sent back to the model as a repair turn (max 3)
   ▼
 [4] Auto-test          headless sim: does it roll / fly / survive 30 s / do damage?
   ▼
 [5] Forge preview      player sees it in the test range, edits, saves — or rejects
```

### Budget = balance (built in v3.42)
The Pixel Ledger already does this. `ledger(c).cost` is the build cost (per-pixel material costs, see BALANCE.md) and is the budget an AI design must stay under. `ledgerSheet(c)` is the validator: it returns plain-language errors such as "stalls at 161, tops out at 144 — cannot stay up; use lighter skin or more engine", which go straight back to the model as its repair turn. A model cannot win by filling the canvas with armour: the weight grounds the unit before the budget does.

## Provider layer (many intellects, one socket)

```js
// src/js/30-ai-provider.js
const AI_PROVIDERS = {
  claude:  { label: 'Claude',  call: async (brief, key) => {/* … */} },
  openai:  { label: 'GPT',     call: async (brief, key) => {/* … */} },
  gemini:  { label: 'Gemini',  call: async (brief, key) => {/* … */} },
  local:   { label: 'Local (Ollama)', call: async (brief) => {/* … */} },
};
// every provider: (brief: string) -> Promise<string /* JSON text */>
```

**Keys:** two modes.
1. *Bring your own key* — pasted in settings, kept in `localStorage`, sent straight from the browser. Zero server; fine for you and for testers. Never committed, never in the build.
2. *Proxy* — a tiny edge function (Lovable/Supabase) holds the keys and rate-limits. Required before a public site offers AI design to anonymous players.

## AI vs AI — the Arena
Fits the fiction exactly: each **Intellect** *is* a model.

1. **Design round** — each model gets the same budget and biome, returns a train consist + up to N unit specs.
2. **Doctrine round** — each returns a small behaviour table (target priority, engage range, retreat threshold). No code execution from models — only data the sim interprets.
3. **Fight** — headless deterministic sim (fixed seed) in Node; result + replay file.
4. **Watch** — replay loads in the normal game renderer.
5. **Ladder** — Elo per model/faction; results posted to the website.

Requirement this puts on the engine: `step()` must run without DOM/WebGL and be deterministic for a seed (seeded RNG instead of `Math.random()` in sim code). That is the single biggest technical task of Phase 3 and it also unlocks automated tests and balance bots.

## Build order
1. `compileSpecV3()` + legend/grid validator + "Import text spec" box in the Forge (no AI yet — you can paste a spec by hand).
2. Brief builder + one provider + repair loop + "Ask the Foundry" button.
3. Budget table + balance report in the Forge.
4. Headless sim + seeded RNG.
5. Faction rosters generated per run → Arena.
