/* =====================================================================
   PLAYTEST PANEL — live balance knobs, test tools, match recorder
   ===================================================================== */
const DEV_KEY='trainEngineV2.balance.v1';
const KNOBS=[
['Train physics',[['power','Engine power',20,140,1],['gravity','Hill gravity',0,80,1],['rolling','Rolling friction',0,8,.1],['brake','Brake force',10,120,1],['fuelBurn','Fuel burn /s',.1,3,.05],['reverseMax','Reverse throttle',.1,1,.05],['coupleSpeed','Soft-couple max speed',5,60,1],['derailDrag','Derailed car drag',0,30,.5],['slack','Coupler slack',0,.2,.005],['pitch','Body pitch',0,.01,.0005],['bumpJoint','Rail bumps',0,1,.01]]],
['Damage & repair',[['dmgMul','All hit damage ×',0,3,.05],['disableAt','Region disabled below',.1,.9,.05],['carDeathAt','Car breaks below',.05,.6,.05],['repairPerScrap','Repair per scrap',.1,1,.05],['wreckObstacle','Wreck blocks track at px',20,400,5],['chunkLife','Wreck lifetime s',5,120,5]]],
['Fire & corrosion',[['fireSpread','Fire spread rate',0,30,.5],['flamMul','Flammability ×',0,3,.05],['burnMul','Burn damage ×',0,3,.05],['carEmberIgnite','Ember ignite chance',0,1,.01],['rustMul','Rust damage ×',0,4,.05],['acidRust','Acid rust per drop',0,.2,.005],['wear','Wear rate',0,.3,.01]]],
['Hazards',[['droneRate','Drone spawn /s',0,.08,.001],['droneCity','City drone ×',1,6,.1],['droneBursts','Drone bursts before leaving',1,20,1],['stopMult','Stopped drone ×',1,6,.1],['rockRate','Rockfall /s',0,3,.05],['leakRate','Fuel leak rate',0,1,.01],['emberRate','Lava embers /s',0,20,.5],['diffPerLeg','Difficulty per leg',0,1.5,.05]]],
['Crew & economy',[['crewWalk','Crew walk speed',5,60,1],['crewLostDist','Crew lost distance',80,800,10],['riderLossPerSec','Roof rider loss /s',0,.2,.005],['recruitEvery','Recruit every s',10,300,5],['ammoPerScrap','Ammo per scrap',1,12,1],['scrapPerEquip','Scrap per equipment',1,8,1],['gunCooldown','Cannon reload s',.1,2,.05]]],
['Pixel physics',[['pxGravity','Pixel gravity',40,400,5],['pxBounce','Bounciness ×',0,2.5,.05],['pxFriction','Ground friction',0,1,.05],['pxDmgSpeed','Shrapnel min speed',10,200,5],['pxImpact','Shrapnel damage ×',0,4,.05],['pxKick','Pile splash speed',20,250,5],['shatterV','Chunk shatter speed',30,300,5],['ploughDrag','Plough drag',0,.2,.005],['puddleIgnite','Burning puddle ignites car',0,3,.05],['hotIgnite','Hot pixel ignites car',0,1,.01],['maxActive','Max active pixels',200,6000,100],['symbols','Debris as symbols (1 on, 0 off)',0,1,1],['slowmo','Slow-mo on big blasts (s)',0,1.5,.05],['collapseAt','Site loot lost below',0,1,.05],['blastKick','Blast throws pieces ×',0,2.5,.05],['streakSpeed','Streak symbol speed',30,400,5]]],
['Raiders',[['raiderRate','Raid chance /s while stopped',0,.2,.005],['raiderStopDelay','Raids start after stopped (s)',0,30,1],['raiderMax','Max raiders',0,12,1],['raiderBursts','Raider bursts before leaving',1,20,1],['raiderGap','Min seconds between raids',0,300,5],['raiderCarDmg','Raider bullet damage to cars',0,120,5],['raiderRange','Raider firing range',20,150,5],['raiderFleeAt','Raider flees below',.5,1,.05],['raiderCoverHit','Doorway hit chance / shot',0,1,.05],['looterGun','Armed looters fire back (1/0)',0,1,1],['looterDmg','Looter rifle damage',0,40,1]]],
['Crew recovery',[['bodyHurtAt','Body: wounded below',.5,1,.05],['bodyDeadAt','Body: dead below',.1,.8,.05],['droneHunt','Drones hunt looters /s',0,2,.05],['dryWorkMult','No-water job time ×',1,3,.05],['healBase','Seconds per HP healed',5,200,1],['healMedic','Seconds per HP per MEDIC',1,60,1],['strandedChance','Stranded survivor injured',0,1,.05]]],
['Crew life',[['drink','Water drunk /s',0,.05,.001],['healDrink','Extra water while healing /s',0,.05,.001],['flasks','Flasks carried',1,6,1],['flaskLow','Refill below',0,2,.1],['deckWalk','Roof walk speed',5,60,1],['fireCrew','Bucket brigade size',0,6,1],['throwEvery','Bucket throw every s',.3,4,.1],['splashR','Bucket soak radius',1,10,.5],['armorBlock','Armour blocks',0,.9,.05],['pickBonus','Pickaxe speed bonus',0,1.5,.05],['guards','Riflemen on the roof',0,6,1],['cruiseObstacle','Cruise brakes for obstacles (1/0)',0,1,1]]],
['Looting',[['lootDepthRisk','Deeper loads: risk ×',0,4,.1],['lootDepthRich','Deeper loads: richer ×',0,2,.05],['lootDepthWork','Deeper loads: slower ×',0,2,.05],['lootNoise','Risk per extra looter',0,.5,.01],['lootTear','Building torn per load ×',0,3,.1],['trapKill','Trapped looter death chance',0,1,.05]]],
['Water & crane',[['wetTime','Wet pixels stay wet s',0,20,.5],['wetQuench','Wet quench rate',0,8,.1],['hoseSpeed','Hose pressure',60,400,5],['towerFlow','Tower flow /s',2,60,1],['pumpEvery','Pump interval s',.1,2,.05],['pumpReach','Pump reach px',60,600,10],['waterPerDrop','Water per droplet',.05,2,.05],['rainWater','Rain refill /s',0,5,.1],['craneReach','Crane reach px',20,300,5],['craneEvery','Crane lift interval s',.2,4,.1],['craneGrab','Pixels per lift',5,150,5],['pixelsPerScrap','Pixels per scrap',5,120,1],['craneMaxSpeed','Crane works below speed',0,80,1]]],
['World & camera',[['legLen','Leg length',1500,9000,100],['legGrow','Leg growth',0,2000,50],['lookAhead','Camera look-ahead',0,6,.1],['zoomIdle','Zoom return after s',1,15,.5]]],
];
function changedKnobs(){const o={};for(const[,list]of KNOBS)for(const[k]of list)if(CFG[k]!==CFG_DEFAULT[k])o[k]=CFG[k];return o}
function saveBalance(){try{localStorage.setItem(DEV_KEY,JSON.stringify(changedKnobs()))}catch(e){}}
(function loadBalance(){try{const o=JSON.parse(localStorage.getItem(DEV_KEY)||'{}');for(const k in o)if(k in CFG_DEFAULT&&typeof o[k]==='number')CFG[k]=o[k]}catch(e){}})();
function buildKnobs(){
$('devKnobs').innerHTML=KNOBS.map(([g,list],gi)=>`<details ${gi===0?'open':''}><summary>${g}</summary>${list.map(([k,l,mn,mx,st])=>`<div class="kn ${CFG[k]!==CFG_DEFAULT[k]?'chg':''}" data-k="${k}"><label for="kn_${k}" title="${k} · default ${CFG_DEFAULT[k]}">${l}</label><input type="range" id="kn_${k}" min="${mn}" max="${mx}" step="${st}" value="${CFG[k]}"><output title="Click to reset to ${CFG_DEFAULT[k]}">${fmtK(CFG[k])}</output></div>`).join('')}</details>`).join('');
devChanged();
}
const fmtK=v=>Math.abs(v)>=100?String(Math.round(v)):(+v.toFixed(3)).toString();
function devChanged(){const n=Object.keys(changedKnobs()).length;$('devChanged').textContent=n?`${n} changed from default`:'all default'}
$('devKnobs').addEventListener('input',e=>{const t=e.target;if(t.type!=='range')return;const row=t.closest('.kn'),k=row.dataset.k;CFG[k]=+t.value;row.querySelector('output').textContent=fmtK(CFG[k]);row.classList.toggle('chg',CFG[k]!==CFG_DEFAULT[k]);saveBalance();devChanged()});
$('devKnobs').addEventListener('change',e=>{const t=e.target;if(t.type==='range'){const k=t.closest('.kn').dataset.k;G.mlog.push({t:G.tel.time,leg:G.leg,x:G.train?Math.round(G.train.cars[0].ax):0,msg:`BALANCE ${k} → ${CFG[k]}`,cls:'warn'})}});
$('devKnobs').addEventListener('click',e=>{const o=e.target.closest('output');if(!o)return;const row=o.closest('.kn'),k=row.dataset.k;CFG[k]=CFG_DEFAULT[k];row.querySelector('input').value=CFG[k];o.textContent=fmtK(CFG[k]);row.classList.remove('chg');saveBalance();devChanged()});
$('devResetAll').onclick=()=>{for(const[,list]of KNOBS)for(const[k]of list)CFG[k]=CFG_DEFAULT[k];saveBalance();buildKnobs();log('Balance reset to defaults','warn')};
function toggleDev(v){G.dev.open=v===undefined?!G.dev.open:v;$('dev').hidden=!G.dev.open;document.body.classList.toggle('dev',G.dev.open);$('vbDev').setAttribute('aria-pressed',String(G.dev.open));if(G.dev.open)buildKnobs()}
$('vbDev').onclick=()=>toggleDev();$('devClose').onclick=()=>toggleDev(false);
$('devTs').addEventListener('click',e=>{const b=e.target.closest('[data-ts]');if(!b)return;G.dev.ts=+b.dataset.ts;[...$('devTs').children].forEach(x=>x.setAttribute('aria-pressed',x===b))});
$('devGod').onchange=e=>{G.dev.god=e.target.checked};$('devAuto').onchange=e=>{G.dev.auto=e.target.checked;G.ap=null;log(G.dev.auto?'Autopilot on — the bot drives, scavenges, repairs and shoots':'Autopilot off','warn')};$('devCalm').onchange=e=>{G.dev.calm=e.target.checked};$('devBiome').onchange=e=>{G.dev.biome=e.target.value};
$('dev').addEventListener('click',e=>{const b=e.target.closest('[data-sp]');if(!b)return;if(G.state!=='play'){log('Start a run to use spawn tools','warn');return}testSpawn(b.dataset.sp,b.textContent)});
function testSpawn(a,label){const L=G.train.cars[0],cars=G.train.cars;
if(a==='raiders'){spawnRaiders()}else
if(a==='plane'){spawnPlane()}
else if(a==='heli'){spawnAir('heli')}
else if(a==='pxdrone'){spawnAir('drone')}
else if(a==='tank'){const t=spawnAir('tank');t.ay=surfaceY(t.ax);vehPose(t)}
else if(a==='driller'){if(cars.length<8){const c=makeCar('driller');updateRegions(c);cars.push(c);layout(cars,G.train.x);G.hudSig=''}}
else if(a==='drone'||a==='bomber'){const n0=G.drones.length;spawnDrone();const d=G.drones.length>n0?G.drones[G.drones.length-1]:null;if(d){d.bomber=a==='bomber';d.hp=d.bomber?5:3}}
else if(a==='rocks'){for(let i=0;i<5;i++)spawnRock()}
else if(a==='obstacle')addObstacle(L.x+L.w/2+170,Math.random()<.5?'rock':'wreck');
else if(a==='fire'){const c=pick(cars);for(let n=0;n<25;n++){const k=(Math.random()*c.n)|0;if(c.mat[k]&&FLAM[c.mat[k]]>0)c.fire[k]=.8}}
else if(a==='blast'){const c=pick(cars);G.explQ.push({x:c.cxw+rand(-c.w*.3,c.w*.3),y:c.cyw+rand(-6,6),r:9,p:150,ign:.5,cause:'test blast'})}
else if(a==='res'){computeCaps();for(const k of['fuel','scrap','ammo','equip'])G.res[k]=Math.min(G.caps[k],G.res[k]+10)}
else if(a==='crew'){const m=addCrew({kit:[['water',2]]});log(`${m.name} joins the crew`,'good')}
else if(a==='fix'){for(const c of cars){for(let k=0;k<c.n;k++){c.mat[k]=c.omat[k];c.hp[k]=c.omat[k]?MAXHP[c.omat[k]]:0;c.fire[k]=0;c.rust[k]=0}updateRegions(c)}}
else if(a==='station'){G.train.x=G.world.LEN-120;G.train.v=0}
else if(a==='ahead'){G.train.x=Math.min(G.world.LEN-60,G.train.x+500);G.camX=G.train.x-S.W*.6}
else if(a==='wagon'){if(cars.length<8){const c=makeCar(pick(['tender','passenger','armored','cargo','crane','water']));updateRegions(c);cars.push(c)}}
G.mlog.push({t:G.tel.time,leg:G.leg,x:Math.round(L.ax),msg:`TEST ${label||a}`,cls:'warn'});
}
function buildReport(){
const pad=(n,l=2)=>String(n).padStart(l,'0'),tm=t=>`${pad(Math.floor(t/60))}:${pad(Math.floor(t%60))}`,ch=changedKnobs(),out=[];
out.push(`APOCALYPTIC TRAIN v${GAME_VERSION} — PLAYTEST REPORT`,`Generated ${new Date().toISOString().slice(0,16).replace('T',' ')} · seed ${G.seed}`,'');
out.push('BALANCE CHANGES FROM DEFAULT');out.push(Object.keys(ch).length?Object.entries(ch).map(([k,v])=>`  ${k}: ${CFG_DEFAULT[k]} → ${v}`).join('\n'):'  none');
const flags=[G.dev.god&&'no damage',G.dev.calm&&'no hazards',G.dev.biome&&'forced biome '+G.dev.biome,G.dev.ts!==1&&'time ×'+G.dev.ts].filter(Boolean);if(flags.length)out.push('  test flags: '+flags.join(', '));
out.push('');
const legs=G.legReports.slice();if(G.state==='play')legs.push({leg:G.leg,result:'in progress',tel:G.tel,res:G.res,cars:G.train.cars.map(c=>c.type+' '+Math.round(c.integrity*100)+'%')});
for(const L of legs){const T=L.tel,dm=Object.entries(T.dmg).filter(([,v])=>v>1).sort((a,b)=>b[1]-a[1]);
out.push(`LEG ${L.leg} — ${L.result}`,`  time ${tm(T.time)} · fuel burned ${Math.round(T.fuel)} · scrap in/out ${T.scrapIn}/${T.scrapOut} · ammo made/fired ${T.ammoMade}/${T.ammoUsed} · drones downed ${T.kills} · crew +${T.crewGained}/−${T.crewLost}`,
`  end hold: fuel ${Math.floor(L.res.fuel)} · scrap ${L.res.scrap} · ammo ${L.res.ammo} · equip ${L.res.equip} · crew ${L.res.crew}${L.res.hurt?` (${L.res.hurt} hurt)`:''}`,`  cars: ${L.cars.join(', ')}`,
'  damage by source (hp): '+(dm.map(([k,v])=>`${k} ${Math.round(v)}`).join(' · ')||'none'),'')}
out.push('TIMELINE (time · leg · x · event)');
for(const e of G.mlog.slice(-400))out.push(`  ${tm(e.t)} · L${e.leg} · ${String(e.x).padStart(5)} · ${e.snap?'[snap] ':''}${e.msg}`);
return out.join('\n');
}
$('devCopy').onclick=()=>{const txt=buildReport(),ta=$('devOut');ta.value=txt;
(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>{ta.hidden=true;log(`Report copied (${txt.split('\n').length} lines) — paste it to Claude`,'good')}).catch(()=>{ta.hidden=false;ta.style.cssText='width:100%;min-height:140px;margin-top:8px;font:10px var(--mono);background:#141312;color:var(--bone);border:1px solid var(--line)';ta.focus();ta.select();log('Copy blocked — the report is selected below, press Ctrl/Cmd+C','warn')})};
$('devClear').onclick=()=>{G.mlog=[];G.legReports=[];log('Match log cleared','warn')};
function devTick(){
if(!G.dev.open)return;const L=G.train&&G.train.cars[0];
$('devStats').innerHTML=[['FPS',Math.round(G.fps)],['Speed',L?Math.round(G.train.v):0],['Zoom',Math.round(G.viewH)],['Particles',G.parts.length],['Chunks',G.chunks.length],['Drones',G.drones.length],['Obstacles',G.obstacles.length],['Burning px',G.all.reduce((a,c)=>a+(c.fires||0),0)],['Active px',PX.act.length],['Symbols',symCount],['Heap px',PX.cells.size],['Ground fire',PX.burning.size],['Log',G.mlog.length]].map(([a,b])=>`<span>${a} <b>${b}</b></span>`).join('');
if(G.prof){const P=G.prof,X=G.profMax||{},tot=Object.values(P).reduce((a,b)=>a+b,0);
$('devStats').innerHTML+=`<div class="perf" style="grid-column:1/-1;font-size:10px;color:#a79e89;margin-top:4px">FRAME ${tot.toFixed(1)} ms · quality ${Math.round((G.q||1)*100)}%<br>${Object.keys(P).filter(k=>P[k]>.05||X[k]>1).sort((a,b)=>P[b]-P[a]).map(k=>`${k} ${P[k].toFixed(1)}/${(X[k]||0).toFixed(0)}`).join(' · ')}</div>`}
$('devTail').innerHTML=G.mlog.slice(-14).reverse().map(e=>`<div class="${e.snap?'snap':e.cls}">${Math.floor(e.t/60)}:${String(Math.floor(e.t%60)).padStart(2,'0')} ${e.msg}</div>`).join('');
}
function setCell(i){G.cell=clamp(i,0,CFG.cellPresets.length-1);if(gl)buildAtlas();updateViewbar()}
function setRaw(v){G.raw=v;updateViewbar()}
function updateViewbar(){const cp=CFG.cellPresets[G.cell];$('vbG').textContent=`${cp[0]}×${cp[1]}`;
const a=$('vbAscii');a.setAttribute('aria-pressed',String(!G.raw));a.textContent=G.raw?'PIXELS':'ASCII ON';
$('vbZ').textContent=G.zoomManual?`${Math.round(292/G.zoomTarget*100)}%`:'AUTO'}
$('vbAscii').onclick=()=>setRaw(!G.raw);$('vbGm').onclick=()=>setCell(G.cell-1);$('vbGp').onclick=()=>setCell(G.cell+1);
$('vbZm').onclick=()=>zoomBy(1/.8);$('vbZp').onclick=()=>zoomBy(.8);$('vbZ').onclick=zoomAuto;
const mapCv=$('map'),mctx=mapCv.getContext('2d');
const BCOL={waste:'#6f6352',city:'#575b6b',canyon:'#7c5640',acid:'#56704a',lava:'#9c4428'};
function drawMap(){
const w=G.world,cw=Math.max(60,mapCv.clientWidth|0),k=dpr;
if(mapCv.width!==cw*k){mapCv.width=cw*k;mapCv.height=30*k}
const W=mapCv.width,sx=W/(w.LEN+220),L=G.train.cars[0].ax;
mctx.clearRect(0,0,W,mapCv.height);
for(const g of w.segs){const x0=g.x0*sx,x1=Math.min(g.x1,w.LEN+220)*sx;mctx.fillStyle=BCOL[g.type];mctx.fillRect(x0,11*k,Math.max(1,x1-x0),5*k)}
mctx.fillStyle='rgba(7,7,8,.55)';mctx.fillRect(0,11*k,clamp(L*sx,0,W),5*k);
for(const s of w.sites){mctx.fillStyle=s.type==='tower'?(s.water>0&&!s.collapsed?'#6fb6ff':'#4a453e'):s.uses>0?(s.type==='bunker'?'#d0412c':s.type==='yard'?'#dca54a':'#dca54a'):'#4a453e';mctx.fillRect(s.x*sx-1.5*k,4*k,3*k,3*k)}
for(const bu of w.buried||[])if(!bu.looted){mctx.fillStyle=bu.kind==='bunker'?'#ff6e3c':bu.kind==='chest'?'#ffd84a':'#b88858';mctx.fillRect(bu.x*sx-1*k,16.5*k,2.5*k,2.5*k)}
mctx.fillStyle='#dca54a';for(const o of G.obstacles){if(o.x>L-200&&o.x<L+900)mctx.fillRect(o.x*sx-k,19*k,2*k,4*k)}
mctx.fillStyle='#d8cdb4';mctx.fillRect(w.LEN*sx,2*k,1*k,22*k);mctx.fillRect(w.LEN*sx,2*k,5*k,3*k);
const last=G.train.cars[G.train.cars.length-1];mctx.fillStyle='#ffffff';mctx.fillRect((last.x-last.w/2)*sx,9*k,Math.max(2*k,(L+40-last.x)*sx),9*k);
for(const f of ownFlyers()){const fx=clamp(f.cxw*sx,2*k,W-2*k),alt=clamp(groundY(f.cxw)-f.cyw,0,420),fy=clamp((11-alt/420*9.5)*k,1.5*k,11*k);
mctx.fillStyle='rgba(80,255,220,.38)';mctx.fillRect(fx-.5*k,fy,1*k,11*k-fy);
mctx.fillStyle=f.pax?'#ffc04a':f===G.piloting?'#50ffdc':'#9fb07c';mctx.fillRect(fx-2*k,fy-1.5*k,4*k,3*k)}
mctx.fillStyle='#c25a3b';for(const g of G.loose){const c=g.cars[0];mctx.fillRect(c.x*sx-1*k,9*k,2*k,9*k)}
mctx.fillStyle='#7f786c';mctx.font=`${9*k}px "IBM Plex Mono",monospace`;mctx.textBaseline='bottom';mctx.fillText('sites ▪  obstacles ▪  station ▌',0,30*k);
}
