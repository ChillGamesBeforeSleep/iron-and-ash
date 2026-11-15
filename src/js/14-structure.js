/* ---------- structure: pieces cut off from the chassis fall away as rigid chunks ---------- */
function seedInit(c){
const w=c.w,n=c.n,seen=new Uint8Array(n);c.seed=new Uint8Array(n);c.dirty=0;c.chkT=0;
for(let k0=0;k0<n;k0++){if(!c.mat[k0]||seen[k0])continue;const st=[k0],comp=[];seen[k0]=1;let jmin=1e9,jmax=-1;
while(st.length){const k=st.pop();comp.push(k);const j=(k/w)|0,i=k-j*w;if(j<jmin)jmin=j;if(j>jmax)jmax=j;
for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const ii=i+dx,jj=j+dy;if(ii<0||jj<0||ii>=w||jj>=c.h)continue;const q=jj*w+ii;if(c.mat[q]&&!seen[q]){seen[q]=1;st.push(q)}}}
const cut=jmax-Math.max(1,Math.floor((jmax-jmin)*.18));for(const k of comp)if(((k/w)|0)>=cut)c.seed[k]=1}
}
const _seen=new Uint8Array(1<<15),_stack=new Int32Array(1<<15);
function detachCheck(c){
const w=c.w,h=c.h,n=c.n,mat=c.mat,seen=_seen,st=_stack;seen.fill(0,0,n);let sp=0;
for(let k=0;k<n;k++)if(mat[k]&&c.seed[k]){seen[k]=1;st[sp++]=k}
while(sp){const k=st[--sp],j=(k/w)|0,i=k-j*w;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const ii=i+dx,jj=j+dy;if(ii<0||jj<0||ii>=w||jj>=h)continue;const q=jj*w+ii;if(mat[q]&&!seen[q]){seen[q]=1;st[sp++]=q}}}
for(let k0=0;k0<n;k0++){if(!mat[k0]||seen[k0])continue;const comp=[];seen[k0]=1;st[sp++]=k0;
while(sp){const k=st[--sp],j=(k/w)|0,i=k-j*w;comp.push(k);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const ii=i+dx,jj=j+dy;if(ii<0||jj<0||ii>=w||jj>=h)continue;const q=jj*w+ii;if(mat[q]&&!seen[q]){seen[q]=1;st[sp++]=q}}}
spawnChunk(c,comp,0,0)}
}
function carVel(c){if(c.vkind||c.enemy)return c.vx||0;if(G.train&&G.train.cars.includes(c))return G.train.v;for(const g of G.loose)if(g.cars.includes(c))return g.v;return 0}
function carVelY(c){return c.vkind?(c.vy||0):0}
function spawnChunk(c,comp,ivx,ivy,matId){
if(!comp.length)return;
const m0=matId||c.mat[comp[0]]||M.STEEL,M0=MATS[m0]||MATS[M.STEEL];
if(m0===M.GLASS||comp.length<3){
for(const k of comp)destroyPixel(c,k,(ivx||0)*.5,(ivy||0)*.5,'hit');
return;
}
if((m0===M.FUEL||m0===M.OIL)&&c.vkind){
const vx0=carVel(c),vy0=carVelY(c);
for(const k of comp){
const i=k%c.w,j=(k/c.w)|0,p=toWorld(c,i+.5,j+.5),rgbv=carPaintRGB(c,k);
c.mat[k]=0;c.hp[k]=0;c.fire[k]=0;c.rust[k]=0;
addActive(p[0],p[1],vx0*.95+(ivx||0)*.3+rand(-18,18),vy0*.9+(ivy||0)*.3+rand(-18,10),m0,rgbv[0],rgbv[1],rgbv[2],1.8,.04,c);
}
c.dirtyPaint=1;return;
}
let i0=1e9,i1=-1,j0=1e9,j1=-1,burn=0,lost=0,massSum=0;const pxl=[];
for(const k of comp){const j=(k/c.w)|0,i=k-j*c.w;if(i<i0)i0=i;if(i>i1)i1=i;if(j<j0)j0=j;if(j>j1)j1=j;if(c.fire[k]>0)burn++;massSum+=PMASS[c.mat[k]]||1}
const bw=i1-i0+1,bh=j1-j0+1,cv=document.createElement('canvas');cv.width=bw;cv.height=bh;const x=cv.getContext('2d'),im=x.createImageData(bw,bh),src=c.img.data;
for(const k of comp){const j=(k/c.w)|0,i=k-j*c.w,q=((j-j0)*bw+(i-i0))*4;
if(src[k*4+3]){im.data[q]=src[k*4];im.data[q+1]=src[k*4+1];im.data[q+2]=src[k*4+2]}else{im.data[q]=c.col[k*3]*1.2;im.data[q+1]=c.col[k*3+1]*1.2;im.data[q+2]=c.col[k*3+2]*1.2}
im.data[q+3]=255;pxl.push([i-(i0+i1+1)/2+.5,j-(j0+j1+1)/2+.5,c.mat[k],im.data[q],im.data[q+1],im.data[q+2],i-i0,j-j0]);lost+=Math.max(0,c.hp[k]);c.mat[k]=0;c.hp[k]=0;c.fire[k]=0;c.rust[k]=0}
x.putImageData(im,0,0);c.dirtyPaint=1;
G.tel.dmg['breakaway']=(G.tel.dmg['breakaway']||0)+lost;
const p=toWorld(c,(i0+i1+1)/2,(j0+j1+1)/2),vx0=carVel(c),vy0=carVelY(c);
const rx=p[0]-(c.cxw||c.ax),ry=p[1]-(c.cyw||c.ay),om=c.vkind?-(c.fx||1)*(c.pr||0):(c.svr||0)*12;
const tvx=-ry*om,tvy=rx*om,pm=M0.mass||1,keepV=clamp(.88+.07*pm,.82,.99),invM=clamp(12/Math.sqrt(Math.max(4,massSum)),.25,1.25);
if(G.chunks.length>=CFG.maxChunks){const ri=G.chunks.findIndex(o=>o.rest);G.chunks.splice(ri>=0?ri:0,1)}
const isFlammable=FLAM[m0]>=.25,isBoom=m0===M.AMMO||m0===M.BATTERY,isSpark=!!M0.spark||m0===M.STEEL||m0===M.ARMOR;
G.chunks.push({cv,w:bw,h:bh,n:comp.length,mat:m0,pmass:pm,bounce:M0.bounce??.3,spark:isSpark,cookOff:isBoom?rand(.18,.65):0,mass:massSum,x:p[0],y:p[1],vx:vx0*keepV+tvx+(ivx||0)*invM+rand(-6,6)*invM,vy:vy0*keepV+tvy+(ivy||0)*invM+rand(-8,4)*invM,ang:c.ang,va:om+((ivx||0)*.008+rand(-1.2,1.2)/pm),age:0,rest:false,landed:false,life:CFG.chunkLife,burn:(burn||isFlammable&&c.vkind)?2.5+burn*.08:0,src:c,px:pxl});
sfx('break',Math.min(1,comp.length/60),p[0]);
}
function updateChunks(dt){
for(let i=G.chunks.length-1;i>=0;i--){const ch=G.chunks[i];ch.age+=dt;
const pm=ch.pmass||1,m0=ch.mat||M.STEEL;
if(ch.cookOff>0){
ch.cookOff-=dt;
if(Math.random()<dt*18)spark(ch.x+rand(-2,2),ch.y+rand(-2,2),ch.vx*.5+rand(-45,45),rand(-55,-10),.2,[255,220,120],1);
if(ch.cookOff<=0){
G.explQ.push({x:ch.x,y:ch.y,r:m0===M.BATTERY?4.5:6,p:m0===M.BATTERY?65:85,ign:.65,vx:ch.vx*.85,vy:ch.vy*.5,cause:MATNAME[m0].toLowerCase()+' cook-off'});
chunkToPixels(ch,75,1);G.chunks.splice(i,1);continue;
}
}
if(ch.burn>0){ch.burn-=dt;if(Math.random()<dt*16)spawn(ch.x+rand(-ch.w,ch.w)*.3,ch.y-ch.h*.3,ch.vx*.35+rand(-8,8),rand(-28,-10),rand(.6,1.4),Math.random()<.5?[255,140,50]:(MATS[m0]?.smoke||[80,74,70]),Math.random()<.5?1:2,Math.random()<.5?'ember':'smoke',.15)}
if(ch.rest){ch.life-=dt;if(ch.life<=0){if(ch.px&&ch.n<400)chunkToPixels(ch,0,0);G.chunks.splice(i,1)}continue}
const airDrag=clamp(.22/Math.max(.18,pm),.06,.85);
ch.vx+=((G.wind||0)*airDrag*.25-ch.vx*airDrag)*dt;
ch.vy+=(170*clamp(.55+.45*pm,.45,1.25)-ch.vy*airDrag*.6)*dt;
if(pm<.25)ch.va+=Math.sin(G.t*9+i)*3.5*dt;
ch.x+=ch.vx*dt;ch.y+=ch.vy*dt;ch.ang+=ch.va*dt;
const rad=Math.max(ch.w,ch.h)*.5,low=ch.y+(Math.abs(Math.cos(ch.ang))*ch.h+Math.abs(Math.sin(ch.ang))*ch.w)*.5,gy=surfaceY(ch.x);
if(ch.age>.35&&ch.vy>45){const hc=carAtPoint(ch.x,low);if(hc&&hc[0]!==ch.src){G.cause='falling wreckage';damageCircle(ch.x,low,2+rad*.35,24+ch.n*.6*pm,0,ch.vx*.5,ch.vy*.35);ch.vy*=-.25;ch.vx*=.78;ch.va*=-.6;sfx('thud',.7,ch.x)}}
if(low>=gy){const isp=Math.hypot(ch.vx,ch.vy);
if(pm>=1&&isp>48&&ch.n>=8)craterGround(ch.x,gy+1,clamp(rad*.55,2.5,6.5),isp*pm*.85,ch.vx,ch.vy,false);
if(ch.spark&&Math.abs(ch.vx)>18){for(let s=0;s<Math.min(6,Math.ceil(Math.abs(ch.vx)/22));s++)spark(ch.x+rand(-rad,rad)*.5,gy,ch.vx*.45+rand(-25,25),rand(-48,-8),rand(.15,.35),m0===M.WIRE||m0===M.BATTERY?[160,220,255]:[255,210,120],1)}
const shV=(ch.fragile?CFG.shatterV*.62:CFG.shatterV)*clamp(.75+.25*pm,.6,1.3),chV=(ch.fragile?CFG.chipV*.45:CFG.chipV)*clamp(.75+.25*pm,.6,1.2);
if(ch.px&&isp>shV&&ch.n<=CFG.shatterMax){chunkToPixels(ch,isp,1);G.chunks.splice(i,1);sfx('break',Math.min(1,ch.n/40),ch.x);continue}
if(ch.px&&isp>chV)chipChunk(ch,isp*(ch.fragile?1.35:1));
ch.y-=low-gy;if(!ch.landed){ch.landed=true;sfx('thud',Math.min(1,ch.n/50),ch.x);for(let k=0;k<Math.min(10,ch.n/8);k++)spawn(ch.x+rand(-rad,rad),gy,ch.vx*.55+rand(-18,18),rand(-42,-8),rand(.4,1),[110,100,88],1,'debris')}
const bnc=clamp((ch.bounce||.28)*.75,.12,.55);
ch.vy=-Math.abs(ch.vy)*bnc;ch.vx*=clamp(.82-.08/Math.max(.3,pm),.58,.84);ch.va=ch.va*.55+ch.vx*.022;
if(Math.abs(ch.vy)<12&&Math.abs(ch.vx)<5){ch.rest=true;ch.vx=ch.vy=ch.va=0;
if(ch.n>=CFG.wreckObstacle){G.obstacles.push({x:ch.x-ch.w/2,w:ch.w,h:ch.h,kind:'wreck',hp:ch.n*1.4,max:ch.n*1.4,cv:ch.cv,wreck:true});G.chunks.splice(i,1)}}}
}
}
function chunkToPixels(ch,sp,burst){
const co=Math.cos(ch.ang),si=Math.sin(ch.ang);
for(const q of ch.px){if(q[2]===0)continue;const wx=ch.x+q[0]*co-q[1]*si,wy=ch.y+q[0]*si+q[1]*co;
const rx=wx-ch.x,ry=wy-ch.y,tvx=-ry*(ch.va||0),tvy=rx*(ch.va||0);
addActive(wx,wy-1,burst?ch.vx*.9+tvx+rand(-.18,.18)*sp:rand(-4,4),burst?-Math.abs(ch.vy)*rand(.1,.32)+tvy-rand(4,22):rand(-10,0),q[2],q[3],q[4],q[5],ch.burn>0&&Math.random()<.4?1.5:0,0)}
}
function chipChunk(ch,sp){
const x=ch.cv.getContext('2d'),take=Math.floor(ch.px.length*Math.min(.25,(sp-CFG.chipV)/400+.06)),co=Math.cos(ch.ang),si=Math.sin(ch.ang);
for(let t=0;t<take;t++){const idx=(Math.random()*ch.px.length)|0,q=ch.px[idx];if(!q||q[2]===0)continue;
const wx=ch.x+q[0]*co-q[1]*si,wy=ch.y+q[0]*si+q[1]*co;addActive(wx,wy-1,ch.vx*.86+rand(-14,14),-Math.abs(ch.vy)*.22-rand(8,36),q[2],q[3],q[4],q[5],0,0);x.clearRect(q[6],q[7],1,1);q[2]=0;ch.n--}
}
function drawChunks(ctx,cx,cy){
for(const ch of G.chunks){const x=ch.x-cx,y=ch.y-cy;if(x<-60||x>S.W+60)continue;
ctx.save();ctx.globalAlpha=Math.min(1,ch.life/3);ctx.translate(x,y);ctx.rotate(ch.ang);ctx.drawImage(ch.cv,-ch.w/2,-ch.h/2);ctx.restore()}
}
function groupConnectedMaterials(c){
const w=c.w,h=c.h,n=c.n,mat=c.mat,seen=new Uint8Array(n),clusters=[];
for(let k0=0;k0<n;k0++){
const m0=mat[k0];if(!m0||seen[k0])continue;
const comp=[],st=[k0];seen[k0]=1;let cx=0,cy=0;
while(st.length){
const k=st.pop(),j=(k/w)|0,i=k-j*w;comp.push(k);cx+=i;cy+=j;
for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
const ii=i+dx,jj=j+dy;if(ii<0||jj<0||ii>=w||jj>=h)continue;
const q=jj*w+ii;if(!seen[q]&&mat[q]===m0){seen[q]=1;st.push(q)}
}
}
cx/=comp.length;cy/=comp.length;
clusters.push({m:m0,comp,cx,cy});
}
return clusters;
}
function shedConnectedMaterialCluster(c){
const clusters=groupConnectedMaterials(c);if(clusters.length<=1)return false;
clusters.sort((a,b)=>{
const da=Math.hypot(a.cx-c.w*.5,a.cy-c.h*.5)/(MATS[a.m]?.mass||1),db=Math.hypot(b.cx-c.w*.5,b.cy-c.h*.5)/(MATS[b.m]?.mass||1);
return db-a.comp.length*.08-(da-b.comp.length*.08);
});
const pickCl=clusters[0];if(!pickCl||pickCl.comp.length>c.n*.42)return false;
const dx=(pickCl.cx-c.w*.5)*(c.fx||1)*.4,dy=(pickCl.cy-c.h*.5)*.4;
spawnChunk(c,pickCl.comp,dx,dy,pickCl.m);
updateRegions(c);return true;
}
function killCar(c){
const vx0=carVel(c),vy0=carVelY(c),rc=c.regCount||8,air=(rc===3);
const clusters=groupConnectedMaterials(c);
for(const cl of clusters){
const comp=cl.comp,m0=cl.m;if(!comp.length)continue;
if(comp.length>38){
const midX=cl.cx;
const left=comp.filter(k=>(k%c.w)<=midX),right=comp.filter(k=>(k%c.w)>midX);
for(const sub of [left,right]){
if(!sub.length)continue;
const sx=(cl.cx-c.w*.5)*(c.fx||1)*.32+rand(-6,6),sy=(cl.cy-c.h*.5)*.32+rand(-8,4);
spawnChunk(c,sub,sx,sy,m0);
}
}else{
const sx=(cl.cx-c.w*.5)*(c.fx||1)*.35+rand(-6,6),sy=(cl.cy-c.h*.5)*.35+rand(-8,4);
spawnChunk(c,comp,sx,sy,m0);
}
}
G.shake+=air?4:6;
}
function checkDeaths(){
const cars=G.train.cars;
if(cars[0].integrity<CFG.carDeathAt){killCar(cars[0]);gameOver('The locomotive broke apart.');return}
for(let i=cars.length-1;i>=1;i--){if(cars[i].integrity<CFG.carDeathAt){
const c=cars[i];killCar(c);G.stats.lost++;const rear=cars.splice(i);rear.shift();
log(`${c.d.name} destroyed${rear.length?` — ${rear.length} car${rear.length>1?'s':''} uncoupled behind it`:''}`,'bad');
if(rear.length)G.loose.push({cars:rear,x:rear[0].x,v:G.train.v*.9});
}}
for(const g of G.loose){for(let i=g.cars.length-1;i>=0;i--)if(g.cars[i].integrity<CFG.carDeathAt){killCar(g.cars[i]);G.stats.lost++;const rest=g.cars.splice(i);rest.shift();if(rest.length)G.loose.push({cars:rest,x:rest[0].x,v:g.v})}}
G.loose=G.loose.filter(g=>g.cars.length);
if(G.res.crew<=0)gameOver('No crew left to drive the train.');
}
