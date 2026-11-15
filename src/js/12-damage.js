/* ---------- 12-damage ---------- */
function pxFires(dt){
PX.bk.clear();if(!PX.burning.size)return;
const W=PX.W,ctx=PX.ctx;
for(const k of PX.burning){const c=PX.cells.get(k);if(!c){PX.burning.delete(k);continue}
c.burn-=dt;const x=k%W,y=(k/W)|0;
if(c.burn<=0){PX.burning.delete(k);if(c.m===M.FUEL||c.m===M.OIL){pxRemove(k);const up=k-W;if(up>=0&&PX.occ[up])pxKick(up,rand(-5,5),0,0)}else{c.r*=.25;c.g*=.22;c.b*=.2;c.m=M.SCRAP;pxPaint(k,c)}continue}
const f=.6+.4*Math.random();ctx.fillStyle=`rgb(255,${(90+120*f)|0},${(30*f)|0})`;ctx.fillRect(x,y,1,1);
if(Math.random()<dt*4){const nb=[k-1,k+1,k-W,k+W][(Math.random()*4)|0],c2=PX.cells.get(nb);if(c2)igniteCell(nb,c2)}
if(Math.random()<dt*2*SMOKEK[c.m]){const sm=SMOKEK[c.m]>1||Math.random()>=.6;spawn(x+.5,y-1,rand(-6,6),rand(-30,-14),rand(.6,1.4)*(sm?SMOKEK[c.m]:1),sm?(MATS[c.m].smoke||[90,84,80]):[255,150,60],sm?2:1,sm?'smoke':'ember',.12)}
if(Math.random()<dt*CFG.puddleIgnite){const h=carAtPoint(x+.5,y-2.5);if(h&&FLAM[h[0].mat[h[1]]]>0)h[0].fire[h[1]]=Math.max(h[0].fire[h[1]],.4)}
const bkey=x>>4,b=PX.bk.get(bkey);if(b){b[0]++;b[1]+=y}else PX.bk.set(bkey,[1,y])}
G.tel.groundFire=(G.tel.groundFire||0)+PX.burning.size*dt;
}
function pxPlough(){
if(!PX.occ)return;const W=PX.W;let kicked=0;
for(const c of G.all){const v=carVel(c);if(Math.abs(v)<.8)continue;
const x0=Math.max(0,Math.floor(c.ax-c.w/2-1)),x1=Math.min(W-1,Math.ceil(c.ax+c.w/2+1)),y0=Math.max(0,Math.floor(c.ay-c.h-3)),y1=Math.min(PX.H-1,Math.ceil(c.ay+1));
for(let y=y0;y<=y1;y++){const row=y*W;for(let x=x0;x<=x1;x++){const k=row+x;if(PX.occ[k]!==1)continue;
if(y>=c.ay-8||pixelAt(c,x+.5,y+.5)>=0){pxKick(k,v*rand(.15,.75),-rand(60,150),0);const q=PX.act[PX.act.length-1];if(q&&Math.random()<.4)q.clear=rand(.4,.9);kicked++}}}}
for(let i=G.chunks.length-1;i>=0;i--){const ch=G.chunks[i];if(!ch.rest||!ch.px||ch.n>600)continue;
for(const c of G.all){const v=carVel(c);if(Math.abs(v)<3)continue;if(Math.abs(ch.x-c.ax)<c.w/2+ch.w/2&&ch.y>c.ay-c.h){chunkToPixels(ch,Math.abs(v)+40,1);for(const q of PX.act.slice(-ch.n)){q.vx=v*rand(.3,.9);q.vy=-rand(40,140)}G.chunks.splice(i,1);sfx('break',.6,ch.x);jolt(c,-Math.sign(v)*3,-6,0);kicked+=ch.n*.2;break}}}
if(kicked&&G.train){const tv=G.train.v;G.train.v-=Math.sign(tv)*Math.min(Math.abs(tv),Math.min(CFG.ploughDragMax,kicked*CFG.ploughDrag))}
}
function pxBlast(e){
if(!PX.occ)return;const W=PX.W,R=e.r*1.7;let n=0;
for(let y=Math.max(0,Math.floor(e.y-R));y<=Math.min(PX.H-1,Math.ceil(e.y+R))&&n<350;y++)for(let x=Math.max(0,Math.floor(e.x-R));x<=Math.min(W-1,Math.ceil(e.x+R))&&n<350;x++){
const k=y*W+x;if(!PX.occ[k])continue;const dx=x+.5-e.x,dy=y+.5-e.y,d=Math.hypot(dx,dy);if(d>R)continue;
const f=e.p*.9*(1-d/R)+20;pxKick(k,dx/(d||1)*f,dy/(d||1)*f-40,6);n++;if(d<e.r){const c=PX.cells.get(k)}}
for(const p of PX.act){const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy);if(d<e.r*2.6){const f=e.p*.45*(1-d/(e.r*2.6))/PMASS[p.m];p.vx+=dx/(d||1)*f;p.vy+=dy/(d||1)*f-30;p.still=0;if(d<e.r)p.hot=Math.max(p.hot,.8)}}
}
function pxDraw(ctx,cx,cy,W,H){
for(const p of PX.act){const x=p.x-cx,y=p.y-cy;if(x<-2||x>W+2||y<-2||y>H+2)continue;
if(p.hot>0){const t=Math.min(1,p.hot);ctx.fillStyle=`rgb(${lerp(p.r,255,t)|0},${lerp(p.g,150,t)|0},${lerp(p.b,50,t)|0})`}else ctx.fillStyle=p.cs;
ctx.fillRect(Math.floor(x),Math.floor(y),1,1)}
}
function carPaintRGB(c,k){const d=c.img.data;if(d[k*4+3])return[d[k*4],d[k*4+1],d[k*4+2]];return[c.col[k*3]*1.22,c.col[k*3+1]*1.22,c.col[k*3+2]*1.22]}
function destroyPixel(c,k,vx,vy,cause){
const m=c.mat[k];if(!m)return;
const wasHot=c.fire[k]>0,rgbv=carPaintRGB(c,k),cvel=carVel(c);
c.mat[k]=0;c.fire[k]=0;c.rust[k]=0;c.hp[k]=0;c.dirty=1;c.rd=1;c.dirtyPaint=1;
const i=k%c.w,j=(k/c.w)|0,p=toWorld(c,i+.5,j+.5);
if(cause==='fire'){if(DRIP[m]&&Math.random()<.5)dripFrom(c,k,m,true);else if(Math.random()<.15)addActive(p[0],p[1],cvel*.9+rand(-15,15),rand(-30,0),m===M.FUEL?M.FUEL:m===M.WOOD?M.WOOD:M.SCRAP,95,42,22,1.5,.2,c);else if(Math.random()<.5)spark(p[0],p[1],rand(-10,10),rand(-30,-10),rand(.6,1.4),[40,36,34],1,'ash')}
else if(cause==='rust')addActive(p[0],p[1],cvel*.95+rand(-8,8),rand(0,10),m,rgbv[0]*.8+30,rgbv[1]*.6+10,rgbv[2]*.5,0,.3,c);
else addActive(p[0],p[1],cvel*.9+(vx||0)+rand(-25,25),(vy||0)+rand(-45,-5),m,rgbv[0],rgbv[1],rgbv[2],wasHot?1.2:0,.06,c);
if(m===M.AMMO&&G.explQ.length<30&&Math.random()<.2)G.explQ.push({x:p[0],y:p[1],r:4.5,p:70,ign:.6,cause:'ammo cook-off'});
{const B=MATS[m].boom;if(B&&G.explQ.length<30&&Math.random()<B.ch)G.explQ.push({x:p[0],y:p[1],r:B.r,p:B.p,ign:.5,cause:MATNAME[m].toLowerCase()+' blew'})}
if(m===M.FUEL){for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const ii=i+dx,jj=j+dy;if(ii<0||jj<0||ii>=c.w||jj>=c.h)continue;const q=jj*c.w+ii;if(c.mat[q]&&FLAM[c.mat[q]]>0)c.fire[q]=Math.max(c.fire[q],.7)}}
}
function damageCircle(wx,wy,r,power,ign,vx,vy){
for(const c of G.all){
const dx=wx-c.cxw,dy=wy-c.cyw,R=c.rad+r;if(dx*dx+dy*dy>R*R)continue;
const l=toLocal(c,wx,wy);let hits=0;
for(let j=Math.max(0,Math.floor(l[1]-r));j<=Math.min(c.h-1,Math.ceil(l[1]+r));j++)
for(let i=Math.max(0,Math.floor(l[0]-r));i<=Math.min(c.w-1,Math.ceil(l[0]+r));i++){
const d=Math.hypot(i+.5-l[0],j+.5-l[1]);if(d>r)continue;const k=j*c.w+i,m=c.mat[k];if(!m)continue;
if(ign&&FLAM[m]>0&&Math.random()<ign*(1-d/r))c.fire[k]=Math.max(c.fire[k],.55);
{const ux=i+.5-l[0],uy=j+.5-l[1],rs=power*CFG.blastKick*(1-.6*d/r)/(d||1);hitPixel(c,k,power*(1-.7*d/r),(vx||0)*.4+(ux*c.co-uy*c.si)*rs,(vy||0)*.4+(ux*c.si+uy*c.co)*rs,'hit')}hits++;
}
if(hits){const I=Math.min(28,power*hits*.0011)/carMass(c),down=wy<c.cyw?1:-1;jolt(c,(wx<c.cxw?1:-1)*I*.35,down*I,clamp((wx-c.cxw)/c.w*2,-1,1)*down*I*.012)}
}
}
function igniteAt(wx,wy,chance){const h=carAtPoint(wx,wy);if(!h)return false;const[c,k]=h;if(FLAM[c.mat[k]]>0&&Math.random()<chance*Math.max(.15,FLAM[c.mat[k]])){c.fire[k]=Math.max(c.fire[k],.5);return true}return false}
