/* fires on the ground: burning fuel puddles and wood splinters */
function pumpTick(dt){
const C=G.caps,c=C.pumpCar;if(!c||!C.pump){return}
if(hazardBiome(c.ax)==='acid'&&C.water>0)G.res.water=Math.min(C.water,(G.res.water||0)+CFG.rainWater*dt);
if(G.mouse.rdown&&G.state==='play'&&!G.dev.auto){const cost=CFG.waterPerDrop*.5;
if((G.res.water||0)<cost){if((G.hoseMsg||0)<G.t){G.hoseMsg=G.t+4;log('Water tank empty — park under a water tower or reach a station','bad')}return}
if((G.hoseT=(G.hoseT||0)-dt)>0)return;G.hoseT=CFG.hoseEvery/(1+.5*(C.pump-1));
const nz=c.pts.nozzle||[c.w*.7,0],o=toWorld(c,nz[0],nz[1]),a=Math.atan2(G.mouse.wy-o[1],G.mouse.wx-o[0]),sp=CFG.hoseSpeed*(1+.15*(C.pump-1)),v=carVel(c);
for(let i=0;i<2&&G.res.water>=cost;i++){const aa=a+rand(-.045,.045),ss=sp*rand(.9,1.05);addActive(o[0]+Math.cos(a)*2,o[1]+Math.sin(a)*2,Math.cos(aa)*ss+v,Math.sin(aa)*ss,M.WATER,90,170,255,0,.08,c);{const q=PX.act[PX.act.length-1];if(q)q.land=clamp(Math.hypot(G.mouse.wx-o[0],G.mouse.wy-o[1])/ss,.03,1.4)*rand(.97,1.03)}G.res.water-=cost;G.tel.waterUsed=(G.tel.waterUsed||0)+cost}
if(Math.random()<.15)sfx('tink',.12,o[0]);return}
if((G.res.water||0)<CFG.waterPerDrop+CFG.pumpReserve)return;
if((G.pumpT=(G.pumpT||0)-dt)>0)return;G.pumpT=CFG.pumpEvery/C.pump;
const nz=c.pts.nozzle||[c.w*.7,0],o=toWorld(c,nz[0],nz[1]);let tgt=null,best=1e9;
let tcar=null;for(const car of G.train.cars){if(!car.fires)continue;const t=toWorld(car,car.fcx,car.fcy),d=Math.abs(t[0]-o[0])-car.fires*.5;if(d<best&&Math.abs(t[0]-o[0])<CFG.pumpReach*(1+.25*(C.pump-1))){best=d;tgt=t;tcar=car}}
if(!tgt&&PX.burning.size&&(G.res.water||0)>C.water*.5){for(const k of PX.burning){const x=k%PX.W+.5,y=((k/PX.W)|0)+.5,d=Math.abs(x-o[0]);if(d<best&&d<CFG.pumpReach*.8){best=d;tgt=[x,y]}}}
if(!tgt)return;
const v=carVel(c),n=3+C.pump;
for(let i=0;i<n&&G.res.water>=CFG.waterPerDrop;i++){let tx=tgt[0],ty=tgt[1];
if(tcar){for(let tries=0;tries<40;tries++){const k=(Math.random()*tcar.n)|0;if(tcar.fire[k]>0){const w=toWorld(tcar,k%tcar.w+.5,((k/tcar.w)|0)-1);tx=w[0];ty=w[1];break}}}
const dx=tx-o[0],dy=ty-o[1];let t=clamp(Math.hypot(dx,dy)/200,.14,.6)*rand(.95,1.08);if(tcar===c)t=Math.max(t,.66);
addActive(o[0],o[1],dx/t*(1+.06*t)+v+rand(-4,4),dy/t-.5*CFG.pxGravity*t+rand(-4,4),M.WATER,90,170,255,0,.1,c);{const q=PX.act[PX.act.length-1];if(q)q.land=t}
G.res.water-=CFG.waterPerDrop;G.tel.waterUsed=(G.tel.waterUsed||0)+CFG.waterPerDrop}
if(Math.random()<.3)sfx('tink',.25,o[0]);
}
function towerNear(){
const w=G.world;if(!w||Math.abs(G.train.v)>3)return'';const cars=G.train.cars,pc=cars.find(c=>c.d.roles.includes('WATER'));
for(const s of w.sites){if(s.type!=='tower'||!s.spout)continue;if(!cars.some(c=>Math.abs(c.ax-s.x)<c.w/2+60))continue;
if(s.collapsed||!(s.water>0))return`WATER TOWER — empty<small>Nothing left to pour</small>`;
if(!pc||!G.caps.water)return`WATER TOWER<small>You need a working WATER TANKER to take on water</small>`;
if(s.pouring)return`FILLING WATER ${Math.floor(G.res.water||0)}/${G.caps.water}<small>Tower holds ${Math.round(s.water)} · stay put</small>`;
return`WATER TOWER — ${Math.round(s.water)} water<small>Park the WATER TANKER under the spout (${Math.round(pc.ax-s.spout[0])>0?'back up':'roll forward'} ${Math.abs(Math.round(pc.ax-s.spout[0]))} m)</small>`}
return'';
}
function towerTick(dt){
const w=G.world;if(!w||!G.caps.water)return;
for(const s of w.sites){if(s.type!=='tower'||!s.spout)continue;
if(s.collapsed||!(s.water>0)){s.pouring=false;continue}
let tank=null;for(const c of G.train.cars)if(c.d.roles.includes('WATER')&&Math.abs(c.ax-s.spout[0])<c.w*.35){tank=c;break}
if(!tank||Math.abs(G.train.v)>2.5){s.pouring=false;continue}
if((G.res.water||0)>=G.caps.water-.5){if(s.pouring){s.pouring=false;log('Water tank full','good')}continue}
if(!s.pouring){s.pouring=true;log('Filling up at the water tower','good')}
s.pourAcc=(s.pourAcc||0)+dt*CFG.towerFlow/CFG.towerFill;
while(s.pourAcc>=1&&s.water>0){s.pourAcc--;addActive(s.spout[0]+rand(-.8,.8),s.spout[1]+rand(0,1),rand(-3,3),rand(10,30),M.WATER,110,165,235,0,0);const q=PX.act[PX.act.length-1];if(q)q.fill=CFG.towerFill;s.water-=CFG.towerFill}
if(s.water<=0){s.pouring=false;log('The water tower is dry','warn')}}
}
function craneTick(dt){
const C=G.caps,c=C.crane;if(!c){G.craneLine=null;return}
if(G.craneLoad>=CFG.pixelsPerScrap){const n=Math.floor(G.craneLoad/CFG.pixelsPerScrap);G.craneLoad-=n*CFG.pixelsPerScrap;const room=Math.max(0,C.scrap-G.res.scrap),got=Math.min(n,room);G.res.scrap+=got;G.tel.scrapIn+=got;if(got&&(G.craneMsgT||0)<=G.t){G.craneMsgT=G.t+6;log(`Crane: +${got} scrap from wreckage`,'good')}}
if(G.craneLine&&(G.craneLine.t-=dt)<=0)G.craneLine=null;
if(Math.abs(carVel(c))>CFG.craneMaxSpeed)return;
if((G.craneT=(G.craneT||0)-dt)>0)return;G.craneT=CFG.craneEvery/(1+.5*C.craneLvl);
const hk=toWorld(c,c.pts.hook[0],c.pts.hook[1]),reach=CFG.craneReach*(1+.3*C.craneLvl)+c.w/2,ccx=c.ax;let grabbed=0,tx=null,ty=null;
for(let i=G.obstacles.length-1;i>=0&&!grabbed;i--){const o=G.obstacles[i],ox=o.x+o.w/2;if(Math.abs(ox-ccx)>reach)continue;
G.obstacles.splice(i,1);const base=T(ox);for(let n=0;n<o.w*o.h*.7;n++){const q=Math.random();addActive(o.x+rand(0,o.w),base-rand(1,o.h),0,0,o.kind==='rock'?M.STONE:M.SCRAP,96+q*40,88+q*34,78+q*28,0,.3);const a=PX.act[PX.act.length-1];if(a)a.haul=c}
grabbed=1;tx=ox;ty=base-o.h;log('Crane lifted an obstacle off the line','good')}
if(!grabbed)for(let i=G.chunks.length-1;i>=0;i--){const ch=G.chunks[i];if(!ch.rest||!ch.px||Math.abs(ch.x-ccx)>reach)continue;
const before=PX.act.length;chunkToPixels(ch,0,0);for(let j=before;j<PX.act.length;j++)PX.act[j].haul=c;G.chunks.splice(i,1);grabbed=1;tx=ch.x;ty=ch.y;break}
if(!grabbed&&PX.occ){let bx=-1,bh=0;const W=PX.W;for(let x=Math.max(0,Math.floor(ccx-reach));x<Math.min(W,ccx+reach);x+=2){const top=surfaceY(x),h=Math.ceil(groundY(x))-top;if(h>bh){bh=h;bx=x}}
if(bx>=0&&bh>=1){const top=surfaceY(bx);let n=0;const take=CFG.craneGrab*(1+.5*C.craneLvl);
for(let y=top;y<top+14&&n<take;y++)for(let x=bx-4;x<=bx+4&&n<take;x++){const k=y*W+x;const cell=PX.cells.get(k);if(!cell||cell.st!==undefined)continue;pxRemove(k);addActive(x+.5,y+.5,0,-20,cell.m,cell.r,cell.g,cell.b,0,.3);const a=PX.act[PX.act.length-1];if(a)a.haul=c;n++}
if(n){grabbed=1;tx=bx;ty=top}}}
if(grabbed){G.craneLine={x:tx,y:ty,t:.5};sfx('clack',.6,hk[0])}
}
