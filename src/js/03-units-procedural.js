/* =====================================================================
   CAR DEFINITIONS + PROCEDURAL PIXEL ART
   (top row of 4 regions = function, bottom row = wheels/axles)
   ===================================================================== */
const ROLES={
CAB:     {short:'CAB', help:'Driver seat + a co-driver seat. Needs 1 crew; no cab, no driving.',up:'Armoured cab: −15% damage to this region',
on:(cap)=>{cap.cab=true;cap.crew+=CFG.cap.CAB}},
FUEL:    {short:'FUEL',help:'Fuel tank: every FUEL pixel in the unit holds fuel. Burns fast when hit.',up:'+40% fuel per pixel in this section'},
BOILER:  {short:'BOIL',help:'Engine work from the STEEL, COAL, OIL and WIRE pixels in this section adds power (the stock boiler: +30%). More power burns more fuel.',up:'+12% engine power',
on:(cap,lv,c,r)=>{cap.boost+=CFG.px.boilerBoost*c.as.regEng[r]/ledgerRef().boiler+.12*lv}},
RAM:     {short:'RAM', help:'Mod: plough. Cuts collision damage 65%.',up:'Stronger plough: less damage, breaks obstacles faster',
on:(cap,lv)=>{cap.ram=true;cap.ramLvl=Math.max(cap.ramLvl,lv)}},
WHEEL:   {short:'TRAC',help:'Traction from the WHEEL and RUBBER pixels in this section (the stock locomotive: 25% per section).',up:'Armoured wheel',
on:(cap,lv,c,r)=>{cap.traction+=.25*c.as.regGrip[r]/ledgerRef().grip}},
AXLE:    {short:'AXLE',help:'Broken axle drags the train.',up:'Armoured axle',
off:(cap)=>{cap.axleDrag+=1.4}},
SEATS:   {short:'SEAT',help:'Seats 4 crew (a seat box). Injured crew heal only with someone sharing their box. Extra crew stand inside.',up:'+1 seat; upgraded seats slowly recruit survivors',
on:(cap,lv,c,r,K)=>{cap.crew+=K.SEATS+lv;cap.seatLvl+=lv}},
AMMO:    {short:'AMMO',help:'Magazine: every AMMO pixel in the unit holds rounds. Explodes if destroyed loaded.',up:'+50% ammo per pixel in this section'},
CANNON:  {short:'GUN', help:'Turret. Click to fire.',up:'−20% reload, bigger blast',
on:(cap,lv,c)=>{if(!cap.cannon){cap.cannon=c;cap.gunLvl=lv}}},
WORKSHOP:{short:'SHOP',help:'[F] converts 1 scrap into 4 ammo.',up:'+2 ammo per scrap',
on:(cap,lv)=>{cap.workshop=true;cap.shopLvl=Math.max(cap.shopLvl,lv)}},
SCRAP:   {short:'SCRP',help:'Scrap hold: every SCRAP pixel in the unit holds scrap.',up:'+50% scrap per pixel in this section'},
STORE:   {short:'STOR',help:'Cargo: SCRAP pixels hold scrap, CLOTH pixels (tarps, kit bags) hold equipment.',up:'+50% scrap and equipment per pixel in this section'},
WATER:   {short:'WATR',help:'Cistern: every WATER pixel in the unit holds water. Park under a water tower to refill.',up:'+50% water per pixel in this section'},
PUMP:    {short:'PUMP',help:'Sprays water at fires; right-click aims the hose.',up:'Faster, wider spray, longer reach',
on:(cap,lv,c)=>{if(!cap.pumpCar){cap.pump=1+lv;cap.pumpCar=c}}},
BOOM:    {short:'BOOM',help:'Crane reach. Lifts wreckage, heaps and obstacles when slow. Needs a working WINCH.',up:'+30% crane reach',
on:(cap,lv,c)=>{const w=c.d.roles.findIndex((x,i)=>x==='WINCH'&&c.alive[i]);if(w>=0&&!cap.crane){cap.crane=c;cap.craneLvl=lv+c.lvl[w]}}},
WINCH:   {short:'WNCH',help:'Lifting speed.',up:'Faster lifting'},
OPER:    {short:'OPER',help:'Crane operator cab.',up:'Armoured operator cab'},
};
ROLES.MEDIC={short:'MED',help:'Bunks and a medic: 2 seats. Injured crew seated here (with company) heal much faster.',up:'+50% healing',on:(cap,lv)=>{cap.medic+=1+.5*lv;cap.crew+=2}};
ROLES.ENGINE={short:'ENGN',help:'Engine: thrust along the nose. Wrecked = no thrust, the plane glides.',up:'More thrust'};
ROLES.WING={short:'WING',help:'Wing: lift, growing with airspeed squared; stalls at steep angles. Lose it and it falls.',up:'More lift'};
ROLES.TAIL={short:'TAIL',help:'Tail: pitch control and stability (tail rotor on a helicopter). Lose it and it tumbles or spins.',up:'Steadier'};
ROLES.ROTOR={short:'ROTR',help:'Rotor: lift along the body\'s up axis; tilt it to move. Lose it and it drops.',up:'More lift'};
ROLES.MG={short:'MG',help:'Machine gun: bursts at the target.',up:'Faster bursts'};
ROLES.HULL={short:'HULL',help:'Plain structure: no job, it just soaks up hits and protects its neighbours.',up:'Thicker hull'};
ROLES.WEAPON={short:'WPN',help:'Forward heavy gun + bomb rack: shoots in a straight line. Its AMMO pixels are the magazine (1 ammo = 1 bomb or 10 gun shots).',up:'+1 ammo capacity, faster fire'};
ROLES.DECK={short:'DECK',help:'Flight deck: carries one aircraft or subterranean drill vehicle (click at 100% to launch, or to winch aboard in 2s when parked nearby).',up:'Faster re-arm, refuel & winch on deck',on:(cap,lv,c)=>{cap.carrier=c;cap.carrierLvl=(cap.carrierLvl||0)+lv}};
const ROLE_META={
WHEEL:   {group:'Running gear',need:{row:'bottom',mat:['WHEEL']},stat:()=>'traction ∝ WHEEL + RUBBER pixels (stock loco: 25% per section)'},
AXLE:    {group:'Running gear',need:{row:'bottom',mat:['WHEEL']},stat:()=>'carries the car · broken: +1.4 drag'},
CAB:     {group:'Control & power',need:{row:'top',mat:['CREW','GLASS']},stat:()=>`driver seat · +${CFG.cap.CAB} crew`},
BOILER:  {group:'Control & power',need:{row:'top'},stat:lv=>`power ∝ engine-work pixels (stock boiler +${Math.round(CFG.px.boilerBoost*100)}%)${lv?` · +${12*lv}% from upgrades`:''}`},
RAM:     {group:'Control & power',need:{row:'top',mat:['ARMOR','STEEL']},stat:()=>'plough: −65% collision damage'},
FUEL:    {group:'Storage',need:{row:'top',mat:['FUEL']},stat:lv=>`${CFG.px.fuel} fuel per FUEL pixel${lv?` · +${40*lv}% here`:''}`},
WATER:   {group:'Storage',need:{row:'top',mat:['WATER']},stat:lv=>`${CFG.px.water} water per WATER pixel${lv?` · +${50*lv}% here`:''}`},
AMMO:    {group:'Storage',need:{row:'top',mat:['AMMO'],pt:'cook'},stat:lv=>`${CFG.px.ammo} ammo per AMMO pixel${lv?` · +${50*lv}% here`:''} · explodes if broken while loaded`},
SCRAP:   {group:'Storage',need:{row:'top',mat:['SCRAP','STEEL']},stat:lv=>`${CFG.px.scrap} scrap per SCRAP pixel${lv?` · +${50*lv}% here`:''}`},
STORE:   {group:'Storage',need:{row:'top'},stat:lv=>`${CFG.px.scrap} scrap per SCRAP pixel, ${CFG.px.equip} equipment per CLOTH pixel${lv?` · +${50*lv}% here`:''}`},
SEATS:   {group:'Storage',need:{row:'top',mat:['CREW']},stat:lv=>`+${CFG.cap.SEATS+lv} crew seats`},
CANNON:  {group:'Tools',need:{row:'top',mat:['ARMOR','STEEL'],pt:'turret',train:['AMMO']},stat:lv=>`turret · reload −${20*lv}%`},
WORKSHOP:{group:'Tools',need:{row:'top',train:['SCRAP','STORE']},stat:lv=>`[F] 1 scrap → ${CFG.ammoPerScrap+2*lv} ammo`},
PUMP:    {group:'Tools',need:{row:'top',pt:'nozzle',train:['WATER']},stat:lv=>`auto-spray at fires + right-click hose · power ${1+lv}`},
BOOM:    {group:'Tools',need:{row:'top',pt:'hook',unit:['WINCH']},stat:()=>'crane: lifts wreckage & obstacles into scrap'},
WINCH:   {group:'Tools',need:{row:'top',unit:['BOOM']},stat:()=>'crane lifting speed'},
OPER:    {group:'Tools',need:{row:'top',mat:['CREW','GLASS']},stat:()=>'crane operator cab'},
MEDIC:   {group:'Storage',need:{row:'top',mat:['CREW','WOOD']},stat:lv=>`heals injured crew ${Math.round(CFG.healBase/CFG.healMedic*(1+.5*lv)*10)/10}× faster for the 2 crew seated here`},
ENGINE:  {group:'Flight',need:{mat:['WIRE','STEEL','ALU','OIL','COAL','BATTERY']},stat:()=>'thrust ∝ engine-work pixels (STEEL, WIRE, OIL, COAL, ALU, BATTERY) · tank = FUEL + BATTERY pixels'},
WING:    {group:'Flight',need:{},stat:()=>'lift ∝ airspeed², stalls past ~30°'},
TAIL:    {group:'Flight',need:{},stat:()=>'pitch control + stability'},
ROTOR:   {group:'Flight',need:{},stat:()=>'vertical lift, tilt to move'},
MG:      {group:'Flight',need:{},stat:()=>'machine-gun bursts'},
HULL:    {group:'Structure',need:{},stat:()=>'no job — armour and bulk'},
WEAPON:  {group:'Flight',need:{mat:['AMMO','STEEL']},stat:()=>`magazine = AMMO pixels × ${CFG.px.ammo} ammo (1 ammo = ${CFG.airShotsPerAmmo} shots or 1 bomb) · on a driller its hard pixels are the drill bite`},
DECK:    {group:'Tools',need:{row:'top',mat:['STEEL','ARMOR']},stat:()=>'carries & refuels 1 aircraft on the upper train deck (click at 100% to fly it)'},
};
for(const k in ROLE_META)Object.assign(ROLES[k],ROLE_META[k]);
const ROLE_SHORT={},ROLE_HELP={};for(const k in ROLES){ROLE_SHORT[k]=ROLES[k].short;ROLE_HELP[k]=ROLES[k].help}
const isLoco=c=>c.d.base==='loco';
const CARS={
loco:{base:'loco',name:'LOCOMOTIVE',w:72,h:34,split:22,mass:1.4,wheelR:5,roles:['CAB','FUEL','BOILER','RAM','WHEEL','WHEEL','WHEEL','WHEEL'],paint:paintLoco,pts:{smoke:[59,0],lamp:[68,5],couplerRear:[0,22],couplerFront:[71,22]}},
tender:{base:'wagon',name:'FUEL TENDER',w:60,h:30,split:20,mass:.85,wheelR:4,roles:['FUEL','FUEL','FUEL','FUEL','AXLE','AXLE','AXLE','AXLE'],paint:paintTender,pts:{couplerRear:[0,19],couplerFront:[59,19]}},
plane:{base:'air',name:'ATTACK PLANE',w:44,h:16,split:16,mass:.6,wheelR:2,roles:['CAB','ENGINE','WEAPON'],paint:paintPlane,pts:{nose:[43,8],bay:[20,13],couplerRear:[0,9],couplerFront:[43,9]}},
heli:{base:'air',name:'GUNSHIP',w:40,h:16,split:16,mass:.7,wheelR:2,roles:['CAB','ENGINE','WEAPON'],paint:paintHeli,spin:2,pts:{gun:[37,11],bay:[20,13],couplerRear:[0,8],couplerFront:[39,8]}},
drone:{base:'air',name:'DRONE',w:18,h:8,split:8,mass:.2,wheelR:1,roles:['CAB','ENGINE','WEAPON'],paint:paintPxDrone,spin:1,pts:{gun:[15,6],couplerRear:[0,4],couplerFront:[17,4]}},
carrier:{base:'wagon',name:'FLIGHT CARRIER',w:60,h:30,split:20,mass:1.05,wheelR:4,roles:['FUEL','DECK','DECK','DECK','AXLE','AXLE','AXLE','AXLE'],paint:paintCarrier,bay:'plane',pts:{couplerRear:[0,19],couplerFront:[59,19]}},
helipad:{base:'wagon',name:'HELIPAD',w:60,h:30,split:20,mass:1.0,wheelR:4,roles:['FUEL','DECK','DECK','DECK','AXLE','AXLE','AXLE','AXLE'],paint:paintHelipad,bay:'heli',pts:{couplerRear:[0,19],couplerFront:[59,19]}},
passenger:{base:'wagon',name:'CREW CAR',w:60,h:30,split:20,mass:.65,wheelR:4,roles:['SEATS','SEATS','SEATS','MEDIC','AXLE','AXLE','AXLE','AXLE'],paint:paintPassenger,pts:{couplerRear:[0,19],couplerFront:[59,19]}},
armored:{base:'wagon',name:'ARMORED',w:60,h:30,split:20,mass:1.0,wheelR:4,roles:['AMMO','CANNON','WORKSHOP','SCRAP','AXLE','AXLE','AXLE','AXLE'],paint:paintArmored,pts:{couplerRear:[0,19],couplerFront:[59,19],turret:[24,5.5],cook:[8,13]}},
cargo:{base:'wagon',name:'CARGO',w:60,h:30,split:20,mass:.75,wheelR:4,roles:['STORE','STORE','STORE','STORE','AXLE','AXLE','AXLE','AXLE'],paint:paintCargo,pts:{couplerRear:[0,19],couplerFront:[59,19]}},
water:{base:'wagon',name:'WATER TANKER',w:60,h:30,split:20,mass:.9,wheelR:4,roles:['WATER','WATER','PUMP','WATER','AXLE','AXLE','AXLE','AXLE'],paint:paintWater,pts:{couplerRear:[0,19],couplerFront:[59,19],nozzle:[41,1]}},
crane:{base:'wagon',name:'CRANE',w:60,h:30,split:20,mass:1.1,wheelR:4,roles:['STORE','WINCH','OPER','BOOM','AXLE','AXLE','AXLE','AXLE'],paint:paintCrane,pts:{couplerRear:[0,19],couplerFront:[59,19],hook:[56,3],store:[7,10]}},
driller:{base:'wagon',name:'EXCAVATOR RIG',w:60,h:30,split:20,mass:1.1,wheelR:4,roles:['FUEL','DECK','DECK','DECK','AXLE','AXLE','AXLE','AXLE'],paint:paintDriller,bay:'mole',pts:{couplerRear:[0,19],couplerFront:[59,19]}},
mole:{base:'air',vkind:'mole',name:'TUNNEL DRILLER',w:38,h:15,split:15,mass:.75,wheelR:2,roles:['CAB','ENGINE','WEAPON'],paint:paintMole,pts:{nose:[37,8],bay:[18,12],couplerRear:[0,8],couplerFront:[37,8]}},
tank:{base:'air',vkind:'tank',name:'RAIDER TANK',w:44,h:16,split:16,mass:1.2,wheelR:2,roles:['CAB','ENGINE','WEAPON'],paint:paintTank,pts:{gun:[42,5],couplerRear:[0,10],couplerFront:[43,10]}},
};
function brut(c,X,Y,rustAmt=.32,seamX=0,rivetY=-1){
const g1=hash2(X*3+7,Y*5+11)-.5,g2=hash2(X>>1,Y>>1)-.5,streak=Math.max(0,vnoise(X*.42,19)+.15)*clamp((Y%18)/14,0,1);
let r=c[0]*(1+g1*.18+g2*.1),g=c[1]*(1+g1*.16+g2*.1),b=c[2]*(1+g1*.14+g2*.1);
const ru=clamp((streak*.75+Math.max(0,hash2(X*5,Y*3)-.55)*1.1)*rustAmt,0,.78);
r=lerp(r,118+g1*28,ru);g=lerp(g,56+g1*16,ru);b=lerp(b,32+g1*10,ru);
if(seamX&&X%seamX===0){r*=.58;g*=.58;b*=.58}
if(rivetY>=0&&(Y===rivetY||Y===rivetY+1)&&X%4===1){const hi=Y===rivetY?1.38:.65;r*=hi;g*=hi;b*=hi}
return[clamp(r,8,255),clamp(g,8,255),clamp(b,8,255)]}
function painter(c,sx=1,sy=1){
const {w,h}=c,F=(f,X,Y)=>typeof f==='function'?f(X/sx,Y/sy,X,Y):f;
const raw=(X,Y,m,col)=>{if(X<0||Y<0||X>=w||Y>=h)return;const i=Y*w+X;c.mat[i]=m;c.col[i*3]=col[0];c.col[i*3+1]=col[1];c.col[i*3+2]=col[2];c.wid[i]=-1};
const span=(a,b,s)=>[Math.floor(a*s),Math.ceil((b+1)*s)-1];
const P={
px(x,y,m,col){x|=0;y|=0;const[X0,X1]=span(x,x,sx),[Y0,Y1]=span(y,y,sy);for(let Y=Y0;Y<=Y1;Y++)for(let X=X0;X<=X1;X++)raw(X,Y,m,F(col,X,Y))},
clear(x,y){const[X0,X1]=span(x,x,sx),[Y0,Y1]=span(y,y,sy);for(let Y=Y0;Y<=Y1;Y++)for(let X=X0;X<=X1;X++)if(X>=0&&Y>=0&&X<w&&Y<h)c.mat[Y*w+X]=0},
rect(x0,y0,x1,y1,m,f){const[X0,X1]=span(x0,x1,sx),[Y0,Y1]=span(y0,y1,sy);for(let Y=Y0;Y<=Y1;Y++)for(let X=X0;X<=X1;X++)raw(X,Y,m,F(f,X,Y))},
ellipse(cx,cy,rx,ry,m,f,keep){const CX=cx*sx,CY=cy*sy,RX=rx*sx,RY=ry*sy;for(let Y=Math.floor(CY-RY);Y<=Math.ceil(CY+RY);Y++)for(let X=Math.floor(CX-RX);X<=Math.ceil(CX+RX);X++){const dx=(X+.5-CX)/RX,dy=(Y+.5-CY)/RY;if(dx*dx+dy*dy<=1&&(!keep||keep(X/sx,Y/sy,X,Y)))raw(X,Y,m,F(f,X,Y))}},
wheel(cx,cy,r){const CX=cx*sx,CY=cy*sy,Rr=r*Math.min(sx,sy),id=c.wheels.length;c.wheels.push({cx:CX,cy:CY,r:Rr});
for(let Y=Math.floor(CY-Rr);Y<=Math.ceil(CY+Rr);Y++)for(let X=Math.floor(CX-Rr);X<=Math.ceil(CX+Rr);X++){const dx=X+.5-CX,dy=Y+.5-CY;if(dx*dx+dy*dy<=Rr*Rr&&X>=0&&Y>=0&&X<w&&Y<h){raw(X,Y,M.WHEEL,[96,90,82]);c.wid[Y*w+X]=id}}},
sil(x,y,slot){const[X0,X1]=span(x,x,sx),[Y0,Y1]=span(y,y,sy);for(let Y=Y0;Y<=Y1;Y++)for(let X=X0;X<=X1;X++)if(X>=0&&Y>=0&&X<w&&Y<h)c.sil[Y*w+X]=slot+1},
};
return P;
}
function paintLoco(P){
const DARK=[36,34,33],STEEL=[88,83,76],RUST=[118,58,38],BRASS=[148,116,66],CAB=[84,74,64],TANK=[78,72,58],BOIL=[66,64,60];
P.rect(1,21,70,23,M.STEEL,(x,y,X,Y)=>brut(sh(DARK,y<21.6?1.55:.92),X,Y,.45,10,31));
P.rect(3,5,19,20,M.ARMOR,(x,y,X,Y)=>{let k=1.12-.32*((x-3)/16);return brut(sh(CAB,k),X,Y,.48,14,10)});
P.rect(2,3,20,5,M.STEEL,(x,y,X,Y)=>brut(sh(DARK,y<3.8?1.8:1.1),X,Y,.3,0,-1));P.clear(2,3);P.clear(20,3);
P.rect(6,8,15,12,M.GLASS,(x,y,X,Y)=>((X+Y)%5===0)?[170,136,78]:[48,42,34]);
for(let y=9;y<=12;y++)for(let x=7;x<=14;x++){const dx=x+.5-10.5,dy=y+.5-10.2;if(dx*dx+dy*dy<2.4||(y>=11&&Math.abs(dx)<2.6))P.sil(x,y,0)}
P.rect(20,8,35,20,M.FUEL,(x,y,X,Y)=>{const c=y>=16&&y<=17.5?RUST:TANK;return brut(sh(c,cyl((y-8)/12)),X,Y,.52,12,14)});
P.clear(20,8);P.clear(35,8);P.clear(20,20);P.clear(35,20);
P.rect(25,6,30,8,M.STEEL,(x,y,X,Y)=>brut(BRASS,X,Y,.35));
P.rect(34,9,63,20,M.STEEL,(x,y,X,Y)=>{const band=Math.abs(x-40)<.7||Math.abs(x-48)<.7||Math.abs(x-56)<.7;return brut(sh(band?BRASS:BOIL,cyl((y-9)/11)),X,Y,band?.25:.44,0,26)});
P.rect(36,17,44,20,M.COAL,(x,y,X,Y)=>(X*7+Y*3)%5?[24,22,20]:[138,54,26]);
P.ellipse(45,9.5,3.8,3.6,M.STEEL,(x,y,X,Y)=>brut(sh(STEEL,cyl((y-6)/7)),X,Y,.4),(x,y)=>y<=9.5);
P.ellipse(52.5,10,2.4,2.4,M.STEEL,(x,y,X,Y)=>brut(sh(STEEL,cyl((y-7.8)/4.4)),X,Y,.4),(x,y)=>y<=10);
P.rect(57,1,61,9,M.STEEL,(x,y,X,Y)=>brut(sh(DARK,.65+1.05*Math.sin(Math.PI*clamp((x-56.5)/5,0,1))),X,Y,.5));
P.rect(55,0,63,1,M.STEEL,(x,y,X,Y)=>brut(sh(DARK,1.6),X,Y,.3));
P.rect(62,8,67,20,M.ARMOR,(x,y,X,Y)=>brut(sh(DARK,cyl((y-8)/12)*1.18),X,Y,.4,6,15));
P.rect(65,6,68,8,M.STEEL,DARK);
P.rect(66,4,69,6,M.LAMP,[255,214,128]);
P.rect(68,9,71,20,M.ARMOR,(x,y,X,Y)=>brut(((X+Y)%4<2)?RUST:STEEL,X,Y,.45));
P.rect(4,24,66,25,M.STEEL,(x,y,X,Y)=>brut(sh(DARK,.78),X,Y,.4,8,-1));
P.rect(49,22,56,25,M.STEEL,(x,y,X,Y)=>brut(sh(STEEL,cyl((y-22)/3)),X,Y,.35));
for(const cx of [10,27,44,60])P.wheel(cx,28.5,5);
for(let y=23;y<=32;y++){const x0=Math.round(65+(y-23)*.6);for(let x=x0;x<=71;x++)if((x+y)%2===0||x===x0||y>=31)P.px(x,y,M.ARMOR,(x2,y2,X,Y)=>brut(sh(RUST,.95),X,Y,.5))}
P.rect(0,20,2,24,M.RUBBER,(x,y,X,Y)=>brut([36,34,32],X,Y,.2));
P.rect(69,20,71,23,M.ARMOR,(x,y,X,Y)=>brut(RUST,X,Y,.4));
}
function wagonBase(P){
const DARK=[38,36,34],BOG=[58,54,50];
P.rect(1,18,58,20,M.STEEL,(x,y,X,Y)=>brut(sh(DARK,y<18.7?1.65:.95),X,Y,.42,10,27));
P.rect(0,18,1,20,M.RUBBER,[32,30,28]);P.rect(58,18,59,20,M.RUBBER,[32,30,28]);
P.rect(3,21,26,23,M.STEEL,(x,y,X,Y)=>brut(sh(BOG,(X%4===0)?1.25:.85),X,Y,.45,6,-1));
P.rect(33,21,56,23,M.STEEL,(x,y,X,Y)=>brut(sh(BOG,(X%4===0)?1.25:.85),X,Y,.45,6,-1));
P.rect(11,23,18,25,M.STEEL,(x,y,X,Y)=>brut([72,66,58],X,Y,.5));
P.rect(41,23,48,25,M.STEEL,(x,y,X,Y)=>brut([72,66,58],X,Y,.5));
for(const cx of [7.5,21.5,37.5,51.5])P.wheel(cx,25.5,4);
}
function paintPlane(P){
const OL=[76,82,58],DK=[44,48,36],BL=[138,144,148],RED=[168,42,34];
P.rect(4,6,38,10,M.ALU,(x,y,X,Y)=>{if(Math.abs(x-12)<1.6&&Math.abs(y-8)<1.6)return RED;return brut(sh(OL,cyl((y-5.5)/5)),X,Y,.38,11,10)});
P.rect(38,7,41,9,M.ALU,(x,y,X,Y)=>brut(sh(OL,1.08),X,Y,.4));P.rect(42,8,42,8,M.ALU,DK);
P.rect(1,1,7,5,M.STEEL,(x,y,X,Y)=>brut(sh(OL,y<3?1.18:.95),X,Y,.42,6,-1));P.rect(1,5,8,6,M.STEEL,DK);
P.rect(13,10,31,11,M.ALU,(x,y,X,Y)=>brut(sh(DK,y<10.5?1.35:.9),X,Y,.35,8,-1));
P.rect(24,3,32,5,M.GLASS,(x,y,X,Y)=>(X%4===0)?[68,72,60]:((X+Y)%5===0)?[168,186,192]:[48,62,70]);
P.rect(16,7,22,9,M.FUEL,(x,y,X,Y)=>brut([118,96,54],X,Y,.45));
P.rect(33,8,35,9,M.AMMO,(x,y,X,Y)=>brut([88,92,52],X,Y,.3));
P.rect(37,7,39,9,M.WIRE,(x,y,X,Y)=>(X+Y)%2?[136,78,50]:[86,54,40]);
P.rect(36,10,39,10,M.OIL,[34,28,24]);
P.wheel(24.5,12.5,.75);
for(let y=2;y<=13;y++)P.px(43,y,M.ALU,(x2,y2,X,Y)=>Y%3?BL:[196,198,200]);
P.rect(17,12,19,13,M.AMMO,[54,58,46]);P.rect(22,12,24,13,M.AMMO,[54,58,46]);
P.px(2,1,M.GLOW,[255,70,50]);
}
function paintHeli(P){
const OL=[68,76,54],DK=[40,44,34];
P.rect(1,0,39,0,M.STEEL,(x,y,X)=>X%5<3?[136,134,128]:[88,86,82]);P.rect(19,1,20,2,M.STEEL,DK);
P.rect(8,3,34,9,M.STEEL,(x,y,X,Y)=>brut(sh(OL,cyl((y-2.5)/7)),X,Y,.42,10,6));
P.rect(18,3,24,4,M.WIRE,(x,y,X,Y)=>(X+Y)%2?[138,82,52]:[90,58,40]);
P.rect(26,4,34,8,M.GLASS,(x,y,X,Y)=>(X%4===0)?[58,64,50]:((X+Y)%5===0)?[162,184,190]:[44,58,66]);
P.rect(34,6,37,9,M.ARMOR,(x,y,X,Y)=>brut(sh(OL,1.05),X,Y,.4));
P.rect(0,5,9,6,M.STEEL,(x,y,X,Y)=>brut(sh(OL,.92),X,Y,.45,6,-1));P.rect(0,2,2,8,M.STEEL,(x,y,X,Y)=>Y%2?[132,130,124]:[82,80,76]);
P.rect(13,6,19,8,M.FUEL,(x,y,X,Y)=>brut([120,98,56],X,Y,.4));P.rect(34,10,38,11,M.AMMO,[76,80,50]);
P.rect(8,9,33,9,M.KEVLAR,(x,y,X,Y)=>brut(sh(DK,.92),X,Y,.35));P.rect(10,4,11,5,M.BATTERY,[64,84,90]);P.rect(20,5,24,5,M.OIL,[36,30,26]);
P.rect(12,10,13,12,M.STEEL,DK);P.rect(27,10,28,12,M.STEEL,DK);P.rect(8,13,32,13,M.RUBBER,[34,34,34]);
P.wheel(12.5,12.5,.65);P.wheel(27.5,12.5,.65);
P.px(1,1,M.GLOW,[255,70,50]);
}
function paintPxDrone(P){
P.rect(0,0,6,0,M.STEEL,[136,132,124]);P.rect(11,0,17,0,M.STEEL,[136,132,124]);P.rect(2,1,3,1,M.STEEL,[76,74,70]);P.rect(14,1,15,1,M.STEEL,[76,74,70]);
P.rect(3,2,14,5,M.ARMOR,(x,y,X,Y)=>brut([68,66,60],X,Y,.45,5,-1));P.rect(6,3,9,4,M.WIRE,[116,72,50]);P.rect(10,3,11,4,M.BATTERY,[64,84,90]);P.px(13,3,M.GLOW,[255,42,32]);P.rect(4,3,5,4,M.AMMO,[86,88,52]);P.rect(12,4,13,5,M.AMMO,[86,88,52]);P.rect(12,6,16,6,M.STEEL,[48,46,44]);
}
function paintPassenger(P){
const BODY=[92,84,74],ROOF=[52,49,46],DARK=[38,36,34],BONE=[186,178,162],RED=[166,42,34];
P.rect(1,5,58,17,M.STEEL,(x,y,X,Y)=>{
if(x>=45.5&&x<=51.5&&y>=7.5&&y<=13.5){const cx=Math.abs(x-48.5),cy=Math.abs(y-10.5);if(cx<.85&&cy<2.3||cy<.85&&cx<2.3)return brut(RED,X,Y,.25);if(cx<2.6&&cy<2.6)return brut(BONE,X,Y,.3)}
let k=(Y===8||Y===14)?1.22:(Y>14?.82:1);return brut(sh(BODY,k),X,Y,.46,15,8)});
P.rect(1,15,58,16,M.STEEL,(x,y,X,Y)=>brut(sh(DARK,1.25),X,Y,.4,10,-1));
P.rect(2,2,57,4,M.STEEL,(x,y,X,Y)=>brut(sh(ROOF,y<2.8?1.65:y<3.6?1.2:.82),X,Y,.38,12,-1));P.clear(2,2);P.clear(57,2);
for(const vx of [8,22,36,50])P.rect(vx,1,vx+3,1,M.STEEL,(x,y,X,Y)=>brut(sh(DARK,1.4),X,Y,.3));
P.rect(3,6,5,15,M.STEEL,(x,y,X,Y)=>brut(sh(DARK,1.15),X,Y,.4));P.rect(54,6,56,15,M.STEEL,(x,y,X,Y)=>brut(sh(DARK,1.15),X,Y,.4));
P.px(0,6,M.GLOW,[255,196,116]);P.px(59,6,M.GLOW,[255,196,116]);
for(let r=0;r<4;r++){
const x0=r*15+4;if(r===3){P.rect(x0,8,x0+3,11,M.GLASS,(x,y,X,Y)=>((X+Y)%5===0)?[112,126,128]:[38,46,48]);continue}
P.rect(x0,7,x0+8,12,M.GLASS,(x,y,X,Y)=>(X===Math.round((x0+4)*1.66))?[48,44,40]:((X-Y+40)%6===0)?[118,124,116]:[42,46,44]);
for(let s=0;s<2;s++){const hx=x0+2.4+s*3.6;for(let y=8;y<=12;y++)for(let x=x0;x<=x0+8;x++){const dx=x+.5-hx,dy=y+.5-9.4;if(dx*dx+dy*dy<1.8||(y>=11&&Math.abs(dx)<1.7))P.sil(x,y,1+r*2+s)}}
}
wagonBase(P);
}
function paintTender(P){
const TANK=[88,78,66],RUST=[124,64,38],DARK=[42,40,38];
P.rect(6,3,53,4,M.STEEL,(x,y,X,Y)=>brut([62,58,52],X,Y,.4));
for(let y=4;y<=17;y++)for(let x=2;x<=57;x++){
const ex=x<6?(6-x)/4.5:x>53?(x-53)/4.5:0,ey=(y-10.5)/6.8;if(ex>0&&ex*ex+ey*ey>1)continue;
const seam=Math.abs(x-15)<.6||Math.abs(x-29.5)<.6||Math.abs(x-44)<.6,lad=x>=28&&x<=31&&(y%2===0||Math.abs(x-28)<.5||Math.abs(x-31)<.5);
let c=seam||lad?DARK:TANK,m=seam||lad?M.STEEL:M.FUEL;
P.px(x,y,m,(x2,y2,X,Y)=>brut(sh(c,cyl((y-4)/13)),X,Y,seam?.25:.58,0,10));
}
P.rect(26,1,33,4,M.STEEL,(x,y,X,Y)=>brut(sh(RUST,y<2?1.3:.95),X,Y,.5));
P.rect(36,12,43,16,M.STEEL,(x,y,X,Y)=>brut([56,52,48],X,Y,.45,4,-1));
wagonBase(P);
}
function paintArmored(P){
const AR=[78,76,70],DARK=[36,35,34],CRATE=[88,84,54];
for(let y=7;y<=17;y++){const inset=Math.max(0,Math.round((10-y)*.85));for(let x=1+inset;x<=58-inset;x++){P.px(x,y,M.ARMOR,(x2,y2,X,Y)=>brut(sh(AR,cyl((y-5)/14)),X,Y,.44,16,13))}}
{const mag=(x,y,X,Y)=>{let c=CRATE;if(Math.abs(x-8.5)<.6||Math.abs(y-13)<.6||x<2.7||x>15.3||y<8.7||y>17.3)c=[44,42,30];return brut(c,X,Y,.35)};P.rect(2,9,15,17,M.AMMO,mag);P.rect(4,7,15,8,M.AMMO,mag)}
for(const r of [1,2,3])P.rect(r*15+4,11,r*15+8,12,M.ARMOR,[16,16,16]);
P.ellipse(24,8,8.5,5.5,M.ARMOR,(x,y,X,Y)=>brut(sh(AR,cyl((y-2.5)/6)*1.12),X,Y,.42,10,-1),(x,y)=>y<=8);
P.rect(36,1,38,7,M.STEEL,(x,y,X,Y)=>brut(sh(DARK,.85+.6*Math.sin(Math.PI*clamp((x-35.5)/3,0,1))),X,Y,.4));
P.rect(34,11,41,14,M.LAMP,(x,y,X,Y)=>[245,118+((X*7+Y*3)%5)*14,42]);
for(let x=45;x<=57;x++){const top=Math.round(5+3*hash2(x,77)+(x<47||x>55?2:0));for(let y=top;y<=9;y++){const hh=hash2(x,y*3);const c=hh<.33?[136,64,38]:hh<.66?[92,86,78]:[54,50,46];P.px(x,y,M.SCRAP,(x2,y2,X,Y)=>brut(c,X,Y,.5))}}
wagonBase(P);
}
function paintWater(P){
const T=[64,86,106],DARK=[42,44,48];
P.rect(6,3,53,4,M.STEEL,(x,y,X,Y)=>brut(DARK,X,Y,.35));
for(let y=4;y<=17;y++)for(let x=2;x<=57;x++){
const ex=x<6?(6-x)/4.5:x>53?(x-53)/4.5:0,ey=(y-10.5)/6.8;if(ex>0&&ex*ex+ey*ey>1)continue;
const seam=Math.abs(x-16)<.6||Math.abs(x-44)<.6,lad=x>=22&&x<=24.5&&(y%2===0||Math.abs(x-22)<.5||Math.abs(x-24.5)<.5);
let c=seam||lad?DARK:T,m=seam||lad?M.STEEL:M.WATER;
P.px(x,y,m,(x2,y2,X,Y)=>brut(sh(c,cyl((y-4)/13)),X,Y,.48,0,11));
}
P.rect(32,1,43,4,M.STEEL,(x,y,X,Y)=>brut([118,52,38],X,Y,.45));
P.rect(40,0,43,1,M.STEEL,[168,164,154]);
P.rect(35,2,37,3,M.LAMP,[110,188,240]);
wagonBase(P);
}
function paintCrane(P){
const CAB=[84,78,70],BOOM=[164,126,42],D=[38,36,34];
P.rect(1,14,58,17,M.STEEL,(x,y,X,Y)=>brut(sh(D,y<14.8?1.5:1),X,Y,.42,8,-1));
P.rect(2,7,14,14,M.STEEL,(x,y,X,Y)=>brut((x<3||x>13||y>13)?[76,72,66]:[52,48,44],X,Y,.45,5,-1));
for(let x=3;x<=13;x++){const t=Math.round(9+2*hash2(x,41));for(let y=t;y<=13;y++)P.px(x,y,M.SCRAP,(x2,y2,X,Y)=>brut(hash2(X,Y)<.5?[134,66,40]:[88,84,76],X,Y,.5))}
P.ellipse(20,10.5,4,4,M.STEEL,(x,y,X,Y)=>brut(sh([126,102,52],cyl((y-6.5)/8)),X,Y,.4));
P.rect(16,5,39,14,M.STEEL,(x,y,X,Y)=>brut(CAB,X,Y,.46,12,8));
P.rect(20,7,23,11,M.GLASS,[42,48,50]);P.rect(31,7,36,10,M.GLASS,(x,y,X,Y)=>((X-Y+40)%5===0)?[130,146,148]:[38,46,50]);
P.rect(40,10,48,14,M.ARMOR,(x,y,X,Y)=>brut([56,56,52],X,Y,.4));
for(let t=0;t<=1;t+=.01){const x=34+t*23,y=10-t*8;const stripe=((Math.round(t*36))%4<2);P.px(x,y,M.STEEL,(x2,y2,X,Y)=>brut(stripe?BOOM:[36,34,32],X,Y,.35));P.px(x,y+1,M.STEEL,(x2,y2,X,Y)=>brut(stripe?sh(BOOM,.82):[30,28,26],X,Y,.35))}
P.rect(55,2,57,8,M.STEEL,[110,104,96]);
wagonBase(P);
}
function paintCarrier(P){
const D=[68,66,60],Y=[168,138,48];
P.rect(2,7,13,17,M.FUEL,(x,y,X,Y)=>brut(sh([104,84,54],cyl((y-7)/10)),X,Y,.48,6,-1));P.clear(2,7);P.clear(13,7);P.clear(2,17);P.clear(13,17);
P.rect(1,13,58,17,M.STEEL,(x,y,X,Y)=>{if(y<13.8&&(x>=18&&x<=54)&&X%6<3)return brut(Y,X,Y,.3);return brut(sh(D,y<14?1.35:.9),X,Y,.45,8,20)});
for(const x of [4,16,30,44,56])P.rect(x,8,x+1,13,M.STEEL,(x2,y2,X,Y)=>brut(sh(D,1.22),X,Y,.4));
P.rect(54,8,56,10,M.GLOW,[240,110,50]);
wagonBase(P);
}
function paintHelipad(P){
const D=[66,68,64],Y=[172,144,52];
P.rect(2,7,13,17,M.FUEL,(x,y,X,Y)=>brut(sh([104,84,54],cyl((y-7)/10)),X,Y,.48,6,-1));P.clear(2,7);P.clear(13,7);P.clear(2,17);P.clear(13,17);
P.rect(1,13,58,17,M.STEEL,(x,y,X,Y)=>{if(y<13.8&&(x===22||x===50||(x>=33&&x<=39&&x!==35&&x!==37)))return brut(Y,X,Y,.3);return brut(sh(D,y<14?1.32:.88),X,Y,.45,8,20)});
P.rect(2,8,7,13,M.ARMOR,(x,y,X,Y)=>brut(D,X,Y,.45));P.rect(52,8,57,13,M.ARMOR,(x,y,X,Y)=>brut(D,X,Y,.45));
P.rect(56,5,56,11,M.STEEL,D);P.rect(57,5,58,7,M.CLOTH,[196,98,46]);
P.rect(17,12,18,12,M.GLOW,[110,210,130]);P.rect(55,12,55,12,M.GLOW,[110,210,130]);
wagonBase(P);
}
function paintCargo(P){
const W=[78,72,64];
P.rect(1,10,58,17,M.STEEL,(x,y,X,Y)=>brut(sh(W,y<10.8?1.4:.92),X,Y,.48,7,18));
const crate=(x0,y0,x1,y1)=>{const col=(x,y,X,Y)=>{let c=[118,84,50];if(x<=x0+.6||x>=x1-.6||y<=y0+.6||y>=y1-.6||Math.abs((x-x0)-(y-y0))<.7)c=[72,50,30];return brut(c,X,Y,.32)};P.rect(x0,y0,x1,y1,M.WOOD,col);P.rect(x0+1,y0+1,x1-1,y1-1,M.SCRAP,col)};
crate(3,3,11,9);crate(12,5,18,9);crate(20,3,27,9);crate(46,3,53,9);
P.rect(3,2,11,3,M.CLOTH,(x,y,X,Y)=>brut([72,82,62],X,Y,.25));P.rect(20,2,27,3,M.CLOTH,(x,y,X,Y)=>brut([68,78,58],X,Y,.25));
P.rect(29,3,34,9,M.FUEL,(x,y,X,Y)=>brut(sh([138,52,36],cyl((x-29)/5)),X,Y,.4));
P.rect(35,4,39,9,M.FUEL,(x,y,X,Y)=>brut(sh([52,78,104],cyl((x-35)/4)),X,Y,.4));
for(let x=40;x<=45;x++){const top=Math.round(4+3*hash2(x,31));for(let y=top;y<=9;y++)P.px(x,y,M.SCRAP,(x2,y2,X,Y)=>brut([112,62,40],X,Y,.5))}
wagonBase(P);
}
function paintDriller(P){
const D=[68,64,58],Y=[184,138,44],RUST=[124,62,38];
P.rect(2,6,14,17,M.FUEL,(x,y,X,Y)=>brut(sh([108,82,50],cyl((y-6)/11)),X,Y,.5,5,9));P.clear(2,6);P.clear(14,6);
P.rect(1,13,58,17,M.STEEL,(x,y,X,Y)=>{if(y<13.8&&x>=16&&x<=55&&X%5<3)return brut(Y,X,Y,.32);return brut(sh(D,y<14?1.35:.88),X,Y,.48,8,19)});
P.rect(15,6,22,13,M.ARMOR,(x,y,X,Y)=>brut([78,72,64],X,Y,.45,6,-1));
P.rect(17,8,20,10,M.GLASS,[48,62,66]);
for(const x of [24,38,54])P.rect(x,9,x+2,13,M.STEEL,(x2,y2,X,Y)=>brut(RUST,X,Y,.5));
P.rect(55,7,57,9,M.LAMP,[255,200,110]);
wagonBase(P);
}
function paintMole(P){
const BODY=[92,76,54],DRILL=[148,142,132],Y=[188,142,44],DK=[42,38,34];
P.rect(4,4,26,11,M.ARMOR,(x,y,X,Y)=>{if(y>=8&&y<=9&&X%4<2)return brut(Y,X,Y,.3);return brut(sh(BODY,cyl((y-3.5)/8)),X,Y,.48,8,6)});
P.rect(14,5,21,8,M.GLASS,(x,y,X,Y)=>((X+Y)%4===0)?[150,180,186]:[44,58,64]);
P.rect(7,6,12,9,M.FUEL,(x,y,X,Y)=>brut([124,88,48],X,Y,.45));
P.rect(22,6,25,9,M.AMMO,[86,88,52]);
for(let x=27;x<=37;x++){const r=Math.max(1,Math.round((38-x)*.42));for(let y=8-r;y<=7+r;y++){const spiral=((x+y)%3===0);P.px(x,y,M.ARMOR,(x2,y2,X,Y)=>brut(spiral?[210,196,160]:DRILL,X,Y,.3))}}
P.rect(3,11,26,14,M.WHEEL,(x,y,X,Y)=>brut(Y===11||Y===14?[58,54,48]:DK,X,Y,.4,3,-1));
P.wheel(8,12.5,1.2);P.wheel(16,12.5,1.2);P.wheel(23,12.5,1.2);
P.px(25,4,M.LAMP,[255,224,140]);
}
function paintTank(P){
const AR=[86,78,66],DK=[40,38,34],TR=[54,48,42];
P.rect(2,8,40,12,M.ARMOR,(x,y,X,Y)=>brut(sh(AR,cyl((y-7)/6)),X,Y,.48,9,9));
P.rect(11,3,27,8,M.ARMOR,(x,y,X,Y)=>brut(sh(AR,cyl((y-2.5)/6)*1.12),X,Y,.45,7,5));
P.rect(27,4,43,6,M.STEEL,(x,y,X,Y)=>brut(sh(DK,y===5?1.35:.9),X,Y,.4));
P.rect(6,9,12,11,M.FUEL,(x,y,X,Y)=>brut([112,78,46],X,Y,.5));
P.rect(15,5,21,7,M.AMMO,[78,82,48]);
P.rect(3,12,39,15,M.WHEEL,(x,y,X,Y)=>brut((X%4===0)?[82,74,64]:TR,X,Y,.45,4,-1));
for(const wx of [7,14,21,28,35])P.wheel(wx,13.5,1.3);
P.px(25,4,M.GLOW,[255,60,40]);
}
