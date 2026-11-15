/* save / continue (per-browser convenience; a run is never lost by a failed save) */
const SAVE_KEY='trainEngineV2.save.v1';
const b64=a=>{let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode.apply(null,a.subarray(i,i+8192));return btoa(s)};
const unb64=(t)=>{const s=atob(t),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a};
function saveGame(){if(G.sim)return;try{
const data={leg:G.leg,seed:G.seed,res:G.res,stats:G.stats,crew:(G.crew||[]).map(m=>({name:m.name,hp:Math.round(m.hp*10)/10,inv:m.inv})),stash:G.stash||[],cars:G.train.cars.map(c=>({type:c.type,mat:b64(c.mat),hp:b64(Uint8Array.from(c.hp,v=>clamp(Math.round(v),0,255))),rust:b64(Uint8Array.from(c.rust,v=>clamp(Math.round(v*200),0,255))),lvl:Array.from(c.lvl)}))};
localStorage.setItem(SAVE_KEY,JSON.stringify(data))}catch(e){}}
function readSave(){try{const t=localStorage.getItem(SAVE_KEY);return t?JSON.parse(t):null}catch(e){return null}}
function loadGame(data){
carIds=0;const cars=data.cars.map(d=>{const c=makeCar(d.type),mm=unb64(d.mat);if(mm.length===c.n){c.mat.set(mm);const hp=unb64(d.hp),ru=unb64(d.rust);for(let k=0;k<c.n;k++){c.hp[k]=hp[k];c.rust[k]=ru[k]/200}}c.lvl.set(d.lvl);setMul(c);updateRegions(c);return c});
G.seed=data.seed;G.leg=data.leg;G.res=Object.assign({},data.res);G.stats=Object.assign({},data.stats);G.train={cars,x:760,v:0};
if(Array.isArray(data.crew)){G.crew=[];crewIds=0;G.driverId=null;for(const d of data.crew)addCrew({name:d.name,hp:d.hp,inv:d.inv})}else initCrew(G.res.crew||5);
G.stash=Array.isArray(data.stash)?data.stash:[];
startLeg(true);
}
const GEAR_PRICE={seeker:{s:6,e:2},rpg:{s:5,e:1},sniper:{s:4,e:1},gun:{s:3,e:0},grenade:{s:2,e:0},molotov:{s:1,e:0},armor:{s:3,e:1},pick:{s:2,e:0},spear:{s:1,e:0}};
const GEAR_HELP={seeker:'Seeker Launcher (1 launch; reloads with 1 fuel + 1 ammo + 1 scrap + 1 equip): homing missile seeks target for 2s.',rpg:'Rocket Launcher (2 launches; reloads with 1 ammo + 1 fuel + 1 scrap): heavy explosive rocket.',sniper:'Sniper Rifle (5 shots; reloads with 1 ammo + 1 equip): high-power flat-trajectory anti-materiel rifle.',gun:'Rifle (15 shots; reloads with 1 ammo + 1 scrap): standard combat rifle.',grenade:'Grenade (1 throw; reloads with 1 ammo + 1 fuel): lobbed shrapnel explosive.',molotov:'Molotov Cocktail (1 throw; reloads with 1 fuel): shatters into burning fuel droplets.',armor:'Armour (15 hits; reloads with 2 scrap + 1 equip): −40% damage to the body.',pick:'Pickaxe (12 jobs; reloads with 1 scrap): looting +35% faster, clearing the track +70% faster.',spear:'Spear (6 uses; reloads with 1 scrap): thrown at raiders up close.'};
function gearTaker(k){return (G.crew||[]).filter(m=>!has(m,k)&&m.inv.length<PACK).sort((a,b)=>gearCount(a)-gearCount(b))[0]||null}
function buyGear(k){const p=GEAR_PRICE[k],m=gearTaker(k),R=G.res;if(!p||!m||R.scrap<p.s||R.equip<p.e)return;R.scrap-=p.s;R.equip-=p.e;G.tel.scrapOut+=p.s;invAdd(m,k,1);log(`${m.name} gets a ${ITEMS[k].name.toLowerCase()}`,'good')}
const UPDESC={};for(const k in ROLES)UPDESC[k]=ROLES[k].up;
const upCost=(lv,plate)=>plate?{s:5+4*lv,e:1+lv}:{s:3+3*lv,e:1+lv};
const afford=c=>G.res.scrap>=c.s&&G.res.equip>=c.e;
function scrapValue(c){return Math.round(3+7*c.integrity)}
function scrapNet(i){
const cars=G.train.cars,c=cars[i],R=G.res,keep=G.caps;cars.splice(i,1);computeCaps(true);const cap=G.caps.scrap;cars.splice(i,0,c);G.caps=keep;
return Math.min(cap,R.scrap+scrapValue(c))-R.scrap}
function orderChips(){
const cars=G.train.cars,R=G.res;
return cars.map((c,i)=>{const pct=Math.round(c.integrity*100),fragile=['tender','water','passenger'].includes(c.type);
if(i===0)return`<div class="oc fixed"><b>${c.d.name}</b><span>${pct}% · always leads</span></div><span class="oarrow">→</span>`;
const conf=G.scrapConfirm===c.id,net=scrapNet(i),val=(net>=0?'+':'−')+Math.abs(net)+'s'+(net<0?' (storage)':'');
return`<div class="oc"><b>${i}. ${c.d.name}</b><span>${pct}%${fragile&&i<=2?' · <em class="warn">fragile up front</em>':''}</span>
<div class="ob"><button class="ub" data-act="mv" data-c="${i}" data-d="-1" ${i<=1?'disabled':''} title="Move toward the front" aria-label="Move ${c.d.name} toward the front">◀</button><button class="ub" data-act="mv" data-c="${i}" data-d="1" ${i>=cars.length-1?'disabled':''} title="Move toward the rear" aria-label="Move ${c.d.name} toward the rear">▶</button>
<button class="ub" data-act="scrapcar" data-c="${i}" title="Remove this car for scrap">${conf?`Confirm ${val}`:`Scrap ${val}`}</button></div></div>${i<cars.length-1?'<span class="oarrow">→</span>':''}`}).join('');
}
function renderStation(){
const R=G.res,C=G.caps,T=G.tel;
let rows='';
G.train.cars.forEach((c,ci)=>{let b='';
for(let r=0;r<4;r++){const role=c.d.roles[r],lv=c.lvl[r];if(lv>=3){b+=`<button class="ub max" disabled title="${UPDESC[role]}">${ROLE_SHORT[role]} MAX</button>`;continue}
const k=upCost(lv,false);b+=`<button class="ub" data-act="up" data-c="${ci}" data-r="${r}" ${afford(k)?'':'disabled'} title="${UPDESC[role]}. Also −15% damage taken.">${ROLE_SHORT[role]} L${lv}→${lv+1} <i>${k.s}s ${k.e}e</i></button>`}
const pl=c.lvl[4];if(pl>=3)b+=`<button class="ub max" disabled>PLATE MAX</button>`;else{const k=upCost(pl,true);b+=`<button class="ub" data-act="plate" data-c="${ci}" ${afford(k)?'':'disabled'} title="Armour plate on all 4 wheel/axle regions: −22% damage per level">${c.type==='loco'?'WHEELS':'AXLES'} PLATE L${pl}→${pl+1} <i>${k.s}s ${k.e}e</i></button>`}
rows+=`<div class="uprow"><span class="nm">${c.d.name}</span>${b}</div>`});
const dm=Object.entries(T.dmg).filter(([,v])=>v>1).sort((a,b)=>b[1]-a[1]),tot=dm.reduce((a,[,v])=>a+v,0)||1;
const carHp=G.train.cars.reduce((a,c)=>a+c.totalMax,0)/G.train.cars.length;
const dmRows=dm.map(([k,v])=>`<tr><td>${k}</td><td>${(v/carHp).toFixed(2)} cars<span class="bar" style="width:${Math.max(2,Math.round(v/tot*90))}px"></span></td></tr>`).join('')||'<tr><td>No damage taken</td><td></td></tr>';
const off=G.offers.map(t=>`<button class="ub" data-act="wagon" data-t="${t}" ${R.scrap>=12&&R.equip>=2&&G.train.cars.length<8?'':'disabled'}>BUY ${CARS[t].name} <i>12s 2e</i></button>`).join('');
panel.className='panel wide';
panel.innerHTML=`<h2>Leg ${G.leg} complete</h2><h1>STATION</h1>
<p class="hold">Crew: ${G.crew.map(m=>`${m.name}${m.inv.filter(it=>ITEMS[it.k].gear).map(it=>' '+ITEMS[it.k].ch).join('')}`).join(' · ')}</p>
<p class="hold">Hold: ${R.crew} crew · ${Math.floor(R.fuel)}/${C.fuel} fuel · ${R.scrap}/${C.scrap} scrap · ${R.ammo}/${C.ammo} ammo · ${R.equip}/${C.equip} equipment</p>
<p>Repair here by clicking region cells below (1 scrap = +50%). Upgrades cost scrap (s) and equipment (e) and also armour the region.</p>
<h3>Train order <small style="color:var(--dim);font-weight:400;letter-spacing:.04em;text-transform:none">front → rear · if a car is destroyed, every car behind it uncouples</small></h3>
<div class="order">${orderChips()}</div>
<p style="margin:0 0 14px;font-size:11px;color:#a79e89">Put tough cars (armored, cargo, crane) up front and fragile ones (fuel tender, water, crew) at the rear. Scrap a wreck you don't want to haul.</p>
<div class="station"><div>
<h3>Workshop</h3><div class="up">${rows}</div>
<h3>Trade</h3><div class="uprow" style="margin-bottom:16px">
<button class="ub" data-act="fuel" ${R.scrap>=3&&R.fuel<C.fuel?'':'disabled'}>BUY 25 FUEL <i>3s</i></button>
<button class="ub" data-act="ammo" ${R.scrap>=2&&R.ammo<C.ammo?'':'disabled'}>BUY 8 AMMO <i>2s</i></button>
<button class="ub" data-act="crew" ${R.equip>=2&&R.crew<C.crew?'':'disabled'} title="Needs a free seat">RECRUIT 1 CREW <i>2e</i></button>
<button class="ub" data-act="sell" ${R.equip>=1&&R.scrap<C.scrap?'':'disabled'}>SELL 1 EQUIP <i>→3s</i></button>
${Object.entries(GEAR_PRICE).map(([k,p])=>`<button class="ub" data-act="gear" data-k="${k}" ${R.scrap>=p.s&&R.equip>=p.e&&gearTaker(k)?'':'disabled'} title="${GEAR_HELP[k]} Goes to someone without one.">${ITEMS[k].name.toUpperCase()} <i>${p.s}s${p.e?` ${p.e}e`:''}</i></button>`).join('')}
${off}</div>
</div><div>
<h3>Leg report · use this to balance</h3><table class="tel">
<tr><td>Time</td><td>${Math.floor(T.time/60)}:${String(Math.floor(T.time%60)).padStart(2,'0')}</td></tr>
<tr><td>Fuel burned</td><td>${Math.round(T.fuel)}</td></tr>
<tr><td>Scrap in / out</td><td>${T.scrapIn} / ${T.scrapOut}</td></tr>
<tr><td>Ammo made / fired</td><td>${T.ammoMade} / ${T.ammoUsed}</td></tr>
<tr><td>Drones downed</td><td>${T.kills}</td></tr>
<tr><td>Water sprayed / fire pixels doused</td><td>${Math.round(T.waterUsed||0)} / ${T.doused||0}</td></tr>
<tr><td>Crew gained / lost</td><td>${T.crewGained} / ${T.crewLost}</td></tr></table>
<h3>Damage taken, by source</h3><table class="tel">${dmRows}</table>
</div></div>
<div class="btns"><button class="go" id="next">DEPART — LEG ${G.leg+1}</button></div>`;
$('next').onclick=()=>{G.leg++;startLeg()};
}
$('panel').addEventListener('click',e=>{
const b=e.target.closest('[data-act]');if(!b||b.disabled||G.state!=='leg')return;
const act=b.dataset.act,R=G.res;
if(act!=='scrapcar')G.scrapConfirm=null;
if(act==='mv'){const cars=G.train.cars,i=+b.dataset.c,j=i+(+b.dataset.d);if(j<1||j>=cars.length)return;[cars[i],cars[j]]=[cars[j],cars[i]];log(`${cars[j].d.name} moved to position ${j}`,'');}
else if(act==='scrapcar'){const cars=G.train.cars,i=+b.dataset.c,c=cars[i];if(!c||i===0)return;
if(G.scrapConfirm!==c.id){G.scrapConfirm=c.id;renderStation();return}
G.scrapConfirm=null;const net=scrapNet(i);cars.splice(i,1);computeCaps();R.scrap=Math.max(0,Math.min(G.caps.scrap,R.scrap+scrapValue(c)));G.tel.scrapIn+=Math.max(0,net);log(`${c.d.name} scrapped: ${net>=0?'+':'−'}${Math.abs(net)} scrap${net<0?' — it was holding stored scrap':''}`,'warn')}
else if(act==='up'||act==='plate'){const c=G.train.cars[+b.dataset.c],plate=act==='plate',r=plate?4:+b.dataset.r,k=upCost(c.lvl[r],plate);if(!afford(k))return;
R.scrap-=k.s;R.equip-=k.e;G.tel.scrapOut+=k.s;if(plate)for(let q=4;q<8;q++)c.lvl[q]++;else c.lvl[r]++;setMul(c);log(`${c.d.name}: ${plate?'plating':c.d.roles[r]} → L${c.lvl[r]}`,'good')}
else if(act==='fuel'){R.scrap-=3;G.tel.scrapOut+=3;computeCaps();R.fuel=Math.min(G.caps.fuel,R.fuel+25)}
else if(act==='ammo'){R.scrap-=2;G.tel.scrapOut+=2;computeCaps();R.ammo=Math.min(G.caps.ammo,R.ammo+8)}
else if(act==='crew'){R.equip-=2;const m=addCrew({kit:[['water',CFG.flasks]]});log(`${m.name} joins the crew`,'good')}
else if(act==='gear')buyGear(b.dataset.k);
else if(act==='sell'){R.equip--;computeCaps();R.scrap=Math.min(G.caps.scrap,R.scrap+3)}
else if(act==='wagon'){R.scrap-=12;R.equip-=2;G.tel.scrapOut+=12;const c=makeCar(b.dataset.t);updateRegions(c);G.train.cars.push(c);G.offers=G.offers.filter(t=>t!==b.dataset.t);layout(G.train.cars,G.train.x);log(`Bought a ${CARS[b.dataset.t].name}`,'good')}
layout(G.train.cars,G.train.x);G.all=G.train.cars.slice();computeCaps();renderStation();
});
