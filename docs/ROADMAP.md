# IRON & ASH — Strategy & Roadmap

Story: [LORE.md](LORE.md) · AI unit design: [AI_DESIGNER.md](AI_DESIGNER.md) · Code map: [ARCHITECTURE.md](ARCHITECTURE.md)

## The game in one line
**One world of pixel-matter, four ways to play it** — hold the train (defense), drive the line (exploration), go under (digging), take the sky (flight) — and every unit in all four is built from the same two PNG layers, by you or by an AI.

## Design pillars (decide everything against these)
1. **Everything is material.** No hit points on units — only pixels of STEEL, WOOD, FUEL, GLASS… that burn, bend, leak, shatter. If the player can't predict it from "what is it made of", it's a bug.
2. **Units are data, not code.** A vehicle is `look.png` + `material.png` + a small JSON spec. Anything that can make those — a person in Photoshop, the Forge, an AI model — can add content.
3. **Function follows form.** A wagon has an ability because its pixels form that section (CAB, GUN, DECK, WORKSHOP…). Shoot the section away and the ability is gone.
4. **Readable, not calculated.** Physics is visual and rule-of-thumb. Satisfying beats accurate.
5. **Small verbs, deep combos.** Crafting, digging, flying each have 3–5 controls; depth comes from combining wagons.

---

## Where we are (v3.40.0)
**Working:** pixel-material engine (23 materials), fire/water/leaks/structural collapse, train physics, crew as individuals, looting, raiders, enemy aircraft, player aircraft + carriers, tunnel driller + buried vaults/veins/gas, stations, save/load, Unit Forge (10-step unit builder from PNGs), playtest panel with live balance, ASCII shader + raw pixel view.

**Fixed in v3.40.0**
- Driller re-docked on the first frame after launch → digging was unreachable. Starting train now includes an Excavator Rig.
- "Game freezes": an exception in one frame killed the loop forever. Loop is now fault-tolerant and reports the error.
- Driller track pixels crashed the renderer (the freeze trigger).
- Forge test range launched a stock plane for driller / tank / drone units, and crashed on first control tick for deck-launched units.
- Removed ~1,200 lines of dead "patch layer" code (v3.37–v3.39.2) that hooked functions it could never reach.
- Source is modular again (`src/js/*.js`, 36 modules) with a zero-dependency build.

**Known gaps:** Old Playwright test suite (`archive/modular-source-v3.25/tools/tests`) not yet ported. Driller sub-systems promised by the old handoff doc (heat, sonar, tether, strata, cave-ins) were never actually live — they are re-planned in Phase 2.

---

## Phases

### Phase 0 — Foundation ✅ (this session)
Repo layout, build, dev server, docs, bug triage, git.

### Phase 1 — Feel & look (2–3 weeks) ← next
*Goal: 30 seconds of play looks and feels premium.*
- **Aesthetic upgrade, pixel structure kept**
  - ✅ Default view = pixels; ASCII is the optional "terminal" filter on the ` key (decided 2026-11-15).
  - Per-material shading in the paint pass: metal specular streaks, wood grain, glass glint, rubber matte — computed from material + neighbour normals, no new art needed.
  - Lighting pass: firelight/lamp light as additive light map with soft falloff; bloom on GLOW/LAMP/fire; day–dusk–night palette per biome.
  - Parallax: 3–4 background layers per biome (ruined skyline, ash dunes, pylons), atmospheric perspective, ash/ember particles with wind.
  - Higher-detail unit spec: allow 2× unit resolution (`train-unit-v3`: 200×88 wagon) while physics stays on the same grid logic.
  - Screen feel: camera kick on blasts, hit-stop on big breaks, smooth zoom, dust on wheels.
- **Physics & destruction that reads instantly**
  - Material behaviour card (one table, one source of truth): WOOD splinters + burns, STEEL dents → tears, ARMOR deflects, GLASS shatters to shards, CONCRETE crumbles to rubble, FUEL/OIL leak → pool → ignite, WATER extinguishes + steams, COAL smoulders, BATTERY arcs.
  - Debris with weight classes; rubble piles that stay; chain reactions (fuel → ammo cook-off).
  - Liquids v2: pooled cell liquids (water, oil, fuel, acid, lava) flowing in tunnels and craters — this is what makes digging dangerous and fun.
- **Sound pass** per material (metal ring, wood crack, glass).

### Phase 2 — The four games, properly (4–6 weeks)
- **Dig**: strata with hardness (ash silt → permafrost → basalt → bedrock), drill heat, sonar ping, tether/winch back to the rig, cave-ins using the real structure solver, flooding, Mnemos vaults as mini-dungeons, Deepfolk tunnels. Built *inside* `16f-digging.js`, not as hooks.
- **Fly**: recon (reveal the map ahead), bombing runs, air-drop/pickup, dogfights, sky hazards (Ember Falls), high-altitude layer.
- **Defend**: stop-and-hold events (siege at a station, bridge repair under fire), turret wagons, deployable barricades and mines — tower-defense rhythm with the train as the tower.
- **Explore**: branching route map (choose next leg), faction territory, sites with stories, weather fronts.
- **Crafting from working units** (keep it one-click):
  - A **WORKSHOP** section + materials in the stash → *drone* (ALU + BATTERY + WIRE), *turret*, *mine*, *repair bot*, *shoring strut*.
  - A recipe is `{needs: section, costs: {mat: n}, makes: unitId}` — data only, so AI-designed units get recipes automatically from their pixel counts.
  - Salvage is the reverse: wrecks break down into the materials they are literally made of.

### Phase 3 — AI as designer and opponent (3–5 weeks, can start in parallel)
See [AI_DESIGNER.md](AI_DESIGNER.md).
1. **Unit Spec v3** — text-only unit description an LLM can write (palette grid + spec), compiled to the two PNG layers.
2. **"Ask the Foundry"** in the Forge: describe a vehicle in words → model returns a spec → validator → test range → save.
3. **Balance by simulation**: headless runs score each unit (cost, survivability, damage) so AI designs are fenced into a budget.
4. **Faction designers**: each Intellect has a design brief (AEGIS = heavy armor…); enemy rosters are generated per run.
5. **AI Arena**: two models each get the same budget, design a train + units, and fight headless; replays viewable in-game. Later: public ladder.

### Phase 4 — Campaign & online (ongoing)
- Acts I–IV from the World Bible, faction reputation, crew stories, endings.
- Website on Lovable (landing page, devlog, unit gallery, arena leaderboard) embedding the game build from GitHub Pages.
- Shared unit library (Supabase via Lovable): upload/download/rate units; daily challenge seed.

---

## Technical direction
- **Keep**: vanilla JS, one closure, modules joined by `tools/build.mjs`, single-file output. It is fast, debuggable, and AI-agent-friendly.
- **Add next**: (1) headless sim runner in Node for tests/balance/arena — the sim (`step`) must run without DOM; (2) port the old Playwright tests to `tools/tests`; (3) data out of code: units, recipes, factions, biomes as JSON in `data/`.
- **Rule**: no more patch layers. Features are edited into their module; the build rejects `window._hook_*`.
- **Later, only if needed**: ES modules + Vite, TypeScript types for the unit spec, WebGL instanced pixel renderer for 2× resolution.

## Publishing pipeline
`src/` → `npm run build` → `dist/index.html` → `npm run deploy` → `gh-pages` branch → GitHub Pages (https://chillgamesbeforesleep.github.io/iron-and-ash/) → embedded in the Lovable site via iframe. Lovable owns the *website* repo; this repo owns the *game*.

## Decisions
- **2026-11-15** Pixels first; ASCII stays as an optional filter.
- **2026-11-15** Next build focus: Phase 1 look & feel.
- **2026-11-15** "Vicky" in old notes = the **Wiki**: the in-game, auto-updating database of everything made of pixels — units, sections, materials, buildings, underground features, biomes, later ground tiles and enemies. Rule: anything added to the world must come from a registry the Wiki reads.
- **2026-11-15** GitHub via gh CLI; game published with GitHub Pages.

## Open decisions (owner: you)
1. AI provider(s) for the designer: Claude only first, or multi-provider from day one?
2. Where should API keys live: player's own key in the browser (simple, no server) or a small proxy (needed for a public site)?
3. GitHub repo public or private? (Free GitHub Pages needs a public repo.)
