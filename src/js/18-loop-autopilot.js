/* =====================================================================
   LOOP
   ===================================================================== */
function leakTick(dt){
const ex=G.res.fuel-G.caps.fuel;
if(ex>1e-6){const d=Math.min(ex,Math.max(CFG.leakMin,ex*CFG.leakRate)*dt);G.res.fuel-=d;G.tel.leaked=(G.tel.leaked||0)+d;
if(!G.leak){G.leak=true;log('Fuel storage breached — leaking! Repair the FUEL regions','bad')}
if(Math.random()<dt*14){const src=[];for(const c of G.train.cars)c.d.roles.forEach((r,i)=>{if(r==='FUEL'&&!c.alive[i])src.push([c,i])});if(src.length){const[c,i]=pick(src),p=toWorld(c,(i+.5)*c.w/4+rand(-6,6),c.d.split-2);spawn(p[0],p[1],rand(-6,6)+G.train.v*.5,rand(5,25),rand(.6,1.2),[220,160,40],1,'debris')}}}
else G.leak=false;
}
function craftAmmo(){if(!G.caps.workshop)log('Workshop region is down — repair it first','bad');else if(G.res.scrap<1)log('Need 1 scrap','bad');else if(G.res.ammo>=G.caps.ammo)log('Ammo store full (or destroyed)','warn');else{const n=CFG.ammoPerScrap+2*G.caps.shopLvl;G.res.scrap--;G.tel.scrapOut++;G.tel.ammoMade+=n;G.res.ammo=Math.min(G.caps.ammo,G.res.ammo+n);log(`Workshop: 1 scrap → ${n} ammo`,'good')}}
function salvageEquip(){if(G.res.equip<1)log('No equipment to salvage','bad');else if(G.res.scrap>=G.caps.scrap)log('Scrap storage full','warn');else{G.res.equip--;G.tel.scrapIn+=CFG.scrapPerEquip;G.res.scrap=Math.min(G.caps.scrap,G.res.scrap+CFG.scrapPerEquip);log(`Salvaged 1 equipment → ${CFG.scrapPerEquip} scrap`,'good')}}
function siteScore(s){
const R=G.res,C=G.caps,cars=G.train.cars,avgInt=cars.reduce((a,c)=>a+c.integrity,0)/cars.length,crewOk=crewOnTrain()>=2&&healthyAboard()>=1;if(!crewOk)return 0;
switch(s.type){
case 'depot':return R.fuel<C.fuel*.7?3+(R.fuel<C.fuel*.3?3:0):0;
case 'ruin':return (R.scrap<C.scrap*.6||R.equip<C.equip*.5)?2+(R.scrap<3?2:0):0;
case 'armory':return C.ammo>0&&R.ammo<C.ammo*.5?2:0;
case 'camp':return R.crew<C.crew?2:0;
case 'yard':return cars.length<7&&R.crew>=4&&R.scrap>=4?1:0;
case 'bunker':return crewOnTrain()>=4&&avgInt>.75&&siteRisk(s,partySize({kind:'site',s}))<.3?1:0;}return 0;
}
function autopilot(dt){
const A=G.ap||(G.ap={cool:0,skip:new Set(),wait:0});
const cars=G.train.cars,L=cars[0],v=G.train.v,R=G.res,C=G.caps,front=L.x+L.w/2;
A.cool-=dt;
if(A.cool<=0){
let need=false;for(const c of cars)for(let r=0;r<8;r++)if(c.regMax[r]&&(!c.alive[r]||c.regFire[r]>10||c.regInt[r]<.55))need=true;
if(need&&R.scrap>=1){quickRepair();A.cool=.7}
else if(C.cannon&&R.ammo<6&&C.workshop&&R.scrap>5&&R.ammo<C.ammo){craftAmmo();A.cool=.5}
else if((R.equip>=3&&R.scrap<3&&R.scrap<C.scrap-2)||(need&&R.scrap<1&&R.equip>=1)){salvageEquip();A.cool=.5}
}
const best=cannonTarget(280,L.ax,L.ay);
if(best&&C.cannon&&R.ammo>0&&G.gunCool<=0){const a=cannonAim(best);G.mouse.wx=a[0];G.mouse.wy=a[1];fireGun()}
else if(C.cannon&&R.ammo>0&&G.gunCool<=0&&G.raiders&&G.raiders.length){let tr=null,rd=240;for(const r of G.raiders){if(!r.alive||r.flee)continue;const clear=cars.every(c=>Math.abs(c.x-r.x)>c.w/2+28);if(!clear)continue;const d=Math.abs(r.x-L.ax);if(d<rd){rd=d;tr=r}}
if(tr){const c0=C.cannon,p0=toWorld(c0,c0.pts.turret[0],c0.pts.turret[1]),lo=Math.min(p0[0],tr.x),hi=Math.max(p0[0],tr.x);if(!cars.every(c=>c===c0||c.x+c.w/2<lo||c.x-c.w/2>hi))tr=null}
if(tr){const c=C.cannon,tp=c.pts.turret,p=toWorld(c,tp[0],tp[1]),ty=groundY(tr.x)-4,tt=Math.hypot(tr.x-p[0],ty-p[1])/CFG.shellSpeed;G.mouse.wx=tr.x+.5;G.mouse.wy=ty-27*tt*tt;fireGun()}}
if(G.exp||(G.boarders&&G.boarders.length)||(G.strays&&G.strays.length)){G.target=0;G.brake=true;return}
A.expT=(A.expT||0)-dt;
if(G.loose.length){const last=cars[cars.length-1],rear=last.x-last.w/2;let gb=null,gd=1e9;
for(const g of G.loose){const f=g.cars[0],gap=rear-(f.x+f.w/2);if(gap>-6&&gap<700&&gap<gd){gd=gap;gb=g}}
if(gb){const gf=gb.cars[0].x+gb.cars[0].w/2,block=G.obstacles.find(o=>o.x+o.w>gf-4&&o.x<rear+4);
if(block){if(rear-(block.x+block.w)>8){const want=-Math.min(10,(rear-block.x-block.w)*.2+3);if(v>want+1){G.target=-CFG.reverseMax;G.brake=false}else{G.target=0;G.brake=v<want-2}return}
G.target=0;G.brake=true;if(Math.abs(v)<1.5&&A.expT<=0){A.expT=1.5;tryExpedition(null,{kind:'clear',o:block,x:block.x+block.w/2})}return}
const want=-Math.min(14,gd*.2+4);if(v>want+1){G.target=-CFG.reverseMax;G.brake=false}else if(v<want-2){G.target=0;G.brake=true}else{G.target=0;G.brake=false}return}}
const fuelAhead=G.world.sites.some(st=>st.uses>0&&(st.type==='depot'||st.type==='ruin')&&st.x>front-60&&st.x<front+520);
if(R.fuel<8&&!fuelAhead&&L.ax<G.world.LEN-200){G.target=0;G.brake=true;if(Math.abs(v)<1.5&&A.expT<=0){A.expT=1.5;tryExpedition()}return}
let tgt=null;
for(const o of G.obstacles){if(o.x>front-4&&o.x<front+300&&(!tgt||o.x<tgt.x)){const ram=C.ram&&o.hp<=90;tgt={kind:ram?'ram':'obstacle',x:o.x-6,o}}}
for(const st of G.world.sites){if(st.uses<=0||A.skip.has(st))continue;if(st.x<front-60||st.x>front+700)continue;const sc=siteScore(st);if(sc<=0)continue;const sx=st.x+40;if(!tgt||sx<tgt.x){tgt={kind:'site',x:sx,s:st}}}
if(C.water>0&&(R.water||0)<C.water*.6){const pc=cars.find(c=>c.d.roles.includes('WATER'));if(pc)for(const st of G.world.sites){if(st.type!=='tower'||st.collapsed||!(st.water>0)||!st.spout||A.skip.has(st))continue;const sx=st.spout[0]+(front-pc.ax);if(sx<front-30||sx>front+700)continue;if(!tgt||sx<tgt.x)tgt={kind:'tower',x:sx,s:st}}}
for(const st of G.world.sites){if(st.type!=='stranded'||!(st.people>0)||st.x<front-60||st.x>front+700)continue;const sx=st.x+30;if(!tgt||sx<tgt.x)tgt={kind:'stranded',x:sx,s:st}}
if(L.ax>G.world.LEN-400&&(!tgt||tgt.x>G.world.LEN+30))tgt={kind:'station',x:G.world.LEN+L.w/2+30};
const decel=CFG.rolling+C.axleDrag+CFG.brake*(.35+.65*C.traction);
if(!tgt||tgt.kind==='ram'){G.target=1;G.brake=false;return}
const dist=tgt.x-front,stopD=v>0?v*v/(2*decel)+5:0;
if(dist>stopD){G.target=dist>stopD+40?1:.35;G.brake=false}else{G.target=0;G.brake=true}
if(Math.abs(v)<1.5&&dist<=stopD+6){
if(tgt.kind==='tower'){A.towerT=(A.towerT||0)+dt;if((R.water||0)>=C.water*.95||!(tgt.s.water>0)||(A.towerT>4&&!tgt.s.pouring)){A.skip.add(tgt.s);A.towerT=0}}
else if(tgt.kind==='site'&&A.expT<=0){A.expT=1.5;tryExpedition();if(!G.exp)A.skip.add(tgt.s)}
else if(tgt.kind==='obstacle'&&A.expT<=0){A.expT=1.5;tryExpedition();if(!G.exp){G.target=-CFG.reverseMax;G.brake=false;A.backUp=1.5}}
}
if(A.backUp>0){A.backUp-=dt;G.target=-CFG.reverseMax;G.brake=false}
if(R.fuel<=0&&Math.abs(v)<1&&!G.exp&&A.expT<=0){A.expT=1.5;tryExpedition()}
}
const AP_ORDER={armored:0,cargo:1,crane:2,passenger:3,water:4,tender:5};
function apStation(){
const R=G.res;
if(CFG.apReorder){const [loco,...rest]=G.train.cars;rest.sort((a,b)=>(AP_ORDER[a.type]??3)-(AP_ORDER[b.type]??3));G.train.cars=[loco,...rest];layout(G.train.cars,G.train.x)}
computeCaps();
while(R.scrap>=3&&R.fuel<G.caps.fuel*.75){R.scrap-=3;G.tel.scrapOut+=3;R.fuel=Math.min(G.caps.fuel,R.fuel+25)}
for(const c of G.train.cars)for(let r=0;r<8;r++)if(c.regMax[r]&&c.regInt[r]<.85&&R.scrap>=1)repairRegion(c,r);
let pickU=null;G.train.cars.forEach((c,ci)=>{for(let r=0;r<4;r++){const k=upCost(c.lvl[r],false);if(c.lvl[r]<3&&R.scrap-k.s>=6&&R.equip>=k.e&&(!pickU||k.s<pickU.k.s))pickU={c,r,k}}});
if(pickU){R.scrap-=pickU.k.s;R.equip-=pickU.k.e;G.tel.scrapOut+=pickU.k.s;pickU.c.lvl[pickU.r]++;setMul(pickU.c)}
if(R.scrap>=8&&G.crew.some(m=>!has(m,'gun')&&m.inv.length<PACK))buyGear('gun');else if(R.scrap>=7&&R.equip>=1&&G.crew.some(m=>!has(m,'armor')&&m.inv.length<PACK))buyGear('armor');
if(G.ap)G.ap.skip=new Set();G.leg++;startLeg();
}
function hazardBiome(x){return G.dev.biome||biomeAt(x).type}
function cabCar(){for(const c of G.train.cars){const r=c.d.roles.indexOf('CAB');if(r>=0)return[c,r]}return null}
function setCruise(on,msg){if(!!G.cruise===!!on)return;G.cruise=!!on;G.cruiseWait=false;G.cruiseOb=null;if(msg)log(msg,on?'good':'warn');G.hudSig=''}
function cruiseTick(dt){
const cab=cabCar();if(!cab||cab[0].regInt[cab[1]]<CFG.abilityKeep){setCruise(false,`Cab below ${Math.round(CFG.abilityKeep*100)}% — auto drive off`);G.target=0;G.brake=false;return}
const L=G.train.cars[0],v=G.train.v;
if(G.exp||(G.boarders&&G.boarders.length)||(G.strays&&G.strays.length)){G.target=0;G.brake=true;if(!G.cruiseWait){G.cruiseWait=true;log('Auto cruise waiting for the crew outside','')}return}
if(G.cruiseWait){G.cruiseWait=false;log('Crew aboard — auto cruise resumes','good')}
const decel=CFG.rolling+G.caps.axleDrag+CFG.brake*(.35+.65*Math.max(.25,G.caps.traction)),front=L.x+L.w/2,toGo=G.world.LEN+L.w/2+20-front,stopD=v>0?v*v/(2*decel)*CFG.cruiseStationBrake+8:0;
let ob=null;if(CFG.cruiseObstacle)for(const o of G.obstacles){if(o.x+o.w<front-2||o.x-front>400)continue;if(G.caps.ram&&o.hp<=CFG.cruiseRamHp)continue;if(!ob||o.x<ob.x)ob=o}
const toOb=ob?ob.x-front-CFG.cruiseObstacleGap:1e9;
if(ob&&toOb<stopD+4){G.target=0;G.brake=true;if(!G.cruiseOb){G.cruiseOb=ob;G.hudSig='';log(`Auto cruise braking — ${ob.kind==='wreck'?'wreckage':'rocks'} on the track ahead${G.caps.ram?' too big for the plough':''}. Clear it [E]`,'warn')}return}
if(G.cruiseOb){G.cruiseOb=null;log('Track clear — auto cruise resumes','good')}
if(toGo<stopD+4){G.target=0;G.brake=true}else{G.target=ob&&toOb<stopD+60?.4:1;G.brake=false}
}
function boardTick(dt){
const w=G.world;if(!w)return;G.boarders=G.boarders||[];const cars=G.train.cars,v=Math.abs(G.train.v);
if(v<3)for(const s of w.sites){if(s.type!=='stranded'||!(s.people>0))continue;if(!cars.some(c=>Math.abs(c.x-s.x)<c.w/2+70))continue;
for(let i=0;i<s.people;i++)G.boarders.push({x:s.x+rand(-10,10),hurt:i<s.hurt,ph:rand(0,6),t:0});
log(`${s.people} survivor${s.people>1?'s are':' is'} running to the train${s.hurt?` (${s.hurt} injured)`:''}`,'good');s.people=0;s.uses=0}
for(const cf of ownFlyers()){if(!cf.landed||Math.abs(cf.vx)>5||cf.pax||(G.boarders||[]).some(b=>b.toCraft===cf))continue;
for(const s of w.sites){if(s.type!=='stranded'||!(s.people>0)||Math.abs(cf.cxw-s.x)>cf.w/2+75)continue;
const hurt=s.hurt>=s.people;s.people--;if(hurt&&s.hurt>0)s.hurt--;if(s.people<=0)s.uses=0;
G.boarders.push({x:s.x+rand(-6,6),hurt,ph:rand(0,6),t:0,toCraft:cf});
log(`A stranded survivor is running to the ${cf.d.name.toLowerCase()} for airlift!`,'good');break}}
for(let i=G.boarders.length-1;i>=0;i--){const b=G.boarders[i];b.t+=dt;b.ph+=dt*(b.hurt?4:9);
if(b.toCraft){const cf=b.toCraft;if(!(G.vehicles||[]).includes(cf)||!cf.landed||(cf.passengers&&cf.passengers.length>=2)){b.toCraft=null}else{
b.x+=Math.sign(cf.cxw-b.x)*CFG.crewWalk*(b.hurt?.55:1.3)*dt;
if(Math.abs(cf.cxw-b.x)<cf.w/2-1){G.boarders.splice(i,1);const nm=addCrew({hp:b.hurt?rand(3,5):10,kit:[['water',1],['pistol',1]]});if(!nm.body)bodyFromHp(nm);nm.where='out';nm.state='fly';nm.x=cf.cxw;cf.passengers=cf.passengers||[];cf.passengers.push(nm);cf.pax=nm;G.tel.crewGained++;G.hudSig='';G.crewHtml='';log(`${nm.name} climbed into the ${cf.d.name.toLowerCase()} as co-pilot — can now loot while the pilot stays at the controls!`,'good')}continue}}
let best=cars[0],bd=1e9;for(const c of cars){const d=Math.abs(c.x-b.x);if(d<bd){bd=d;best=c}}
if(bd>CFG.crewLostDist||b.t>60){G.boarders.splice(i,1);log('A survivor was left behind','warn');continue}
b.x+=Math.sign(best.x-b.x)*CFG.crewWalk*(b.hurt?.55:1.3)*dt;
if(Math.abs(best.x-b.x)<best.w/2-2){G.boarders.splice(i,1);addCrew({hp:b.hurt?rand(2,4.5):10,kit:Math.random()<.5?[['water',1]]:[]});G.tel.crewGained++;if(b.hurt)G.tel.injured=(G.tel.injured||0)+1
log(b.hurt?'An injured survivor was pulled aboard':'A survivor climbed aboard',b.hurt?'warn':'good')}}
}
function hazards(dt){
if(G.dev.calm)return;
const L=G.train.cars[0],b=hazardBiome(L.ax),diff=G.diff,stopped=Math.abs(G.train.v)<3;
const maxD=1+Math.floor(G.leg*.75);
if(L.ax>1300||G.leg>1){let rate=CFG.droneRate*diff*(b==='city'?CFG.droneCity:1)*(stopped?CFG.stopMult:1);if(G.drones.filter(d=>!d.dead).length<maxD&&Math.random()<rate*dt)spawnDrone()}
if(L.ax>2500&&(G.vehicles||[]).length+(G.planeBack||[]).length<CFG.planeMax&&Math.random()<CFG.planeRate*diff*(b==='city'?2:1)*dt)spawnPlane();
if(G.leg>=2&&L.ax>2000&&!(G.vehicles||[]).some(v=>v.vkind==='heli')&&Math.random()<CFG.heliRate*diff*dt)spawnAir('heli');
if(G.leg>=2&&L.ax>1600&&!(G.vehicles||[]).some(v=>v.vkind==='tank')&&Math.random()<CFG.tankRate*diff*dt){const tk=spawnAir('tank');tk.ay=surfaceY(tk.ax);vehPose(tk)}
if(b==='canyon'&&Math.random()<CFG.rockRate*diff*dt)spawnRock();
if(b==='waste'&&Math.random()<.02*dt)spawnRock();
if(b==='acid'){for(let i=0;i<S.W/50;i++)spawn(G.camX+rand(-30,S.W+30),G.camY+rand(-10,S.H*.4),-25,rand(170,220),2,[118,150,112],1,'rain')}
if(b==='lava'&&Math.random()<CFG.emberRate*diff*dt*3){const x=G.camX+rand(0,S.W);spawn(x,groundY(x),rand(-10,10),rand(-90,-50),rand(1.5,2.6),[255,140,40],1,'ember',true)}
if(G.caps.seatLvl>0&&G.res.crew<G.caps.crew){G.recruitT+=dt*G.caps.seatLvl;if(G.recruitT>=CFG.recruitEvery){G.recruitT=0;const m=addCrew({kit:[['water',1]]});G.tel.crewGained++;log(`Upgraded seats: ${m.name}, a survivor, climbed aboard`,'good')}}
if(G.riders>0&&Math.random()<CFG.riderLossPerSec*G.riders*(Math.abs(G.train.v)>30?1.6:1)*dt){const rs=G.crew.filter(m=>m.where==='roof');if(rs.length){const m=pick(rs);killMember(m);log(`${m.name}, standing without a seat, was thrown out of the train`,'bad')}}
}
let _pt=0,_pl='';const _pa={};
function PT(label){const n=performance.now();if(_pl)_pa[_pl]=(_pa[_pl]||0)+(n-_pt);_pt=n;_pl=label}
function PTend(){PT('');G.prof=G.prof||{};for(const k in _pa){G.prof[k]=(G.prof[k]||0)*.9+_pa[k]*.1;G.profMax=G.profMax||{};G.profMax[k]=Math.max((G.profMax[k]||0)*.995,_pa[k]);_pa[k]=0}}
function step(dt){
PT('physics');G.t+=dt;G.tel.time+=dt;if(Math.abs(G.train.v)<1)G.tel.stopped+=dt;
{const b=G.world?hazardBiome(G.train.cars[0].ax):'';G.windAmp=.5+.35*Math.sin(G.t*.13)+.25*Math.sin(G.t*.71)+(b==='acid'?1.2:0);G.wind=CFG.wind*G.windAmp}
if((G.snapT-=dt)<=0){G.snapT=10;const R=G.res;G.mlog.push({t:G.tel.time,leg:G.leg,x:Math.round(G.train.cars[0].ax),snap:true,
msg:`v ${Math.round(G.train.v)} · fuel ${Math.floor(R.fuel)} · scrap ${R.scrap} · ammo ${R.ammo} · equip ${R.equip} · crew ${R.crew} · cars ${G.train.cars.map(c=>c.type[0].toUpperCase()+Math.round(c.integrity*100)).join(' ')} · drones ${G.drones.length} · biome ${hazardBiome(G.train.cars[0].ax)}`})}
const k=G.keys;
const flying=G.piloting&&(G.vehicles||[]).includes(G.piloting);
if(G.dev.auto)autopilot(dt);else if(flying){if(G.cruise)cruiseTick(dt);else{G.target=0;G.brake=false}}
else{
const rev=k.ArrowLeft||k.KeyA,brk=k.ArrowDown||k.KeyS||k.Space;
if(G.cruise&&(rev||brk))setCruise(false,'Auto cruise off — you have the controls');
if(G.cruise)cruiseTick(dt);
else{G.target=(k.ArrowRight||k.KeyD)?1:rev?-CFG.reverseMax:0;G.brake=!!brk}}
G.throttle+=(G.target-G.throttle)*Math.min(1,dt*2.5);
G.all=G.train.cars.concat(...G.loose.map(g=>g.cars),G.vehicles||[]);
for(const c of G.all){c.rdT=(c.rdT||0)-dt;if(c.rd||c.fires||c.rdT<=0){updateRegions(c);c.rd=0;c.rdT=.25}}
computeCaps();leakTick(dt);
trainPhysics(dt);G.trA=lerp(G.trA||0,(G.train.v-(G.prevV??G.train.v))/Math.max(dt,1e-3),.3);G.prevV=G.train.v;
motionTick(G.train.cars,G.trA,G.train.v,dt);layout(G.train.cars,G.train.x);loosePhysics(dt);
G.all=G.train.cars.concat(...G.loose.map(g=>g.cars),G.vehicles||[]);
for(const c of G.train.cars)c.phase+=G.train.v*dt/c.d.wheelR;
for(const g of G.loose)for(const c of g.cars)c.phase+=g.v*dt/c.d.wheelR;
PT('entities');hazards(dt);updateDrones(dt);vehicleTick(dt);raiderTick(dt);updateShots(dt);updateRocks(dt);PT('explosions');
for(let n=0;n<10&&G.explQ.length;n++)explode(G.explQ.shift());
PT('fire+rust');for(const c of G.all){c.simAcc=(c.simAcc||0)+dt;if(c.fires||c.wetT>G.t||c.simAcc>=CFG.calmSimStep){simCar(c,c.simAcc,hazardBiome(c.ax));c.simAcc=0}}
PT('structure');
structural(dt);updateChunks(dt);updateLights(dt);PT('pixels');
PX.kickBudget=120;pxPlough();craneTick(dt);pumpTick(dt);towerTick(dt);crumbleTick(dt);pxStep(dt);pxFires(dt);
G.gunCool-=dt;G.craftCool-=dt;
if(G.mouse.down&&G.gunCool<=0&&!G.dev.auto&&!flying)fireGun();
else if(G.gunner&&!G.dev.auto)gunnerTick();
if(CFG.crewAutoRepair&&(G.piloting||G.cruise)&&G.res.scrap>=1&&healthyAboard()>=1){G.autoRepT=(G.autoRepT||0)-dt;
if(G.autoRepT<=0){G.autoRepT=CFG.crewRepairEvery/Math.max(1,healthyAboard()*.6);
let wc=null,wr=-1,wv=.68;for(const c of G.train.cars)for(let r=0;r<8;r++)if(c.regMax[r]&&(c.regFire[r]>4||c.regInt[r]<wv)){wv=c.regInt[r]-(c.regFire[r]?.3:0);wc=c;wr=r}
if(wc){G.quietLog=true;repairRegion(wc,wr);G.quietLog=false;log(`Train crew repaired ${wc.d.name} ${wc.d.roles[wr]} → ${Math.round(wc.regInt[wr]*100)}%`,'good')}}}
PT('crew');updateExpedition(dt);strayTick(dt);looterGuns(dt);crewTick(dt);boardTick(dt);updateParticles(dt);effectsTick(dt);
{const q=Math.floor(L0().phase/(Math.PI/2));if(q!==G.lastQ){G.lastQ=q;if(G.caps.driver&&G.res.fuel>0&&Math.abs(G.train.v)>.5)sfx('chuff',.35+Math.abs(G.throttle)*.8)}
G.clackD=(G.clackD||0)+Math.abs(G.train.v)*dt;if(G.clackD>46){G.clackD=0;sfx('clack',Math.min(1,Math.abs(G.train.v)/35))}}
{const v=G.train.v,av=Math.abs(v);G.scrape=0;
for(const c of G.train.cars){
if(c.derailed&&av>3){G.scrape++;if(Math.random()<av*.06*dt*10){const end=(c.dside||1)>0?c.w-6:6,p=toWorld(c,end+rand(-5,5),c.h-1);spawn(p[0],p[1],-v*rand(.2,.6)+rand(-30,30),-rand(20,80),rand(.2,.5),[255,rand(170,230),110],1,'spark');
if(Math.random()<.35)addActive(p[0],p[1]+1,v*rand(.1,.5),-rand(40,110),M.STONE,96*rand(.8,1.2),88,76,0,.3)}}
if(av>CFG.gravelSpeed&&c.wheels.length&&Math.random()<(av-CFG.gravelSpeed)*.012){const wh=pick(c.wheels),p=toWorld(c,wh.cx,wh.cy+wh.r);const q=rand(.75,1.2);addActive(p[0]-Math.sign(v)*2,p[1]+1.5,v*rand(.05,.4),-rand(25,70),M.STONE,96*q,88*q,76*q,0,.4);const a=PX.act[PX.act.length-1];if(a)a.clear=rand(.3,.7)}
}}
const L=G.train.cars[0];
if(G.caps.driver&&G.res.fuel>0&&Math.random()<.25+Math.abs(G.throttle)*.9){const sp=L.pts.smoke||[L.w*.8,0],p=toWorld(L,sp[0],sp[1]);spawn(p[0],p[1],rand(-6,6)-G.train.v*.3,rand(-34,-18),rand(1.6,3),[150,144,136],2,'smoke')}
PT('');checkDeaths();
if(G.state!=='play')return;
playCamera(dt);
G.camX=clamp(G.camX,0,Math.max(0,G.world.W-S.W-1));G.camY=clamp(G.camY,0,Math.max(0,G.world.H-S.H-1));
G.shake=Math.max(0,G.shake-dt*18);G.flash=Math.max(0,G.flash-dt*2.5);
const bt=BIOMES[biomeAt(G.camX+S.W/2).type].sky;for(let i=0;i<3;i++)G.tint[i]=lerp(G.tint[i],bt[i],dt*.8);
if(L.ax>=G.world.LEN&&Math.abs(G.train.v)<3&&!G.exp&&!(G.strays&&G.strays.length))legComplete();
}
