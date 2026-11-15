/* =====================================================================
   FLIGHT PHYSICS (v3.19) — flying units are driven by forces, like the train, and every force
   comes from a SECTION of the unit, so damage changes how it flies:
     ENGINE  thrust along the nose            WING   lift (grows with airspeed², stalls at high angle)
     ROTOR   lift along the body's up axis    TAIL   pitch control + weathervane stability
     CAB     the pilot: no pilot = no control inputs
   A section's share = how intact it is (0 when below CFG.disableAt, the same 50% rule as wagons).
   Mass and centre of mass come from the pixels that are still there (MATS mass); lift acts at the
   wings' centre, so losing the tail or a wing shifts the balance and the unit pitches over.
   Wind and gusts change the airspeed. Ground and train contacts are pixel collisions with damage
   from the impact speed — a hard landing is a crash, a soft one is a landing.
   The BRAIN of a unit only sets controls (throttle, target pitch, rotor collective) — like a pilot.
   ===================================================================== */
const AIR={
plane:{vTrim:90,vMax:135,accel:55,rotor:0,ctrl:9,damp:3.2,weather:2.2},
heli: {vTrim:0, vMax:75, accel:0, rotor:1.8,ctrl:7,damp:3.6,weather:.3},
drone:{vTrim:0, vMax:70, accel:0, rotor:2.1,ctrl:9,damp:4,  weather:.2},
mole: {vTrim:0, vMax:48, accel:45,rotor:0,  ctrl:8,damp:5,  weather:0},
tank: {vTrim:0, vMax:32, accel:36,rotor:0,  ctrl:6,damp:6,  weather:0},
};
function roleShare(c,role){let s=0,n=0;for(let r=0;r<8;r++)if(c.d.roles[r]===role){n++;if(c.alive[r])s+=c.regInt[r]}return n?s/n:0}
function airMassProps(c){
let m=0,mx=0,my=0,wx=0,wn=0,gear=0;const w=c.w;
for(let k=0;k<c.n;k++){const mt=c.mat[k];if(!mt)continue;if(mt===M.WHEEL)gear++;const pm=PMASS[mt]||1,i=k%w,j=(k/w)|0;m+=pm;mx+=pm*i;my+=pm*j;
const ro=c.d.roles[c.reg[k]];if(ro==='WING'||ro==='ROTOR'){wx+=i;wn++}}
c.am=Math.max(1,m)*.02;c.comX=m?mx/m:w/2;c.comY=m?my/m:c.h/2;c.gearPixels=gear;c.liftX=c.regCount===3?c.w/2:(wn?wx/wn:c.comX);
if(!c.am0){c.am0=c.am;const A=AIR[c.vkind];c.kL=A.vTrim?c.am0*CFG.airG/(A.vTrim*A.vTrim):0;c.Tmax=c.am0*A.accel;c.kD=(c.Tmax||c.am0*CFG.airG*.6)/(A.vMax*A.vMax);c.Rmax=c.am0*CFG.airG*A.rotor}}
function airInit(c){c.pitch=0;c.pr=0;c.ctl={thr:1,pitch:0,coll:0,drag:0};c.massT=0;c.gas=CFG.airFuelCap;c.scrap=c.scrap??CFG.airScrapCap;c.ammoPool=CFG.airAmmoCap*CFG.airShotsPerAmmo;airMassProps(c);c.fc={};airCaps(c)}
function airCaps(c){const f=c.fc||(c.fc={}),three=(c.regCount===3||c.d.roles.length===3);
if(three){const cb=roleShare(c,'CAB');f.pilot=cb>0;f.wing=cb;f.tail=cb;f.eng=roleShare(c,'ENGINE');f.rotor=cb*(.35+.65*f.eng);f.wpn=roleShare(c,'WEAPON')}
else{f.eng=roleShare(c,'ENGINE');f.wing=roleShare(c,'WING');f.tail=roleShare(c,'TAIL');f.rotor=roleShare(c,'ROTOR');f.pilot=c.d.roles.includes('CAB')?roleShare(c,'CAB')>0:true;f.wpn=1}
return f}
function airStep(c,dt){
const A=AIR[c.vkind],f=airCaps(c);if((c.massT-=dt)<=0){c.massT=.25;airMassProps(c)}
const m=c.am,fx=c.fx,th=c.pitch,cs=Math.cos(th),sn=Math.sin(th);
const nX=fx*cs,nY=-sn,uX=-fx*sn,uY=-cs;
const gust=Math.sin(G.t*1.7+c.id)*Math.sin(G.t*.53+c.id*2)*CFG.airGust;
const rx=c.vx-(G.wind||0),ry=c.vy-gust,sp=Math.hypot(rx,ry),vf=rx*nX+ry*nY;
const gam=Math.atan2(-ry,fx*rx||1e-6),aoa=clamp(wrapA(th-gam),-1.2,1.2);
let Fx=0,Fy=m*CFG.airG;
const own=!!c.carrierPlane,hasGas=!own||c.gas>0,T=(hasGas?(c.ctl.thr||0):0)*f.eng*c.Tmax;
if(own&&hasGas){const use=c.vkind==='plane'?(c.ctl.thr||0):(c.ctl.coll||0)*.8;c.gas=Math.max(0,c.gas-dt*CFG.gasBurn*use)}
Fx+=T*nX;Fy+=T*nY;
const rk=rollStep(c,dt);let L=0;if(c.kL){L=rk*f.wing*c.kL*Math.max(0,vf)*Math.max(0,vf)*(1+2.2*clamp(aoa,-.3,CFG.wingAoaMax));if(Math.abs(aoa)>CFG.wingStall)L*=.3;
let lx=uX,ly=uY;if(sp>5){lx=-ry/sp;ly=rx/sp;if(lx*uX+ly*uY<0){lx=-lx;ly=-ly}}Fx+=L*lx;Fy+=L*ly}
const R=(hasGas?(c.ctl.coll||0):0)*f.rotor*c.Rmax;Fx+=R*uX;Fy+=R*uY;
const kd=c.kD*(1+2.5*Math.abs(Math.sin(aoa))+(c.ctl.drag||0)*(CFG.airDragBrake/15)*f.eng);Fx-=kd*sp*rx;Fy-=kd*sp*ry;
c.vx+=Fx/m*dt;c.vy+=Fy/m*dt;
const auth=(f.pilot?1:0)*(c.vkind==='plane'?f.tail:f.rotor)*A.ctrl,I=Math.max(1,(c.w*c.w+c.h*c.h)/12*.02);
let acc;
if(c.player&&c.vkind==='plane'){const eff=clamp(Math.max(0,vf)*Math.max(0,vf)/(CFG.pilotCtrlV*CFG.pilotCtrlV),.08,1.15),cmd=c.ctl.rate||0;c.ctrlEff=eff;
const gd=c.gam0===undefined?0:clamp(wrapA(gam-c.gam0)/Math.max(dt,1e-3),-4,4);c.gam0=gam;
acc=cmd?auth*eff*(cmd*CFG.pilotAoa-aoa)-A.damp*1.2*(c.pr-gd)
:auth*eff*.8*(0-c.pr)-A.damp*.35*c.pr}
else acc=auth*(clamp(c.ctl.pitch||0,-1.4,1.4)-th)-A.damp*c.pr;
if(!(c.player&&c.vkind==='plane'&&c.ctl.rate))acc+=-A.weather*f.tail*(sp/60)*(sp/60)*clamp(wrapA(th-gam),-1,1);
acc+=((L+R)*(c.liftX-c.comX)*.06)/(m*I)*.4*(c.player&&c.vkind==='plane'?1-CFG.pilotTrim:1);
if(c.vkind!=='plane'&&f.tail<.5&&f.rotor>0)acc+=Math.sin(G.t*9+c.id)*8*(c.ctl.coll||0);
if(c.state==='down'||c.integrity<.65){
const sev=clamp((.68-c.integrity)/.38,0,1.4)+(c.state==='down'?.65:0);
acc+=(-.55-th)*sev*4.2+Math.sin(G.t*13+c.id)*sev*2.8;
if(c.state==='down'){
c.shedT=(c.shedT||.12)-dt;
if(c.shedT<=0){c.shedT=rand(.11,.24);shedConnectedMaterialCluster(c)}
}else if(sp>28&&Math.random()<dt*5*sev){
const k=(Math.random()*c.n)|0;if(c.mat[k]&&c.mat[k]!==M.WHEEL)destroyPixel(c,k,rand(-8,8),rand(-6,6),'hit');
}
if(c.state==='down'&&Math.random()<dt*22)spawn(c.cxw+rand(-6,6),c.cyw+rand(-3,3),c.vx*.55+rand(-10,10),c.vy*.45-rand(6,18),rand(.9,2.1),Math.random()<.35?[255,130,40]:[46,42,38],2,Math.random()<.35?'ember':'smoke');
}
c.pr+=acc*dt;c.pitch+=c.pr*dt;if(c.pitch>Math.PI)c.pitch-=2*Math.PI;if(c.pitch<-Math.PI)c.pitch+=2*Math.PI;
if(c.launchT>0)c.launchT-=dt;
c.ax+=c.vx*dt;c.ay+=c.vy*dt;c.ang=-c.fx*c.pitch;vehPose(c);
c.vf=vf;c.aoa=aoa;c.lw=(L+R)/(m*CFG.airG);c.thrN=c.Tmax?T/c.Tmax:0;c.liftN=L/(m*CFG.airG);c.rotN=R/(m*CFG.airG);
return airContacts(c,dt)}
function airSamples(c){
if(!c.samp||(c.sampT-=1)<=0){
c.sampT=15;c.samp=[];const seen=new Set();
for(let k=0;k<c.n;k+=3)if(c.mat[k]){c.samp.push(k);seen.add(k)}
for(let k=0;k<c.n;k++)if(c.mat[k]===M.WHEEL&&!seen.has(k)){c.samp.push(k);seen.add(k)}
}
return c.samp;
}
function airContacts(c,dt){
c.hitCool=(c.hitCool||0)-dt;let gearGround=null,gearDeep=-1,bodyGround=null,bodyDeep=-1;
for(const k of airSamples(c)){if(!c.mat[k])continue;const p=toWorld(c,k%c.w+.5,((k/c.w)|0)+.5),gy=groundY(p[0]);
if(p[1]>=gy-.5){const d=p[1]-gy;
if(c.mat[k]===M.WHEEL){if(!gearGround||d>gearDeep){gearGround=p;gearDeep=d}}
else if(!bodyGround||d>bodyDeep){bodyGround=p;bodyDeep=d}
continue}
if(c.hitCool<=0&&!(c.launchT>0)){const h=carAtPoint(p[0],p[1],true);if(h&&h[0]!==c){if(deckTouch(c,h[0],h[1]))return 'landed';const cv=carVel(h[0]),rv=Math.hypot(c.vx-cv,c.vy);
G.cause=`${c.vkind} collision`;damageCircle(p[0],p[1],4,Math.min(260,20+rv*c.am*1.4),.1,c.vx*.3,c.vy*.3);
if(c.state==='down'||rv>CFG.airCrash*(c.carrierPlane&&!h[0].enemy?3.5:2))return 'crash';
c.vx=cv+(c.vx-cv)*-.3;c.vy=-Math.abs(c.vy)*.35-25;c.hitCool=.35;sfx('crash',Math.min(1,rv/80),p[0]);G.shake+=Math.min(6,rv/20);break}}
}
if(c.integrity<CFG.carDeathAt)return 'crash';
const hasGear=(c.gearPixels||0)>0;
if(!gearGround&&bodyGround&&hasGear){
const vy=Math.max(0,c.vy),speed=Math.abs(c.vx),impact=Math.max(36,vy*2.2+speed*.32);
G.cause='belly strike — landing gear missed';damageCircle(bodyGround[0],bodyGround[1],3.2,impact,.12,c.vx*.14,-Math.max(8,vy*.25));
updateRegions(c);sfx('crash',Math.min(1,impact/80),bodyGround[0]);G.shake+=Math.min(5,impact/18);
c.ay-=Math.max(0,bodyDeep+.5);
if(c.state==='down'||c.integrity<CFG.planeDownAt||vy>CFG.landCrashVy*.7||!airCaps(c).pilot)return 'crash';
c.vy=-Math.max(8,vy*.35);c.pr*=-.35;c.pitch*=.72;vehPose(c);c.landed=false;c.hitCool=.25;return true;
}
let ground=gearGround||(!hasGear?bodyGround:null),deep=gearGround?gearDeep:bodyDeep;
if(!ground&&c.cyw>=groundY(c.cxw)-1){ground=[c.cxw,groundY(c.cxw)];deep=c.cyw-ground[1]}
if(ground){
const vy=c.vy,av=Math.abs(c.vx),pt=Math.abs(wrapA(c.pitch));
c.ay-=Math.max(0,deep+.5);
if(c.state==='down'||c.integrity<CFG.planeDownAt||!airCaps(c).pilot)return 'crash';
if(vy>CFG.landSafeVy||pt>CFG.landMaxPitch||!hasGear){
const exVy=Math.max(0,vy-CFG.landSafeVy)+Math.max(0,pt-CFG.landMaxPitch)*55+(!hasGear?14:0);
const dmg=exVy*1.85+av*(pt>CFG.landMaxPitch?.45:.08)+(!hasGear?24:0);
G.cause=hasGear?'hard landing':'belly landing (no WHEEL pixels)';damageCircle(ground[0],ground[1],3.5+Math.min(5,exVy/12),dmg,.15,c.vx*.2,-Math.abs(vy)*.3);
updateRegions(c);sfx('crash',Math.min(1,exVy/35),ground[0]);G.shake+=Math.min(6,exVy/10);
if(c.integrity<CFG.planeDownAt||vy>CFG.landCrashVy*1.35||!airCaps(c).pilot)return 'crash';
if(vy>CFG.landSafeVy*1.6){c.vy=-vy*.25;c.pitch*=.6;c.pr*=-.4;vehPose(c);return true}
}
if(c.vy>0)c.vy=0;
if(av>6){
const sc=av*CFG.landScrapeDmg*dt;G.cause='landing scrape';
damageCircle(ground[0],ground[1],2.2,sc*14,0,c.vx*.1,-8);
if(Math.random()<clamp(av/45,.15,.85)){spark(ground[0]+rand(-3,3),ground[1],-Math.sign(c.vx)*rand(15,55),rand(-35,-5),rand(.12,.3),[255,210,120],1);if(Math.random()<.25)sfx('tink',.25,ground[0])}
updateRegions(c);if(c.integrity<CFG.planeDownAt||!airCaps(c).pilot)return 'crash';
}
if(c.integrity<CFG.planeDownAt||!airCaps(c).pilot)return 'crash';
c.vx*=Math.pow(Math.max(.02,1-CFG.landBrake*.35),dt);if(Math.abs(c.vx)<2.2&&(c.ctl.thr||0)<.15)c.vx=0;
c.pr*=.4;c.pitch*=Math.pow(.08,dt);vehPose(c);c.landed=true;
}else c.landed=false;
return true;
}
