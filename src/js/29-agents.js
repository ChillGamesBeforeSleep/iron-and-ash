/* =====================================================================
   AGENTS, ARENA AND DUELS (v3.43)

   Anything that plays the game — a scripted bot, a language model behind an
   endpoint, a script in the console — plays through ONE interface:

     IronAsh.observe()            what the agent can see (plain JSON)
     IronAsh.act(action)          what it wants (plain JSON, see AGENT_ACTIONS)
     IronAsh.run({agent,seed})    play one seeded episode, returns the score
     IronAsh.tournament({...})    every agent on every seed, ranked

   An agent does not steer frame by frame. It sets a DOCTRINE — how fast, how
   greedy, how careful, what to do about an ambush — and the train's own crew
   (the autopilot in 18) carries it out. Every few seconds the agent looks again
   and may change its mind or give a direct order. That is the right grain for a
   language model, and it means bots and models compete on judgment, not reflexes.

   Episodes are seeded: the simulation draws from its own random stream, so the
   same agent on the same seed plays the same game, and two agents on one seed
   face the same world.
   ===================================================================== */
const BOTS={
quartermaster:{label:'Quartermaster',note:'balanced — the stock autopilot',doc:{}},
ironclad:{label:'Ironclad',note:'careful: repairs early, stops short of an ambush and shells it',doc:{speed:.8,repairAt:.75,standoff:150,ram:'never'}},
express:{label:'Express',note:'never stops: no looting, no rescues, rams every barricade',doc:{loot:0,rescue:false,ram:'always',repairAt:.45}},
vulture:{label:'Vulture',note:'strips every site and takes every survivor aboard',doc:{loot:3,speed:.9,repairAt:.6}},
};
const AGENT_ACTIONS={
doctrine:'{"type":"doctrine","speed":0.2-1,"loot":0-3,"repairAt":0.3-0.9,"ram":"auto|always|never","standoff":0-170,"rescue":true|false} — standing orders; any subset of fields',
throttle:'{"type":"throttle","value":-0.45..1,"seconds":1-30} — take the regulator yourself for a while',
brake:'{"type":"brake","seconds":1-30}',
fire:'{"type":"fire","dx":px ahead of the locomotive,"dy":px above the rail} — one cannon shell',
loot:'{"type":"loot"} — send a party to the site or obstacle beside the train (train must be stopped)',
repair:'{"type":"repair"} — spend 1 scrap on the worst section',
craftAmmo:'{"type":"craftAmmo"}',salvage:'{"type":"salvage"} — 1 equipment into scrap',
launch:'{"type":"launch","car":index} — launch the vehicle on that wagon\'s deck',
surrender:'{"type":"surrender"} — duel only: strike your colours',
};
function agentScore(done){const cars=G.train.cars,alive=(G.crew||[]).filter(m=>m.alive).length,legsDone=G.state==='leg'?G.leg:G.leg-1;
const s={legs:legsDone*1000,distance:Math.round((G.stats.dist||0)*.25),crew:alive*150,train:Math.round(cars.reduce((a,c)=>a+c.integrity,0)*120),kills:Math.round(((G.stats.kills||0)+(G.tel.raidersKilled||0))*20),stores:Math.round(G.res.scrap+G.res.equip*3+G.res.ammo*.5+G.res.fuel*.2)};
if(done==='duel-won')s.duel=2500;s.total=Object.values(s).reduce((a,b)=>a+b,0);return s}
function agentObserve(){const cars=G.train.cars,L=cars[0],front=L.x+L.w/2,R=G.res,C=G.caps,r1=v=>Math.round(v*10)/10;
const o={t:Math.round(G.t),state:G.state,leg:G.leg,biome:G.world?hazardBiome(L.ax):'',score:agentScore().total,doctrine:Object.assign({},G.doc),
train:{v:r1(G.train.v),toStation:Math.round(G.world.LEN-front),weight:r1(G.train.mass||0),traction:r1(C.traction),slope:r1(L.si||0),
cars:cars.map((c,i)=>({i,type:c.type,integrity:Math.round(c.integrity*100),fire:c.fires|0,down:c.d.roles.filter((ro,r)=>r<(c.regCount||8)&&!c.alive[r]),deck:c.bay?c.bay.type+':'+c.bay.state:undefined}))},
stores:{fuel:Math.round(R.fuel),water:Math.round(R.water||0),ammo:R.ammo|0,scrap:R.scrap|0,equip:R.equip|0},
caps:{fuel:C.fuel,water:C.water,ammo:C.ammo,scrap:C.scrap,equip:C.equip,crew:C.crew,cannon:!!C.cannon,workshop:!!C.workshop},
crew:{alive:(G.crew||[]).filter(m=>m.alive).length,hurt:(G.crew||[]).filter(m=>m.alive&&m.hurt).length,outside:G.exp?G.exp.members.filter(m=>m.alive&&m.state!=='in').length:0},
threats:{raiders:(G.raiders||[]).filter(r=>r.alive).map(r=>({dx:Math.round(r.x-front),weapon:r.kind||'rifle',dugIn:!!r.post,fleeing:!!r.flee})),
drones:(G.drones||[]).filter(d=>!d.dead).map(d=>({dx:Math.round(d.x-front),dy:Math.round(groundY(d.x)-d.y),bomber:!!d.bomber})),
aircraft:(G.vehicles||[]).filter(u=>u.enemy&&u.state!=='down').map(u=>({kind:u.vkind,dx:Math.round(u.cxw-front),dy:Math.round(groundY(u.cxw)-u.cyw)})),
obstacle:(()=>{let b=null;for(const ob of G.obstacles)if(ob.x>front-4&&ob.x<front+700&&(!b||ob.x<b.x))b=ob;return b?{dx:Math.round(b.x-front),kind:b.barricade?'barricade':b.kind,hp:Math.round(b.hp)}:null})()},
sites:(G.world.sites||[]).filter(s=>s.x>front-80&&s.x<front+900&&(s.uses>0||s.type==='tower'||s.type==='stranded')).slice(0,5).map(s=>({type:s.type,dx:Math.round(s.x-front),loads:s.stock|0,risk:SITES[s.type]?SITES[s.type].risk:'none',people:s.people||0}))};
if(G.rival)o.duel={rivalCrew:G.rival.crew,rivalCrewStart:G.rival.crew0,rivalCars:G.rival.cars.map(c=>({type:c.type,integrity:Math.round(c.integrity*100)})),dx:Math.round(G.rival.x0-front)};
return o}
function agentAct(a){if(!a||typeof a!=='object')return'ignored';const sec=clamp(+a.seconds||5,1,30),L=G.train.cars[0];
switch(a.type){
case'doctrine':{const D=G.doc=G.doc||Object.assign({},DOCTRINE0);if(a.speed!==undefined)D.speed=clamp(+a.speed||0,.2,1);if(a.loot!==undefined)D.loot=clamp(+a.loot||0,0,3);if(a.repairAt!==undefined)D.repairAt=clamp(+a.repairAt||.55,.3,.9);
if(['auto','always','never'].includes(a.ram))D.ram=a.ram;if(a.standoff!==undefined)D.standoff=clamp(+a.standoff||0,0,170);if(a.rescue!==undefined)D.rescue=!!a.rescue;return'doctrine set'}
case'throttle':G.hold={target:clamp(+a.value||0,-CFG.reverseMax,1),brake:false,until:G.t+sec};return'holding throttle';
case'brake':G.hold={target:0,brake:true,until:G.t+sec};return'braking';
case'fire':if(!G.caps.cannon||G.res.ammo<=0||G.gunCool>0)return'cannon not ready';G.mouse.wx=L.x+L.w/2+(+a.dx||0);G.mouse.wy=groundY(G.mouse.wx)-(+a.dy||0);fireGun();return'fired';
case'loot':tryExpedition();return G.exp?'party sent':'no party sent';
case'repair':quickRepair();return'repair';
case'craftAmmo':craftAmmo();return'craft';
case'salvage':salvageEquip();return'salvage';
case'launch':{const c=G.train.cars[a.car|0];if(!c||!bayOf(c))return'no deck there';launchBay(c);return'launch'}
case'surrender':if(G.rival){duelEnd(false,'You struck your colours.');return'surrendered'}return'no duel';
}return'unknown action'}
/* the simulation's own random stream: rendering keeps using the browser's, so watching never changes the outcome */
let _simRng=null;
function withSimRng(fn){if(!_simRng||G.rngSeeded)return fn();const R=Math.random;G.nativeRnd=R;G.rngSeeded=true;Math.random=_simRng;try{return fn()}finally{Math.random=R;G.rngSeeded=false}}
const ARENA={running:false,stop:false,agents:[],board:[]};
async function agentRun(opt){
const agent=typeof opt.agent==='string'?Object.assign({name:BOTS[opt.agent].label},BOTS[opt.agent]):opt.agent,seed=opt.seed||1,legs=opt.legs||1,maxMin=opt.maxMinutes||25,speed=opt.speed||60,period=opt.period||5;
_simRng=mulberry32(seed*7919+13);ARENA.running=true;ARENA.stop=false;
overlay.hidden=true;document.body.classList.remove('station','title');
/* nothing may leak from the previous episode: same agent + same seed must be the same game */
G.ap=null;G.ambushLeg=undefined;G.ambushX=undefined;G.raidT=0;G.stopT=0;G.hold=null;G.cruise=false;G.gunner=false;G.gunCool=0;G.t=0;G.piloting=null;G.keys={};G.mouse.down=false;G.seed=seed;G.viewH=G.zoomTarget=292;G.zoomManual=false;G.wheelT=-99;applyView();G.shake=0;G.flash=0;G.slow=0;G.lights=[];G.fxL=null;G.dev.auto=true;G.dev.god=false;G.dev.ts=1;G.dev.biome='';G.party=0;G.sim=null;const pg0=CFG.perfGovernor;CFG.perfGovernor=0;G.q=1;
withSimRng(()=>{startRun();if(opt.duel)duelSetup(opt.duel===true?null:opt.duel)});
G.dev.auto=true;if(!opt.duel)G.dev.calm=false;G.dev.god=false;G.paused=true;G.doc=Object.assign({},DOCTRINE0,agent.doc||{});G.hold=null;G.agentName=agent.name;
let simT=0,next=0,done='';const t00=performance.now();arenaBar(agent.name,seed);
while(!done){
if(ARENA.stop){done='stopped';break}
if(G.duelResult){done=G.duelResult.win?'duel-won':'duel-lost';break}
if(G.state==='leg'){if(G.leg>=legs){done='finished';break}withSimRng(()=>apStation());continue}
if(G.state==='over'){done='destroyed';break}
if(G.state!=='play'){done=G.state;break}
/* run as many steps as the time slice allows; the agent is consulted every 'period' seconds of game time.
   A scripted bot answers at once; a model behind an endpoint returns a promise and the game waits for it. */
const t0=performance.now();let pending=null;
withSimRng(()=>{let n=0;while(n<speed&&(n<8||performance.now()-t0<(speed<=30?14:120))&&G.state==='play'&&!G.duelResult){
if(simT>=next){next=simT+period;if(agent.decide){let acts=null;try{acts=agent.decide(agentObserve())}catch(e){console.warn('agent decide failed',e)}
if(acts&&typeof acts.then==='function'){pending=acts;break}for(const x of [].concat(acts||[]))agentAct(x)}}
step(1/60);simT+=1/60;n++}});
if(pending){let acts=null;try{acts=await pending}catch(e){console.warn('agent decide failed',e)}for(const x of [].concat(acts||[]))withSimRng(()=>agentAct(x))}
if(simT>maxMin*60){done='time';break}
arenaBarTick(simT);
/* watching: one slice per frame. Racing: yield through a message channel, which background tabs do not throttle */
if(speed<=30)await new Promise(r=>setTimeout(r,16));else await new Promise(r=>{const ch=new MessageChannel();ch.port1.onmessage=()=>r();ch.port2.postMessage(0)});
}
const score=agentScore(done),res={agent:agent.name,seed,result:done,simMinutes:+(simT/60).toFixed(1),wallSeconds:+((performance.now()-t00)/1000).toFixed(1),score:score.total,parts:score,crew:(G.crew||[]).filter(m=>m.alive).length,cars:G.train.cars.length};
CFG.perfGovernor=pg0;G.dev.auto=false;G.hold=null;G.agentName=null;G.duelResult=null;G.rival=null;G.duel=null;_simRng=null;ARENA.running=false;const b=$('arenaBar');if(b)b.remove();
return res}
async function agentTournament(opt){const agents=opt.agents||Object.keys(BOTS),seeds=opt.seeds||[1,2,3],rows=[];
for(const seed of seeds)for(const a of agents){if(ARENA.stop&&rows.length)break;const r=await agentRun(Object.assign({},opt,{agent:a,seed}));rows.push(r);if(opt.onResult)opt.onResult(r,rows);if(r.result==='stopped')break}
const by={};for(const r of rows){const b=by[r.agent]||(by[r.agent]={agent:r.agent,games:0,total:0,best:0,finished:0,destroyed:0,won:0});b.games++;b.total+=r.score;b.best=Math.max(b.best,r.score);if(r.result==='finished')b.finished++;if(r.result==='destroyed'||r.result==='duel-lost')b.destroyed++;if(r.result==='duel-won')b.won++}
const board=Object.values(by).map(b=>Object.assign(b,{mean:Math.round(b.total/b.games)})).sort((x,y)=>y.mean-x.mean);
ARENA.board=board;try{localStorage.setItem('ironash.arena.v1',JSON.stringify({when:Date.now(),opt:{seeds,legs:opt.legs||1,duel:!!opt.duel},board,rows}))}catch(e){}
return{board,rows}}
/* an agent that lives behind a URL you run: the game POSTs the observation, the endpoint answers with actions.
   Keys never enter the page — see tools/agent-proxy.mjs for a reference endpoint. */
function endpointAgent(name,url){return{name,doc:{},decide:async obs=>{const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),60000);
try{const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},signal:ctl.signal,body:JSON.stringify({game:'iron-and-ash',protocol:1,observation:obs,actions:AGENT_ACTIONS})});const j=await r.json();return Array.isArray(j)?j:j.actions||[]}finally{clearTimeout(tm)}}}}
function arenaBar(name,seed){let b=$('arenaBar');if(b)b.remove();b=document.createElement('div');b.id='arenaBar';b.className='hud box';b.innerHTML=`<b>${name}</b> <span>seed ${seed}</span> <span id="arenaT"></span> <button class="ub2" type="button" id="arenaStop">STOP</button>`;document.body.appendChild(b);$('arenaStop').onclick=()=>{ARENA.stop=true}}
function arenaBarTick(simT){const e=$('arenaT');if(e)e.textContent=`${Math.floor(simT/60)}:${String(Math.floor(simT%60)).padStart(2,'0')} · score ${agentScore().total}`}

/* ---------------------------------------------------------------------
   DUEL — two trains on one line, facing each other. Nobody leaves.
   The duel is decided by CREW: a train whose crew is dead or has had enough
   strikes its colours. Your train is the one you built and the crew you kept
   alive; the rival is a mirror of it, or a train card someone sent you.
   --------------------------------------------------------------------- */
function trainCard(){return btoa(unescape(encodeURIComponent(JSON.stringify({v:1,name:'Engine '+(1+(G.seed||0)%99),consist:G.train.cars.map(c=>c.type),lvl:G.train.cars.map(c=>Array.from(c.lvl)),crew:(G.crew||[]).filter(m=>m.alive).length||5}))))}
function readTrainCard(txt){try{const o=JSON.parse(decodeURIComponent(escape(atob(String(txt).trim()))));if(!Array.isArray(o.consist)||!o.consist.length)return null;o.consist=o.consist.filter(t=>CARS[t]&&!isAirUnit(CARS[t])).slice(0,8);return o.consist.length?o:null}catch(e){return null}}
function duelSetup(card){
const cars=G.train.cars,L=cars[0],front=L.x+L.w/2,types=card?card.consist:cars.map(c=>c.type),R={cars:[],name:card&&card.name||'The Mirror',crew0:card&&card.crew||Math.max(3,(G.crew||[]).filter(m=>m.alive).length),gun:2.5,rifle:1,x0:front+CFG.duelGap};
let x=R.x0;types.forEach((t,i)=>{const c=makeCar(t);c.enemy=true;c.rival=true;c.fx=-1;if(card&&card.lvl&&card.lvl[i])c.lvl.set(card.lvl[i].slice(0,8));setMul(c);c.occ.fill(1);
c.ax=x+c.w/2;const xr=c.ax-c.w*.35,xf=c.ax+c.w*.35;c.ang=Math.atan2(T(xf)-T(xr),xf-xr);c.ay=T(c.ax);c.vx=0;c.vy=0;vehPose(c);updateRegions(c);R.cars.push(c);x+=c.w+CFG.gap});
R.px0=R.cars.reduce((a,c)=>a+c.totalMax,0);R.n0=R.cars.length;R.crew=R.crew0;/* both sides come to a duel armed: full magazine and tanks */computeCaps();G.res.ammo=G.caps.ammo;G.res.fuel=Math.max(G.res.fuel,G.caps.fuel*.6);G.rival=R;G.duel={t:0};G.duelResult=null;G.dev.calm=true;G.raiders=[];G.obstacles=G.obstacles.filter(o=>o.x<front-40||o.x>x+40);
log(`DUEL — ${R.name} blocks the line with ${R.crew0} crew. Only one train leaves. Their crew breaks when they have lost enough of it`,'bad');sfx('bad')}
function duelTick(dt){const R=G.rival;if(!R||G.duelResult)return;const cars=G.train.cars,L=cars[0],front=L.x+L.w/2;G.duel.t+=dt;
for(let i=R.cars.length-1;i>=0;i--){const c=R.cars[i];if(c.integrity<CFG.carDeathAt){G.explQ.push({x:c.cxw,y:c.cyw,r:12,p:150,ign:.6,cause:'cannon'});for(let k=0;k<c.n;k+=3)if(c.mat[k])destroyPixel(c,k,rand(-60,60),rand(-90,-10),'hit');R.cars.splice(i,1);log(`${R.name}: their ${c.d.name.toLowerCase()} is destroyed`,'good')}}
/* their crew stands or falls with the train they are standing in */
/* judged by the two worst-hit wagons (a destroyed one counts as zero): a train that is being taken apart loses heart long before it is scrap */
const ints=R.cars.map(c=>c.integrity);while(ints.length<R.n0)ints.push(0);ints.sort((x,y)=>x-y);const worst=(ints[0]+(ints[1]??ints[0]))/2,share=clamp((worst-.35)/.6,0,1),crew=Math.ceil(R.crew0*share);
if(crew<R.crew){log(`${R.name} lost ${R.crew-crew} crew — ${crew} left`,'good');R.crew=crew;G.hudSig=''}
if(!R.cars.length||R.crew<=0){duelEnd(true,`${R.name} has nobody left to fight.`);return}
if(R.crew<=Math.max(1,Math.floor(R.crew0*CFG.duelBreak))){duelEnd(true,`${R.name} strikes its colours with ${R.crew} of ${R.crew0} crew left.`);return}
if(front>R.x0-14&&G.train.v>0)G.train.v=0;
/* their gun and their rifles */
const tgt=pick(cars),aim=toWorld(tgt,rand(8,tgt.w-8),rand(6,tgt.h-10));
R.gun-=dt;if(R.gun<=0){const gc=R.cars.find(c=>{const r=c.d.roles.indexOf('CANNON');return r>=0&&c.alive[r]});
if(gc){const tp=gc.pts.turret||[gc.w/2,4],p=toWorld(gc,tp[0],tp[1]),a=Math.atan2(aim[1]-p[1],aim[0]-p[0])+rand(-.03,.03);
G.shots.push({x:p[0],y:p[1],vx:Math.cos(a)*210,vy:Math.sin(a)*210,kind:'rpg',src:'raider',why:'rival cannon',pow:CFG.duelGunPow,rad:9,life:4});sfx('gun',1,p[0]);addLight(p[0],p[1],24,.9,.1,'255,200,120');R.gun=CFG.duelReload*rand(.85,1.2)}else R.gun=1}
R.rifle-=dt;if(R.rifle<=0&&R.cars.length){R.rifle=clamp(3.2/Math.max(1,R.crew),.25,2);const sc=pick(R.cars),p=toWorld(sc,rand(10,sc.w-10),sc.d.split*.5),d=Math.hypot(aim[0]-p[0],aim[1]-p[1]);
if(d<560){const a=Math.atan2(aim[1]-p[1],aim[0]-p[0])+rand(-.05,.05);G.shots.push({x:p[0],y:p[1],vx:Math.cos(a)*190,vy:Math.sin(a)*190,kind:'bullet',src:'raider',why:'rival rifle fire',life:d/190+.4});if(Math.random()<.5)sfx('shot',.5,p[0])}}
}
function duelEnd(win,why){if(!G.rival||G.duelResult)return;G.duelResult={win,why,t:G.duel?G.duel.t:0,crew:(G.crew||[]).filter(m=>m.alive).length,rivalCrew:G.rival.crew,rivalCrew0:G.rival.crew0};
log(win?`DUEL WON — ${why}`:`DUEL LOST — ${why}`,win?'good':'bad');sfx(win?'loot':'bad');
if(ARENA.running)return;G.paused=true;
overlay.hidden=false;panel.className='panel';panel.innerHTML=`<h2>Duel · ${Math.round(G.duelResult.t)} s</h2><h1>${win?'VICTORY':'DEFEAT'}</h1><p>${why}</p>
<table><tr><td>Your crew</td><td>${G.duelResult.crew} alive</td></tr><tr><td>${G.rival.name}</td><td>${G.rival.crew} of ${G.rival.crew0} left</td></tr><tr><td>Your train</td><td>${G.train.cars.map(c=>Math.round(c.integrity*100)+'%').join(' · ')}</td></tr></table>
<div class="btns"><button class="go" id="duelBack" type="button">BACK TO TITLE</button></div>`;
$('duelBack').onclick=()=>{G.rival=null;G.duel=null;G.duelResult=null;G.paused=false;G.dev.calm=false;showTitle()}}
function startDuel(card){const d=readSave();overlay.hidden=true;document.body.classList.remove('station','title');
if(d){loadGame(d);if(G.state==='leg'){overlay.hidden=true;document.body.classList.remove('station');startLeg()}}else startRun();
G.paused=false;duelSetup(card||null)}

/* ---------------------------------------------------------------------
   ARENA SCREEN
   --------------------------------------------------------------------- */
function showArena(){overlay.hidden=false;panel.className='panel wide';
let last=null;try{last=JSON.parse(localStorage.getItem('ironash.arena.v1')||'null')}catch(e){}
const boardHTML=b=>b&&b.length?`<table><tr><td>Agent</td><td>Mean score</td><td>Best</td><td>Games</td><td>Finished</td><td>Destroyed</td><td>Duels won</td></tr>${b.map((r,i)=>`<tr><td>${i+1}. ${r.agent}</td><td><b>${r.mean}</b></td><td>${r.best}</td><td>${r.games}</td><td>${r.finished}</td><td>${r.destroyed}</td><td>${r.won}</td></tr>`).join('')}</table>`:'<p class="note">No results yet.</p>';
panel.innerHTML=`<h2>Iron & Ash · v${GAME_VERSION}</h2><h1>ARENA</h1>
<p>Agents play the same seeded worlds and are ranked by score: legs finished, distance, crew kept alive, the state of the train, kills and stores. An agent sets standing orders for the crew and looks again every few seconds.</p>
<section><h3>Agents</h3><div id="arAgents">${Object.entries(BOTS).map(([k,b])=>`<label class="chk" style="display:block;margin:2px 0"><input type="checkbox" data-bot="${k}" checked> <b>${b.label}</b> — ${b.note}</label>`).join('')}${ARENA.agents.map((a,i)=>`<label class="chk" style="display:block;margin:2px 0"><input type="checkbox" data-ext="${i}" checked> <b>${a.name}</b> — endpoint agent</label>`).join('')}</div>
<div class="row" style="margin-top:8px;align-items:flex-end"><div class="fld" style="max-width:150px"><label for="arName">Endpoint agent name</label><input id="arName" maxlength="18" placeholder="e.g. Claude"></div><div class="fld"><label for="arUrl">Endpoint URL (yours — see docs/AGENTS.md)</label><input id="arUrl" placeholder="http://localhost:8787/decide"></div><button class="ub2" id="arAdd" type="button">Add</button></div></section>
<section><h3>Tournament</h3><div class="row" style="align-items:flex-end"><div class="fld" style="max-width:90px"><label for="arSeeds">Seeds</label><input id="arSeeds" type="number" min="1" max="10" value="2"></div><div class="fld" style="max-width:90px"><label for="arLegs">Legs</label><input id="arLegs" type="number" min="1" max="5" value="1"></div><div class="fld" style="max-width:120px"><label for="arSpeed">Speed</label><select id="arSpeed"><option value="6">Watch (6×)</option><option value="60" selected>Fast</option><option value="400">Fastest</option></select></div>
<button class="go" id="arRun" type="button" style="font-size:17px;padding:4px 14px">RUN JOURNEY</button><button class="go alt" id="arDuel" type="button" style="font-size:17px;padding:4px 14px">RUN DUELS</button></div>
<div id="arBoard" style="margin-top:10px">${boardHTML(last&&last.board)}</div><div id="arLog" class="note"></div></section>
<section><h3>Duel — your train against another</h3><p class="note">Fought with your saved train and crew if you have a run in progress, otherwise a fresh one. The rival is a mirror of your train, or a train card pasted below. A duel ends when one crew is dead or gives up.</p>
<div class="row"><button class="go" id="arFight" type="button" style="font-size:17px;padding:4px 14px">FIGHT A MIRROR</button><button class="ub2" id="arCard" type="button">Copy my train card</button></div>
<div class="fld" style="margin-top:8px"><label for="arIn">Rival train card</label><input id="arIn" placeholder="paste a train card, then FIGHT THIS CARD"></div><div class="row" style="margin-top:6px"><button class="ub2" id="arFightCard" type="button">FIGHT THIS CARD</button></div></section>
<div class="btns"><button class="go alt" id="arBack" type="button">← BACK TO TITLE</button></div>`;
const picks=()=>[...panel.querySelectorAll('[data-bot]:checked')].map(e=>e.dataset.bot).concat([...panel.querySelectorAll('[data-ext]:checked')].map(e=>ARENA.agents[+e.dataset.ext]));
const go=async duel=>{const agents=picks();if(!agents.length)return;const n=clamp(+$('arSeeds').value||1,1,10),opt={agents,seeds:Array.from({length:n},(_,i)=>i+1),legs:clamp(+$('arLegs').value||1,1,5),speed:+$('arSpeed').value||60,duel};
const out=await agentTournament(opt);showArena();$('arLog').textContent=out.rows.map(r=>`${r.agent} · seed ${r.seed} · ${r.result} · ${r.score} pts · ${r.simMinutes} min`).join('  |  ')};
$('arRun').onclick=()=>go(false);$('arDuel').onclick=()=>go(true);
$('arAdd').onclick=()=>{const n=$('arName').value.trim(),u=$('arUrl').value.trim();if(!n||!/^https?:\/\//.test(u))return;ARENA.agents.push(endpointAgent(n,u));showArena()};
$('arFight').onclick=()=>startDuel(null);
$('arFightCard').onclick=()=>{const c=readTrainCard($('arIn').value);if(!c){$('arLog').textContent='That is not a valid train card.';return}startDuel(c)};
$('arCard').onclick=async()=>{const t=trainCard();try{await navigator.clipboard.writeText(t);$('arLog').textContent='Train card copied — send it to someone to fight your train.'}catch(e){$('arIn').value=t;$('arLog').textContent='Copy it from the box.'}};
$('arBack').onclick=()=>{panel.className='panel';showTitle()}}
window.IronAsh={version:GAME_VERSION,actions:AGENT_ACTIONS,bots:BOTS,observe:agentObserve,act:a=>withSimRng(()=>agentAct(a)),score:agentScore,run:agentRun,tournament:agentTournament,endpointAgent,duel:startDuel,trainCard,readTrainCard,stop:()=>{ARENA.stop=true}};
