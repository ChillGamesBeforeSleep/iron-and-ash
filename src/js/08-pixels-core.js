/* =====================================================================
   PIXEL PHYSICS — every pixel knocked off a unit lives on as an active pixel:
   it flies, bounces, collides with other pixels, piles up, carries heat, and
   hurts what it hits. Settled pixels form heaps the train ploughs through.
   ===================================================================== */
const PMASS=MATS.map(m=>m.mass??1);
const PREST=MATS.map(m=>m.bounce??.3);
const PX={act:[],occ:null,cells:new Map(),queue:[],qh:0,burning:new Set(),cv:null,ctx:null,W:1,H:1,grid:new Map(),bk:new Map(),kickBudget:0};
function pxInit(w){PX.structCount=0;PX.W=w.W;PX.H=w.H;PX.occ=new Uint8Array(w.W*w.H);PX.dug=new Uint8Array(w.W*w.H);PX.cells=new Map();PX.queue=[];PX.qh=0;PX.burning=new Set();PX.act=[];
if(!PX.cv)PX.cv=document.createElement('canvas');PX.cv.width=w.W;PX.cv.height=w.H;PX.ctx=PX.cv.getContext('2d')}
function solidAt(x,y){x=Math.floor(x);y=Math.floor(y);if(x<0||x>=PX.W||y>=PX.H)return true;if(y<0)return false;const k=y*PX.W+x;if(PX.occ&&PX.occ[k]===1)return true;if(y>=groundY(x+.5))return !(PX.dug&&PX.dug[k]);return false}
function surfaceY(x){const xi=Math.floor(x);let y=Math.ceil(groundY(x));if(!PX.occ||xi<0||xi>=PX.W)return y;while(y>0&&PX.occ[(y-1)*PX.W+xi]===1)y--;while(y<PX.H-2&&PX.dug&&PX.dug[y*PX.W+xi]&&!PX.occ[y*PX.W+xi])y++;return y}
function craterGround(wx,wy,r,power,vx,vy,digging){
if(!G.world||!PX.dug)return 0;
const W=PX.W,H=PX.H,wctx=G.world.ctx,R=Math.min(24,Math.max(2,r*(digging?1:1.15)));let carved=0;
for(let y=Math.max(2,Math.floor(wy-R));y<=Math.min(H-4,Math.ceil(wy+R));y++){
for(let x=Math.max(2,Math.floor(wx-R));x<=Math.min(W-4,Math.ceil(wx+R));x++){
const dx=x+.5-wx,dy=y+.5-wy,d=Math.hypot(dx,dy);if(d>R*(.82+.25*hash2(x,y)))continue;
const gy=Math.round(G.world.T[x]),dep=y-gy;if(dep<0)continue;
if(dep<2&&!digging&&power<115)continue;
const k=y*W+x;if(PX.dug[k])continue;
const lay=groundLayerAt(x,y);if(!lay)continue;
const resist=dep<2?135:dep<5?65:dep<11?80:95;
if(!digging&&power*(1-d/(R*1.15))<resist*.35)continue;
PX.dug[k]=1;carved++;
if(wctx){wctx.fillStyle=dep<2?'rgb(16,15,14)':'rgb(8,7,7)';wctx.fillRect(x,y,1,1)}
if(Math.random()<(digging?.22:.38)){
const sp=rand(22,45+power*.55)*(1-d/(R*1.2)),ux=dx/(d||1),uy=Math.min(-.25,dy/(d||1));
addActive(x+.5,y-.5,(vx||0)*.35+ux*sp+rand(-16,16),(vy||0)*.25+uy*sp-rand(12,42),lay.m,lay.r,lay.g,lay.b,power>110&&Math.random()<.2?1.1:0,.08);
}
}}
if(G.world&&power>=80){
for(const bu of G.world.buried||[]){
if(!bu.looted&&bu.kind==='gas'&&Math.hypot(wx-bu.x,wy-bu.y)<=bu.r+R+6)igniteGasPocket(bu,'blast wave');
}
for(const st of G.world.subTurrets||[]){
if(st.alive&&Math.hypot(wx-st.x,wy-st.y)<=R+10){
st.awake=true;st.hp-=power*.55;
if(st.hp<=0){st.alive=false;dropSalvage(st.x,{scrap:3,equip:1,ammo:4},'destroyed bunker turret');log('Subterranean defense turret destroyed! (+3 scrap, +1 equip, +4 ammo)','good');sfx('boom',.6,st.x)}
}
}
}
return carved;
}
function igniteGasPocket(bu,why){
if(!bu||bu.looted)return;bu.looted=true;
sfx('boom',1.1,bu.x);G.shake+=7;addLight(bu.x,bu.y,48,1,.5,'255,150,50');
log(`Underground gas pocket ignited (${why||'spark'}) — massive subterranean blowout!`,'bad');
craterGround(bu.x,bu.y,bu.r*1.65,165,0,-45,true);
craterGround(bu.x,groundY(bu.x)+4,bu.r*1.1,135,0,-60,true);
for(let i=0;i<36;i++){
const a=rand(-2.4,-.7),sp=rand(35,135),m=i%3===0?M.OIL:M.FUEL;
addActive(bu.x+rand(-bu.r,bu.r)*.6,bu.y+rand(-4,4),Math.cos(a)*sp,Math.sin(a)*sp,m,255,130+rand(-20,40),30,2.6,.04);
}
G.explQ.push({x:bu.x,y:bu.y-4,r:bu.r*1.35,p:145,ign:.9,vx:0,vy:-55,cause:'underground gas pocket blowout'});
}
function subTurretTick(dt){
if(!G.world||!G.world.subTurrets)return;
const drillers=(G.vehicles||[]).filter(v=>v.vkind==='mole'&&v.state!=='down');
for(const st of G.world.subTurrets){
if(!st.alive)continue;
let tgt=null,bd=115;
for(const d of drillers){const dd=Math.hypot(d.cxw-st.x,d.cyw-st.y);if(dd<bd){bd=dd;tgt=d}}
if(!st.awake&&tgt&&bd<88){st.awake=true;sfx('bad',.8,st.x);log('Dormant bunker defense turret woke up underground! Use [Space] seismic charge or ram it!','bad')}
if(!st.awake)continue;
if(tgt&&Math.hypot(tgt.cxw-st.x,tgt.cyw-st.y)<12&&Math.hypot(tgt.vx,tgt.vy)>10){
st.hp-=45*dt*6;if(st.hp<=0){st.alive=false;craterGround(st.x,st.y,7,110,tgt.vx,tgt.vy,true);if(tgt.inv){inventoryAddTo(tgt.inv,'scrap',3,VEHICLE_PACK);inventoryAddTo(tgt.inv,'equip',1,VEHICLE_PACK);inventoryAddTo(tgt.inv,'ammo',4,VEHICLE_PACK)}log('Drilled through the bunker defense turret! (+3 scrap, +1 equip, +4 ammo)','good');sfx('boom',.7,st.x);continue}
}
st.cool-=dt;
if(st.cool<=0&&tgt){
st.cool=rand(.85,1.35);
const a=Math.atan2(tgt.cyw-st.y,tgt.cxw-st.x)+rand(-.05,.05);
sfx('shot',.75,st.x);addLight(st.x,st.y,18,.8,.08,'255,90,60');
G.cause='bunker defense turret';
damageCircle(tgt.cxw+rand(-4,4),tgt.cyw+rand(-3,3),2.4,34,.15,Math.cos(a)*80,Math.sin(a)*80);
G.parts.push({x:st.x,y:st.y,x2:tgt.cxw,y2:tgt.cyw,vx:0,vy:0,life:.09,max:.09,col:[255,90,60],cs:'rgb(255,90,60)',size:1,kind:'arc'});
}
}
}
const structAt=(x,y)=>{if(!PX.occ)return false;x=Math.floor(x);y=Math.floor(y);if(x<0||y<0||x>=PX.W||y>=PX.H)return false;return PX.occ[y*PX.W+x]===2};
function buildStructures(w,rng){
PX.structCount=0;
w.sites.forEach((s,si)=>{const x0=Math.round(s.x)-85,y0=Math.round(w.T[Math.round(s.x)])-110,cw=175,chh=122;s.si=si;s.bx0=x0;s.by0=y0;s.bw=cw;s.bh=chh;s.cx0=1e9;s.cx1=-1;s.ty=1e9;
const cv=document.createElement('canvas');cv.width=cw;cv.height=chh;const c=cv.getContext('2d');c.translate(-x0,-y0);drawSite(c,s,rng);
const d=c.getImageData(0,0,cw,chh).data;let n=0;
for(let y=0;y<chh;y++)for(let x=0;x<cw;x++){const q=(y*cw+x)*4;if(d[q+3]<128)continue;const wx=x0+x,wy=y0+y;if(wx<0||wx>=PX.W||wy<0||wy>=PX.H)continue;const k=wy*PX.W+wx;if(PX.occ[k])continue;
const r=d[q],g=d[q+1],b=d[q+2];let m=s.type==='camp'?M.WOOD:(s.type==='depot'||s.type==='yard')?M.STEEL:M.STONE;
if(s.type==='depot'&&r>150&&g>120&&b<90)m=M.FUEL;
if(s.type==='tower')m=b>r+12?M.WATER:M.STEEL;
if(s.type==='armory'&&r>90&&g>90&&b<75&&Math.abs(r-g)<10)m=M.AMMO;
PX.occ[k]=2;PX.cells.set(k,{m,r,g,b,burn:0,st:si});if(wx<s.cx0)s.cx0=wx;if(wx>s.cx1)s.cx1=wx;if(wy<s.ty)s.ty=wy;PX.ctx.fillStyle=`rgb(${r},${g},${b})`;PX.ctx.fillRect(wx,wy,1,1);n++}
s.cells0=n;s.cellsLeft=n;s.collapsed=false;PX.structCount+=n});
}
function pxPaint(k,c){PX.ctx.fillStyle=`rgb(${c.r|0},${c.g|0},${c.b|0})`;PX.ctx.fillRect(k%PX.W,(k/PX.W)|0,1,1)}
function addActive(x,y,vx,vy,m,r,g,b,hot,ign,src){
if(!PX.occ||!(x>=0&&x<PX.W))return;
const p={x,y,vx,vy,m,r,g,b,cs:`rgb(${r|0},${g|0},${b|0})`,hot:hot||0,ign:ign||0,src:src||null,still:0,age:0},A=PX.act;
if(A.length>=CFG.maxActive*(G.q||1)){const j=(Math.random()*A.length)|0,q=A[j];if(solidAt(q.x,q.y+1))pxSettle(q);A[j]=p}else A.push(p);
}
const isFlamPx=m=>m!==M.AMMO&&FLAM[m]>=.25;
const PXBURN={[M.FUEL]:[3,5],[M.OIL]:[3,5],[M.RUBBER]:[5,8],[M.COAL]:[9,15]};
function igniteCell(k,c){if(c.burn>0||!isFlamPx(c.m))return;const b=PXBURN[c.m]||[2,4];c.burn=rand(b[0],b[1]);PX.burning.add(k)}
function pxSettle(p){
if(p.m===M.WATER){douseGround(p.x,p.y,3);return}
const W=PX.W,x=Math.floor(p.x);let y=Math.floor(p.y),guard=0;if(x<0||x>=W)return;
while(y>0&&solidAt(x,y)&&guard++<40)y--;if(y<=0||y>=PX.H)return;
const k=y*W+x,cell={m:p.m,r:p.r,g:p.g,b:p.b,burn:0};
if(PX.occ[k]===2){const o=PX.cells.get(k);if(o&&o.st!==undefined)cell.under=o}
PX.occ[k]=1;PX.cells.set(k,cell);pxPaint(k,cell);
if(p.hot>0){igniteCell(k,cell);for(const q of [k+W,k-1,k+1]){const c2=PX.cells.get(q);if(c2&&Math.random()<.5)igniteCell(q,c2)}}
PX.queue.push(k);
if(PX.cells.size-PX.structCount>CFG.maxSettled){while(PX.cells.size-PX.structCount>CFG.maxSettled&&PX.qh<PX.queue.length){const o=PX.queue[PX.qh++];if(PX.cells.has(o))pxRemove(o)}if(PX.qh>8000){PX.queue=PX.queue.slice(PX.qh);PX.qh=0}}
}
function pxRemove(k){
const c=PX.cells.get(k);
if(c&&c.st!==undefined){PX.structCount--;const s=G.world&&G.world.sites[c.st];if(s){s.cellsLeft--;if(!s.collapsed&&s.cellsLeft<s.cells0*CFG.collapseAt)siteCollapse(s,'shot')}
if(c.m===M.AMMO&&Math.random()<.04&&G.explQ.length<30)G.explQ.push({x:k%PX.W+.5,y:((k/PX.W)|0)+.5,r:5,p:70,ign:.5,cause:'demolition'})}
PX.cells.delete(k);PX.occ[k]=0;PX.burning.delete(k);PX.ctx.clearRect(k%PX.W,(k/PX.W)|0,1,1);
if(c&&c.under){PX.occ[k]=2;PX.cells.set(k,c.under);pxPaint(k,c.under)}}
