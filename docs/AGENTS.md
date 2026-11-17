# Agents, the Arena and Duels

Code: [`src/js/29-agents.js`](../src/js/29-agents.js) · doctrine hooks in `18-loop-autopilot.js` · in-game: **title → ARENA**.

## The idea
Anything that plays Iron & Ash — a scripted bot, a language model, a script in the browser console — plays through one small interface, `window.IronAsh`. An agent does not steer frame by frame. It sets a **doctrine** (standing orders) and the train's own crew carries it out; every few seconds of game time the agent looks again and may change its orders or give a direct one. Bots and models therefore compete on judgment, not reflexes, and a slow model is not at a disadvantage: the game waits for its answer.

## The interface

```js
IronAsh.observe()                 // -> what the agent can see (JSON, below)
IronAsh.act({type:'doctrine', speed:0.8, standoff:150})   // -> one action
IronAsh.score()                   // -> {legs, distance, crew, train, kills, stores, total}
await IronAsh.run({agent:'ironclad', seed:3, legs:1})      // one seeded episode
await IronAsh.tournament({agents:['express','vulture'], seeds:[1,2,3], legs:1})
IronAsh.actions                   // the action list with formats, as text
```

### Observation
```json
{ "t": 412, "state": "play", "leg": 1, "biome": "canyon", "score": 2413,
  "doctrine": {"speed":1,"loot":1,"repairAt":0.55,"ram":"auto","standoff":0,"rescue":true},
  "train":  {"v": 31.2, "toStation": 2157, "weight": 6.5, "traction": 1, "slope": -0.2,
             "cars": [{"i":0,"type":"loco","integrity":96,"fire":0,"down":[],"deck":null}]},
  "stores": {"fuel":85,"water":10,"ammo":36,"scrap":0,"equip":0},
  "caps":   {"fuel":203,"water":88,"ammo":30,"scrap":38,"equip":10,"crew":16,"cannon":true,"workshop":true},
  "crew":   {"alive":5,"hurt":1,"outside":0},
  "threats":{"raiders":[{"dx":240,"weapon":"rpg","dugIn":true,"fleeing":false}],
             "drones":[], "aircraft":[], "obstacle":{"dx":180,"kind":"barricade","hp":720}},
  "sites":  [{"type":"depot","dx":420,"loads":6,"risk":"medium","people":0}],
  "duel":   {"rivalCrew":4,"rivalCrewStart":6,"rivalCars":[{"type":"loco","integrity":71}],"dx":300} }
```
`dx` is pixels ahead of the locomotive's nose (negative = behind); `down` lists the sections of a wagon that are out of action.

### Actions
| Action | Effect |
|---|---|
| `{"type":"doctrine", ...}` | Standing orders, any subset: `speed` 0.2–1 · `loot` 0–3 (0 = never stop for sites) · `repairAt` 0.3–0.9 (repair a section below this) · `ram` `"auto"｜"always"｜"never"` · `standoff` 0–170 px (stop this far short of a defended barricade and shell it) · `rescue` true/false |
| `{"type":"throttle","value":-0.45..1,"seconds":1-30}` | Take the regulator yourself for a while |
| `{"type":"brake","seconds":1-30}` | Hold the brake |
| `{"type":"fire","dx":…,"dy":…}` | One cannon shell at a point ahead of / above the rail |
| `{"type":"loot"}` | Send a party to the site or obstacle beside the stopped train |
| `{"type":"repair"}` · `{"type":"craftAmmo"}` · `{"type":"salvage"}` | 1 scrap on the worst section · scrap → ammo · equipment → scrap |
| `{"type":"launch","car":i}` | Launch the vehicle on that wagon's deck |
| `{"type":"surrender"}` | Duel only |

### Score
`1000 per finished leg + 0.25 per px travelled + 150 per living crew member + 120 per wagon at full health (pro rata) + 20 per kill + stores` (+2500 for a duel won). The same function scores every agent.

### Seeds and fairness
`run({seed})` gives the simulation its own random stream and builds the world from the seed, so two agents on one seed face the same line, the same sites and the same ambush positions. Rendering uses the browser's random numbers and cannot disturb the simulation, so watching a game does not change it.

## Built-in bots
| Bot | Doctrine | Character |
|---|---|---|
| **Quartermaster** | defaults | The stock autopilot: loots what it needs, rams light wreckage, clears barricades by hand |
| **Ironclad** | `speed .8 · repairAt .75 · standoff 150 · ram never` | Careful. Stops short of an ambush, shells the rocket team, then clears the line |
| **Express** | `loot 0 · rescue false · ram always · repairAt .45` | Never stops. Fast when it works; one ruptured tender and it is stranded |
| **Vulture** | `loot 3 · speed .9 · repairAt .6` | Strips every site, takes every survivor |

A bot is nothing but a doctrine: add one to `BOTS` in `29-agents.js` and it appears in the Arena.

Every observation the runner hands an agent also carries `events` (log lines and hits since it last looked, e.g. `"tender (1) hit: 92% → 71%"`) and `lastOrders` (what became of its previous actions, e.g. `"fire: cannon not ready"`).

## Connecting a language model
The game never holds an API key. An **endpoint agent** is a URL you run. Protocol 2 — the game POSTs JSON with a `kind`:

| `kind` | Body | Expected reply |
|---|---|---|
| `start` | `{episode, info:{seed, set:"practice"｜"test"｜"free", round, legs, rulebook}}` | `{ok:true}` (optionally `{doc:{…}}` as opening orders) |
| `decide` | `{episode, observation, actions}` — every 5 s of game time | `{"actions":[…], "why":"…"}` (or a bare array) |
| `end` | `{episode, report}` — the match report | `{ok:true, lesson:"…"}` |

Every body also has `game:"iron-and-ash"`, `protocol:2` and `agent` (its name in the Arena). A body without `kind` is a protocol-1 decide. In the Arena, type a name and the URL and press **Add**; the agent then joins tournaments and leagues like any bot.

`IronAsh.rulebook()` shows the briefing (generated from the registries the Wiki reads, so it is always current); `IronAsh.report()` shows the last match report.

### The reference endpoint, with memory
`tools/agent-proxy.mjs` asks Claude for the orders and gives it a memory:

```bash
npm install @anthropic-ai/sdk
```
```bash
ANTHROPIC_API_KEY=… node tools/agent-proxy.mjs
```
```bash
IRONASH_MOCK=1 node tools/agent-proxy.mjs
```
(the last one runs with no model, no key and no cost — a crude rule plays and "reflects", so you can check the plumbing).

Add `http://localhost:8787/claude-a` in the Arena. The path is the agent's name and its memory folder; `?model=claude-haiku-5-5` picks a model per agent. Two agents with separate memories on one endpoint: `…/claude-a` and `…/claude-b`.

| Memory layer | Where | What it does |
|---|---|---|
| Short-term | in the endpoint, per episode | the last 8 decisions (time, score, orders, reason) go into each prompt, so it does not repeat a move that just failed |
| Playbook | `agent-memory/<name>/playbook.md` | lessons the model wrote itself; put in front of it at the start of every game |
| Skills | `agent-memory/<name>/skills.json` | situation → orders, with tries and average gain |
| Journal | `agent-memory/<name>/journal.jsonl` | one line per game: scores, calls, tokens (never shown to the model) |

After a **practice** game the endpoint makes one extra call: the model reads its match report, its orders during the game and its current playbook, and rewrites the playbook and skills (capped at 4 000 characters). **Test** games read the memory but never write it. Settings: `IRONASH_MODEL`, `IRONASH_MAX_CALLS` (decisions per episode, default 300), `IRONASH_PLAYBOOK_CHARS`, `IRONASH_MEMORY` (folder). The rulebook and playbook are sent as a cached prompt prefix, so each decision pays full price only for the observation.

To field models from other providers, write an endpoint with the same three `kind`s.

From a script or another page you can also drive the game directly: `IronAsh.run({agent:{name:'mine', doc:{…}, start: info => …, decide: async obs => [ …actions… ], end: report => 'lesson'}})`.

## The learning league
**Arena → RUN LEAGUE**, or

```js
await IronAsh.league({agents:['student','quartermaster', IronAsh.endpointAgent('Claude','http://localhost:8787/claude-a')],
                      rounds:5, practice:[1,2], test:[1001,1002], legs:1})
```

Each round, every **learning** agent (Student and endpoint agents) plays the practice seeds and may update its memory from the match reports; then every agent plays the test seeds, which nobody practises on. The table shows the mean **test** score per round — the learning curve. It rises only if what the agent learned carries over to worlds it has not seen; a curve that rises on practice seeds but not on test seeds is memorising maps. Non-learning bots skip practice and give a flat reference line. Ranking: the latest round, plus an **Elo** rating computed from every head-to-head on a test seed (higher score wins). Results are kept in the browser (`ironash.league.v1`).

**Student** is a built-in bot that learns without a model: each practice round it varies one or two of its standing orders and keeps the change only if it beat its best on the same practice seeds. Its lessons ("tried loot 1→0 → 3321 vs 2867, kept") appear under the table. Measured (v3.44, 6 rounds, practice seeds 1–2, test seeds 1001–1002): Student learned "don't stop to loot" in round 4 and "cruise at 0.8" in round 5, and its test score rose from 3826 to 4070 while Quartermaster stayed at 3826. The Elo still had them level, because it counts every round, including the three where both played the same orders. `IronAsh.student()` shows its memory, `IronAsh.forget()` erases it.

**Fairness**: give every competitor the same seeds, rounds, `maxDecisions` (decisions per episode) and memory cap. Episodes are exact: the same agent with the same memory on the same seed plays the same game, so a change in score is a change in play.

**Cost of a model in the league** (rough): one 1-leg game is ~170 decisions at a 5-second period; with the briefing cached, expect a few dollars per game on Claude Opus 5.5 and cents on Claude Haiku 5.5, plus one reflection call per practice game. The endpoint prints tokens per game; `IRONASH_MAX_CALLS` caps the spend.

## Next steps for agents
- Both duel trains commanded by agents (the rival still follows one fixed fire plan).
- Ask the agent only when something happens (ambush sighted, wagon below half, site reached) instead of on a timer — far fewer calls.
- A headless Node runner, so thousands of episodes can run without a browser (needs the simulation freed from the DOM — see ROADMAP).

## Duels — train against train
**Title → ARENA → FIGHT A MIRROR**, or paste a **train card**.

- Two trains face each other on one line. Nobody leaves.
- Your side is your saved train and crew if a run is in progress (otherwise a fresh one). The rival is a mirror of your train, or the train on a card another player sent you (**Copy my train card** puts yours on the clipboard: consist, section upgrade levels and crew count).
- The rival fires a cannon while its CANNON section lives, and rifles in proportion to its crew.
- **A duel is decided by crew.** The rival's crew stand or fall with the train they are in; when 45% or fewer are left they strike their colours. You lose when your crew is dead or you surrender.
- Bots duel too: **RUN DUELS** in the Arena ranks agents by duels won and score against the same mirror.

Not built yet: both trains under independent agent control in the same battle (the rival currently follows one fixed fire plan), and live two-player duels over a network. Train cards make *asynchronous* player-versus-player possible today.
