# Iron & Ash — instructions for AI coding agents (Claude Code, Cursor, others)

Read `docs/ARCHITECTURE.md` before changing code and `docs/ROADMAP.md` before proposing features. Story canon is `docs/LORE.md`.

## Commands
- `npm run dev` — dev server on :5173 with rebuild + auto-reload
- `npm run build` — must pass before any commit (parses every module, lints CFG keys)

## Hard rules
- Source of truth is `src/`. Never edit `dist/`, `builds/` or anything in `archive/`.
- All `src/js` modules share ONE closure. No imports/exports. Nothing outside the closure can call game functions — do not add extra `<script>` blocks, "patch layers", or `window._hook_*` trampolines (the build rejects them). Change the function where it lives.
- Tunable numbers go in `CFG` (`src/js/00-config.js`).
- Do not invent APIs. Before using a function or field, grep for it in `src/js`. (History: v3.37–v3.39 shipped 1,200 lines hooking `window.moleStep`, `G.train[i]`, `ARTIFACT_CATALOG` — none of which existed.)
- Verify in the browser, not by reading: start a run, exercise the feature, check the console and `__G.errors`. Useful handles: `window.__G` (state), `window.__api` (functions, e.g. `__api.step(1/60)`, `__api.startRun()`, `__api.launchBay(car)`).
- Code style: match the file — dense, semicolons, short names, comments only for the *why*. New modules get a header comment block.
- Bump `src/VERSION` (or `npm run release`) for player-visible changes and add a line to `docs/CHANGELOG.md`.
