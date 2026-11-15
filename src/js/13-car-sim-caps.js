/* a drop of molten / leaking material leaves pixel k from the lowest open face of its column, carried by the car and the wind */
function dripFrom(c,k,m,hot){
if(PX.act.length>=CFG.maxActive*(G.q||1)*.9)return;
const w=c.w,i=k%w;let j=(k/w)|0;while(j<c.h-1&&c.mat[(j+1)*w+i])j++;
const p=toWorld(c,i+.5,j+1.2),pal=hot?(m===M.RUBBER?[70,30,24]:m===M.OIL?[60,30,50]:[200,190,170]):(m===M.OIL?[40,20,50]:[60,60,60]);
addActive(p[0],p[1],carVel(c)+(G.wind||0)*.3+rand(-4,4),rand(4,16),m,pal[0],pal[1],pal[2],hot?1.4:0,.05,c);
const a=PX.act[PX.act.length-1];if(a&&a.m===m)a.drip=1}
function simCar(c,dt,biome){
const w=c.w,n=c.n,mat=c.mat,fire=c.fire,hp=c.hp,rust=c.rust,wet=c.wet,wdec=biome==='lava'?3:biome==='acid'?.3:1;
let fires=0,fx=0,fy=0;
for(let k=0;k<n;k++){
const m=mat[k];if(!m)continue;
if(wet&&wet[k]>0){wet[k]-=dt*wdec;if(fire[k]>0)fire[k]=Math.max(0,fire[k]-dt*CFG.wetQuench);if(RUSTS[m]>0&&Math.random()<dt*.015)rust[k]=Math.min(1.2,rust[k]+.03)}
if(fire[k]>0){
fires++;fx+=k%w;fy+=(k/w)|0;const f=fire[k];
fire[k]=f+((FLAM[m]>.2?(1-f)*FLAM[m]*1.2:0)-DECAY[m])*dt;
if(fire[k]<=.02){fire[k]=0;continue}
{const a=BURN[m]*fire[k]*dt*c.mul[c.reg[k]]*CFG.burnMul*(G.dev.god?0:1);hp[k]-=a;G.tel.dmg.fire=(G.tel.dmg.fire||0)+a}
if(Math.random()<CFG.fireSpread*fire[k]*dt){const dir=(Math.random()*4)|0,i=k%w;let q=-1;
if(dir===0&&i>0)q=k-1;else if(dir===1&&i<w-1)q=k+1;else if(dir===2&&k>=w)q=k-w;else if(dir===3&&k+w<n)q=k+w;
if(q>=0&&mat[q]&&fire[q]===0&&!(wet&&wet[q]>0)&&Math.random()<FLAM[mat[q]]*CFG.flamMul)fire[q]=.3}
if(Math.random()<1.4*fire[k]*dt*SMOKEK[m]){const i=k%w,j=(k/w)|0,p=toWorld(c,i+.5,j+.5),sk=SMOKEK[m];
if(Math.random()<(sk>1?.85:.55))spawn(p[0],p[1],rand(-8,8),rand(-26,-12),rand(1.2,2.6)*(sk>1?1.6:1),MATS[m].smoke||[90,84,80],sk>1?3:2,'smoke');
else spawn(p[0],p[1],rand(-14,14),rand(-55,-25),rand(.5,1.2),[255,150,50],1,'ember',CFG.carEmberIgnite)}
if(DRIP[m]&&Math.random()<DRIP[m]*CFG.dripRate*fire[k]*dt){hp[k]-=MAXHP[m]*CFG.dripCost;dripFrom(c,k,m,true)}
if(hp[k]<=0){destroyPixel(c,k,0,0,'fire');continue}
}
if(rust[k]>0){
{const a=rust[k]*2.2*RUSTS[m]*dt*c.mul[c.reg[k]]*CFG.rustMul*(G.dev.god?0:1);hp[k]-=a;G.tel.dmg.corrosion=(G.tel.dmg.corrosion||0)+a}
if(rust[k]>.5&&Math.random()<.35*dt){const q=k+((Math.random()<.5)?(Math.random()<.5?1:-1):(Math.random()<.5?w:-w));if(q>=0&&q<n&&mat[q]&&RUSTS[mat[q]]>0)rust[q]=Math.min(1.2,rust[q]+.05)}
if(hp[k]<=0){destroyPixel(c,k,0,20,'rust');continue}
}
}
c.fires=fires;if(fires){c.fcx=fx/fires+.5;c.fcy=fy/fires+.5}
if(c.shedKs===undefined){c.shedKs=[];for(let k=0;k<n;k++)if(MATS[c.omat[k]].shed)c.shedKs.push(k)}
if(c.shedKs.length){const wa=(G.windAmp||.5)+Math.abs(carVel(c))/40+(biome==='acid'?1:0);let e=c.shedKs.length*.0012*wa*dt*CFG.shedMul;
while(e>0&&Math.random()<e){e-=1;const k=pick(c.shedKs);if(mat[k]&&MATS[mat[k]].shed)destroyPixel(c,k,(G.wind||0)*.4,-rand(5,20),'wind')}}
let drops=Math.random()<CFG.wear*dt*20?1:0;
if(biome==='acid')drops+=Math.floor(3*G.diff*.7+Math.random());
for(let d=0;d<drops;d++){const i=(Math.random()*w)|0;for(let j=0;j<c.h;j++){const k=j*w+i;if(mat[k]){if(RUSTS[mat[k]]>0)rust[k]=Math.min(1.2,rust[k]+(biome==='acid'?CFG.acidRust:.02));if(biome==='acid')fire[k]=0;break}}}
if(biome==='acid'&&fires)for(let k=0;k<n;k++)if(fire[k]>0)fire[k]=Math.max(0,fire[k]-.25*dt);
if(biome==='lava'&&Math.random()<dt*2){const k=(c.d.split*w)+((Math.random()*(c.h-c.d.split)*w)|0);if(k<n&&mat[k]){hp[k]-=20*c.mul[c.reg[k]];G.tel.dmg['lava heat']=(G.tel.dmg['lava heat']||0)+20;if(hp[k]<=0)destroyPixel(c,k,0,0,'fire')}}
}
function computeCaps(dry){
const cars=G.train.cars,K=CFG.cap,cap={cab:false,medic:0,fuel:K.base.fuel,crew:0,ammo:0,scrap:K.base.scrap,equip:K.base.equip,driver:false,traction:0,boost:1,ram:false,ramLvl:0,cannon:null,gunLvl:0,workshop:false,shopLvl:0,axleDrag:0,seatLvl:0,water:K.base.water||0,pump:0,pumpCar:null,crane:null,craneLvl:0};
const loco=cars[0];
for(const c of cars){const ro=c.d.roles;for(let r=0;r<8;r++){const R=ROLES[ro[r]];if(!R)continue;
if(c.alive[r]){if(R.on)R.on(cap,c.lvl[r],c,r,K)}else if(R.off)R.off(cap,c.lvl[r],c,r,K)}}
/* STORAGE law: capacity is counted from the container pixels that are still alive, wherever they are painted */
for(const c of cars){const S=(G.state==='play'&&c.as?c.as:ledger(c)).store;cap.fuel+=S.fuel+S.charge;cap.water+=S.water;cap.ammo+=S.ammo;cap.scrap+=S.scrap;cap.equip+=S.equip}
for(const k of ['fuel','water','ammo','scrap','equip'])cap[k]=Math.round(cap[k]);cap.boost=Math.min(cap.boost,2.6);
for(const c of cars){let dead=0;for(let r=4;r<8;r++)if(!c.alive[r])dead++;const was=c.derailed;c.derailed=dead>=3;
c.dside=Math.sign((c.alive[4]?0:1)+(c.alive[5]?0:1)-(c.alive[6]?0:1)-(c.alive[7]?0:1))*-1;
if(c.derailed){cap.axleDrag+=CFG.derailDrag;if(!was&&G.state==='play'){log(`${c.d.name} derailed — repair its ${isLoco(c)?'wheels':'axles'}`,'bad');sfx('crash',.8,c.ax);jolt(c,0,30,.04*(c.dside||1))}}
else if(was&&G.state==='play')log(`${c.d.name} back on the rails`,'good')}
seatCrew(cap,cars,dry);
const prev=G.caps;
const armDead=cars.find(c=>c.d.roles.some((ro,r)=>ro==='AMMO'&&!c.alive[r]));
if(!dry&&armDead&&prev.ammo!==undefined&&cap.ammo<prev.ammo&&G.res.ammo>cap.ammo){const c=armDead,cp=c.pts.cook||[c.w*.12,c.d.split*.6];const p=toWorld(c,cp[0],cp[1]);G.explQ.push({x:p[0],y:p[1],r:8,p:115,ign:.6,cause:'ammo cook-off'});log(`Ammo store cooked off! ${G.res.ammo-cap.ammo} rounds lost`,'bad')}
if(!dry)for(const k of ['scrap','ammo','equip','water']){if((G.res[k]||0)>cap[k]+1e-6){const lost=G.res[k]-cap[k];if(lost>=1&&k!=='ammo')log(`${Math.round(lost)} ${k} lost — storage destroyed`,'bad');G.res[k]=cap[k]}}
G.caps=cap;
}
