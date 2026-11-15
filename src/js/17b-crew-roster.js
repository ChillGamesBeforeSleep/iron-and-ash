/* =====================================================================
   CREW ROSTER (v3.13) — every crew member is a person, not a number.
   Each has: a name, health 0–10 (10 = fit, below 6 = injured, 0 = dead),
   a 10-slot pack, a place on the train (cab / seat / roof / deck / out)
   and a job. They drink from their own pack and only heal while it holds
   water. Looters carry loot home in their packs and walk it along the roofs
   to the storage wagons. Crew fetch water at the tanker, throw it on fires,
   bring the driver a flask, and riflemen climb up to fight raiders.
   One crew member always sits in the locomotive cab: no driver, no driving.
   G.res.crew / G.res.hurt / G.away stay as derived counts, so older code
   (and older tests) keep working; setting them directly adds/removes/injures people.
   ===================================================================== */
const PACK=10, VEHICLE_PACK=10, TRAIN_STASH_SLOTS=20;
const WPN_ORDER=['seeker','rpg','sniper','gun','grenade','molotov','pistol','spear'];
const ITEMS={
water:{name:'Water',ch:'~',stack:1,col:'#7cb8ff',res:'water'},
scrap:{name:'Scrap',ch:'#',stack:2,col:'#c9a36a',res:'scrap'},
fuel:{name:'Fuel can',ch:'f',stack:10,col:'#e0a040',res:'fuel'},
ammo:{name:'Ammo',ch:'a',stack:6,col:'#e8d070',res:'ammo'},
equip:{name:'Equipment',ch:'e',stack:1,col:'#b8c890',res:'equip'},
seeker:{name:'Seeker launcher',ch:'L',stack:1,col:'#ff58a8',gear:1,wpn:1,maxShots:1,cost:{fuel:1,ammo:1,scrap:1,equip:1},range:225,dmg:110,sp:165,cool:[2.4,3.2]},
rpg:{name:'Rocket launcher',ch:'R',stack:1,col:'#ff9850',gear:1,wpn:1,maxShots:2,cost:{ammo:1,fuel:1,scrap:1},range:155,dmg:95,sp:215,cool:[2.1,2.9]},
sniper:{name:'Sniper rifle',ch:'S',stack:1,col:'#70f0e0',gear:1,wpn:1,maxShots:5,cost:{ammo:1,equip:1},range:185,dmg:55,sp:350,cool:[1.7,2.4]},
gun:{name:'Rifle',ch:'r',stack:1,col:'#f0e8d2',gear:1,wpn:1,maxShots:15,cost:{ammo:1,scrap:1},range:95,dmg:16,sp:210,cool:[.85,1.35]},
grenade:{name:'Grenade',ch:'g',stack:1,col:'#90d870',gear:1,wpn:1,maxShots:1,cost:{ammo:1,fuel:1},range:68,dmg:65,sp:120,cool:[1.5,2.2]},
molotov:{name:'Molotov',ch:'m',stack:1,col:'#ff7830',gear:1,wpn:1,maxShots:1,cost:{fuel:1},range:62,dmg:26,sp:115,cool:[1.4,2.0]},
pistol:{name:'Pistol',ch:'p',stack:1,col:'#e8b070',gear:1,wpn:1,maxShots:10,cost:{ammo:1},range:65,dmg:12,sp:185,cool:[.7,1.1]},
spear:{name:'Spear',ch:'/',stack:1,col:'#d8c8a0',gear:1,wpn:1,maxShots:6,cost:{scrap:1},range:38,dmg:28,sp:130,cool:[1.6,2.2]},
pick:{name:'Pickaxe',ch:'T',stack:1,col:'#c0b8a8',gear:1,maxShots:12,cost:{scrap:1}},
armor:{name:'Armour',ch:'A',stack:1,col:'#a0b0c0',gear:1,maxShots:15,cost:{scrap:2,equip:1}},
};
const RES_ROLE={scrap:['STORE','SCRAP'],equip:['STORE'],ammo:['AMMO'],fuel:['FUEL'],water:['WATER']};
const SITE_GEAR={armory:{sniper:.14,rpg:.1,grenade:.2,gun:.22,armor:.14},bunker:{seeker:.1,rpg:.12,sniper:.12,gun:.14,armor:.12,pick:.08},depot:{molotov:.22,grenade:.12},ruin:{pick:.08,spear:.09,molotov:.1},camp:{spear:.15,pistol:.12,molotov:.08},yard:{pick:.12,grenade:.08}};
const CREW_NAMES=['Ada','Bo','Cass','Dina','Emil','Faye','Gus','Hana','Ivo','Juno','Kai','Lena','Milo','Nora','Oskar','Pia','Rudi','Sana','Teo','Una','Vik','Wren','Yara','Zed'];
const START_KITS=[[['water',2],['pistol',1]],[['water',2],['gun',1]],[['water',2],['sniper',1]],[['water',2],['pick',1],['molotov',1]],[['water',2],['spear',1],['grenade',1]]];
let crewIds=0;
function makeGearItem(k,meta){
const I=ITEMS[k]||{};const it=Object.assign({},meta||{},{k,n:1});
if(I.gear&&it.shots===undefined)it.shots=I.maxShots||1;
return it}
function canPayCost(m,cost,allowTrain){
if(!cost)return false;
for(const r in cost){
const need=cost[r],inPack=invCount(m,r)-(r==='water'?CFG.flasks:held(m,r));
const inTrain=allowTrain?Math.max(0,(G.res[r]||0)-(r==='fuel'?12:r==='ammo'?CFG.forgeReserve:r==='scrap'?2:0)):0;
if(inPack+inTrain<need-1e-6)return false;
}
return true}
function payCost(m,cost,allowTrain){
if(!canPayCost(m,cost,allowTrain))return false;
for(const r in cost){
let need=cost[r];
const takePack=Math.min(need,Math.max(0,invCount(m,r)-(r==='water'?CFG.flasks:held(m,r))));
if(takePack>0){invTake(m,r,takePack);need-=takePack}
if(need>0&&allowTrain)G.res[r]=Math.max(0,(G.res[r]||0)-need);
}
return true}
function useGear(m,k){
const it=m&&m.inv&&m.inv.find(x=>x.k===k);if(!it)return false;
const I=ITEMS[k]||{};it.shots=(it.shots??I.maxShots??1)-1;
if(it.shots<=0){
const aboard=m.where!=='out';
if(I.cost&&payCost(m,I.cost,aboard)){it.shots=I.maxShots||1;log(`${m.name} reloads/crafts ${I.name.toLowerCase()} (${it.shots} uses)`,'good')}
else{const ix=m.inv.indexOf(it);if(ix>=0)m.inv.splice(ix,1);log(`${m.name}'s ${I.name.toLowerCase()} is expended`,'warn')}
}
G.crewHtml='';return true}
function invCount(m,k){let s=0;for(const it of m.inv)if(it.k===k)s+=it.n;return s}
function has(m,k){return m.inv.some(it=>it.k===k)}
function invAdd(m,k,n){
const I=ITEMS[k];if(!I)return 0;const st=I.stack;let left=n;
if(!I.gear){for(const it of m.inv){if(left<=1e-6)break;if(it.k===k&&it.n<st){const a=Math.min(st-it.n,left);it.n+=a;left-=a}}}
while(left>1e-6&&m.inv.length<PACK){if(I.gear){m.inv.push(makeGearItem(k));left-=1}else{const a=Math.min(st,left);m.inv.push({k,n:a});left-=a}}
return n-left}
function invTake(m,k,n){let got=0;for(let i=m.inv.length-1;i>=0&&got<n-1e-9;i--){const it=m.inv[i];if(it.k!==k)continue;const a=Math.min(it.n,n-got);it.n-=a;got+=a;if(it.n<=1e-6)m.inv.splice(i,1)}return got}
function inventoryAddTo(inv,k,n,slots,meta){
if(!ITEMS[k]||!Array.isArray(inv)||!Number.isFinite(+n)||n<=0)return 0;
slots=slots||PACK;const st=ITEMS[k].stack;let left=n;
for(const it of inv){if(left<=1e-6)break;if(it.k===k&&it.n<st&&(!ITEMS[k].gear)){const a=Math.min(st-it.n,left);it.n+=a;left-=a}}
while(left>1e-6&&inv.length<slots){const a=Math.min(st,left),item=ITEMS[k].gear?makeGearItem(k,meta):Object.assign({},meta||{},{k,n:a});inv.push(item);left-=a;if(ITEMS[k].gear)left=0}
return n-left;
}
function transferPackToVehicle(m,c){
c.inv=c.inv||[];if((c.scrap||0)<CFG.airScrapCap){const gs=invTake(m,'scrap',CFG.airScrapCap-Math.floor(c.scrap||0));c.scrap=Math.min(CFG.airScrapCap,(c.scrap||0)+gs)}const keepWpn=weaponOf(m),seenGear=new Set();
for(const it of m.inv.slice()){
const I=ITEMS[it.k];
if(it.k==='water'&&invCount(m,'water')<=CFG.flasks)continue;
if(I.gear){
const isWpn=!!I.wpn;
if((isWpn&&it.k===keepWpn&&!seenGear.has('wpn'))||(!isWpn&&!seenGear.has(it.k))){
seenGear.add(isWpn?'wpn':it.k);continue;
}
}
const send=it.k==='water'?Math.max(0,invCount(m,'water')-CFG.flasks):it.n;
if(send<=0)continue;
const got=inventoryAddTo(c.inv,it.k,send,VEHICLE_PACK,it);
if(got>0){it.n-=got;if(it.n<=1e-6)m.inv.splice(m.inv.indexOf(it),1)}
}
}
function dropGroundItem(x,it,what){
if(!it||!G.world||!Array.isArray(G.salvage))return;
const wx=clamp(Number.isFinite(+x)?+x:trainMid(),0,G.world.W-1);
if(ITEMS[it.k]?.gear)G.salvage.push({x:wx,items:{},gear:[Object.assign({},it)],what:what||'discarded gear'});
else G.salvage.push({x:wx,items:{[it.k]:it.n},gear:[],what:what||'discarded supplies'});
if(G.salvage.length>24)G.salvage.shift();
}
function dropVehicleCargo(c){
if(!c||!c.inv||!c.inv.length)return;
for(const it of c.inv.slice())dropGroundItem(c.cxw??c.ax,it,'vehicle cargo');
c.inv=[];
}
function discardInventorySlot(kind,id,slot){
if(kind==='crew'){
const active=G.piloting&&G.vehicles&&G.vehicles.includes(G.piloting)?G.piloting:null;
const m=G.crew.find(q=>q.id===+id)||(active?[active.pilot,...(active.passengers||[])].find(q=>q&&q.id===+id):null);if(!m||!m.inv[slot])return;
const it=m.inv[slot];
if(active&&(active.pilot===m||(active.passengers||[]).includes(m))){
active.inv=active.inv||[];const got=inventoryAddTo(active.inv,it.k,it.n,VEHICLE_PACK,it);
if(got>0){it.n-=got;if(it.n<=1e-6)m.inv.splice(m.inv.indexOf(it),1);log(`${m.name} stows ${gearLabel(it)} in aircraft cargo (${active.inv.length}/${VEHICLE_PACK})`,'good')}else log('Aircraft cargo is full — remove an item first','warn');
G.hudSig='';G.crewHtml='';return;
}
if(m.where==='out'){
const e=G.exp;
if(e&&e.members.includes(m)){e.resolved=true;e.loot=null;for(const q of e.members)if(q.alive&&q.state!=='in')q.state='back';log(`${m.name}'s party recalled — bringing their packs back to storage`,'warn');return}
log(`${m.name} is outside and cannot be redirected right now`,'warn');return;
}
if(ITEMS[it.k].gear){
if((G.stash||[]).length>=TRAIN_STASH_SLOTS){log('Train equipment stash is full — discard an item first','warn');return}
giveTask(m,{kind:'stashSelected',k:it.k,item:it});log(`${m.name} is taking ${gearLabel(it)} to the train equipment stash`,'');G.crewHtml='';return;
}
const available=it.k==='water'?it.n:Math.max(0,it.n-held(m,it.k));
if(available<=1e-6){log('That item is reserved for the crew member’s current task','warn');return}
giveTask(m,{kind:'stowSelected',k:it.k,n:available,item:it});log(`${m.name} is taking ${it.k} to train storage`,'');G.crewHtml='';return;
}
if(kind==='vehicle'){
const c=G.piloting;if(!c||!c.inv||!c.inv[slot])return;const it=c.inv.splice(slot,1)[0];dropGroundItem(c.cxw??c.ax,it,'discarded vehicle cargo');log(`${c.d.name} drops ${gearLabel(it)}${it.n>1?` ×${Math.round(it.n)}`:''}`,'warn');G.hudSig='';G.crewHtml='';return;
}
if(kind==='stash'){
const it=G.stash&&G.stash[slot];if(!it)return;G.stash.splice(slot,1);dropGroundItem(G.train.cars[0].ax,it,'discarded train gear');log(`Dropped ${gearLabel(it)} from the train stash`,'warn');G.crewHtml='';return;
}
if(kind==='resource'){
const k=String(id);if(!['water','scrap','fuel','ammo','equip'].includes(k)||(G.res[k]||0)<1)return;
G.res[k]=Math.max(0,G.res[k]-1);dropGroundItem(G.train.cars[0].ax,{k,n:1},'discarded train stores');log(`Dropped 1 ${k} from train storage`,'warn');G.crewHtml='';return;
}
}
function spareWater(m){return Math.max(0,invCount(m,'water')-CFG.flasks)}
function held(m,k){return (m.hold&&m.hold[k])||0}
function invGoods(m){return Object.keys(ITEMS).some(k=>k!=='water'&&!ITEMS[k].gear&&invCount(m,k)-held(m,k)>=1)||spareWater(m)>=1}
function dropGoods(m){const n=m.inv.length;m.inv=m.inv.filter(it=>ITEMS[it.k].gear||it.k==='water');return n-m.inv.length}
function gearCount(m){return m.inv.filter(it=>ITEMS[it.k].gear).length}
function hurtHp(){return (CFG.bodyHurtAt-CFG.bodyDeadAt)/(1-CFG.bodyDeadAt)*10}
function bodyFromHp(m){const k=CFG.bodyDeadAt+(1-CFG.bodyDeadAt)*clamp(m.hp,0,10)/10;m.body=newBody().fill(CFG.bodyHP*k)}
function hpFromBody(m){return clamp((bodyInt(m)-CFG.bodyDeadAt)/(1-CFG.bodyDeadAt)*10,0,10)}
function newMember(o){
o=o||{};const id=++crewIds,nm=o.name||CREW_NAMES[(id-1)%CREW_NAMES.length]+(id>CREW_NAMES.length?' '+Math.ceil(id/CREW_NAMES.length):'');
const m={id,name:nm,hp:o.hp??10,xp:o.xp||0,lvl:o.lvl||1,inv:[],where:'seat',car:null,task:null,u:0,x:0,gy:0,ph:rand(0,6),alive:true,hurt:false,body:null,dir:1};
for(const [k,n] of (o.kit||[]))invAdd(m,k,n);
if(o.inv)for(const it of o.inv)if(ITEMS[it.k])m.inv.push(ITEMS[it.k].gear?makeGearItem(it.k,it):{k:it.k,n:it.n});
return m}
function crewCount(){G.res.crew=G.crew.length;G._crewN=G.res.crew}
function addCrew(o){if(!G.crew)G.crew=[];const m=newMember(o);G.crew.push(m);crewCount();return m}
function initCrew(n){G.crew=[];crewIds=0;G.driverId=null;for(let i=0;i<n;i++)addCrew({kit:START_KITS[i%START_KITS.length]});crewSync()}
function killMember(m){if(!m)return;if(G.cameraPilot===m)G.cameraPilot=null;m.alive=false;const i=G.crew.indexOf(m);if(i>=0){G.crew.splice(i,1);G.tel.crewLost++}if(G.driverId===m.id)G.driverId=null;crewCount()}
function carById(id){return id==null?null:G.train.cars.find(c=>c.id===id)||null}
function crewSync(){
if(!G.crew)G.crew=[];
if(G.res.crew!==G._crewN){let d=(G.res.crew|0)-G.crew.length;
while(d>0){addCrew({kit:[['water',2]]});d--}
while(d<0){const pool=G.crew.filter(m=>m.where!=='out');const v=pool.filter(m=>m.id!==G.driverId).pop()||pool.pop();if(!v)break;G.crew.splice(G.crew.indexOf(v),1);d++}
crewCount()}
const hh=hurtHp();let away=0,hurt=0;
for(const m of G.crew){if(m.where==='out'){away++;continue}if(m.body)m.hp=hpFromBody(m);m.hurt=m.hp<hh;if(m.hurt)hurt++}
if(typeof G.res.hurt==='number'&&G.res.hurt!==G._hurtN&&G._hurtN!==undefined){let d=G.res.hurt-hurt;
for(const m of G.crew){if(!d)break;if(m.where==='out'||m.body)continue;
if(d>0&&!m.hurt){m.hp=Math.max(0,hh-2);m.hurt=true;hurt++;d--}else if(d<0&&m.hurt){m.hp=10;m.hurt=false;hurt--;d++}}}
G.away=away;G.res.hurt=hurt;G._hurtN=hurt;
}
function crewOnTrain(){crewSync();return G.crew.length-G.away}
function healthyAboard(){crewSync();const hh=hurtHp();return G.crew.filter(m=>m.where!=='out'&&m.hp>=hh).length}
function partyCands(fromCar){
crewSync();const hh=hurtHp();
const c=G.crew.filter(m=>m.where!=='out'&&m.where!=='cab'&&m.id!==G.driverId&&m.hp>=hh);
const sc=m=>(fromCar&&m.car===fromCar.id&&m.where==='seat'?0:m.where==='deck'?2:1)*10-gearCount(m);
return c.sort((a,b)=>sc(a)-sc(b))}
function seatCrew(cap,cars,dry){
crewSync();const aboard=G.crew.filter(m=>m.where!=='out');
if(dry){cap.driver=cap.cab&&aboard.length>0;return}
for(const c of cars)c.occ.fill(0);
let d=null;
if(cap.cab){d=aboard.find(m=>m.id===G.driverId)||null;
const free=aboard.filter(m=>m!==d&&(m.where==='seat'||m.where==='roof')&&!m.task).sort((a,b)=>(a.hurt-b.hurt)||(gearCount(a)-gearCount(b)));
if(!d)d=free[0]||aboard.find(m=>m.where==='deck')||aboard[0]||null;
else if(d.hurt&&free[0]&&!free[0].hurt)d=free[0];}
for(const m of aboard)if(m.where==='cab'&&m!==d)m.where='seat';
if(d){if(d.where==='deck'){d.task=null;d.body=null}if(d.where!=='cab')d.where='cab';d.car=null;G.driverId=d.id}else G.driverId=null;
cap.driver=!!d;
if(d){for(const c of cars){const r=c.d.roles.indexOf('CAB');if(r>=0&&c.alive[r]){c.occ[0]=1;d.car=c.id;break}}}
const sit=aboard.filter(m=>m.where==='seat'||m.where==='roof').sort((a,b)=>b.hurt-a.hurt);let i=0;
const box={};
const boxes=[];for(const c of cars)for(let r=0;r<4;r++){const ro=c.d.roles[r];if((ro==='SEATS'||ro==='MEDIC')&&c.alive[r])boxes.push([c,r,ro])}
boxes.sort((a,b)=>(b[2]==='MEDIC')-(a[2]==='MEDIC'));
for(const [c,r,ro] of boxes){const t=2+(ro==='SEATS'?c.lvl[r]:0),key=c.id+':'+r;
for(let s=0;s<t&&i<sit.length;s++,i++){const m=sit[i];m.where='seat';m.car=c.id;m.box=key;m.medicBox=ro==='MEDIC';box[key]=(box[key]||0)+1;if(s<2)c.occ[1+r*2+s]=1}}
if(d&&i<sit.length){for(const c of cars){const r=c.d.roles.indexOf('CAB');if(r>=0&&c.alive[r]){const m=sit[i++];m.where='seat';m.car=c.id;m.box='cab';m.medicBox=false;break}}}
let roof=0;for(;i<sit.length;i++){sit[i].where='roof';sit[i].car=null;sit[i].box=null;roof++}
for(const m of aboard)m.pair=m.where==='seat'&&m.box&&m.box!=='cab'&&box[m.box]>=2;
if(d){d.box='cab';d.pair=false}
G.riders=roof;
}
function crewReset(){
if(!G.crew)G.crew=[];for(const m of G.crew){if(m.body)m.hp=hpFromBody(m);m.body=null;m.task=null;m.where='seat';m.state=null;m.alive=true;m.walkS=0}crewSync()}
function trainFront(){const L=G.train.cars[0];return L.x+L.w/2}
function trainLen(){const c=G.train.cars,l=c[c.length-1];return trainFront()-(l.x-l.w/2)}
function uOf(wx){return trainFront()-wx}
function roofAt(x){for(const c of G.train.cars){if(Math.abs(x-c.ax)>c.w/2+CFG.gap)continue;const l=toLocal(c,x,c.ay-c.h*.5),i=clamp(l[0],0,c.w);return toWorld(c,i,c.d.split)[1]}return null}
function coverAt(wx,wy){const h=carAtPoint(wx,wy);if(!h)return 0;const c=h[0],k=h[1];if(c.fire[k]>0)return 0;return SEE[c.mat[k]]?.5:1}
function insideVisible(wx,wy){const h=carAtPoint(wx,wy);return !h||SEE[h[0].mat[h[1]]]||h[0].fire[h[1]]>0}
function baseY(m,wx){return m.where==='deck'||m.state==='chute'?m.gy:groundY(wx??m.x)}
function regionU(c,r){return uOf(toWorld(c,(r%4+.5)*c.w/4,0)[0])}
function toDeck(m){
if(m.where==='deck')return;const cab=cabCar(),c=carById(m.car)||(cab&&cab[0])||G.train.cars[0];
m.where='deck';m.u=clamp(uOf(c.ax+rand(-8,8)),2,trainLen()-2);m.x=trainFront()-m.u;const y=roofAt(m.x);m.gy=y??(c.ay-c.h);if(!m.body)bodyFromHp(m)}
function boardMember(m,c){
m.where='deck';m.task=null;m.state='in';m.u=clamp(uOf(m.x),2,trainLen()-2);m.x=trainFront()-m.u;const y=roofAt(m.x);m.gy=y??(c.ay-c.h);if(!m.body)bodyFromHp(m)}
function sitDown(m){if(m.body)m.hp=hpFromBody(m);m.body=null;m.task=null;m.where='seat';m.walkS=0}
function walkTo(m,u,dt,run){
const d=u-m.u,sp=CFG.deckWalk*(m.hurt?.5:run||1)*dt;
if(Math.abs(d)<=Math.max(1.2,sp)){m.u=u;m.walkS=0}else{m.u+=Math.sign(d)*sp;m.dir=-Math.sign(d);m.ph+=dt*(m.hurt?4:9);m.walkS=Math.sin(m.ph)>0?1:0}
m.u=clamp(m.u,1,trainLen()-1);m.x=trainFront()-m.u;const y=roofAt(m.x);if(y!=null)m.gy=y;
return Math.abs(u-m.u)<=1.3}
function seatCarNear(m){let best=null,bd=1e9;for(const c of G.train.cars){if(!c.d.roles.some((ro,r)=>(ro==='SEATS'||ro==='MEDIC')&&c.alive[r]))continue;const d=Math.abs(c.ax-m.x);if(d<bd){bd=d;best=c}}return best}
function waterSpot(){let best=null;for(const c of G.train.cars){c.d.roles.forEach((ro,r)=>{if(ro==='WATER'&&c.alive[r]&&!best)best=[c,r]})}return best||cabCar()}
function depositTarget(m,wanted){
for(const it of m.inv){const k=it.k;if(wanted&&k!==wanted)continue;if(ITEMS[k].gear)continue;if(k==='water'&&spareWater(m)<1&&wanted!=='water')continue;
if((G.res[k]||0)>=(G.caps[k]||0)-1e-6)continue;
let best=null,bd=1e9;for(const c of G.train.cars)c.d.roles.forEach((ro,r)=>{const pi=RES_ROLE[k].indexOf(ro);if(pi>=0&&c.alive[r]){const d=pi*1e4+Math.abs(regionU(c,r)-m.u);if(d<bd){bd=d;best=[c,r]}}});
if(!best&&(CFG.cap.base[k]||0)>0){const cab=cabCar();if(cab)best=cab}
if(best)return{k,c:best[0],r:best[1]}}
return null}
function stowNow(m){
if(m.where==='out'&&m.state!=='fly')return 0;let n=0;
for(const k of Object.keys(ITEMS)){if(ITEMS[k].gear)continue;const carry=k==='water'?spareWater(m):invCount(m,k)-held(m,k);if(carry<=0)continue;
const room=Math.max(0,(G.caps[k]||0)-(G.res[k]||0)),put=k==='fuel'||k==='water'?Math.min(carry,room):Math.min(Math.floor(carry),Math.floor(room+1e-6));
if(put>0){invTake(m,k,put);G.res[k]=(G.res[k]||0)+put;if(k==='scrap')G.tel.scrapIn+=put;if(k==='fuel')G.tel.fuelIn.carried=(G.tel.fuelIn.carried||0)+put;G.tel.stowed=(G.tel.stowed||0)+put;n+=put}}
if(n)m.fullMsg=0;return n}
function giveTask(m,t){toDeck(m);m.task=Object.assign({stage:0,t:0},t)}
function crewTick(dt){
if(!G.crew||!G.train)return;crewSync();
const medic=G.caps.medic||0,hh=hurtHp();
for(const m of G.crew){
const out=m.where==='out',resting=!out&&m.where!=='deck',w=invCount(m,'water');
let drink=CFG.drink*(out&&m.state==='work'?CFG.drinkWork:1);
if(resting&&m.hp<10&&w>0&&m.pair){const was=m.hp<hh;m.hp=Math.min(10,m.hp+(1/CFG.healBase+(m.medicBox?medic:0)/CFG.healMedic)*dt);drink+=CFG.healDrink;
if(was&&m.hp>=hh){m.hurt=false;log(`${m.name} is back on their feet${medic?' (medic)':''}`,'good')}}
else if(resting&&m.hp<hh&&w<=0&&!m.dryMsg){m.dryMsg=1;log(`${m.name} is injured and has no water — they can't heal`,'warn')}
if(w>0){invTake(m,'water',Math.min(w,drink*dt));m.dry=0;m.dryMsg=0}else m.dry=(m.dry||0)+dt;
}
crewBrain(dt);
for(const m of G.crew.slice())if(m.where==='deck')deckStep(m,dt);
}
function crewBrain(dt){
G.brainT=(G.brainT||0)-dt;if(G.brainT>0)return;G.brainT=.35;
const aboard=G.crew.filter(m=>m.where!=='out');if(!aboard.length)return;
const idle=m=>(m.where==='seat'||m.where==='roof'||m.where==='deck')&&!m.task,
danger=crewDanger(),ws=waterSpot(),tank=G.res.water||0,busy=k=>G.crew.filter(m=>m.task&&m.task.kind===k).length;
if(danger)for(const m of aboard)if(m.task&&(m.task.kind==='stow'||(m.task.kind==='water'&&!m.task.for&&invCount(m,'water')>0)))m.task=null;
for(const m of aboard)if(!m.task&&invGoods(m)){const t=depositTarget(m);if(t){if(m.where==='cab')stowNow(m);else giveTask(m,{kind:'stow'});m.stuckT=0}else{if(!m.fullMsg){m.fullMsg=1;log(`${m.name} keeps the loot in their pack — no storage room for it`,'warn')}
m.stuckT=(m.stuckT||0)+.35;if(m.stuckT>CFG.dumpAfter){m.stuckT=0;m.fullMsg=0;const n=dropGoods(m);if(n)log(`${m.name} dumps ${n} slot${n>1?'s':''} of loot nobody has room for`,'warn')}}}
G.stash=G.stash||[];
for(const m of aboard){const keep=weaponOf(m),seen=new Set();for(const it of m.inv.slice()){const I=ITEMS[it.k];if(!I.gear)continue;
const isW=!!I.wpn,ky=isW?'wpn':it.k,spare=(isW&&it.k!==keep)||seen.has(ky);
if(spare){m.inv.splice(m.inv.indexOf(it),1);if(G.stash.length<TRAIN_STASH_SLOTS){G.stash.push(it);log(`${m.name} leaves a ${gearLabel(it)} in the train chest`,'')}else{dropGroundItem(m.x,it,'stash overflow');log(`Train chest full — ${gearLabel(it)} dropped nearby`,'warn')}}else seen.add(ky)}}
for(const m of aboard){if(!idle(m)||m.hurt||m.where==='cab'||m.inv.length>=PACK)continue;
const wpn=weaponOf(m),bestRank=wpn?WPN_ORDER.indexOf(wpn):99;
const wantWpn=G.stash.some(x=>ITEMS[x.k]?.wpn&&WPN_ORDER.indexOf(x.k)<bestRank);
const wantGear=G.stash.some(x=>(x.k==='armor'&&!has(m,'armor'))||(x.k==='pick'&&!has(m,'pick')));
if(wantWpn||wantGear){giveTask(m,{kind:'takeGear'});continue}
if(!wpn&&!G.crew.some(x=>x.task&&x.task.kind==='forge')){
const craftOrder=['seeker','sniper','rpg','gun','grenade','molotov','pistol','spear'].find(k=>canPayCost(m,ITEMS[k].cost,true)&&storeSpot(Object.keys(ITEMS[k].cost)[0],m));
if(craftOrder)giveTask(m,{kind:'forge',w:craftOrder});
}}
const burning=G.train.cars.reduce((a,c)=>a+(c.fires&&!pumpCovers(c)?c.fires:0),0);
if(burning){let n=busy('fire');const want=Math.min(CFG.fireCrew,Math.ceil(burning/35));
for(const m of aboard){if(n>=want)break;if(!idle(m)||m.hurt)continue;if(invCount(m,'water')<1&&(!ws||tank<1))continue;giveTask(m,{kind:'fire'});n++}}
const raid=(G.raiders&&G.raiders.some(r=>r.alive&&!r.flee&&Math.abs(r.x-G.train.cars[0].ax)<CFG.guardRange+trainLen()))||G.drones.some(d=>!d.dead&&Math.abs(d.x-G.train.cars[0].ax)<CFG.guardRange+trainLen())||(G.vehicles||[]).some(v=>v.enemy&&v.state!=='down'&&Math.abs(v.cxw-G.train.cars[0].ax)<CFG.guardRange+trainLen());
if(raid){let n=busy('guard');for(const m of aboard){if(n>=CFG.guards)break;if(!idle(m)||m.hurt||!weaponOf(m))continue;giveTask(m,{kind:'guard'});n++}}
if(tank>=1)for(const m of aboard)if(idle(m)&&invCount(m,'water')<(danger?.01:CFG.flaskLow))giveTask(m,{kind:'water'});
const drv=aboard.find(m=>m.where==='cab');
if(drv&&invCount(drv,'water')<CFG.flaskLow&&tank>=1&&!G.crew.some(m=>m.task&&m.task.for===drv.id)){
const h=ws&&aboard.find(m=>idle(m)&&!m.hurt);
if(h)giveTask(h,{kind:'water',for:drv.id});
else if(aboard.length===1){G.res.water-=invAdd(drv,'water',Math.min(CFG.flasks-invCount(drv,'water'),Math.floor(tank)))}}
}
function crewDanger(){
const L=G.train.cars[0],mid=L.x-trainLen()/2,half=trainLen()/2+CFG.dangerRange;
return G.drones.some(d=>!d.dead&&Math.abs(d.x-mid)<half)||(G.raiders||[]).some(r=>r.alive&&!r.flee&&Math.abs(r.x-mid)<half)}
function storeSpot(k,m){
let best=null,bd=1e9;for(const c of G.train.cars)c.d.roles.forEach((ro,r)=>{const pi=RES_ROLE[k].indexOf(ro);if(pi>=0&&c.alive[r]){const d=pi*1e4+Math.abs(regionU(c,r)-(m?m.u:0));if(d<bd){bd=d;best=[c,r]}}});
if(!best&&(CFG.cap.base[k]||0)>0)best=cabCar();
return best}
function fetchFrom(m,k,want,dt,keep){
keep=keep||0;const sp=storeSpot(k,m);if(!sp||(G.res[k]||0)<1+keep)return true;
if(!walkTo(m,regionU(sp[0],sp[1]),dt))return false;
m.task.t+=dt;if(m.task.t<CFG.fillTime)return false;m.task.t=0;
const need=Math.max(0,want-invCount(m,k)),got=invAdd(m,k,Math.min(need,Math.floor((G.res[k]||0)-keep)));G.res[k]-=got;
if(k==='water'){const p=toWorld(sp[0],(sp[1]%4+.5)*sp[0].w/4,sp[0].d.split);for(let q=0;q<4;q++)spawn(p[0]+rand(-2,2),p[1]-3,rand(-10,10),rand(-30,-10),rand(.3,.6),[110,170,240],1,'debris')}
return true}
function fetchWater(m,want,dt){return fetchFrom(m,'water',want,dt,m.task&&m.task.kind==='fire'?CFG.pumpReserve/2:0)}
function pumpCovers(c){
const C=G.caps,pc=C.pumpCar;if(!pc||!C.pump||(G.res.water||0)<CFG.waterPerDrop*4+CFG.pumpReserve)return false;
return Math.abs(c.ax-pc.ax)<CFG.pumpReach*(1+.25*(C.pump-1))*.8}
function fireTarget(m){
const others=G.crew.filter(o=>o!==m&&o.task&&o.task.kind==='fire'&&o.task.f).map(o=>toWorld(o.task.f.c,o.task.f.lx,o.task.f.ly)[0]);
let best=null,bd=1e9;for(const c of G.train.cars){if(!c.fires||pumpCovers(c))continue;const w=c.w;
for(let k=0;k<c.n;k++){if(!(c.fire[k]>0))continue;const p=toWorld(c,k%w+.5,((k/w)|0)+.5);let d=Math.abs(p[0]-m.x);if(others.some(x=>Math.abs(x-p[0])<CFG.splashR*2))d+=60;if(d<bd){bd=d;best={c,lx:k%w+.5,ly:((k/w)|0)+.5}}}}
return best}
function splash(m,f){
const c=f.c,t=toWorld(c,f.lx,f.ly),ox=m.x+.5,v=carVel(c);
for(let i=0;i<CFG.splashDrops;i++){addActive(t[0]+rand(-2,2),t[1]+rand(-2,1),v+rand(-35,35),rand(-60,-10),M.WATER,90,170,255,0,.4,c);const q=PX.act[PX.act.length-1];if(q)q.land=rand(.05,.2)}
const wet=c.wet||(c.wet=new Float32Array(c.n)),R=CFG.splashR;let n=0;
for(let j=Math.max(0,Math.floor(f.ly-R));j<=Math.min(c.h-1,Math.floor(f.ly+R));j++)for(let i=Math.max(0,Math.floor(f.lx-R));i<=Math.min(c.w-1,Math.floor(f.lx+R));i++){
const k=j*c.w+i;if(!c.mat[k]||Math.hypot(i+.5-f.lx,j+.5-f.ly)>R)continue;if(c.fire[k]>0){c.fire[k]=0;n++}wet[k]=CFG.wetTime}
G.tel.doused=(G.tel.doused||0)+n;G.tel.buckets=(G.tel.buckets||0)+1;sfx('tink',.25,ox)}
function crewLvl(m){const x=m.xp||0;m.lvl=x>=4?3:x>=2?2:1;return m.lvl}
function weaponOf(m){for(const k of WPN_ORDER)if(has(m,k))return k;return null}
function crewFire(m,ox,oy,dt){
const wpn=weaponOf(m);if(!wpn)return false;const I=ITEMS[wpn];
m.gunT=(m.gunT??rand(.2,.9))-dt;if(m.gunT>0)return true;
const range=I.range||CFG.looterRange,antiAir=['seeker','rpg','sniper'].includes(wpn);
let tx=0,ty=0,tvx=0,found=false,bd=range;
for(const r of G.raiders||[]){if(!r.alive)continue;const ry=groundY(r.x)-4,d=Math.hypot(r.x-m.x,(ry-oy)*.5);if(d<bd){bd=d;tx=r.x+.5;ty=ry;tvx=r.moving?r.dir*CFG.crewWalk*(r.flee?1.4:1.05):0;found=true}}
if(antiAir){
for(const d of G.drones)if(!d.dead){const dd=Math.hypot(d.x-ox,d.y-oy);if(dd<bd){bd=dd;tx=d.x;ty=d.y;tvx=d.vx||0;found=true}}
for(const v of G.vehicles||[])if(v.enemy&&v.state!=='down'){const dd=Math.hypot(v.cxw-ox,v.cyw-oy);if(dd<bd){bd=dd;tx=v.cxw;ty=v.cyw;tvx=v.vx||0;found=true}}
}
if(!found){m.gunT=.35;return true}
const lv=crewLvl(m),rm=lv===3?.65:lv===2?.82:1,[c0,c1]=I.cool||[.9,1.4];
m.gunT=rand(c0,c1)*rm;m.dir=Math.sign(tx-m.x)||m.dir;
useGear(m,wpn);
const sp=I.sp||190,tt0=Math.hypot(tx-ox,ty-oy)/sp;
const lead=lv===1?0:lv===2?tvx*tt0*.6:tvx*tt0,spr=wpn==='sniper'?.002:(lv===3?.008:lv===2?.025:.055);
const dx=tx+lead-ox,dy=ty-oy,tt=Math.hypot(dx,dy)/sp;
const drop=wpn==='sniper'||wpn==='rpg'||wpn==='seeker'?0:(wpn==='grenade'||wpn==='molotov'?57.5*tt*tt:wpn==='spear'?27*tt*tt:0);
const a=Math.atan2(dy-drop,dx)+rand(-spr,spr);
const sk=wpn==='seeker'?'seeker':wpn==='rpg'?'rpg':wpn==='grenade'?'grenade':wpn==='molotov'?'molotov':'pbullet';
G.shots.push({x:ox,y:oy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,kind:sk,life:wpn==='seeker'?3.5:wpn==='sniper'||wpn==='rpg'?2.2:1.5,dmg:I.dmg,why:I.name.toLowerCase(),spear:wpn==='spear',sniper:wpn==='sniper'});
sfx(wpn==='sniper'||wpn==='rpg'||wpn==='seeker'?'gun':wpn==='spear'||wpn==='grenade'||wpn==='molotov'?'tink':'shot',.6,ox);
return true}
function deckStep(m,dt){
m.x=trainFront()-m.u;{const y=roofAt(m.x);if(y!=null)m.gy=y}
{const hp=bodyPos(m,2),h=carAtPoint(hp[0],hp[1]);if(h&&h[0].fire[h[1]]>0){const i=(Math.random()*CREW_BODY.length)|0;m.body[i]-=CFG.fireHurt*dt;if(m.body[i]<=0)bodyBleed(m,i);
const o=bodyCheck(m);if(o==='killed'){log(`${m.name} burned to death inside the ${h[0].d.name.toLowerCase()}`,'bad');return}if(o==='wounded'){log(`${m.name} was burned — taking cover`,'bad');return}}}
const t=m.task;
if(!t){const c=seatCarNear(m);if(!c||walkTo(m,uOf(c.ax),dt))sitDown(m);return}
if(t.kind==='returnLoot'){
const gear=m.inv.find(it=>ITEMS[it.k]?.gear);
if(gear){
if(G.stash.length>=TRAIN_STASH_SLOTS){const ix=m.inv.indexOf(gear);if(ix>=0){dropGroundItem(m.x,gear,'return cargo overflow');m.inv.splice(ix,1);log(`${m.name} leaves ${gearLabel(gear)} beside the train — equipment stash full`,'warn')}return}
const sp=storeSpot('equip',m);if(!sp){const ix=m.inv.indexOf(gear);if(ix>=0){dropGroundItem(m.x,gear,'return cargo overflow');m.inv.splice(ix,1)}return}
if(!walkTo(m,regionU(sp[0],sp[1]),dt))return;t.t+=dt;if(t.t<CFG.stowTime)return;t.t=0;
const ix=m.inv.indexOf(gear);if(ix>=0&&G.stash.length<TRAIN_STASH_SLOTS){m.inv.splice(ix,1);G.stash.push(gear);log(`${m.name} unloads ${gearLabel(gear)} into the train equipment stash`,'good')}G.crewHtml='';return;
}
if(!invGoods(m)){m.task=null;log(`${m.name} has unloaded the recoverable loot`,'good');G.crewHtml='';return}
const target=depositTarget(m);
if(!target){
for(const it of m.inv.slice())if(!ITEMS[it.k].gear){const n=it.k==='water'?spareWater(m):it.n;if(n>0){dropGroundItem(m.x,{k:it.k,n},'return cargo overflow');invTake(m,it.k,n)}}
m.task=null;log(`${m.name} leaves overflow beside the train — stores are full`,'warn');G.crewHtml='';return;
}
if(!walkTo(m,regionU(target.c,target.r),dt))return;t.t+=dt;if(t.t<CFG.stowTime)return;t.t=0;
const k=target.k,carry=k==='water'?spareWater(m):invCount(m,k),room=Math.max(0,(G.caps[k]||0)-(G.res[k]||0));
const put=k==='fuel'||k==='water'?Math.min(carry,room):Math.min(Math.floor(carry),Math.floor(room+1e-6));
if(put>0){invTake(m,k,put);G.res[k]=(G.res[k]||0)+put;if(k==='scrap')G.tel.scrapIn+=put;if(k==='fuel')G.tel.fuelIn.carried=(G.tel.fuelIn.carried||0)+put;G.tel.stowed=(G.tel.stowed||0)+put;log(`${m.name} unloads ${put} ${k} into train storage`,'good')}
G.crewHtml='';return;
}
if(t.kind==='water'){
if(t.stage===0){if(fetchWater(m,CFG.flasks+(t.for?1:0),dt))t.stage=t.for?1:9;return}
if(t.stage===1){const d=G.crew.find(x=>x.id===t.for&&x.where==='cab'),cab=cabCar();if(!d||!cab){t.stage=9;return}
if(walkTo(m,regionU(cab[0],cab[1]),dt)){const give=Math.min(1,invCount(m,'water'));invTake(m,'water',give);invAdd(d,'water',give);t.stage=9}return}
m.task=null;return}
if(t.kind==='takeGear'){
const sp=storeSpot('equip',m);if(!sp){m.task=null;return}if(!walkTo(m,regionU(sp[0],sp[1]),dt))return;t.t+=dt;if(t.t<CFG.fillTime)return;
const wpn=weaponOf(m),bestRank=wpn?WPN_ORDER.indexOf(wpn):99;
let it=G.stash.filter(x=>ITEMS[x.k]?.wpn&&WPN_ORDER.indexOf(x.k)<bestRank).sort((a,b)=>WPN_ORDER.indexOf(a.k)-WPN_ORDER.indexOf(b.k))[0];
if(!it)it=G.stash.find(x=>(x.k==='armor'&&!has(m,'armor'))||(x.k==='pick'&&!has(m,'pick')));
if(it&&giveGear(m,it)){G.stash.splice(G.stash.indexOf(it),1);log(`${m.name} takes a ${gearLabel(it)} from the train chest`,'good')}m.task=null;return}
if(t.kind==='stashSelected'){
const sp=storeSpot('equip',m);if(!sp||G.stash.length>=TRAIN_STASH_SLOTS){m.task=null;return}
if(!walkTo(m,regionU(sp[0],sp[1]),dt))return;t.t+=dt;if(t.t<CFG.stowTime)return;
const it=t.item,ix=m.inv.indexOf(it);if(ix>=0&&G.stash.length<TRAIN_STASH_SLOTS){m.inv.splice(ix,1);G.stash.push(it);log(`${m.name} stows ${gearLabel(it)} in the train equipment stash`,'good')}
m.task=null;G.crewHtml='';return}
if(t.kind==='forge'){
const wk=t.w||'pistol',I=ITEMS[wk]||ITEMS.pistol,rk=Object.keys(I.cost||{ammo:1})[0]||'ammo',sp=storeSpot(rk,m);
if(!sp||!canPayCost(m,I.cost,true)||weaponOf(m)){m.task=null;return}if(!walkTo(m,regionU(sp[0],sp[1]),dt))return;t.t+=dt;if(t.t<CFG.fillTime*2)return;
if(payCost(m,I.cost,true)){const item=makeGearItem(wk);giveGear(m,item);G.tel.pistols=(G.tel.pistols||0)+1;log(`${m.name} crafts a ${gearLabel(item)}`,'good')}
m.task=null;return}
if(t.kind==='fetch'){if(fetchFrom(m,t.k,t.n,dt)){m.hold=m.hold||{};m.hold[t.k]=(m.hold[t.k]||0)+Math.min(t.n,invCount(m,t.k));m.task=null}return}
if(t.kind==='stow'||t.kind==='stowSelected'){
const selected=t.kind==='stowSelected',dt0=depositTarget(m,selected?t.k:null);if(!dt0){m.task=null;return}
if(!walkTo(m,regionU(dt0.c,dt0.r),dt))return;
t.t+=dt;if(t.t<CFG.stowTime)return;t.t=0;
const k=dt0.k,it=t.item,carry=selected?Math.min(t.n,it&&it.n||0):(k==='water'?spareWater(m):invCount(m,k)),room=Math.max(0,(G.caps[k]||0)-(G.res[k]||0)),put=k==='fuel'||k==='water'?Math.min(carry,room):Math.min(Math.floor(carry),Math.floor(room+1e-6));
if(put>0){if(selected){it.n-=put;if(it.n<=1e-6){const ix=m.inv.indexOf(it);if(ix>=0)m.inv.splice(ix,1)}}else invTake(m,k,put);G.res[k]=(G.res[k]||0)+put;if(k==='scrap')G.tel.scrapIn+=put;if(k==='fuel')G.tel.fuelIn.carried=(G.tel.fuelIn.carried||0)+put;G.tel.stowed=(G.tel.stowed||0)+put;log(`${m.name} stows ${put} ${k} in train storage`,'good')}
if(selected||put<carry-1e-6&&!invGoods(m))m.task=null;G.crewHtml='';return}
if(t.kind==='fire'){
if(t.stage===0){if(invCount(m,'water')>=1){t.stage=1;return}if(fetchWater(m,CFG.bucketFill,dt))t.stage=invCount(m,'water')>=1?1:9;return}
if(t.stage===1){t.re=(t.re||0)-dt;if(!t.f||t.re<=0||!(t.f.c.fire[(t.f.ly|0)*t.f.c.w+(t.f.lx|0)]>0)){t.f=fireTarget(m);t.re=.6}
if(!t.f){m.task=null;return}const tx=toWorld(t.f.c,t.f.lx,t.f.ly)[0];
const near=Math.abs(tx-m.x)<CFG.throwReach;if(!near){walkTo(m,uOf(tx),dt,1.4);return}
m.walkS=0;t.t+=dt;if(t.t<CFG.throwEvery)return;t.t=0;
if(invCount(m,'water')<1){t.stage=(G.res.water||0)>=1&&waterSpot()?0:9;return}
invTake(m,'water',1);m.throwT=.25;splash(m,t.f);return}
m.task=null;return}
if(t.kind==='guard'){
const rs=(G.raiders||[]).filter(r=>r.alive&&!r.flee);
let tx=rs.length?rs[0].x:null;for(const r of rs)if(Math.abs(r.x-m.x)<Math.abs(tx-m.x))tx=r.x;
if(tx==null){const d0=G.drones.find(d=>!d.dead)||((G.vehicles||[]).find(v=>v.enemy&&v.state!=='down'));if(d0)tx=d0.cxw??d0.x}
if(tx==null){m.task=null;return}
const rng=(ITEMS[weaponOf(m)]?.range||CFG.looterRange)*.6;
if(Math.abs(tx-m.x)>rng)walkTo(m,clamp(uOf(tx),2,trainLen()-2),dt,1.7);else m.walkS=0;
crewFire(m,m.x+.5,m.gy-5,dt);return}
m.task=null;
}
function crewAtStation(){
if(!G.crew)return;crewReset();let healed=0,stowed=0;
for(const m of G.crew){const plv=crewLvl(m);m.xp=(m.xp||0)+CFG.crewXpPerLeg;if(crewLvl(m)>plv)log(`${m.name} rose to Intellect L${m.lvl}!`,'good');if(m.hp<10){healed++;m.hp=10}m.hurt=false;
for(const it of m.inv.slice()){const k=it.k;if(ITEMS[k].gear)continue;if(k==='water')continue;const room=Math.max(0,(G.caps[k]||0)-(G.res[k]||0)),put=Math.min(k==='fuel'?it.n:Math.floor(it.n),Math.floor(room));if(put>0){invTake(m,k,put);G.res[k]+=put;stowed+=put}}
const sw=spareWater(m);if(sw>0)invTake(m,'water',sw);
invAdd(m,'water',Math.max(0,CFG.flasks-invCount(m,'water')))}
crewSync();
log(`Station: ${healed?`infirmary patched up ${healed} · `:''}flasks filled${stowed?` · ${stowed} carried goods stowed`:''}`,'good');
}
const TASK_LABEL={water:'fetching water',stow:'stowing loot',fire:'fighting fire',guard:'defending the train',takeGear:'taking a weapon from the stash',forge:'forging a pistol',fetch:'fetching'};
function crewLine(m){
const hh=hurtHp(),hp=Math.max(0,m.hp),full=Math.round(hp);let pips='';for(let i=0;i<10;i++)pips+=i<full?'▮':'▯';
let what;
if(m.where==='out'){const e=G.exp;what=m.state==='fly'?'flying':m.state==='chute'?'parachuting':m.state==='back'?'coming back':!e?'outside':m.state==='work'?'looting':'walking out'}
else if(m.where==='cab')what='driving';
else if(m.where==='deck')what=m.task?(m.task.kind==='water'&&m.task.for?'bringing the driver water':TASK_LABEL[m.task.kind]||m.task.kind):'going to a seat';
else what=m.where==='roof'?'standing (no seat)':'seated';
const w=invCount(m,'water'),inv=[];
for(let i=0;i<PACK;i++){const it=m.inv[i];if(!it){inv.push(`<button type="button" class="invslot empty" title="Empty slot ${i+1}" disabled>·</button>`);continue}const I=ITEMS[it.k]||{name:it.k,ch:'?',col:'#fff'};
const cnt=I.gear?(it.shots??I.maxShots??1):(it.n>1?Math.round(it.n):0);
inv.push(`<button type="button" class="invslot" data-drop-kind="crew" data-owner="${m.id}" data-slot="${i}" style="color:${I.col}${it.k==='water'&&it.n<.5?';opacity:.5':''}" title="Click to stow ${I.name} at storage${it.n>1?' ×'+Math.round(it.n):''}${I.gear?' · '+(it.shots??I.maxShots??1)+' uses left':''}">${I.ch}${cnt?`<sub>${cnt}</sub>`:''}</button>`)}
return `<div class="cm${m.hp<hh?' hurt':''}${w<=0?' dry':''}"><b>${m.name}${crewLvl(m)>1?' L'+m.lvl:''}</b><span class="hp" title="Health ${hp.toFixed(1)}/10">${pips}</span><i>${what}${w<=0?' · no water':''}</i><span class="inv">${inv.join('')}</span></div>`;
}
function renderInventorySlots(inv,kind,id,slots){
inv=inv||[];let html='';for(let i=0;i<slots;i++){const it=inv[i];if(!it){html+=`<button type="button" class="stslot empty" disabled title="Empty slot ${i+1}">·</button>`;continue}const I=ITEMS[it.k]||{name:it.k,ch:'?',col:'#fff'};
const cnt=I.gear?(it.shots??I.maxShots??1):(it.n>1?Math.round(it.n):0);
html+=`<button type="button" class="stslot" data-drop-kind="${kind}" data-owner="${id??''}" data-slot="${i}" style="color:${I.col}" title="Drop ${I.name}${it.n>1?' ×'+Math.round(it.n):''}${I.gear?' · '+(it.shots??I.maxShots??1)+' uses left':''}">${I.ch}${cnt?`<sub>${cnt}</sub>`:''}</button>`}return html;
}
function updateCrewPanel(){
const el=$('crew');if(!el||!G.crew)return;
if(G.crewHidden){if(el.innerHTML)el.innerHTML='';el.hidden=true;return}el.hidden=false;
const active=G.piloting&&G.vehicles&&G.vehicles.includes(G.piloting)?G.piloting:null;
let html='';
if(active){
active.inv=active.inv||[];
const expCrew=G.exp&&G.exp.craft===active?G.exp.members.filter(m=>m&&m.alive):[];
const people=[active.pilot,...(active.passengers||[]),...expCrew].filter((m,i,a)=>m&&m.alive&&a.indexOf(m)===i);
html=`<h5>AIRCREW ${people.length} · ${active.d.name.toUpperCase()} <small>${active.lootingHold||!active.pilot?'COCKPIT EMPTY (LOOTER OUT) · [E] recall · [Tab] view train':'[W/S] throttle · [A/D] pitch · [E] loot when landed · [J] eject'}</small></h5>`+people.map(crewLine).join('');
html+=`<div class="stashPanel"><div class="stashTitle"><span>VEHICLE CARGO</span><span>${active.inv.length}/${VEHICLE_PACK} SLOTS</span></div><div class="stashGrid">${renderInventorySlots(active.inv,'vehicle',active.id,VEHICLE_PACK)}</div><div class="stashNote">Fuel ${Math.max(0,active.gas||0).toFixed(1)} · Scrap ${Math.floor(active.scrap||0)}/${CFG.airScrapCap} · Ammo ${Math.floor(active.ammoPool||0)} shots${active.lootingHold||!active.pilot?' · NO PILOT IN COCKPIT':''}</div></div>`;
}else{
const st=G.stash||[],resources=[['water','~'],['scrap','#'],['fuel','f'],['ammo','a'],['equip','e']];
html=`<h5>CREW ${G.crew.length}${st.length?` · STASH ${st.length}`:''} <small>[C] hide · click a symbol to stow/drop</small></h5>`+G.crew.map(crewLine).join('');
html+=`<div class="stashPanel"><div class="stashTitle"><span>TRAIN STORES</span><span>BY WAGON CAPACITY</span></div><div class="resRow">${resources.map(([k,ch])=>`<button type="button" class="resSlot" data-drop-kind="resource" data-owner="${k}" title="Drop 1 ${k}"><span>${ch}</span><b>${k==='water'?Math.floor(G.res[k]||0):Math.floor(G.res[k]||0)}</b></button>`).join('')}</div><div class="stashTitle"><span>EQUIPMENT STASH</span><span>${st.length}/${TRAIN_STASH_SLOTS} SLOTS</span></div><div class="stashGrid">${renderInventorySlots(st,'stash','train',TRAIN_STASH_SLOTS)}</div><div class="stashNote">Crew physically walk to the wagon section to stow supplies & equip gear.</div></div>`;
}
if(html!==G.crewHtml){G.crewHtml=html;el.innerHTML=html}
}
document.getElementById('crew').addEventListener('click',e=>{const b=e.target.closest('[data-drop-kind]');if(!b)return;discardInventorySlot(b.dataset.dropKind,b.dataset.owner,+b.dataset.slot)});
const LOOT={
drone:{scrap:[1,2],equip:[0,1],ammo:[0,2],gear:{grenade:.12,molotov:.1}},
bomber:{scrap:[2,3],equip:[1,1],ammo:[0,3],gear:{grenade:.2,rpg:.08}},
plane:{scrap:[2,4],equip:[0,2],ammo:[4,8],fuel:[0,8],gear:{sniper:.14,rpg:.12,gun:.25,pistol:.3,armor:.12}},
heli:{scrap:[3,5],equip:[1,2],ammo:[5,10],fuel:[2,8],gear:{seeker:.12,rpg:.16,sniper:.14,gun:.3,armor:.15}},
raider:{ammo:[0,3],scrap:[0,1],water:[0,1],gear:{pistol:.38,molotov:.18,grenade:.14,spear:.15,gun:.1,sniper:.05}},
};
function rollLoot(kind){const T=LOOT[kind]||{},items={},gear=[];for(const k in T){if(k==='gear')continue;const [a,b]=T[k],n=a+Math.floor(Math.random()*(b-a+1));if(n>0)items[k]=n}
for(const g in T.gear||{})if(Math.random()<T.gear[g]){const mx=ITEMS[g]?.maxShots||1;gear.push(makeGearItem(g,{shots:mx>2?Math.max(2,Math.ceil(mx*rand(.4,1))):mx}))}return{items,gear}}
function giveGear(m,it){if(m.inv.length>=PACK)return false;m.inv.push(makeGearItem(it.k,it));return true}
function gearLabel(it){const I=ITEMS[it.k]||{name:it.k};const sh=it.shots??I.maxShots;return sh!==undefined?`${I.name.toLowerCase()} (${sh} use${sh===1?'':'s'})`:I.name.toLowerCase()}
function dropSalvage(x,items,what){if(!G.salvage)G.salvage=[];if(x<0||!G.world||x>G.world.W)return;
let gear=[];if(typeof items==='string'){const r=rollLoot(items);items=r.items;gear=r.gear}
if(!Object.keys(items).length&&!gear.length)return;
G.salvage.push({x,items:Object.assign({},items),gear,what:what||'wreck'});if(G.salvage.length>24)G.salvage.shift()}
function sweepSalvage(x,L){
if(!G.salvage||!G.salvage.length)return 0;let n=0;
for(let i=G.salvage.length-1;i>=0;i--){const w=G.salvage[i];if(Math.abs(w.x-x)>CFG.sweepRadius)continue;for(const k in w.items)L[k]=(L[k]||0)+w.items[k];if(w.gear&&w.gear.length)L.gearItems=(L.gearItems||[]).concat(w.gear);G.salvage.splice(i,1);n++}
return n}
function pickupWrecks(m){
for(let i=G.salvage.length-1;i>=0;i--){const w=G.salvage[i];if(Math.abs(w.x-m.x)>CFG.pickupReach)continue;let all=true,got=[];
for(const k in w.items){const n=invAdd(m,k,w.items[k]);if(n>0)got.push(`${Math.round(n)} ${k}`);w.items[k]-=n;if(w.items[k]>1e-6)all=false}
for(const it of (w.gear||[]).slice()){if(giveGear(m,it)){got.push(gearLabel(it));w.gear.splice(w.gear.indexOf(it),1)}else all=false}
if(all)G.salvage.splice(i,1);if(got.length)log(`${m.name} picks up a ${w.what}: ${got.join(', ')}`,'good')}}
