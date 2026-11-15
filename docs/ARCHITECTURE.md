# Architecture — code map

The game is vanilla JavaScript, no dependencies. `tools/build.mjs` joins every file in `src/js/` (in file-name order) inside **one strict-mode closure** and injects it, plus `src/css/main.css`, into `src/index.html` → `dist/index.html` (a single self-contained file).

Because all modules share one scope, a `const`/`function` defined in one file is visible in every later file — there are no imports. **Order matters only for top-level `const`/`let`** (functions are hoisted).

## Globals worth knowing
| Name | What |
|---|---|
| `CFG` | every tunable number (00-config). Live-editable in the Playtest panel (F2). |
| `G` | all run state: `G.train.cars`, `G.world`, `G.res`, `G.vehicles`, `G.crew`, `G.state` (`title/play/leg/over/workshop`) |
| `MATS`, `M` | material registry and name→index map (`M.STEEL`) |
| `CARS`, `ROLES` | unit definitions and section abilities |
| `PX` | loose pixel physics (debris, rubble, liquids) |
| `window.__G`, `window.__api` | debug handles for the console and tests |

## Modules
| File | Responsibility |
|---|---|
| `00-config` | `CFG` balance + engine constants |
| `01-utils` | math, hash noise, colour helpers |
| `02-materials` | **the material table**: hp, mass, flammability, drip, glow… |
| `03-units-procedural` | `ROLES`, `CARS`, and the painters for built-in units (`paintLoco`, `paintDriller`, `paintMole`…) |
| `04-units-image` | PNG-based units: `compileUnit`, `makeCar` |
| `05-state` | `G`, screen size |
| `06-world` | terrain, biomes, sites, buried vaults (`genWorld`) |
| `07-train` | consist, coupling, layout |
| `08-pixels-core` … `14-structure` | pixel physics: debris, fire, water/crane, damage, per-car simulation, structural collapse |
| `15-train-physics` | traction, slopes, braking |
| `16-entities` | particles, shots, drones, rocks |
| `16a-raiders` | ground enemies |
| `16b-vehicles` | pixel vehicles: enemy aircraft, tank, **driller (`moleStep`)**, `vehicleTick` |
| `16c-flight` | flight model |
| `16d-effects` | effect points (smoke, flame, lamps) |
| `16e-control` | player control switching, carrier decks/bays, launch, winch, landing |
| `17-crew-loot-repair`, `17b-crew-roster` | crew as people, expeditions, inventory, items |
| `18-loop-autopilot` | `step(dt)` — the simulation tick; autopilot; profiler |
| `19-sound` | WebAudio synth |
| `20-render-gl`, `21-render-scene` | scene → low-res buffer → ASCII/pixel shader |
| `22-hud` | HUD |
| `23-playtest` | F2 panel: spawns, balance knobs, match report |
| `24-save-station` | save/load, station screen |
| `25-forge`, `25b-forge-sim` | Unit Forge and its test range |
| `26-flow` | title, run/leg flow, codex |
| `27-input`, `28-boot` | input, boot, the frame loop |

## Rules
1. **Edit the module.** Never add a second `<script>` or hook functions through `window` — nothing outside the closure can see the game. The build fails on `window._hook_*` / `window._orig_*`.
2. **Numbers go in `CFG`.** The build warns about `CFG.x` used but not defined.
3. **New feature = new file** with the next free number (`16f-digging.js`), a header comment saying what it owns.
4. **One exception must not freeze the game**: the frame loop catches, logs once, and keeps going — but an `ENGINE ERROR` in the log is always a bug to fix.
5. **Test before commit**: `npm run build` must pass; play one leg; if you touched units, run the Forge test range for that type.

## Unit format
See `assets/units/README.md` and [AI_DESIGNER.md](AI_DESIGNER.md). Templates and the material palette are in `assets/unit-templates/`.
