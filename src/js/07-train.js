/* =====================================================================
   TRAIN
   ===================================================================== */
const DEFAULT_CONSIST=['loco','tender','water','passenger','armored','cargo','driller'];
let CONSIST=DEFAULT_CONSIST.slice();
function startConsist(){const ok=CONSIST.filter(t=>CARS[t]);return ok.length&&CARS[ok[0]].base==='loco'?ok.slice(0,8):DEFAULT_CONSIST.slice()}
function newTrain(){
carIds=0;
const cars=startConsist().map(t=>makeCar(t));
cars.forEach(updateRegions);
return {cars,x:760,v:0};
}
function layout(cars,headX){
for(let i=0;i<cars.length;i++){const c=cars[i];
c.x=i===0?headX:cars[i-1].x-cars[i-1].w/2-CFG.gap-c.w/2;
const bx=c.x+(c.sx||0),xr=bx-c.w*.38,xf=bx+c.w*.38,yr=T(xr),yf=T(xf);
c.ang=Math.atan2(yf-yr,xf-xr)+(c.sr||0);c.co=Math.cos(c.ang);c.si=Math.sin(c.ang);c.ax=bx;c.ay=(yr+yf)/2+(c.sy||0);
const p=toWorld(c,c.w/2,c.h/2);c.cxw=p[0];c.cyw=p[1];}
}
function motionTick(cars,a,v,dt){
const av=Math.abs(v);
for(let i=0;i<cars.length;i++){const c=cars[i];
if(c.sx===undefined){c.sx=c.svx=c.sy=c.svy=c.sr=c.svr=0;c.jx=null}
const back=1.5*i,fwd=(CFG.gap-.6)*i,tgt=clamp(-a*CFG.slack*i,-back,fwd);
c.svx+=((tgt-c.sx)*55-c.svx*7)*dt;c.sx+=c.svx*dt;if(c.sx>fwd){c.sx=fwd;c.svx*=-.3}if(c.sx<-back-1){c.sx=-back-1;c.svx*=-.3}
const curv=(T(c.x+12)-2*T(c.x)+T(c.x-12))/144;
const sink=c.derailed?2.8:0;c.svy+=(-curv*v*v*CFG.bumpCurve-(c.sy-sink)*240-c.svy*10)*dt;
const j=Math.floor((c.x+i*17)/46);if(c.jx!==null&&c.jx!==j&&av>2){c.svy-=av*CFG.bumpJoint*(.6+Math.random()*.8)/carMass(c);c.svr+=(Math.random()-.5)*av*.0015}c.jx=j;
c.sy+=c.svy*dt;if(c.sy<-3.5){c.sy=-3.5;c.svy*=-.3}if(c.sy>(c.derailed?3.4:1.2)){c.sy=c.derailed?3.4:1.2;c.svy*=-.3}
c.svr+=((-a*CFG.pitch+(c.derailed?.055*(c.dside||1):0)-c.sr)*80-c.svr*9)*dt;c.sr=clamp(c.sr+c.svr*dt,-.09,.09);
}
}
function jolt(c,dx,dy,dr){if(c.sx===undefined)return;c.svx+=dx;c.svy+=dy;c.svr+=dr}
function toLocal(c,wx,wy){const dx=wx-c.ax,dy=wy-c.ay;return[(dx*c.co+dy*c.si)*(c.fx||1)+c.w/2,-dx*c.si+dy*c.co+c.h]}
function toWorld(c,lx,ly){const px=(lx-c.w/2)*(c.fx||1),py=ly-c.h;return[c.ax+px*c.co-py*c.si,c.ay+px*c.si+py*c.co]}
function pixelAt(c,wx,wy){const dx=wx-c.cxw,dy=wy-c.cyw;if(dx*dx+dy*dy>c.rad*c.rad)return -1;const l=toLocal(c,wx,wy),i=Math.floor(l[0]),j=Math.floor(l[1]);if(i<0||j<0||i>=c.w||j>=c.h)return -1;const k=j*c.w+i;return c.mat[k]?k:-1}
function carAtPoint(wx,wy,ownOnly){for(const c of G.all){if(ownOnly&&c.enemy)continue;const k=pixelAt(c,wx,wy);if(k>=0)return[c,k]}return null}
function updateRegions(c){
c.regHp.fill(0);c.regFire.fill(0);
if(!c.regDmgPx)c.regDmgPx=new Uint16Array(8);else c.regDmgPx.fill(0);
let live=0;for(let k=0;k<c.n;k++){const rg=c.reg[k];if(c.mat[k]){live++;c.regHp[rg]+=c.hp[k];if(c.fire[k]>0)c.regFire[rg]++;if(c.hp[k]<MAXHP[c.mat[k]]*.95)c.regDmgPx[rg]++}else if(c.omat&&c.omat[k])c.regDmgPx[rg]++}
const rc=c.regCount||8;let s=0;for(let r=0;r<rc;r++){c.regInt[r]=c.regMax[r]?c.regHp[r]/c.regMax[r]:0;const pxOut=rc===3&&c.regDmgPx[r]>CFG.secMaxDmgPx;c.alive[r]=c.regInt[r]>=CFG.disableAt&&!pxOut;s+=c.regHp[r]}
c.integrity=s/c.totalMax;
/* the ledger only changes when pixels appear or disappear — recount then, not on every hit */
if(!c.as||c.as.px!==live||c.as.lvKey!==c.lvl.join())ledger(c);
}
function hitPixel(c,k,amt,vx,vy,cause){
if(MATS[c.mat[k]].spark&&Math.random()<.6){const p=toWorld(c,k%c.w+.5,((k/c.w)|0)+.5);for(let q=0;q<4;q++)spark(p[0],p[1],rand(-60,60),rand(-70,-10),rand(.15,.4),[255,rand(200,240),140],1);if(Math.random()<.04)c.fire[k]=Math.max(c.fire[k],.4)}
amt*=c.mul[c.reg[k]]*CFG.dmgMul;if(G.dev.god&&!c.enemy)return;if(!c.enemy)G.tel.dmg[G.cause]=(G.tel.dmg[G.cause]||0)+Math.min(amt,Math.max(0,c.hp[k]));
c.hp[k]-=amt;c.rd=1;c.dirtyPaint=1;{const L=MATS[c.mat[k]].leak;if(L&&Math.random()<L)dripFrom(c,k,c.mat[k],c.fire[k]>0)}
if(c.hp[k]<=0)destroyPixel(c,k,vx,vy,cause);
}
