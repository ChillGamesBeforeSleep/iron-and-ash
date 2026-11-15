/* overlays */
const overlay=$('overlay'),panel=$('panel');
function showTitle(){
G.state='title';document.body.classList.add('title');overlay.hidden=false;$('top').hidden=true;$('keys').hidden=true;
panel.innerHTML=`<h2>Apocalyptic Train · v${GAME_VERSION}</h2><h1>ENGINE V2</h1>
<p>Drive the train to the station at the end of each leg. Every car is simulated pixel by pixel and split into 8 regions: top row is function, bottom row is wheels. A region below 50% stops working.</p>
<table>
<tr><td>Drive</td><td>→ / D throttle, ← / A reverse, ↓ / S / Space brake. One of your crew must sit in the cab; you need fuel and wheels with traction.</td></tr>
<tr><td>Crew</td><td>Each person has health 0–10 and a 10-slot pack. They drink from their pack and only heal with water in it. They fetch water at the tanker, carry loot to the storage wagons and throw water on fires by themselves. [C] shows the crew.</td></tr>
<tr><td>Repair</td><td>Click a region cell at the bottom. 1 scrap = +50%. Q repairs the worst region.</td></tr>
<tr><td>Scavenge</td><td>Stop next to a site and press E. Crew walk out, loot, and walk back. Don't leave them behind.</td></tr>
<tr><td>Fight</td><td>Click to fire the cannon on the armored car. Shells can hit your own train.</td></tr>
<tr><td>Lose cars</td><td>A car under 30% breaks apart. Cars behind it uncouple. Reverse gently into them to recouple.</td></tr>
</table>
<div class="btns">${readSave()?`<button class="go" id="cont">CONTINUE — LEG ${readSave().leg}</button>`:''}<button class="go ${readSave()?'alt':''}" id="start">NEW RUN</button><button class="go alt" id="wsbtn">UNIT FORGE</button><button class="go alt" id="cxbtn">CODEX / WIKI</button></div>`;
$('wsbtn').onclick=showWorkshop;
$('cxbtn').onclick=()=>showCodex('units');
$('start').onclick=()=>startRun();
if($('cont'))$('cont').onclick=()=>{const d=readSave();if(d)loadGame(d)};
}
function unitStatList(c){
const rc=c.regCount||8;if(rc===3)return[`Grid: 1×3 flyer (${c.w}×${c.h} px)`,`Mass: ${c.d.mass}`,`Engine tank: ${CFG.airFuelCap} gas`,`Weapon pool: ${CFG.airAmmoCap} ammo (${CFG.airAmmoCap*CFG.airShotsPerAmmo} shots / ${CFG.airAmmoCap} bombs)`];
const K=CFG.cap,cap={cab:false,medic:0,fuel:0,crew:0,ammo:0,scrap:0,equip:0,traction:0,boost:1,ram:false,cannon:null,workshop:false,water:0,pump:0,crane:null,carrier:null};
for(let r=0;r<rc;r++){const R=ROLES[c.d.roles[r]];if(R&&R.on)R.on(cap,0,c,r,K)}
const out=[`Grid: 4×2 (${c.w}×${c.h} px) · Mass ${c.d.mass}`];
if(cap.cab)out.push('Driver cab');if(cap.traction)out.push(`Traction ${Math.round(cap.traction*100)}%`);if(cap.boost>1)out.push(`Power +${Math.round((cap.boost-1)*100)}%`);
if(cap.ram)out.push('Plough (−65% impact)');if(cap.fuel)out.push(`Fuel +${cap.fuel}`);if(cap.water)out.push(`Water +${cap.water}`);
if(cap.crew)out.push(`Seats +${cap.crew}`);if(cap.ammo)out.push(`Ammo +${cap.ammo}`);if(cap.scrap)out.push(`Scrap +${cap.scrap}`);
if(cap.equip)out.push(`Equip +${cap.equip}`);if(cap.cannon)out.push('Turret cannon');if(cap.workshop)out.push('Ammo workshop');
if(cap.pump)out.push('Fire pump');if(cap.crane)out.push('Salvage crane');if(cap.carrier)out.push(`Flight deck (${c.d.bay||'plane'})`);
return out}
function showCodex(tab){
tab=tab||'units';const fromPlay=(G.state==='play');if(fromPlay){G.paused=true;G.cxFromPlay=true}
overlay.hidden=false;panel.className='panel wide codex';
const tabs=[['units','UNITS & VEHICLES ('+Object.keys(CARS).filter(k=>k!==FORGE_ID).length+')'],['roles','SECTIONS & ROLES ('+Object.keys(ROLES).length+')'],['mats','MATERIALS ('+(MATS.length-1)+')'],['map','MAP FEATURES ('+(Object.keys(SITES).length+Object.keys(BURIED).length+Object.keys(BIOMES).length)+')'],['rules','PHYSICS & RULES']];
let body='';
if(tab==='units'){
const keys=Object.keys(CARS).filter(k=>k!==FORGE_ID);
body='<div class="cx-grid">'+keys.map(k=>{
const d=CARS[k],rc=regCount(d),kind=d.base==='loco'?'LOCOMOTIVE':rc===3?'AIRCRAFT (1×3)':'WAGON (4×2)'+(BLUEPRINTS[k]?' · CUSTOM':'');
const c=makeCar(k);c.occ.fill(1);updateRegions(c);paintCar(c);
let px=0;for(let i=0;i<c.n;i++)if(c.mat[i])px++;
const stats=unitStatList(c).join(' · ');
const roles=d.roles.slice(0,rc).map((r,i)=>`<span>[${rc===3?i:i%4},${rc===3?0:i>>2}] ${r}</span>`).join('');
return `<div class="cx-card" data-cxunit="${k}"><header><b>${d.name}</b><small>${kind}</small></header><div class="cx-art"></div><div class="cx-meta">${stats} · ${px} active px</div><div class="cx-tags">${roles}</div></div>`;
}).join('')+'</div>';
}else if(tab==='roles'){
body='<table><tr><td>Role</td><td>Row / Group</td><td>Effect (L0 → L3) & Station Upgrade</td><td>100% Click Ability & Needs</td></tr>'+Object.entries(ROLES).map(([k,R])=>{
const st=R.stat?(`L0: ${R.stat(0,'wagon')} → L3: ${R.stat(3,'wagon')}`):'';
const nd=R.need&&R.need.mat?('Needs ≥15% '+R.need.mat.join('/')):'';
return `<tr><td><b>${k}</b> <small style="color:var(--warn)">[${R.short}]</small></td><td>${R.group||'General'}</td><td>${R.help||''}${st?'<br><span style="color:var(--ok)">'+st+'</span>':''}${R.up?'<br><small>Upgrade: '+R.up+'</small>':''}</td><td>${R.actHelp?'<span style="color:#50ffdc">Click at 100%: '+R.actHelp+'</span><br>':''}${nd}</td></tr>`;
}).join('')+'</table>';
}else if(tab==='map'){
/* v3.40: the world half of the Wiki — every building, buried feature and biome, read live from SITES / BURIED / BIOMES,
   with a count of what is actually on the current leg */
const W=G.world||{},onLeg=(arr,f)=>(arr||[]).filter(f).length;
const loadTxt=o=>Object.entries(o||{}).map(([k,v])=>`${v} ${k}`).join(' · ')||'—';
body='<h3 class="cx-h">Buildings & sites <small>surface · stop next to one and press [E] to send looters</small></h3><div class="cx-grid">'+Object.entries(SITES).map(([k,D])=>{
const n=onLeg(W.sites,s=>s.type===k),left=onLeg(W.sites,s=>s.type===k&&(s.stock>0||!D.stock));
return `<div class="cx-card" data-cxsite="${k}"><header><b>${D.name}</b><small>${D.stock?'RISK '+D.risk.toUpperCase():'SPECIAL'}</small></header><div class="cx-art"></div><div class="cx-meta">${D.stock?`${D.stock} loads · ${D.slots} looters · ${D.work}s per load · ${(D.p*100).toFixed(1)}% accident`:k==='tower'?'Refills the water tanker through the spout':k==='stranded'?'Stop to take survivors aboard':''}</div><div class="cx-tags"><span>per load: ${loadTxt(D.load)}</span>${k==='yard'?'<span>holds a spare EXCAVATOR RIG</span>':''}<span style="color:var(--ok)">this leg: ${n}${n&&D.stock?' ('+left+' not emptied)':''}</span></div></div>`}).join('')+'</div>';
body+='<h3 class="cx-h">Underground <small>reach these with the TUNNEL DRILLER — launch it from the Excavator Rig\'s DECK</small></h3><table><tr><td>Feature</td><td>Size</td><td>Loot</td><td>Notes</td><td>This leg</td></tr>'+Object.entries(BURIED).map(([k,B])=>{
const n=onLeg(W.buried,b=>b.kind===k),done=onLeg(W.buried,b=>b.kind===k&&b.looted),hex=rgb(B.col);
return `<tr><td><i style="display:inline-block;width:10px;height:10px;background:${hex};margin-right:6px;border:1px solid #fff"></i><b>${B.name}</b></td><td>r ${B.r} px</td><td>${loadTxt(B.reward)}${B.gear?' · 1 of '+B.gear.map(g=>ITEMS[g]?ITEMS[g].name:g).join(' / '):''}</td><td>${B.note}</td><td style="color:var(--ok)">${n} (${done} excavated)</td></tr>`}).join('')
+`<tr><td><b>BUNKER DEFENSE TURRET</b></td><td>—</td><td>3 scrap · 1 equip · 4 ammo</td><td>Sleeps beside a bunker. Destroy it with a seismic charge [Space] or ram it with the drill.</td><td style="color:var(--ok)">${onLeg(W.subTurrets,t=>true)} (${onLeg(W.subTurrets,t=>!t.alive)} destroyed)</td></tr></table>`;
body+='<h3 class="cx-h">Biomes <small>each leg crosses several</small></h3><table><tr><td>Biome</td><td>Sky</td><td>What it does</td><td>This leg</td></tr>'+Object.entries(BIOMES).map(([k,B])=>{
const n=onLeg(W.tiles,t=>t.biome===k);
return `<tr><td><b>${B.name}</b></td><td><i style="display:inline-block;width:34px;height:10px;background:${rgb(B.sky)};border:1px solid #fff"></i></td><td>${B.sub}</td><td style="color:var(--ok)">${n?n+' of '+(W.tiles||[]).length+' tiles':'—'}</td></tr>`}).join('')+'</table>';
}else if(tab==='mats'){
body='<table><tr><td>Material</td><td>Code RGB / Sym</td><td>HP · Mass · Bounce</td><td>Live Physical Behaviour</td></tr>'+MATS.slice(1).map((m,idx)=>{
const id=idx+1,hex='#'+m.pal.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
return `<tr><td><i style="display:inline-block;width:10px;height:10px;background:${hex};margin-right:6px;border:1px solid #fff"></i><b>${m.key}</b></td><td><code>${hex}</code> · glyph <b>${m.sym||'#'}</b></td><td>${m.hp} HP · ${m.mass}× mass · ${m.bounce} bounce</td><td>${matBlurb(id)}</td></tr>`;
}).join('')+'</table>';
}else{
body=`<table>
<tr><td>4×2 Ground Units</td><td>Locomotives & wagons split into 8 sections (4 top job sections, 4 bottom wheel/axle sections). Any section below <b>${Math.round(CFG.disableAt*100)}%</b> HP switches off. Whole car breaks apart below <b>${Math.round(CFG.carDeathAt*100)}%</b>.</td></tr>
<tr><td>1×3 Flying Units</td><td>Planes, helicopters & drones split into 3 horizontal boxes: <b>[0] CAB</b> (pilot & lift/tail), <b>[1] ENGINE</b> (${CFG.airFuelCap} gas, D=thrust, A=air-brake), <b>[2] WEAPON</b> (${CFG.airAmmoCap} ammo = ${CFG.airAmmoCap*CFG.airShotsPerAmmo} gun shots or ${CFG.airAmmoCap} bombs). A box disables below <b>${Math.round(CFG.disableAt*100)}%</b> HP or when <b>>${CFG.secMaxDmgPx} pixels</b> are damaged. Whole aircraft explodes below <b>${Math.round(CFG.planeDownAt*100)}%</b> into 3 fragile burning chunks.</td></tr>
<tr><td>Section Click Abilities</td><td>Clicking any damaged section repairs it (<b>1 scrap = +${Math.round(CFG.repairPerScrap*100)}%</b>). Clicking a section at <b>100%</b> activates its ability (CAB = Auto Drive, CANNON = Auto Gunner, DECK = Launch Aircraft, SEATS = Send Looters), which stays active down to <b>${Math.round(CFG.abilityKeep*100)}%</b>.</td></tr>
<tr><td>Skill Landing & Rail Looting</td><td>Touch down with vertical sink rate <b>vy ≤ ${CFG.landSafeVy} px/s</b> and pitch <b>≤ ${Math.round(CFG.landMaxPitch*57)}°</b> to land anywhere on the rails (belly scraping sparks as you brake; crash impact past <b>${CFG.landCrashVy} px/s</b>). Press <b>[E]</b> while landed to send the pilot looting, or press <b>[E]</b> under your home Carrier wagon to dock and copy the plane's 1×3 health onto the wagon's 3 DECK boxes.</td></tr>
<tr><td>Airlift & Co-Pilot</td><td>Landing within 75 px of Stranded Survivors (or looting a Camp via <b>[E]</b>) boards a co-pilot into the cockpit (<b>${Math.round((1-CFG.copilotReload)*100)}% faster gun reload</b>) and transfers them to your train crew when you dock on the carrier.</td></tr>
<tr><td>High Sky & Train Autonomy</td><td>World sky extends <b>${G.world?G.world.H:700} px</b> high. Climbing past <b>${CFG.highAlt} px</b> and <b>${CFG.dangerAlt} px</b> escalates interceptor spawns. Meanwhile, your train simulates autonomously in the background (crew auto-repairs sections below 68% every <b>${CFG.crewRepairEvery}s</b>, fights fires with buckets, and fires the auto-gunner).</td></tr>
<tr><td>3-Tier Intellect & Veterancy</td><td>Enemy flyers & raiders scale from <b>L1 Basic</b> (Legs 1–2) → <b>L2 Advanced</b> (Legs 3–4, target priority + velocity lead) → <b>L3 Master</b> (Leg 5+, shell evasion + weak-spot sniping). Crew gain <b>+${CFG.crewXpPerLeg} XP/leg</b>, advancing L1 → L2 → L3 for faster fire rate and predictive aim.</td></tr>
</table>`;
}
panel.innerHTML=`<h2>Iron & Ash · v${GAME_VERSION} · Live Code Reference</h2><h1>CODEX & WIKI</h1>
<p>Every unit sprite, section formula, material property and physics rule below is read live from the engine registries (<code>CARS</code>, <code>ROLES</code>, <code>MATS</code>, <code>SITES</code>, <code>BURIED</code>, <code>BIOMES</code>, <code>CFG</code>) — it updates automatically whenever the code or balance changes.</p>
<div class="cx-tabs">${tabs.map(([k,t])=>`<button type="button" class="ub2" data-cxtab="${k}" aria-pressed="${k===tab}">${t}</button>`).join('')}</div>
${body}
<div class="btns"><button class="go" id="cxBack" type="button">← ${G.cxFromPlay?'RESUME GAME':'BACK TO TITLE'}</button></div>`;
if(tab==='units'){
panel.querySelectorAll('[data-cxunit]').forEach(el=>{
const k=el.dataset.cxunit,c=makeCar(k);c.occ.fill(1);c.phase=.4;updateRegions(c);paintCar(c);
const scale=c.w<40?4:2,cv=document.createElement('canvas');cv.width=c.w*scale;cv.height=c.h*scale;
const x=cv.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(c.cv,0,0,cv.width,cv.height);
const rc=c.regCount||8,bw=cv.width/(rc===3?3:4);x.strokeStyle='rgba(0,255,255,.45)';x.lineWidth=1;
for(let r=0;r<rc;r++){const x0=(rc===3?r:r%4)*bw,y0=rc===3?0:(r<4?0:c.d.split*scale),h=rc===3?cv.height:(r<4?c.d.split*scale:cv.height-c.d.split*scale);x.strokeRect(x0+.5,y0+.5,bw-1,h-1)}
el.querySelector('.cx-art').appendChild(cv);
});
}
if(tab==='map'&&G.world&&G.world.T){
panel.querySelectorAll('[data-cxsite]').forEach(el=>{
const type=el.dataset.cxsite,cw=110,ch=96,x=Math.round(clamp(G.world.W*.5,60,G.world.W-60)),gy=Math.round(G.world.T[x])+1;
const cv=document.createElement('canvas');cv.width=cw;cv.height=ch;const c=cv.getContext('2d');c.translate(cw/2-x,ch-3-gy);
try{drawSite(c,{x,type,w:0},mulberry32(7+type.length*13))}catch(e){}
const big=document.createElement('canvas');big.width=cw*2;big.height=ch*2;const bx=big.getContext('2d');bx.imageSmoothingEnabled=false;bx.drawImage(cv,0,0,big.width,big.height);
el.querySelector('.cx-art').appendChild(big);
});
}
panel.querySelectorAll('[data-cxtab]').forEach(b=>{b.onclick=()=>showCodex(b.dataset.cxtab)});
$('cxBack').onclick=closeCodex;
}
function closeCodex(){
if(G.cxFromPlay){G.cxFromPlay=false;G.paused=false;overlay.hidden=true;panel.className='panel';return}
panel.className='panel';showTitle();
}
function startRun(){
G.mlog=[];G.legReports=[];G.snapT=0;
G.leg=1;G.diff=1;G.res={crew:5,hurt:0,fuel:110,scrap:8,ammo:15,equip:2,water:75};G.stats={dist:0,kills:0,lost:0,repairs:0};G.train=newTrain();initCrew(G.res.crew);G.stash=[];startLeg();
}
function startLeg(fromSave){
G.cruise=false;G.cruiseWait=false;G.cruiseOb=null;G.gunner=false;
G.diff=1+CFG.diffPerLeg*(G.leg-1);document.body.classList.remove('station');panel.className='panel';G.tel=newTel();G.recruitT=0;
genWorld(G.leg);
G.loose=[];G.salvage=[];G.vehicles=[];G.cameraPilot=null;G.planeBack=[];G.drones=[];G.shots=[];G.rocks=[];G.parts=[];G.chunks=[];G.exp=null;G.away=0;G.boarders=[];G.strays=[];G.piloting=null;G.raiders=[];G.stopT=0;G.explQ=[];G.caps={};G.hudSig='';crewReset();baysAtStation();
G.train.x=Math.max(760,G.train.cars.reduce((a,c)=>a+c.w+CFG.gap,0)+80);G.train.v=0;G.throttle=0;layout(G.train.cars,G.train.x);G.all=G.train.cars.slice();G.all.forEach(updateRegions);computeCaps();
G.camX=clamp(G.train.x-S.W*.6,0,G.world.W-S.W-1);G.camY=clamp(G.train.cars[0].ay-S.H*.66,0,G.world.H-S.H-1);
G.train.cars.forEach(setMul);saveGame();
overlay.hidden=true;document.body.classList.remove('title');$('top').hidden=false;$('keys').hidden=false;G.state='play';log(`Leg ${G.leg} — reach the station ${G.world.LEN-760} m east`,'');
}
function legComplete(){
if(G.sim){endSim('The test train reached the station — test over');return}
baysAtStation();G.cruise=false;G.gunner=false;
G.legReports.push({leg:G.leg,result:'station',tel:JSON.parse(JSON.stringify(G.tel)),res:{...G.res},cars:G.train.cars.map(c=>c.type+' '+Math.round(c.integrity*100)+'%')});
G.state='leg';document.body.classList.add('station');overlay.hidden=false;
computeCaps();G.res.scrap=Math.min(G.caps.scrap,G.res.scrap+CFG.stationScrap);{const f0=G.res.fuel;G.res.fuel=Math.min(G.caps.fuel,G.res.fuel+CFG.stationFuel);G.tel.fuelIn.station=(G.tel.fuelIn.station||0)+G.res.fuel-f0}G.res.water=G.caps.water;log(`Station quartermaster: +${CFG.stationScrap} scrap, +${CFG.stationFuel} fuel`,'good');crewAtStation();
const pool=['passenger','cargo','tender','armored','crane','water','crane',...['carrier','helipad','driller'].filter(t=>!G.train.cars.some(c=>c.type===t)),...Object.keys(BLUEPRINTS).filter(id=>CARS[id]&&CARS[id].base==='wagon')];G.offers=[pick(pool)];let t2;do t2=pick(pool);while(t2===G.offers[0]);G.offers.push(t2);
computeCaps();renderStation();$('next').focus();
}
function gameOver(reason){
if(G.state!=='play')return;G.legReports.push({leg:G.leg,result:'DERAILED: '+reason,tel:JSON.parse(JSON.stringify(G.tel)),res:{...G.res},cars:G.train.cars.map(c=>c.type+' '+Math.round(c.integrity*100)+'%')});G.state='over';
setTimeout(()=>{overlay.hidden=false;panel.innerHTML=`<h2>Run ended · leg ${G.leg}</h2><h1>DERAILED</h1><p>${reason}</p>
<table><tr><td>Distance</td><td>${Math.round(G.stats.dist)} m</td></tr><tr><td>Drones downed</td><td>${G.stats.kills}</td></tr><tr><td>Cars lost</td><td>${G.stats.lost}</td></tr><tr><td>Repairs</td><td>${G.stats.repairs}</td></tr></table>
<div class="btns">${G.sim?'<button class="go" id="simBack">BACK TO FORGE</button>':''}${readSave()&&!G.sim?`<button class="go" id="retry">RETRY LEG ${readSave().leg}</button>`:''}<button class="go alt" id="again">NEW RUN</button></div>`;if($('simBack'))$('simBack').onclick=()=>endSim('');$('again').onclick=startRun;if($('retry')){$('retry').onclick=()=>{const d=readSave();if(d)loadGame(d)};$('retry').focus()}else $('again').focus()},1400);
}
