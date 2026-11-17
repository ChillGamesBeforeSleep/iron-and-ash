# The Pixel Ledger — core mechanic and balance sheet

**The rule that makes Iron & Ash its own game:** every pixel of a unit's *material layer* is an asset.
A unit is not "a plane with 10 fuel". It is whatever its pixels add up to — and it stops being that the moment the pixels are shot off.

Code: [`src/js/04b-ledger.js`](../src/js/04b-ledger.js) · constants: `CFG.px` in `00-config.js` · live copy of this page in-game: **Wiki → Physics & Rules / Materials / Units**.

---

## The four laws

### 1. Weight — every pixel weighs something
`mass = Σ material mass of every living pixel`. 3450 pixel-mass = 1 t (chosen so the stock 7-wagon train weighs what it always did).
- FUEL and WATER pixels weigh only 35% when the tank is empty — a train low on fuel accelerates better; a full tender is a burden on a climb.
- Weight feeds everything: train acceleration, braking and slopes; an aircraft's stall speed and climb; a driller's speed; how hard a wagon is thrown by a blast.

### 2. Storage — the container *is* the material
Paint FUEL pixels anywhere on a unit and that is a fuel tank. Capacity = living container pixels × yield:

| Material | Holds | Per pixel | Stock example |
|---|---|---|---|
| FUEL | fuel | 0.08 | tender: 1573 px → 126 fuel |
| WATER | water | 0.045 | water tanker: 1683 px → 76 water |
| AMMO | ammo (1 ammo = 1 shell / bomb = 10 gun shots) | 0.08 | armoured wagon: ~375 px → 30 ammo |
| SCRAP | scrap | 0.066 | cargo wagon: ~410 px → 27 scrap |
| CLOTH | equipment (tarps, kit bags) | 0.07 | cargo wagon: 116 px → 8 equipment |
| BATTERY | charge (counts as fuel) | 0.16 | drone: 12 px → its whole 10-gas tank |

- A holed tank holds less; whatever no longer fits is lost. The tank visibly drains in the art wherever the liquid is painted.
- Station upgrades raise the yield of the pixels **inside the upgraded section** (+40% fuel, +50% others per level).
- Vehicles use the same law: a plane's tank is its FUEL pixels (×5 gas per fuel), its magazine is its AMMO pixels. Filling them is paid from the train's stores at the true size — the stock plane costs 5.8 fuel and 5 ammo to send up.

### 3. Function — a section works as hard as the material in it
A section's *role* says what job it does; the *working material* painted in it says how well.

| Job | Counted in | Working material (per pixel) |
|---|---|---|
| **Engine work** → train power, thrust, rotor force, drill and track drive | ENGINE / BOILER sections | COAL 3 · OIL 2 · WIRE 1.5 · STEEL 1 · BATTERY 1 · ARMOR 0.8 · ALU 0.7 |
| **Grip** → traction (pull *and* braking) | WHEEL sections | RUBBER 1.5 · WHEEL 1 |
| **Bite** → drilling speed | the drill head (WEAPON box of a driller) | ARMOR 1 · STEEL 0.6 · WHEEL 0.5 · STONE 0.5 · CONCRETE 0.4 |
| **Lift** → wing lift | the skin of the whole body | CLOTH 1.2 · ALU 1 · KEVLAR 1 · WOOD 0.8 · GLASS 0.5 · STEEL 0.35 · RUBBER 0.3 · ARMOR 0.15 · everything else 0.2 |

### 4. Balance — power against weight
Nothing has a price tag bolted on; the price of every pixel is its weight.
- **Train:** pull = power × traction × boiler; acceleration = pull ÷ total weight. More boiler burns more fuel.
- **Plane:** thrust ∝ engine work, lift ∝ skin lift, drag ∝ size. Stall speed = √(weight ÷ lift). If top speed cannot reach stall speed, it does not fly.
- **Helicopter / drone:** rotor force ∝ engine work. Under 1.0× its own weight it never leaves the deck.
- **Driller:** speed ∝ √(engine × bite ÷ weight). **Tank:** speed ∝ √(engine ÷ weight).

**Calibration.** Every yield is measured against the stock unit of the same kind (the *reference design*): the stock locomotive is exactly 100% traction with a +30% boiler, the stock plane still cruises at 90 px/s and tops out at 135. Build differently and the numbers move.

---

## What this does to design (worked example)

The stock attack plane, and two edits of nothing but its material layer:

| Design | Weight | Engine | Lift | Stalls / cruises / top | Result |
|---|---|---|---|---|---|
| Stock (ALU skin) | 0.13 t | 100% | 100% | 61 / 90 / 135 | flies |
| All ALU repainted as ARMOR | 0.30 t | 114% | 34% | 161 / 236 / 144 | **cannot fly** — stall speed is above top speed |
| Canopy glass repainted as FUEL | 0.14 t | 100% | 96% | 65 / 95 / 135 | flies, 65 gas instead of 29, costs 13 fuel to fill |

Same silhouette, same sections, three different machines. That is the game.

Design tensions the ledger creates on its own:
- **Armour vs everything.** ARMOR is 4.6× the weight of ALU. On a wagon it slows the train; on a plane it grounds it.
- **Range vs risk.** A bigger tank is more range, more weight, and a bigger fire when hit (FUEL burns hardest of all materials).
- **Firepower vs survival.** AMMO pixels are the magazine *and* the thing that cooks off.
- **Electric vs steam.** WIRE + BATTERY is light engine work and a silent tank, but batteries are fragile (25 hp) and explode. COAL is the densest engine work per pixel but only burns slowly and smokes.
- **Rubber wheels** grip 50% better than steel ones but have half the hit points.

---

## Material ledger (per pixel)

| Material | Mass | HP | Holds | Engine | Lift | Grip | Bite | Cost |
|---|---|---|---|---|---|---|---|---|
| STEEL | 1.0 | 100 | — | 1 | 0.35 | — | 0.6 | 1 |
| WOOD | 0.5 | 55 | — | — | 0.8 | — | — | 0.4 |
| FUEL | 0.6 | 60 | 0.08 fuel | — | 0.2 | — | — | 1.2 |
| AMMO | 0.8 | 50 | 0.08 ammo | — | 0.2 | — | — | 2.5 |
| GLASS | 0.3 | 22 | — | — | 0.5 | — | — | 0.8 |
| WHEEL | 1.4 | 150 | — | — | 0.2 | 1 | 0.5 | 1.5 |
| SCRAP | 1.0 | 70 | 0.066 scrap | — | 0.2 | — | — | 0.5 |
| LAMP | 0.3 | 20 | — | — | 0.2 | — | — | 2 |
| ARMOR | 1.6 | 230 | — | 0.8 | 0.15 | — | 1 | 3 |
| STONE | 1.2 | 90 | — | — | 0.2 | — | 0.5 | 0.3 |
| WATER | 0.6 | 45 | 0.045 water | — | 0.2 | — | — | 0.6 |
| GLOW | 0.3 | 15 | — | — | 0.2 | — | — | 2 |
| LEAF | 0.08 | 8 | — | — | 0.2 | — | — | 0.1 |
| CLOTH | 0.15 | 20 | 0.07 equipment | — | 1.2 | — | — | 0.3 |
| RUBBER | 0.7 | 80 | — | — | 0.3 | 1.5 | — | 1 |
| CONCRETE | 2.0 | 260 | — | — | 0.2 | — | 0.4 | 0.8 |
| WIRE | 0.4 | 30 | — | 1.5 | 0.2 | — | — | 2 |
| ALU | 0.35 | 55 | — | 0.7 | 1 | — | — | 2.2 |
| COAL | 0.8 | 40 | — | 3 | 0.2 | — | — | 0.6 |
| OIL | 0.6 | 35 | — | 2 | 0.2 | — | — | 1.2 |
| KEVLAR | 0.45 | 150 | — | — | 1 | — | — | 3.2 |
| BATTERY | 0.9 | 25 | 0.16 charge | 1 | 0.2 | — | — | 4 |

*Cost* is build points per pixel (÷100 per unit). It is not spent anywhere yet — it is the budget number for crafting prices and for fencing in AI-designed units (see [AI_DESIGNER.md](AI_DESIGNER.md)).

---

## Unit balance sheet (stock units, v3.42.0 — measured from the running game)

### Train units
| Unit | Pixels | Weight t | Cost | Armour | Fuel | Water | Ammo | Scrap | Equip | Traction | Boiler |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Locomotive | 4184 | 1.35 | 64 | 5314 | 34 | — | — | — | — | 100% | +30% |
| Fuel tender | 3278 | 0.81 | 38 | 2853 | 126 | — | — | — | — | — | — |
| Water tanker | 3307 | 0.80 | 29 | 2566 | — | 76 | — | — | — | — | — |
| Crew car | 3603 | 0.98 | 37 | 3379 | — | — | — | — | — | — | — |
| Armoured wagon | 2971 | 1.06 | 60 | 4329 | — | — | 30 | 7 | — | — | — |
| Cargo wagon | 3234 | 0.91 | 31 | 3067 | 15 | — | — | 27 | 8 | — | — |
| Excavator rig | 2436 | 0.73 | 30 | 2673 | 18 | — | — | — | — | — | — |
| Flight carrier | 2259 | 0.68 | 25 | 2379 | 12 | — | — | — | — | — | — |
| Helipad | 2237 | 0.71 | 29 | 2625 | 7 | — | — | — | 1 | — | — |
| Crane | 2861 | 0.88 | 32 | 3110 | — | — | — | 9 | — | — | — |

Armour = total pixel hit points ÷ 100.

**Starting train** (loco, tender, water, crew, armoured, cargo, excavator) plus the crew's hand-carried base (10 fuel, 12 water, 4 scrap, 2 equipment):

| | Fuel | Water | Ammo | Scrap | Equip | Weight (tanks full) |
|---|---|---|---|---|---|---|
| Before the ledger (fixed per section label) | 200 | 87 | 30 | 38 | 10 | 6.65 |
| Pixel Ledger | 203 | 88 | 30 | 38 | 10 | 6.64 |

The stock train was the calibration target, so it plays as before. Measured: 0 → 50 px/s in 8 s at full throttle.

### Vehicles
| Unit | Pixels | Weight t | Cost | Armour | Tank (gas) | Magazine (shots) | Fill cost (fuel / ammo) | Was |
|---|---|---|---|---|---|---|---|---|
| Attack plane | 888 | 0.13 | 16 | 510 | 29 | 50 | 5.8 / 5 | 10 gas · 30 shots |
| Gunship | 1007 | 0.23 | 15 | 912 | 37 | 28 | 7.4 / 2.8 | 10 gas · 30 shots |
| Drone | 180 | 0.05 | 4 | 209 | 10 (battery) | 17 | 2 / 1.7 | 10 gas · 30 shots |
| Tunnel driller | 993 | 0.36 | 21 | 1554 | 35 | 45 charges | 7 / 4.5 | 10 gas · 30 charges |
| Raider tank | 1241 | 0.49 | 26 | 2051 | 26 | 48 | 5.2 / 4.8 | 10 gas · 30 shots |

Vehicles used to share one fixed loadout (10 gas, 30 shots, 2 fuel to fill). They now carry what is painted on them, which is roughly three times the endurance at three times the price — the per-second cost of flying or digging is unchanged, sorties are longer. A driller now digs for about three minutes on a tank instead of under one.
Enemy aircraft keep their own difficulty-tuned loadouts (`planeShots`, `heliShots` … in `CFG`); the ledger gives them their weight and flight performance.

### Second layer redrawn
Three stock units had art that did not match their job once pixels counted:
- **Armoured wagon** — the magazine was a small crate (190 AMMO px). It is now a real magazine (~375 px) so it still holds 30.
- **Cargo wagon** — the crates were solid WOOD. They are now wooden frames around a SCRAP load; the load is the storage.
- **Drone** — had no AMMO pixels at all. It now carries two small magazines.

---

## Raiders, ambushes and duels (v3.43)
| Setting (`CFG`) | Value | Meaning |
|---|---|---|
| `raiderRpgChance` / `raiderSniperChance` | .5 / .4 | chance the 2nd / 3rd raider of a party carries a rocket launcher / sniper rifle |
| `raiderRpgRange` / `raiderSniperRange` | 280 / 340 px | rifles: 60 |
| `raiderRpgPow` | 165 | rocket blast power (a cannon shell is 110–120) |
| `raiderSniperDmg` | 70 | per hit on a wagon pixel ring; 42 on a person |
| `raiderRockets` | 4 | rockets per launcher |
| `ambushEvery` | 1700 px | roughly one ambush per leg at difficulty 1 |
| `barricadeHp` | ×4 | a barricade takes about four rams with a plough |
| `duelGunPow` / `duelReload` | 115 / 5.5 s | the rival's cannon |
| `duelBreak` | .5 | the rival strikes its colours at half its crew |

Measured with the built-in bots (single leg, seeded): an undefended train loses ~20 000 pixel-hp to one ambush's rockets in 16 s, so ambushes have to be answered; Quartermaster, Ironclad and Express all finish seed 3. Duels against a mirror last about 6 game-minutes for the stock autopilot.

## Tuning guide
- Everything global is in `CFG.px` (one line in `00-config.js`); per-material numbers are in `MAT_ASSET` at the top of `04b-ledger.js`.
- After any change run `__api.ledgerTable()` in the browser console to regenerate the unit tables above, and check the starting train's totals against the table.
- To make a resource scarcer for everyone, lower its yield. To make one unit carry more, repaint it — do not add an exception.
- **Never add a fixed stat to a unit.** If a number matters, find the pixels it should come from.

## Where this goes next
1. **Locomotion by parts.** The base type (plane, driller…) still picks the control scheme. The ledger already knows what a unit *could* do — next step is one mover that reads it: wheels with grip → drives, rotor work over weight → hovers, skin lift → flies, bite → digs, and new LEG / TRACK / HULL (float) roles for walkers, crawlers and boats.
2. **Per-section power.** A WIRE path from a BATTERY or ENGINE section to a gun or a lamp: cut the wire, lose the function.
3. **Crafting = pixels.** A drone costs the materials it is literally made of (its ledger), paid from scrap and salvage; salvage returns the surviving pixels.
4. **AI design budget.** `ledger(c).cost` is the budget; `ledgerSheet(c)` is the validator that tells a model *why* its design fails.
