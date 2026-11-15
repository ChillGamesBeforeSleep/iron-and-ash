# Changelog

Older history (v3.9 – v3.25): `archive/modular-source-v3.25/docs/CHANGELOG.md`.

## 3.40.0 — foundation
- **Fixed: diggers.** The tunnel driller re-docked on the first frame after launch (it spawns touching its own rig, which counted as "landed at home"). It must now leave the rig before it can dock again.
- **Fixed: game freeze.** One exception inside a frame stopped the loop forever. The loop now survives and reports `ENGINE ERROR` once per distinct error (also in `G.errors`).
- **Fixed:** driller track pixels (WHEEL material without a wheel) crashed the renderer.
- **Fixed: Forge test range.** Driller / tank / drone units launched a stock attack plane instead of the unit on the workbench; deck-launched test units crashed on the first control tick. Driller tests now use an Excavator Rig.
- **Wiki: new MAP FEATURES tab** — every building/site (with live pixel art), underground feature and biome, read from the  /  /  registries, with counts for the current leg. Buried loot now lives in one  registry shared by world gen, the driller and the Wiki.
- Pixel view is now the default; ASCII is a filter on the ` key.
- The starting train includes an Excavator Rig; the launch message shows the driller's real controls.
- Removed the dead v3.37–v3.39.2 "patch layer" scripts (they hooked functions that are not reachable from outside the game closure).
- Project restructured: modular `src/`, zero-dependency build and dev server, docs, git.
