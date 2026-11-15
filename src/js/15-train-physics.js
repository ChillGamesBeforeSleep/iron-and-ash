/* =====================================================================
   PHYSICS
   ===================================================================== */
function trainPhysics(dt){
const tr=G.train,cars=tr.cars,cap=G.caps;
let Ms=0,slope=0;for(const c of cars){const m=c.d.mass*(.6+.4*c.integrity);Ms+=m;slope+=m*c.si}
const can=cap.driver&&G.res.fuel>0&&cap.traction>0;
const thr=can?G.throttle:0;
const F=thr*CFG.power*cap.traction*cap.boost;
tr.v+=(F-CFG.gravity*slope)/Ms*dt;
let roll=CFG.rolling+cap.axleDrag;if(G.brake)roll+=CFG.brake*(.35+.65*cap.traction);
const fr=(roll+CFG.airDrag*tr.v*tr.v)*dt;
if(Math.abs(tr.v)<=fr)tr.v=0;else tr.v-=Math.sign(tr.v)*fr;
if(can){const b=Math.abs(thr)*cap.traction*CFG.fuelBurn*(cap.boost>1?1.12:1)*dt;G.res.fuel=Math.max(0,G.res.fuel-b);G.tel.fuel+=b}
tr.x+=tr.v*dt;
const maxX=G.world.LEN+190;if(tr.x+cars[0].w/2>maxX){tr.x=maxX-cars[0].w/2;tr.v=Math.min(tr.v,0)}
G.stats.dist+=Math.abs(tr.v*dt);
for(let oi=G.obstacles.length-1;oi>=0;oi--){const o=G.obstacles[oi];
const front=tr.x+cars[0].w/2,last=cars[cars.length-1],rear=last.x-last.w/2;
if(tr.v>0&&front>o.x&&front<o.x+o.w*.6){impact(o,oi,cars[0],true,tr.v);break}
if(tr.v<0&&rear<o.x+o.w&&rear>o.x+o.w*.4){impact(o,oi,last,false,-tr.v);break}
}
if(G.brake&&Math.abs(tr.v)>12&&Math.random()<.6){for(const c of cars.slice(0,2))for(const wh of c.wheels){if(Math.random()<.25){const p=toWorld(c,wh.cx,wh.cy+wh.r);spawn(p[0],p[1],-Math.sign(tr.v)*rand(20,60),rand(-40,-5),rand(.2,.5),[255,210,120],1,'spark')}}}
}
function impact(o,oi,car,front,speed){
const tr=G.train,ram=front&&G.caps.ram;
const cpt=front?car.pts.couplerFront:car.pts.couplerRear,p=toWorld(car,front?car.w-2:2,cpt[1]-3);
if(speed>7){
sfx('crash',Math.min(1,speed/40));G.cause='collisions';damageCircle(p[0],p[1],3+speed/12,speed*2.4*(ram?.35-.08*G.caps.ramLvl:1),0,front?-30:30,-40);
o.hp-=speed*(ram?2.4+.6*G.caps.ramLvl:1.1)*2;G.shake+=speed/10;
tr.cars.forEach((c,i)=>jolt(c,(front?1:-1)*speed*(i===0?-.8:.55*(1-i/tr.cars.length)),-speed*.12,(front?-1:1)*speed*.0035));
for(let i=0;i<14;i++){const n=Math.random();addActive(o.x+rand(0,o.w),T(o.x)-rand(1,o.h),rand(-40,90)*(front?1:-1)+tr.v*.5,rand(-110,-20),o.kind==='rock'?M.STONE:M.SCRAP,96+n*40,88+n*34,78+n*28,0,0)}
if(o.hp<=0){G.obstacles.splice(oi,1);tr.v*=.6;log(ram?'Plough smashed through the obstacle':'Rammed through the obstacle','warn');
for(let i=0;i<o.w*o.h*.8;i++){const n=Math.random();addActive(o.x+rand(0,o.w),T(o.x)-rand(1,o.h),rand(-30,120)*(front?1:-1)+tr.v*.6,rand(-140,-30),o.kind==='rock'?M.STONE:M.SCRAP,96+n*40,88+n*34,78+n*28,0,0)}return}
log(`Hit an obstacle at ${Math.round(speed)} — reverse and ram, or send crew to clear it [E]`,'bad');
}
tr.v=front?-Math.min(8,speed*.15):Math.min(8,speed*.15);
tr.x=front?o.x-car.w/2-.5:tr.x+(o.x+o.w-(car.x-car.w/2))+.5;
}
function loosePhysics(dt){
for(const g of G.loose){let Ms=0,slope=0,drag=0;for(const c of g.cars){const m=c.d.mass;Ms+=m;slope+=m*c.si;for(let r=4;r<8;r++)if(!c.alive[r])drag+=1.4}
g.v-=CFG.gravity*slope/Ms*dt;const fr=(CFG.rolling*1.6+drag)*dt;if(Math.abs(g.v)<=fr)g.v=0;else g.v-=Math.sign(g.v)*fr;
g.a=lerp(g.a||0,(g.v-(g.pv??g.v))/Math.max(dt,1e-3),.3);g.pv=g.v;
g.x+=g.v*dt;if(g.x<40){g.x=40;g.v=0}motionTick(g.cars,g.a,g.v,dt);layout(g.cars,g.x)}
const cars=G.train.cars,last=cars[cars.length-1],rear=last.x-last.w/2;
for(let i=G.loose.length-1;i>=0;i--){const g=G.loose[i],f=g.cars[0],front=f.x+f.w/2,gap=rear-front;
if(gap<CFG.gap+.5){const rel=G.train.v-g.v;
if(Math.abs(rel)<CFG.coupleSpeed){cars.push(...g.cars);G.loose.splice(i,1);log(`Recoupled ${g.cars.length} car${g.cars.length>1?'s':''}`,'good');G.train.v=G.train.v*.8}
else{jolt(last,-rel*.4,-Math.abs(rel)*.1,.002*rel);jolt(f,rel*.4,-Math.abs(rel)*.1,-.002*rel);const p=toWorld(last,1,last.h-10);G.cause='collisions';damageCircle(p[0]-2,p[1],4,Math.abs(rel)*2,0);const vm=(G.train.v+g.v)/2;G.train.v=vm+rel*.1;g.v=vm-rel*.1;g.x=rear-CFG.gap-.6-f.w/2;log('Hard coupling — slow down to recouple','bad')}}}
}
