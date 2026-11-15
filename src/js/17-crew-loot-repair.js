/* crew expeditions */
const L0=()=>G.train.cars[0];
const CREW_BODY=[[0,-7],[1,-7],[0,-6],[1,-6],[0,-5],[1,-5],[0,-4],[1,-4],[0,-3],[1,-3],[0,-2,'L'],[0,-1,'L'],[1,-2,'R'],[1,-1,'R']];
function newBody(){return new Float32Array(CREW_BODY.length).fill(CFG.bodyHP)}
function bodyInt(m){if(!m.body)return 1;let s=0;for(const v of m.body)s+=Math.max(0,v);return s/(CREW_BODY.length*CFG.bodyHP)}
function bodyPos(m,i){const b=CREW_BODY[i],s=m.walkS||0;let dx=b[0];if(b[2]==='L')dx-=s;if(b[2]==='R')dx+=s;return[Math.round(m.x)+dx+.5,Math.round(baseY(m))+b[1]+.5]}
function bodyBleed(m,i){const p=bodyPos(m,i);addActive(p[0],p[1],rand(-40,40),rand(-70,-20),M.SCRAP,150+rand(0,40),24,20,0,.2);spawn(p[0],p[1],rand(-30,30),rand(-50,-10),rand(.4,.9),[170,30,24],1,'debris')}
function bodyCheck(m){
if(!m.alive)return'killed';const v=bodyInt(m);
if(v<CFG.bodyDeadAt){for(let i=0;i<CREW_BODY.length;i++)if(m.body[i]>0)bodyBleed(m,i);killMember(m);return'killed'}
if(v<CFG.bodyHurtAt&&!m.hurt){m.hurt=true;if(m.where==='out')dropGoods(m);if(m.state==='out')m.state='back';if(m.where==='deck')sitDown(m);return'wounded'}
return'hit'}
function accidentHit(m,lo,hi){
let loss=rand(lo,hi)*CREW_BODY.length*CFG.bodyHP*(useGear(m,'armor')?1-CFG.armorBlock:1);const order=CREW_BODY.map((_,i)=>i).sort(()=>Math.random()-.5);
for(const i of order){if(loss<=0)break;const t=Math.min(loss,m.body[i]);m.body[i]-=t;loss-=t}
return bodyCheck(m)}
function hurtMember(m){return accidentHit(m,.15,.6)}
function findTargetAt(ox,hw){
let best=null,bd=1e9;const dist=x=>Math.max(0,Math.abs(x-ox)-(hw||20));
for(const s of G.world.sites)if(s.uses>0){const d=dist(s.x);if(d<CFG.siteReach&&d<bd){bd=d;best={kind:'site',s,x:s.x}}}
for(const o of G.obstacles){const d=dist(o.x+o.w/2);if(d<70&&d<bd){bd=d;best={kind:'clear',o,x:o.x+o.w/2}}}
if(!best){let sv=null,sd=1e9;for(const w of G.salvage||[]){const d=dist(w.x);if(d<CFG.salvageReach&&d<sd){sd=d;sv=w}}if(sv)best={kind:'salvage',w:sv,x:sv.x}}
if(!best){let ch=null,cd=1e9;for(const c of G.chunks)if(c.rest&&c.n>=12){const d=dist(c.x);if(d<140&&d<cd){cd=d;ch=c}}best=ch?{kind:'wreck',ch,x:ch.x}:{kind:'forage',x:ox+45}}
return best}
function findTarget(){
const cars=G.train.cars;let best=null,bd=1e9;
const dist=x=>{let m=1e9;for(const c of cars)m=Math.min(m,Math.max(0,Math.abs(x-c.x)-c.w/2));return m};
for(const s of G.world.sites)if(s.uses>0){const d=dist(s.x);if(d<CFG.siteReach&&d<bd){bd=d;best={kind:'site',s,x:s.x}}}
const dry=G.res.fuel<8;
for(const o of G.obstacles){const d=dist(o.x+o.w/2);if(d<70&&d<bd&&!dry){bd=d;best={kind:'clear',o,x:o.x+o.w/2}}}
if(!best){let sv=null,sd=1e9;for(const w of G.salvage||[]){const d=dist(w.x);if(d<CFG.salvageReach&&d<sd){sd=d;sv=w}}if(sv)best={kind:'salvage',w:sv,x:sv.x}}
if(!best){let ch=null,cd=1e9;for(const c of G.chunks)if(c.rest&&c.n>=12){const d=dist(c.x);if(d<140&&d<cd){cd=d;ch=c}}best=ch?{kind:'wreck',ch,x:ch.x}:{kind:'forage',x:cars[0].x+cars[0].w/2+55}}
return best;
}
function partySize(tgt){
const avail=crewOnTrain(),fit=partyCands().length,half=Math.max(1,Math.floor(avail/2));
let n=Math.min(G.party||half,avail-1,Math.max(1,fit));
return Math.max(1,n);
}
function tryExpedition(fromCar,forced){
if(G.exp){const e=G.exp;if(e.resolved){log('Crew are already on their way back','warn');return}
if(e.tgt.kind==='site'&&e.t>0&&e.members.some(m=>m.alive&&m.state==='work')){resolveExpedition(e,clamp(e.t/e.work,0,.99));log('Crew recalled — they bring back what they have','warn')}
else{e.resolved=true;e.loot=null;for(const m of e.members)if(m.alive)m.state='back';log('Crew recalled','warn')}
return}
if(Math.abs(G.train.v)>3){log('Stop the train before sending crew out','warn');return}
const avail=crewOnTrain();if(avail<2){log('Need 2+ crew aboard — one must stay to drive','bad');return}
let cands=partyCands(fromCar),limp=false;
if(!cands.length){cands=G.crew.filter(m=>m.where!=='out'&&m.where!=='cab'&&m.id!==G.driverId).sort((a,b)=>b.hp-a.hp);limp=true;
if(!cands.length){log('Nobody can go — only the driver is aboard','bad');return}}
const tgt=forced||findTarget();if(!tgt){log('Nothing in reach — stop next to a site or an obstacle','warn');return}
let n=partySize(tgt);
if(fromCar){const seated=G.crew.filter(m=>m.where==='seat'&&m.car===fromCar.id).length;n=Math.min(n,Math.max(1,Math.ceil(seated*.5)))}
n=Math.min(n,cands.length);
const home=fromCar||G.train.cars.find(c=>c.d.roles.includes('SEATS'))||G.train.cars[0];
const members=cands.slice(0,n);let dry=0;
G.stash=G.stash||[];
for(const m of members){
stowNow(m);
const keepWpn=weaponOf(m),seen=new Set();
for(const it of m.inv.slice()){if(!ITEMS[it.k].gear)continue;const isW=!!ITEMS[it.k].wpn,ky=isW?'wpn':it.k;if((isW&&it.k!==keepWpn)||seen.has(ky)){m.inv.splice(m.inv.indexOf(it),1);if(G.stash.length<TRAIN_STASH_SLOTS)G.stash.push(it)}else seen.add(ky)}
for(const want of [...WPN_ORDER,'armor','pick']){
if((ITEMS[want]?.wpn?weaponOf(m):has(m,want))||m.inv.length>=PACK)continue;
const gi=G.stash.findIndex(x=>x.k===want);if(gi>=0)giveGear(m,G.stash.splice(gi,1)[0]);
}
if(invCount(m,'water')<1&&(G.res.water||0)>CFG.pumpReserve){const w=invAdd(m,'water',Math.min(1,(G.res.water||0)-CFG.pumpReserve));G.res.water-=w}
const c=carById(m.car)||home;m.x=(m.where==='deck'?m.x:c.ax)+rand(-4,4);m.task=null;if(!m.body)bodyFromHp(m);m.where='out';m.state='out';m.alive=true;m.ph=rand(0,6);m.walkS=0;m.hurt=false;m.fullMsg=0;
if(invCount(m,'water')<=0)dry++}
crewSync();const thirst=tgt.kind==='site'?dry/n:0,drink=n-dry;
const spd=1/(1+.25*(n-1));
let work;
if(tgt.kind==='site'){const st=tgt.s;work=SITES[st.type].work*spd*(1+CFG.lootDepthWork*siteDepth(st))}
else work=(tgt.kind==='clear'?3+tgt.o.hp/50:tgt.kind==='wreck'?5:tgt.kind==='salvage'?CFG.salvageTime:CFG.forageTime)*spd;
const dryNote=(limp?' · nobody is fit: an injured crew member goes (slow, one more hit sends them back)':'')+(thirst>0?` · ${drink?`${dry} without`:'no'} water: the job takes longer`:'');
G.exp={tgt,members,t:0,work,resolved:false,loot:null,carriers:0,thirst};
if(tgt.kind==='site'){const st=tgt.s,planned=Math.min(n,st.stock);G.exp.tearRate=planned/Math.max(1,st.stock0)*(1-CFG.collapseAt-.06)*(st.cells0||0)*CFG.lootTear/work;
log(`${n} looter${n>1?'s':''} (50% party) heading into the ${SITES[st.type].name.toLowerCase()} — ${st.stock} load${st.stock>1?'s':''} inside${fromCar?` (from the ${fromCar.d.name.toLowerCase()})`:''}${avail-n<=1?' · only the driver stays aboard: the gun fires slowly':''}${dryNote}`,thirst?'warn':'');return}
log(`${n} crew (50% party) heading out to ${tgt.kind==='clear'?'clear the track':tgt.kind==='wreck'?'strip the wreckage':tgt.kind==='forage'?'forage for fuel':tgt.kind==='salvage'?'salvage the wrecks':SITES[tgt.s.type].name.toLowerCase()} — stay close${dryNote}`,thirst?'warn':'');
}
function hitWalker(x,y,r,dmg,why){
if(!G.crew)return false;let hit=false;dmg=dmg||40;
for(const m of G.crew.slice()){if(!m.alive||!m.body)continue;if(m.where==='out'){if(m.state==='work'||m.state==='in'||m.state==='fly')continue}else if(m.where!=='deck')continue;const gy=baseY(m);
if(Math.abs(x-(m.x+.5))>r+2.5||y<gy-9-r||y>gy+r+1)continue;let touched=false;const dm=dmg*(has(m,'armor')?1-CFG.armorBlock:1);const inside=m.where==='deck';
for(let i=0;i<CREW_BODY.length;i++){if(m.body[i]<=0)continue;const p=bodyPos(m,i),d=Math.hypot(p[0]-x,p[1]-y);if(d>r+.6)continue;const cov=inside?coverAt(p[0],p[1]):0;if(cov>=1)continue;
m.body[i]-=dm*(1-d/(r+1.2))*(1-cov);touched=true;if(m.body[i]<=0)bodyBleed(m,i)}
if(!touched)continue;if(has(m,'armor'))useGear(m,'armor');hit=true;const deck=m.where==='deck',out=bodyCheck(m);if(deck&&!touched)continue;
if(out==='killed')log(`${m.name} was killed by ${why||'shrapnel'} ${deck?'inside the train':'outside the train'}`,'bad');
else if(out==='wounded')log(`${m.name} was wounded by ${why||'shrapnel'} — ${deck?'taking cover':'limping back'}`,'bad');
for(let i=0;i<3;i++)spawn(x,y,rand(-30,30),rand(-50,-10),rand(.3,.7),[170,30,24],1,'debris')}
return hit;
}
function updateExpedition(dt){
const e=G.exp;if(!e)return;const cars=G.train.cars;
const near=x=>{if(e.craft&&(G.vehicles||[]).includes(e.craft))return[e.craft,Math.abs(e.craft.cxw-x)];let best=cars[0],bd=1e9;for(const c of cars){const d=Math.abs(c.x-x);if(d<bd){bd=d;best=c}}return[best,bd]};
let working=0,alive=0;
let dryW=0,picks=0;
for(const m of e.members){if(!m.alive||m.state==='in')continue;alive++;m.ph+=dt*(m.hurt?4:8);m.walkS=m.state==='work'?0:(Math.sin(m.ph)>0?1:0);
if(m.state==='out'){const dir=Math.sign(e.tgt.x-m.x);m.x+=dir*CFG.crewWalk*dt;if(Math.abs(e.tgt.x-m.x)<2)m.state='work'}
if((m.state==='out'||m.state==='back')&&!m.hurt&&G.salvage&&G.salvage.length)pickupWrecks(m);
if(m.state==='work'){working++;if(invCount(m,'water')<=0)dryW++;if(has(m,'pick'))picks++}
if(m.state==='back'){const[c]=near(m.x),cx=c.cxw??c.x;m.x+=Math.sign(cx-m.x)*CFG.crewWalk*(m.hurt?.5:1.2)*dt;if(Math.abs(cx-m.x)<c.w/2-2){
if(e.craft&&c===e.craft&&G.vehicles.includes(c)){
m.x=c.cxw;m.where='out';m.state='fly';
if(!c.pilot||!c.pilot.alive)c.pilot=m;else{c.passengers=c.passengers||[];if(!c.passengers.includes(m))c.passengers.push(m);c.pax=c.passengers[0]||null}
c.lootingHold=false;c.player=G.piloting===c;if(c.landed){c.parkedOnGround=true;c.state='parkedGround';c.lever=0;if(c.ctl)c.ctl.thr=0}else c.state='attack';
const gf=invTake(m,'fuel',Math.max(0,(CFG.airFuelCap-(c.gas||0))/CFG.gasPerFuel));c.gas=Math.min(CFG.airFuelCap,(c.gas||0)+gf*CFG.gasPerFuel);
const gs=invTake(m,'scrap',Math.max(0,CFG.airScrapCap-Math.floor(c.scrap||0)));c.scrap=Math.min(CFG.airScrapCap,(c.scrap||0)+gs);
const capS=CFG.airAmmoCap*CFG.airShotsPerAmmo,ga=invTake(m,'ammo',Math.max(0,Math.ceil((capS-(c.ammoPool||0))/CFG.airShotsPerAmmo)));c.ammoPool=Math.min(capS,(c.ammoPool||0)+ga*CFG.airShotsPerAmmo);c.shots=c.ammoPool;c.bombs=Math.floor(c.ammoPool/CFG.airShotsPerAmmo);
transferPackToVehicle(m,c);m.hold={};e.carriers++;if(G.piloting===c)setControl(c);G.hudSig='';G.crewHtml='';log(`${m.name} climbs back into the ${c.d.name.toLowerCase()} — cargo secured (${c.inv.length}/${VEHICLE_PACK} slots)`,'good');
}else{boardMember(m,c);if(m.hurt){G.tel.injured=(G.tel.injured||0)+1}else e.carriers++}}}
if(m.state!=='work'&&m.state!=='in'){const[,d]=near(m.x);if(d>CFG.crewLostDist){killMember(m);log(`${m.name} was left behind`,'bad')}}
}
const rate=working?(1+CFG.pickBonus*(e.tgt.kind==='clear'?2:1)*picks/working)/(1+(CFG.dryWorkMult-1)*(e.tgt.kind==='site'?dryW/working:0)):1;
if(!e.resolved&&working>0&&working===alive){e.t+=dt*rate;if(e.tgt.kind==='site'&&e.tearRate){e.tearAcc=(e.tearAcc||0)+dt*e.tearRate;while(e.tearAcc>=1){e.tearAcc--;siteTear(e.tgt.s)}}if(e.t>=e.work)resolveExpedition(e)}
if(e.members.every(m=>!m.alive||m.state==='in'||(e.craft&&m.state==='fly'))){
if(e.loot){const L=e.loot,carried=packSummary(e);
if(e.carriers>0&&(L.crew||L.wagon))applyLoot({crew:L.crew,wagon:L.wagon},1,e.label,e.site);
log(`${e.label}: ${carried||'nothing carried home'}${e.leftover?` · left at the site: ${e.leftover} — packs full`:''}${carried?(e.craft?' — stowed in vehicle cargo':' — stowing it'):''}`,carried?'good':'warn')}
if(e.note)log(e.note,'warn');
G.exp=null;crewSync();G.hudSig='';G.crewHtml='';
}
}
function resolveExpedition(e,frac){
e.resolved=true;const here=e.members.filter(m=>m.alive);e.sent=here.length;const n=here.length;
for(const m of here)if(has(m,'pick'))useGear(m,'pick');
const L={};
if(e.tgt.kind==='clear'){const i=G.obstacles.indexOf(e.tgt.o);if(i>=0){const o=e.tgt.o;G.obstacles.splice(i,1);for(let k=0;k<20;k++)spawn(o.x+rand(0,o.w),T(o.x)-rand(0,o.h),rand(-40,40),rand(-80,-20),rand(1,2),[110,100,88],1,'debris')}
L.scrap=e.tgt.o.kind==='wreck'?2+((Math.random()*2)|0):0;e.label='Track cleared';}
else if(e.tgt.kind==='wreck'){const i=G.chunks.indexOf(e.tgt.ch);if(i>=0)G.chunks.splice(i,1);L.scrap=Math.min(5+n,Math.max(1,Math.round(e.tgt.ch.n/40)));e.label='Wreckage stripped'}
else if(e.tgt.kind==='salvage'){e.label='Wrecks salvaged'}
else if(e.tgt.kind==='forage'){const room=(G.caps.fuel||0)-G.res.fuel;if(room<n*5&&G.res.scrap<(G.caps.scrap||0)){L.scrap=n+((Math.random()*2)|0);e.label='Scavenging junk'}else{L.fuel=Math.round(n*rand(5,9));if(Math.random()<.35)L.scrap=Math.max(1,Math.floor(n/2));e.label='Foraging'}}
else{const s=e.tgt.s,D=SITES[s.type],nm=D.name;frac=frac??1;
const depth=siteDepth(s),loads=Math.min(s.stock,Math.floor(n*frac+(frac<1?Math.random():0))),extra=Math.max(0,n*frac-loads)*.35,lucky=frac>=1&&Math.random()<.1,mult=(1+CFG.lootDepthRich*depth)*(lucky?1.6:1);
for(const k in D.load)L[k]=(L[k]||0)+D.load[k]*(loads+extra)*mult;
for(const k in s.cache)L[k]=(L[k]||0)+s.cache[k];s.cache={};
s.stock-=loads;s.uses=s.stock>0?1:0;e.site=s;e.loadsTaken=loads;
e.label=`${nm}${lucky?' (lucky find!)':''}${frac<1?' (recalled)':''} [${s.stock}/${s.stock0} left]`;
if(s.type==='camp'&&s.people>0&&frac>=1&&Math.random()<.45+.15*n){L.crew=1;s.people--}
if(s.type==='yard'&&s.wagon&&frac>=1){if(n>=3&&G.train.cars.length<8){L.wagon=s.wagon;s.wagon=null}else if(n<3)e.note='There is a wagon in the yard — it takes 3+ crew to push it onto the line'}
if(Math.random()<siteRisk(s,n)*frac){
killInside(e,1,{ruin:'A floor gave way in the ruin',depot:'A fuel line ignited inside the depot',armory:'A booby-trapped crate went off in the armory',camp:'A fight broke out at the camp',yard:'A loose wagon rolled over a looter',bunker:'A tunnel collapsed in the bunker'}[s.type]||'An accident inside');
if(s.type==='depot'||s.type==='armory'){const gy=T(s.x);for(let q=0;q<14;q++)addActive(s.x+rand(-14,14),gy-rand(4,16),rand(-50,50),-rand(30,90),s.type==='depot'?M.FUEL:M.WOOD,230,140,50,1.5,.2);sfx('crash',.5,s.x)}}
if(s.type==='bunker'&&Math.random()<(.1+.05*n)*frac){const k=2+((Math.random()*2)|0);for(let i=0;i<k;i++){const n0=G.drones.length;spawnDrone();const d=G.drones.length>n0?G.drones[G.drones.length-1]:null;if(d){d.x=s.x+rand(-20,20);d.y=T(s.x)-30}}log('Bunker guardians woke up — the noise carried','bad')}
if(s.stock<=0&&!s.collapsed){log(`${nm} stripped bare — it comes down`,'warn');siteCollapse(s,'stripped')}}
{const got=sweepSalvage(e.tgt.x,L);if(got)e.label+=` (+${got} wreck${got>1?'s':''} picked up)`}
if(e.tgt.kind==='site'&&e.loadsTaken){const tab=SITE_GEAR[e.tgt.s.type]||{};for(let q=0;q<e.loadsTaken;q++)for(const g in tab)if(Math.random()<tab[g])L[g]=(L[g]||0)+1}
packLoot(e,L);e.loot=L;
for(const m of e.members)if(m.alive)m.state='back';
}
function packLoot(e,L){
const ms=e.members.filter(m=>m.alive&&m.state==='work');e.packed={};const left=[];const keep=e.site&&!e.site.collapsed;
for(const k of ['water','fuel','ammo','scrap','equip',...WPN_ORDER,'pick','armor']){if(!L[k])continue;let amt=Math.floor(L[k]+Math.random());if(amt<=0)continue;
const st=ITEMS[k].stack,unit=st>=6?Math.min(st,Math.ceil(amt/Math.max(1,ms.length))):1;let i=0,stuck=0;
while(amt>0&&ms.length&&stuck<ms.length){const m=ms[i++%ms.length],got=invAdd(m,k,Math.min(unit,amt));if(got>0){amt-=got;e.packed[k]=(e.packed[k]||0)+got;stuck=0}else stuck++}
if(amt>0){left.push(`${amt} ${k}`);if(keep&&!ITEMS[k].gear)e.site.cache[k]=(e.site.cache[k]||0)+amt}}
for(const it of L.gearItems||[]){const m=ms.find(m=>m.inv.length<PACK);if(m){giveGear(m,it);e.packed[it.k]=(e.packed[it.k]||0)+1}else left.push(gearLabel(it))}
e.leftover=left.join(', ');
}
function packSummary(e){const p=e.packed||{};return Object.keys(p).filter(k=>p[k]>0).map(k=>ITEMS[k].gear?`+${p[k]} ${ITEMS[k].name.toLowerCase()}`:`+${Math.round(p[k])} ${k}`).join(', ')}
function killInside(e,k,msg){let how='';for(const m of e.members){if(k<=0)break;if(m.alive&&!m.hurt){how=hurtMember(m);k--}}log(`${msg} — a looter was ${how==='hit'?'bruised':how||'hurt'}`,'bad')}
function applyLoot(L,share,label,site){
const parts=[],left=[],kept=site&&!site.collapsed;const cap=G.caps;
for(const k of ['scrap','fuel','ammo','equip','water']){if(!L[k])continue;const amt=Math.floor(L[k]*share+Math.random());if(amt<=0)continue;
const room=cap[k]?Math.max(0,Math.floor(cap[k]-(G.res[k]||0))):0,got=Math.min(amt,room);G.res[k]+=got;if(k==='scrap')G.tel.scrapIn+=got;if(k==='fuel'&&got){const src=site?'site loot':/forag/i.test(label||'')?'forage':'other';G.tel.fuelIn[src]=(G.tel.fuelIn[src]||0)+got}if(got)parts.push(`+${got} ${k}`);
if(amt>got){left.push(`${amt-got} ${k}`);if(kept)site.cache[k]=(site.cache[k]||0)+amt-got}}
if(L.crew){for(let q=0;q<L.crew;q++)addCrew({kit:[['water',1]]});G.tel.crewGained+=L.crew;parts.push(`+${L.crew} crew`)}
if(L.wagon){if(G.train.cars.length>=8){left.push('a wagon (train at max length)')}else{const c=makeCar(L.wagon);preDamage(c,rand(.6,1));G.train.cars.push(c);parts.push(`+${CARS[L.wagon].name} (damaged)`)}}
log(`${label}: ${parts.join(', ')||'nothing useful'}${left.length?` · ${kept?'left at the site':'left behind'}: ${left.join(', ')} — no storage`:''}`,parts.length?'good':'warn');
}
function unitScrapAvailable(c){
if((G.vehicles||[]).includes(c)){
let s=Math.floor(c.scrap||0);
for(const it of (c.inv||[]))if(it.k==='scrap')s+=Math.floor(it.n);
for(const m of [c.pilot,...(c.passengers||[])])if(m&&m.alive)s+=Math.floor(invCount(m,'scrap'));
return s;
}
return Math.floor(G.res.scrap||0)}
function consumeUnitScrap(c){
if((G.vehicles||[]).includes(c)){
if((c.scrap||0)>=1){c.scrap-=1;return true}
const si=(c.inv||[]).findIndex(x=>x.k==='scrap'&&x.n>=1);
if(si>=0){c.inv[si].n-=1;if(c.inv[si].n<=1e-6)c.inv.splice(si,1);return true}
for(const m of [c.pilot,...(c.passengers||[])])if(m&&m.alive&&invCount(m,'scrap')>=1){invTake(m,'scrap',1);return true}
return false;
}
if(G.res.scrap<1)return false;
G.res.scrap--;return true}
function repairRegion(c,r){
if(G.state!=='play'&&G.state!=='leg')return;
if(unitScrapAvailable(c)<1){log((G.vehicles||[]).includes(c)?'No onboard scrap on this aircraft (max 2) — loot a site or dock on your carrier':'No scrap — scavenge ruins or salvage equipment [X]','bad');return}
if(c.regInt[r]>.995&&!c.regFire[r]){log('That region is already intact','warn');return}
if(!consumeUnitScrap(c))return;
let budget=c.regMax[r]*CFG.repairPerScrap;
const wet=c.wet||(c.wet=new Float32Array(c.n));
for(let k=0;k<c.n;k++)if(c.reg[k]===r){c.fire[k]=0;c.rust[k]=0;wet[k]=CFG.wetTime;if(c.mat[k]){const mx=MAXHP[c.mat[k]],add=Math.min(budget,mx-c.hp[k]);c.hp[k]+=add;budget-=add}}
for(let j=c.h-1;j>=0&&budget>0;j--)for(let i=0;i<c.w&&budget>0;i++){const k=j*c.w+i;if(c.reg[k]===r&&!c.mat[k]&&c.omat[k]){c.mat[k]=c.omat[k];const mx=MAXHP[c.mat[k]],add=Math.min(budget,mx);c.hp[k]=add;budget-=add}}
G.tel.scrapOut++;G.stats.repairs++;updateRegions(c);G.hudSig='';G.crewHtml='';if(G.state==='leg'){computeCaps();renderStation()}
const rc=c.regCount||8,cx=rc===3?(r+.5)*c.w/3:(r%4+.5)*c.w/4,cy=rc===3?c.h/2:r<4?c.d.split/2:(c.d.split+c.h)/2,p=toWorld(c,cx,cy);
for(let i=0;i<14;i++)spawn(p[0]+rand(-5,5),p[1]+rand(-3,3),rand(-50,50),rand(-70,-10),rand(.2,.5),[180,220,255],1,'spark');
if(!G.quietLog)log(`Repaired ${c.d.name} ${c.d.roles[r]} → ${Math.round(c.regInt[r]*100)}%`,'good');
}
function repairFull(c,r){
if(G.state!=='play'&&G.state!=='leg')return;
if(c.regInt[r]>.995&&!c.regFire[r]){log('That section is already intact','warn');return}
if(unitScrapAvailable(c)<1){log((G.vehicles||[]).includes(c)?'No onboard scrap on this aircraft (max 2) — loot a site or dock on your carrier':'No scrap — scavenge ruins or salvage equipment [X]','bad');return}
let used=0;while((c.regInt[r]<.995||c.regFire[r])&&unitScrapAvailable(c)>=1&&used<4){G.quietLog=true;repairRegion(c,r);G.quietLog=false;used++}
log(`Repaired ${c.d.name} ${c.d.roles[r]} → ${Math.round(c.regInt[r]*100)}% (${used} scrap)`,'good');
}
function sectionClick(c,r){
if(c.regInt[r]<.995||c.regFire[r]){repairFull(c,r);return}
const ro=c.d.roles[r],A=ROLES[ro]&&ROLES[ro].act;
if(A&&G.state==='play'){A(c,r);return}
log(`${c.d.name} ${ro} is intact`,'');
}
function quickRepair(){
if(G.piloting&&(G.vehicles||[]).includes(G.piloting)){
const c=G.piloting,rc=c.regCount||3;let br=-1,bv=2;
for(let r=0;r<rc;r++){if(c.regMax[r]===0)continue;const v=c.regInt[r]-(c.alive[r]?0:1)-(c.regFire[r]?.5:0);if(v<bv&&(c.regInt[r]<.98||c.regFire[r])){bv=v;br=r}}
if(br>=0)repairFull(c,br);else log('Aircraft is intact — nothing needs repair','warn');
return;
}
let best=null,bv=2;
for(const c of G.train.cars)for(let r=0;r<8;r++){if(c.regMax[r]===0)continue;let v=c.regInt[r]-(c.alive[r]?0:1)-(c.regFire[r]?.5:0);if(c===G.train.cars[0])v-=.2;if(G.leak&&c.d.roles[r]==='FUEL'&&!c.alive[r])v-=2;   if(v<bv&&(c.regInt[r]<.98||c.regFire[r])){bv=v;best=[c,r]}}
if(best)repairFull(best[0],best[1]);else log('Nothing needs repair','warn');
}
