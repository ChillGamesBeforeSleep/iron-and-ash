# Changelog

Older history (v3.9 – v3.25): `archive/modular-source-v3.25/docs/CHANGELOG.md`.

## 3.42.0 — the Pixel Ledger (core mechanic)
Every pixel of the material layer is now an asset. Full rules and numbers: `docs/BALANCE.md`.
- **Weight** comes from the pixels (was a typed-in number per unit). Tanks get lighter as they empty.
- **Storage** is the container material itself: FUEL, WATER, AMMO, SCRAP, CLOTH and BATTERY pixels hold fuel, water, ammo, scrap, equipment and charge, wherever they are painted (was a fixed amount per section label). A holed tank holds less.
- **Function** scales with working material: boiler power from engine-work pixels, traction from WHEEL and RUBBER pixels, thrust and rotor force from the ENGINE box, wing lift from the skin, drilling from the drill head.
- **Vehicles** carry what is painted on them: the stock plane now holds 29 gas / 50 shots (was 10 / 30 for every vehicle) and costs 5.8 fuel + 5 ammo to send up. Aircraft are no longer normalised to fly identically — a heavier design stalls faster, an over-armoured one cannot fly.
- The stock train was the calibration target and is unchanged (fuel 203, water 88, ammo 30, scrap 38, equipment 10, same weight).
- Second layer redrawn on three stock units: armoured wagon (real magazine), cargo wagon (SCRAP load inside wooden crates), drone (magazines).
- Unit Forge checklist and the Wiki print the same ledger sheet the simulation uses: weight, build cost, what it holds, stall / cruise / top speed, rotor lift, drilling speed — with errors when a design cannot work.
- Fuel and water levels now show in the art wherever the liquid is painted, not only in FUEL / WATER sections.
- Fixed: Forge bench grid printed five "undefined" boxes for 3-box units.

## 3.41.0 — look & feel, pass 1
- **Pixel-view post-processing:** bloom from fire, lamps, glow and the moon; filmic curve with warm highlights and cool shadows; faint bevel inside each big pixel; vignette and grain. Explosion flash now also shows in the pixel view.
- **Material shading on units:** exposed top edges catch light by material (ALU and glass most, rubber and cloth least), undersides fall into shadow, glass gets a moving glint. Torn metal shows a bright fresh edge. Custom PNG units get the effect at about half strength.
- **Atmosphere:** deeper sky gradient with a horizon glow, moon halo, biome-coloured haze in front of each background layer, drifting ash at three depths (embers in the lava fields).
- All of it is tunable in `CFG`: `fxBloom`, `fxVignette`, `fxBevel`, `fxGrain`, `unitShade`, `haze`, `ashFlecks` (0 = old flat look).

## 3.40.0 — foundation
- **Fixed: diggers.** The tunnel driller re-docked on the first frame after launch (it spawns touching its own rig, which counted as "landed at home"). It must now leave the rig before it can dock again.
- **Fixed: game freeze.** One exception inside a frame stopped the loop forever. The loop now survives and reports `ENGINE ERROR` once per distinct error (also in `G.errors`).
- **Fixed:** driller track pixels (WHEEL material without a wheel) crashed the renderer.
- **Fixed: Forge test range.** Driller / tank / drone units launched a stock attack plane instead of the unit on the workbench; deck-launched test units crashed on the first control tick. Driller tests now use an Excavator Rig.
- **Wiki: new MAP FEATURES tab** — every building/site (with live pixel art), underground feature and biome, read from the `SITES` / `BURIED` / `BIOMES` registries, with counts for the current leg. Buried loot now lives in one `BURIED` registry shared by world gen, the driller and the Wiki.
- Pixel view is now the default; ASCII is a filter on the ` key.
- The starting train includes an Excavator Rig; the launch message shows the driller's real controls.
- Removed the dead v3.37–v3.39.2 "patch layer" scripts (they hooked functions that are not reachable from outside the game closure).
- Project restructured: modular `src/`, zero-dependency build and dev server, docs, git.
