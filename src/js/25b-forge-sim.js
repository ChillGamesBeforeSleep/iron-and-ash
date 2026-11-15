/* =====================================================================
   FORGE TEST RANGE (v3.22) — run the unit on the workbench in the real game.
   Ground units: a short test train (your unit + a locomotive or wagons) on a real track, no random
   hazards; you spawn drones, bombers, raiders, planes, gunships, rockfall, obstacles when you want.
   Flyers: a normal train; your flyer takes off against it — as a TEST FLIGHT (no weapons, it keeps
   flying passes so you can watch the physics) or an ATTACK RUN (the real enemy pilot). Live flight
   instruments, a 12-second trace, wind and gust sliders. Nothing here touches your saved run.
   ===================================================================== */
const SIM_SPAWNS=[['drone','Drone'],['bomber','Bomber'],['raiders','Raiders'],['plane','Attack plane'],['heli','Gunship'],['rocks','Rockfall'],['obstacle','Obstacle'],['fire','Fire'],['blast','Blast'],['fix','Repair all'],['res','+ supplies']];
function startSim(){
const d=FG.d;if(!FG.unit){log('Fix the images first (step 2)','bad');return}
const air=isAirBase(d.base);CUSTOM[FORGE_ID]=Object.assign(FG.unit,{on:true,lookURL:d.lookURL,matURL:d.matURL,spec:d.spec});G.baySprites={};
G.sim={air,kind:d.base,name:d.name||'NEW UNIT',wind:CFG.wind,gust:CFG.airGust,trace:[],calm:G.dev.calm};
const deckWagon=d.base==='heli'?'helipad':d.base==='mole'?'driller':'carrier';
const keep=CONSIST;CONSIST=air?['loco',deckWagon,'armored','cargo']:d.base==='loco'?[FORGE_ID,'tender','cargo']:['loco',FORGE_ID,'cargo'];
$('ws').hidden=true;document.body.classList.remove('ws');
G.mlog=[];G.legReports=[];G.snapT=0;G.leg=1;G.diff=1;G.res={crew:5,hurt:0,fuel:160,scrap:20,ammo:40,equip:4,water:90};G.stats={dist:0,kills:0,lost:0,repairs:0};
G.train=newTrain();CONSIST=keep;initCrew(G.res.crew);G.stash=[];G.dev.calm=true;startLeg();
G.res.fuel=G.caps.fuel;G.res.water=G.caps.water;
if(air){const car=G.train.cars.find(c=>bayOf(c));if(car){const b=bayOf(car);b.type=FORGE_ID;b.unit=makeCar(FORGE_ID,CUSTOM[FORGE_ID]);b.unit.occ.fill(1);updateRegions(b.unit);paintCar(b.unit)}}
simBar();log(air?`Flight test: ${G.sim.name} ready on carrier deck — launching`:`Test range: ${G.sim.name} — spawn enemies from the panel`,'good');
if(air)simFlyer('deck');
}
function endSim(msg){G.piloting=null;G.strays=[];G.baySprites={};
if(!G.sim)return;CFG.wind=G.sim.wind;CFG.airGust=G.sim.gust;G.dev.calm=G.sim.calm;G.sim=null;
const b=$('simbar');if(b)b.remove();overlay.hidden=true;document.body.classList.remove('station');
G.vehicles=[];G.drones=[];G.raiders=[];G.shots=[];G.exp=null;G.boarders=[];G.planeBack=[];
showWorkshop().then(()=>{goStep(stepIdx('test'));if(msg)log(msg,'good')});
}
function simFlyer(mode){
if(!G.sim||!G.sim.air)return;
for(const v of G.vehicles||[])if(v.type===FORGE_ID&&v.pilot&&v.pilot.alive){v.pilot.where='seat';v.pilot.state=null;v.pilot=null}
G.vehicles=(G.vehicles||[]).filter(v=>v.type!==FORGE_ID);G.piloting=null;crewSync();
const car=G.train.cars.find(c=>bayOf(c));
if(mode==='deck'){layout(G.train.cars,G.train.x);if(!car){log('No carrier in the test train','bad');return}
const b=bayOf(car);b.type=FORGE_ID;b.state='parked';b.unit=makeCar(FORGE_ID,CUSTOM[FORGE_ID]);const c=launchBay(car);G.sim.test=false;G.sim.mode='deck';G.sim.trace=[];return c}
if(car&&bayOf(car))bayOf(car).state='air';
const solo=(mode==='solo'||mode==='pilot');
if(solo)G.train.cars.forEach(car=>{car.ax=-9999;car.x=-9999});else layout(G.train.cars,G.train.x);
const c=spawnAir(G.sim.kind,false,FORGE_ID);
if(solo){c.ax=G.train.x;c.ay=groundY(c.ax)-85;vehPose(c)}
c.test=(mode===true||mode==='test'||mode==='solo');
c.player=(mode==='pilot');c.aiLvl=G.sim.aiLvl||1;G.piloting=c.player?c:null;
G.sim.test=c.test;G.sim.mode=mode;G.sim.trace=[];return c}
function simBar(){
let b=$('simbar');if(b)b.remove();b=document.createElement('div');b.id='simbar';b.className='hud box';b.setAttribute('role','region');b.setAttribute('aria-label','Test range');
const air=G.sim.air;
b.innerHTML=`<header><b>${air?'FLIGHT TEST':'TEST RANGE'}</b><span>${G.sim.name}</span><button class="go" type="button" id="simEnd">◀ FORGE</button></header>
${air?`<div class="sb-row"><button class="ub2" type="button" data-sim="solo">Solo flight</button><button class="ub2" type="button" data-sim="pilot">Pilot (W/S throttle · A nose up / D nose down)</button><button class="ub2" type="button" data-sim="deck" title="Take off from the test carrier, fly it yourself, land on the deck to refuel; [J] ejects">From the deck</button><button class="ub2" type="button" data-sim="test">Test flight</button><button class="ub2" type="button" data-sim="attack">Attack run</button><button class="ub2" type="button" data-sim="again">Respawn</button></div>
<div class="sb-row"><span style="font-size:10px;color:var(--dim);align-self:center">Bot AI:</span><button class="ub2" type="button" data-ai="1">L1 Basic</button><button class="ub2" type="button" data-ai="2">L2 Adv</button><button class="ub2" type="button" data-ai="3">L3 Master</button></div>
<div class="sl"><label for="simWind">Wind</label><input type="range" id="simWind" min="-60" max="60" step="2" value="${CFG.wind}"><output>${CFG.wind}</output></div>
<div class="sl"><label for="simGust">Gusts</label><input type="range" id="simGust" min="0" max="40" step="1" value="${CFG.airGust}"><output>${CFG.airGust}</output></div>
<div id="simInst" class="sb-inst"></div><canvas id="simTrace" width="300" height="70" aria-label="Altitude and pitch over the last 12 seconds"></canvas>
<p class="sb-note">White: height above ground · orange: pitch · blue: airspeed. Pilot / From the deck: [W] accelerate · [S] slow down · [A] nose up · [D] nose down · [R] roll · [J] eject · [Tab] switch.</p>`:''}
<div class="sb-grid">${SIM_SPAWNS.map(([k,t])=>`<button class="ub2" type="button" data-sp2="${k}">${t}</button>`).join('')}</div>
<label class="chk"><input type="checkbox" id="simHaz"> Random hazards on</label>
<div id="simStat" class="sb-stat"></div>`;
document.body.appendChild(b);
b.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
if(t.id==='simEnd'){endSim('');return}
if(t.dataset.sp2){testSpawn(t.dataset.sp2,t.textContent);return}
if(t.dataset.ai){G.sim.aiLvl=+t.dataset.ai;simFlyer(G.sim.mode||'attack');return}
if(t.dataset.sim==='again')simFlyer(G.sim.mode??G.sim.test);else if(t.dataset.sim)simFlyer(t.dataset.sim)});
b.addEventListener('input',e=>{const t=e.target;if(t.id==='simWind'){CFG.wind=+t.value;t.nextElementSibling.textContent=t.value}if(t.id==='simGust'){CFG.airGust=+t.value;t.nextElementSibling.textContent=t.value}if(t.id==='simHaz')G.dev.calm=!t.checked});
}
function simTick(dt){
if(!G.sim||G.state!=='play')return;
if(G.sim.air){const c=(G.vehicles||[]).find(v=>v.type===FORGE_ID);
if(c){G.sim.trace.push([c.vkind?groundY(c.cxw)-c.cyw:0,c.pitch*(c.fx||1),c.vf||0]);if(G.sim.trace.length>720)G.sim.trace.shift()}
if((G.sim.t=(G.sim.t||0)-dt)>0)return;G.sim.t=.2;
const el=$('simInst');if(!el)return;
if(!c){el.innerHTML='<p class="sb-note">No flyer in the air — press Test flight or Attack run.</p>';return}
const f=c.fc||{},row=(k,v,cls)=>`<span class="${cls||''}">${k}</span><b class="${cls||''}">${v}</b>`,pct=x=>Math.round((x||0)*100)+'%',
off=c.liftX-c.comX,stall=Math.abs(c.aoa||0)>.5,deg=r=>Math.round(r*180/Math.PI)+'°';
el.innerHTML=[row('State',c.state+(c.test?' (test)':'')),row('Airspeed',Math.round(c.vf||0)),row('Ground speed',Math.round(Math.abs(c.vx))),row('Height',Math.round(groundY(c.cxw)-c.cyw)),
row('Pitch',deg(c.pitch||0)),row('Angle of attack',deg(c.aoa||0)+(stall?' STALL':''),stall?'bad':''),row('Lift / weight',(c.lw||0).toFixed(2),Math.abs((c.lw||0)-1)>.4?'warn':''),row('Thrust',pct(c.thrN)),
...(c.vkind==='plane'?[row('Engine',pct(f.eng),f.eng<.5?'bad':''),row('Wings',pct(f.wing),f.wing<.5?'bad':''),row('Tail',pct(f.tail),f.tail<.5?'bad':'')]:[row('Rotor',pct(f.rotor),f.rotor<.5?'bad':''),row('Tail rotor',pct(f.tail),f.tail<.5?'bad':'')]),
row('Pilot',f.pilot?'yes':'NO',f.pilot?'':'bad'),row('Lift vs CoM',(off>=0?'+':'')+off.toFixed(1)+' px',c.vkind==='plane'&&(off<0||off>8)?'warn':''),row('Mass',(c.am||0).toFixed(2)),row('Body',pct(c.integrity),c.integrity<CFG.planeDownAt+.1?'warn':''),row('Wind',Math.round(G.wind||0))].join('');
const cv=$('simTrace');if(cv){const x=cv.getContext('2d'),W=cv.width,H=cv.height,T=G.sim.trace;x.clearRect(0,0,W,H);x.fillStyle='rgba(255,255,255,.06)';x.fillRect(0,H/2,W,1);
const line=(idx,sc,col)=>{x.strokeStyle=col;x.lineWidth=1.2;x.beginPath();T.forEach((p,i)=>{const px=i/720*W,py=clamp(H/2-p[idx]*sc,1,H-1);i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke()};
line(0,.22,'#eeeeee');line(1,22,'#ffa040');line(2,.18,'#60b0ff')}
}
else{if((G.sim.t=(G.sim.t||0)-dt)>0)return;G.sim.t=.25}
const el=$('simStat');if(!el)return;const u=G.train.cars.find(c=>c.type===FORGE_ID)||(G.vehicles||[]).find(v=>v.type===FORGE_ID);
const dm=Object.entries(G.tel.dmg||{}).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>`${k} ${Math.round(v)}`).join(' · ');
el.innerHTML=(u?`<div class="mini">${Array.from(u.regInt.subarray(0,u.regCount||8),(v,r)=>`<div style="background:${intColor(v)}">${ROLE_SHORT[u.d.roles[r]]||u.d.roles[r]} ${Math.round(v*100)}%${u.alive[r]?'':' OFF'}</div>`).join('')}</div>`:`<p class="sb-note">${G.sim.air?'':'Your unit is gone — it broke apart.'}</p>`)+
`<p class="sb-note">Damage to the train: ${dm||'none yet'}${G.sim.air?'':` · speed ${Math.round(G.train.v)}`}</p>`;
}
