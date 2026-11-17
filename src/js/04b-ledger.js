/* =====================================================================
   PIXEL LEDGER (v3.42) — the core calculation of Iron & Ash.

   Every pixel of the MATERIAL layer is an asset. A unit is not "a plane with 10 fuel":
   it is whatever its pixels add up to. Four laws, all counted from the pixels that are
   still alive, so damage changes every number the moment a pixel dies:

   1. WEIGHT    mass = Σ material mass per pixel. Tanks weigh less as they empty.
   2. STORAGE   container materials ARE the storage: FUEL pixels are the fuel tank,
                WATER the cistern, AMMO the magazine, SCRAP the hold, CLOTH the kit bags,
                BATTERY the charge. Capacity = pixels × CFG.px.<resource>.
   3. FUNCTION  a section does its job (its role) in proportion to the WORKING material
                painted in it: engine work in ENGINE/BOILER, grip in WHEEL sections,
                bite in the drill head, lift from the skin of the whole body.
   4. BALANCE   nothing is free: every pixel adds weight. Thrust, lift, traction and bite
                are measured against the weight they have to move.

   Yields are calibrated against the built-in units (the "reference designs"): the stock
   locomotive has 100% traction and a +30% boiler, the stock plane flies exactly as before.
   A unit built differently performs differently — that is the whole point.
   ===================================================================== */
const MAT_ASSET={
/*         store: which resource a pixel holds   eng: engine work   lift: skin lift   bite: drilling   grip: traction   cost: build points */
STEEL:   {eng:1,  lift:.35,bite:.6, cost:1},
WOOD:    {lift:.8, cost:.4},
FUEL:    {store:'fuel',  cost:1.2},
AMMO:    {store:'ammo',  cost:2.5},
GLASS:   {lift:.5, cost:.8},
WHEEL:   {grip:1,  bite:.5, cost:1.5},
SCRAP:   {store:'scrap', cost:.5},
LAMP:    {cost:2},
ARMOR:   {eng:.8, lift:.15,bite:1,  cost:3},
STONE:   {bite:.5, cost:.3},
WATER:   {store:'water', cost:.6},
GLOW:    {cost:2},
LEAF:    {cost:.1},
CLOTH:   {store:'equip', lift:1.2, cost:.3},
RUBBER:  {grip:1.5,lift:.3, cost:1},
CONCRETE:{bite:.4, cost:.8},
WIRE:    {eng:1.5, cost:2},
ALU:     {eng:.7, lift:1,   cost:2.2},
COAL:    {eng:3,   cost:.6},
OIL:     {eng:2,   cost:1.2},
KEVLAR:  {lift:1,  cost:3.2},
BATTERY: {store:'charge',eng:1, cost:4},
};
MATS.forEach(m=>Object.assign(m,{store:null,eng:0,lift:m.key==='EMPTY'?0:.2,bite:0,grip:0,cost:m.key==='EMPTY'?0:1},MAT_ASSET[m.key]||{}));
const LMASS=MATS.map(m=>m.mass||0),LSTORE=MATS.map(m=>m.store),LENG=MATS.map(m=>m.eng),LLIFT=MATS.map(m=>m.lift),LBITE=MATS.map(m=>m.bite),LGRIP=MATS.map(m=>m.grip),LCOST=MATS.map(m=>m.cost);
/* station upgrades: a section whose role matches what it stores holds more per pixel, per level */
const LEDGER_UP={FUEL:{fuel:.4},WATER:{water:.5},AMMO:{ammo:.5},SCRAP:{scrap:.5},STORE:{scrap:.5,equip:.5}};
const LEDGER_RES=['fuel','water','ammo','scrap','equip','charge'];

/* one pass over the pixels → the unit's asset sheet (cached on c.as; refreshed by updateRegions whenever pixels change) */
function ledger(c){
const a=c.as||(c.as={store:{},regEng:new Float32Array(8),regGrip:new Float32Array(8),regBite:new Float32Array(8)});
const S=a.store,Y=CFG.px,ro=c.d.roles,lvl=c.lvl;for(const k of LEDGER_RES)S[k]=0;a.regEng.fill(0);a.regGrip.fill(0);a.regBite.fill(0);
let px=0,solid=0,mF=0,mW=0,lift=0,hp=0,cost=0;
for(let k=0;k<c.n;k++){const m=c.mat[k];if(!m)continue;const r=c.reg[k];px++;hp+=c.hp[k];cost+=LCOST[m];lift+=LLIFT[m];
if(m===M.FUEL)mF+=LMASS[m];else if(m===M.WATER)mW+=LMASS[m];else solid+=LMASS[m];
const st=LSTORE[m];if(st){const up=LEDGER_UP[ro[r]];S[st]+=Y[st]*(up&&up[st]?1+up[st]*lvl[r]:1)}
if(LENG[m])a.regEng[r]+=LENG[m];if(LGRIP[m])a.regGrip[r]+=LGRIP[m];if(LBITE[m])a.regBite[r]+=LBITE[m]}
a.px=px;a.hp=hp;a.cost=cost/100;a.lift=lift;a.lvKey=lvl.join();
a.dry=solid+(mF+mW)*Y.emptyTank;a.mFuel=mF*(1-Y.emptyTank);a.mWater=mW*(1-Y.emptyTank);a.full=solid+mF+mW;
let eng=0,grip=0,bite=0,wheels=0;const rc=c.regCount||8;
for(let r=0;r<rc;r++){const R=ro[r];if(R==='ENGINE'||R==='BOILER')eng+=a.regEng[r];if(R==='WHEEL'){grip+=a.regGrip[r];wheels++}if(R==='WEAPON'||R==='RAM')bite+=a.regBite[r]}
a.eng=eng;a.grip=grip;a.bite=bite;a.wheelSecs=wheels;
return a}

/* the reference designs every yield is calibrated against (built once, from the stock units) */
let _lref=null;
function ledgerRef(){if(_lref)return _lref;const R={};
{const c=makeCar('loco',false),a=ledger(c);R.grip=a.grip/Math.max(1,a.wheelSecs);R.boiler=a.eng||1}
for(const vk of ['plane','heli','drone','mole','tank']){if(!CARS[vk])continue;const c=makeCar(vk,false),a=ledger(c);R[vk]={am:a.full*.02,eng:a.eng||1,lift:a.lift||1,px:a.px||1,bite:a.bite||1}}
return _lref=R}

/* WEIGHT of a train unit in train-mass units (the stock train weighs what it always did); liquids count by how full the train is */
function carMass(c){const a=c.as||ledger(c);let ff=1,fw=1;
if(G.caps&&G.res&&(G.state==='play'||G.state==='leg')){ff=G.caps.fuel>0?clamp(G.res.fuel/G.caps.fuel,0,1):0;fw=G.caps.water>0?clamp((G.res.water||0)/G.caps.water,0,1):0}
return Math.max(.05,(a.dry+a.mFuel*ff+a.mWater*fw)/CFG.px.massUnit)}

/* STORAGE of a vehicle (plane, helicopter, drone, driller, tank): gas from FUEL + BATTERY pixels, shots from AMMO pixels */
function vehCaps(x){
if(typeof x==='string'){const key=x+':'+((CUSTOM[x]&&CUSTOM[x].on&&CUSTOM[x].matURL)?CUSTOM[x].matURL.slice(-40):'builtin');G.vcap=G.vcap||{};if(!G.vcap[key]){const p=makeCar(x);G.vcap[key]=vehCaps(p)}return G.vcap[key]}
const a=x.as||ledger(x);
return{gas:Math.max(CFG.px.minGas,Math.round((a.store.fuel+a.store.charge)*CFG.gasPerFuel)),shots:Math.round(a.store.ammo*CFG.airShotsPerAmmo)}}

/* FUNCTION + BALANCE for vehicles: how this design compares with the reference of its kind.
   eng/lift/bite/size are design ratios (1 = the stock unit); mass is live. */
function ledgerRatios(c){const R=ledgerRef()[c.vkind],a=c.as||ledger(c);if(!R)return{eng:1,lift:1,bite:1,size:1,mass:1,ref:null};
return{eng:clamp(a.eng/R.eng,.2,3),lift:clamp(a.lift/R.lift,.2,3),bite:clamp(a.bite/R.bite,.2,3),size:clamp(Math.sqrt(a.px/R.px),.5,2),mass:(a.full*.02)/R.am,ref:R}}

/* human-readable sheet — the Unit Forge checklist and the Wiki both print this, so they can never disagree with the simulation.
   Returns [status,text] pairs: 'o' fine · 'w' warning · 'e' it will not work. */
function ledgerSheet(c){
const a=ledger(c),S=a.store,out=[],air=!!c.vkind||isAirUnit(c.d),f1=v=>(Math.round(v*10)/10).toString();
const mats={};for(let k=0;k<c.n;k++){const m=c.mat[k];if(m)mats[m]=(mats[m]||0)+1}
const top=Object.entries(mats).sort((x,y)=>y[1]-x[1]).slice(0,4).map(([m,n])=>`${MATNAME[m]} ${Math.round(100*n/a.px)}%`).join(' · ');
out.push(['o',`Weight ${(a.full/CFG.px.massUnit).toFixed(2)} t (${(a.dry/CFG.px.massUnit).toFixed(2)} t with empty tanks) · ${a.px} px · ${top}`]);
out.push(['o',`Build cost ${Math.round(a.cost)} pts · armour ${Math.round(a.hp/100)} (total pixel hp ÷ 100)`]);
if(air){const vc=vehCaps(c),noTank=!(S.fuel+S.charge);
out.push([noTank?'e':vc.gas<8?'w':'o',noTank?`No FUEL or BATTERY pixels — only the ${CFG.px.minGas}-gas reserve. Paint a tank into the material layer.`:`Tank ${vc.gas} gas (${f1(vc.gas/CFG.gasPerFuel)} train fuel to fill)${S.charge?' · includes battery charge':''}`]);
{const nb=Math.floor(vc.shots/CFG.airShotsPerAmmo),cost=`(${f1(vc.shots/CFG.airShotsPerAmmo)} train ammo to fill)`;
out.push([vc.shots?'o':'w',!vc.shots?'No AMMO pixels — unarmed.':c.vkind==='mole'?`Magazine ${vc.shots} seismic charges ${cost}`:`Magazine ${vc.shots} shots / ${nb} bomb${nb===1?'':'s'} ${cost}`])}
const q=ledgerRatios(c),A=AIR[c.vkind];
if(q.ref&&A){const am=a.full*.02,g=CFG.airG,pc=x=>Math.round(x*100)+'%';
if(c.vkind==='plane'){const Tmax=q.ref.am*A.accel*q.eng,kL=q.ref.am*g/(A.vTrim*A.vTrim)*q.lift,kD=q.ref.am*A.accel/(A.vMax*A.vMax)*q.size;
const vTop=Math.sqrt(Tmax/kD),vMin=Math.sqrt(am*g/(kL*(1+2.2*CFG.wingAoaMax))),vTrim=Math.sqrt(am*g/kL);
out.push([vTop<vMin*1.08?'e':vTop<vMin*1.3?'w':'o',`Flight: stalls below ${Math.round(vMin)} · cruises ${Math.round(vTrim)} · tops out at ${Math.round(vTop)} px/s`+(vTop<vMin*1.08?' — too heavy for its wing skin and engine: it cannot stay up. Use lighter skin (ALU, CLOTH, KEVLAR) or more engine.':vTop<vMin*1.3?' — barely flies; little margin.':'')]);
out.push(['o',`Engine work ${pc(q.eng)} · wing lift ${pc(q.lift)} · weight ${pc(q.mass)} of the stock plane`])}
else if(c.vkind==='heli'||c.vkind==='drone'){const hov=A.rotor*q.eng/q.mass;
out.push([hov<1.03?'e':hov<1.2?'w':'o',`Rotor lifts ${hov.toFixed(2)}× its own weight`+(hov<1.03?' — it cannot leave the deck. More ENGINE work (STEEL, WIRE, OIL, COAL) or less weight.':hov<1.2?' — sluggish climb.':'')]);
out.push(['o',`Engine work ${pc(q.eng)} · weight ${pc(q.mass)} of the stock ${c.vkind==='heli'?'gunship':'drone'}`])}
else if(c.vkind==='mole'){const k=clamp(Math.sqrt(q.eng*q.bite/q.mass),.4,1.8);
out.push([k<.6?'w':'o',`Drilling speed ${pc(k)} of the stock driller (engine ${pc(q.eng)} · drill bite ${pc(q.bite)} · weight ${pc(q.mass)})`])}
else if(c.vkind==='tank'){const k=clamp(Math.sqrt(q.eng/q.mass),.4,1.8);
out.push([k<.6?'w':'o',`Ground speed ${pc(k)} of the stock tank (engine ${pc(q.eng)} · weight ${pc(q.mass)})`])}}}
else{const R=ledgerRef(),st=[];if(S.fuel+S.charge)st.push(`fuel ${Math.round(S.fuel+S.charge)}`);if(S.water)st.push(`water ${Math.round(S.water)}`);if(S.ammo)st.push(`ammo ${Math.round(S.ammo)}`);if(S.scrap)st.push(`scrap ${Math.round(S.scrap)}`);if(S.equip)st.push(`equipment ${Math.round(S.equip)}`);
out.push(['o',st.length?`Holds ${st.join(' · ')}`:'Holds nothing — no FUEL, WATER, AMMO, SCRAP or CLOTH pixels.']);
if(a.wheelSecs){const tr=.25*a.grip/R.grip;out.push([tr<.5?'w':'o',`Traction ${Math.round(tr*100)}% (grip from WHEEL and RUBBER pixels in ${a.wheelSecs} WHEEL section${a.wheelSecs>1?'s':''})`])}
if(c.d.roles.includes('BOILER')){const b=CFG.px.boilerBoost*a.eng/R.boiler;out.push([b<.1?'w':'o',`Boiler adds +${Math.round(b*100)}% power (engine work from STEEL, COAL, OIL, WIRE in the BOILER section)`])}}
return out}

/* every stock + saved unit on one sheet — used to write docs/BALANCE.md and to check balance after a change */
function ledgerTable(){const R=ledgerRef(),rows=[];
for(const k of Object.keys(CARS)){if(k===FORGE_ID)continue;let c;try{c=makeCar(k)}catch(e){continue}const a=ledger(c),S=a.store,air=isAirUnit(c.d),row={id:k,name:c.d.name,kind:air?(c.d.vkind||c.d.base==='air'&&k||c.d.base):c.d.base,px:a.px,t:+(a.full/CFG.px.massUnit).toFixed(2),cost:Math.round(a.cost),armour:Math.round(a.hp/100)};
if(air){c.vkind=c.d.vkind||(AIR[k]?k:c.d.base);const vc=vehCaps(c),q=ledgerRatios(c);Object.assign(row,{gas:vc.gas,shots:vc.shots,eng:+q.eng.toFixed(2),lift:+q.lift.toFixed(2),bite:+q.bite.toFixed(2),mass:+q.mass.toFixed(2)})}
else Object.assign(row,{fuel:Math.round(S.fuel+S.charge),water:Math.round(S.water),ammo:Math.round(S.ammo),scrap:Math.round(S.scrap),equip:Math.round(S.equip),traction:a.wheelSecs?Math.round(25*a.grip/R.grip):0,boiler:c.d.roles.includes('BOILER')?Math.round(100*CFG.px.boilerBoost*a.eng/R.boiler):0});
rows.push(row)}
return rows}
