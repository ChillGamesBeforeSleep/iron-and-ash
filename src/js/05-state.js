/* =====================================================================
   GAME STATE
   ===================================================================== */
const S={W:480,H:270};
const G={leak:false,lights:[],dev:{god:false,calm:false,biome:'',ts:1,open:false,auto:false},mlog:[],legReports:[],snapT:0,fps:60,chunks:[],state:'title',leg:1,diff:1,seed:(Math.random()*1e9)|0,world:null,train:null,loose:[],all:[],
res:{crew:5,fuel:110,scrap:8,ammo:15,equip:2,water:75},caps:{},away:0,
drones:[],shots:[],rocks:[],obstacles:[],parts:[],exp:null,explQ:[],
t:0,camX:0,camY:0,shake:0,flash:0,throttle:0,target:0,brake:false,keys:{},cameraPilot:null,
mouse:{sx:0,sy:0,wx:0,wy:0,down:false},gunCool:0,craftCool:0,cell:4,raw:false,viewH:292,zoomTarget:292,zoomManual:false,wheelT:-99,paused:false,
tint:[58,46,38],hover:null,stats:{dist:0,kills:0,lost:0,repairs:0},hudSig:'',tel:null,cause:'hit',recruitT:0,offers:null};
function newTel(){return{dmg:{},fuel:0,fuelIn:{},stopped:0,scrapIn:0,scrapOut:0,ammoUsed:0,ammoMade:0,time:0,kills:0,crewLost:0,crewGained:0}}
G.tel=newTel();
function biomeAt(x){const s=G.world.segs;for(let i=0;i<s.length;i++)if(x<s[i].x1)return s[i];return s[s.length-1]}
function T(x){const w=G.world,a=w.T;if(x<=0)return a[0];if(x>=w.W-1)return a[w.W-1];const i=x|0,f=x-i;return a[i]+(a[i+1]-a[i])*f}
const groundY=x=>T(x)+2;
const BIOMES={
waste:{name:'WASTELAND',sub:'Dry ground. Quiet, for now.',sky:[58,46,38]},
city:{name:'DEAD CITY',sub:'Drone nests in the towers. Rich ruins.',sky:[44,44,56]},
canyon:{name:'ROCKFALL CANYON',sub:'Loose cliffs. Rocks block the track.',sky:[66,46,34]},
acid:{name:'ACID RAIN BELT',sub:'Corrodes metal. Puts out fires.',sky:[40,58,42]},
lava:{name:'LAVA FIELDS',sub:'Embers ignite fuel, wood and ammo.',sky:[90,34,20]},
};
const SITES={
ruin:{name:'RUIN',work:6,risk:'low',p:.02,stock:8,slots:4,load:{scrap:2.2,equip:.18,fuel:.6}},
depot:{name:'FUEL DEPOT',work:6,risk:'medium',p:.035,stock:6,slots:3,load:{fuel:9,water:3}},
armory:{name:'ARMORY',work:7,risk:'medium',p:.04,stock:5,slots:3,load:{ammo:6,equip:.3}},
camp:{name:'SURVIVOR CAMP',work:5,risk:'low',p:.01,stock:3,slots:2,load:{fuel:2,water:2}},
yard:{name:'RAIL YARD',work:9,risk:'low',p:.02,stock:4,slots:4,load:{scrap:1.8}},
bunker:{name:'BUNKER',work:12,risk:'high',p:.08,stock:7,slots:5,load:{scrap:2,equip:.6,ammo:3,fuel:4}},
stranded:{name:'STRANDED SURVIVORS',work:0,risk:'none',p:0,stock:0,slots:0,load:{}},
tower:{name:'WATER TOWER',work:0,risk:'none',p:0,stock:0,slots:0,load:{}},
};
