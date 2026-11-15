/* =====================================================================
   MATERIALS — ONE registry. Every unit (wagon, locomotive, plane, tank…) is two layers:
   a TEXTURE layer (what it looks like) and a MATERIAL layer (what each pixel is made of,
   painted with the `pal` colours below). The material decides everything physical.
   To add a material: add one entry here; the arrays below, the Unit Forge palette,
   loose-pixel physics and the ASCII symbols pick it up automatically.
     hp      hit points of one pixel            flam   chance a burning neighbour lights it
     burn    hp/s lost at full fire             decay  fire self-extinguish /s
     rust    corrosion susceptibility           mass   weight of a loose pixel (shrapnel damage, kicks)
     bounce  restitution of a loose pixel       drag   air drag of a loose pixel (leaves float, cloth flutters)
     pal     colour in the material layer (a CODE colour, picked to be far from every other one — not how it looks)
     sym     ASCII symbol when it flies loose
   Flags:
     glow    emits light (halo + full brightness)             see    see-through (crew visible behind it)
     sway    trembles in wind and rain (0–1)                  shed   chance/s a pixel is torn off by wind
     spark   throws sparks when hit                           smoke  colour of the smoke when it burns
   v3.21 flags:
     deflect chance a bullet / shell / bomb / flying debris glances off (no damage, the projectile ricochets)
     drip    while burning it melts and leaks downward (and along the wind) as hot drops that can light what they hit
     leak    a hit pixel loses drops even when not burning (oil from a holed sump)
     smokeK  smoke multiplier while burning (rubber: thick black smoke)
     ignite  chance a hot drop / ember of this material lights a flammable pixel it lands on
     boom    {ch,r,p}: chance and size of a small explosion when the pixel is destroyed (batteries, ammo)
   ===================================================================== */
const MATS=[
{key:'EMPTY'},
{key:'STEEL',   hp:100, flam:.03, burn:6,  decay:.55,rust:1,  mass:1,   bounce:.35, pal:[127,127,127], sym:'#'},
{key:'WOOD',    hp:55,  flam:.55, burn:14, decay:.05,rust:.6, mass:.5,  bounce:.22, pal:[139,90,43],   sym:'='},
{key:'FUEL',    hp:60,  flam:1,   burn:22, decay:0,  rust:.8, mass:.6,  bounce:.05, pal:[255,176,0],   sym:'~'},
{key:'AMMO',    hp:50,  flam:.9,  burn:16, decay:0,  rust:.5, mass:.8,  bounce:.3,  pal:[107,142,35],  sym:'o'},
{key:'GLASS',   hp:22,  flam:0,   burn:0,  decay:9,  rust:0,  mass:.3,  bounce:.15, pal:[79,195,247],  sym:'*', see:1},
{key:'WHEEL',   hp:150, flam:.01, burn:3,  decay:.8, rust:1,  mass:1.4, bounce:.4,  pal:[255,255,255], sym:'0'},
{key:'SCRAP',   hp:70,  flam:.06, burn:6,  decay:.3, rust:1,  mass:1,   bounce:.3,  pal:[181,101,29],  sym:'&'},
{key:'LAMP',    hp:20,  flam:0,   burn:0,  decay:9,  rust:0,  mass:.3,  bounce:.15, pal:[255,255,0],   sym:'+'},
{key:'ARMOR',   hp:230, flam:.01, burn:3,  decay:.8, rust:.7, mass:1.6, bounce:.3,  pal:[46,74,74],    sym:'@'},
{key:'STONE',   hp:90,  flam:0,   burn:0,  decay:9,  rust:0,  mass:1.2, bounce:.28, pal:[150,100,210], sym:':'},
{key:'WATER',   hp:45,  flam:0,   burn:0,  decay:9,  rust:0,  mass:.6,  bounce:.05, pal:[48,112,224],  sym:'~'},
{key:'GLOW',    hp:15,  flam:0,   burn:0,  decay:9,  rust:0,  mass:.3,  bounce:.15, pal:[255,140,200], sym:'*', glow:[255,190,110]},
{key:'LEAF',    hp:8,   flam:.45, burn:20, decay:.2, rust:0,  mass:.08, bounce:.05, pal:[0,200,80],    sym:',', sway:1, shed:.0012, drag:1.4, smoke:[120,130,100]},
{key:'CLOTH',   hp:20,  flam:.7,  burn:18, decay:.1, rust:0,  mass:.15, bounce:.05, pal:[230,200,160], sym:'%', sway:.5, drag:1, smoke:[110,104,96]},
{key:'RUBBER',  hp:80,  flam:.25, burn:5,  decay:.12,rust:0,  mass:.7,  bounce:.85, pal:[70,20,70],    sym:'o', smoke:[18,16,16], deflect:.5, drip:1, smokeK:3, ignite:.12},
{key:'CONCRETE',hp:260, flam:0,   burn:0,  decay:9,  rust:0,  mass:2,   bounce:.15, pal:[200,200,120], sym:'#'},
{key:'WIRE',    hp:30,  flam:.05, burn:4,  decay:.6, rust:.4, mass:.4,  bounce:.3,  pal:[230,40,40],   sym:'-', spark:1},
{key:'ALU',     hp:55,  flam:.02, burn:9,  decay:.5, rust:0,  mass:.35, bounce:.3,  pal:[170,255,210], sym:'=', drip:.35},
{key:'COAL',    hp:40,  flam:.35, burn:2,  decay:0,  rust:0,  mass:.8,  bounce:.1,  pal:[10,10,10],    sym:'.', smoke:[40,38,36], smokeK:1.5, ignite:.2},
{key:'OIL',     hp:35,  flam:.8,  burn:16, decay:.05,rust:0,  mass:.6,  bounce:.05, pal:[90,0,170],    sym:'~', smoke:[26,24,24], smokeK:2, drip:1, leak:.5, ignite:.3},
{key:'KEVLAR',  hp:150, flam:.2,  burn:5,  decay:.3, rust:0,  mass:.45, bounce:.2,  pal:[0,140,170],   sym:'%', deflect:.3, smoke:[60,56,50]},
{key:'BATTERY', hp:25,  flam:.1,  burn:6,  decay:.3, rust:.3, mass:.9,  bounce:.2,  pal:[0,255,255],   sym:'=', spark:1, boom:{ch:.35,r:3.5,p:55}},
];
const M={};MATS.forEach((m,i)=>{m.id=i;M[m.key]=i});
const MATNAME=MATS.map(m=>m.key);
const MAXHP=MATS.map(m=>m.hp||0),FLAM=MATS.map(m=>m.flam||0),BURN=MATS.map(m=>m.burn||0),DECAY=MATS.map(m=>m.decay??9),RUSTS=MATS.map(m=>m.rust||0);
const SEE=MATS.map(m=>m.see?1:0),SWAY=MATS.map(m=>m.sway||0),PDRAG=MATS.map(m=>m.drag||0),GLOWC=MATS.map(m=>m.glow||null);
const DEFLECT=MATS.map(m=>m.deflect||0),DRIP=MATS.map(m=>m.drip||0),SMOKEK=MATS.map(m=>m.smokeK||1),IGNITE=MATS.map(m=>m.ignite||0);
