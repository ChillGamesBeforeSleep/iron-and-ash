/* =====================================================================
   WORLD GENERATION
   ===================================================================== */
function genWorld(leg){
const seed=(G.seed+leg*1013)>>>0,rng=mulberry32(seed);
const sky=CFG.skyExtra||0,baseT=270+sky,LEN=Math.min(9000,CFG.legLen+(leg-1)*CFG.legGrow),W=LEN+900,H=460+sky;
const raw=new Float32Array(W),o1=rng()*100,o2=rng()*100,o3=rng()*100,amp=1+Math.min(.6,(leg-1)*.12);
for(let x=0;x<W;x++){let y=baseT+46*amp*vnoise(x/520+o1,3)+18*amp*vnoise(x/170+o2,5)+5*vnoise(x/55+o3,7);
y=lerp(baseT,y,smooth(600,1000,x));y=lerp(y,baseT,smooth(LEN-500,LEN-150,x));raw[x]=y}
const pre=new Float64Array(W+1);for(let x=0;x<W;x++)pre[x+1]=pre[x]+raw[x];
const Tt=new Float32Array(W),R=40;
for(let x=0;x<W;x++){const a=Math.max(0,x-R),b=Math.min(W,x+R+1);Tt[x]=(pre[b]-pre[a])/(b-a)}
for(let p=0;p<2;p++){for(let x=1;x<W;x++)Tt[x]=clamp(Tt[x],Tt[x-1]-CFG.maxSlope,Tt[x-1]+CFG.maxSlope);for(let x=W-2;x>=0;x--)Tt[x]=clamp(Tt[x],Tt[x+1]-CFG.maxSlope,Tt[x+1]+CFG.maxSlope)}
const segs=[{x0:0,x1:1100,type:'waste'}];let x=1100,prev='waste';
const pool=leg===1?['waste','city','canyon','acid','city','canyon']:['waste','city','canyon','acid','lava','lava','city','canyon'];
while(x<LEN-350){let t;do t=pool[(rng()*pool.length)|0];while(t===prev);const len=650+rng()*600;segs.push({x0:x,x1:Math.min(LEN-350,x+len),type:t});x+=len;prev=t}
segs.push({x0:x,x1:1e9,type:'waste'});
const world={seed,LEN,W,H,T:Tt,segs,sites:[]};
G.world=world;
for(let sx=760;sx<LEN-320;sx+=420+rng()*320){
const b=biomeAt(sx).type;const wts={ruin:30,depot:18,armory:12,camp:10,yard:5+leg*2,bunker:4+leg,tower:9,stranded:6+leg*2};
if(b==='city'){wts.ruin+=20;wts.armory+=6}if(b==='lava'){wts.depot+=10;wts.tower+=6}if(b==='canyon')wts.bunker+=5;
let tot=0;for(const k in wts)tot+=wts[k];let r=rng()*tot,type='ruin';for(const k in wts){r-=wts[k];if(r<=0){type=k;break}}
const D=SITES[type],st={x:sx,type,w:0,stock:D.stock,stock0:D.stock,cache:{},uses:D.stock>0?1:0};
if(type==='camp')st.people=1+((rng()*3)|0);
if(type==='yard')st.wagon=['tender','passenger','armored','cargo','crane','crane','water'][(rng()*7)|0];
if(type==='tower')st.water=CFG.towerWater;
if(type==='stranded'){st.people=1+((rng()*3)|0);st.hurt=0;for(let q=0;q<st.people;q++)if(rng()<CFG.strandedChance)st.hurt++}
world.sites.push(st);
}
G.mapSpec=G.mapSpec||Array.from({length:CFG.mapTiles},(_,i)=>({slot:i,biome:'auto',site:'auto',buried:'auto',turret:'auto',mob:'auto',png:null,img:null,name:''}));
world.tiles=[];const tileW=Math.ceil(LEN/CFG.mapTiles);
for(let ti=0;ti<CFG.mapTiles;ti++){
const tx0=ti*tileW,tx1=Math.min(LEN,(ti+1)*tileW),ms=G.mapSpec[ti]||{};
if(ms.biome&&ms.biome!=='auto'){segs.push({x0:tx0,x1:tx1,type:ms.biome})}
const tb=ms.biome&&ms.biome!=='auto'?ms.biome:biomeAt((tx0+tx1)/2).type;
world.tiles.push({index:ti,x0:tx0,x1:tx1,w:tx1-tx0,biome:tb,spec:ms});
if(ms.site&&ms.site!=='auto'&&ms.site!=='none'){
const sx=Math.round((tx0+tx1)/2),D=SITES[ms.site]||SITES.ruin;
world.sites=world.sites.filter(s=>Math.abs(s.x-sx)>90);
world.sites.push({x:sx,type:ms.site,w:0,stock:D.stock,stock0:D.stock,cache:{},uses:D.stock>0?1:0,people:ms.site==='camp'||ms.site==='stranded'?2:0,hurt:0,water:ms.site==='tower'?CFG.towerWater:0,wagon:ms.site==='yard'?'driller':null});
}else if(ms.site==='none'){world.sites=world.sites.filter(s=>s.x<tx0||s.x>=tx1)}
}
world.buried=[];world.subTurrets=[];
for(let ti=1;ti<CFG.mapTiles-1;ti++){
const tile=world.tiles[ti],ms=tile.spec||{};
const forceB=ms.buried&&ms.buried!=='auto'?ms.buried:null;
if(forceB==='none')continue;
if(forceB||ti>=2&&rng()<.78){
const bx=Math.round(tile.x0+40+rng()*Math.max(40,tile.w-80)),dep=16+Math.round(rng()*34),by=Math.round(Tt[bx]+dep);
const roll=rng(),kind=forceB||(roll<.24?'chest':roll<.50?'bunker':roll<.70?'vein':roll<.84?'fuel':'gas');
const bObj={id:ti+1,tile:ti,x:bx,y:by,dep,kind,looted:false,r:BURIED[kind].r,name:BURIED[kind].name};
world.buried.push(bObj);
const wantTurret=ms.turret==='yes'||(ms.turret!=='no'&&kind==='bunker'&&rng()<.75);
if(wantTurret){
world.subTurrets.push({id:ti+1,tile:ti,x:bx+(rng()<.5?-16:16),y:by-2,hp:55,max:55,awake:false,cool:1.1,alive:true,bunker:bObj});
}
if(kind!=='gas'&&ms.buried!=='gas'&&rng()<.42){
const gx=clamp(bx+(rng()<.5?-26:26),tile.x0+20,tile.x1-20),gy=Math.round(Tt[gx]+14+rng()*26);
world.buried.push({id:100+ti,tile:ti,x:gx,y:gy,dep:gy-Math.round(Tt[gx]),kind:'gas',looted:false,r:10+Math.round(rng()*4),name:BURIED.gas.name});
}
}
}
G.obstacles=[];const nObs=Math.floor(LEN/1000*(0.8+G.diff*.6));
for(let i=0;i<nObs;i++){const ox=1300+rng()*(LEN-1700);if(world.sites.some(s=>Math.abs(s.x-ox)<60))continue;addObstacle(ox,rng()<.5?'rock':'wreck',rng)}
renderWorldCanvas(world,rng);pxInit(world);buildStructures(world,rng);
buildParallax();
return world;
}
function addObstacle(x,kind,rng){
rng=rng||Math.random;const w=kind==='rock'?12+((rng()*8)|0):16+((rng()*7)|0),h=kind==='rock'?7+((rng()*4)|0):8;
const cv=document.createElement('canvas');cv.width=w;cv.height=h+1;const c=cv.getContext('2d');
for(let i=0;i<w;i++){const top=kind==='rock'?Math.round(h*(1-Math.pow(Math.abs(i/(w-1)*2-1),1.55))*(.75+rng()*.25)):(i<2||i>w-3?h-3:(i%4===0?0:2));
for(let j=h-top;j<=h;j++){const col=kind==='rock'?brut([88,78,68],i+x,j,.35):brut(rng()<.45?[128,58,36]:[68,64,58],i+x,j,.55,4,-1);c.fillStyle=rgb(col);c.fillRect(i,j,1,1)}}
G.obstacles.push({x,w,h,kind,hp:kind==='rock'?140:180,max:kind==='rock'?140:180,cv});
}
function groundLayerAt(x,y){
const t=Math.round(G.world.T[clamp(x|0,0,G.world.W-1)]),dep=y-t;
if(dep<0)return null;
if(dep<2)return{m:M.STEEL,r:168,g:162,b:150,rail:true};
if(dep<5)return(x%6<3)?{m:M.WOOD,r:86,g:58,b:36}:{m:M.CONCRETE,r:108,g:102,b:92};
if(dep<11)return{m:M.CONCRETE,r:88,g:82,b:74};
if(hash2(x>>1,y>>1)<.08)return{m:M.STONE,r:112,g:104,b:92};
return{m:M.STONE,r:64,g:54,b:44};
}
function renderWorldCanvas(w,rng){
const cv=document.createElement('canvas');cv.width=w.W;cv.height=w.H;const ctx=cv.getContext('2d');
const img=ctx.createImageData(w.W,w.H),d=img.data;
const tint={waste:[56,48,40],acid:[44,54,40],canyon:[66,52,40],lava:[36,30,30],city:[54,54,56]};
for(let x=0;x<w.W;x++){
const t=Math.round(w.T[x]),b=biomeAt(x).type,base=tint[b],wobble=vnoise(x/60,41)*3;
if(b==='canyon'){const seg=biomeAt(x),edge=Math.min(x-seg.x0,seg.x1-x),fade=smooth(0,120,edge);
const top=t-(40+70*fade*(.6+.4*(vnoise(x/70,43)*.5+.5)));
for(let y=Math.max(0,Math.floor(top));y<t;y++){const q=(y*w.W+x)*4,k=(.55+.25*vnoise(x/6+y/40,44))*(.8+.2*Math.sin(y*.5+x*.05))*(y-top<2?1.5:1);d[q]=44*k;d[q+1]=36*k;d[q+2]=31*k;d[q+3]=255}}
for(let y=t+2;y<w.H;y++){
const q=(y*w.W+x)*4,dep=y-(t+2);let r,g,bb;const n=.85+hash2(x,y)*.3;
if(dep<3){const tie=(x%6<3);r=(tie?84:106)*n;g=(tie?58:100)*n;bb=(tie?36:90)*n}
else if(dep<9){const k=(1-dep*.035)*n*.88,br=((x+dep)%9<2)?1.12:1;r=86*k*br;g=78*k*br;bb=68*k*br}
else{const k=(.72+.28*Math.sin(y*.33+wobble))*(1-Math.min(.62,dep/230))*n*.58;r=base[0]*k;g=base[1]*k;bb=base[2]*k;
if(hash2(x>>1,y>>1)<.022){r=118*n;g=108*n;bb=94*n}
if(b==='lava'&&dep>5&&Math.abs(vnoise(x/14+Math.sin(y/9)*2,11))<.05){const gl=1-dep/200;r=lerp(r,235,gl);g=lerp(g,92,gl);bb=lerp(bb,30,gl)}
if(b==='acid'&&dep>5&&hash2(x,y*7)<.01){r=80;g=140;bb=70}}
d[q]=r;d[q+1]=g;d[q+2]=bb;d[q+3]=255}
if(x%6<3){for(const yy of [t+1,t+2]){const q=(yy*w.W+x)*4;d[q]=76;d[q+1]=54;d[q+2]=36;d[q+3]=255}}
let q=(t*w.W+x)*4;d[q]=176;d[q+1]=170;d[q+2]=158;d[q+3]=255;q=((t+1)*w.W+x)*4;d[q]=112;d[q+1]=106;d[q+2]=98;d[q+3]=255;
}
ctx.putImageData(img,0,0);
for(const ti of w.tiles||[]){
if(ti.spec&&ti.spec.img){
const im=idToCanvas(ti.spec.img),gy=Math.round(w.T[Math.round((ti.x0+ti.x1)/2)])-im.height+24;
ctx.drawImage(im,ti.x0,gy,Math.min(ti.w,im.width),im.height);
}
}
for(const bu of w.buried||[]){
if(bu.kind==='bunker'){
ctx.fillStyle='rgb(58,56,52)';ctx.fillRect(bu.x-11,bu.y-7,22,14);
ctx.fillStyle='rgb(88,82,74)';ctx.fillRect(bu.x-9,bu.y-5,18,10);
ctx.fillStyle='rgb(168,128,44)';ctx.fillRect(bu.x-3,bu.y-3,6,6);
}else if(bu.kind==='chest'){
ctx.fillStyle='rgb(112,74,38)';ctx.fillRect(bu.x-5,bu.y-4,10,8);
ctx.fillStyle='rgb(212,172,58)';ctx.fillRect(bu.x-5,bu.y-1,10,2);ctx.fillRect(bu.x-1,bu.y-2,2,4);
}else if(bu.kind==='vein'){
ctx.fillStyle='rgb(146,84,48)';for(let k=0;k<18;k++)ctx.fillRect(bu.x+Math.round(Math.cos(k)*6),bu.y+Math.round(Math.sin(k*1.7)*5),3,3);
}else if(bu.kind==='gas'){
ctx.fillStyle='rgba(86,148,72,.55)';
for(let dy=-bu.r;dy<=bu.r;dy++)for(let dx=-bu.r;dx<=bu.r;dx++)if(dx*dx+dy*dy<=bu.r*bu.r*(.7+.3*hash2(bu.x+dx,bu.y+dy)))ctx.fillRect(bu.x+dx,bu.y+dy,1,1);
}else{
ctx.fillStyle='rgb(184,124,34)';ctx.fillRect(bu.x-6,bu.y-4,12,8);
}
}
const sx=w.LEN,gy=Math.round(w.T[sx]);
ctx.fillStyle='rgb(70,68,64)';ctx.fillRect(sx-30,gy-6,190,6);
ctx.fillStyle='rgb(92,84,74)';ctx.fillRect(sx+10,gy-46,90,40);
ctx.fillStyle='rgb(54,50,48)';ctx.fillRect(sx+4,gy-52,102,7);
ctx.fillStyle='rgb(30,28,28)';for(let i=0;i<4;i++)ctx.fillRect(sx+18+i*20,gy-36,9,12);
ctx.fillStyle='rgb(255,226,150)';ctx.fillRect(sx+52,gy-62,6,6);ctx.fillRect(sx-24,gy-30,3,3);
ctx.fillStyle='rgb(80,78,74)';ctx.fillRect(sx-23,gy-27,1,21);
ctx.fillStyle='rgb(170,52,40)';ctx.fillRect(sx+200,gy-10,6,10);
w.canvas=cv;w.ctx=ctx;
}
function drawSite(ctx,s,rng){
const x=Math.round(s.x),gy=Math.round(G.world.T[x])+1;const f=(c)=>{ctx.fillStyle=rgb(c)};
if(s.type==='ruin'){const bw=42+((rng()*26)|0),bh=58+((rng()*36)|0),bite=rng()<.5?1:-1;
for(let i=0;i<bw;i++){const u=i/bw,side=bite>0?u:1-u;let top=bh-(hash2(i>>1,x)<.4?rng()*11:0)-(side>.6?(side-.6)*bh*1.45:0);top=Math.max(9,top);
for(let yy=0;yy<top;yy++){const fl=(yy%12)<2?.68:1;f(brut([76*fl,70*fl,62*fl],x+i,gy-yy,.48,8,-1));ctx.fillRect(x-bw/2+i,gy-yy-1,1,1)}}
f([16,16,18]);for(let yy=8;yy<bh-8;yy+=12)for(let xx=4;xx<bw-4;xx+=7)if(rng()<.78){const u=xx/bw,side=bite>0?u:1-u;if(bh-(side>.6?(side-.6)*bh*1.45:0)>yy+8)ctx.fillRect(x-bw/2+xx,gy-yy-6,3,5)}
f([118,62,40]);for(let k=0;k<6;k++){const rx=x-bw/2+3+rng()*(bw-6);ctx.fillRect(rx,gy-bh-4+rng()*7,1,5)}}
else if(s.type==='depot'){for(let k=0;k<3;k++){const cx=x-31+k*21,h=38+(k%2)*12;for(let i=0;i<18;i++){const sh2=.5+.62*Math.sin(Math.PI*i/17);for(let yy=0;yy<h;yy++){f(brut([96*sh2,82*sh2,62*sh2],cx+i,gy-yy,.55,0,12));ctx.fillRect(cx+i,gy-yy-1,1,1)}}
f([168,124,42]);ctx.fillRect(cx,gy-h+7,18,2);f([54,50,46]);for(let yy=4;yy<h;yy+=3)ctx.fillRect(cx+15,gy-yy,2,1)}
f([48,44,40]);ctx.fillRect(x-33,gy-10,66,2);ctx.fillRect(x-33,gy-24,66,1);}
else if(s.type==='armory'){for(let yy=0;yy<35;yy++)for(let i=-25;i<=25;i++){f(brut([72,72,64],x+i,gy-yy,.45,10,8));ctx.fillRect(x+i,gy-yy-1,1,1)}
f([40,40,36]);ctx.fillRect(x-28,gy-39,56,5);f([14,14,14]);ctx.fillRect(x-7,gy-18,14,18);ctx.fillRect(x-19,gy-28,6,3);ctx.fillRect(x+13,gy-28,6,3);
f([92,88,52]);for(const[cx2,cy2]of[[26,6],[34,6],[29,12],[26,18],[34,12]])ctx.fillRect(x+cx2,gy-cy2,8,6);f([118,58,38]);for(let i=0;i<4;i++)ctx.fillRect(x-36+i*3,gy-5-(i%2)*2,4,5);}
else if(s.type==='camp'){for(const ox of [-26,-2]){for(let i=0;i<24;i++){const hh=Math.round(19-Math.abs(i-12)*1.5);for(let yy=0;yy<hh;yy++){f(brut([98+(ox>0?8:0),82,60],x+ox+i,gy-yy,.4,6,-1));ctx.fillRect(x+ox+i,gy-yy-1,1,1)}}}
f([82,64,44]);for(let yy=0;yy<46;yy++){ctx.fillRect(x+28,gy-yy,1,1);ctx.fillRect(x+36,gy-yy,1,1)}for(let yy=10;yy<46;yy+=9)ctx.fillRect(x+28,gy-yy,9,1);f([96,74,50]);ctx.fillRect(x+26,gy-50,13,4);
f([255,140,50]);ctx.fillRect(x+16,gy-3,3,3);f([48,40,32]);ctx.fillRect(x+14,gy-1,7,1);}
else if(s.type==='yard'){f([52,48,44]);ctx.fillRect(x-36,gy-2,72,2);f([68,62,56]);for(let yy=0;yy<54;yy++){ctx.fillRect(x-32,gy-yy,2,1);ctx.fillRect(x+30,gy-yy,2,1)}ctx.fillRect(x-34,gy-56,68,3);f([144,114,46]);ctx.fillRect(x-4,gy-53,6,4);f([34,34,34]);ctx.fillRect(x,gy-49,1,10);
for(let i=0;i<50;i++){const sh2=.6+.4*Math.sin(i*.6);for(let yy=6;yy<24;yy++){f(brut([106*sh2,58*sh2,40*sh2],x-25+i,gy-yy,.55,8,-1));ctx.fillRect(x-25+i,gy-yy,1,1)}}f([26,26,26]);for(const wx of [-18,-8,12,22]){ctx.beginPath();ctx.arc(x+wx,gy-4,3.5,0,7);ctx.fill()}}
else if(s.type==='tower'){const tx=x+18;f([56,52,48]);for(const lx of [-10,-4,4,10])for(let yy=0;yy<64;yy++)ctx.fillRect(Math.round(tx+lx*(1-yy/160)),gy-yy,1,1);
for(let yy=10;yy<64;yy+=11)ctx.fillRect(tx-10,gy-yy,21,1);
for(let i=0;i<28;i++){const sh2=.55+.55*Math.sin(Math.PI*i/27);for(let yy=64;yy<86;yy++){f(brut([58*sh2,82*sh2,108*sh2],tx-14+i,gy-yy,.52,7,-1));ctx.fillRect(tx-14+i,gy-yy,1,1)}}
f([40,42,44]);ctx.fillRect(tx-15,gy-88,30,2);ctx.fillRect(tx-15,gy-65,30,1);
f([78,74,68]);ctx.fillRect(x,gy-71,tx-14-x,2);ctx.fillRect(x-1,gy-71,2,5);s.spout=[x,gy-65];}
else if(s.type==='stranded'){f([84,64,44]);ctx.fillRect(x-14,gy-2,10,2);ctx.fillRect(x+6,gy-3,12,3);f([62,52,40]);for(let i=0;i<9;i++)ctx.fillRect(x+20+i,gy-Math.round(7-Math.abs(i-4)*1.5),1,Math.round(7-Math.abs(i-4)*1.5));
f([255,140,50]);ctx.fillRect(x-1,gy-3,3,3);f([50,42,34]);ctx.fillRect(x-3,gy-1,7,1);f([104,96,84]);ctx.fillRect(x-22,gy-18,1,18);f([184,48,34]);ctx.fillRect(x-21,gy-18,6,4);}
else if(s.type==='bunker'){for(let i=0;i<66;i++){const hh=Math.round(26*Math.sin(Math.PI*i/65));for(let yy=0;yy<hh;yy++){const fl=(yy%6)<1?.75:1;f(brut([66*fl,60*fl,52*fl],x-33+i,gy-yy,.48,9,-1));ctx.fillRect(x-33+i,gy-yy-1,1,1)}}
f([82,84,76]);ctx.fillRect(x-8,gy-18,16,16);f([12,12,12]);ctx.fillRect(x-5,gy-15,10,13);f([16,16,16]);ctx.fillRect(x-24,gy-12,8,2);ctx.fillRect(x+16,gy-12,8,2);
f([68,66,62]);ctx.fillRect(x+14,gy-58,1,36);ctx.fillRect(x+11,gy-50,7,1);f([255,54,36]);ctx.fillRect(x+13,gy-60,3,2);}
}
const LAYER_OFF=100,LAYER_H=920,LAYER_PAD=1200;
function buildParallax(){
const w=G.world;if(!w)return;const sky=CFG.skyExtra||0;
const FW=Math.ceil(w.W*.18+LAYER_PAD),far=document.createElement('canvas');far.width=FW;far.height=LAYER_H;
const fc=far.getContext('2d'),fi=fc.createImageData(FW,LAYER_H),d=fi.data,base=300+sky+LAYER_OFF;
for(let x=0;x<FW;x++){const top=base-(28+44*(vnoise(x/120,21)*.5+.5)+14*vnoise(x/37,22));
for(let y=Math.max(0,Math.floor(top));y<LAYER_H;y++){const k=(1-Math.min(1,(y-top)/260)*.5)*(.85+hash2(x,y)*.15)*(y-top<1.5?1.7:1),q=(y*FW+x)*4;d[q]=40*k;d[q+1]=36*k;d[q+2]=42*k;d[q+3]=255}}
fc.putImageData(fi,0,0);w.far=far;
const MW=Math.ceil(w.W*.42+LAYER_PAD),mid=document.createElement('canvas');mid.width=MW;mid.height=LAYER_H;const mc=mid.getContext('2d');
const r=mulberry32(w.seed+5);let x=0;const by=318+sky+LAYER_OFF;
while(x<MW){const bw=8+((r()*26)|0),bt=biomeAt(x/.42).type,tall=bt==='city'?1.7:bt==='canyon'?.35:bt==='lava'?.45:1,bh=(18+r()*58)*tall;
for(let i=0;i<bw;i++){const top=by-bh+(hash2(x+i,9)<.25?r()*10:0);mc.fillStyle=rgb(sh([46,46,52],i===0?1.35:1));mc.fillRect(x+i,top,1,LAYER_H-top)}
for(let yy=by-bh+5;yy<by-3;yy+=5)for(let xx=2;xx<bw-2;xx+=4){mc.fillStyle=r()<.05?'rgb(176,134,74)':'rgb(24,24,30)';mc.fillRect(x+xx,yy,2,2)}
if(r()<.12){mc.fillStyle='rgb(60,58,60)';const px=x+bw+3;for(let yy=0;yy<80;yy+=2)mc.fillRect(px+((yy/2)%2),by-80+yy,1,1);mc.fillRect(px-3,by-72,8,1)}
x+=bw+((r()*10)|0)}
w.mid=mid;
}
