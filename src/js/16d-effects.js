/* =====================================================================
   EFFECT POINTS (v3.22) — visual effects pinned to a point on a unit, chosen in the Unit Forge.
   Each unit carries a list of effects: { t: type, x, y: point in unit pixels, k: power 0–2,
   a: direction in degrees (unit space: 0 = towards the nose/front, −90 = up), tr: trigger }.
   Limits per unit kind: EFX_MAX. An effect only runs while its point still has material around it
   (shoot the chimney off and its smoke stops) and while its trigger holds:
     always · moving · braking · damaged (its section < 90%, stronger the worse it is) · broken (< 50%) · burning
   Leaks are real pixels (oil, water, fuel drops) — water drops douse what they fall on, fuel drops make
   puddles that burn. An electrical short can light something flammable next to it. Everything else is visual.
   ===================================================================== */
const EFX_MAX={loco:7,wagon:5,plane:4,heli:4,drone:3,mole:4,tank:4};
const EFX_TRIG={always:'Always',moving:'When moving',braking:'Braking / skidding',damaged:'Section damaged (stronger the worse)',broken:'Section broken (<50%)',burning:'Section on fire'};
const EFX_GROUPS=['Smoke & steam','Fire & sparks','Lights','Electrical','Leaks','Dust & debris'];
const efxRate=(s,rate,dt)=>{s.acc=(s.acc||0)+rate*dt;let n=0;while(s.acc>=1&&n<12){s.acc-=1;n++}if(s.acc>4)s.acc=0;return n};
function efxDrip(x,y,vx,m,col,src){if(PX.act.length>=CFG.maxActive*(G.q||1)*.8)return;addActive(x,y,vx,rand(4,14),m,col[0],col[1],col[2],0,.08,null);const a=PX.act[PX.act.length-1];if(a&&a.m===m)a.drip=1}
const EFX={
smoke:      {name:'Chimney smoke',group:'Smoke & steam',col:'#9a948a',trig:'always',run(e,q,s){for(let n=efxRate(s,7*q.k,q.dt);n--;)spawn(q.x+rand(-1,1),q.y,rand(-5,5)-q.v*.3,rand(-30,-16),rand(1.6,3),[150+rand(-10,10),144,136],2,'smoke')}},
black:      {name:'Black smoke (diesel, oil fire)',group:'Smoke & steam',col:'#2a2828',trig:'always',run(e,q,s){for(let n=efxRate(s,8*q.k,q.dt);n--;)spawn(q.x+rand(-1.5,1.5),q.y,rand(-5,5)-q.v*.3,rand(-26,-12),rand(2.2,3.8),[30,28,28],3,'smoke')}},
steam:      {name:'Steam puffs',group:'Smoke & steam',col:'#f0f0ec',trig:'moving',dir:true,a:180,run(e,q,s){const sp=12+q.sp*.2;for(let n=efxRate(s,(6+q.sp*.25)*q.k,q.dt);n--;)spawn(q.x,q.y,q.dx*sp+rand(-6,6)-q.v*.2,q.dy*sp+rand(-14,-4),rand(.5,1),[236,236,232],2,'steam')}},
exhaust:    {name:'Engine exhaust',group:'Smoke & steam',col:'#78746f',trig:'always',dir:true,a:180,run(e,q,s){for(let n=efxRate(s,14*q.k,q.dt);n--;)spawn(q.x,q.y,q.dx*rand(25,40)+q.vx*.6,q.dy*rand(25,40)+q.vy*.6-4,rand(.4,.8),[118,114,110],1,'smoke')}},
sparks:     {name:'Sparks (brakes, wheels, grinding)',group:'Fire & sparks',col:'#ffc860',trig:'braking',dir:true,a:150,run(e,q,s){for(let n=efxRate(s,26*q.k,q.dt);n--;){const a=Math.atan2(q.dy,q.dx)+rand(-.5,.5),sp=rand(40,95);spawn(q.x,q.y,Math.cos(a)*sp+q.vx*.5,Math.sin(a)*sp+q.vy*.5,rand(.15,.4),[255,rand(190,240),110],1,'spark')}}},
embers:     {name:'Rising embers',group:'Fire & sparks',col:'#ff8c32',trig:'always',run(e,q,s){for(let n=efxRate(s,5*q.k,q.dt);n--;)spawn(q.x+rand(-2,2),q.y,rand(-8,8)+(G.wind||0)*.3,rand(-50,-25),rand(.6,1.3),[255,rand(120,170),50],1,'ember')}},
welding:    {name:'Welding flashes',group:'Fire & sparks',col:'#d0e8ff',trig:'always',run(e,q,s){s.t=(s.t||rand(.2,1))-q.dt;if(s.t>0)return;s.t=rand(.25,1.4)/Math.max(.2,q.k);s.on=.08;
for(let i=0;i<10+8*q.k;i++){const a=rand(0,6.28),sp=rand(30,110);spawn(q.x,q.y,Math.cos(a)*sp,Math.sin(a)*sp-20,rand(.1,.35),Math.random()<.5?[220,235,255]:[255,240,190],1,'spark')}},light(e,q,s){if(s.on>0){s.on-=q.dt;return[18,.7,'200,225,255']}}},
flame:      {name:'Flame jet (afterburner, torch)',group:'Fire & sparks',col:'#ff6a20',trig:'always',dir:true,a:180,run(e,q,s){for(let n=efxRate(s,30*q.k,q.dt);n--;){const a=Math.atan2(q.dy,q.dx)+rand(-.18,.18),sp=rand(40,70);spawn(q.x,q.y,Math.cos(a)*sp+q.vx*.8,Math.sin(a)*sp+q.vy*.8,rand(.08,.2),Math.random()<.5?[255,220,90]:[255,120,30],1,'spark')}},light(e,q){return[10+6*q.k,.35,'255,150,60']}},
lantern:    {name:'Lantern (warm light)',group:'Lights',col:'#ffbe6e',trig:'always',run(e,q,s){if(Math.random()<q.dt*1.5)spawn(q.x,q.y,0,0,.25,[255,200,120],1,'twinkle')},light(e,q){return[12+8*q.k,.3*(.9+.1*Math.sin(G.t*7+q.x)),'255,190,110']}},
beacon:     {name:'Beacon (blinking red)',group:'Lights',col:'#ff3030',trig:'always',run(e,q,s){const on=(G.t*1.1+q.x*.01)%1<.35;if(on&&Math.random()<q.dt*8)spawn(q.x,q.y,0,0,.15,[255,60,50],1,'twinkle')},light(e,q){return(G.t*1.1+q.x*.01)%1<.35?[10+6*q.k,.5,'255,50,40']:null}},
strobe:     {name:'Strobe (white flash)',group:'Lights',col:'#ffffff',trig:'always',run(){},light(e,q){return(G.t*.8+q.y*.01)%1<.06?[16+8*q.k,.8,'255,255,255']:null}},
signal:     {name:'Signal lamp (green)',group:'Lights',col:'#50ff8c',trig:'always',run(){},light(e,q){return[9+5*q.k,.35,'80,255,140']}},
short:      {name:'Electrical short (crackling arcs)',group:'Electrical',col:'#8cc8ff',trig:'damaged',run(e,q,s){s.t=(s.t||rand(.1,.8))-q.dt;if(s.t>0)return;s.t=rand(.08,.9)/Math.max(.25,q.k);s.on=.06;
const a=rand(0,6.28),L=rand(3,7);G.parts.push({x:q.x,y:q.y,x2:q.x+Math.cos(a)*L,y2:q.y+Math.sin(a)*L,vx:0,vy:0,life:.07,max:.07,col:[170,210,255],cs:'rgb(170,210,255)',size:1,kind:'arc'});
for(let i=0;i<4;i++)spawn(q.x,q.y,rand(-40,40),rand(-50,-5),rand(.08,.25),[200,225,255],1,'spark');if(Math.random()<.3)sfx('tink',.25,q.x);
if(q.c&&Math.random()<CFG.shortIgnite){const k=q.k0;if(k>=0&&q.c.mat[k]&&FLAM[q.c.mat[k]]>0)q.c.fire[k]=Math.max(q.c.fire[k],.4)}},light(e,q,s){if(s.on>0){s.on-=q.dt;return[14,.6,'150,200,255']}}},
sparkle:    {name:'Sparkle / glitter',group:'Electrical',col:'#fff4b4',trig:'always',run(e,q,s){for(let n=efxRate(s,7*q.k,q.dt);n--;)spawn(q.x+rand(-4,4),q.y+rand(-4,4),rand(-2,2),rand(-4,1),rand(.3,.8),Math.random()<.5?[255,255,255]:[255,230,150],1,'twinkle')}},
leak_oil:   {name:'Oil leak (real drops)',group:'Leaks',col:'#5a00aa',trig:'damaged',run(e,q,s){for(let n=efxRate(s,3*q.k,q.dt);n--;)efxDrip(q.x,q.y,q.vx+(G.wind||0)*.2,M.OIL,[40,22,48])}},
leak_water: {name:'Water leak (real drops, douse below)',group:'Leaks',col:'#3070e0',trig:'damaged',run(e,q,s){for(let n=efxRate(s,4*q.k,q.dt);n--;)efxDrip(q.x,q.y,q.vx+(G.wind||0)*.2,M.WATER,[60,120,230])}},
leak_fuel:  {name:'Fuel leak (real drops, burn on the ground)',group:'Leaks',col:'#ffb000',trig:'damaged',run(e,q,s){for(let n=efxRate(s,3*q.k,q.dt);n--;)efxDrip(q.x,q.y,q.vx+(G.wind||0)*.2,M.FUEL,[200,140,20])}},
dust:       {name:'Dust trail (kicked up, downwind)',group:'Dust & debris',col:'#968468',trig:'moving',run(e,q,s){for(let n=efxRate(s,(4+q.sp*.5)*q.k,q.dt);n--;)spawn(q.x+rand(-2,2),q.y,-q.v*.25+rand(-10,10),-rand(4,14),rand(1,2),[150+rand(-15,15),132,104],2,'dust')}},
sift:       {name:'Sifting grit (falls, drifts in wind)',group:'Dust & debris',col:'#aa9c82',trig:'always',run(e,q,s){for(let n=efxRate(s,10*q.k,q.dt);n--;)spawn(q.x+rand(-1.5,1.5),q.y,rand(-3,3),rand(4,14),rand(1.2,2.4),[170,156,130],1,'dust')}},
debris:     {name:'Shedding debris',group:'Dust & debris',col:'#6e645a',trig:'damaged',run(e,q,s){for(let n=efxRate(s,2.5*q.k,q.dt);n--;)spawn(q.x+rand(-2,2),q.y,q.vx*.6+rand(-20,20),rand(-30,0),rand(1.5,3),[110+rand(-20,20),100,90],1,'debris')}},
rotor_dust: {name:'Rotor wash (dust on the ground below)',group:'Dust & debris',col:'#b4a078',trig:'always',run(e,q,s){const gy=groundY(q.x),alt=gy-q.y;if(alt<0||alt>80)return;const f=1-alt/80;
for(let n=efxRate(s,26*q.k*f,q.dt);n--;){const side=Math.random()<.5?-1:1;spawn(q.x+side*rand(2,12),gy-1,side*rand(30,70)+(G.wind||0)*.3,-rand(4,18),rand(.6,1.4),[170,150,112],2,'dust')}}},
};
const BUILTIN_FX={
loco:[{t:'steam',x:88,y:36,k:.8,a:180,tr:'moving'},{t:'sparks',x:74,y:48,k:.7,a:150,tr:'braking'},{t:'lantern',x:18,y:12,k:.5,a:0,tr:'always'},{t:'short',x:14,y:22,k:1,a:0,tr:'broken'}],
tender:[{t:'leak_fuel',x:50,y:27,k:.6,a:90,tr:'damaged'}],
water:[{t:'leak_water',x:50,y:27,k:1,a:90,tr:'damaged'}],
plane:[{t:'exhaust',x:60,y:14,k:.7,a:180,tr:'always'},{t:'black',x:61,y:15,k:.8,a:0,tr:'burning'}],
heli:[{t:'rotor_dust',x:33,y:24,k:1,a:90,tr:'always'},{t:'exhaust',x:32,y:5,k:.6,a:180,tr:'always'}],
};
function efxList(c){if(c.efx===undefined)c.efx=c.efxSrc?(c.efxSrc.effects||[]):(BUILTIN_FX[c.type]||[]);return c.efx}
function effectsTick(dt,opts){
G.fxL=[];const all=G.all||[];opts=opts||{};
for(const c of all){const list=efxList(c);if(!list.length)continue;
if(!c.efxS||c.efxS.length!==list.length)c.efxS=list.map(()=>({}));
let v=0,vy=0;if(c.vkind){v=c.vx||0;vy=c.vy||0}else if(G.train&&G.train.cars.includes(c))v=G.train.v;else{const g=(G.loose||[]).find(g=>g.cars.includes(c));v=g?g.v:0}
if(opts.v!==undefined)v=opts.v;
const sp=Math.abs(v),braking=opts.all||(sp>2&&(G.brake||(c.derailed))),fx=c.fx||1;
for(let i=0;i<list.length;i++){const e=list[i],T=EFX[e.t];if(!T)continue;const s=c.efxS[i];
if((s.chk=(s.chk||0)-dt)<=0){s.chk=.5;s.alive=false;s.k0=-1;const x0=Math.round(e.x),y0=Math.round(e.y);
for(let dy=-2;dy<=2&&!s.alive;dy++)for(let dx=-2;dx<=2;dx++){const x=x0+dx,y=y0+dy;if(x>=0&&y>=0&&x<c.w&&y<c.h&&c.mat[y*c.w+x]){s.alive=true;s.k0=y*c.w+x;break}}}
if(!s.alive)continue;
const r=Math.min(3,Math.max(0,Math.floor(e.x/(c.w/4))))+(e.y>=c.d.split?4:0),tr=opts.all?'always':(e.tr||T.trig);let k=e.k??1;
if(tr==='moving'){if(sp<2)continue;k*=Math.min(1.5,.4+sp/40)}
else if(tr==='braking'){if(!braking)continue}
else if(tr==='damaged'){const d=1-c.regInt[r];if(d<.1)continue;k*=Math.min(2,d*2)}
else if(tr==='broken'){if(c.alive[r])continue}
else if(tr==='burning'){if(!c.regFire[r])continue}
const p=toWorld(c,e.x,e.y),a=(e.a??T.a??0)*Math.PI/180,lx=Math.cos(a)*fx,ly=Math.sin(a);
const q={x:p[0],y:p[1],k,dt,v,vx:v,vy,sp,dx:lx*c.co-ly*c.si,dy:lx*c.si+ly*c.co,c,k0:s.k0};
T.run(e,q,s);
if(T.light){const L=T.light(e,q,s);if(L&&G.fxL.length<60)G.fxL.push({x:q.x,y:q.y,r:L[0],a:L[1],col:L[2]})}
}}
}
