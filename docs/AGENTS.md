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

## Connecting a language model
The game never holds an API key. An **endpoint agent** is a URL you run; every decision the game POSTs

```json
{ "game": "iron-and-ash", "protocol": 1, "observation": { … }, "actions": { …formats… } }
```

and expects `{"actions":[ … ]}` (or a bare array) back. In the Arena, type a name and the URL and press **Add**; the agent then joins tournaments like any bot.

`tools/agent-proxy.mjs` is a reference endpoint that asks Claude for the actions:

```bash
npm install @anthropic-ai/sdk
```
```bash
ANTHROPIC_API_KEY=… node tools/agent-proxy.mjs
```
Then add `http://localhost:8787/decide` in the Arena. To field several models against each other, run one endpoint per model (different ports, or other providers' SDKs behind the same request/response shape) and add each as its own agent.

From a script or another page you can also drive the game directly: `IronAsh.run({agent:{name:'mine', doc:{…}, decide: async obs => [ …actions… ]}})`.

## Teaching and improving agents
- **Doctrine search** (works today): doctrines are five numbers and a switch. Run `IronAsh.tournament` over a grid or an evolutionary loop of doctrines on 5–10 seeds and keep the best — a few hundred episodes is enough to find strong standing orders per biome.
- **Prompt iteration for models**: keep the endpoint's system prompt in a file, log `(observation, actions, score delta)` per decision in the proxy, and tune against a fixed seed set. Because seeds are reproducible, a change in mean score is a change in play, not luck.
- **Later**: per-biome doctrines, direct control of vehicles, and a headless Node runner so thousands of episodes can run without a browser (needs the simulation freed from the DOM — see ROADMAP).

## Duels — train against train
**Title → ARENA → FIGHT A MIRROR**, or paste a **train card**.

- Two trains face each other on one line. Nobody leaves.
- Your side is your saved train and crew if a run is in progress (otherwise a fresh one). The rival is a mirror of your train, or the train on a card another player sent you (**Copy my train card** puts yours on the clipboard: consist, section upgrade levels and crew count).
- The rival fires a cannon while its CANNON section lives, and rifles in proportion to its crew.
- **A duel is decided by crew.** The rival's crew stand or fall with the train they are in; when 45% or fewer are left they strike their colours. You lose when your crew is dead or you surrender.
- Bots duel too: **RUN DUELS** in the Arena ranks agents by duels won and score against the same mirror.

Not built yet: both trains under independent agent control in the same battle (the rival currently follows one fixed fire plan), and live two-player duels over a network. Train cards make *asynchronous* player-versus-player possible today.
