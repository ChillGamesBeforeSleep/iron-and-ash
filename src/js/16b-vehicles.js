/* =====================================================================
   VEHICLES (v3.17) — enemy machines built from pixels exactly like wagons:
   a unit definition in CARS (size, regions, points, a paint function = texture + MATERIAL layers),
   made with makeCar(), kept in G.vehicles and added to G.all — so every engine system already
   works on them: damage and blasts, fire and smoke, falling-off parts, debris, glow, see-through.
   What a vehicle adds is a BRAIN (a small state machine) and a MOTION mode (here: air).
   First vehicle: the ATTACK PLANE — strafes the train with its nose gun, drops its 2 bombs,
   turns for another pass, then flies off to re-arm and comes back. Shot down, it spins
   in, crashes and leaves a wreck the crew can salvage (scrap, ammo, equipment).
   ===================================================================== */
const VEH={
plane:{shots:'planeShots',bombs:'planeBombs',speed:'planeSpeed',salvage:{scrap:3,ammo:6,equip:1},wreck:'plane wreck'},
};
function vehPose(c){c.co=Math.cos(c.ang);c.si=Math.sin(c.ang);const p=toWorld(c,c.w/2,c.h/2);c.cxw=p[0];c.cyw=p[1];c.x=c.ax}
function trainMid(){const cs=G.train.cars,a=cs[0],b=cs[cs.length-1];return (a.x+a.w/2+b.x-b.w/2)/2}
const AIRKIT={plane:{shots:'planeShots',bombs:'planeBombs',name:'Attack plane'},heli:{shots:'heliShots',bombs:null,name:'Gunship helicopter'},drone:{shots:'pxDroneShots',bombs:null,name:'Drone'},mole:{shots:'planeShots',bombs:'planeBombs',name:'Tunnel driller'},tank:{shots:'planeShots',bombs:null,name:'Raider tank'}};
function spawnAir(kind,fromRight,type){
if(!G.vehicles)G.vehicles=[];if(fromRight===undefined)fromRight=Math.random()<.5;
if(!type&&CFG.customFlyers&&!G.sim){const own=Object.keys(BLUEPRINTS).filter(id=>CARS[id]&&CARS[id].vkind===kind&&CUSTOM[id]);if(own.length&&Math.random()<CFG.customFlyers)type=pick(own)}
const c=type?makeCar(type):makeCar(kind,false);c.enemy=true;c.vkind=kind;c.fx=fromRight?-1:1;
{const cs=G.train.cars,f=cs[0].x+cs[0].w/2,r=cs[cs.length-1].x-cs[cs.length-1].w/2;c.ax=fromRight?Math.max(G.camX+S.W,f)+180:Math.min(G.camX,r)-180}
c.ay=groundY(c.ax)-(kind==='plane'?CFG.planeAlt:CFG.heliAlt);c.vx=kind==='plane'?c.fx*AIR.plane.vTrim+G.train.v*.5:G.train.v*.5;c.vy=0;c.ang=0;
const K=AIRKIT[kind];c.shots=c.d.roles.includes('WEAPON')?CFG.airAmmoCap*CFG.airShotsPerAmmo:CFG[K.shots];c.bombs=c.d.roles.includes('WEAPON')?CFG.airAmmoCap:(K.bombs?CFG[K.bombs]:0);c.state='attack';c.passes=0;c.cool=1.2;c.burst=0;c.bt=0;c.bombCool=0;
c.bombKs=[[],[]];if(kind==='plane')for(let k=0;k<c.n;k++){if(c.mat[k]!==M.AMMO)continue;const j=(k/c.w)|0,i=k%c.w;if(j>=c.h*.72)c.bombKs[i<c.w*.455?0:1].push(k)}
vehPose(c);updateRegions(c);airInit(c);G.vehicles.push(c);
if(kind!=='drone'){log(`${type?c.d.name:K.name} incoming from the ${fromRight?'front':'rear'}!`,'bad');sfx('bad')}
return c}
function spawnPlane(fromRight){return spawnAir('plane',fromRight)}
function moleStep(c,dt){
const f=airCaps(c);updateRegions(c);
if(c.integrity<CFG.planeDownAt||!f.pilot){return 'crash'}
/* v3.43 — the driller is a tracked machine, not a flying hole-punch.
   · It RESTS on ground: with nothing under the tracks it falls until it lands.
   · On the surface the tracks follow the terrain like any crawler.
   · Underground it only moves along its own body axis, so the DRILL HEAD always leads and the tunnel is cut at the head —
     the hull never passes through earth that has not been drilled. [S] tips the head down, [W] up; the tracks grip its own ramp.
   · Cutting is slower than rolling through an open tunnel. [Shift] drills carefully (needed to vent gas pockets). */
const k=G.keys,ctl=c.player&&c.pilot&&c.pilot.alive&&!c.lootingHold;
let R=0,L=0,U=0,D=0,slow=0;if(ctl){R=k.KeyD||k.ArrowRight;L=k.KeyA||k.ArrowLeft;U=k.KeyW||k.ArrowUp;D=k.KeyS||k.ArrowDown;slow=k.ShiftLeft||k.ShiftRight}
if(L&&!R)c.fx=-1;else if(R&&!L)c.fx=1;
const thr=((L||R||U||D)&&c.gas>0)?1:0,drv=CFG.drillSpeed*(.4+.6*f.eng)*(c.digK||1)*(slow?.45:1);
const half=c.w*.3,sr=surfaceY(c.ax-half),sf=surfaceY(c.ax+half),onTop=Math.abs(c.ay-(sr+sf)/2)<6&&!D;
let vx=0,vy=0,cutting=false;
if(onTop){
c.fallV=0;c.ang=lerp(c.ang||0,Math.atan2(sf-sr,half*2),Math.min(1,dt*8));c.pitch=-c.fx*c.ang;
if(thr&&(L||R)){vx=c.fx*drv*1.5*Math.cos(c.ang);c.parkedOnGround=false}
c.ax=clamp(c.ax+vx*dt,30,G.world.W-30);c.ay=(surfaceY(c.ax-half)+surfaceY(c.ax+half))/2;vehPose(c);
}else{
c.ang=-c.fx*(c.pitch||0);vehPose(c);
const probe=d=>{for(const u of [.22,.5,.78]){const p=toWorld(c,c.w*u,c.h+d);if(solidAt(p[0],p[1]))return true}return false};
const firm=probe(1.5),held=firm||probe(5)||solidAt(c.cxw,c.cyw);
if(!held){
/* nothing under the tracks: it drops */
c.fallV=Math.min(280,(c.fallV||0)+320*dt);c.ay+=c.fallV*dt;c.pitch=lerp(c.pitch||0,0,Math.min(1,dt*3));vy=c.fallV;
let g=0;while(g++<14&&solidAt(c.ax,c.ay-1))c.ay-=1;
}else{
if((c.fallV||0)>110){sfx('crash',Math.min(.7,c.fallV/400),c.ax);G.shake+=c.fallV/90;for(let i=0;i<10;i++)spawn(c.ax+rand(-c.w*.4,c.w*.4),c.ay,rand(-30,30),rand(-40,-8),rand(.3,.7),[92,84,72],2,'dust')}
c.fallV=0;if(!firm)c.ay+=Math.min(3,70*dt);
c.pitch=lerp(c.pitch||0,D?((L||R)?-.62:-.95):U?.6:0,Math.min(1,dt*4));
if(thr){c.parkedOnGround=false;c.ang=-c.fx*c.pitch;vehPose(c);
const tip=toWorld(c,c.w+2,c.h*.6);cutting=solidAt(tip[0],tip[1]);
const v=cutting?drv:drv*1.5,ux=c.fx*c.co,uy=c.fx*c.si;vx=ux*v;vy=uy*v;
c.ax=clamp(c.ax+vx*dt,30,G.world.W-30);c.ay=Math.min(G.world.H-14,c.ay+vy*dt);vehPose(c);
/* the cut happens at the drill head, and the spoil is thrown back along the tunnel */
const head=toWorld(c,c.w-2,c.h*.6);craterGround(head[0],head[1],c.h*.44,95,-ux*34,-24,true);
if(cutting){c.drillT=.14;c.dirtyPaint=1;addLight(head[0],head[1],24,.65,.08,'255,210,130');G.shake+=dt*1.4;
if(Math.random()<dt*26)spawn(head[0]+rand(-3,3),head[1]+rand(-5,5),-ux*rand(20,70)+rand(-20,20),-uy*rand(20,70)-rand(5,40),rand(.15,.4),[255,rand(190,235),130],1,'spark');
if(Math.random()<dt*16)sfx('chuff',.3,head[0])}
else if(Math.random()<dt*9){const rear=toWorld(c,2,c.h);spawn(rear[0],rear[1]-1,-ux*rand(8,24),rand(-22,-6),rand(.3,.6),[88,80,70],2,'dust')}
}}
c.ang=-c.fx*(c.pitch||0);vehPose(c);
}
if(c.drillT>0){c.drillT-=dt;c.dirtyPaint=1}
if(ctl&&c.cyw>groundY(c.cxw)+4){const hl=toWorld(c,c.w+8,c.h*.55);addLight(hl[0],hl[1],44,.38,.06,'255,222,170')}
c.vx=vx;c.vy=vy;c.phase=(c.phase||0)+c.fx*Math.hypot(vx,vy)*dt/2.2;
if(thr)c.gas=Math.max(0,c.gas-dt*CFG.gasBurn*(cutting?1:.55));
if(ctl){c.cool=(c.cool||0)-dt;
if((k.Space||G.mouse.down)&&c.cool<=0&&f.wpn>0&&(c.ammoPool||0)>=1){
const pt=c.pts.nose||[c.w-2,8],gp=toWorld(c,pt[0],pt[1]);
craterGround(gp[0]+c.fx*6,gp[1],9,130,c.fx*55,-20,true);
c.ammoPool=Math.max(0,c.ammoPool-1);c.shots=c.ammoPool;c.cool=.22;sfx('boom',.45,gp[0]);G.shake+=1.5;
}}
const gy=groundY(c.cxw);
c.landed=(c.ay<=gy+4);
const sp=Math.hypot(c.vx,c.vy);
for(const bu of G.world.buried||[]){
if(bu.looted||Math.hypot(c.cxw-bu.x,c.cyw-bu.y)>bu.r+(bu.kind==='gas'?8:14))continue;
if(bu.kind==='gas'){
if(c.fires>0||sp>CFG.drillSpeed*.82){igniteGasPocket(bu,'high-speed drill friction');continue}
bu.looted=true;craterGround(bu.x,bu.y,bu.r,60,0,0,true);
c.inv=c.inv||[];const n=inventoryAddTo(c.inv,'fuel',BURIED.gas.reward.fuel,VEHICLE_PACK);
log(`Carefully vented gas pocket & condensed +${Math.round(n)} fuel! (High speed or [Space] blast ignites gas pockets)`,'good');sfx('loot',.8,bu.x);continue;
}
if(bu.kind==='bunker'){
const guard=(G.world.subTurrets||[]).find(t=>t.alive&&t.bunker===bu);
if(guard&&!guard.awake){guard.awake=true;sfx('bad',.8,guard.x);log('Bunker defense turret activated! Destroy it with [Space] seismic blast or drill ram!','bad')}
}
bu.looted=true;craterGround(bu.x,bu.y,bu.r+3,130,0,-20,true);
c.inv=c.inv||[];const got=[];
const B=BURIED[bu.kind]||BURIED.fuel,reward={...B.reward};if(B.gear)reward.gear=pick(B.gear);
if(reward.scrap&&(c.scrap||0)<CFG.airScrapCap){const addS=Math.min(reward.scrap,CFG.airScrapCap-Math.floor(c.scrap||0));c.scrap=(c.scrap||0)+addS;reward.scrap-=addS;if(addS)got.push(`+${addS} onboard scrap`)}
for(const rk of ['scrap','equip','ammo','fuel'])if(reward[rk]>0){const n=inventoryAddTo(c.inv,rk,reward[rk],VEHICLE_PACK);if(n>0)got.push(`+${Math.round(n)} ${rk}`)}
if(reward.gear){const n=inventoryAddTo(c.inv,reward.gear,1,VEHICLE_PACK);if(n>0)got.push(`+${ITEMS[reward.gear].name}`)}
sfx('loot',1,bu.x);G.hudSig='';G.crewHtml='';
log(`Excavated ${bu.name}: ${got.join(', ')||'cargo full'}! Return to the surface & winch aboard the Excavator Rig`,'good');
}
/* v3.40: the driller launches touching its own rig, so 'landed next to home' was true on frame one and it re-docked instantly.
   It now has to leave first: dig below the surface or drive clear of the rig. */
if(!c.away&&(c.cyw>gy+9||(c.home&&Math.abs(c.home.ax-c.cxw)>(c.home.w+c.w)*.62)))c.away=true;
for(const tr of G.train.cars){if(tr===c.home&&c.away&&c.landed&&Math.abs(tr.ax-c.cxw)<(tr.w+c.w)*.45&&Math.abs(tr.ay-c.ay)<20&&Math.abs(c.vx-G.train.v)<18)return 'landed'}
return true;
}
function tankStep(c,dt){
const f=airCaps(c);updateRegions(c);
if(c.integrity<CFG.planeDownAt||!f.pilot)return 'crash';
const mid=trainMid(),dx=mid-c.ax,d=Math.abs(dx);
c.fx=dx>=0?1:-1;
const wantV=d>135?c.fx*AIR.tank.vMax*(.4+.6*f.eng)*(c.driveK||1):d<65?-c.fx*AIR.tank.vMax*.5:G.train.v*.6;
c.vx=lerp(c.vx||0,wantV,Math.min(1,dt*3.5));
c.ax=clamp(c.ax+c.vx*dt,30,G.world.W-30);
const xr=c.ax-c.w*.35,xf=c.ax+c.w*.35,yr=surfaceY(xr),yf=surfaceY(xf);
c.ang=Math.atan2(yf-yr,xf-xr);c.ay=(yr+yf)/2;c.phase=(c.phase||0)+c.vx*dt/3;vehPose(c);
c.cool=(c.cool||2)-dt;
if(c.cool<=0&&d<290&&f.wpn>0&&(c.shots||0)>0){
c.shots--;c.cool=rand(2.6,3.8)/Math.sqrt(G.diff);
const pt=c.pts.gun||[c.w-2,5],gp=toWorld(c,pt[0],pt[1]),tgt=pick(G.train.cars),aim=toWorld(tgt,tgt.w*.5,tgt.h*.5);
const dist=Math.hypot(aim[0]-gp[0],aim[1]-gp[1]),tt=dist/210,a=Math.atan2(aim[1]-27*tt*tt-gp[1],aim[0]+G.train.v*tt-gp[0])+rand(-.04,.04);
G.shots.push({x:gp[0],y:gp[1],vx:Math.cos(a)*210,vy:Math.sin(a)*210,kind:'rpg',why:'raider tank shell',dmg:85,life:2.5});
sfx('gun',.9,gp[0]);addLight(gp[0],gp[1],22,.9,.1,'255,200,120');
for(let i=0;i<6;i++)spawn(gp[0],gp[1],Math.cos(a)*rand(25,70),Math.sin(a)*rand(25,70),.2,[255,210,130],1,'spark');
}
if(d>S.W*1.6&&c.shots<=0)return false;
return true;
}
function vehicleTick(dt){
if(!G.vehicles)G.vehicles=[];G.planeBack=G.planeBack||[];
winchTick(dt);subTurretTick(dt);
for(let i=G.planeBack.length-1;i>=0;i--)if(G.t>=G.planeBack[i].t){const back=G.planeBack.splice(i,1)[0];if(G.state==='play'&&!G.dev.calm){const p=spawnAir(back.kind||'plane');p.sorties=back.sorties+1;log(`The ${AIRKIT[p.vkind].name.toLowerCase()} is back — re-armed`,'bad')}}
for(let i=G.vehicles.length-1;i>=0;i--){const c=G.vehicles[i];
if(c.home&&c.home.bay&&c.home.bay.winching&&c.home.bay.unit===c)continue;
if(c.vkind==='tank'){
const tr=tankStep(c,dt);
if(tr==='crash'){airCrash(c);G.vehicles.splice(i,1)}
else if(tr===false)G.vehicles.splice(i,1);
continue;
}
if(c.vkind==='mole'){
const mr=moleStep(c,dt);
if(mr==='crash'){airCrash(c);G.vehicles.splice(i,1)}
else if(mr==='landed'){G.vehicles.splice(i,1);landOnDeck(c)}
continue;
}
if(c.lootingHold||c.parkedOnGround){
airCaps(c);updateRegions(c);
if(c.integrity<CFG.planeDownAt||!c.fc.pilot){c.state='down';airCrash(c);G.vehicles.splice(i,1);continue}
if(c.parkedOnGround){
c.ctl.thr=0;c.ctl.coll=0;c.ctl.rate=0;c.ctl.pitch=0;c.vx*=Math.pow(.04,dt);if(Math.abs(c.vx)<1)c.vx=0;c.vy=0;c.pr=0;c.pitch*=Math.pow(.1,dt);
c.ay=Math.min(c.ay,groundY(c.cxw)-.5);vehPose(c);c.landed=true;
for(const tr of G.train.cars){if(Math.abs(tr.ax-c.cxw)<(tr.w+c.w)*.46&&Math.abs(tr.ay-c.ay)<22&&deckTouch(c,tr,0)){G.vehicles.splice(i,1);landOnDeck(c);break}}
}
continue;
}
const keep=c.player?playerAirControl(c,dt):(c.vkind==='plane'?planeBrain(c,dt):rotorBrain(c,dt));
if(keep===false){G.vehicles.splice(i,1);continue}
const r=airStep(c,dt);
if(r==='crash'){airCrash(c);G.vehicles.splice(i,1);continue}
if(r==='landed'){G.vehicles.splice(i,1);landOnDeck(c);continue}
if((c.cxw<-200||c.cxw>G.world.W+200)&&(c.state==='leave'||c.cxw<-1000||c.cxw>G.world.W+1000))G.vehicles.splice(i,1);
}
}
function airShotDown(c){
if(c.state==='down')return true;const f=c.fc||airCaps(c);
const dead=c.integrity<CFG.planeDownAt||!f.pilot||(c.vkind==='plane'?(f.wing<.35||(f.eng===0&&f.tail===0)):f.rotor<.35);
if(dead&&(c.player||c.carrierPlane)){c.state='down';c.parkedOnGround=false;if(!c.ejected){log(`Your ${c.vkind==='heli'?'helicopter':'plane'} is critically damaged (<50%) — losing control! [J] eject`,'bad');sfx('crash',.6,c.cxw)}return dead}
if(dead){c.state='down';G.stats.kills++;G.tel.kills++;G.tel.planesDowned=(G.tel.planesDowned||0)+1;log(`${AIRKIT[c.vkind].name} hit — it's going down!`,'good');sfx('crash',.6,c.cxw)}
return dead}
function airCrash(c){
c.state='down';c.player=false;c.lootingHold=false;c.parkedOnGround=false;
if(G.exp&&G.exp.craft===c){G.exp.craft=null;for(const m of G.exp.members)if(m.alive&&m.state!=='in'){m.ejectedPilot=true;m.state='back'}}
if(c.player||c.carrierPlane){const b=c.home&&bayOf(c.home);if(b&&b.unit===c){b.state='lost';b.unit=null}
for(const m of [c.pilot,...(c.passengers||[])]){if(m&&m.alive){killMember(m);log(`${m.name} went down with the ${c.d.name.toLowerCase()}`,'bad')}}
c.pilot=null;c.passengers=[];c.pax=null;
if(G.piloting===c){G.piloting=null;G.cameraPilot=null;const nx=nearestControl(c.cxw);setControl(nx===c?null:nx)}
log(`Your ${c.d.name.toLowerCase()} crashed — a wreck to salvage${c.carrierPlane?', a new one at the next station':''}`,'bad')}
craterGround(c.cxw,Math.max(c.cyw,groundY(c.cxw)+1),c.vkind==='drone'?4.5:7.5,c.vkind==='drone'?60:95,c.vx||0,c.vy||0,false);
killCar(c);sfx('crash',.9,c.cxw);addLight(c.cxw,c.cyw,32,.9,.3,'255,160,60');
if(c.state!=='down'&&c.enemy){G.stats.kills++;G.tel.kills++}
dropVehicleCargo(c);dropSalvage(c.cxw,c.vkind,c.vkind==='drone'?'drone wreck':c.vkind==='heli'?'helicopter wreck':'plane wreck');
if(c.vkind!=='drone'&&c.enemy)log(`The ${AIRKIT[c.vkind].name.toLowerCase()} crashed — a wreck to salvage`,'good');G.shake+=c.vkind==='drone'?3:8;G.hudSig='';G.crewHtml=''}
function botTier(c){if(c.aiLvl)return c.aiLvl;if(CFG.botIntellect>0)return clamp(CFG.botIntellect|0,1,3);return G.leg<=2?1:G.leg<=4?2:3}
function pickAirTarget(c,cs,gp,range){
const lv=botTier(c);let best=null,bs=-1e9;
for(const car of cs){const d=Math.hypot(car.x-gp[0],car.cyw-gp[1]);const ahead=c.vkind==='plane'?(car.x-gp[0])*c.fx>10:true;if(!ahead||d>range)continue;
let sc=-d;if(lv>=2){if(car.d.roles.includes('CANNON'))sc+=140;if(car.d.roles.includes('FUEL'))sc+=90;if(car.d.base==='loco')sc+=80}
if(lv>=3)sc+=(1-car.integrity)*220+(car.fires>0?120:0);
if(sc>bs){bs=sc;best=car}}
return best}
function airGun(c,ptName,range,sp,src){
if(c.fc&&c.fc.wpn<=0)return;
const pt=c.pts[ptName]||c.pts.nose||c.pts.gun||[c.w-2,Math.round(c.h*.5)],gp=toWorld(c,pt[0],pt[1]),cs=G.train.cars,lv=botTier(c),tgt=pickAirTarget(c,cs,gp,range);
c.cool-=1/60;if(tgt&&c.shots>0&&c.cool<=0&&c.burst<=0){c.burst=Math.min(4,c.shots);c.cool=rand(.6,.9)*(lv===3?.75:lv===2?.88:1)}
if(c.burst>0&&(c.bt-=1/60)<=0){c.burst--;c.shots--;if(c.ammoPool!==undefined)c.ammoPool=Math.max(0,c.ammoPool-1);c.bt=.1;
const aim=tgt?toWorld(tgt,rand(4,tgt.w-4),rand(3,tgt.h-6)):[gp[0]+c.fx*80,gp[1]+30],tt=tgt?Math.hypot(aim[0]-gp[0],aim[1]-gp[1])/sp:0;
const leadX=lv===1?0:lv===2?(G.train.v-c.vx*.3)*tt*.65:(G.train.v-c.vx*.3)*tt,spr=lv===1?.085:lv===2?.035:.01;
const a=Math.atan2(aim[1]-gp[1],aim[0]+leadX-gp[0])+rand(-spr,spr);
G.shots.push({x:gp[0],y:gp[1],vx:Math.cos(a)*sp+c.vx*.3,vy:Math.sin(a)*sp+c.vy*.3,kind:'bullet',src,life:1.6});sfx('shot',.9,gp[0]);spark(gp[0],gp[1],c.fx*30,0,.1,[255,220,150],1)}}
function airGunAtEjectedPilot(c,dt,range,sp,src){
const gp=toWorld(c,c.pts.nose?.[0]??c.w-2,c.pts.nose?.[1]??Math.round(c.h*.5));
let target=null,bd=1e9;
for(const m of outsideCrew()){
if(!m.alive||!m.ejectedPilot||m.state==='in'||m.state==='fly')continue;
const dx=(m.x+.5)-gp[0],dy=(baseY(m)-5)-gp[1],d=Math.hypot(dx,dy);
if(dx*c.fx<-12||d>range||d>=bd)continue;target=m;bd=d;
}
if(!target)return false;
c.walkerCool=(c.walkerCool||0)-dt;
if(c.walkerCool<=0&&c.shots>0){
const aimX=target.x+.5,aimY=baseY(target)-5,a=Math.atan2(aimY-gp[1],aimX-gp[0])+rand(-.035,.035);
G.shots.push({x:gp[0],y:gp[1],vx:Math.cos(a)*sp+c.vx*.3,vy:Math.sin(a)*sp+c.vy*.3,kind:'bullet',src,life:1.8});
c.shots--;c.walkerCool=rand(1.1,1.7);sfx('shot',.6,gp[0]);
}
return true;
}
function planeBrain(c,dt){
const ctl=c.ctl,mid=trainMid(),len=trainLen(),gy=groundY(c.cxw),dir=c.fx;
if(airShotDown(c)){ctl.thr=c.fc.eng>0&&!c.ejected?.4:0;ctl.pitch=c.pitch;
if(Math.random()<dt*25)spawn(c.cxw,c.cyw,rand(-8,8),rand(-20,-5),rand(1.5,3),[60,56,52],2,'smoke');return true}
const armed=c.test||c.shots>0||c.bombs>0;
if(c.state==='turn'){ctl.thr=.75;ctl.pitch=1.25;if(c.vf<22||c.pitch>1.15&&c.vf<35){c.fx=-dir;c.pitch=CFG.flipPitch;c.pr=0;c.vx=c.fx*Math.abs(c.vx)*CFG.flipKeep;c.state='attack';c.passes++}return true}
let tY=gy-(c.climbOut?CFG.planeAlt+45:c.state==='attack'&&armed&&!c.test?CFG.planeAttackAlt:CFG.planeAlt+(c.test?0:40));
if(Math.abs(c.cxw+c.vx*.6-mid)<len/2+70){let top=1e9;for(const k of G.train.cars)top=Math.min(top,k.ay-k.h);tY=Math.min(tY,top-c.h/2-CFG.planeClear)}
if(botTier(c)>=3){const sh=G.shots.find(s=>s.kind==='shell'&&Math.hypot(s.x-c.cxw,s.y-c.cyw)<95);if(sh)tY+=(sh.y>c.cyw?-36:30)}
const eh=c.cyw-tY;c.altI=clamp((c.altI||0)+eh*dt,-60,60);
ctl.thr=clamp(1-(c.vf-CFG.planeSpeed)*.03,.25,1);ctl.pitch=clamp(eh*CFG.planeHoldP+c.altI*CFG.planeHoldI-c.vy*CFG.planeHoldD+.06,-.5,.55);
if(c.state==='attack'){
if(!c.test&&!airGunAtEjectedPilot(c,dt,260,205,'plane'))airGun(c,'nose',230,210,'plane');
c.bombCool-=dt;if(!c.test&&c.bombs>0&&c.bombCool<=0){const bay=toWorld(c,c.pts.bay[0],c.pts.bay[1]);if(G.train.cars.some(car=>Math.abs(car.x-(bay[0]+c.vx*.45))<car.w/2-4)){const g=c.bombKs[CFG.planeBombs-c.bombs]||[];for(const k of g)c.mat[k]=0;
G.shots.push({x:bay[0],y:bay[1]+1,vx:c.vx*.85,vy:c.vy+15,kind:'bomb',src:'plane',life:5});c.bombs--;if(c.ammoPool!==undefined){c.ammoPool=Math.max(0,c.ammoPool-CFG.airShotsPerAmmo);c.shots=c.ammoPool}c.bombCool=.7;sfx('tink',.5,bay[0])}}
if((c.cxw-mid)*dir>len/2+CFG.planeTurn){if(!(armed&&(c.test||c.passes<3)))c.state='leave';else if(gy-c.cyw>=CFG.planeAlt+25){c.state='turn';c.climbOut=false}else c.climbOut=true}}
if(c.state==='leave'&&Math.abs(c.cxw-mid)>S.W+300){if((c.sorties||0)<CFG.planeReturns)G.planeBack.push({t:G.t+CFG.planeRefill,sorties:c.sorties||0,kind:'plane'});else log('The plane has not come back','good');return false}
return true}
function rotorBrain(c,dt){
const ctl=c.ctl,f=c.fc,cs=G.train.cars;
if(airShotDown(c)){ctl.coll=f.rotor>0&&!c.ejected?.35:0;ctl.pitch=c.pitch;if(Math.random()<dt*20)spawn(c.cxw,c.cyw,rand(-8,8),rand(-20,-5),rand(1,2.4),[60,56,52],2,'smoke');return true}
const heli=c.vkind==='heli',alt=heli?CFG.heliAlt:CFG.pxDroneAlt;
let tx;if(c.state==='leave'){tx=c.cxw+c.fx*400}else{const car=cs[c.test?Math.floor(G.t/6)%cs.length:(c.id*7)%cs.length],side=(c.id%2?1:-1)*(heli?70:40);tx=car.x+side}
const tY=groundY(c.cxw)-alt,desVx=clamp((tx-c.cxw)*.9,-AIR[c.vkind].vMax*.8,AIR[c.vkind].vMax*.8)+(c.state==='leave'?0:G.train.v);
if(Math.abs(c.vx)<20&&c.state!=='leave'){const want=Math.sign((cs[0].x+cs[cs.length-1].x)/2-c.cxw)||c.fx;if(want!==c.fx){c.fx=want}}
const need=c.am*CFG.airG/Math.max(30,c.Rmax*Math.max(.2,f.rotor))/Math.max(.5,Math.cos(c.pitch));
ctl.coll=clamp(need+(c.cyw-tY)*.012+c.vy*.014,0,1);
ctl.pitch=clamp(-(desVx-c.vx)*.012*c.fx,-.42,.42);
if(c.state==='attack'&&!c.test){airGun(c,'gun',heli?200:150,190,heli?'heli':'drone');if(c.shots<=0&&c.burst<=0)c.state='leave'}
if(c.state==='leave'&&Math.abs(c.cxw-trainMid())>S.W+300){if(heli&&(c.sorties||0)<CFG.planeReturns)G.planeBack.push({t:G.t+CFG.planeRefill,sorties:c.sorties||0,kind:'heli'});return false}
return true}
