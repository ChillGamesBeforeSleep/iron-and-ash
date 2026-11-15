/* =====================================================================
   SYMBOL DEBRIS — every flying part is drawn as its own character on the
   ASCII grid, so broken material is readable as symbols tearing off the unit
   ===================================================================== */
const fxCv=document.getElementById('fx'),fxx=fxCv.getContext('2d');
const SYM={};MATS.forEach((m,i)=>{if(m.sym)SYM[i]=m.sym});
let symCount=0;
function bright(r,g,b){const m=Math.max(r,g,b,1),k=Math.max(1,215/m);return qcol(Math.min(255,r*k)|0,Math.min(255,g*k)|0,Math.min(255,b*k)|0)}
const GLYPHS=new Map();
function glyphImg(chr,col,cw,ch){
const key=chr+col+cw+'x'+ch;let g=GLYPHS.get(key);if(g)return g;
if(GLYPHS.size>3000)GLYPHS.clear();
g=document.createElement('canvas');g.width=Math.max(1,Math.ceil(cw));g.height=Math.max(1,Math.ceil(ch));const x=g.getContext('2d');
x.fillStyle='rgb(5,5,6)';x.fillRect(0,0,g.width,g.height);x.font=fxx.font;x.textAlign='center';x.textBaseline='middle';x.fillStyle=col;x.fillText(chr,cw/2,ch/2+ch*.06);
GLYPHS.set(key,g);return g}
function qcol(r,g,b){return`rgb(${(r>>4)<<4},${(g>>4)<<4},${(b>>4)<<4})`}
function drawSymbols(){
fxx.clearRect(0,0,fxCv.width,fxCv.height);symCount=0;
if(G.raw||!gl||!CFG.symbols||G.state==='title')return;
const cp=CFG.cellPresets[G.cell],cw=cp[0]*dpr,ch=cp[1]*dpr,kx=view.width/S.W,ky=view.height/S.H,cx=G.rcx||0,cy=G.rcy||0;
const cols=Math.ceil(view.width/cw),rows=Math.ceil(view.height/ch),seen=new Uint8Array(cols*rows);
fxx.font=`700 ${Math.max(5,Math.round(ch*.95))}px "IBM Plex Mono",ui-monospace,monospace`;fxx.textAlign='center';fxx.textBaseline='middle';
const put=(wx,wy,chr,col)=>{if(symCount>=CFG.maxSymbols*(G.q||1))return;const X=Math.floor((wx-cx)*kx/cw),Y=Math.floor((wy-cy)*ky/ch);if(X<0||Y<0||X>=cols||Y>=rows)return;const k=Y*cols+X;if(seen[k])return;seen[k]=1;symCount++;
const g=glyphImg(chr,col,cw,ch);fxx.drawImage(g,X*cw,Y*ch)};
for(const p of PX.act){
const sp=Math.hypot(p.vx,p.vy);let chr;
if(p.hot>0)chr='*';else if(sp>CFG.streakSpeed){const ax=Math.abs(p.vx),ay=Math.abs(p.vy);chr=ax>ay*2.2?'-':ay>ax*2.2?'|':(p.vx*p.vy>0?'\\':'/')}else chr=SYM[p.m]||'#';
const col=p.hot>0?'rgb(255,208,64)':(p.bc||(p.bc=bright(p.r,p.g,p.b)));
put(p.x,p.y,chr,col)}
for(const q of G.parts){if(q.kind==='spark')put(q.x,q.y,"'",q.cs);else if(q.kind==='ember')put(q.x,q.y,'*',q.cs);else if(q.kind==='twinkle')put(q.x,q.y,'+',q.cs);else if(q.kind==='arc')put(q.x,q.y,'~',q.cs);else if(q.kind==='debris'&&q.life>.4)put(q.x,q.y,'.',q.cs)}
if(G.exp)for(const m of G.exp.members){if(!m.alive||m.state==='in'||m.state==='work')continue;const k=bodyInt(m);put(m.x+.5,groundY(m.x)-5,'i',m.hurt?'rgb(230,70,55)':k<.99?'rgb(240,170,120)':'rgb(240,232,210)')}
for(const m of G.strays||[]){if(!m.alive)continue;const k=bodyInt(m),y=baseY(m);put(m.x+.5,y-5,'i',m.hurt?'rgb(230,70,55)':k<.99?'rgb(240,170,120)':'rgb(240,232,210)');if(m.state==='chute'&&m.chT>.45)put(m.x+.5,y-15,'^','rgb(230,140,70)')}
if(G.crew)for(const m of G.crew)if(m.where==='deck'&&insideVisible(m.x+.5,m.gy-5)){const k=bodyInt(m);put(m.x+.5,m.gy-5,'i',m.hurt?'rgb(230,70,55)':k<.99?'rgb(240,170,120)':m.task&&m.task.kind==='fire'?'rgb(140,190,255)':'rgb(240,232,210)')}
for(const w of G.salvage||[])put(w.x+.5,groundY(w.x)-2,w.what==='raider corpse'?'x':'%',w.what==='raider corpse'?'rgb(200,90,70)':'rgb(170,170,176)');
if(G.boarders)for(const b2 of G.boarders)put(b2.x+.5,groundY(b2.x)-5,'i',b2.hurt?'rgb(230,70,55)':'rgb(200,240,190)');
if(G.world)for(const s of G.world.sites)if(s.type==='stranded'&&s.people>0)for(let i=0;i<s.people;i++){const px=s.x-8+i*7;put(px+.5,groundY(px)-5,i>=s.people-s.hurt?'i':(Math.sin(G.t*6+i)>0?'Y':'i'),i>=s.people-s.hurt?'rgb(230,70,55)':'rgb(200,240,190)')}
for(const sh of G.shots)if(sh.kind==='shell')put(sh.x,sh.y,'o','rgb(255,236,190)');else if(sh.kind==='seeker')put(sh.x,sh.y,'*','rgb(255,90,190)');else if(sh.kind==='rpg')put(sh.x,sh.y,'=','rgb(255,160,70)');else if(sh.kind==='grenade')put(sh.x,sh.y,'g','rgb(150,220,110)');else if(sh.kind==='molotov')put(sh.x,sh.y,'m','rgb(255,130,50)');else if(sh.kind==='bullet')put(sh.x,sh.y,'-','rgb(255,90,60)');else if(sh.kind==='pbullet')put(sh.x,sh.y,sh.spear?'/':sh.sniper?'═':'-','rgb(240,232,210)');
if(G.raiders)for(const r of G.raiders)if(r.alive)put(r.x+.5,groundY(r.x)-5,r.flee?'r':'R',r.flee?'rgb(200,120,90)':'rgb(255,80,55)');
}
const WHEEL_SPOKE=[184,176,160],WHEEL_GAP=[30,28,28],WHEEL_TIRE=[100,96,90],CREW=[214,204,182];
function liquidLevels(c){
if(G.state!=='play'&&G.state!=='leg'||!G.caps||!G.res)return null;
if(!c.liqRows){c.liqRows=[];for(let r=0;r<8;r++){let lo=1e9,hi=-1;const want=c.d.roles[r]==='WATER'?M.WATER:c.d.roles[r]==='FUEL'?M.FUEL:0;if(want){for(let k=0;k<c.n;k++)if(c.reg[k]===r&&c.omat[k]===want){const j=(k/c.w)|0;if(j<lo)lo=j;if(j>hi)hi=j}}c.liqRows.push(hi>=0?[lo,hi]:null)}}
const fw=G.caps.water>0?clamp((G.res.water||0)/G.caps.water,0,1):0,ff=G.caps.fuel>0?clamp(G.res.fuel/G.caps.fuel,0,1):0,out=[];let any=false;
for(let r=0;r<8;r++){const R=c.liqRows[r];if(!R){out.push(0);continue}const f=c.d.roles[r]==='WATER'?fw:ff;out.push(R[1]+1-Math.round(f*(R[1]-R[0]+1)));any=true}
return any?out:null}
/* how strongly each material catches light on an exposed top edge (v3.41). Metal and glass shine, cloth and rubber do not. */
const SPEC=MATS.map(m=>({STEEL:.34,ARMOR:.26,ALU:.46,GLASS:.5,SCRAP:.22,WIRE:.3,BATTERY:.2,WOOD:.14,CONCRETE:.12,STONE:.12,COAL:.05,RUBBER:.04,CLOTH:.06,KEVLAR:.08,LEAF:.08,WHEEL:0,LAMP:0,GLOW:0}[m.key]??.14));
function paintCar(c){
const lv=liquidLevels(c),lsig=lv?lv.join(','):'';
const anim=c.fires>0||Math.abs(carVel(c))>.5||c.d.spin||(c.wet&&c.wetT>G.t);
if(!c.dirtyPaint&&!anim&&c._liqSig===lsig&&((G.frameN+c.id)&7)!==0)return;
c.dirtyPaint=0;c._liqSig=lsig;
const d=c.img.data,w=c.w,t=G.t;
for(let k=0;k<c.n;k++){const q=k*4,m=c.mat[k];if(!m){d[q+3]=0;continue}
let r=c.col[k*3],g=c.col[k*3+1],b=c.col[k*3+2];
if(m===M.WHEEL&&c.custom){const id=c.wid[k];if(id>=0){const wh=c.wheels[id],i=k%w,j=(k/w)|0,dx=i+.5-wh.cx,dy=j+.5-wh.cy,co=Math.cos(c.phase),si=Math.sin(c.phase),sx=Math.floor(wh.cx+dx*co+dy*si),sy=Math.floor(wh.cy-dx*si+dy*co);
if(sx>=0&&sy>=0&&sx<w&&sy<c.h){const q=sy*w+sx;if(c.wid[q]===id){r=c.col[q*3];g=c.col[q*3+1];b=c.col[q*3+2]}}}}
else if(m===M.WHEEL&&c.wheels[c.wid[k]]){/* v3.40: WHEEL pixels painted as plain rects (driller tracks) have no wheel id — they keep their own colour instead of crashing the frame */const wh=c.wheels[c.wid[k]],i=k%w,j=(k/w)|0,dx=i+.5-wh.cx,dy=j+.5-wh.cy,dd=Math.hypot(dx,dy);
let col;if(dd>wh.r-1.25)col=WHEEL_TIRE;else if(dd<1.2)col=WHEEL_SPOKE;else{const a=Math.atan2(dy,dx)-c.phase;col=Math.cos(a*(isLoco(c)?4:3))>.55?WHEEL_SPOKE:WHEEL_GAP;
if(isLoco(c)&&dd>wh.r*.45&&Math.cos(a-Math.PI)>.75)col=[110,40,32]}
r=col[0];g=col[1];b=col[2]}
if((m===M.WATER||m===M.FUEL)&&lv){const L=lv[c.reg[k]];if(L&&((k/w)|0)<L){r*=.22;g*=.22;b*=.24}}
if(m===M.LAMP){const f=.85+.15*Math.sin(t*20+k);r*=f;g*=f;b*=f}
if(SWAY[m]){const i=k%w,j=(k/w)|0,wa=G.windAmp||.5,dx=Math.round(Math.sin(t*(2.5+2*wa)+j*.8+i*.33+c.id)*SWAY[m]*(.6+wa));
if(dx&&i+dx>=0&&i+dx<w&&c.mat[k+dx]===m){const q=k+dx;r=c.col[q*3];g=c.col[q*3+1];b=c.col[q*3+2]}}
if(c.d.spin&&((k/w)|0)<c.d.spin*1.6&&c.d.roles[c.reg[k]]==='ROTOR'&&((k%w)+Math.floor(t*70))%5<2){d[q+3]=0;continue}
if(GLOWC[m]){const f=.92+.08*Math.sin(t*2.6+k*.9);r=Math.min(255,r*f+60);g=Math.min(255,g*f+45);b=Math.min(255,b*f+25)}
if(c.sil[k]){if(c.custom){if(!c.occ[c.sil[k]-1]){r*=.26;g*=.3;b*=.36}}else if(c.occ[c.sil[k]-1]){r=CREW[0];g=CREW[1];b=CREW[2]}}
if(CFG.unitShade){/* form from structure: a pixel with nothing above it is a lit top edge, one with nothing below is an under-shadow.
   Freshly torn metal therefore shows a bright edge without any new art. */
const e=CFG.unitShade*(c.custom?.55:1),up=k>=w?c.mat[k-w]:0,dn=k+w<c.n?c.mat[k+w]:0;
if(!up){const s=1+e*SPEC[m];r*=s;g*=s;b*=s}else if(!dn){const s=1-e*.2;r*=s;g*=s;b*=s}
else if(SPEC[m]>.2&&k>=2*w&&!c.mat[k-2*w]){const s=1+e*SPEC[m]*.35;r*=s;g*=s;b*=s}
if(m===M.GLASS){const i=k%w,j=(k/w)|0;if((i+j*2+((t*5)|0)+c.id*7)%29<2){r+=58*e;g+=66*e;b+=70*e}}}
const hf=c.hp[k]/MAXHP[m];if(hf<.65){const kk=.45+.85*hf;r*=kk;g*=kk;b*=kk}
if(c.wet&&c.wet[k]>0){const tt=Math.min(1,c.wet[k]/CFG.wetTime)*.38;r*=1-tt;g*=1-tt*.75;b=b*(1-tt*.3)+38*tt}
const ru=c.rust[k];if(ru>0){const tt=Math.min(1,ru)*.65;r=r*(1-tt)+150*tt;g=g*(1-tt)+68*tt;b=b*(1-tt)+34*tt}
const f=c.fire[k];if(f>0){const fl=Math.min(1,f*(.65+.45*Math.random()));r=r*(1-fl)+255*fl;g=g*(1-fl)+(110+120*Math.random())*fl;b=b*(1-fl)+30*fl}
d[q]=r*1.22;d[q+1]=g*1.22;d[q+2]=b*1.22;d[q+3]=255}
c.cx2.putImageData(c.img,0,0);
}
function drawCar(ctx,c,cx,cy){
paintCar(c);
ctx.save();ctx.translate(c.ax-cx,c.ay-cy);ctx.rotate(c.ang);if(c.fx===-1)ctx.scale(-1,1);
if(c.rollT>0){const p=1-c.rollT/CFG.rollTime,k=Math.max(.12,Math.abs(Math.cos(p*Math.PI)));ctx.translate(0,-c.h/2);ctx.scale(1,k);ctx.translate(0,c.h/2)}
ctx.drawImage(c.cv,-c.w/2,-c.h);
const ox=-c.w/2,oy=-c.h;
{const bay=G.state!=='title'&&bayOf(c);if(bay&&bay.state==='parked'&&c.d.roles.some((r,i)=>r==='DECK'&&c.alive[i])){
let cv;if(bay.unit){paintCar(bay.unit);cv=bay.unit.cv}else{G.baySprites=G.baySprites||{};const bkey=bay.type+':'+(CUSTOM[bay.type]?.lookURL?.slice(-32)||'builtin');if(!G.baySprites[bkey]){const pl=makeCar(bay.type);pl.occ.fill(1);updateRegions(pl);paintCar(pl);G.baySprites[bkey]=pl.cv}cv=G.baySprites[bkey]}
ctx.drawImage(cv,ox+c.w*.62-cv.width/2,oy+c.d.split*.75-cv.height+1)}}
if(c.custom&&c.rods&&c.wheels.length>1){const pins=c.wheels.map((wh,i)=>[wh.cx+Math.cos(c.phase)*wh.r*.5,wh.cy+Math.sin(c.phase)*wh.r*.5,c.alive[4+Math.min(3,Math.floor(wh.cx/(c.w/4)))]]);
ctx.fillStyle='rgb(196,190,176)';for(let i=0;i<pins.length-1;i++)if(pins[i][2]&&pins[i+1][2]){line(ctx,ox+pins[i][0],oy+pins[i][1],ox+pins[i+1][0],oy+pins[i+1][1]);line(ctx,ox+pins[i][0],oy+pins[i][1]+1,ox+pins[i+1][0],oy+pins[i+1][1]+1)}}
if(c.type==='loco'&&!c.custom){
const pins=[];for(let i=0;i<4;i++){const wh=c.wheels[i];pins.push([wh.cx+Math.cos(c.phase)*wh.r*.52,wh.cy+Math.sin(c.phase)*wh.r*.52,c.alive[4+i]])}
ctx.fillStyle='rgb(196,190,176)';
for(let i=0;i<3;i++){if(!pins[i][2]||!pins[i+1][2])continue;line(ctx,ox+pins[i][0],oy+pins[i][1],ox+pins[i+1][0],oy+pins[i+1][1])}
if(pins[2][2])line(ctx,ox+52.5*(c.d.sx||1),oy+23.5*(c.d.sy||1),ox+pins[2][0],oy+pins[2][1]);
}
{const rc=c.d.roles.indexOf('CANNON');if(rc>=0&&c.alive[rc]&&c.pts.turret&&(G.state==='workshop'||!G.caps.cannon||G.caps.cannon===c)){
const tp=c.pts.turret,bl=13*c.w/60,p=toWorld(c,tp[0],tp[1]),a=Math.atan2(G.mouse.wy-p[1],G.mouse.wx-p[0])-c.ang;
ctx.fillStyle='rgb(150,154,140)';for(let s=0;s<bl;s++){ctx.fillRect(ox+tp[0]+Math.cos(a)*s-1,oy+tp[1]+Math.sin(a)*s-1,2,2)}
}}
if(G.hover&&G.hover[0]===c){const r=G.hover[1],x0=(r%4)*c.w/4,y0=r<4?0:c.d.split,y1=r<4?c.d.split:c.h;
if(Math.sin(G.t*14)>-.3){ctx.fillStyle='rgb(240,236,220)';ctx.fillRect(ox+x0,oy+y0,c.w/4,1);ctx.fillRect(ox+x0,oy+y1-1,c.w/4,1);ctx.fillRect(ox+x0,oy+y0,1,y1-y0);ctx.fillRect(ox+x0+c.w/4-1,oy+y0,1,y1-y0)}}
ctx.restore();
}
function line(ctx,x0,y0,x1,y1){const n=Math.ceil(Math.hypot(x1-x0,y1-y0));for(let i=0;i<=n;i++){const t=n?i/n:0;ctx.fillRect(x0+(x1-x0)*t-.5,y0+(y1-y0)*t-.5,1,1)}}
const STARS=Array.from({length:60},(_,i)=>[hash2(i,1),hash2(i,2)*.45,hash2(i,3)]);
function renderScene(){
const ctx=sctx,W=S.W,H=S.H,w=G.world;
const sx=(Math.random()-.5)*G.shake*CFG.camShake,sy=(Math.random()-.5)*G.shake*CFG.camShake;
const cx=Math.round(clamp(G.camX+sx,0,Math.max(0,w.W-W-1))),cy=Math.round(clamp(G.camY+sy,0,Math.max(0,w.H-H-1)));G.rcx=cx;G.rcy=cy;
const tn=G.tint,gr=ctx.createLinearGradient(0,0,0,H*.8);gr.addColorStop(0,'rgb(6,6,11)');gr.addColorStop(.45,rgb(sh(tn,.34)));gr.addColorStop(.8,rgb(sh(tn,.78)));gr.addColorStop(1,rgb(sh(tn,1.12)));
ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);
for(const s of STARS){const b=120+100*Math.sin(G.t*2+s[2]*40);ctx.fillStyle=`rgb(${b},${b},${b*.95})`;ctx.fillRect((s[0]*W*1.3-cx*.02)%W,s[1]*H,1,1)}
const mx=W*.78,my=H*.2;if(CFG.haze){const mg=ctx.createRadialGradient(mx,my,10,mx,my,58);mg.addColorStop(0,'rgba(214,200,168,.20)');mg.addColorStop(1,'rgba(214,200,168,0)');ctx.fillStyle=mg;ctx.fillRect(mx-60,my-60,120,120)}ctx.fillStyle='rgb(206,196,170)';ctx.beginPath();ctx.arc(mx,my,13,0,7);ctx.fill();
ctx.fillStyle='rgb(160,150,128)';ctx.beginPath();ctx.arc(mx-4,my-3,3,0,7);ctx.arc(mx+5,my+4,2.2,0,7);ctx.fill();
ctx.globalAlpha=.07;ctx.fillStyle='rgb(150,140,120)';for(let i=0;i<5;i++){const x=((i*173+G.t*4-cx*.06)%(W+160))-80;ctx.beginPath();ctx.ellipse(x,H*(.22+i*.07),70,8+i*2,0,0,7);ctx.fill()}ctx.globalAlpha=1;
ctx.drawImage(w.far,Math.floor(cx*.18),Math.round(cy*.9+30)+LAYER_OFF-30,W,H,0,0,W,H);
/* aerial perspective (v3.41): a veil of biome-coloured haze sits in front of each background layer, thickest at the horizon,
   so the far skyline fades back and the train reads as the nearest thing */
const hazeY=Math.round(T(cx+W/2)-cy),veil=(a0,a1)=>{if(!CFG.haze)return;const y0=Math.max(0,hazeY-150),hg=ctx.createLinearGradient(0,y0,0,hazeY+6),hc=sh(tn,1.05).map(v=>Math.min(255,v|0)).join(',');hg.addColorStop(0,`rgba(${hc},${a0})`);hg.addColorStop(1,`rgba(${hc},${a1})`);ctx.fillStyle=hg;ctx.fillRect(0,y0,W,hazeY+6-y0)};
veil(0,.34*CFG.haze);
ctx.drawImage(w.mid,Math.floor(cx*.42),Math.round(cy*.96+10)+LAYER_OFF-10,W,H,0,0,W,H);
veil(0,.16*CFG.haze);
ctx.drawImage(w.canvas,cx,cy,W,H,0,0,W,H);
if(PX.cv&&PX.W===w.W)ctx.drawImage(PX.cv,cx,cy,W,H,0,0,W,H);
for(const bu of w.buried||[]){if(bu.looted||bu.x<cx-30||bu.x>cx+W+30)continue;
const bx=Math.round(bu.x-cx),by=Math.round(bu.y-cy),gy=Math.round(w.T[bu.x]-cy);
if(bu.kind==='gas'){
ctx.fillStyle='rgba(120,210,95,.65)';
for(let b=0;b<4;b++){const ox=Math.round(Math.sin(G.t*2+b*1.7+bu.id)*(bu.r*.5)),oy=Math.round(((G.t*8+b*5)%bu.r)-bu.r*.5);ctx.fillRect(bx+ox,by-oy,1,1)}
}
if(Math.sin(G.t*3.5+bu.id)>0){ctx.fillStyle=bu.kind==='gas'?'rgb(120,235,95)':bu.kind==='bunker'?'rgb(255,110,60)':bu.kind==='chest'?'rgb(255,215,70)':'rgb(180,140,90)';ctx.fillRect(bx-1,by-1,3,3);ctx.fillRect(bx,gy+2,1,2)}}
for(const st of w.subTurrets||[]){if(!st.alive||st.x<cx-20||st.x>cx+W+20)continue;
const tx=Math.round(st.x-cx),ty=Math.round(st.y-cy);
ctx.fillStyle='rgb(64,62,58)';ctx.fillRect(tx-4,ty-3,8,6);
ctx.fillStyle='rgb(96,92,84)';ctx.fillRect(tx-3,ty-5,6,3);
ctx.fillStyle=st.awake?'rgb(255,42,32)':(Math.sin(G.t*4+st.id)>0?'rgb(240,170,50)':'rgb(110,80,30)');
ctx.fillRect(tx-1,ty-4,2,2);
}
for(const s of w.sites){if(s.x<cx-60||s.x>cx+W+60)continue;
if(s.type==='tower'){if(s.water>0&&!s.collapsed){if(Math.sin(G.t*3+s.x)>0){ctx.fillStyle='rgb(120,190,255)';ctx.fillRect(s.x-cx+17,T(s.x)-93-cy,3,3)}
if(s.pouring){ctx.fillStyle='rgba(120,180,255,.9)';ctx.fillRect(s.x-cx-1,T(s.x)-64-cy,2,2)}}continue}
if(s.uses<=0)continue;const y=(s.ty<1e9?s.ty-12:T(s.x)-48)-cy;
for(let i=0;i<s.stock0;i++){ctx.fillStyle=i<s.stock?'rgb(236,214,150)':'rgb(70,66,60)';ctx.fillRect(s.x-cx-s.stock0+i*2+1,y-4,1,2)}if(Math.sin(G.t*4+s.x)>0){ctx.fillStyle=s.type==='bunker'?'rgb(255,90,60)':'rgb(255,236,180)';ctx.fillRect(s.x-cx-1,y,3,3)}ctx.fillStyle='rgb(120,116,104)';ctx.fillRect(s.x-cx,y+4,1,8)}
for(const o of G.obstacles){if(o.x>cx-30&&o.x<cx+W+30)ctx.drawImage(o.cv,Math.round(o.x-cx),Math.round(T(o.x+o.w/2)-o.h-cy))}
for(const w of G.salvage||[]){if(w.x<cx-20||w.x>cx+W+20)continue;const x=Math.round(w.x-cx),y=Math.round(groundY(w.x)-cy);if(w.what==='raider corpse'){ctx.fillStyle='rgb(168,44,36)';ctx.fillRect(x-3,y-2,5,2);ctx.fillStyle='rgb(206,170,136)';ctx.fillRect(x+2,y-2,2,2);ctx.fillStyle='rgb(110,24,20)';ctx.fillRect(x-4,y-1,2,1);continue}    ctx.fillStyle='rgb(72,72,76)';ctx.fillRect(x-3,y-2,7,2);ctx.fillStyle='rgb(110,110,112)';ctx.fillRect(x-5,y-3,3,1);ctx.fillRect(x+3,y-3,3,1);ctx.fillStyle='rgb(150,40,30)';ctx.fillRect(x,y-3,1,1)}
ctx.fillStyle='rgb(90,86,80)';
const groups=[G.train.cars,...G.loose.map(g=>g.cars)];
for(const cars of groups)for(let i=1;i<cars.length;i++){const pa=cars[i-1].pts.couplerRear,pb=cars[i].pts.couplerFront,a=toWorld(cars[i-1],pa[0],pa[1]),b=toWorld(cars[i],pb[0]+1,pb[1]);line(ctx,a[0]-cx,a[1]-cy,b[0]-cx,b[1]-cy)}
for(const cars of groups)for(const c of cars)if(c.ax>cx-80&&c.ax<cx+W+80)drawCar(ctx,c,cx,cy);
for(const c of G.vehicles||[])if(c.ax>cx-80&&c.ax<cx+W+80)drawCar(ctx,c,cx,cy);
drawChunks(ctx,cx,cy);pxDraw(ctx,cx,cy,W,H);
if(G.state==='play'){const f=1.45,off=cx*f;ctx.fillStyle='rgb(12,11,11)';for(let k=Math.floor(off/230);k<=Math.floor((off+W)/230)+1;k++){if(hash2(k,77)<.45)continue;const sx=k*230+hash2(k,78)*90-off;ctx.fillRect(Math.round(sx),H*.12,3,H);ctx.fillRect(Math.round(sx)-7,H*.12+6,17,2);ctx.fillRect(Math.round(sx)-5,H*.12+13,13,2)}}
if(G.riders>0){let n=G.riders;for(const c of G.train.cars){if(n<=0)break;if(isLoco(c))continue;for(let s=0;s<3&&n>0;s++,n--){const p=toWorld(c,12+s*16,c.d.split),x=Math.round(p[0]),y=Math.round(p[1]);
ctx.fillStyle='rgb(222,212,188)';for(const [dx,dy] of [[0,-7],[1,-7],[0,-6],[1,-6],[0,-5],[1,-5],[0,-4],[1,-4],[0,-3],[1,-3],[0,-2],[0,-1],[1,-2],[1,-1]])if(insideVisible(x+dx+.5,y+dy+.5))ctx.fillRect(x+dx-cx,y+dy-cy,1,1)}}}
for(const s of w.sites)if(s.type==='stranded'&&s.people>0&&s.x>cx-40&&s.x<cx+W+40)for(let i=0;i<s.people;i++){const px=s.x-8+i*7,wave=Math.sin(G.t*6+i)>0;drawPerson(ctx,px-cx,groundY(px)-cy,0,false,false);if(i>=s.people-s.hurt){ctx.fillStyle='rgb(200,60,50)';ctx.fillRect(px-cx,groundY(px)-cy-5,2,1)}else if(wave){ctx.fillStyle='rgb(222,212,188)';ctx.fillRect(px-cx+2,groundY(px)-cy-9,1,3)}}
if(G.boarders)for(const b of G.boarders){drawPerson(ctx,b.x-cx,groundY(b.x)-cy,b.ph,true,false);if(b.hurt){ctx.fillStyle='rgb(200,60,50)';ctx.fillRect(b.x-cx,groundY(b.x)-cy-5,2,1)}}
for(const m of G.strays||[]){if(!m.alive)continue;drawBody(ctx,m,m.x,cx,cy,false);
if(m.state==='chute'&&m.chT>.45){const x=Math.round(m.x)-cx,y=Math.round(m.gy)-cy;ctx.fillStyle='rgb(222,128,64)';ctx.fillRect(x-4,y-17,10,2);ctx.fillStyle='rgb(236,226,206)';ctx.fillRect(x-3,y-18,8,1);ctx.fillRect(x-5,y-16,1,1);ctx.fillRect(x+6,y-16,1,1);
ctx.fillStyle='rgba(200,190,170,.7)';for(let t=1;t<7;t++){ctx.fillRect(x-4+Math.round(t*.6),y-16+t,1,1);ctx.fillRect(x+5-Math.round(t*.6),y-16+t,1,1)}}}
if(G.exp)G.exp.members.forEach((m,i)=>{if(!m.alive||m.state==='in')return;
if(m.state==='work'){const st=G.exp.tgt.kind==='site',wx=m.x+Math.sin(m.ph*.13+i*2.1)*(st?16:3);m.walkS=Math.sin(m.ph)>0?1:0;drawBody(ctx,m,wx,cx,cy,st&&Math.sin(m.ph*.13+i*2.1+1.6)>0);return}
drawBody(ctx,m,m.x,cx,cy,m.state==='back'&&invGoods(m)&&!m.hurt)});
if(G.crew)for(const m of G.crew){if(m.where!=='deck'||m.x<cx-10||m.x>cx+W+10)continue;const wat=m.task&&(m.task.kind==='fire'||m.task.for)&&invCount(m,'water')>=1;
drawBody(ctx,m,m.x,cx,cy,invGoods(m)?'loot':wat?'water':false);
if(!insideVisible(m.x+.5,m.gy-6))continue;
if(m.throwT>0){m.throwT-=1/60;ctx.fillStyle='rgb(110,170,240)';ctx.fillRect(Math.round(m.x)-cx+(m.dir>0?2:-2),Math.round(m.gy)-cy-9,2,2)}
if(m.task&&m.task.kind==='guard'&&has(m,'gun')){ctx.fillStyle='rgb(60,56,52)';ctx.fillRect(Math.round(m.x)-cx+(m.dir>0?2:-2),Math.round(m.gy)-cy-5,m.dir>0?2:-2,1)}}
if(G.raiders)for(const r of G.raiders)if(r.alive&&r.x>cx-10&&r.x<cx+W+10){drawBody(ctx,r,r.x,cx,cy,false,RAIDER_PAL);ctx.fillStyle='rgb(60,56,52)';const gx=Math.round(r.x)-cx+(r.dir>0?2:-2),gy=Math.round(groundY(r.x))-cy-5;ctx.fillRect(gx,gy,r.dir>0?2:-2,1)}
for(const d of G.drones){const x=Math.round(d.x-cx),y=Math.round(d.y-cy),b=d.bomber;
ctx.fillStyle=d.dead?'rgb(82,52,36)':'rgb(58,56,50)';ctx.fillRect(x-(b?6:4),y-1,b?13:9,2);
ctx.fillStyle=d.dead?'rgb(96,58,38)':'rgb(84,78,68)';ctx.fillRect(x-(b?4:3),y-2,b?9:7,b?4:3);
ctx.fillStyle='rgb(42,40,36)';ctx.fillRect(x-(b?5:4),y+1,1,2);ctx.fillRect(x+(b?4:3),y+1,1,2);
ctx.fillStyle='rgb(148,142,132)';const rot=Math.sin(G.t*60+d.ph)>0;if(!d.dead){ctx.fillRect(x-(b?9:7),y-3,rot?5:3,1);ctx.fillRect(x+(b?5:4),y-3,rot?5:3,1)}
ctx.fillStyle=d.dead?'rgb(255,140,40)':'rgb(255,42,32)';ctx.fillRect(x-(b?1:0),y-1,b?3:2,2)}
for(const r of G.rocks){if(r.delay>0)continue;ctx.fillStyle=rgb(r.col);ctx.beginPath();ctx.arc(r.x-cx,r.y-cy,r.r,0,7);ctx.fill();ctx.fillStyle=rgb(sh(r.col,1.4));ctx.fillRect(r.x-cx-r.r*.4,r.y-cy-r.r*.6,1.5,1.5)}
for(const s of G.shots){ctx.fillStyle=s.kind==='seeker'?'rgb(255,90,190)':s.kind==='rpg'?'rgb(255,160,70)':s.kind==='grenade'?'rgb(140,210,100)':s.kind==='molotov'?'rgb(255,130,40)':s.kind==='pbullet'?(s.sniper?'rgb(120,245,230)':'rgb(240,232,210)'):s.kind==='bullet'?'rgb(255,90,60)':s.kind==='bomb'?'rgb(60,60,60)':'rgb(255,236,190)';ctx.fillRect(Math.round(s.x-cx)-(s.kind==='bomb'||s.kind==='rpg'||s.kind==='seeker'?1:0),Math.round(s.y-cy),s.kind==='rpg'||s.kind==='seeker'||s.sniper?3:2,s.kind==='bomb'?3:2)}
for(const p of G.parts){const x=p.x-cx,y=p.y-cy;if(x<-10||x>W+10||y<-10||y>H+10)continue;
if(p.kind==='steam'||p.kind==='dust'){ctx.globalAlpha=(p.kind==='steam'?.55:.38)*p.life/p.max;ctx.fillStyle=p.cs;const s=p.size;ctx.fillRect(x-s/2,y-s/2,s,s);ctx.globalAlpha=1}
else if(p.kind==='arc'){ctx.strokeStyle=p.cs;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);const n=4;for(let i=1;i<=n;i++){const t=i/n;ctx.lineTo(x+(p.x2-p.x)*t+(i<n?rand(-1.5,1.5):0),y+(p.y2-p.y)*t+(i<n?rand(-1.5,1.5):0))}ctx.stroke()}
else if(p.kind==='twinkle'){ctx.globalAlpha=Math.random()<.7?Math.min(1,p.life/p.max*2):.2;ctx.fillStyle=p.cs;ctx.fillRect(Math.round(x),Math.round(y),1,1);ctx.globalAlpha=1}
else if(p.kind==='smoke'){ctx.globalAlpha=.42*p.life/p.max;ctx.fillStyle=p.cs;const s=p.size;ctx.fillRect(x-s/2,y-s/2,s,s);ctx.globalAlpha=1}
else if(p.kind==='rain'){ctx.fillStyle=p.cs;ctx.fillRect(x,y,1,3)}
else{ctx.globalAlpha=p.kind==='ember'||p.kind==='spark'?Math.min(1,p.life/p.max*1.6):1;ctx.fillStyle=p.cs;ctx.fillRect(Math.round(x),Math.round(y),p.size,p.size);ctx.globalAlpha=1}}
if(G.craneLine&&G.caps.crane){const c=G.caps.crane,hk=toWorld(c,c.pts.hook[0],c.pts.hook[1]);ctx.fillStyle='rgb(170,164,150)';line(ctx,hk[0]-cx,hk[1]-cy,G.craneLine.x-cx,G.craneLine.y-cy)}
for(const c of G.train.cars)if(c.bay&&c.bay.winching&&c.bay.unit){const dp=toWorld(c,c.w*.62,c.d.split*.75),u=c.bay.unit;ctx.fillStyle='rgb(220,180,90)';line(ctx,dp[0]-cx,dp[1]-cy,u.cxw-cx,u.cyw-cy)}
{const C=G.caps;if(G.state==='play'&&!G.dev.auto&&C&&C.cannon&&G.res.ammo>0){const c=C.cannon,tp=c.pts.turret,bl=13*c.w/60,p=toWorld(c,tp[0],tp[1]),a=Math.atan2(G.mouse.wy-p[1],G.mouse.wx-p[0]);
let x=p[0]+Math.cos(a)*bl,y=p[1]+Math.sin(a)*bl,vx=Math.cos(a)*CFG.shellSpeed+G.train.v,vy=Math.sin(a)*CFG.shellSpeed;const ready=G.gunCool<=0;
ctx.fillStyle=ready?'rgba(255,214,140,.85)':'rgba(170,160,140,.5)';
for(let i=0;i<60;i++){const h=.025;vy+=55*h;x+=vx*h;y+=vy*h;if(solidAt(x,y)){ctx.fillRect(x-cx-1,y-cy-1,3,3);break}if(i%3===0)ctx.fillRect(Math.round(x-cx),Math.round(y-cy),2,2)}}}
/* drifting ash (v3.41): stateless flecks at three depths, blown by the wind, embers in the lava fields; never drawn below ground */
if(CFG.ashFlecks){const wind=18+(G.windAmp||.5)*38,lava=biomeAt(cx+W/2).type==='lava';
for(let i=0;i<CFG.ashFlecks;i++){const dp=.35+hash2(i,91)*.95,span=W+40,fx=((hash2(i,92)*span*3-G.t*wind*dp-cx*dp*.6)%span+span)%span-20,fy=((hash2(i,93)*H*2+G.t*(7+hash2(i,94)*11)*dp+Math.sin(G.t*.9+i)*5)%H+H)%H;
if(fy>T(cx+clamp(fx,0,W-1))-cy-1)continue;const em=lava&&i%3===0||i%17===0;
ctx.globalAlpha=(em?.75:.16+.3*dp)*(.7+.3*Math.sin(G.t*3+i));ctx.fillStyle=em?'rgb(255,150,60)':'rgb(176,168,150)';const sz=dp>1?2:1;ctx.fillRect(Math.round(fx),Math.round(fy),sz,sz)}ctx.globalAlpha=1}
drawLights(ctx,cx,cy,W,H);
const L=G.train.cars[0],lp=L.pts.lamp;if(lp&&lampAlive(L,lp)&&G.caps.driver){const p=toWorld(L,lp[0]+1,lp[1]);ctx.globalAlpha=.10;ctx.fillStyle='rgb(255,236,180)';ctx.beginPath();ctx.moveTo(p[0]-cx,p[1]-cy);ctx.lineTo(p[0]-cx+90,p[1]-cy-12);ctx.lineTo(p[0]-cx+90,p[1]-cy+22);ctx.fill();ctx.globalAlpha=1}
}
const CREW_PAL=['rgb(226,214,190)','rgb(176,164,120)','rgb(110,102,84)'],RAIDER_PAL=['rgb(206,170,136)','rgb(168,44,36)','rgb(64,54,48)'];
function drawBody(ctx,m,wx,cx,cy,carry,base){
const x=Math.round(wx)-cx,y=Math.round(baseY(m,wx))-cy,s=m.walkS||0;
const inside=m.where==='deck';
for(let i=0;i<CREW_BODY.length;i++){const hp=m.body?m.body[i]:CFG.bodyHP;if(hp<=0)continue;const b=CREW_BODY[i];let dx=b[0];if(b[2]==='L')dx-=s;if(b[2]==='R')dx+=s;
if(inside&&!insideVisible(x+cx+dx+.5,y+cy+b[1]+.5))continue;
const k=Math.max(0,hp/CFG.bodyHP),pal=base||CREW_PAL,cc=pal[b[1]<=-6?0:b[2]?2:1];ctx.fillStyle=k>.99?cc:`rgb(${(170+52*k)|0},${(40+172*k)|0},${(34+154*k)|0})`;ctx.fillRect(x+dx,y+b[1],1,1)}
if(carry&&(!inside||insideVisible(x+cx+.5,y+cy-8.5))){ctx.fillStyle=carry==='water'?'rgb(110,170,240)':'rgb(200,150,70)';ctx.fillRect(x-1,y-9,carry==='water'?2:4,2)}
}
function drawPerson(ctx,x,y,ph,walking,carry){
x=Math.round(x);y=Math.round(y);ctx.fillStyle='rgb(222,212,188)';
ctx.fillRect(x,y-7,2,2);ctx.fillRect(x,y-5,2,3);
const s=walking?(Math.sin(ph)>0?1:0):0;ctx.fillRect(x-s,y-2,1,2);ctx.fillRect(x+1+s,y-2,1,2);
if(carry){ctx.fillStyle='rgb(200,150,70)';ctx.fillRect(x-1,y-9,4,2)}
}
function present(){
if(!gl){const c=view.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(scene,0,0,view.width,view.height);return}
gl.viewport(0,0,view.width,view.height);
gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,sceneTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,scene);
const cp=CFG.cellPresets[G.cell];
gl.uniform2f(U.uRes,view.width,view.height);gl.uniform2f(U.uCell,cp[0]*dpr,cp[1]*dpr);gl.uniform1f(U.uTime,G.t);gl.uniform1f(U.uN,CFG.ramp.length);gl.uniform1f(U.uRaw,G.raw?1:0);gl.uniform2f(U.uSRes,scene.width,scene.height);gl.uniform4f(U.uFx,CFG.fxBloom,CFG.fxVignette,CFG.fxBevel,CFG.fxGrain);gl.uniform1f(U.uFlash,G.flash);
gl.drawArrays(gl.TRIANGLES,0,3);
}
