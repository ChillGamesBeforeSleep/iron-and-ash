/* ---------- 10-pixels-sim ---------- */
function pxKick(k,vx,vy,depth){
const c=PX.cells.get(k);if(!c)return;pxRemove(k);
addActive(k%PX.W+.5,((k/PX.W)|0)+.5,vx,vy,c.m,c.r,c.g,c.b,c.burn>0?1.5:0,.25);
depth=depth||0;if(depth<(c.st!==undefined?90:14)){const up=k-PX.W;if(up>=0&&PX.occ[up]===(c.st!==undefined?2:1))pxKick(up,vx*.35+rand(-8,8),Math.min(vy*.35,0)-rand(0,12),depth+1)}
}
function douse(c,k,r){const i=k%c.w,j=(k/c.w)|0;let n=0;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const ii=i+dx,jj=j+dy;if(ii<0||jj<0||ii>=c.w||jj>=c.h)continue;const q=jj*c.w+ii;if(c.fire[q]>0){c.fire[q]=c.mat[q]===M.FUEL&&c.fire[q]>.3?c.fire[q]*.45:0;n++}}if(n)G.tel.doused=(G.tel.doused||0)+n;return n}
function wetArea(c,k,r){const w=c.w,i=k%w,j=(k/w)|0,wet=c.wet||(c.wet=new Float32Array(c.n)),T0=CFG.wetTime;
for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(dx*dx+dy*dy>r*r+1)continue;const ii=i+dx,jj=j+dy;if(ii<0||jj<0||ii>=w||jj>=c.h)continue;const q=jj*w+ii;if(c.mat[q])wet[q]=T0}}
function soak(c,k){c.wetT=G.t+CFG.wetTime;
const w=c.w;let n=douse(c,k,2);wetArea(c,k,3);
for(let dj=1;dj<=CFG.trickle;dj++){const q=k+dj*w;if(q>=c.n||!c.mat[q])break;n+=douse(c,q,1);wetArea(c,q,1)}
if(n){const p=toWorld(c,k%w+.5,((k/w)|0)-.5);spawn(p[0],p[1],rand(-10,10),rand(-34,-16),rand(.6,1.3),[215,220,226],2,'smoke')}
return n}
function douseGround(x,y,r){if(!PX.occ)return;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const k=(Math.floor(y)+dy)*PX.W+Math.floor(x)+dx,c=PX.cells.get(k);if(c&&c.burn>0){c.burn=0;PX.burning.delete(k);c.r*=.5;c.g*=.5;c.b*=.5;pxPaint(k,c)}}}
function pxHitCar(p,c,k){
if(p.m===M.WATER){
if(p.fill){if(c.d.roles.includes('WATER')&&G.caps.water)G.res.water=Math.min(G.caps.water,(G.res.water||0)+p.fill);else soak(c,k);return true}
soak(c,k);p.wh=(p.wh||0)+1;if(p.wh>=2)return true;
const cv=carVel(c);p.vx=cv-(p.vx-cv)*.15+rand(-20,20);p.vy=-Math.abs(p.vy)*.12-rand(5,20);p.ign=p.age+.03;return false}
const cv=carVel(c),dvx=p.vx-cv,sp=Math.hypot(dvx,p.vy),mass=PMASS[p.m];
if(p.drip){const m=c.mat[k];if(m&&p.hot>0&&FLAM[m]>0&&Math.random()<Math.max(CFG.hotIgnite*.5,IGNITE[p.m]))c.fire[k]=Math.max(c.fire[k],.45);return true}
if(sp>CFG.pxDmgSpeed&&DEFLECT[c.mat[k]]&&Math.random()<DEFLECT[c.mat[k]]){p.vx=cv-dvx*.7;p.vy=-Math.abs(p.vy)*.7-10;p.ign=p.age+.05;if(Math.random()<.3)sfx('tink',.4,p.x);return false}
if(sp>CFG.pxDmgSpeed){G.cause='shrapnel';hitPixel(c,k,mass*(sp-CFG.pxDmgSpeed)*CFG.pxImpact,dvx*.4,p.vy*.4,'hit');if(Math.random()<.12)sfx('tink',.6,p.x);jolt(c,dvx*.004*mass,p.vy*.006*mass,0)}
if(p.hot>0){if(c.mat[k]&&FLAM[c.mat[k]]>0&&Math.random()<CFG.hotIgnite)c.fire[k]=Math.max(c.fire[k],.45);p.hot*=.45}
if(p.m===M.AMMO&&sp>110&&Math.random()<.2&&G.explQ.length<30)G.explQ.push({x:p.x,y:p.y,r:4,p:60,ign:.5,cause:'ammo cook-off'});
if(sp<30){p.hits=(p.hits||0)+1;if(p.hits>CFG.pxCarHops)return true;const dir=toLocal(c,p.x,p.y)[0]<c.w/2?-1:1;p.vx=cv+dir*rand(25,60);p.vy=-rand(20,55);p.ign=p.age+.03;return false}
const r=PREST[p.m]*CFG.pxBounce;p.vx=cv-dvx*r;p.vy=-p.vy*r-10;p.ign=p.age+.04;return false;
}
function pxStep(dt){
if(!PX.occ)return;
const A=PX.act,W=PX.W,grid=PX.grid;grid.clear();
for(let i=0;i<A.length;i++){const p=A[i];grid.set(Math.floor(p.y)*W+Math.floor(p.x),i)}
let bx0=1e9,bx1=-1e9,by0=1e9,by1=-1e9;for(const c of G.all){bx0=Math.min(bx0,c.cxw-c.rad);bx1=Math.max(bx1,c.cxw+c.rad);by0=Math.min(by0,c.cyw-c.rad);by1=Math.max(by1,c.cyw+c.rad)}
const g=CFG.pxGravity,drones=G.drones.length>0;
for(let i=A.length-1;i>=0;i--){const p=A[i];if(!p)continue;p.age+=dt;
if(p.land&&p.age>=p.land){p.land=0;const h=carAtPoint(p.x,p.y);if(h){soak(h[0],h[1]);p.run=h[0];p.runT=rand(.25,.55);p.vy=Math.max(0,p.vy)*.15}}
if(p.run){const c=p.run;p.runT-=dt;if(p.runT<=0||!G.all.includes(c)){A[i]=A[A.length-1];A.pop();continue}
p.vx=carVel(c);p.vy=Math.min(70,p.vy+260*dt);p.x+=p.vx*dt;p.y+=p.vy*dt;const h=carAtPoint(p.x,p.y);
if(h&&h[0]===c){douse(c,h[1],1);wetArea(c,h[1],1)}else{p.run=null;p.ign=p.age+.05}
continue}
if(p.haul){const c=p.haul;if(!G.train.cars.includes(c)){p.haul=null}else{const sp2=c.pts.store,t=toWorld(c,sp2[0],sp2[1]),dx=t[0]-p.x,dy=t[1]-p.y,d=Math.hypot(dx,dy);
if(d<4){G.craneLoad=(G.craneLoad||0)+1;A[i]=A[A.length-1];A.pop();continue}
const want=CFG.craneSpeed;p.vx+=(dx/d*want+carVel(c)-p.vx)*Math.min(1,dt*7);p.vy+=(dy/d*want-p.vy)*Math.min(1,dt*7);p.x+=p.vx*dt;p.y+=p.vy*dt;p.age+=dt;continue}}
if(p.age>CFG.pxMaxAge*(PDRAG[p.m]?3:1)){if(solidAt(p.x,p.y+1))pxSettle(p);A[i]=A[A.length-1];A.pop();continue}
if(p.drip){p.vy=Math.min(p.vy+g*dt*.6,70);p.vx+=((G.wind||0)*.8-p.vx)*Math.min(1,dt*1.2)}else
{const dr=PDRAG[p.m];if(dr){p.vy=Math.min(p.vy+g*dt*.2,20+8*Math.sin(p.age*5+i));p.vx+=((G.wind||0)+Math.sin(p.age*3.5+i)*14-p.vx)*Math.min(1,dt*dr)}else{p.vy+=g*dt;p.vx*=1-.12*dt}}
if(p.clear!==undefined){p.clear-=dt;if(p.clear<=0){A[i]=A[A.length-1];A.pop();continue}}
if(p.hot>0){p.hot-=dt;if(Math.random()<dt*3)spawn(p.x,p.y,rand(-5,5),rand(-25,-10),rand(.5,1),Math.random()<.5?[255,140,50]:[80,76,72],1,Math.random()<.5?'ember':'smoke',.05)}
const sp=Math.hypot(p.vx,p.vy),n=Math.min(6,Math.ceil(sp*dt*.7)+1),sx=p.vx*dt/n,sy=p.vy*dt/n,key0=Math.floor(p.y)*W+Math.floor(p.x);
let gone=false;
for(let st=0;st<n;st++){
const nx=p.x+sx,ny=p.y+sy;
if(!p.land&&p.age>p.ign&&nx>bx0&&nx<bx1&&ny>by0&&ny<by1){const h=carAtPoint(nx,ny);if(h&&!(h[0]===p.src&&p.age<.6)){if(pxHitCar(p,h[0],h[1]))gone=true;break}}
if(drones&&sp>60){let hitD=false;for(const d of G.drones)if(!d.dead&&Math.abs(d.x-nx)<4&&Math.abs(d.y-ny)<3){d.hp-=PMASS[p.m]*sp/160;if(d.hp<=0){d.dead=true;d.vy=-30;d.vx+=p.vx*.3;G.stats.kills++;G.tel.kills++}p.vx*=-.3;p.vy*=-.3;hitD=true;break}if(hitD)break}
if(sp>150&&PMASS[p.m]>=1&&G.exp&&Math.random()<.5&&hitWalker(nx,ny,.8,PMASS[p.m]*sp/16,'shrapnel'))p.vx*=.3;
if(sp>140&&PMASS[p.m]>=1&&G.raiders&&G.raiders.length&&hitRaiders(nx,ny,.8,PMASS[p.m]*sp/16,'shrapnel'))p.vx*=.3;
if(solidAt(nx,ny)){
const hy=solidAt(p.x,ny),hx=solidAt(nx,p.y),r=PREST[p.m]*CFG.pxBounce;
if(sp>CFG.pxKick&&PX.kickBudget>0){const kk=Math.floor(ny)*W+Math.floor(nx);if(PX.cells.has(kk)&&Math.random()<.5){PX.kickBudget--;pxKick(kk,p.vx*.5+rand(-20,20),-sp*.35*Math.random(),0)}}
if(hy||!hx){
if(p.vy>0&&p.vy<CFG.pxSettleV&&Math.abs(p.vx)<CFG.pxSettleV*1.4){
const dir=Math.random()<.5?-1:1,x=p.x,y=p.y;
if(!solidAt(x+dir,y)&&!solidAt(x+dir,y+1)){p.x+=dir;p.vx=dir*8;break}
if(!solidAt(x-dir,y)&&!solidAt(x-dir,y+1)){p.x-=dir;p.vx=-dir*8;break}
if(p.m===M.FUEL&&!solidAt(x+dir,y)&&Math.random()<.6){p.x+=dir;p.vx=dir*10;p.vy=0;break}
pxSettle(p);gone=true;break}
p.vy=-p.vy*r;p.vx*=CFG.pxFriction;
}
if(hx)p.vx=-p.vx*r;
break}
const key=Math.floor(ny)*W+Math.floor(nx);
if(key!==key0){const j=grid.get(key);let q=j!==undefined&&j!==i?A[j]:null;if(q&&p.age<.25&&q.age<.25)q=null;
if(q){const mp=PMASS[p.m],mq=PMASS[q.m],tvx=p.vx,tvy=p.vy,s=.7/(mp+mq);
p.vx=(tvx*(mp-mq)+2*mq*q.vx)*s;p.vy=(tvy*(mp-mq)+2*mq*q.vy)*s;q.vx=(q.vx*(mq-mp)+2*mp*tvx)*s;q.vy=(q.vy*(mq-mp)+2*mp*tvy)*s;
if(p.hot>0&&!q.hot&&Math.random()<.2)q.hot=.6;break}}
p.x=nx;p.y=ny}
if(gone||p.x<0||p.x>=W||p.y>=PX.H){A[i]=A[A.length-1];A.pop();continue}
grid.delete(key0);grid.set(Math.floor(p.y)*W+Math.floor(p.x),i);
if(Math.abs(p.vx)<5&&Math.abs(p.vy)<8&&solidAt(p.x,p.y+1)){p.still+=dt;if(p.still>.2){pxSettle(p);A[i]=A[A.length-1];A.pop()}}else p.still=0;
}
}
