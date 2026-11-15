/* =====================================================================
   CONTROL (v3.25) — the player drives the train OR flies one of the train's own aircraft, and
   switches between them. One rule for every section ability:
     • click a section that is 100% → its ability switches on (or you take control);
     • the ability keeps working while the section stays at or above CFG.abilityKeep (70%);
     • a damaged section is repaired by the click instead (the old rule).
   Abilities: CAB → auto drive · CANNON → auto gunner · DECK → launch / fly the deck's aircraft
   (all DECK sections at 100%) · SEATS → send that car's crew looting.
   A deck carries ONE aircraft (CARS[type].bay: the carrier a plane, the helipad a helicopter).
   Launching takes a pilot from the crew and fills the aircraft from the train (gas from fuel, ammo).
   Land softly on your own deck to refuel, re-arm and repair it (scrap). [J] ejects: the pilot
   parachutes down and walks back like a looter (and can be shot on the way); you take over the
   nearest unit. A crash with the pilot aboard kills them.
   ===================================================================== */
const wrapA=a=>a-2*Math.PI*Math.round(a/(2*Math.PI));
function resolveAirType(base){
if(G.sim&&G.sim.air)return FORGE_ID;
const ids=Object.keys(BLUEPRINTS).filter(id=>BLUEPRINTS[id]&&BLUEPRINTS[id].base===base&&CUSTOM[id]);
return ids.length?ids[ids.length-1]:base}
function bayOf(car){if(!car||!car.d.roles.includes('DECK'))return null;
const want=resolveAirType(car.d.bay||'plane');
if(!car.bay)car.bay={type:want,state:'parked',unit:null,gas:0,ammo:0,scrap:0};
else if(car.bay.state==='parked'&&car.bay.type!==want&&(!car.bay.unit||car.bay.unit.type!==want)){car.bay.type=want;car.bay.unit=null}
return car.bay}
function deckLevel(car){let lo=1;car.d.roles.forEach((ro,r)=>{if(ro==='DECK')lo=Math.min(lo,car.regInt[r])});return lo}
function ownFlyers(){return (G.vehicles||[]).filter(v=>v.carrierPlane&&v.state!=='down'&&((v.pilot&&v.pilot.alive)||v.lootingHold||(G.exp&&G.exp.craft===v)))}
function bayService(car){
const bay=bayOf(car),u=bay.unit,parts=[];
if(u&&G.res.scrap>=1){let used=0;for(let r=0;r<(u.regCount||3);r++)while(u.regMax[r]&&u.regInt[r]<.995&&G.res.scrap>=1&&used<6){G.quietLog=true;repairRegion(u,r);G.quietLog=false;used++}
if(used)parts.push(`repaired (${used} scrap)`)}
const vc=vehCaps(u||bay.type),want=vc.gas-(bay.gas||0),fuel=Math.max(0,Math.min(G.res.fuel,want/CFG.gasPerFuel));
if(fuel>.01){G.res.fuel-=fuel;bay.gas=(bay.gas||0)+fuel*CFG.gasPerFuel;parts.push(`+${Math.round(fuel*CFG.gasPerFuel)} gas (−${fuel.toFixed(1)} fuel)`)}
const capS=vc.shots,need=Math.ceil((capS-(bay.ammo||0))/CFG.airShotsPerAmmo),take=Math.max(0,Math.min(need,G.res.ammo|0));
if(take>0){G.res.ammo-=take;bay.ammo=Math.min(capS,(bay.ammo||0)+take*CFG.airShotsPerAmmo);parts.push(`+${take} ammo`)}
const needSc=Math.max(0,CFG.airScrapCap-(bay.scrap||0)),takeSc=Math.min(needSc,Math.floor(G.res.scrap||0));
if(takeSc>0){G.res.scrap-=takeSc;bay.scrap=(bay.scrap||0)+takeSc;parts.push(`+${takeSc} scrap`)}
return parts.join(' · ')}
function canWinchBay(car){
const bay=bayOf(car);if(!bay||bay.state!=='air')return false;
const u=bay.unit;if(!u||!(G.vehicles||[]).includes(u)||u.state==='down')return false;
const grounded=u.parkedOnGround||u.landed||u.vkind==='mole';
return grounded&&Math.abs(u.cxw-car.ax)<=CFG.winchReach&&Math.abs(G.train.v)<=5;
}
function startWinchBay(car){
const bay=bayOf(car);if(!bay||bay.state!=='air')return false;
const u=bay.unit;if(!u||!(G.vehicles||[]).includes(u)||u.state==='down')return false;
const dist=Math.round(Math.abs(u.cxw-car.ax));
if(Math.abs(G.train.v)>5){log(`Stop the train (speed ${Math.round(Math.abs(G.train.v))}) next to your ${u.d.name.toLowerCase()} to winch it aboard`,'warn');return false}
if(dist>CFG.winchReach){log(`${u.d.name} is parked ${dist} m away — drive the ${car.d.name.toLowerCase()} within ${CFG.winchReach} m and stop to winch it aboard, or press [Tab] to control it`,'warn');return false}
if(bay.winching){log(`Already winching ${u.d.name.toLowerCase()} onto the deck (${bay.winchT.toFixed(1)}s left)…`,'');return true}
if(G.exp&&G.exp.craft===u){
G.exp.craft=null;G.exp.resolved=true;
for(const m of G.exp.members)if(m.alive&&m.state!=='in')m.state='back';
log(`Recalled looter from ${u.d.name.toLowerCase()} to board the train directly`,'warn');
}
u.lootingHold=false;u.parkedOnGround=true;u.player=false;u.vx=0;u.vy=0;
if(G.piloting===u)setControl(null);
bay.winching=true;bay.winchT=CFG.winchTime;bay.winchStart=[u.ax,u.ay];
sfx('clack',.8,car.ax);G.hudSig='';
log(`Winching ${u.d.name.toLowerCase()} onto the ${car.d.name.toLowerCase()} deck (${CFG.winchTime.toFixed(0)}s) — hold position…`,'good');
return true;
}
function winchTick(dt){
if(!G.train)return;
for(const car of G.train.cars){
const bay=car.bay;if(!bay||!bay.winching)continue;
const u=bay.unit;
if(!u||!(G.vehicles||[]).includes(u)||u.state==='down'){bay.winching=false;bay.winchT=0;G.hudSig='';continue}
if(Math.abs(G.train.v)>8||Math.abs(u.cxw-car.ax)>CFG.winchReach+35){
bay.winching=false;bay.winchT=0;u.parkedOnGround=true;G.hudSig='';
log(`Winch cable released — the train moved away from the ${u.d.name.toLowerCase()}`,'bad');continue;
}
bay.winchT-=dt;
const p=toWorld(car,car.w*.62,car.d.split*.75),t=1-clamp(bay.winchT/CFG.winchTime,0,1),s=t*t*(3-2*t);
const x0=bay.winchStart?bay.winchStart[0]:u.ax,y0=bay.winchStart?bay.winchStart[1]:u.ay;
u.ax=lerp(x0,p[0],s);u.ay=lerp(y0,p[1]-1,s);u.pitch=lerp(u.pitch||0,0,dt*8);u.ang=-u.fx*u.pitch;u.vx=0;u.vy=0;vehPose(u);
if(Math.random()<dt*12)spark(p[0]+rand(-6,6),p[1],rand(-25,25),rand(-35,-5),.2,[255,210,120],1);
if(bay.winchT<=0){
bay.winching=false;bay.winchT=0;
const idx=G.vehicles.indexOf(u);if(idx>=0)G.vehicles.splice(idx,1);
landOnDeck(u);G.hudSig='';
}
}
}
function launchBay(car){
const bay=bayOf(car);if(!bay)return;
if(bay.state==='air'){
const u=bay.unit;if(!u||!(G.vehicles||[]).includes(u)||u.state==='down')return;
if(u.parkedOnGround||u.landed||u.vkind==='mole'){
if(canWinchBay(car)){startWinchBay(car);return}
if(!G.piloting&&Math.abs(u.cxw-car.ax)>CFG.winchReach){
log(`${u.d.name} is parked ${Math.round(Math.abs(u.cxw-car.ax))} m away — stop the train next to it and click DECK to winch it aboard (2s), or press [Tab] to pilot it`,'warn');return;
}
}
setControl(u);log(`Back in the ${u.d.name.toLowerCase()}`,'good');return;
}
if(bay.state==='lost'){log(`The ${car.d.name.toLowerCase()}'s unit was lost — a new one at the next station`,'bad');return}
const lo=deckLevel(car);if(lo<.995){log(`Repair every DECK section to 100% to launch (weakest ${Math.round(lo*100)}%)`,'warn');return}
if(crewOnTrain()<2){log('Need 2+ crew aboard — one flies, one stays to drive','bad');return}
const cands=partyCands();const m=cands[0];if(!m){log('Nobody fit to fly — the injured can\'t, and one crew member must stay to drive','bad');return}
const done=bayService(car);
if((bay.gas||0)<2){log('Not enough fuel on the train to fuel the aircraft (2 gas = 0.4 fuel)','bad');return}
const fresh=!bay.unit,c=bay.unit||makeCar(bay.type);
c.vkind=c.vkind||(isAirBase(c.d.base)?c.d.base:AIR[c.type]?c.type:c.d.vkind||'plane');c.inv=c.inv||[];c.lootingHold=false;c.pilot=null;c.passengers=[];c.enemy=false;c.carrierPlane=true;c.home=car;c.state='attack';c.test=false;c.ejected=false;c.landed=false;c.passes=0;c.cool=.3;c.burst=0;c.bt=0;c.bombCool=0;c.bombKs=[[],[]];c.away=false;
const plane=c.vkind==='plane',mole=c.vkind==='mole',p=toWorld(car,car.w*.62,car.d.split*.75);c.fx=1;c.ax=p[0];c.ay=mole?groundY(p[0])+2:p[1]-1;c.ang=0;c.pitch=0;c.pr=0;
vehPose(c);updateRegions(c);if(fresh||!c.fc)airInit(c);else{c.ctl={thr:1,pitch:0,coll:0,drag:0};c.massT=0;airMassProps(c)}
c.vx=plane?Math.max(G.train.v+CFG.catapultV,AIR.plane.vTrim*.9):mole?c.fx*14:G.train.v;c.vy=plane?-48:mole?16:-10;if(plane)c.pitch=.32;c.ang=-c.fx*c.pitch;vehPose(c);c.launchT=plane?1.6:1.2;c.lever=1;c.rollT=0;
c.gas=bay.gas;c.scrap=bay.scrap||0;c.ammoPool=bay.ammo;c.shots=c.ammoPool;c.bombs=Math.floor(c.ammoPool/CFG.airShotsPerAmmo);bay.gas=0;bay.scrap=0;bay.ammo=0;bay.state='air';bay.unit=c;
c.pilot=m;m.task=null;if(!m.body)bodyFromHp(m);m.where='out';m.state='fly';m.x=c.cxw;
const deckUp=car.d.roles.some((ro,r)=>ro==='DECK'&&car.lvl[r]>0)||c.d.roles.includes('SEATS');
if(deckUp&&crewOnTrain()>=3&&cands[1]){const m2=cands[1];m2.task=null;if(!m2.body)bodyFromHp(m2);m2.where='out';m2.state='fly';m2.x=c.cxw;c.passengers.push(m2);c.pax=m2}
crewSync();
G.vehicles=G.vehicles||[];G.vehicles.push(c);setControl(c);G.tel.sorties=(G.tel.sorties||0)+1;
for(let i=0;i<14;i++)spawn(p[0]+rand(-14,14),p[1],rand(-30,30)-G.train.v*.3,rand(-30,-5),rand(.5,1.1),[200,196,188],2,'smoke');sfx('gun',.5,p[0]);
log(`${m.name}${c.passengers.length?' + '+c.passengers.map(x=>x.name).join(', '):''} ${mole?'rolls out in':'takes off in'} the ${c.d.name.toLowerCase()} (${Math.round(c.gas)} gas · ${c.ammoPool} rounds${done?' · '+done:''}). ${plane?'[W] accelerate · [S] slow down · [A] nose up · [D] nose down · [R] roll':mole?'[A/D] drive · [S] dig down · [W] climb':'[W/S] up/down · [A/D] move · [R] turn'} · ${mole?'[Space] seismic charge · [E] unload · drive back onto the rig to dock':'[Space] gun · [B] bomb · [J] eject'} · [Tab] switch`,'good');
return c}
function syncCarrierDeck(car,u){
if(!car||!u)return;const dks=[];car.d.roles.forEach((ro,r)=>{if(ro==='DECK')dks.push(r)});
for(let b=0;b<Math.min(3,dks.length);b++){const r=dks[b],f=clamp(u.regInt[b]??1,0,1);
for(let k=0;k<car.n;k++)if(car.reg[k]===r&&car.omat[k]){if(f<=.02){car.mat[k]=0;car.hp[k]=0}else{car.mat[k]=car.omat[k];car.hp[k]=MAXHP[car.mat[k]]*f}}}
car.dirtyPaint=1;updateRegions(car)}
function unloadVehicleToTrain(c){
if(!c||!c.inv||!c.inv.length)return '';
G.stash=G.stash||[];const got=[];
for(const it of c.inv.slice()){
if(ITEMS[it.k]?.gear){
const taker=(G.crew||[]).find(m=>m.alive&&m.where!=='out'&&!has(m,it.k)&&(!ITEMS[it.k].wpn||!weaponOf(m))&&m.inv.length<PACK);
if(taker&&giveGear(taker,it)){c.inv.splice(c.inv.indexOf(it),1);got.push(`${gearLabel(it)} → ${taker.name}`)}
else if(G.stash.length<TRAIN_STASH_SLOTS){c.inv.splice(c.inv.indexOf(it),1);G.stash.push(it);got.push(`${gearLabel(it)} → stash`)}
}else{
const k=it.k,room=Math.max(0,(G.caps[k]||0)-(G.res[k]||0)),put=k==='fuel'||k==='water'?Math.min(it.n,room):Math.min(Math.floor(it.n),Math.floor(room+1e-6));
if(put>0){G.res[k]=(G.res[k]||0)+put;it.n-=put;if(k==='scrap')G.tel.scrapIn+=put;if(k==='fuel')G.tel.fuelIn.carried=(G.tel.fuelIn.carried||0)+put;G.tel.stowed=(G.tel.stowed||0)+put;got.push(`+${Math.round(put)} ${k}`);if(it.n<=1e-6)c.inv.splice(c.inv.indexOf(it),1)}
}
}
return got.join(', ');
}
function landOnDeck(c){
const car=c.home,bay=bayOf(car);bay.state='parked';bay.unit=c;bay.gas=c.gas||0;bay.scrap=c.scrap||0;bay.ammo=c.ammoPool||0;
for(const m0 of [c.pilot,...(c.passengers||[])])if(m0&&m0.alive)stowNow(m0);
const cargoDone=unloadVehicleToTrain(c);syncCarrierDeck(car,c);
c.player=false;c.state='parked';c.vx=0;c.vy=0;c.pr=0;c.pitch=0;c.rollT=0;
const m=c.pilot;c.pilot=null;if(m&&m.alive){boardMember(m,car);m.xp=(m.xp||0)+.25}
for(const px of (c.passengers||[])){if(px&&px.alive){boardMember(px,car);px.xp=(px.xp||0)+.25}}
c.passengers=[];
if(c.pax&&!G.crew.includes(c.pax)){const px=c.pax;c.pax=null;const nm=addCrew({name:px.name,hp:px.hurt?rand(3,5):10,kit:[['water',1]]});boardMember(nm,car);G.tel.crewGained++;log(`Airlifted survivor ${nm.name} joined the train crew!`,'good')}else c.pax=null;
if(G.piloting===c)setControl(null);G.tel.landings=(G.tel.landings||0)+1;
const p=toWorld(car,car.w*.62,car.d.split*.75);for(let i=0;i<10;i++)spark(p[0]+rand(-10,10),p[1],rand(-60,60),rand(-40,-5),rand(.15,.35),[255,220,150],1);sfx('crash',.25,p[0]);
const done=[cargoDone,bayService(car)].filter(Boolean).join(' · ');syncCarrierDeck(car,c);log(`Docked on the ${car.d.name.toLowerCase()} (plane boxes ${[0,1,2].map(i=>Math.round((c.regInt[i]||0)*100)+'%').join('/')})${done?' — '+done:''}`,'good')}
function deckTouch(c,car,k){
if(!c.carrierPlane||car!==c.home||c.state==='down'||!(c.pilot&&c.pilot.alive))return false;
if(car.d.roles[car.reg[k]]!=='DECK')return false;
const rel=c.vx-carVel(car),up=Math.abs(wrapA(c.pitch))<CFG.deckLandPitch;
if(deckLevel(car)<CFG.abilityKeep){if(G.t>(c.deckMsg||0)){c.deckMsg=G.t+3;log(`The deck is too damaged to land on (weakest DECK ${Math.round(deckLevel(car)*100)}% < ${Math.round(CFG.abilityKeep*100)}%)`,'bad')}return false}
if(Math.abs(rel)<CFG.deckLandV&&c.vy<CFG.deckLandVy&&up)return true;
if(G.t>(c.deckMsg||0)){c.deckMsg=G.t+2;log(`Too ${!up?'steep':c.vy>=CFG.deckLandVy?'hard':'fast'} for the deck (${!up?Math.round(wrapA(c.pitch)*57)+'°':c.vy>=CFG.deckLandVy?'sink '+Math.round(c.vy):'+'+Math.round(Math.abs(rel))+' vs the train'}) — go around`,'warn')}
return false}
function setControl(u){
if(u&&u.carrierPlane&&(!u.pilot||!u.pilot.alive)&&!u.lootingHold&&!(G.exp&&G.exp.craft===u)){log('Cockpit empty — the aircraft cannot be controlled until its pilot boards','warn');u=null}
const prev=G.piloting;
if(prev&&prev!==u){
prev.player=false;
if((G.vehicles||[]).includes(prev)&&prev.state!=='down'&&!prev.lootingHold&&prev.pilot){
const onGround=prev.landed||(groundY(prev.cxw)-prev.cyw<16&&Math.abs(prev.vx)<18);
if(onGround){prev.parkedOnGround=true;prev.landed=true;prev.test=false;prev.state='parkedGround';prev.vx=0;prev.vy=0;prev.pr=0;prev.lever=0;prev.ctl.thr=0;prev.ctl.coll=0;prev.ctl.rate=0}
else{prev.parkedOnGround=false;prev.test=true;prev.state='attack'}
}
}
G.piloting=u||null;
if(u){
u.player=!!(u.pilot&&u.pilot.alive&&!u.lootingHold);u.test=false;
if(u.parkedOnGround||u.landed){u.lever=0;if(u.ctl)u.ctl.thr=0}else u.lever=u.lever??(u.ctl&&u.ctl.thr)??1;
}
G.hudSig='';G.crewHtml=''}
function nearestControl(x){
let best=null,bd=1e9;for(const c of G.train.cars)bd=Math.min(bd,Math.abs(c.x-x));
for(const v of ownFlyers()){const d=Math.abs(v.cxw-x);if(d<bd){bd=d;best=v}}return best}
function cycleControl(){
if(G.cameraPilot)G.cameraPilot=null;
const list=[null,...ownFlyers()];
if(list.length<2){
if(G.piloting){setControl(null);log('Switched back to the train','good');return}
log('Nothing else to control — launch an aircraft from a DECK (click it at 100%)','');return}
const i=list.indexOf(G.piloting),nx=list[(i+1)%list.length];setControl(nx);
log(nx?(nx.lootingHold?`Viewing parked ${nx.d.name.toLowerCase()} (looter outside)`:nx.parkedOnGround?`Back in the parked ${nx.d.name.toLowerCase()} — hold [W] to take off`:`You fly the ${nx.d.name.toLowerCase()}`):'You drive the train — landed aircraft stay parked; airborne aircraft fly on autopilot',nx?'good':'')}
function toggleCarrierFlight(){
if(G.cameraPilot)G.cameraPilot=null;
if(G.piloting){const wasGrounded=G.piloting.landed||G.piloting.parkedOnGround;setControl(null);log(wasGrounded?'You drive the train — the aircraft stays parked where you left it. [V] or [Tab] to switch back':'You drive the train — the aircraft circles on autopilot. [V] or [Tab] to fly it again','');return}
const air=ownFlyers();if(air.length){const u=air.reduce((a,b)=>Math.abs(b.cxw-G.train.cars[0].x)<Math.abs(a.cxw-G.train.cars[0].x)?b:a);setControl(u);log(`Back in the ${u.d.name.toLowerCase()}`,'good');return}
const decks=G.train.cars.filter(c=>bayOf(c));if(!decks.length){log('Need a FLIGHT CARRIER or HELIPAD wagon to fly','bad');return}
launchBay(decks.find(c=>bayOf(c).state==='parked')||decks[0])}
function playerAirControl(c,dt){
if(!c.pilot||!c.pilot.alive||c.lootingHold){c.ctl.thr=0;c.ctl.coll=0;c.ctl.rate=0;return true}
if(airShotDown(c)){c.ctl.thr=0;c.ctl.coll=0;c.ctl.rate=0;return true}
const k=G.keys,ctl=c.ctl;
if(c.parkedOnGround){
if(k.KeyW||k.ArrowUp){c.parkedOnGround=false;c.state='attack'}
else{ctl.thr=0;ctl.coll=0;ctl.rate=0;return true}
}
if(c.vkind==='plane'){
const up=k.KeyW||k.ArrowUp,down=k.KeyS||k.ArrowDown,noseUp=k.KeyA||k.ArrowLeft,noseDown=k.KeyD||k.ArrowRight;
c.lever=clamp((c.lever??1)+((up?1:0)-(down?1:0))*CFG.pilotThrRate*dt,0,1);
ctl.thr=c.lever;ctl.drag=down&&c.lever<=0?1:0;ctl.rate=(noseUp?1:0)-(noseDown?1:0);
}else{
const R=k.KeyD||k.ArrowRight,L=k.KeyA||k.ArrowLeft,U=k.KeyW||k.ArrowUp,D=k.KeyS||k.ArrowDown;
const f=c.fc,need=c.am*CFG.airG/Math.max(30,c.Rmax*Math.max(.2,f.rotor))/Math.max(.5,Math.cos(c.pitch));
ctl.coll=clamp(need+(U?.4:D?-.35:c.vy*.012),0,1);ctl.pitch=R?-.38*c.fx:L?.38*c.fx:0;ctl.drag=0;
if(L&&!R&&c.vx<12&&c.fx>0)c.fx=-1;if(R&&!L&&c.vx>-12&&c.fx<0)c.fx=1;
}
c.cool=(c.cool||0)-dt;
if((k.Space||G.mouse.down)&&c.cool<=0&&c.fc.wpn>0&&(c.ammoPool||0)>=1){
const pt=c.pts.nose||c.pts.gun||[c.w-2,Math.round(c.h*.5)],gp=toWorld(c,pt[0],pt[1]),a=c.ang;
G.shots.push({x:gp[0],y:gp[1],vx:Math.cos(a)*c.fx*240+c.vx*.3,vy:Math.sin(a)*c.fx*240+c.vy*.3,kind:'pbullet',air:true,dmg:28,why:'aircraft cannon',life:1.6});
c.ammoPool-=1;c.shots=c.ammoPool;c.bombs=Math.floor(c.ammoPool/CFG.airShotsPerAmmo);c.cool=.11*(c.pax||c.passengers?.length?CFG.copilotReload:1);sfx('shot',.9,gp[0])}
c.bombCool=(c.bombCool||0)-dt;
if((k.KeyB||G.mouse.rdown)&&c.bombCool<=0&&c.fc.wpn>0&&(c.ammoPool||0)>=CFG.airShotsPerAmmo){
const pt=c.pts.bay||[Math.round(c.w*.48),c.h-2],bay=toWorld(c,pt[0],pt[1]);
G.shots.push({x:bay[0],y:bay[1]+2,vx:c.vx*.85,vy:c.vy+20,kind:'bomb',src:'playerAir',own:c,life:5});
c.ammoPool-=CFG.airShotsPerAmmo;c.shots=c.ammoPool;c.bombs=Math.floor(c.ammoPool/CFG.airShotsPerAmmo);c.bombCool=.6;sfx('tink',.6,bay[0])}
if(c.carrierPlane&&c.gas<3&&!c.gasMsg){c.gasMsg=1;log(c.gas<=0?'Out of gas — glide it to the deck':'Low gas — head back to the deck','warn')}
return true;
}
function rollFlyer(){
const c=G.piloting;if(!c||c.state==='down'||!c.pilot)return;
if(c.vkind==='plane'){if(!(c.rollT>0)){c.rollT=CFG.rollTime;c.rollDone=false}}
else{const cx=c.cxw,cy=c.cyw;c.fx=-c.fx;c.pitch=-c.pitch;c.pr=-c.pr;c.ang=-c.fx*c.pitch;vehPose(c);c.ax+=cx-c.cxw;c.ay+=cy-c.cyw;vehPose(c)}}
function rollStep(c,dt){
if(!(c.rollT>0))return 1;c.rollT=Math.max(0,c.rollT-dt);const p=1-c.rollT/CFG.rollTime;
if(p>=.5&&!c.rollDone){c.rollDone=true;const cx=c.cxw,cy=c.cyw;c.fx=-c.fx;c.pitch=wrapA(Math.PI-c.pitch);c.pr=-c.pr;c.ang=-c.fx*c.pitch;vehPose(c);c.ax+=cx-c.cxw;c.ay+=cy-c.cyw;vehPose(c)}
return Math.max(.1,Math.abs(Math.cos(p*Math.PI)))}
function ejectPilot(){
const c=G.piloting;if(!c){log('[J] ejects the pilot of the aircraft you fly — you are driving the train','');return}
const crewList=[c.pilot,...(c.passengers||[])].filter(m=>m&&m.alive);
c.pilot=null;c.passengers=[];c.pax=null;c.player=false;c.ejected=true;c.lootingHold=false;c.ctl.thr=0;c.ctl.coll=0;c.ctl.rate=0;
c.inv=c.inv||[];
const onGround=!!c.landed&&groundY(c.cxw)-c.cyw<25;
crewList.forEach((m,idx)=>{
m.where='out';m.task=null;if(!m.body)bodyFromHp(m);
for(const it of c.inv.slice()){
const got=inventoryAddTo(m.inv,it.k,it.n,PACK,it);
if(got>0){it.n-=got;if(it.n<=1e-6)c.inv.splice(c.inv.indexOf(it),1)}
}
if(c.gas>0){const want=c.gas/CFG.gasPerFuel,got=invAdd(m,'fuel',want);c.gas=Math.max(0,c.gas-got*CFG.gasPerFuel)}
if((c.ammoPool||0)>0){const want=c.ammoPool/CFG.airShotsPerAmmo,got=invAdd(m,'ammo',want);c.ammoPool=Math.max(0,c.ammoPool-got*CFG.airShotsPerAmmo);c.shots=c.ammoPool;c.bombs=Math.floor(c.ammoPool/CFG.airShotsPerAmmo)}
if((c.scrap||0)>=1){const got=invAdd(m,'scrap',Math.floor(c.scrap));c.scrap=Math.max(0,c.scrap-got)}
m.state=onGround?'back':'chute';m.ejectedPilot=true;m.x=c.cxw+idx*4;m.gy=onGround?groundY(m.x):clamp(c.cyw-4,12,groundY(m.x)-6);m.vx=onGround?0:c.vx*.45;m.vy=onGround?0:-40;m.chT=0;m.walkS=0;m.ph=rand(0,6);
G.strays=G.strays||[];G.strays.push(m);G.tel.ejects=(G.tel.ejects||0)+1;
if(idx===0)G.cameraPilot=onGround?null:m;
});
if(crewList.length){log(onGround?`${crewList.map(m=>m.name).join(' & ')} climbed out and started walking back to the train`:`${crewList.map(m=>m.name).join(' & ')} ejected — parachute deployed ([Tab] switches to train)`,'warn');sfx('tink',.8,c.cxw)}
if(onGround){const i=G.vehicles.indexOf(c);if(i>=0)G.vehicles.splice(i,1);const b=c.home&&bayOf(c.home);if(b){b.state='lost';b.unit=null}dropVehicleCargo(c);dropSalvage(c.cxw,c.vkind,c.vkind==='heli'?'helicopter wreck':'plane wreck')}
else c.state='down';
const nx=nearestControl(c.cxw);setControl(nx===c?null:nx);if(G.piloting)log(`You take the ${G.piloting.d.name.toLowerCase()}`,'');
}
function outsideCrew(){
const a=G.exp?G.exp.members.filter(m=>m.alive&&(m.state==='out'||m.state==='back')):[];
for(const m of G.strays||[])if(m.alive&&(m.state==='chute'||m.state==='back'))a.push(m);return a}
function strayTick(dt){
const S2=G.strays;if(!S2||!S2.length)return;const cars=G.train.cars;
for(let i=S2.length-1;i>=0;i--){const m=S2[i];if(!m.alive||m.where!=='out'){if(G.cameraPilot===m)G.cameraPilot=null;S2.splice(i,1);continue}
let best=cars[0],bd=1e9;for(const c of cars){const d=Math.abs(c.x-m.x);if(d<bd){bd=d;best=c}}
if(m.state==='chute'){m.chT=(m.chT||0)+dt;
if(m.chT<.45)m.vy+=CFG.airG*2*dt;else m.vy+=(CFG.chuteFall-m.vy)*Math.min(1,dt*3);
m.vx+=((G.wind||0)*.6-m.vx)*Math.min(1,dt*CFG.chuteDrag);m.x+=m.vx*dt;m.gy+=m.vy*dt;
const roof=roofAt(m.x);if(!m.ejectedPilot&&roof!=null&&m.vy>0&&m.gy>=roof&&m.gy<roof+8){if(G.cameraPilot===m)G.cameraPilot=null;S2.splice(i,1);boardMember(m,best);log(`${m.name} landed on the train roof`,'good');continue}
const gy=groundY(m.x);if(m.gy>=gy){m.gy=gy;m.state='back';m.vx=0;if(G.cameraPilot===m)G.cameraPilot=null;const dist=Math.abs(best.x-m.x),eta=Math.ceil(dist/(CFG.crewWalk*4));log(`${m.name} touched down — returning to the train (about ${eta}s)`,'good')}
continue}
m.ph+=dt*(m.hurt?4:8);m.walkS=Math.sin(m.ph)>0?1:0;
if(bd>CFG.crewLostDist&&!m.ejectedPilot){if(G.cameraPilot===m)G.cameraPilot=null;S2.splice(i,1);killMember(m);log(`${m.name} was left behind`,'bad');continue}
const returnBoost=m.ejectedPilot?4:1;m.x+=Math.sign(best.x-m.x)*CFG.crewWalk*(m.hurt?.5:1.2)*returnBoost*dt;
if(Math.abs(best.x-m.x)<best.w/2-2){if(G.cameraPilot===m)G.cameraPilot=null;S2.splice(i,1);boardMember(m,best);if(m.ejectedPilot)m.task={kind:'returnLoot',stage:0,t:0};if(m.hurt)G.tel.injured=(G.tel.injured||0)+1;log(m.ejectedPilot?`${m.name} is back aboard — unloading recovered cargo`:`${m.name} is back aboard`,'good')}}
}
function baysAtStation(){
for(const car of G.train.cars){const b=car.bay;if(!b)continue;
if(b.state==='air'){const u=b.unit;b.state='parked';if(u){b.gas=u.gas||0;b.scrap=u.scrap||0;b.ammo=u.ammoPool||0;u.player=false;u.state='parked';u.pilot=null}}
else if(b.state==='lost'){b.state='parked';b.unit=null;b.gas=0;b.scrap=0;b.ammo=0}}
G.piloting=null;G.cameraPilot=null;G.strays=[]}
function setGunner(on,msg){if(!!G.gunner===!!on)return;G.gunner=!!on;G.hudSig='';log(msg||(on?`Auto gunner on — the cannon fires at drones and aircraft by itself (slower than you; off below ${Math.round(CFG.abilityKeep*100)}%)`:'Auto gunner off'),on?'good':'warn')}
function cannonTarget(range,ox,oy){
let best=null,bd=1e9;
for(const v of G.vehicles||[])if(v.enemy&&!v.player&&v.state!=='down'){const d=Math.hypot(v.cxw-ox,v.cyw-oy);if(d<bd){bd=d;best={x:v.cxw,y:v.cyw,vx:v.vx,vy:v.vy}}}
for(const d of G.drones)if(!d.dead){const dd=Math.hypot(d.x-ox,d.y-oy);if(dd<bd){bd=dd;best=d}}
return best&&bd<range?best:null}
function cannonAim(t){const c=G.caps.cannon,tp=c.pts.turret,p=toWorld(c,tp[0],tp[1]),tt=Math.hypot(t.x-p[0],t.y-p[1])/CFG.shellSpeed;return[t.x+(t.vx-G.train.v)*tt,t.y+t.vy*tt-27*tt*tt,p]}
function gunnerTick(){
const c=G.caps.cannon,r=c?c.d.roles.indexOf('CANNON'):-1;
if(!c||c.regInt[r]<CFG.abilityKeep){setGunner(false,'Cannon damaged — auto gunner off');return}
if(G.gunCool>0||G.res.ammo<1||crewOnTrain()<1)return;
const tp=toWorld(c,c.pts.turret[0],c.pts.turret[1]),t=cannonTarget(CFG.gunnerRange,tp[0],tp[1]);if(!t)return;
const a=cannonAim(t),d=Math.hypot(a[0]-tp[0],a[1]-tp[1]),e=d*CFG.gunnerSpread;a[0]+=rand(-e,e);a[1]+=rand(-e,e);
for(const v of ownFlyers()){const L=Math.max(1,d),u=clamp(((v.cxw-tp[0])*(a[0]-tp[0])+(v.cyw-tp[1])*(a[1]-tp[1]))/(L*L),0,1);if(Math.hypot(tp[0]+(a[0]-tp[0])*u-v.cxw,tp[1]+(a[1]-tp[1])*u-v.cyw)<26)return}
fireGun(a);G.gunCool*=CFG.gunnerCool}
ROLES.CAB.act=(c,r)=>{
if(G.piloting){setControl(null);log('You have the train — the aircraft circles on autopilot','');return}
if(G.cruise){setCruise(false,'Auto drive off');return}
if(G.dev.auto){log('The autopilot is driving — switch it off in the Playtest panel first','warn');return}
setCruise(true,`Auto drive on — full speed, stops for crew outside, obstacles and the station; off when you brake, reverse, click the cab, or the cab drops below ${Math.round(CFG.abilityKeep*100)}%`)};
ROLES.CANNON.act=()=>setGunner(!G.gunner);
ROLES.DECK.act=(c)=>launchBay(c);
ROLES.SEATS.act=(c)=>{if(G.exp){tryExpedition();return}
const seated=c.occ.reduce((a,v)=>a+v,0);if(!seated){log(`Nobody is seated in the ${c.d.name.toLowerCase()}`,'warn');return}tryExpedition(c)};
ROLES.CAB.actHelp='auto drive on/off (works while the cab is 70%+); while you fly, it gives you the train back.';
ROLES.CANNON.actHelp='auto gunner on/off — fires at drones and aircraft by itself (70%+).';
ROLES.DECK.actHelp='with every DECK section at 100%: launch and fly its aircraft (a crew member pilots it). Land softly on it to refuel, re-arm and repair.';
ROLES.SEATS.actHelp='send this car\'s crew looting.';
function cellTag(c,r){
const ro=c.d.roles[r];
if(ro==='CAB'&&G.cruise)return'AUTO';
if(ro==='CANNON'&&G.gunner&&G.caps.cannon===c)return'AUTO';
if(ro==='DECK'&&c.bay){
const b=c.bay,s=b.state,u=b.unit;
if(s==='parked')return'ON BD';
if(s==='lost')return'LOST';
if(b.winching)return`W ${Math.max(0,b.winchT).toFixed(1)}`;
if(canWinchBay(c))return'LOAD';
if(u&&(u.parkedOnGround||u.landed||u.lootingHold))return'MISS';
return G.piloting===u?'FLY':'AIR';
}
return null}
function planeExpedition(c){
if(!c)return;
if(G.exp&&G.exp.craft===c){tryExpedition();return}
if(!c.landed||Math.abs(c.vx)>6){log('Land using the white WHEEL pixels and stop before pressing [E] (or land on your carrier deck)','warn');return}
if(G.exp){log('Another looting party is already outside — wait or recall them first','warn');return}
c.passengers=(c.passengers||[]).filter(x=>x&&x.alive);
const aboard=[c.pilot,...c.passengers].filter(x=>x&&x.alive);
if(!aboard.length){log('No crew aboard — an empty cockpit cannot be controlled or sent looting','bad');return}
const tgt=findTargetAt(c.cxw,c.w/2);if(!tgt){log('Nothing in reach of the landed aircraft — taxi closer to a site, wreck or obstacle','warn');return}
c.inv=c.inv||[];
const members=aboard.length>=2?c.passengers.splice(0,Math.max(1,Math.floor(aboard.length/2))):[c.pilot];
if(!c.passengers.length)c.pax=null;
const pilotLeft=members.includes(c.pilot);
if(pilotLeft){c.lootingHold=true;c.holdX=c.cxw;c.holdY=c.cyw;c.player=false;c.state='looting';c.ctl.thr=0;c.ctl.coll=0;c.ctl.rate=0;c.pilot=null}
let dry=0;
for(const m of members){
transferPackToVehicle(m,c);
for(const want of [...WPN_ORDER,'armor','pick']){
if((ITEMS[want]?.wpn?weaponOf(m):has(m,want))||m.inv.length>=PACK)continue;
const gi=c.inv.findIndex(x=>x.k===want);if(gi>=0)giveGear(m,c.inv.splice(gi,1)[0]);
}
if(invCount(m,'water')<1){const wi=c.inv.findIndex(x=>x.k==='water'&&x.n>0);if(wi>=0){const w=invAdd(m,'water',Math.min(1,c.inv[wi].n));c.inv[wi].n-=w;if(c.inv[wi].n<=1e-6)c.inv.splice(wi,1)}}
m.x=c.cxw+rand(-3,3);m.task=null;if(!m.body)bodyFromHp(m);m.where='out';m.state='out';m.alive=true;m.ph=rand(0,6);m.walkS=0;m.hurt=false;
if(invCount(m,'water')<=0)dry++;
}
const n=members.length,spd=1/(1+.25*(n-1));
const work=(tgt.kind==='site'?SITES[tgt.s.type].work*(1+CFG.lootDepthWork*siteDepth(tgt.s)):tgt.kind==='clear'?3+tgt.o.hp/50:tgt.kind==='wreck'?5:tgt.kind==='salvage'?CFG.salvageTime:CFG.forageTime)*spd;
G.exp={tgt,members,t:0,work,resolved:false,loot:null,carriers:0,thirst:dry/n,craft:c,pilot:pilotLeft?members[0]:null};
if(tgt.kind==='site'){const st=tgt.s;G.exp.tearRate=Math.min(n,st.stock)/Math.max(1,st.stock0)*(1-CFG.collapseAt-.06)*(st.cells0||0)*CFG.lootTear/work}
G.hudSig='';G.crewHtml='';
log(`${members.map(m=>m.name).join(' & ')} step${n===1?'s':''} out of the ${c.d.name.toLowerCase()} to loot (${tgt.kind==='site'?SITES[tgt.s.type].name.toLowerCase():tgt.kind}) — ${pilotLeft?'cockpit empty (aircraft locked until pilot returns)':'pilot stays at the controls'} · [E] recall`,'good');
}
function flightPrompt(){
const c=G.piloting;if(!c||!(G.vehicles||[]).includes(c))return'';
if(G.exp&&G.exp.craft===c){const e=G.exp,st=e.resolved?'returning to aircraft':e.members.some(m=>m.alive&&m.state==='out')?'walking out':`looting ${Math.max(0,e.work-e.t).toFixed(0)}s`;return `${c.d.name} · ${c.lootingHold?'COCKPIT EMPTY (LOOTER OUT)':'CO-PILOT LOOTING'} — ${st}<small>[E] recall looter to aircraft · [Tab] switch view to train · cargo ${(c.inv||[]).length}/${VEHICLE_PACK}</small>`}
if(c.vkind==='mole'){const dep=Math.max(0,Math.round(c.cyw-groundY(c.cxw))),nearBu=(G.world.buried||[]).find(b=>!b.looted&&Math.abs(b.x-c.cxw)<90);return`${c.d.name} · DEPTH ${dep} m · GAS ${Math.max(0,c.gas).toFixed(1)} · SCRAP ${Math.floor(c.scrap||0)}/${CFG.airScrapCap} · CHARGES ${c.ammoPool|0} · CARGO ${(c.inv||[]).length}/${VEHICLE_PACK}${nearBu?` · SONAR: ${nearBu.name} (${Math.round(nearBu.x-c.cxw)}m, depth ${nearBu.dep}m)`:''}<small>[S/↓] drill deeper · [W/↑] drill up to surface · [A/D] bore left/right · [Space] seismic blast charge · [E] loot surface · [Tab] switch to train (click DECK when stopped nearby to winch aboard in 2s)</small>`}
const plane=c.vkind==='plane',alt=Math.round(groundY(c.cxw)-c.cyw),inv=plane&&Math.cos(c.pitch)<-.2,stall=plane&&Math.abs(c.aoa||0)>.5;
const w=[c.state==='down'?'GOING DOWN — [J] EJECT':'',c.lootingHold||!c.pilot?'NO PILOT IN COCKPIT':'',stall?'STALL':'',inv?'INVERTED — [R] roll':'',c.carrierPlane&&c.gas<=0?'NO GAS — glide to the deck':c.carrierPlane&&c.gas<3?'LOW GAS':'',plane&&(c.vf||0)<CFG.pilotCtrlV*.6&&!c.landed?'SLOW — soft controls':''].filter(Boolean);
const landHint=c.landed&&Math.abs(c.vx)<=6?` · LANDED: press [E] to send looter`:'';
return `${c.d.name}${plane?` · THR ${Math.round((c.ctl.thr||0)*100)}%`:''}${c.carrierPlane?` · GAS ${Math.max(0,c.gas).toFixed(1)} · SCRAP ${Math.floor(c.scrap||0)}/${CFG.airScrapCap}`:''} · AMMO ${c.ammoPool|0} · SPD ${Math.round(plane?c.vf||0:Math.abs(c.vx))} · ALT ${alt}${w.length?' · '+w.join(' · '):''}${landHint}<small>${plane?'[W] accelerate · [S] slow down · [A] nose up · [D] nose down · [R] roll':'[W/S] up/down · [A/D] move · [R] turn'} · [Space] gun · [B] bomb · [E] loot when landed · [J] eject · [Tab] switch</small>`}
