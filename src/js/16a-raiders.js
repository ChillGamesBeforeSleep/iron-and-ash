/* =====================================================================
   RAIDERS — ground enemies with the same pixel bodies as your crew.
   They come when the train stands still, go for looters in the open first,
   then shoot at the cars. Below 60% of the body they run; below 50% they die.
   Kill them with the cannon (shell blasts), shrapnel, your looters' rifles,
   or by running them over.
   ===================================================================== */
function raiderTick(dt){
if(!G.world||G.state!=='play')return;G.raiders=G.raiders||[];
const cars=G.train.cars,L=cars[0],v=Math.abs(G.train.v);
G.stopT=v<3?(G.stopT||0)+dt:0;
if(!G.dev.calm&&G.stopT>CFG.raiderStopDelay&&G.raiders.length<CFG.raiderMax&&G.t>(G.raidT||0)){
const b=biomeAt(L.ax).type,mul=(b==='city'?2:b==='canyon'?1.3:1)*G.diff;
if(Math.random()<CFG.raiderRate*mul*dt)spawnRaiders();
}
/* AMBUSH: every so often the line ahead is blocked by a barricade with a rocket team and a sniper dug in behind it */
if(!G.dev.calm&&CFG.ambushEvery>0&&!G.sim){
if(G.ambushLeg!==G.leg){G.ambushLeg=G.leg;G.ambushX=L.x+rand(900,1500)}
const front=L.x+L.w/2;
if(G.ambushX-front<430){if(G.ambushX>front+200&&G.ambushX<G.world.LEN-500)spawnAmbush(G.ambushX);G.ambushX=Math.max(G.ambushX,front)+CFG.ambushEvery*rand(.8,1.3)/Math.sqrt(G.diff)}
}
const walkers=outsideCrew();
for(let i=G.raiders.length-1;i>=0;i--){const r=G.raiders[i];
if(!r.alive){G.raiders.splice(i,1);continue}
if(r.post&&L.x-r.x>120)r.post=false;
r.ph+=dt*(r.flee?11:7);r.walkS=r.moving?(Math.sin(r.ph)>0?1:0):0;r.cool-=dt;
if(v>6)for(const c of cars){if(Math.abs(r.x-c.x)<c.w/2-1){raiderDie(r,'run over by the train');jolt(c,0,-6,0);break}}
if(!r.alive)continue;
const near=cars.reduce((a,c)=>Math.min(a,Math.abs(c.x-r.x)-c.w/2),1e9);
if(near>520){G.raiders.splice(i,1);continue}
if(r.flee){r.moving=true;r.x+=r.dir*CFG.crewWalk*1.4*dt;if(r.x<2||r.x>G.world.W-2)G.raiders.splice(i,1);continue}
let tx,ty,tw=null,best=1e9,edge=0;for(const m of walkers){const d=Math.abs(m.x-r.x);if(d<best){best=d;tw=m}}
if(tw&&best<(r.kind==='sniper'?CFG.raiderSniperRange:CFG.raiderRange*3)){tx=tw.x+.5;ty=baseY(tw)-4}
else if(G.exp&&G.exp.tgt.kind==='site'&&G.exp.members.some(m=>m.alive&&m.state==='work')&&Math.abs(G.exp.tgt.x-r.x)<CFG.raiderRange*4){
const dx=G.exp.tgt.x-r.x,d=Math.abs(dx);r.dir=Math.sign(dx)||r.dir;if(d>40){r.moving=true;r.x+=r.dir*CFG.crewWalk*dt}else r.moving=false;
if(d<=40){if(r.cool<=0){if(r.ammo<=0){r.flee=true;r.dir=-r.dir;continue}r.ammo--;r.burst=2;r.cool=rand(1.8,2.8)/Math.sqrt(G.diff)}
if(r.burst>0&&(r.bt=(r.bt||0)-dt)<=0){r.burst--;r.bt=.18;sfx('shot',.7,r.x);const ox=r.x+.5+r.dir*1.5,oy=groundY(r.x)-5,ty=groundY(G.exp.tgt.x)-rand(4,16),a=Math.atan2(ty-oy,G.exp.tgt.x-ox)+rand(-.08,.08);
G.shots.push({x:ox,y:oy,vx:Math.cos(a)*150,vy:Math.sin(a)*150,kind:'bullet',src:'raider',life:.8});
if(Math.random()<CFG.raiderCoverHit){const ws=G.exp.members.filter(m=>m.alive&&m.state==='work'&&!m.hurt);if(ws.length){const m=pick(ws),out=accidentHit(m,.06,.22);if(out==='killed')log('A looter was shot dead in the doorway','bad');else if(out==='wounded')log('A looter was wounded in the doorway','bad')}}}}
if(!r.ambushMsg&&d<=40){r.ambushMsg=1;if(!G.ambushT||G.t>G.ambushT){G.ambushT=G.t+10;log('Raiders are waiting outside the building — recall the looters or shell them','bad')}}continue}
else{let bc=cars[0],bd=1e9;for(const c of cars){const d=Math.abs(c.x-r.x);if(d<bd){bd=d;bc=c}}tw=null;const p=toWorld(bc,rand(6,bc.w-6),rand(6,bc.h-8));tx=p[0];ty=p[1];edge=bc.w/2;
if(v<6&&Math.abs(bc.x-r.x)<bc.w/2+12){r.moving=true;r.dir=Math.sign(r.x-bc.x)||1;r.x+=r.dir*CFG.crewWalk*dt;continue}}
/* heavy weapons reach much further and go for your vehicles first: a parked plane, a hovering gunship, a driller on the surface */
const heavy=r.kind==='rpg'||r.kind==='sniper',rng=r.kind==='rpg'?CFG.raiderRpgRange:r.kind==='sniper'?CFG.raiderSniperRange:CFG.raiderRange;r.tgtV=null;
if(heavy&&!tw){let bv=null,bvd=rng;const ry=groundY(r.x);for(const u of G.vehicles||[]){if(u.enemy||u.state==='down'||u.cyw>groundY(u.cxw)+6)continue;const d=Math.hypot(u.cxw-r.x,u.cyw-ry);if(d<bvd){bvd=d;bv=u}}if(bv){tx=bv.cxw;ty=bv.cyw;edge=0;r.tgtV=bv}}
const dx=tx-r.x,dist=Math.max(0,Math.abs(dx)-edge);
if(dist>rng){if(r.post)r.moving=false;else{r.moving=true;r.dir=Math.sign(dx)||1;r.x+=r.dir*CFG.crewWalk*1.05*dt}}
else{r.moving=false;r.dir=Math.sign(dx)||r.dir;
if(r.cool<=0){if(r.ammo<=0){r.flee=true;r.dir=Math.sign(r.x-G.train.cars[0].x)||1;continue}r.ammo--;r.burst=heavy?1:2;r.cool=(r.kind==='rpg'?rand(4.5,6.5):r.kind==='sniper'?rand(2.6,3.6):rand(1.6,2.6))/Math.sqrt(G.diff)}
if(r.burst>0&&(r.bt=(r.bt||0)-dt)<=0){r.burst--;r.bt=.18;
const ox=r.x+.5+r.dir*1.5,oy=groundY(r.x)-5;
if(r.kind==='rpg'){const u=r.tgtV,tt=Math.hypot(tx-ox,ty-oy)/190,a=Math.atan2(ty+(u?(u.vy||0)*tt:0)-oy,tx+(u?(u.vx||0):G.train.v)*tt-ox)+rand(-.035,.035);
G.shots.push({x:ox,y:oy-2,vx:Math.cos(a)*190,vy:Math.sin(a)*190,kind:'rpg',src:'raider',why:'raider rocket',dmg:CFG.raiderRpgDmg,pow:CFG.raiderRpgPow,rad:10,life:3});sfx('gun',.8,r.x);addLight(ox,oy,18,.8,.1,'255,200,120');
for(let q=0;q<5;q++)spawn(ox,oy,-Math.cos(a)*rand(20,60),-Math.sin(a)*rand(20,60)-rand(0,15),.25,[210,200,180],2,'smoke')}
else if(r.kind==='sniper'){const u=r.tgtV,tt=Math.hypot(tx-ox,ty-oy)/420,a=Math.atan2(ty+(u?(u.vy||0)*tt:0)-oy,tx+(u?(u.vx||0)*tt:0)-ox)+rand(-.012,.012);
G.shots.push({x:ox,y:oy,vx:Math.cos(a)*420,vy:Math.sin(a)*420,kind:'bullet',src:'raider',sniper:true,why:'raider sniper',dmg:CFG.raiderSniperDmg,rad:1.8,wdmg:42,life:1.2});sfx('shot',1,r.x);spawn(ox,oy,r.dir*30,-4,.14,[255,240,200],1,'spark')}
else{sfx('shot',.7,r.x);const a=Math.atan2(ty-oy,tx-ox)+rand(-.06,.06);
G.shots.push({x:ox,y:oy,vx:Math.cos(a)*150,vy:Math.sin(a)*150,kind:'bullet',src:'raider',life:1.6});
spawn(ox,oy,r.dir*20,-5,.12,[255,210,140],1,'spark')}}}
}
}
function spawnRaiders(){
const L=G.train.cars[0],tail=G.train.cars[G.train.cars.length-1],left=Math.random()<.5;
const x0=left?Math.max(20,tail.x-tail.w/2-S.W*.55):Math.min(G.world.W-20,L.x+L.w/2+S.W*.55);
const n=2+((Math.random()*2)|0)+Math.floor((G.leg-1)/2);
for(let k=0;k<n&&G.raiders.length<CFG.raiderMax;k++){const kind=k===1&&Math.random()<CFG.raiderRpgChance?'rpg':k===2&&Math.random()<CFG.raiderSniperChance?'sniper':'rifle';
G.raiders.push({x:x0+(left?-1:1)*k*7,dir:left?1:-1,body:newBody(),alive:true,ph:rand(0,6),cool:rand(1,2.5),burst:0,ammo:kind==='rpg'?CFG.raiderRockets:kind==='sniper'?8:CFG.raiderBursts,moving:true,flee:false,walkS:0,kind})}
G.raidT=G.t+CFG.raiderGap;
log(`Raiders coming from the ${left?'rear':'front'}! Shoot them, or get moving`,'bad');
G.tel.raids=(G.tel.raids||0)+1;
}
function spawnAmbush(x){
/* the barricade is built to stop a train: several rams, each one hurting the locomotive — or stop and clear it once the team is dead */
addObstacle(x,'wreck');{const o=G.obstacles[G.obstacles.length-1];if(o){o.hp*=CFG.barricadeHp;o.max=o.hp;o.barricade=true}}
const n=3+Math.min(2,Math.floor((G.leg-1)/2));
for(let k=0;k<n;k++){const kind=k===0||k===3?'rpg':k===1?'sniper':'rifle';
G.raiders.push({x:x+70+k*16+rand(-3,3),dir:-1,body:newBody(),alive:true,ph:rand(0,6),cool:rand(1.5,3),burst:0,ammo:kind==='rpg'?CFG.raiderRockets:kind==='sniper'?8:CFG.raiderBursts,moving:false,flee:false,walkS:0,kind,post:kind!=='rifle'})}
G.raidT=G.t+CFG.raiderGap;G.tel.raids=(G.tel.raids||0)+1;G.tel.ambushes=(G.tel.ambushes||0)+1;sfx('bad');
log('AMBUSH AHEAD — a barricade on the line, a rocket team and a sniper dug in behind it. Stop short and shell them, or ram through under fire','bad');
}
function raiderDie(r,why){
if(!r.alive)return;r.alive=false;G.tel.raidersKilled=(G.tel.raidersKilled||0)+1;
for(let i=0;i<CREW_BODY.length;i++)if(r.body[i]>0)bodyBleed(r,i);
dropSalvage(r.x,'raider','raider corpse');
if(Math.random()<.5)log(`Raider ${why}`,'good');
}
function hitRaiders(x,y,r,dmg,why){
if(!G.raiders||!G.raiders.length)return false;let hit=false;
for(const m of G.raiders){if(!m.alive)continue;const gy=groundY(m.x);if(Math.abs(x-(m.x+.5))>r+2.5||y<gy-9-r||y>gy+r+1)continue;let touched=false;
for(let i=0;i<CREW_BODY.length;i++){if(m.body[i]<=0)continue;const p=bodyPos(m,i),d=Math.hypot(p[0]-x,p[1]-y);if(d>r+.6)continue;m.body[i]-=dmg*(1-d/(r+1.2));touched=true;if(m.body[i]<=0)bodyBleed(m,i)}
if(!touched)continue;hit=true;const v=bodyInt(m);
if(v<CFG.bodyDeadAt)raiderDie(m,`killed by ${why}`);else if(v<CFG.raiderFleeAt&&!m.flee){m.flee=true;m.dir=Math.sign(m.x-G.train.cars[0].x)||1}}
return hit;
}
function looterGuns(dt){
if(!CFG.looterGun||!G.exp||!G.raiders||!G.raiders.length)return;
for(const m of G.exp.members){if(!m.alive||m.hurt||m.state==='in')continue;crewFire(m,m.x+.5,groundY(m.x)-5,dt)}
}
