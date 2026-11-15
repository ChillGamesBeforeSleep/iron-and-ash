/* =====================================================================
   HUD
   ===================================================================== */
const $=id=>document.getElementById(id);
const logEl=$('log');
function log(msg,cls){if(G.state==='play'&&G.train&&G.train.cars[0])G.mlog.push({t:G.tel.time,leg:G.leg,x:Math.round(G.train.cars[0].ax),msg,cls:cls||''});if(cls==='bad')sfx('bad');else if(cls==='good'&&/^(Repaired|Workshop|Salvaged)/.test(msg))sfx('repair');else if(cls==='good')sfx('loot');const d=document.createElement('div');d.textContent=msg;if(cls)d.className=cls;logEl.prepend(d);while(logEl.children.length>4)logEl.lastChild.remove();setTimeout(()=>{d.style.opacity='0';setTimeout(()=>d.remove(),700)},4200)}
function intColor(v){const c=v<.5?[208,65,44]:v<.75?[220,165,74]:[159,176,124];const k=.55+.45*Math.min(1,v);return `rgb(${c[0]*k|0},${c[1]*k|0},${c[2]*k|0})`}
function buildTrainHUD(){
const bar=$('trainbar');bar.innerHTML='';
if(G.piloting&&(G.vehicles||[]).includes(G.piloting)){
const c=G.piloting,rc=c.regCount||3,wrap=document.createElement('div');wrap.className='cars';
const el=document.createElement('div');el.className='car';
const pname=(c.pilot?c.pilot.name:c.lootingHold?'OUT LOOTING':'AUTO')+((c.passengers&&c.passengers.length)?' + CO-PILOT: '+c.passengers.map(x=>x.name).join(', '):'');
el.innerHTML=`<h4><span>${c.d.name} · PILOT: ${pname}</span><em></em></h4><div class="grid ${rc===3?'grid3':''}"></div>`;
const grid=el.querySelector('.grid');c.cells=[];
for(let r=0;r<rc;r++){const b=document.createElement('button');b.className='cell';b.type='button';
const ro=c.d.roles[r];b.title=`${ro} — ${ROLE_HELP[ro]||''} Click when damaged: pilot repairs this box (1 scrap = +50%).`;
b.innerHTML=`<span>${ROLE_SHORT[ro]||ro}</span><span></span>`;b.dataset.lab=b.firstChild.textContent;b.dataset.role=ro;
b.addEventListener('click',e=>{e.stopPropagation();if(c.regInt[r]<.995||c.regFire[r])repairFull(c,r);else log(`${c.d.name} ${ro} is intact`,'')});
b.addEventListener('mouseenter',()=>G.hover=[c,r]);b.addEventListener('mouseleave',()=>{if(G.hover&&G.hover[0]===c&&G.hover[1]===r)G.hover=null});
grid.appendChild(b);c.cells.push(b)}
c.hudInt=el.querySelector('em');c.hudLoose=false;c.hudHead=el.querySelector('h4 span');wrap.appendChild(el);
const back=document.createElement('button');back.type='button';back.className='ub2';back.style.cssText='align-self:stretch;padding:0 12px;font-weight:600';
back.textContent='◀ TRAIN [Tab]';back.onclick=()=>setControl(null);wrap.appendChild(back);
bar.appendChild(wrap);return}
const mk=(cars,loose)=>{const wrap=document.createElement('div');wrap.className='cars';
for(const c of cars){const el=document.createElement('div');el.className='car'+(loose?' loose':'');
el.innerHTML=`<h4><span>${c.d.name}${loose?' · LOOSE':''}</span><em></em></h4><div class="grid"></div>`;
const grid=el.querySelector('.grid');c.cells=[];
for(let r=0;r<8;r++){const b=document.createElement('button');b.className='cell';b.type='button';b.title=`${c.d.roles[r]} — ${ROLE_HELP[c.d.roles[r]]} Click when damaged: full repair (1 scrap per 50% missing).${ROLES[c.d.roles[r]]&&ROLES[c.d.roles[r]].actHelp?' At 100%, click: '+ROLES[c.d.roles[r]].actHelp:''}`;
b.innerHTML=`<span>${ROLE_SHORT[c.d.roles[r]]}${c.lvl[r]?' '+'+'.repeat(c.lvl[r]):''}</span><span></span>`;b.dataset.lab=b.firstChild.textContent;b.dataset.role=c.d.roles[r];
if(!loose){b.addEventListener('click',e=>{e.stopPropagation();sectionClick(c,r)});}
b.addEventListener('mouseenter',()=>G.hover=[c,r]);b.addEventListener('mouseleave',()=>{if(G.hover&&G.hover[0]===c&&G.hover[1]===r)G.hover=null});
grid.appendChild(b);c.cells.push(b)}
c.hudInt=el.querySelector('em');c.hudLoose=loose;if(!loose)c.hudHead=el.querySelector('h4 span');
if(!loose&&c.bay&&c.bay.state==='air'&&c.bay.unit&&(canWinchBay(c)||c.bay.winching)){
const wb=document.createElement('button');wb.type='button';wb.className='ub2';wb.style.cssText='margin-top:3px;width:100%;font-weight:600;border-color:var(--ok);color:var(--ok);padding:2px 4px;font-size:9.5px';
wb.textContent=c.bay.winching?`▲ WINCHING… (${Math.max(0,c.bay.winchT).toFixed(1)}s)`:`▲ WINCH ${c.bay.unit.d.name} ON BOARD (2s)`;
wb.onclick=e=>{e.stopPropagation();startWinchBay(c)};
el.appendChild(wb);
}
wrap.appendChild(el)}
bar.appendChild(wrap)};
mk(G.train.cars,false);for(const g of G.loose)mk(g.cars,true);
}
function updateHUD(){
const cargoSig=G.piloting?((G.piloting.inv||[]).map(it=>it.k+':'+it.n).join(',')+'|'+(G.piloting.pilot?.inv||[]).map(it=>it.k+':'+it.n).join(',')):((G.stash||[]).map(it=>it.k).join(',')+'|'+['water','scrap','fuel','ammo','equip'].map(k=>Math.floor(G.res[k]||0)).join(','));const winchSig=G.train.cars.map(c=>c.bay?(c.bay.state+':'+(c.bay.winching?1:0)+':'+(canWinchBay(c)?1:0)):'').join(',');const sig=(G.piloting?'AIR:'+G.piloting.id:'TR:'+G.train.cars.map(c=>c.id+':'+c.lvl.join('')).join(',')+'|'+G.loose.map(g=>g.cars.map(c=>c.id).join('/')).join('/')+'|W:'+winchSig)+'|INV:'+cargoSig;
if(sig!==G.hudSig){G.hudSig=sig;buildTrainHUD()}
for(const c of G.all){if(!c.cells)continue;const rc=c.cells.length;c.hudInt.textContent=Math.round(c.integrity*100)+'%';
for(let r=0;r<rc;r++){const b=c.cells[r];if(!b)continue;const v=c.regInt[r];b.lastChild.textContent=Math.round(v*100)+'%';b.style.background=intColor(v);b.classList.toggle('dead',!c.alive[r]);b.classList.toggle('fire',c.regFire[r]>0);const tag=(c.hudLoose||rc===3)?null:cellTag(c,r),want=tag||b.dataset.lab;if(b.firstChild.textContent!==want){b.classList.toggle('auto',!!tag);b.firstChild.textContent=want}}
if(c.hudHead){const b=c.bay,u=b&&b.unit;const btxt=b&&!c.hudLoose?(b.state==='parked'?' · ON BOARD':b.state==='lost'?' · LOST':b.winching?` · WINCHING (${Math.max(0,b.winchT).toFixed(1)}s)`:canWinchBay(c)?' · CLICK DECK TO WINCH (2s)':u&&(u.parkedOnGround||u.landed||u.lootingHold)?` · MISSING (${Math.round(Math.abs(u.cxw-c.ax))}m)`:' · AIRBORNE'):'';const want=c.d.name+(G.cruise&&c.d.roles.includes('CAB')?' · AUTO':'')+btxt;if(c.hudHead.textContent!==want)c.hudHead.textContent=want}}
const R=G.res,C=G.caps,cls=(v,m)=>m<=0||v/m<.2?'low':v/m<.45?'mid':'';
const activeAir=G.piloting&&G.vehicles&&G.vehicles.includes(G.piloting)?G.piloting:null;
if(activeAir){const a=activeAir,alt=Math.round(groundY(a.cxw)-a.cyw);$('res').innerHTML=[['Aircraft',a.d.name,''],['Pilot',a.pilot?a.pilot.name:'NO PILOT',a.pilot?'':'low'],['Integrity',`${Math.round(100*(a.integrity||0))}%`,a.integrity<.55?'low':a.integrity<.75?'mid':''],['Gas',`${Math.max(0,a.gas||0).toFixed(1)}/${CFG.airFuelCap}`,(a.gas||0)<2?'low':(a.gas||0)<4?'mid':''],['Scrap',`${Math.floor(a.scrap||0)}/${CFG.airScrapCap}`,(a.scrap||0)<1?'low':''],['Ammo',`${Math.floor(a.ammoPool||0)} shots`,(a.ammoPool||0)<5?'low':''],['Cargo',`${(a.inv||[]).length}/${VEHICLE_PACK}`,''],['Speed',`${Math.round(a.vf||Math.abs(a.vx||0))}`,''],['Altitude',`${Math.max(0,alt)} m`,'']].map(([x,y,z])=>`<div class="r"><span>${x}</span><b class="${z}">${y}</b></div>`).join('');}
else $('res').innerHTML=[
['Crew',`${R.crew-G.away}/${C.crew}${G.away?` +${G.away} out`:''}${R.hurt?` · ${R.hurt} hurt`:''}${G.riders?` · ${G.riders} standing`:''}`,G.riders||R.hurt?'mid':R.crew<=2?'low':''],
['Fuel',`${Math.floor(R.fuel)}/${C.fuel}`,cls(R.fuel,C.fuel)],
['Scrap',`${R.scrap}/${C.scrap}`,R.scrap<1?'low':''],
['Ammo',`${R.ammo}/${C.ammo}`,C.cannon?cls(R.ammo,Math.max(1,C.ammo)):'low'],
['Equip',`${R.equip}/${C.equip}`,''],
...(C.water>0?[['Water',`${Math.floor(R.water||0)}/${C.water}`,C.pump?((R.water||0)<5?'low':''):'mid']]:[]),
['Speed',`${Math.round(Math.abs(G.train.v))}${G.train.v<-.5?' R':''}`,''],
['Traction',`${Math.round(C.traction*100)}%`,C.traction<.5?'low':C.traction<1?'mid':''],
].map(([a,b,c])=>`<div class="r"><span>${a}</span><b class="${c}">${b}</b></div>`).join('');
const flags=[];if(!C.driver)flags.push(['NO DRIVER','']);if(R.fuel<=0)flags.push(['NO FUEL','']);if(C.traction<=0)flags.push(['NO TRACTION','']);
if(G.brake)flags.push(['BRAKE','w']);if(G.train.cars.some(c=>c.fires>0))flags.push(['FIRE ON BOARD','w']);if(G.cruise)flags.push([G.cruiseWait?'CRUISE · WAITING':G.cruiseOb?'CRUISE · OBSTACLE':'AUTO CRUISE','w']);if(G.leak)flags.push(['FUEL LEAK','']);{const nr=G.raiders?G.raiders.filter(r=>r.alive&&!r.flee).length:0;if(nr)flags.push([`RAIDERS ×${nr}`,'w'])}if(G.loose.length)flags.push([`${G.loose.reduce((a,g)=>a+g.cars.length,0)} CAR(S) LOOSE`,'w']);
$('status').innerHTML=flags.map(([t,c])=>`<span class="flag ${c}">${t}</span>`).join('');
const L=G.train.cars[0],b=biomeAt(L.ax),B=BIOMES[b.type];$('zone').textContent=B.name;
const next=G.world.segs.find(s=>s.x0>L.ax);
$('zonesub').textContent=B.sub+(next&&next.x0-L.ax<500&&next.x0<G.world.LEN?`  Next: ${BIOMES[next.type].name.toLowerCase()} in ${Math.round(next.x0-L.ax)} m`:'');
drawMap();updateCrewPanel();
$('legtxt').textContent=`LEG ${G.leg} · ${Math.max(0,Math.round(G.world.LEN-L.ax))} m to station · difficulty ×${G.diff.toFixed(2)}`;
let pr=flightPrompt();
if(pr){}
else if(G.strays&&G.strays.some(m=>m.alive)){const m=G.strays.find(m=>m.alive);pr=`PILOT OUT — ${m.name} ${m.state==='chute'?'is parachuting down':'is walking back'}<small>Stay close: crew more than ${CFG.crewLostDist} m from the train are lost. Auto drive waits.</small>`}
else if(G.exp){const e=G.exp,st=e.resolved?'returning':e.members.some(m=>m.alive&&m.state==='out')?'walking out':`working ${Math.max(0,e.work-e.t).toFixed(0)}s`;pr=`CREW OUT — ${st}<small>[E] recall · Don't drive off. Crew more than ${CFG.crewLostDist} m from the train are lost.</small>`}
else if(Math.abs(G.train.v)<3){const t=findTarget();if(t)pr=t.kind==='clear'?`[E] SEND CREW TO CLEAR THE TRACK<small>Takes a few seconds. Drones love a parked train.</small>`:t.kind==='wreck'?`[E] STRIP THE WRECKAGE<small>Scrap from fallen pieces · 2 crew</small>`:t.kind==='salvage'?`[E] LOOT THE WRECKS AND BODIES<small>${(G.salvage||[]).length} nearby · crew pick up everything in reach, up to full packs</small>`:t.kind==='forage'?(G.caps.fuel-G.res.fuel<10?`[E] SCAVENGE JUNK<small>Fuel storage is full or broken — crew bring back scrap to repair it</small>`:`[E] FORAGE NEARBY<small>A little fuel, slowly · 2 crew · nothing better in reach</small>`):(()=>{const s=t.s,D=SITES[s.type],n=partySize(t);return`[E] SEND ${n} LOOTER${n>1?'S':''} → ${D.name}<small>${s.stock}/${s.stock0} loads left · ${Math.min(n,s.stock)} this trip · accident ${Math.round(siteRisk(s,n)*100)}% · fits ${D.slots}${s.type==='yard'&&s.wagon?' · wagon: needs 3':''}${s.type==='camp'&&s.people?` · ${s.people} survivor${s.people>1?'s':''}`:''}<br>[1–9] party size${G.party?` (${G.party})`:' (auto: half the crew)'} · [0] auto</small>`})();
else if(L.ax>G.world.LEN-60)pr='';}
if(!G.exp&&!G.piloting){const tw=towerNear();if(tw&&!/^\[E\] SEND/.test(pr))pr=tw}
if(!pr&&L.ax>G.world.LEN-260&&L.ax<G.world.LEN)pr='STATION AHEAD<small>Stop past the platform to finish the leg</small>';
$('prompt').innerHTML=pr;
}
$('keys').innerHTML=`<b>→/D</b> throttle · <b>←/A</b> reverse · <b>↓/S/Space</b> brake<br><b>Click</b> fire cannon · <b>Right-click</b> water hose<br><b>E</b> send / recall crew · <b>1–9</b> party size · <b>Q</b> repair worst · <b>C</b> crew panel<br><b>Click a section</b>: damaged → repair · at 100% → its ability: CAB auto drive · GUN auto gunner · DECK fly · SEATS loot<br><b>Tab</b> switch train / aircraft · <b>V</b> fly / back to the train · <b>J</b> eject · plane: <b>W</b> accelerate · <b>S</b> slow · <b>A</b> nose up · <b>D</b> nose down · <b>R</b> roll<br><b>F</b> scrap→ammo · <b>X</b> equip→scrap<br><b>Wheel</b> zoom · <b>Z</b> auto zoom · <b>[ ]</b> glyph size<br><b>\`</b> ASCII on/off · <b>M</b> sound · <b>P</b> pause`;
