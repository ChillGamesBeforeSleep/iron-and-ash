/* =====================================================================
   ENTITIES: drones, shots, rocks, particles, crew
   ===================================================================== */
function spawn(x,y,vx,vy,life,col,size,kind,ign){
const p={x,y,vx,vy,life,max:life,col,cs:rgb(col),size,kind,ign:ign===true?.5:(ign||0)};
const cap=CFG.maxParticles*(G.q||1);if((kind==='smoke'||kind==='ash'||kind==='dust'||kind==='steam')&&G.parts.length>cap*.6&&Math.random()<.6)return;
if(G.parts.length>=cap){if(kind==='smoke'||kind==='rain'||kind==='ash'||kind==='dust'||kind==='steam'||kind==='twinkle')return;G.parts[(Math.random()*G.parts.length)|0]=p}else G.parts.push(p);
}
const spark=(x,y,vx,vy,l,c,s,k)=>spawn(x,y,vx,vy,l,c,s,k||'spark');
function spawnDrone(){if(CFG.pxDrones&&G.train){spawnAir('drone');return}
const bomber=G.leg>=2&&Math.random()<.3,fromLeft=Math.random()<.35;
G.drones.push({x:G.camX+(fromLeft?-20:S.W+20),y:G.camY+rand(15,50),vx:0,vy:0,hp:bomber?5:3,bomber,cool:rand(1,2),burst:0,ammo:Math.round(CFG.droneBursts+CFG.droneBurstsPerLeg*(G.leg-1)),off:rand(-40,40),ph:rand(0,6),tgt:null,dead:false});
}
function updateDrones(dt){
const cars=G.train.cars;
for(let i=G.drones.length-1;i>=0;i--){const d=G.drones[i];
if(d.dead){d.vy+=140*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.ph+=dt*9;
if(Math.random()<.7)spawn(d.x,d.y,rand(-10,10),rand(-20,0),rand(.5,1.2),Math.random()<.5?[255,140,50]:[80,76,72],Math.random()<.5?1:2,Math.random()<.5?'ember':'smoke');
const h=carAtPoint(d.x,d.y);
if(h||solidAt(d.x,d.y)){G.explQ.push({x:d.x,y:d.y,r:h?6:5,p:h?110:60,ign:.6,cause:'falling drones'});if(!h)dropSalvage(d.x,d.bomber?'bomber':'drone',d.bomber?'bomber wreck':'drone wreck');for(let q=0;q<(d.bomber?26:16);q++)addActive(d.x+rand(-3,3),d.y-2+rand(-1,1),d.vx*.4+rand(-60,60),rand(-120,-30),M.STEEL,70+Math.random()*40,72,76,Math.random()<.3?1.2:0,0);G.drones.splice(i,1)}continue}
if(d.ammo<=0&&d.burst<=0){d.vy-=60*dt;d.vx+=(d.x<G.train.cars[0].ax?-1:1)*40*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;if(d.y<G.camY-60||Math.abs(d.x-G.train.cars[0].ax)>S.W*1.5)G.drones.splice(i,1);continue}
{const walkers=outsideCrew();
if(d.hunt&&!walkers.includes(d.hunt))d.hunt=null;
if(!d.bomber&&!d.hunt&&walkers.length&&Math.random()<CFG.droneHunt*dt){d.hunt=pick(walkers);if(!G.huntMsg||G.t>G.huntMsg){G.huntMsg=G.t+8;log('A drone is hunting your looters — cover them!','bad')}}
if(d.hunt){const m=d.hunt,gy=baseY(m);d.ph+=dt;const tx=m.x+d.off*.5+Math.sin(d.ph*.7)*14,ty=gy-44+Math.sin(d.ph*1.3)*6;
d.vx+=((tx-d.x)*1.6-d.vx*1.3)*dt;d.vy+=((ty-d.y)*1.6-d.vy*1.3)*dt;const sp=Math.hypot(d.vx,d.vy),mx=95;if(sp>mx){d.vx*=mx/sp;d.vy*=mx/sp}
d.x+=d.vx*dt;d.y+=d.vy*dt;d.cool-=dt;
if(Math.hypot(m.x-d.x,gy-d.y)<150){if(d.cool<=0&&d.burst<=0&&d.ammo>0){d.burst=3;d.ammo--;d.cool=rand(1.8,3)/Math.sqrt(G.diff)}
if(d.burst>0&&(d.bt=(d.bt||0)-dt)<=0){d.burst--;d.bt=.12;sfx('shot',1,d.x);const a=Math.atan2(gy-4-d.y,m.x+.5-d.x)+rand(-.09,.09);G.shots.push({x:d.x,y:d.y,vx:Math.cos(a)*170,vy:Math.sin(a)*170,kind:'bullet',life:2})}}
continue}}
if(!d.tgt||!cars.includes(d.tgt))d.tgt=pick(cars);
const t=d.tgt;d.ph+=dt;
const tx=d.bomber?t.ax+G.train.v*.8:t.ax+d.off+Math.sin(d.ph*.7)*20,ty=(d.bomber?t.ay-105:t.ay-72)+Math.sin(d.ph*1.3)*8;
d.vx+=((tx-d.x)*1.6-d.vx*1.3)*dt;d.vy+=((ty-d.y)*1.6-d.vy*1.3)*dt;
const sp=Math.hypot(d.vx,d.vy),mx=95+Math.abs(G.train.v);if(sp>mx){d.vx*=mx/sp;d.vy*=mx/sp}
d.x+=d.vx*dt;d.y+=d.vy*dt;d.cool-=dt;
if(d.bomber){if(d.cool<=0&&Math.abs(d.x-t.ax)<14){G.shots.push({x:d.x,y:d.y+3,vx:d.vx*.5,vy:20,kind:'bomb',life:6});d.cool=rand(2.5,4);d.ammo--}}
else if(Math.hypot(t.ax-d.x,t.ay-d.y)<170){
if(d.cool<=0&&d.burst<=0&&d.ammo>0){d.burst=3;d.ammo--;d.cool=rand(1.6,2.8)/Math.sqrt(G.diff)}
if(d.burst>0&&(d.bt=(d.bt||0)-dt)<=0){d.burst--;d.bt=.12;sfx('shot',1,d.x);
const aim=toWorld(t,rand(4,t.w-4),rand(4,t.h-4)),a=Math.atan2(aim[1]-d.y,aim[0]+G.train.v*.4-d.x)+rand(-.07,.07);
G.shots.push({x:d.x,y:d.y,vx:Math.cos(a)*170,vy:Math.sin(a)*170,kind:'bullet',life:2});}}
}
}
function ricochet(s,hc,h){const m=hc[0].mat[hc[1]];if(!CFG.ricochet||!DEFLECT[m]||(s.ric||0)>=2||Math.random()>=DEFLECT[m])return false;
s.ric=(s.ric||0)+1;s.x-=s.vx*h*1.5;s.y-=s.vy*h*1.5;const cv=carVel(hc[0]);
s.vx=cv-(s.vx-cv)*rand(.35,.6)+rand(-25,25);s.vy=-Math.abs(s.vy)*rand(.3,.55)-rand(15,50);
for(let q=0;q<3;q++)spark(s.x,s.y,rand(-50,50),rand(-60,-10),rand(.1,.25),[255,230,170],1);sfx('tink',.8,s.x);G.tel.ricochets=(G.tel.ricochets||0)+1;return true}
function findSeekerTarget(x,y){
let best=null,bd=280;
for(const v of G.vehicles||[])if(v.enemy&&v.state!=='down'){const d=Math.hypot(v.cxw-x,v.cyw-y);if(d<bd){bd=d;best=[v.cxw,v.cyw]}}
for(const d of G.drones)if(!d.dead){const dd=Math.hypot(d.x-x,d.y-y);if(dd<bd){bd=dd;best=[d.x,d.y]}}
for(const r of G.raiders||[])if(r.alive){const ry=groundY(r.x)-4,dd=Math.hypot(r.x+.5-x,ry-y);if(dd<bd){bd=dd;best=[r.x+.5,ry]}}
return best}
function burstMolotov(x,y,vx){
sfx('break',.7,x);addLight(x,y,28,.9,.35,'255,140,40');
for(let i=0;i<18;i++){const a=rand(-2.8,-.3),sp=rand(18,75);addActive(x+rand(-2,2),y-1,vx*.2+Math.cos(a)*sp,Math.sin(a)*sp,i%3?M.FUEL:M.OIL,255,140+rand(-20,40),30,2.2,.05)}
G.cause='molotov fire';damageCircle(x,y,4.5,32,.95,vx*.15,-15);hitRaiders(x,y,6,26,'a molotov cocktail');
}
function updateShots(dt){
for(let i=G.shots.length-1;i>=0;i--){const s=G.shots[i];let dead=false;
const steps=s.kind==='shell'||s.sniper?3:2;
for(let st=0;st<steps&&!dead;st++){const h=dt/steps;
if(s.kind==='seeker'&&s.age<=2){const t=findSeekerTarget(s.x,s.y);if(t){const sp=Math.hypot(s.vx,s.vy)||170,cur=Math.atan2(s.vy,s.vx),want=Math.atan2(t[1]-s.y,t[0]-s.x),da=clamp(wrapA(want-cur),-5.5*h,5.5*h),na=cur+da;s.vx=Math.cos(na)*sp;s.vy=Math.sin(na)*sp}}
if(s.kind!=='bullet'&&!s.sniper&&s.kind!=='rpg'&&!(s.kind==='seeker'&&s.age<=2))s.vy+=(s.kind==='bomb'?130:s.kind==='grenade'||s.kind==='molotov'?115:55)*h;
s.x+=s.vx*h;s.y+=s.vy*h;s.life-=h;s.age=(s.age||0)+h;
if(s.kind==='shell'){
for(const d of G.drones)if(!d.dead&&Math.hypot(d.x-s.x,d.y-s.y)<7){G.explQ.push({x:s.x,y:s.y,r:10+2*(G.caps.gunLvl||0),p:80,ign:.3,cause:'friendly fire'});dead=true;break}
if(!dead&&G.raiders)for(const r of G.raiders){const gy=groundY(r.x);if(r.alive&&Math.abs(r.x+.5-s.x)<2.5&&s.y>gy-9&&s.y<gy+1){G.explQ.push({x:s.x,y:s.y,r:8,p:100,ign:.2,cause:'cannon'});dead=true;break}}
if(!dead&&s.age>.3&&structAt(s.x,s.y)&&Math.random()<.25){G.explQ.push({x:s.x,y:s.y,r:8,p:110,ign:.3,cause:'demolition'});dead=true}
if(!dead&&s.age>.18){const hc=carAtPoint(s.x,s.y);if(hc&&!ricochet(s,hc,h)){if(hc[0].enemy)G.explQ.push({x:s.x,y:s.y,r:8+2*(G.caps.gunLvl||0),p:120,ign:.4,cause:'cannon'});else{G.explQ.push({x:s.x,y:s.y,r:8,p:110,ign:.4,cause:'friendly fire'});log('Friendly fire!','bad')}dead=true}}
if(!dead&&solidAt(s.x,s.y)){G.explQ.push({x:s.x,y:s.y,r:8,p:90,ign:.2,cause:'friendly fire'});dead=true}
if(Math.random()<.5)spawn(s.x,s.y,0,0,.25,[200,190,160],1,'smoke');
} else if(s.kind==='rpg'||s.kind==='seeker'){
if(Math.random()<.75)spawn(s.x,s.y,-s.vx*.15+rand(-8,8),-s.vy*.15+rand(-8,8),.3,s.kind==='seeker'?[255,110,180]:[255,170,80],1.5,'smoke');
const foe=s.src==='raider';/* v3.43: a rocket fired BY the enemy explodes on your units, not on theirs */
if(!foe)for(const d of G.drones)if(!d.dead&&Math.hypot(d.x-s.x,d.y-s.y)<6.5){G.explQ.push({x:s.x,y:s.y,r:s.kind==='seeker'?9:8.5,p:s.kind==='seeker'?150:135,ign:.45,cause:s.why||'rocket'});dead=true;break}
if(!dead&&s.age>.06){const hv=carAtPoint(s.x,s.y);if(hv&&(foe?!hv[0].enemy:hv[0].enemy)){G.explQ.push({x:s.x,y:s.y,r:s.rad||(s.kind==='seeker'?9:8.5),p:s.pow||(s.kind==='seeker'?150:135),ign:.5,cause:s.why||'rocket'});dead=true;continue}}
if(!dead&&((!foe&&hitRaiders(s.x,s.y,3,s.dmg||95,s.why||'rocket'))||(foe&&hitWalker(s.x,s.y,2.5,60,'a raider rocket'))||solidAt(s.x,s.y)||structAt(s.x,s.y))){G.explQ.push({x:s.x,y:s.y,r:s.rad||(s.kind==='seeker'?9:8.5),p:s.pow||(s.kind==='seeker'?145:130),ign:.45,cause:s.why||'rocket'});dead=true}
} else if(s.kind==='grenade'){
if(hitRaiders(s.x,s.y,2.5,25,'a grenade')||solidAt(s.x,s.y)||(s.age>.1&&structAt(s.x,s.y))){G.explQ.push({x:s.x,y:s.y,r:6.5,p:105,ign:.25,cause:'grenade'});dead=true}
} else if(s.kind==='molotov'){
const hv=s.age>.06?carAtPoint(s.x,s.y):null;
if((hv&&hv[0].enemy)||hitRaiders(s.x,s.y,2.5,18,'a molotov cocktail')||solidAt(s.x,s.y)||(s.age>.1&&structAt(s.x,s.y))){burstMolotov(s.x,s.y,s.vx);dead=true}
} else if(s.kind==='pbullet'){
if((s.air||s.sniper)&&s.age>.04){const hv=carAtPoint(s.x,s.y);if(hv&&hv[0].enemy){G.cause=s.why||'aircraft cannon';damageCircle(s.x,s.y,s.sniper?2.2:1.6,s.sniper?88:62,.1,s.vx*.2,s.vy*.2);spark(s.x,s.y,rand(-30,30),rand(-40,-10),.25,[255,220,150],1);dead=true;continue}
for(const d of G.drones)if(!d.dead&&Math.abs(d.x-s.x)<4.5&&Math.abs(d.y-s.y)<3.5){d.hp-=s.sniper?4:1.5;if(d.hp<=0){d.dead=true;d.vy=-30;d.vx+=s.vx*.2;G.stats.kills++;G.tel.kills++}dead=true;break}if(dead)continue}
if(s.sniper&&Math.random()<.4)spawn(s.x,s.y,0,0,.15,[140,240,230],1,'spark');
if(hitRaiders(s.x,s.y,s.spear||s.sniper?2.2:1.4,s.dmg||CFG.looterDmg,s.why||'rifle fire')||solidAt(s.x,s.y))dead=true;
} else if(s.kind==='bomb'){
const hb0=carAtPoint(s.x,s.y,true),hb=hb0&&hb0[0]===s.own?null:hb0;if(hb&&ricochet(s,hb,h)){}else if(hb||solidAt(s.x,s.y)||structAt(s.x,s.y)){G.explQ.push({x:s.x,y:s.y,r:9,p:160,ign:.55,cause:s.src==='plane'?'plane bombs':'bombs'});dead=true}
} else {
const h2=carAtPoint(s.x,s.y,true);
if(h2&&ricochet(s,h2,h)){}
else if(h2){const m0=h2[0].mat[h2[1]];if(FLAM[m0]>=.5&&Math.random()<CFG.shotIgnite*FLAM[m0]){const c=h2[0],k=h2[1];c.fire[k]=Math.max(c.fire[k],.7);for(const q of[k-1,k+1,k-c.w,k+c.w])if(q>=0&&q<c.n&&c.mat[q]&&FLAM[c.mat[q]]>0)c.fire[q]=Math.max(c.fire[q],.5)}
sfx('tink',1,s.x);G.cause=s.why||(s.src==='raider'?'raider fire':s.src==='plane'?'plane gunfire':s.src==='heli'?'gunship fire':'drone gunfire');damageCircle(s.x,s.y,s.rad||(s.src==='raider'?1.2:1.6),s.dmg||(s.src==='raider'?CFG.raiderCarDmg:62),.07,s.vx*.2,s.vy*.2);spark(s.x,s.y,-s.vx*.2+rand(-30,30),rand(-50,-10),.3,[255,220,150],1);dead=true}
else if(hitWalker(s.x,s.y,1.4,s.wdmg||17,s.why||(s.src==='raider'?'raider fire':'drone fire'))){dead=true}
else if(structAt(s.x,s.y)&&Math.random()<.5){const kk=Math.floor(s.y)*PX.W+Math.floor(s.x);pxKick(kk,s.vx*.3,-rand(10,50),3);dead=true}
else if(solidAt(s.x,s.y)){const kk=Math.floor(s.y)*PX.W+Math.floor(s.x);if(PX.cells.has(kk))pxKick(kk,s.vx*.35,-rand(30,80),0);spark(s.x,s.y,rand(-20,20),rand(-40,-10),.3,[180,170,150],1);dead=true}
}
}
if(dead||s.life<=0)G.shots.splice(i,1);
}
}
function fireGun(aim){
const c=G.caps.cannon;if(!c){log('No working cannon — repair the ARMORED gun region','bad');return}
if(G.res.ammo<1){log('Out of ammo — craft with [F] at the workshop','bad');G.gunCool=.6;return}
const tp=c.pts.turret,bl=13*c.w/60,p=toWorld(c,tp[0],tp[1]),a=Math.atan2((aim?aim[1]:G.mouse.wy)-p[1],(aim?aim[0]:G.mouse.wx)-p[0]);
G.shots.push({x:p[0]+Math.cos(a)*bl,y:p[1]+Math.sin(a)*bl,vx:Math.cos(a)*CFG.shellSpeed+G.train.v,vy:Math.sin(a)*CFG.shellSpeed,kind:'shell',life:4});
G.res.ammo--;G.tel.ammoUsed++;sfx('gun');addLight(p[0]+Math.cos(a)*bl,p[1]+Math.sin(a)*bl,24,.9,.09,'255,220,150');G.gunCool=CFG.gunCooldown*(1-.2*G.caps.gunLvl)*(crewOnTrain()<=1?1.7:1);G.shake+=1.2;
for(let i=0;i<8;i++)spawn(p[0]+Math.cos(a)*(bl+1),p[1]+Math.sin(a)*(bl+1),Math.cos(a+rand(-.5,.5))*rand(30,90),Math.sin(a+rand(-.5,.5))*rand(30,90),rand(.1,.3),[255,220,140],1,'spark');
}
function structural(dt){for(const c of G.all){if(!c.dirty)continue;if((c.chkT-=dt)>0)continue;c.chkT=.08;c.dirty=0;detachCheck(c)}}
function addLight(x,y,r,i,life,col){if(G.lights.length<40)G.lights.push({x,y,r,i,life,max:life,col:col||'255,160,70'})}
function updateLights(dt){for(let i=G.lights.length-1;i>=0;i--){if((G.lights[i].life-=dt)<=0)G.lights.splice(i,1)}}
function glow(ctx,x,y,r,a,col){if(a<=.01||r<2)return;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${col},${Math.min(1,a)})`);g.addColorStop(.35,`rgba(${col},${Math.min(1,a)*.45})`);g.addColorStop(1,`rgba(${col},0)`);ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
function drawLights(ctx,cx,cy,W,H){
ctx.globalCompositeOperation='lighter';
if(G.world)for(const sg of G.world.segs){if(sg.type!=='lava'||sg.x1<cx||sg.x0>cx+W)continue;const x0=Math.max(sg.x0,cx)-cx,x1=Math.min(sg.x1,cx+W)-cx,gy=T(cx+W/2)-cy;
const g=ctx.createLinearGradient(0,gy-60,0,H);const a=.10+.04*Math.sin(G.t*1.7);g.addColorStop(0,'rgba(255,90,30,0)');g.addColorStop(.6,`rgba(255,90,30,${a})`);g.addColorStop(1,`rgba(255,120,40,${a*1.6})`);ctx.fillStyle=g;ctx.fillRect(x0,gy-60,x1-x0,H-gy+60)}
for(const c of G.all){const bl=glowBlobs(c);if(!bl)continue;for(const b of bl){let n=0;for(const k of b.ks)if(c.mat[k]===M.GLOW)n++;if(!n)continue;const p=toWorld(c,b.x,b.y);
glow(ctx,p[0]-cx,p[1]-cy,7+Math.sqrt(n)*3,Math.min(.5,.18+n*.03)*(.9+.1*Math.sin(G.t*2.6+b.x)),b.col)}}
for(const c of G.all){if(!c.fires)continue;const p=toWorld(c,c.fcx,c.fcy),f=c.fires;glow(ctx,p[0]-cx,p[1]-cy,14+Math.sqrt(f)*3.2,Math.min(.6,.14+f/180)*(.8+.2*Math.sin(G.t*23+c.id*3)),'255,140,50')}
for(const[bkey,b]of PX.bk)glow(ctx,bkey*16+8-cx,b[1]/b[0]-cy,10+Math.sqrt(b[0])*3,Math.min(.55,.12+b[0]/50)*(.8+.2*Math.sin(G.t*21+bkey)),'255,130,40');
for(const ch of G.chunks)if(ch.burn>0)glow(ctx,ch.x-cx,ch.y-cy,12,.25*(.8+.2*Math.sin(G.t*19+ch.n)),'255,140,50');
for(const l of G.lights)glow(ctx,l.x-cx,l.y-cy,l.r,l.i*l.life/l.max,l.col);
if(G.fxL)for(const l of G.fxL)glow(ctx,l.x-cx,l.y-cy,l.r,l.a,l.col);
const L=G.train&&G.train.cars[0];if(L&&G.state!=='title'&&L.pts.lamp&&lampAlive(L,L.pts.lamp)&&G.caps.driver){const p=toWorld(L,L.pts.lamp[0]+60,L.pts.lamp[1]);glow(ctx,p[0]-cx,T(p[0])-cy,34,.16,'255,236,180')}
ctx.globalCompositeOperation='source-over';
}
function explode(e){
if(e.r>=CFG.slowmoRadius&&CFG.slowmo)G.slow=Math.max(G.slow||0,CFG.slowmo);
addLight(e.x,e.y,e.r*5,1,.35);
for(const ch of G.chunks){const dx=ch.x-e.x,dy=ch.y-e.y,d=Math.hypot(dx,dy);if(d<e.r*3){const k=(1-d/(e.r*3))*e.p*(e.vx!==undefined?.45:1.1)/Math.sqrt(Math.max(6,ch.mass||ch.n));ch.vx+=dx/(d||1)*k+(e.vx||0)*.15;ch.vy+=dy/(d||1)*k-k*.35+(e.vy||0)*.1;ch.va+=rand(-1.8,1.8);ch.rest=false;ch.landed=false}}
sfx('boom',e.r/8,e.x);
if(e.y+e.r*1.2>=groundY(e.x)){craterGround(e.x,Math.max(e.y,groundY(e.x)+1),e.r,e.p,e.vx||0,e.vy||0,false)}
G.cause=e.cause||'explosions';damageCircle(e.x,e.y,e.r,e.p,e.ign,0,-40);pxBlast(e);
for(const d of G.drones)if(!d.dead){const dd=Math.hypot(d.x-e.x,d.y-e.y);if(dd<e.r+5){d.hp-=4*(1-dd/(e.r+5))+1;if(d.hp<=0){d.dead=true;d.vx+=(d.x-e.x)*4;d.vy=-40;G.stats.kills++;G.tel.kills++}}}
hitWalker(e.x,e.y,e.r+2,e.p*.35,'a blast');hitRaiders(e.x,e.y,e.r+2,e.p*.4,'a blast');
for(let i=0;i<e.r*4;i++){const a=rand(0,6.28),s=rand(30,140);spawn(e.x,e.y,Math.cos(a)*s,Math.sin(a)*s-30,rand(.2,.6),Math.random()<.5?[255,200,90]:[255,120,40],1,'spark')}
for(let i=0;i<e.r*1.5;i++)spawn(e.x+rand(-e.r,e.r)*.5,e.y+rand(-e.r,e.r)*.5,rand(-15,15),rand(-30,-5),rand(1,2.5),[96,90,84],3,'smoke');
G.shake+=e.r*.35;G.flash=Math.min(.6,G.flash+e.r*.02);
}
function spawnRock(){
const L=G.train.cars[0],x=L.ax+rand(-260,360)+G.train.v*1.2,r=rand(2,5.5);
for(let i=0;i<5;i++)spawn(x+rand(-6,6),G.camY+rand(0,10),rand(-5,5),rand(30,60),rand(.6,1),[120,108,92],1,'dust');
G.rocks.push({x,y:G.camY-10-rand(0,30),vx:rand(-15,15),vy:rand(0,30),r,col:[110+rand(-10,20),96,82],delay:.6});
}
function updateRocks(dt){
for(let i=G.rocks.length-1;i>=0;i--){const r=G.rocks[i];if(r.delay>0){r.delay-=dt;continue}
r.vy+=170*dt;r.x+=r.vx*dt;r.y+=r.vy*dt;let hit=null;
for(const [ox,oy] of [[0,r.r*.8],[r.r*.6,r.r*.4],[-r.r*.6,r.r*.4],[0,0]]){hit=carAtPoint(r.x+ox,r.y+oy);if(hit)break}
if(hit){sfx('thud',r.r/4,r.x);G.cause='rockfall';damageCircle(r.x,r.y+r.r*.5,r.r+2.5,70+r.r*28,.04,r.vx,-20);G.shake+=r.r*.4;burstRock(r);hitWalker(r.x,r.y,r.r+2);G.rocks.splice(i,1);continue}
if(hitWalker(r.x,r.y,r.r+1)){burstRock(r);G.rocks.splice(i,1);continue}
if(solidAt(r.x,r.y+r.r)){burstRock(r);if(r.r>=4.2&&Math.random()<(Math.abs(G.train.v)>3?.35:.08)){addObstacle(r.x-6,'rock');log('A boulder landed on the track ahead','warn')}G.rocks.splice(i,1)}}
}
function burstRock(r){for(let i=0;i<r.r*r.r*1.3;i++){const sh2=.75+Math.random()*.5;addActive(r.x+rand(-r.r,r.r),r.y+rand(-r.r,r.r),r.vx*.3+rand(-55,55),rand(-80,-5),M.STONE,r.col[0]*sh2,r.col[1]*sh2,r.col[2]*sh2,0,0)}}
function updateParticles(dt){
const P=G.parts;
for(let i=P.length-1;i>=0;i--){const p=P[i];p.life-=dt;if(p.life<=0){P[i]=P[P.length-1];P.pop();continue}
switch(p.kind){
case 'debris':p.vy+=150*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;{const gy=surfaceY(p.x);if(p.y>=gy){p.y=gy;p.vy*=-.3;p.vx*=.55;if(Math.abs(p.vy)<12){p.vy=0;p.life=Math.min(p.life,1.2)}}}break;
case 'spark':p.vy+=100*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;break;
case 'ember':p.vy+=(p.life>p.max*.5?-25:35)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
if(p.ign&&p.vy>0&&Math.random()<.5){if(igniteAt(p.x,p.y,p.ign)){p.life=0}}break;
case 'smoke':p.vx+=((G.wind||0)*.25-6-G.train.v*.02)*dt;p.vy-=4*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.size+=dt*2.2;break;
case 'steam':p.vx+=((G.wind||0)*.5-p.vx)*Math.min(1,dt*.8);p.vy-=12*dt;p.vy*=1-.8*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.size+=dt*5;break;
case 'dust':p.vx+=((G.wind||0)*.9-p.vx)*Math.min(1,dt*.8);p.vy+=6*dt;p.vy*=1-.7*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.size+=dt*.8;break;
case 'twinkle':p.x+=p.vx*dt;p.y+=p.vy*dt;break;
case 'arc':break;
case 'rain':p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.y>=groundY(p.x))p.life=0;break;
default:p.vy+=20*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
}}
}
function glowBlobs(c){
if(c.glowB!==undefined)return c.glowB;const cells=new Map();
for(let k=0;k<c.n;k++){const m=c.omat[k];if(!GLOWC[m])continue;const i=k%c.w,j=(k/c.w)|0,key=((j/6)|0)*1000+((i/6)|0);let b=cells.get(key);if(!b){b={x:0,y:0,ks:[],col:GLOWC[m].join(',')};cells.set(key,b)}b.x+=i+.5;b.y+=j+.5;b.ks.push(k)}
const out=[...cells.values()].map(b=>{b.x/=b.ks.length;b.y/=b.ks.length;return b});c.glowB=out.length?out:null;return c.glowB}
