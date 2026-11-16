/* =====================================================================
   UNIT FORGE — build new locomotives and wagons from two PNGs.
   A guided, 7-step tutorial: Start → Images → Wheels → Sections → Points → Test → Save.
   Every one of the 8 sections gets a properties menu (role, effect, needs).
   Saved units become new types: they can start in your train and show up at stations.
   ===================================================================== */
const UNITS_KEY='trainEngineV2.units.v1';
const BP_KEY='trainEngine.blueprints.v1',CONSIST_KEY='trainEngine.consist.v1';
const BLUEPRINTS={};
const TYPE_LABEL={loco:'LOCOMOTIVE',tender:'FUEL TENDER',passenger:'CREW CAR',armored:'ARMORED',cargo:'CARGO',water:'WATER TANKER',crane:'CRANE',carrier:'FLIGHT CARRIER',helipad:'HELIPAD',driller:'EXCAVATOR RIG',mole:'TUNNEL DRILLER',tank:'RAIDER TANK'};
const PT_LABEL={nose:'Nose gun',bay:'Bomb bay',gun:'Gun',smoke:'Smoke',lamp:'Lamp',turret:'Turret',cook:'Ammo blast',nozzle:'Water nozzle',hook:'Crane hook',store:'Crane bin',couplerRear:'Rear coupler',couplerFront:'Front coupler'};
const PT_HELP={nose:'the plane\'s gun fires from here',bay:'bombs drop from here',gun:'the machine gun fires from here',smoke:'chimney smoke comes out here',lamp:'headlight',turret:'cannon pivot — the barrel follows the mouse',cook:'where a loaded ammo store explodes',nozzle:'where the water jet starts',hook:'the crane line hangs from here',store:'lifted scrap flies into this bin',couplerRear:'rear coupling height',couplerFront:'front coupling height'};
const MAT_NAME={},MAT_HEX={};MATS.forEach((m,i)=>{if(!i)return;MAT_NAME[i]=m.key;MAT_HEX[i]='#'+m.pal.map(v=>v.toString(16).padStart(2,'0')).join('')});
const AIR_BASES=['plane','heli','drone','mole','tank'],isAirBase=b=>AIR_BASES.includes(b);
const BASE_INFO={loco:{label:'LOCOMOTIVE',note:'leads the train'},wagon:{label:'WAGON',note:'rides behind'},plane:{label:'PLANE',note:'flyer · wings + engine'},heli:{label:'HELICOPTER',note:'flyer · rotor'},drone:{label:'DRONE',note:'small rotor flyer'},mole:{label:'DRILLER',note:'subterranean digger'},tank:{label:'RAIDER TANK',note:'armored ground mob'}};
const FORGE_ID='__forge';
const FG={step:0,view:'both',pick:null,sel:0,d:null,unit:null,rep:null,miniT:0,visited:new Set()};
const STEPS=[['start','Start'],['images','Images'],['paint','Paint'],['wheels','Wheels'],['sections','Sections'],['points','Points'],['effects','Effects'],['test','Test'],['save','Save'],['tiles','Map Tiles']];
const stepIdx=k=>STEPS.findIndex(s=>s[0]===k);
const TUT={
tiles:`<h4>10 · 24-Tile Leg Map Editor</h4>Each leg is built from <b>24 contiguous terrain tiles</b> (up to 4K <b>4096 px</b> PNG per tile). Select any of the 24 slots below to customize its <b>biome</b>, <b>surface structure</b>, <b>buried underground cache</b> (treasure chest, sealed old bunker, volatile gas pocket, scrap vein, fuel pocket), <b>dormant defense turret</b>, or upload a custom <b>Terrain/Decoration PNG</b>. Export or import the entire 24-tile map pack as a single JSON file.`,

start:`<h4>1 · What are you building?</h4>A <b>locomotive</b> (120×50 px) leads the train: it needs a <b>CAB</b> to be driven and <b>WHEEL</b> sections to pull. A <b>wagon</b> (100×44 px) rides behind and adds a job: storage, seats, a gun, water, a crane… A <b>plane</b>, <b>helicopter</b> or <b>drone</b> is an enemy flyer: its sections (engine, wings, tail, rotor, cab) are what make it fly, and shooting them off is how you bring it down.
<ol><li>Pick the type and give it a name.</li><li>Choose <b>Start from</b>: a built-in unit gives you its art, sections and points to modify — or start blank.</li><li>Press <b>Download templates</b>: you get a guide image (grid, wheel circles, couplers), an example texture and material map, and the material palette.</li></ol>`,
images:`<h4>2 · Two images, same size</h4><b>Texture PNG</b> — what each pixel looks like. Any colours; transparent = empty.<br><b>Material PNG</b> — what each pixel is made of, painted only with the <b>exact palette colours</b> (no anti-aliasing, no soft brushes). Steel, armour, wood, fuel, ammo, glass, crew windows (magenta), wheels (white), lamps, water.
<ul><li>Fuel pixels burn hard; armour shrugs off hits; glass shatters; water spills and puts out fires.</li><li>Paint crew windows magenta where a crew member should appear when the seat is taken.</li><li>The checklist below tells you exactly what doesn't match.</li></ul>`,
paint:`<h4>3 · Paint materials</h4>Change what the unit is made of without leaving the game. <b>Paint</b> with a brush, or <b>Replace</b> one material with another in a section or everywhere — e.g. turn a steel hull into light <b>ALU</b>, a fuel tank's skin into <b>KEVLAR</b>, put <b>RUBBER</b> on the buffers or <b>OIL</b> in the engine. The section mix below shows the result. Undo goes back 15 steps.`,
effects:`<h4>7 · Effects</h4>Pin effects to points on the unit: smoke and steam, sparks, embers, lanterns and beacons, electrical shorts, oil / water / fuel leaks, dust and debris. Pick each one from the list, place it with the <b>X / Y</b> sliders (or <b>Place on view</b> and click), set its <b>power</b>, its <b>direction</b> when it has one, and <b>when</b> it runs: always, when moving, braking, when its section is damaged, broken or burning. Up to 7 on a locomotive, 5 on a wagon, 4 on planes and helicopters, 3 on drones.`,
wheels:`<h4>4 · Line up the wheels</h4>One wheel per bottom section. The engine <b>spins whatever you drew inside each yellow circle</b>, so the circles must sit exactly on your white WHEEL pixels. Press <b>Auto-detect</b> first, then fine-tune with the sliders. Locomotives can get coupling rods between the wheels.`,
sections:`<h4>5 · Give every section a job</h4>The unit is split into a <b>4×2 grid</b>. Each section has one <b>role</b>. While the section is above 50% health its role works; below that it switches off. Click a section in the grid or on the pixel view, then pick its role.
<ul><li><b>Top row</b> = the job (fuel, water, seats, cannon, pump…). <b>Bottom row</b> = running gear: WHEEL pulls (+25% traction each), AXLE carries (a broken axle drags).</li><li>Every role lists what it <b>needs</b>: the right material inside it (fuel pixels in a FUEL section), an effect point, or a partner (a PUMP needs WATER on the train).</li></ul>`,
points:`<h4>6 · Job points</h4>Points tell the engine where things happen: smoke, the headlight, the cannon pivot, the water nozzle, the crane hook and bin, coupler heights — and on flyers the gun and the bomb bay. Points your sections need are listed; auto-placed ones are a guess — pick one, then click the pixel view to place it.`,
test:`<h4>8 · Break it, then run it</h4><b>Bench test</b>: pick a weapon (blast, bullets, shell, fire, water) and click the unit on the right; watch the sections fail below. <b>START SIMULATION</b> puts it in a real train on a test track where you spawn every enemy yourself; for flyers <b>START FLIGHT TEST</b> launches it against a train with live flight instruments.`,
save:`<h4>9 · Save and use it</h4><b>Save</b> stores the unit in this browser as a new type. Then put it in your <b>starting train</b> (a locomotive must lead). Saved wagons can also be offered at stations. <b>Export</b> gives you a single .json file with both images inside — keep it in your project folder or share it; <b>Import</b> loads one back.`,
};
function decodeURL(url){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);res(x.getImageData(0,0,im.width,im.height))};im.onerror=()=>rej(new Error('Not a readable PNG'));im.src=url})}
function idToCanvas(id){const c=document.createElement('canvas');c.width=id.width;c.height=id.height;c.getContext('2d').putImageData(id,0,0);return c}
let _dl;
async function download(name,blobOrURL){
if(window.claude&&window.claude.use){if(_dl===undefined)_dl=await window.claude.use('downloads').catch(()=>null);
if(_dl){const blob=typeof blobOrURL==='string'?await (await fetch(blobOrURL)).blob():blobOrURL;
try{await _dl.save({filename:name,data:blob})}catch(e){if(e&&e.code!=='declined')log(`Could not save ${name} (${e&&e.code||'error'})`,'warn')}return}}
const a=document.createElement('a');a.download=name;a.href=typeof blobOrURL==='string'?blobOrURL:URL.createObjectURL(blobOrURL);document.body.appendChild(a);a.click();a.remove();if(typeof blobOrURL!=='string')setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
const baseSize=base=>USIZE[base==='loco'?'loco':isAirBase(base)?base:'cargo'];
const slug=s=>(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,24);
function registerType(id,name,base,roles,mass){const S=baseSize(base),air=isAirBase(base);USIZE[id]=Object.assign({},S);
CARS[id]={base:air?'air':base,vkind:air?base:undefined,spin:air?CARS[base].spin:undefined,name:(name||id).toUpperCase().slice(0,20),w:S.w,h:S.h,split:S.split,mass:+mass||1,wheelR:S.r,roles:roles.slice(),paint:null,pts:{},blueprint:id!==FORGE_ID};TYPE_LABEL[id]=CARS[id].name}
async function installBlueprint(bp){
registerType(bp.id,bp.name,bp.base,bp.roles,bp.spec.mass);
const L=await decodeURL(bp.look),Mt=await decodeURL(bp.material);
const r=compileUnit(bp.id,L,Mt,Object.assign({},bp.spec,{roles:bp.roles,name:bp.name}));
if(!r.unit)throw new Error(r.rep.errors.join(' '));
CARS[bp.id].pts=r.unit.pts;CUSTOM[bp.id]=Object.assign(r.unit,{on:true,lookURL:bp.look,matURL:bp.material,spec:bp.spec});
if(isAirBase(bp.base)){CARS[bp.base].pts=r.unit.pts;CUSTOM[bp.base]=CUSTOM[bp.id]}
G.baySprites={};BLUEPRINTS[bp.id]=bp;
}
function persistBlueprints(){try{localStorage.setItem(BP_KEY,JSON.stringify(BLUEPRINTS));return true}catch(e){return false}}
function persistConsist(){try{localStorage.setItem(CONSIST_KEY,JSON.stringify(CONSIST))}catch(e){}}
async function loadUnits(){
let o=null;try{o=JSON.parse(localStorage.getItem(UNITS_KEY)||'null')}catch(e){}
if(o)for(const t in o){try{const L=await decodeURL(o[t].lookURL),Mt=await decodeURL(o[t].matURL),r=compileUnit(t,L,Mt,o[t].spec);if(r.unit)CUSTOM[t]=Object.assign(r.unit,{on:true,lookURL:o[t].lookURL,matURL:o[t].matURL})}catch(e){}}
let b=null;try{b=JSON.parse(localStorage.getItem(BP_KEY)||'null')}catch(e){}
if(b)for(const id in b){try{await installBlueprint(b[id])}catch(e){console.warn('unit',id,e)}}
try{const c=JSON.parse(localStorage.getItem(CONSIST_KEY)||'null');if(Array.isArray(c)&&c.length)CONSIST=c}catch(e){}
if(G.state==='title'){G.train=newTrain();layout(G.train.cars,G.train.x);G.all=G.train.cars.slice();computeCaps()}
}
function blankDraft(base){const S=baseSize(base),air=isAirBase(base);
return{id:null,name:'',base,from:'',roles:air?CARS[base].roles.slice():base==='loco'?['CAB','FUEL','BOILER','RAM','WHEEL','WHEEL','WHEEL','WHEEL']:['STORE','STORE','STORE','STORE','AXLE','AXLE','AXLE','AXLE'],
spec:{mass:air?CARS[base].mass:base==='loco'?1.4:.8,rods:base==='loco',wheels:air?[]:[0,1,2,3].map(i=>({x:S.w/4*i+S.w/8,y:S.y,r:S.r})),points:{},effects:[]},look:null,mat:null,lookURL:null,matURL:null,lookName:'',matName:'',dirty:false}}
function builtinArt(type){
const c=makeCar(type,false);c.phase=.4;c.occ.fill(1);updateRegions(c);paintCar(c);
const lk=document.createElement('canvas');lk.width=c.w;lk.height=c.h;lk.getContext('2d').putImageData(c.img,0,0);
const mk=document.createElement('canvas');mk.width=c.w;mk.height=c.h;const mx=mk.getContext('2d'),mi=mx.createImageData(c.w,c.h);
for(let k=0;k<c.n;k++){const m=c.mat[k];if(!m)continue;const pal=c.sil[k]&&m===M.GLASS?PALETTE[6]:(PALETTE.find(p=>p[2]===m)||PALETTE[0]);mi.data.set([...pal[1],255],k*4)}mx.putImageData(mi,0,0);
return{look:lk.getContext('2d').getImageData(0,0,c.w,c.h),mat:mi,lookURL:lk.toDataURL('image/png'),matURL:mk.toDataURL('image/png')};
}
async function draftFrom(from,base){
if(BLUEPRINTS[from]){const bp=BLUEPRINTS[from];const d=blankDraft(bp.base);Object.assign(d,{from,roles:bp.roles.slice(),spec:Object.assign({effects:[]},JSON.parse(JSON.stringify(bp.spec))),lookURL:bp.look,matURL:bp.material,lookName:'from '+bp.name,matName:'from '+bp.name});
d.look=await decodeURL(bp.look);d.mat=await decodeURL(bp.material);return d}
const d=blankDraft(base);if(!from||!CARS[from])return d;
const sp=defaultSpec(from),art=builtinArt(from);d.from=from;d.roles=CARS[from].roles.slice();d.spec={mass:sp.mass,rods:sp.rods,wheels:isAirBase(d.base)?[]:sp.wheels,points:Object.assign({},sp.points),effects:JSON.parse(JSON.stringify(BUILTIN_FX[from]||[]))};
Object.assign(d,art,{lookName:`${TYPE_LABEL[from]} (built-in art)`,matName:`${TYPE_LABEL[from]} (built-in material)`});
if(!isAirBase(d.base))autoWheelsD(d,true);return d;
}
function autoWheelsD(d,quiet){
const S=baseSize(d.base),cw=S.w/4;if(!d.mat||isAirBase(d.base))return 0;let found=0;
for(let i=0;i<4;i++){let x0=1e9,x1=-1,y0=1e9,y1=-1;
for(let y=S.split-4;y<S.h;y++)for(let x=Math.floor(cw*i);x<Math.min(S.w,Math.floor(cw*(i+1)));x++){const q=(y*S.w+x)*4;if(d.mat.data[q+3]<128)continue;const[pi,dd]=nearestPal(d.mat.data[q],d.mat.data[q+1],d.mat.data[q+2]);if(PALETTE[pi][0]==='WHEEL'&&dd<2700){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}}
if(x1>=0){found++;const o=d.spec.wheels[i];o.x=(x0+x1+1)/2;o.y=(y0+y1+1)/2;o.r=Math.max(x1-x0+1,y1-y0+1)/2}}
if(!quiet)log(found?`Auto-detect placed ${found} wheel${found>1?'s':''}`:'No white WHEEL pixels found in the bottom row',found?'good':'warn');return found;
}
function trainRoles(){const s=new Set(FG.d.roles);for(const t of startConsist())if(CARS[t]&&t!==FG.d.id)for(const r of CARS[t].roles)s.add(r);return s}
function matShare(st,names){if(!st||!st.n)return 0;let c=0;for(const nm of names){if(nm==='CREW')c+=st.crew;else c+=st.m[M[nm]]||0}return c/st.n}
function regionNeeds(r){
const d=FG.d,ro=d.roles[r],R=ROLES[ro]||{},need=R.need||{},out=[],st=FG.unit&&FG.unit.regStats[r],bottom=r>=4;
if(need.row==='bottom'&&!bottom)out.push(['e',`${ro} only works in the bottom row (running gear).`]);
if(need.row==='top'&&bottom)out.push(['w',`This is a bottom-row section: it carries the car. A ${ro} here means one less axle or wheel.`]);
if(need.mat&&st&&st.n){const sh=matShare(st,need.mat),nm=need.mat.map(x=>x==='CREW'?'crew-window':x).join(' / ');out.push([sh>=.15?'o':'w',sh>=.15?`${Math.round(sh*100)}% ${nm} pixels inside — reads right`:`Only ${Math.round(sh*100)}% ${nm} pixels — paint some ${nm} material here so damage looks like what it does`])}
if(need.pt){const set=d.spec.points&&d.spec.points[need.pt];out.push([set?'o':'w',set?`${PT_LABEL[need.pt]} point placed`:`${PT_LABEL[need.pt]} point is auto-placed — check it in step 5`])}
if(need.unit)for(const p of need.unit)out.push(d.roles.includes(p)?['o',`${p} section present in this unit`]:['e',`Needs a ${p} section in this same unit`]);
if(need.train){const tr=trainRoles(),have=need.train.some(x=>tr.has(x));out.push(have?['o',`${need.train.join(' or ')} available on the train`]:['w',`Needs ${need.train.join(' or ')} somewhere on the train`])}
if(st&&st.n<25)out.push(['w',`Only ${st.n} pixels — it will break almost instantly`]);
if(st&&!st.n)out.push(['w','Empty section (no pixels) — its role can never work']);
return out;
}
function unitChecks(){
const d=FG.d,out=[],ro=d.roles,bottom=ro.slice(4);
if(isAirBase(d.base)){
if(!ro.includes('CAB'))out.push(['e','No CAB box — needs a CAB section for pilot and lift/stability.']);
if(!ro.includes('ENGINE'))out.push(['e','No ENGINE box — needs an ENGINE section: the working material in it makes the thrust.']);
if(!ro.includes('WEAPON'))out.push(['w','No WEAPON box — unarmed flyer.']);
const b=airBalance();if(b&&(d.base==='plane'||d.base==='heli'||d.base==='drone'))out.push(b.verdict);
{const c=G.train&&G.train.cars[0];if(c&&FG.unit&&c.vkind)out.push(...ledgerSheet(c))}
return out}
if(d.base==='loco'){
if(!ro.includes('CAB'))out.push(['e','No CAB section — this locomotive cannot be driven.']);
const wh=ro.filter(x=>x==='WHEEL').length;if(!wh)out.push(['e','No WHEEL sections — zero traction, the train will not move.']);else if(wh<4)out.push(['w',`${wh} WHEEL section${wh>1?'s':''} → ${wh*25}% traction.`]);else out.push(['o','Full traction: 4 WHEEL sections.']);
if(!ro.includes('FUEL'))out.push(['w','No FUEL section: only the 10-fuel firebox. Bring a tender.']);
}else{
const run=bottom.filter(x=>x==='AXLE'||x==='WHEEL').length;if(run<2)out.push(['w',`Only ${run} running-gear section${run===1?'':'s'} in the bottom row.`]);
if(ro.includes('WHEEL'))out.push(['o','Powered wagon: its WHEEL sections add traction to the whole train.']);
}
if(ro.filter(x=>x==='CANNON').length>1)out.push(['w','Only one cannon per train can fire.']);
{const c=G.train&&G.train.cars[0];if(c&&FG.unit){const t=ledger(c).full/CFG.px.massUnit;if(t>1.6)out.push(['w',`Heavy (${t.toFixed(2)} t — the stock locomotive is 1.35 t): it slows the whole train.`]);out.push(...ledgerSheet(c))}}
return out;
}
function allChecks(){
const rep=FG.rep||{errors:['No images yet'],warns:[],ok:[]},S={start:[],images:[],paint:[],wheels:[],sections:[],points:[],effects:[],test:[],save:[],tiles:[]};
if(!FG.d.name.trim())S.start.push(['w','Give the unit a name.']);else S.start.push(['o',`${BASE_INFO[FG.d.base].label.toLowerCase().replace(/^./,x=>x.toUpperCase())} “${FG.d.name}”`]);
if(isAirBase(FG.d.base))S.wheels.push(['o','Flyers have no wheels — nothing to do here.']);
{const fx=FG.d.spec.effects||[],mx=EFX_MAX[FG.d.base];S.effects.push(['o',`${fx.length} of ${mx} effects used.`]);fx.forEach((e,i)=>{const c=G.train&&G.train.cars[0];if(!c)return;let ok=false;for(let dy=-2;dy<=2&&!ok;dy++)for(let dx=-2;dx<=2;dx++){const x=Math.round(e.x)+dx,y=Math.round(e.y)+dy;if(x>=0&&y>=0&&x<c.w&&y<c.h&&c.omat[y*c.w+x]){ok=true;break}}if(!ok)S.effects.push(['w',`Effect ${i+1} (${EFX[e.t]?EFX[e.t].name:e.t}) sits on empty space — it only runs where there is material.`])})}
for(const t of rep.errors)S.images.push(['e',t]);
for(const t of rep.warns)(/wheel/i.test(t)?S.wheels:S.images).push(['w',t]);
for(const t of rep.ok)(/wheel/i.test(t)?S.wheels:S.images).push(['o',t]);
if(FG.unit){const rc=isAirBase(FG.d.base)?3:8;S.sections.push(...unitChecks());for(let r=0;r<rc;r++)for(const [s,t] of regionNeeds(r))if(s!=='o')S.sections.push([s,`[${isAirBase(FG.d.base)?r:r%4},${isAirBase(FG.d.base)?0:r>>2}] ${FG.d.roles[r]}: ${t}`])}
for(const k of neededPoints())if(!(FG.d.spec.points&&FG.d.spec.points[k])&&!k.startsWith('coupler'))S.points.push(['w',`${PT_LABEL[k]}: auto-placed`]);
if(!FG.visited.has(stepIdx('test')))S.test.push(['w','Not tested yet — break it once before saving.']);
if(FG.d.id&&BLUEPRINTS[FG.d.id]&&!FG.d.dirty)S.save.push(['o',`Saved as “${FG.d.id}”`]);else S.save.push(['w','Not saved yet.']);
{const customCnt=(G.mapSpec||[]).filter(t=>t&&(t.png||t.biome!=='auto'||t.site!=='auto'||t.buried!=='auto'||t.turret!=='auto')).length;S.tiles.push(['o',`${customCnt} of ${CFG.mapTiles} map tiles customized.`])}
return S;
}
const stepState=list=>list.some(x=>x[0]==='e')?'e':list.some(x=>x[0]==='w')?'w':'ok';
function neededPoints(){const d=FG.d;if(isAirBase(d.base))return d.base==='plane'?['nose','bay']:['gun'];const s=new Set(['couplerRear','couplerFront']);if(d.base==='loco'){s.add('smoke');s.add('lamp')}
d.roles.forEach(ro=>{const p=ROLES[ro]&&ROLES[ro].need&&ROLES[ro].need.pt;if(p)s.add(p)});if(d.roles.includes('BOOM'))s.add('store');return[...s]}
function unitAbilities(){
if(!FG.unit)return[];const c=G.train&&G.train.cars[0];if(!c)return[];
if(isAirBase(FG.d.base)){const a=[];for(const ro of ['ENGINE','WING','TAIL','ROTOR','CAB','MG','FUEL'])if(c.d.roles.includes(ro))a.push([ro,Math.round(roleShare(c,ro)*100)+'%']);const b=airBalance();if(b)a.push(['Lift vs centre of mass',(b.off>=0?'+':'')+b.off.toFixed(1)+' px']);{const vc=vehCaps(c),L=ledger(c);a.push(['Tank',vc.gas+' gas']);a.push(['Magazine',vc.shots+' shots']);a.push(['Weight',(L.full/CFG.px.massUnit).toFixed(2)+' t']);a.push(['Build cost',Math.round(L.cost)+' pts'])}let px=0;for(let k=0;k<c.n;k++)if(c.omat[k])px++;a.push(['Pixels',px]);return a}
const K=CFG.cap,cap={cab:false,medic:0,fuel:0,crew:0,ammo:0,scrap:0,equip:0,traction:0,boost:1,ram:false,ramLvl:0,cannon:null,gunLvl:0,workshop:false,shopLvl:0,axleDrag:0,seatLvl:0,water:0,pump:0,pumpCar:null,crane:null,craneLvl:0};
for(let r=0;r<8;r++){const R=ROLES[c.d.roles[r]];if(R&&R.on&&c.alive[r])R.on(cap,0,c,r,K)}
{const S=ledger(c).store;cap.fuel+=Math.round(S.fuel+S.charge);cap.water+=Math.round(S.water);cap.ammo+=Math.round(S.ammo);cap.scrap+=Math.round(S.scrap);cap.equip+=Math.round(S.equip)}
const a=[];if(cap.cab)a.push(['Driver cab','yes']);if(cap.traction)a.push(['Traction',Math.round(cap.traction*100)+'%']);if(cap.boost>1)a.push(['Engine power','+'+Math.round((cap.boost-1)*100)+'%']);if(cap.ram)a.push(['Plough','yes']);
if(cap.fuel)a.push(['Fuel',cap.fuel]);if(cap.water)a.push(['Water',cap.water]);if(cap.crew)a.push(['Crew seats',cap.crew]);if(cap.ammo)a.push(['Ammo',cap.ammo]);if(cap.scrap)a.push(['Scrap',cap.scrap]);if(cap.equip)a.push(['Equipment',cap.equip]);
if(cap.cannon)a.push(['Cannon','yes']);if(cap.workshop)a.push(['Workshop','yes']);if(cap.pumpCar)a.push(['Water pump','yes']);if(cap.crane)a.push(['Crane','yes']);if(cap.medic)a.push(['Medic','×'+(Math.round(CFG.healBase/CFG.healMedic*cap.medic*10)/10)+' healing']);
let px=0;for(let k=0;k<c.n;k++)if(c.omat[k])px++;a.push(['Weight',(ledger(c).full/CFG.px.massUnit).toFixed(2)+' t']);a.push(['Build cost',Math.round(ledger(c).cost)+' pts']);a.push(['Pixels',px]);return a;
}
function airBalance(){const c=G.train&&G.train.cars[0];if(!c||!isAirBase(FG.d.base)||!c.vkind)return null;airMassProps(c);
const off=c.liftX-c.comX,plane=FG.d.base==='plane';let verdict;
if(plane)verdict=off<-6?['e',`Very nose-heavy: lift is ${(-off).toFixed(1)} px behind the centre of mass — the pilot barely holds it and it crashes on about a third of its flights. Move heavy material back.`]:off<0?['w',`Nose-heavy: lift is ${(-off).toFixed(1)} px behind the centre of mass. It usually flies, but crashes on some sorties even undamaged.`]:off>12?['w',`Very tail-heavy (lift ${off.toFixed(1)} px ahead): it climbs and stalls more easily.`]:['o',`Lift is ${off.toFixed(1)} px ahead of the centre of mass — stable. (Any 1×3 flyer goes down once its CAB box is badly hit.)`];
else verdict=Math.abs(off)>5?['w',`Rotor is ${Math.abs(off).toFixed(1)} px ${off>0?'ahead of':'behind'} the centre of mass — it will tilt and drift.`]:['o',`Rotor sits ${Math.abs(off).toFixed(1)} px from the centre of mass — balanced.`];
return{off,verdict,com:[c.comX,c.comY],lift:c.liftX}}
function fgRebuild(fast){
const d=FG.d;registerType(FORGE_ID,d.name||'NEW UNIT',d.base,d.roles,d.spec.mass);
const r=compileUnit(FORGE_ID,d.look,d.mat,Object.assign({},d.spec,{roles:d.roles,name:d.name||'NEW UNIT'}));FG.unit=r.unit||null;FG.rep=r.rep;
if(FG.unit){CARS[FORGE_ID].pts=FG.unit.pts;CUSTOM[FORGE_ID]=Object.assign(FG.unit,{on:true,lookURL:d.lookURL,matURL:d.matURL,spec:d.spec})}G.baySprites={};
const car=FG.unit?makeCar(FORGE_ID,FG.unit):makeCar(d.base==='loco'?'loco':'cargo',false);
if(fast&&G.train&&G.train.cars[0])car.phase=G.train.cars[0].phase;
car.occ.fill(1);G.train={cars:[car],x:800,v:0};placeBench(car);G.all=G.train.cars.slice();updateRegions(car);
if(!fast){G.parts=[];G.explQ=[]}
fgRender();
}
function placeBench(car){if(isAirBase(FG.d.base)){car.vkind=FG.d.base;car.fx=1;car.ax=G.train.x;car.ay=groundY(car.ax)-34;car.ang=0;car.vx=0;car.vy=0;vehPose(car);if(!car.am0)airInit(car)}else layout(G.train.cars,G.train.x)}
function fgRender(){
const d=FG.d,S=allChecks(),cur=STEPS[FG.step][0];
$('fgSteps').innerHTML=STEPS.map(([k,t],i)=>{const st=stepState(S[k]);return`<li><button type="button" data-step="${i}" class="${i===FG.step?'':st}" ${i===FG.step?'aria-current="step"':''} title="${t}"><i>${st==='ok'?'✓':st==='e'?'✕':'!'}</i>${i+1} ${t}</button></li>`}).join('');
$('fgTut').innerHTML=TUT[cur];
const units=Object.keys(BLUEPRINTS);
$('fgUnit').innerHTML=`<option value="">${d.id&&BLUEPRINTS[d.id]?'— new unit —':'Unsaved: '+(d.name||'new unit')}</option>`+units.map(id=>`<option value="${id}" ${id===d.id?'selected':''}>${BLUEPRINTS[id].name} (${BLUEPRINTS[id].base})</option>`).join('');
$('fgBody').innerHTML=BODY[cur]();if(AFTER[cur])AFTER[cur]();
const show=cur==='test'||cur==='save'?[...S.images.filter(x=>x[0]==='e'),...S.sections.filter(x=>x[0]==='e'),...S[cur]]:S[cur];
$('wsRep').innerHTML=(show.length?show:[['o','Nothing to fix here.']]).map(([s,t])=>`<li class="${s}">${t}</li>`).join('');
const all=Object.values(S).flat();$('fgCount').textContent=`${all.filter(x=>x[0]==='e').length} problems · ${all.filter(x=>x[0]==='w').length} warnings`;
$('fgPrev').disabled=FG.step===0;$('fgNext').textContent=FG.step===STEPS.length-1?'DONE':'NEXT →';
$('fgViewTitle').textContent={sections:'Pixel view — click a section',points:'Pixel view — place points',wheels:'Pixel view — wheel circles',paint:'Pixel view — paint materials',effects:'Pixel view — effect points'}[cur]||'Pixel view';
$('fgViewHint').textContent={sections:'Cyan grid = the 8 sections. The selected one is highlighted.',points:FG.pick?`Click where the ${PT_LABEL[FG.pick]} should be.`:'Pick a point above, then click here.',test:'Use the weapon above on the unit (right side of the screen).',paint:FG.paintMode==='paint'?'Click and drag to paint the chosen material (only where the texture has pixels).':'Click a section, then press Replace.',effects:FG.pickFx!=null?`Click where effect ${FG.pickFx+1} should be.`:'Numbered dots = effect points; the line shows the direction.'}[cur]||'';
if(isAirBase(d.base)&&['sections','points','test','paint'].includes(cur)){const b=airBalance();if(b)$('fgViewHint').textContent+=` ⊕ = centre of mass, ▲ = ${d.base==='plane'?'wing lift':'rotor lift'}. ${b.verdict[1]}`}
fgDraw();
}
function fgDraw(){
const d=FG.d,S=baseSize(d.base),cv=$('wsZoom'),z=Math.max(2,Math.floor((cv.parentElement.clientWidth||440)/S.w)),cur=STEPS[FG.step][0];
cv.width=S.w*z;cv.height=S.h*z;const x=cv.getContext('2d');x.imageSmoothingEnabled=false;
for(let j=0;j<S.h;j+=4)for(let i=0;i<S.w;i+=4){x.fillStyle=((i+j)/4)%2?'#1e1d1c':'#252422';x.fillRect(i*z,j*z,4*z,4*z)}
if(FG.view!=='mat'&&d.look)x.drawImage(idToCanvas(d.look),0,0,S.w*z,S.h*z);
if(FG.view!=='look'&&d.mat){x.globalAlpha=FG.view==='both'?.5:1;x.drawImage(idToCanvas(d.mat),0,0,S.w*z,S.h*z);x.globalAlpha=1}
const cw=S.w/4;
const air=isAirBase(d.base),rc=air?3:8,bw=S.w/(air?3:4);
for(let r=0;r<rc;r++){const x0=(air?r:r%4)*bw*z,y0=air?0:(r<4?0:S.split*z),w=bw*z,h=(air?S.h:(r<4?S.split:S.h-S.split))*z;
if(cur==='sections'){const st=stepState(regionNeeds(r));x.fillStyle=r===FG.sel?'rgba(255,255,255,.14)':'rgba(0,0,0,0)';x.fillRect(x0,y0,w,h);
x.font=`600 ${Math.max(9,z*2.6)}px "IBM Plex Mono",monospace`;x.fillStyle=st==='e'?'#ff5a40':st==='w'?'#ffc04a':'#bfe08a';x.fillText(ROLE_SHORT[d.roles[r]]||d.roles[r],x0+4,y0+Math.max(11,z*3.2))}
x.strokeStyle=cur==='sections'&&r===FG.sel?'#ffffff':'rgba(0,255,255,.55)';x.lineWidth=cur==='sections'&&r===FG.sel?2:1;x.strokeRect(x0+.5,y0+.5,w-1,h-1)}
x.strokeStyle='rgba(255,60,40,.8)';x.lineWidth=1;x.beginPath();x.moveTo(0,S.h*z-1.5);x.lineTo(S.w*z,S.h*z-1.5);x.stroke();
if(cur==='wheels'||cur==='images'||cur==='start')(d.spec.wheels||[]).forEach((o,i)=>{x.strokeStyle='#ffd400';x.lineWidth=2;x.beginPath();x.arc(o.x*z,o.y*z,o.r*z,0,7);x.stroke();x.fillStyle='#ffd400';x.font=`600 ${Math.max(9,z*2.4)}px "IBM Plex Mono",monospace`;x.fillText('W'+(i+1),o.x*z-o.r*z,o.y*z-o.r*z-3)});
if(cur==='points'||cur==='test'){const pts=Object.assign({},FG.unit?FG.unit.pts:{},d.spec.points);
for(const k of neededPoints()){const p=pts[k];if(!p)continue;const set=!!(d.spec.points&&d.spec.points[k]);x.strokeStyle=k.startsWith('coupler')?'#ff3cff':set?'#3cff78':'#ffc04a';x.lineWidth=2;x.strokeRect(p[0]*z+1,p[1]*z+1,z-2,z-2);
x.fillStyle=x.strokeStyle;x.font=`${Math.max(9,z*2.2)}px "IBM Plex Mono",monospace`;const lab=PT_LABEL[k];x.fillText(lab,Math.min(p[0]*z+z+3,S.w*z-x.measureText(lab).width-2),Math.max(10,p[1]*z+(k.startsWith('coupler')?z*4:z)))}}
if((cur==='effects'||cur==='test')&&d.spec.effects)d.spec.effects.forEach((e,i)=>{const T=EFX[e.t]||{col:'#fff'},px=(e.x+.5)*z,py=(e.y+.5)*z;
if(T.dir){const a=(e.a??T.a??0)*Math.PI/180;x.strokeStyle=T.col;x.lineWidth=2;x.beginPath();x.moveTo(px,py);x.lineTo(px+Math.cos(a)*z*5,py+Math.sin(a)*z*5);x.stroke()}
x.fillStyle=T.col;x.strokeStyle=i===FG.pickFx?'#fff':'#000';x.lineWidth=2;x.beginPath();x.arc(px,py,Math.max(5,z*1.6),0,7);x.fill();x.stroke();
x.fillStyle='#000';x.font=`600 ${Math.max(9,z*2)}px "IBM Plex Mono",monospace`;x.textAlign='center';x.textBaseline='middle';x.fillText(i+1,px,py+1);x.textAlign='start';x.textBaseline='alphabetic'});
if(cur==='paint'&&FG.paintMode!=='paint'){const r=FG.sel,air3=isAirBase(d.base),bw3=S.w/(air3?3:4),x0=(air3?r:r%4)*bw3*z,y0=air3||r<4?0:S.split*z;x.strokeStyle='#fff';x.lineWidth=3;x.strokeRect(x0+1.5,y0+1.5,bw3*z-3,(air3?S.h:r<4?S.split:S.h-S.split)*z-3)}
if(isAirBase(d.base)&&['sections','points','test','paint'].includes(cur)){const b=airBalance();if(b){const cx2=(b.com[0])*z,cy2=(b.com[1])*z;x.strokeStyle='#fff';x.lineWidth=2;x.beginPath();x.arc(cx2,cy2,z*2,0,7);x.moveTo(cx2-z*3,cy2);x.lineTo(cx2+z*3,cy2);x.moveTo(cx2,cy2-z*3);x.lineTo(cx2,cy2+z*3);x.stroke();
const lx=b.lift*z,ly=S.split*z;x.fillStyle=b.verdict[0]==='o'?'#3cff78':b.verdict[0]==='w'?'#ffc04a':'#ff5a40';x.beginPath();x.moveTo(lx,ly-z*4);x.lineTo(lx-z*2.4,ly);x.lineTo(lx+z*2.4,ly);x.fill()}}
cv.classList.toggle('pick',!!FG.pick||cur==='sections'||cur==='paint'||FG.pickFx!=null);
}
const roleOptions=sel=>{const groups={};for(const k in ROLES){const g=ROLES[k].group||'Other';(groups[g]=groups[g]||[]).push(k)}
return Object.entries(groups).map(([g,ks])=>`<optgroup label="${g}">${ks.map(k=>`<option value="${k}" ${k===sel?'selected':''}>${k} — ${ROLES[k].short}</option>`).join('')}</optgroup>`).join('')};
const BODY={
start:()=>{const d=FG.d,src=[...(isAirBase(d.base)?[d.base]:BUILTIN_TYPES.filter(t=>CARS[t].base===d.base)).map(t=>[t,(TYPE_LABEL[t]||CARS[t].name)+' (built-in)']),...Object.keys(BLUEPRINTS).filter(id=>BLUEPRINTS[id].base===d.base&&id!==d.id).map(id=>[id,BLUEPRINTS[id].name+' (yours)'])];
return`<section><h3>Type</h3><div class="seg2 seg5" id="fgBase">${Object.entries(BASE_INFO).map(([b,I])=>{const S=baseSize(b);return`<button type="button" data-base="${b}" aria-pressed="${d.base===b}">${I.label}<small>${S.w}×${S.h} px · ${I.note} · ${EFX_MAX[b]} effects</small></button>`}).join('')}</div></section>
<section class="row" style="align-items:flex-end"><div class="fld"><label for="fgName">Name</label><input id="fgName" maxlength="20" placeholder="e.g. Iron Horse" value="${d.name.replace(/"/g,'&quot;')}"></div>
<div class="fld" style="max-width:90px"><label for="fgMass">Mass</label><input id="fgMass" type="number" step="0.05" min="0.2" max="4" value="${d.spec.mass}"></div></section>
<section><div class="fld"><label for="fgFrom">Start from</label><select id="fgFrom"><option value="">Blank — I will upload my own art</option>${src.map(([v,t])=>`<option value="${v}" ${v===d.from?'selected':''}>${t}</option>`).join('')}</select></div>
<p class="note">Starting from a unit copies its art, sections, wheels and points. Change anything afterwards.</p></section>
${blocksHTML()}
<section><h3>Templates</h3><div class="row"><button class="ub2" id="fgTpl" type="button">Download templates</button></div><p class="note">guides.png (section grid, wheel circles, couplers — use it as a top layer) · example texture + material from “Start from” · palette.png with the exact material colours.</p></section>`},
images:()=>{const d=FG.d,S=baseSize(d.base);return`<section><h3>Files <small>${S.w} × ${S.h} px, both</small></h3><div class="drops">
<label class="drop" id="dropLook"><b>TEXTURE PNG</b><span id="nmLook">${d.lookName||'Drop or click to choose'}</span><canvas id="thLook" style="aspect-ratio:${S.w}/${S.h}"></canvas><input type="file" id="inLook" accept="image/png"></label>
<label class="drop" id="dropMat"><b>MATERIAL PNG</b><span id="nmMat">${d.matName||'Drop or click to choose'}</span><canvas id="thMat" style="aspect-ratio:${S.w}/${S.h}"></canvas><input type="file" id="inMat" accept="image/png"></label></div>
<div class="row" style="margin-top:8px"><button class="linkbtn" id="fgExample" type="button">Use ${d.from?'the “Start from” art':'built-in example art'} for now</button></div></section>
<section><h3>Material palette</h3><div class="mixl">${PALETTE.map(p=>`<span><i style="background:rgb(${p[1].join(',')})"></i>${p[0]} #${p[1].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase()}</span>`).join('')}</div></section>`},
wheels:()=>{const d=FG.d;if(isAirBase(d.base))return`<section><p class="note">Flyers have no wheels. WHEEL pixels you painted (landing gear) stay as tough material and don't spin. Go on to <b>Sections</b>.</p></section>`;const S=baseSize(d.base),cw=S.w/4,row=(id,lab,min,max,val,step)=>`<div class="sl"><label for="${id}">${lab}</label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"><output for="${id}">${(+val).toFixed(1)}</output></div>`;
let h='';d.spec.wheels.forEach((o,i)=>{h+=row('wx'+i,`W${i+1} ←→`,Math.max(0,cw*i-cw*.5),Math.min(S.w,cw*(i+1)+cw*.5),o.x,.5)});const w0=d.spec.wheels[0];h+=row('wy','Height',S.split-6,S.h,w0.y,.5)+row('wr','Size',2,cw/2,w0.r,.5);
return`<section><h3>Wheels <small>one per bottom section</small></h3><div id="wsWheels" style="display:flex;flex-direction:column;gap:6px">${h}</div>
<div class="row" style="margin-top:8px"><button class="ub2" id="wsAuto" type="button">Auto-detect from material</button>${d.base==='loco'?`<label style="font-size:11px;display:flex;gap:6px;align-items:center"><input type="checkbox" id="wsRods" ${d.spec.rods?'checked':''}> Coupling rods</label>`:''}</div></section>`},
sections:()=>{const d=FG.d,air=isAirBase(d.base),rc=air?3:8;FG.sel=clamp(FG.sel,0,rc-1);const r=FG.sel,ro=d.roles[r],R=ROLES[ro]||{},st=FG.unit&&FG.unit.regStats[r];
const grid=d.roles.slice(0,rc).map((x,i)=>`<button type="button" data-r="${i}" class="${stepState(regionNeeds(i))==='ok'?'o':stepState(regionNeeds(i))}" aria-pressed="${i===r}">[${air?i:i%4},${air?0:i>>2}] ${ROLES[x]?ROLES[x].short:x}<small>${air?(i===0?'cab/lift':i===1?'10 gas · A/D':'3 ammo · gun'):(i<4?'job':'running gear')}</small></button>`).join('');
const mix=st&&st.n?Object.entries(st.m).sort((a,b)=>b[1]-a[1]):[];
const ab=unitAbilities();
return`<section><h3>Sections <small>top row = job · bottom row = running gear</small></h3><div class="rgrid">${grid}</div>
<div class="rgsel"><b>Section [${r%4},${r>>2}] · ${r<4?'top row (job)':'bottom row (running gear)'}</b>
<div class="fld"><label for="fgRole">Role</label><select id="fgRole">${roleOptions(ro)}</select></div>
<p class="rhelp">${R.help||''}</p><p class="rstat">${R.stat?`Level 0: ${R.stat(0,d.base)} · upgraded L3: ${R.stat(3,d.base)}`:''}</p>
<div><div class="mix" title="Material mix">${mix.map(([m,n])=>`<span style="width:${n/st.n*100}%;background:${MAT_HEX[m]}"></span>`).join('')}</div>
<div class="mixl" style="margin-top:4px">${mix.slice(0,5).map(([m,n])=>`<span><i style="background:${MAT_HEX[m]}"></i>${MAT_NAME[m]} ${Math.round(n/st.n*100)}%</span>`).join('')}${st?`<span>${st.n} px${st.crew?` · ${st.crew} crew-window px`:''}</span>`:''}</div></div>
<ul class="rep">${regionNeeds(r).map(([s,t])=>`<li class="${s}">${t}</li>`).join('')||'<li class="o">No special needs.</li>'}</ul>
<div class="row"><button class="ub2" id="fgRowFill" type="button">Use ${ro} for the whole ${r<4?'top':'bottom'} row</button></div></div></section>
<section><h3>This unit gives the train</h3><ul class="abil">${ab.map(([k,v])=>`<li><span>${k}</span><b>${v}</b></li>`).join('')}</ul></section>`},
points:()=>{const d=FG.d,pts=Object.assign({},FG.unit?FG.unit.pts:{},d.spec.points);
return`<section><h3>Points <small>pick one, then click the pixel view</small></h3><div class="ptl">${neededPoints().map(k=>{const set=!!(d.spec.points&&d.spec.points[k]),p=pts[k];return`<button type="button" data-pt="${k}" aria-pressed="${FG.pick===k}"><span>${PT_LABEL[k]}</span><small>${PT_HELP[k]}</small><em class="${set?'set':''}">${set?'set':'auto'}${p?` ${Math.round(p[0])},${Math.round(p[1])}`:''}</em></button>`}).join('')}</div></section>`},
paint:()=>{const d=FG.d,m=FG.paintMat??M.STEEL,mode=FG.paintMode||'paint',from=FG.paintFrom??M.STEEL;
if(!d.mat)return`<section><p class="note">Add a material PNG (or use the example art in step 2) first — then you can repaint materials here.</p></section>`;
const opts=sel=>PALETTE.map(p=>`<option value="${p[2]}" ${p[2]===sel?'selected':''}>${p[0]}${p[2]>0&&MATS[p[2]]?` · ${MATS[p[2]].hp} hp${MATS[p[2]].flam>.2?' · burns':''}`:' · crew window'}</option>`).join('');
const st=FG.unit&&FG.unit.regStats[FG.sel],mix=st&&st.n?Object.entries(st.m).sort((a,b)=>b[1]-a[1]):[];
return`<section><h3>Material brush <small>change what the unit is made of, right here</small></h3>
<div class="seg" id="fgPMode" style="margin-bottom:8px">${[['paint','Paint'],['section','Replace in section'],['all','Replace everywhere']].map(([k,t])=>`<button type="button" data-pm="${k}" aria-pressed="${mode===k}">${t}</button>`).join('')}</div>
<div class="row">${mode!=='paint'?`<div class="fld"><label for="fgPFrom">Replace</label><select id="fgPFrom">${opts(from)}</select></div>`:''}<div class="fld"><label for="fgPMat">${mode==='paint'?'Material':'with'}</label><select id="fgPMat">${opts(m)}</select></div></div>
<div class="row" style="margin-top:6px"><span class="swatch" style="display:inline-block;width:18px;height:18px;border:1px solid var(--line);background:rgb(${(PALETTE.find(p=>p[2]===m)||PALETTE[0])[1].join(',')})"></span><span class="note" style="margin:0">${m>0&&MATS[m]?(MATS[m].desc||matBlurb(m)):'Crew window: glass where a crew member shows when the seat is taken.'}</span></div>
${mode==='paint'?`<div class="sl" style="margin-top:8px"><label for="fgBrush">Brush</label><input type="range" id="fgBrush" min="1" max="6" step="1" value="${FG.brush||2}"><output>${FG.brush||2}</output></div>`:`<div class="row" style="margin-top:8px"><button class="ub2" id="fgPApply" type="button">Replace ${mode==='all'?'everywhere':isAirBase(d.base)?`in box ${FG.sel+1}`:`in section [${FG.sel%4},${FG.sel>>2}]`}</button></div>`}
<div class="row" style="margin-top:8px"><button class="ub2" id="fgPUndo" type="button" ${FG.undo&&FG.undo.length?'':'disabled'}>Undo (${FG.undo?FG.undo.length:0})</button></div></section>
${mode!=='paint'&&mix.length?`<section><h3>${isAirBase(d.base)?`Box ${FG.sel+1}`:`Section [${FG.sel%4},${FG.sel>>2}]`} ${d.roles[FG.sel]} is made of</h3><div class="mix">${mix.map(([q,n])=>`<span style="width:${n/st.n*100}%;background:${MAT_HEX[q]}"></span>`).join('')}</div><div class="mixl" style="margin-top:4px">${mix.slice(0,6).map(([q,n])=>`<span><i style="background:${MAT_HEX[q]}"></i>${MAT_NAME[q]} ${Math.round(n/st.n*100)}%</span>`).join('')}</div></section>`:''}
<p class="note">Tip: aircraft skin in ALU is light but weak; KEVLAR/RUBBER deflect shots; OIL leaks when holed; COAL never stops burning by itself. Your PNG files are not changed — the repainted map is saved with the unit.</p>`},
effects:()=>{const d=FG.d,fx=d.spec.effects||(d.spec.effects=[]),mx=EFX_MAX[d.base],S=baseSize(d.base);
const typeOpts=sel=>EFX_GROUPS.map(g=>`<optgroup label="${g}">${Object.entries(EFX).filter(([k,T])=>T.group===g).map(([k,T])=>`<option value="${k}" ${k===sel?'selected':''}>${T.name}</option>`).join('')}</optgroup>`).join('');
const trOpts=sel=>Object.entries(EFX_TRIG).map(([k,t])=>`<option value="${k}" ${k===sel?'selected':''}>${t}</option>`).join('');
const sl=(i,f,lab,min,max,step,val)=>`<div class="sl"><label for="ex-${i}-${f}">${lab}</label><input type="range" id="ex-${i}-${f}" min="${min}" max="${max}" step="${step}" value="${val}"><output>${(+val).toFixed(step<1?1:0)}</output></div>`;
const cards=fx.map((e,i)=>{const T=EFX[e.t]||EFX.smoke;return`<div class="efx" style="border-left:3px solid ${T.col}"><div class="row" style="justify-content:space-between"><b>${i+1}</b><button class="ub2" type="button" data-fxpick="${i}" aria-pressed="${FG.pickFx===i}">Place on view</button><button class="ub2" type="button" data-fxdel="${i}" aria-label="Remove effect ${i+1}">✕</button></div>
<div class="fld"><label for="ex-${i}-t">Effect</label><select id="ex-${i}-t">${typeOpts(e.t)}</select></div>
<div class="fld"><label for="ex-${i}-tr">When</label><select id="ex-${i}-tr">${trOpts(e.tr||T.trig)}</select></div>
${sl(i,'x','X',0,S.w-1,.5,e.x)}${sl(i,'y','Y',0,S.h-1,.5,e.y)}${sl(i,'k','Power',0,2,.1,e.k??1)}${T.dir?sl(i,'a','Angle',-180,180,5,e.a??T.a??0):''}</div>`}).join('');
return`<section><h3>Effects <small>${fx.length} / ${mx} for a ${BASE_INFO[d.base].label.toLowerCase()}</small></h3>
<div class="efxlist">${cards||'<p class="note">No effects yet.</p>'}</div>
<div class="row" style="margin-top:8px"><button class="ub2" id="fgFxAdd" type="button" ${fx.length>=mx?'disabled':''}>+ Add effect</button></div></section>
<section><h3>Preview <small>on the unit at the right</small></h3>
<label class="chk"><input type="checkbox" id="fgFxAll" ${FG.previewAll?'checked':''}> Show every effect now (ignore “when”)</label>
<div class="sl" style="margin-top:6px"><label for="fgFxV">Speed</label><input type="range" id="fgFxV" min="0" max="60" step="1" value="${FG.previewV||0}"><output>${FG.previewV||0}</output></div>
<p class="note">An effect runs only while there is material at its point — shoot the chimney off and its smoke stops. Leaks drop real oil, water or fuel pixels: water puts out fires below, fuel makes puddles that burn.</p></section>`},
test:()=>`<section><h3>Test range</h3><button class="go" id="fgSim" type="button" style="width:100%">${isAirBase(FG.d.base)?'▶ START FLIGHT TEST':'▶ START SIMULATION'}</button>
<p class="note">${isAirBase(FG.d.base)?'Your flyer takes off against a real train: watch it fly with the physics instruments, switch between a test flight and an attack run, change the wind, and shoot it down.':'Your unit runs in a real train on a test track: spawn drones, bombers, raiders, planes, gunships, rockfall and obstacles whenever you want, and read the damage report.'}</p></section>
<section><h3>Bench test <small>use the weapon on the unit at the right</small></h3>
<div class="seg" id="fgWpn">${[['blast','Blast'],['bullet','Bullets'],['shell','Shell'],['fire','Fire'],['water','Water']].map(([k,t])=>`<button type="button" data-wpn="${k}" aria-pressed="${(FG.weapon||'blast')===k}">${t}</button>`).join('')}</div>
<div class="mini" id="wsMini" style="margin-top:8px"></div>
<div class="row" style="margin-top:8px"><button class="ub2" id="fgFire" type="button">Set it on fire</button><button class="ub2" id="fgDouse" type="button">Douse</button><button class="ub2" id="wsRepair" type="button">Rebuild</button></div></section>
<section><h3>At full health this unit gives</h3><ul class="abil">${unitAbilities().map(([k,v])=>`<li><span>${k}</span><b>${v}</b></li>`).join('')}</ul></section>`,
save:()=>{const d=FG.d,id=d.id||slug(d.name),exists=id&&BLUEPRINTS[id],air=isAirBase(d.base);
const chips=CONSIST.map((t,i)=>`<div class="chip ${t===d.id?'new':''}"><b>${i+1}. ${TYPE_LABEL[t]||t}</b><span style="color:var(--dim)">${CARS[t]?CARS[t].base:'missing'}</span><div class="ob"><button type="button" data-cm="${i}" data-d="-1" aria-label="Move left">◀</button><button type="button" data-cm="${i}" data-d="1" aria-label="Move right">▶</button><button type="button" data-cx="${i}" aria-label="Remove">✕</button></div></div>`).join('');
const addOpts=[...BUILTIN_TYPES,...Object.keys(BLUEPRINTS).filter(t=>CARS[t]&&CARS[t].base!=='air')].map(t=>`<option value="${t}">${TYPE_LABEL[t]}${BLUEPRINTS[t]?' (yours)':''}</option>`).join('');
return`<section><h3>Save</h3><div class="row" style="align-items:flex-end"><div class="fld"><label for="fgId">File id</label><input id="fgId" maxlength="24" value="${id}" ${d.id?'disabled':''}></div>
<button class="go" id="fgSave" type="button" ${FG.unit&&d.name.trim()?'':'disabled'}>${exists&&d.id===id?'SAVE CHANGES':'SAVE UNIT'}</button></div>
<div class="row" style="margin-top:8px"><button class="ub2" id="fgExport" type="button" ${FG.unit?'':'disabled'}>Export .json</button><button class="ub2" id="fgImportBtn" type="button">Import .json</button>${d.id&&BLUEPRINTS[d.id]?'<button class="ub2" id="fgDelete" type="button">Delete unit</button>':''}</div></section>
${air?`<section><h3>Enemy pool</h3><p class="note">Saved ${d.base==='plane'?'planes':d.base==='heli'?'helicopters':'drones'} join the enemies: when a ${d.base==='plane'?'plane':d.base==='heli'?'gunship':'pixel drone'} attacks, it is one of your designs ${Math.round(CFG.customFlyers*100)}% of the time (Playtest panel: customFlyers).</p></section>`:`<section><h3>Starting train <small>front → rear · a locomotive leads</small></h3><div class="chips">${chips}</div>
<div class="row" style="margin-top:8px"><div class="fld" style="max-width:200px"><label for="fgAdd">Add</label><select id="fgAdd">${addOpts}</select></div><button class="ub2" id="fgAddBtn" type="button" ${CONSIST.length>=8?'disabled':''}>Add to train</button><button class="ub2" id="fgConsistReset" type="button">Default train</button></div>
<ul class="rep" style="margin-top:8px">${trainChecks().map(([s,t])=>`<li class="${s}">${t}</li>`).join('')}</ul></section>`}`},
tiles:()=>{
G.mapSpec=G.mapSpec||Array.from({length:CFG.mapTiles},(_,i)=>({slot:i,biome:'auto',site:'auto',buried:'auto',turret:'auto',mob:'auto',png:null,img:null,name:''}));
const slot=clamp(FG.tileSlot|0,0,CFG.mapTiles-1),ts=G.mapSpec[slot];
const grid=G.mapSpec.map((t,i)=>{
const custom=!!(t.png||t.biome!=='auto'||t.site!=='auto'||t.buried!=='auto'||t.turret!=='auto');
const bLab=t.buried!=='auto'?t.buried:t.site!=='auto'?t.site:t.biome!=='auto'?t.biome:'auto';
return`<button type="button" data-tslot="${i}" class="${custom?'o':'w'}" aria-pressed="${i===slot}">#${i+1} ${t.png?'PNG':bLab.toUpperCase().slice(0,6)}<small>${t.turret==='yes'?'TURRET':t.buried==='gas'?'GAS':t.biome}</small></button>`;
}).join('');
return`<section><h3>24-Slot Leg Map <small>click a tile slot (1–24)</small></h3><div class="rgrid">${grid}</div>
<div class="rgsel"><b>Tile Slot #${slot+1} of ${CFG.mapTiles} (${Math.round(slot/CFG.mapTiles*100)}%–${Math.round((slot+1)/CFG.mapTiles*100)}% of leg)</b>
<div class="row">
<div class="fld"><label for="mtBiome">Biome</label><select id="mtBiome">${[['auto','Auto (procedural)'],['waste','Wasteland'],['city','Dead City'],['canyon','Rockfall Canyon'],['acid','Acid Rain Belt'],['lava','Lava Fields']].map(([k,t])=>`<option value="${k}" ${ts.biome===k?'selected':''}>${t}</option>`).join('')}</select></div>
<div class="fld"><label for="mtSite">Surface Structure</label><select id="mtSite">${[['auto','Auto (procedural)'],['none','None (clear)'],['ruin','Ruin'],['depot','Fuel Depot'],['armory','Armory'],['camp','Survivor Camp'],['yard','Rail Yard'],['tower','Water Tower'],['bunker','Surface Bunker'],['stranded','Stranded Survivors']].map(([k,t])=>`<option value="${k}" ${ts.site===k?'selected':''}>${t}</option>`).join('')}</select></div>
</div>
<div class="row">
<div class="fld"><label for="mtBuried">Underground Cache / Hazard</label><select id="mtBuried">${[['auto','Auto (procedural)'],['none','None'],['chest','Buried Treasure Chest'],['bunker','Sealed Old Bunker'],['gas','Volatile Gas Pocket'],['vein','Rich Scrap Vein'],['fuel','Ancient Fuel Pocket']].map(([k,t])=>`<option value="${k}" ${ts.buried===k?'selected':''}>${t}</option>`).join('')}</select></div>
<div class="fld"><label for="mtTurret">Dormant Defense Turret</label><select id="mtTurret">${[['auto','Auto (with bunkers)'],['yes','Always spawn turret'],['no','No turret']].map(([k,t])=>`<option value="${k}" ${ts.turret===k?'selected':''}>${t}</option>`).join('')}</select></div>
</div>
<label class="drop" id="dropTilePng" style="margin-top:4px"><b>CUSTOM TILE PNG (MAX 4096 PX)</b><span id="nmTilePng">${ts.name||'Drop or click to upload custom terrain/building PNG for Tile #'+(slot+1)}</span><input type="file" id="inTilePng" accept="image/png"></label>
<div class="row" style="margin-top:6px">
<button class="ub2" id="mtApplyWorld" type="button">Apply & Rebuild World Now</button>
<button class="ub2" id="mtClearSlot" type="button">Reset Tile #${slot+1}</button>
<button class="ub2" id="mtResetAll" type="button">Reset All 24 Tiles</button>
</div>
<div class="row" style="margin-top:6px">
<button class="ub2" id="mtExport" type="button">Export 24-Tile Map (.json)</button>
<button class="ub2" id="mtImportBtn" type="button">Import Map (.json)</button>
<input type="file" id="mtImportFile" accept="application/json,.json" hidden>
</div>
</div></section>`;
},
};
function trainChecks(){
const out=[],cs=CONSIST.filter(t=>CARS[t]);if(!cs.length)return[['e','The train is empty.']];
if(CARS[cs[0]].base!=='loco')out.push(['e','The first unit must be a locomotive (the default train is used until fixed).']);
const roles=cs.flatMap(t=>CARS[t].roles);
if(!roles.includes('CAB'))out.push(['e','No CAB anywhere — nobody can drive.']);
const tr=roles.filter(x=>x==='WHEEL').length;out.push([tr>=4?'o':'w',`Traction ${tr*25}%`]);
if(roles.includes('PUMP')&&!roles.includes('WATER'))out.push(['w','A PUMP but no WATER section.']);
if(roles.includes('CANNON')&&!roles.includes('AMMO'))out.push(['w','A CANNON but no AMMO storage.']);
if(!roles.includes('SEATS'))out.push(['w','No SEATS: extra crew ride on the roof and fall off.']);
const mass=cs.reduce((a,t)=>a+(CARS[t].mass||1),0);out.push(['o',`${cs.length} units · total mass ${mass.toFixed(2)}`]);
return out;
}
const AFTER={
images:()=>{const d=FG.d;thumb('thLook',d.look);thumb('thMat',d.mat);
for(const [id,kind] of [['dropLook','look'],['dropMat','mat']]){const el=$(id);
el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('over')});el.addEventListener('dragleave',()=>el.classList.remove('over'));
el.addEventListener('drop',e=>{e.preventDefault();el.classList.remove('over');takeFile(kind,e.dataTransfer.files[0])})}
$('inLook').onchange=e=>{takeFile('look',e.target.files[0]);e.target.value=''};$('inMat').onchange=e=>{takeFile('mat',e.target.files[0]);e.target.value=''}},
test:()=>{FG.miniT=0},
tiles:()=>{
const inEl=$('inTilePng'),impEl=$('mtImportFile');
if(inEl)inEl.onchange=async e=>{
const f=e.target.files[0];e.target.value='';if(!f)return;
const url=await new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.readAsDataURL(f)});
try{
const id=await decodeURL(url);
if(id.width>CFG.tileMaxPx||id.height>CFG.tileMaxPx){log(`Tile PNG exceeds ${CFG.tileMaxPx}px max (${id.width}×${id.height})`,'bad');return}
const slot=clamp(FG.tileSlot|0,0,CFG.mapTiles-1),ts=G.mapSpec[slot];
ts.png=url;ts.img=id;ts.name=`${f.name} (${id.width}×${id.height} px)`;
log(`Loaded custom PNG for Tile #${slot+1}: ${ts.name}`,'good');fgRender();
}catch(err){log('Could not read tile PNG','bad')}
};
if(impEl)impEl.onchange=e=>{
const f=e.target.files[0];e.target.value='';if(!f)return;
const fr=new FileReader();fr.onload=async()=>{
try{
const data=JSON.parse(fr.result);if(!Array.isArray(data.tiles)||data.tiles.length!==CFG.mapTiles)throw new Error('Invalid map pack');
for(let i=0;i<CFG.mapTiles;i++){
const srcT=data.tiles[i]||{};
G.mapSpec[i]={slot:i,biome:srcT.biome||'auto',site:srcT.site||'auto',buried:srcT.buried||'auto',turret:srcT.turret||'auto',mob:srcT.mob||'auto',png:srcT.png||null,img:srcT.png?await decodeURL(srcT.png):null,name:srcT.name||''};
}
genWorld(G.leg||1);log('Imported 24-Tile Map Pack and rebuilt world!','good');fgRender();
}catch(err){log('Invalid 24-Tile Map Pack JSON','bad')}
};fr.readAsText(f);
};
},
};
function thumb(id,imgd){const c=$(id);if(!c)return;if(!imgd){c.width=1;c.height=1;return}c.width=imgd.width;c.height=imgd.height;c.getContext('2d').putImageData(imgd,0,0)}
async function takeFile(kind,file){
if(!file)return;if(file.type&&file.type!=='image/png'){log('Use a PNG file','bad');return}
const url=await new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.readAsDataURL(file)});
try{const id=await decodeURL(url),d=FG.d;d.dirty=true;if(kind==='look'){d.look=id;d.lookURL=url;d.lookName=`${file.name} · ${id.width}×${id.height}`}else{d.mat=id;d.matURL=url;d.matName=`${file.name} · ${id.width}×${id.height}`;autoWheelsD(d,true)}fgRebuild()}
catch(e){log(`${file.name}: could not read this image`,'bad')}
}
async function downloadTemplates(){
const d=FG.d,S=baseSize(d.base),nm=slug(d.name)||(d.base==='loco'?'my_locomotive':'my_wagon');
const g=document.createElement('canvas');g.width=S.w;g.height=S.h;const x=g.getContext('2d'),cw=S.w/4;
x.fillStyle='rgba(0,255,255,.8)';for(let i=1;i<4;i++)x.fillRect(Math.round(i*cw),0,1,S.h);x.fillRect(0,S.split,S.w,1);
x.fillStyle='rgba(255,60,40,.9)';x.fillRect(0,S.h-1,S.w,1);
x.strokeStyle='rgba(255,212,0,.9)';x.lineWidth=1;for(const o of d.spec.wheels){x.beginPath();x.arc(o.x,o.y,o.r,0,7);x.stroke()}
const pts=Object.assign({},FG.unit?FG.unit.pts:defaultPoints(d.base==='loco'?'loco':'cargo'),d.spec.points);x.fillStyle='rgba(255,60,255,.95)';for(const k of ['couplerRear','couplerFront'])if(pts[k])x.fillRect(Math.round(pts[k][0]),Math.round(pts[k][1]),1,1);
await download(`${nm}_guides.png`,g.toDataURL('image/png'));
const z=8,sh=document.createElement('canvas');sh.width=S.w*z;sh.height=S.h*z+40;const s2=sh.getContext('2d');s2.fillStyle='#121110';s2.fillRect(0,0,sh.width,sh.height);s2.imageSmoothingEnabled=false;
if(d.look)s2.drawImage(idToCanvas(d.look),0,40,S.w*z,S.h*z);s2.globalAlpha=.9;s2.drawImage(g,0,40,S.w*z,S.h*z);s2.globalAlpha=1;
s2.font='600 14px monospace';s2.fillStyle='#d8cdb4';s2.fillText(`${(d.name||nm).toUpperCase()} · ${S.w}×${S.h} px · ${d.base}`,8,24);
d.roles.forEach((ro,r)=>{s2.fillStyle='#00ffff';s2.fillText(`[${r%4},${r>>2}] ${ro}`,(r%4)*cw*z+6,40+(r<4?0:S.split*z)+18)});
await new Promise(r=>setTimeout(r,300));await download(`${nm}_guide_sheet_8x.png`,sh.toDataURL('image/png'));
if(d.lookURL){await new Promise(r=>setTimeout(r,300));await download(`${nm}_example_look.png`,d.lookURL)}
if(d.matURL){await new Promise(r=>setTimeout(r,300));await download(`${nm}_example_material.png`,d.matURL)}
const p=document.createElement('canvas'),rowH=22;p.width=360;p.height=PALETTE.length*rowH+8;const px=p.getContext('2d');px.fillStyle='#121110';px.fillRect(0,0,p.width,p.height);px.font='12px monospace';
PALETTE.forEach((q,i)=>{px.fillStyle=`rgb(${q[1].join(',')})`;px.fillRect(6,6+i*rowH,40,rowH-4);px.fillStyle='#d8cdb4';px.fillText(`${q[0].padEnd(6)} #${q[1].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase()}`,56,6+i*rowH+13)});
await new Promise(r=>setTimeout(r,300));await download('material_palette.png',p.toDataURL('image/png'));
log('Templates downloaded (your browser may ask to allow several files)','good');
}
function unitFile(id){const d=FG.d;return{format:'train-unit-v2',id,name:d.name.trim().slice(0,20),base:d.base,roles:d.roles.slice(),spec:JSON.parse(JSON.stringify(d.spec)),look:d.lookURL,material:d.matURL,engine:GAME_VERSION}}
async function saveUnit(){
const d=FG.d;if(!FG.unit||!d.name.trim())return;let id=d.id||slug($('fgId')?$('fgId').value:d.name)||slug(d.name);
if(!id){log('Give the unit a file id','bad');return}if(BUILTIN_TYPES.includes(id)||id===FORGE_ID)id='my_'+id;
if(!d.id&&BLUEPRINTS[id]){let n=2;while(BLUEPRINTS[id+'_'+n])n++;id=id+'_'+n}
const bp=unitFile(id);try{await installBlueprint(bp)}catch(e){log('Could not save: '+e.message,'bad');return}
d.id=id;d.dirty=false;const ok=persistBlueprints();
log(ok?`Saved “${bp.name}” as a new unit type`:'Saved for this session — the browser refused to store it. Export the .json to keep it.',ok?'good':'warn');fgRebuild(true);
}
function exportUnit(){const d=FG.d;if(!FG.unit)return;const id=d.id||slug(d.name)||'unit';download(`unit_${id}.json`,new Blob([JSON.stringify(unitFile(id),null,1)],{type:'application/json'}));log('Unit file exported','good')}
async function importUnitText(txt){
let o;try{o=JSON.parse(txt)}catch(e){log('That is not a unit file','bad');return}
if(o.format==='train-unit-v1'&&CARS[o.type]){o={format:'train-unit-v2',id:null,name:o.spec.name||TYPE_LABEL[o.type],base:CARS[o.type].base,roles:CARS[o.type].roles.slice(),spec:o.spec,look:o.look,material:o.material}}
if(o.format!=='train-unit-v2'||!o.look||!o.material||!Array.isArray(o.roles)||(o.roles.length!==8&&o.roles.length!==3)){log('That is not a valid unit file','bad');return}
const d=blankDraft(o.base==='loco'||isAirBase(o.base)?o.base:'wagon');Object.assign(d,{name:o.name||'',roles:o.roles.map(r=>ROLES[r]?r:'HULL'),spec:Object.assign(d.spec,o.spec),lookURL:o.look,matURL:o.material,lookName:'imported',matName:'imported',dirty:true});
try{d.look=await decodeURL(o.look);d.mat=await decodeURL(o.material)}catch(e){log('The images inside that file are broken','bad');return}
FG.d=d;FG.step=stepIdx('sections');log(`Imported “${d.name}” — check it, then save`,'good');fgRebuild();
}
async function showWorkshop(){
G.state='workshop';document.body.classList.remove('title');overlay.hidden=true;document.body.classList.add('ws');$('ws').hidden=false;G.parts=[];G.chunks=[];G.explQ=[];G.drones=[];G.shots=[];G.rocks=[];G.loose=[];G.exp=null;
if(!FG.d){FG.d=await draftFrom('loco','loco');FG.d.name='';FG.step=0}
fgRebuild();
}
function hideWorkshop(){
$('ws').hidden=true;document.body.classList.remove('ws');document.body.classList.remove('nohud');G.parts=[];G.chunks=[];FG.pick=null;
G.train=newTrain();layout(G.train.cars,G.train.x);G.all=G.train.cars.slice();computeCaps();
G.camX=clamp(G.train.x-S.W*.6,0,G.world.W-S.W-1);G.camY=clamp(G.train.cars[0].ay-S.H*.66,0,G.world.H-S.H-1);showTitle();
}
function goStep(i){FG.step=clamp(i,0,STEPS.length-1);FG.pick=null;FG.visited.add(FG.step);fgRender();$('ws').scrollTop=0}
$('wsBack').onclick=hideWorkshop;
$('fgPrev').onclick=()=>goStep(FG.step-1);
$('fgNext').onclick=()=>{if(FG.step===STEPS.length-1)hideWorkshop();else goStep(FG.step+1)};
$('fgSteps').addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(b)goStep(+b.dataset.step)});
$('fgNew').onclick=async()=>{FG.d=await draftFrom('',FG.d?FG.d.base:'wagon');FG.visited=new Set();goStep(0);fgRebuild()};
$('fgUnit').onchange=async e=>{const id=e.target.value;if(!id)return;const d=await draftFrom(id);d.id=id;d.name=BLUEPRINTS[id].name;d.from='';d.dirty=false;FG.d=d;FG.visited=new Set([stepIdx('test')]);goStep(stepIdx('sections'));fgRebuild()};
$('wsView').addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(!b)return;FG.view=b.dataset.v;[...$('wsView').children].forEach(x=>x.setAttribute('aria-pressed',x===b));fgDraw()});
$('wsZoom').addEventListener('click',e=>{const d=FG.d,S=baseSize(d.base),r=e.target.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)/r.width*S.w),y=Math.floor((e.clientY-r.top)/r.height*S.h),cur=STEPS[FG.step][0];
if(FG.pick){d.spec.points[FG.pick]=[clamp(x,0,S.w-1),clamp(y,0,S.h-1)];d.dirty=true;log(`${PT_LABEL[FG.pick]} set to ${x}, ${y}`,'good');FG.pick=null;fgRebuild(true);return}
if(cur==='effects'&&FG.pickFx!=null){const e=d.spec.effects[FG.pickFx];if(e){e.x=clamp(x,0,S.w-1);e.y=clamp(y,0,S.h-1);d.dirty=true}FG.pickFx=null;fgRender();return}
if(cur==='paint'){return}
if(cur==='sections'||cur==='start'||cur==='images'){FG.sel=isAirBase(d.base)?Math.min(2,Math.floor(x/(S.w/3))):Math.min(3,Math.floor(x/(S.w/4)))+(y>=S.split?4:0);if(cur!=='sections')goStep(stepIdx('sections'));else fgRender()}});
$('fgImport').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const fr=new FileReader();fr.onload=()=>importUnitText(fr.result);fr.readAsText(f)};
$('fgBody').addEventListener('click',async e=>{const t=e.target.closest('button');if(!t)return;const d=FG.d;
if(t.dataset.base&&t.dataset.base!==d.base){const b=t.dataset.base,nd=await draftFrom(isAirBase(b)?b:'',b);nd.name=d.name;FG.d=nd;FG.undo=[];fgRebuild();return}
if(t.dataset.pm){FG.paintMode=t.dataset.pm;fgRender();return}
if(t.id==='fgPApply'){paintReplace(FG.paintMode==='all'?-1:FG.sel);return}
if(t.id==='fgPUndo'){if(FG.undo&&FG.undo.length){d.mat=FG.undo.pop();commitMat()}return}
if(t.dataset.fxpick!==undefined){const i=+t.dataset.fxpick;FG.pickFx=FG.pickFx===i?null:i;fgRender();return}
if(t.dataset.fxdel!==undefined){d.spec.effects.splice(+t.dataset.fxdel,1);FG.pickFx=null;d.dirty=true;fgRebuild(true);return}
if(t.id==='fgFxAdd'){const fx=d.spec.effects;if(fx.length>=EFX_MAX[d.base])return;const S=baseSize(d.base),def=isAirBase(d.base)?'exhaust':d.base==='loco'?'smoke':'lantern',T=EFX[def];
fx.push({t:def,x:Math.round(S.w/2),y:Math.round(S.split/2),k:1,a:T.a||0,tr:T.trig});FG.pickFx=fx.length-1;d.dirty=true;fgRebuild(true);return}
if(t.dataset.wpn){FG.weapon=t.dataset.wpn;fgRender();return}
if(t.id==='fgAsm'){await assembleFromForm();return}
if(t.id==='fgSim'){startSim();return}
if(t.id==='fgTpl'){downloadTemplates();return}
if(t.id==='fgExample'){const src=d.from||(d.base==='loco'?'loco':'cargo');if(BLUEPRINTS[src]){const nd=await draftFrom(src);d.look=nd.look;d.mat=nd.mat;d.lookURL=nd.lookURL;d.matURL=nd.matURL}else Object.assign(d,builtinArt(src));d.lookName=`example (${TYPE_LABEL[src]})`;d.matName='example material';autoWheelsD(d,true);d.dirty=true;fgRebuild();return}
if(t.id==='wsAuto'){autoWheelsD(d);d.dirty=true;fgRebuild();return}
if(t.dataset.r!==undefined){FG.sel=+t.dataset.r;fgRender();return}
if(t.id==='fgRowFill'){const ro=d.roles[FG.sel],a=FG.sel<4?0:4;for(let i=a;i<a+4;i++)d.roles[i]=ro;d.dirty=true;fgRebuild(true);return}
if(t.dataset.pt){FG.pick=FG.pick===t.dataset.pt?null:t.dataset.pt;fgRender();return}
if(t.id==='fgFire'){const c=G.train.cars[0];for(let n=0;n<700;n++){const k=(Math.random()*c.n)|0;if(c.mat[k]&&FLAM[c.mat[k]]>.02)c.fire[k]=.8}log('Fire!','bad');return}
if(t.id==='fgDouse'){const c=G.train.cars[0];for(let k=0;k<c.n;k++){c.fire[k]=0;if(c.mat[k])wetArea(c,k,0)}return}
if(t.id==='wsRepair'){fgRebuild();return}
if(t.id==='fgSave'){await saveUnit();return}
if(t.id==='fgExport'){exportUnit();return}
if(t.id==='fgImportBtn'){$('fgImport').click();return}
if(t.id==='fgDelete'){if(!t.dataset.sure){t.dataset.sure=1;t.textContent='Click again to delete';return}const id=d.id;delete BLUEPRINTS[id];delete CUSTOM[id];persistBlueprints();CONSIST=CONSIST.filter(x=>x!==id);persistConsist();d.id=null;d.dirty=true;log(`Deleted unit “${id}”`,'warn');fgRender();return}
if(t.dataset.cm!==undefined){const i=+t.dataset.cm,j=i+(+t.dataset.d);if(j<0||j>=CONSIST.length)return;[CONSIST[i],CONSIST[j]]=[CONSIST[j],CONSIST[i]];persistConsist();fgRender();return}
if(t.dataset.cx!==undefined){CONSIST.splice(+t.dataset.cx,1);persistConsist();fgRender();return}
if(t.id==='fgAddBtn'){if(CONSIST.length>=8)return;const v=$('fgAdd').value;if(CARS[v]&&CARS[v].base==='loco'&&CONSIST.length&&CARS[CONSIST[0]]&&CARS[CONSIST[0]].base==='loco'){CONSIST[0]=v;log(`${TYPE_LABEL[v]} now leads the train`,'good')}else if(CARS[v]&&CARS[v].base==='loco')CONSIST.unshift(v);else CONSIST.push(v);persistConsist();fgRender();return}
if(t.id==='fgConsistReset'){CONSIST=DEFAULT_CONSIST.slice();persistConsist();fgRender();return}
if(t.dataset.tslot!==undefined){FG.tileSlot=+t.dataset.tslot;fgRender();return}
if(t.id==='mtApplyWorld'){genWorld(G.leg||1);log('Rebuilt world with your 24-tile map settings!','good');fgRender();return}
if(t.id==='mtClearSlot'){const s=clamp(FG.tileSlot|0,0,CFG.mapTiles-1);G.mapSpec[s]={slot:s,biome:'auto',site:'auto',buried:'auto',turret:'auto',mob:'auto',png:null,img:null,name:''};fgRender();return}
if(t.id==='mtResetAll'){G.mapSpec=Array.from({length:CFG.mapTiles},(_,i)=>({slot:i,biome:'auto',site:'auto',buried:'auto',turret:'auto',mob:'auto',png:null,img:null,name:''}));genWorld(G.leg||1);log('Reset all 24 map tiles to procedural defaults','warn');fgRender();return}
if(t.id==='mtExport'){const pack={format:'train-map-24-v1',engine:GAME_VERSION,tiles:(G.mapSpec||[]).map(x=>({slot:x.slot,biome:x.biome,site:x.site,buried:x.buried,turret:x.turret,mob:x.mob,name:x.name,png:x.png}))};download('map_24tiles.json',new Blob([JSON.stringify(pack,null,1)],{type:'application/json'}));log('Exported 24-tile map pack','good');return}
if(t.id==='mtImportBtn'){$('mtImportFile')?.click();return}
});
$('fgBody').addEventListener('input',e=>{const t=e.target,d=FG.d;
if(t.id==='fgBrush'){FG.brush=+t.value;t.nextElementSibling.textContent=t.value;return}
if(t.id==='fgFxV'){FG.previewV=+t.value;t.nextElementSibling.textContent=t.value;return}
if(t.id.startsWith('ex-')&&t.type==='range'){const[,i,f]=t.id.split('-'),ef=d.spec.effects[+i];if(ef){ef[f]=+t.value;t.nextElementSibling.textContent=(+t.value).toFixed(f==='x'||f==='y'||f==='k'?1:0);d.dirty=true;fgDraw()}return}
if(t.id==='fgName'){d.name=t.value;d.dirty=true;registerType(FORGE_ID,d.name||'NEW UNIT',d.base,d.roles,d.spec.mass);const a=allChecks();$('wsRep').innerHTML=a.start.map(([s,x])=>`<li class="${s}">${x}</li>`).join('');return}
if(t.type==='range'){const v=+t.value;t.nextElementSibling.textContent=v.toFixed(1);if(t.id==='wy')d.spec.wheels.forEach(o=>o.y=v);else if(t.id==='wr')d.spec.wheels.forEach(o=>o.r=v);else d.spec.wheels[+t.id.slice(2)].x=v;d.dirty=true;
registerType(FORGE_ID,d.name||'NEW UNIT',d.base,d.roles,d.spec.mass);const r=compileUnit(FORGE_ID,d.look,d.mat,Object.assign({},d.spec,{roles:d.roles}));FG.unit=r.unit||null;FG.rep=r.rep;
if(FG.unit){const car=makeCar(FORGE_ID,FG.unit);car.phase=G.train.cars[0].phase;car.occ.fill(1);G.train={cars:[car],x:800,v:0};placeBench(car);G.all=G.train.cars.slice();updateRegions(car)}
fgDraw();const a=allChecks();$('wsRep').innerHTML=(a.wheels.length?a.wheels:[['o','Nothing to fix here.']]).map(([s,x])=>`<li class="${s}">${x}</li>`).join('')}});
$('fgBody').addEventListener('change',async e=>{const t=e.target,d=FG.d;
if(t.id==='fgMass'){d.spec.mass=clamp(+t.value||1,.2,4);d.dirty=true;fgRebuild(true);return}
if(t.id==='fgFrom'){const nd=await draftFrom(t.value,d.base);nd.name=d.name||(t.value?(TYPE_LABEL[t.value]||'')+' MK2':'');nd.id=d.id;FG.d=nd;fgRebuild();return}
if(t.id==='wsRods'){d.spec.rods=t.checked;d.dirty=true;fgRebuild(true);return}
if(t.id==='fgRole'){d.roles[FG.sel]=t.value;d.dirty=true;fgRebuild(true);return}
if(t.id==='fgPMat'){FG.paintMat=+t.value;fgRender();return}
if(t.id==='fgPFrom'){FG.paintFrom=+t.value;return}
if(t.id==='fgFxAll'){FG.previewAll=t.checked;return}
if(t.id==='mtBiome'||t.id==='mtSite'||t.id==='mtBuried'||t.id==='mtTurret'){
const s=clamp(FG.tileSlot|0,0,CFG.mapTiles-1),ts=G.mapSpec[s];
if(t.id==='mtBiome')ts.biome=t.value;
if(t.id==='mtSite')ts.site=t.value;
if(t.id==='mtBuried')ts.buried=t.value;
if(t.id==='mtTurret')ts.turret=t.value;
fgRender();return;
}
if(t.id.startsWith('ex-')){const[,i,f]=t.id.split('-'),ef=d.spec.effects[+i];if(!ef)return;if(f==='t'){const T=EFX[t.value];ef.t=t.value;ef.tr=T.trig;ef.a=T.a||0}else ef.tr=t.value;d.dirty=true;fgRebuild(true);return}
});
function matBlurb(m){const q=MATS[m];if(!q)return'';const t=[`${q.hp} hp`,`mass ${q.mass}`];if(q.flam>=.5)t.push('burns easily');else if(q.flam>=.2)t.push('burns');else if(!q.flam)t.push('fireproof');
if(q.deflect)t.push(`deflects ${q.deflect*100|0}% of shots`);if(q.drip)t.push('drips when burning');if(q.leak)t.push('leaks when holed');if(q.boom)t.push('can pop');if(q.spark)t.push('sparks');if(q.glow)t.push('glows');if(q.see)t.push('see-through');if(q.sway)t.push('sways in wind');if(q.rust>=.6)t.push('rusts');if(q.flam>0&&q.decay===0)t.push('never goes out by itself');return t.join(' · ')}
function matSnapshot(){const d=FG.d;FG.undo=FG.undo||[];FG.undo.push(new ImageData(new Uint8ClampedArray(d.mat.data),d.mat.width,d.mat.height));if(FG.undo.length>15)FG.undo.shift()}
function palRGB(m){return(PALETTE.find(p=>p[2]===m)||PALETTE[0])[1]}
function paintAt(x,y){const d=FG.d,S=baseSize(d.base),r=(FG.brush||2)-1,col=palRGB(FG.paintMat??M.STEEL);let n=0;
for(let j=y-r;j<=y+r;j++)for(let i=x-r;i<=x+r;i++){if(i<0||j<0||i>=S.w||j>=S.h||(i-x)**2+(j-y)**2>r*r+.5)continue;const q=(j*S.w+i)*4;if(d.look&&d.look.data[q+3]<128)continue;d.mat.data[q]=col[0];d.mat.data[q+1]=col[1];d.mat.data[q+2]=col[2];d.mat.data[q+3]=255;n++}return n}
function paintReplace(sec){const d=FG.d,S=baseSize(d.base),from=palRGB(FG.paintFrom??M.STEEL),to=palRGB(FG.paintMat??M.STEEL),cw=S.w/4;if(!d.mat)return;matSnapshot();let n=0;
for(let j=0;j<S.h;j++)for(let i=0;i<S.w;i++){if(sec>=0&&(isAirBase(d.base)?Math.min(2,Math.floor(i/(S.w/3))):Math.min(3,Math.floor(i/cw))+(j>=S.split?4:0))!==sec)continue;const q=(j*S.w+i)*4;if(d.mat.data[q+3]<128)continue;
const[pi,dd]=nearestPal(d.mat.data[q],d.mat.data[q+1],d.mat.data[q+2]);if(dd>2700||PALETTE[pi][1]!==from&&PALETTE[pi][1].join()!==from.join())continue;d.mat.data[q]=to[0];d.mat.data[q+1]=to[1];d.mat.data[q+2]=to[2];n++}
log(n?`Replaced ${n} pixels`:'Nothing to replace there',n?'good':'warn');commitMat()}
function commitMat(){const d=FG.d;d.matURL=idToCanvas(d.mat).toDataURL('image/png');d.matName=(d.matName||'material').replace(/ \(repainted\)$/,'')+' (repainted)';d.dirty=true;fgRebuild(true)}
{let painting=false;const cv=$('wsZoom'),at=e=>{const d=FG.d,S=baseSize(d.base),r=cv.getBoundingClientRect();return[Math.floor((e.clientX-r.left)/r.width*S.w),Math.floor((e.clientY-r.top)/r.height*S.h)]};
cv.addEventListener('pointerdown',e=>{if(STEPS[FG.step][0]!=='paint'||!FG.d.mat)return;const S=baseSize(FG.d.base),p=at(e);
if((FG.paintMode||'paint')!=='paint'){FG.sel=isAirBase(FG.d.base)?Math.min(2,Math.floor(p[0]/(S.w/3))):Math.min(3,Math.floor(p[0]/(S.w/4)))+(p[1]>=S.split?4:0);fgRender();return}
painting=true;cv.setPointerCapture(e.pointerId);matSnapshot();paintAt(p[0],p[1]);fgDraw()});
cv.addEventListener('pointermove',e=>{if(!painting)return;const p=at(e);paintAt(p[0],p[1]);fgDraw()});
const end=()=>{if(!painting)return;painting=false;commitMat()};cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end)}
function benchFire(x,y){const w=FG.weapon||'blast';
if(w==='blast'){G.wsCool=.18;G.explQ.push({x,y,r:4.5,p:85,ign:.35,cause:'test'})}
else if(w==='bullet'){G.wsCool=.09;const sx=x-70,sy=y-35,a=Math.atan2(y-sy,x-sx)+rand(-.03,.03);G.shots.push({x:sx,y:sy,vx:Math.cos(a)*240,vy:Math.sin(a)*240,kind:'bullet',src:'raider',life:1.2});sfx('shot',.6,sx)}
else if(w==='shell'){G.wsCool=.5;const sx=x-90,sy=y-30,a=Math.atan2(y-sy,x-sx);G.shots.push({x:sx,y:sy,vx:Math.cos(a)*CFG.shellSpeed,vy:Math.sin(a)*CFG.shellSpeed,kind:'shell',life:2,age:.2});sfx('gun')}
else if(w==='fire'){G.wsCool=.05;const h=carAtPoint(x,y);if(h){const c=h[0];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const l=toLocal(c,x,y),i=Math.floor(l[0])+dx,j=Math.floor(l[1])+dy;if(i<0||j<0||i>=c.w||j>=c.h)continue;const k=j*c.w+i;if(c.mat[k]&&FLAM[c.mat[k]]>0)c.fire[k]=Math.max(c.fire[k],.8)}}else spawn(x,y,0,-10,.3,[255,150,50],1,'ember')}
else if(w==='water'){G.wsCool=.03;for(let i=0;i<3;i++)addActive(x-40+rand(-2,2),y-30+rand(-2,2),130+rand(-15,15),70+rand(-15,15),M.WATER,60,120,230,0,0)}}
function wsStep(dt){
G.t+=dt;const c=G.train.cars[0];c.phase+=dt*(isAirBase(FG.d.base)?14:2.2);if(isAirBase(FG.d.base)){c.ay=groundY(c.ax)-34+Math.sin(G.t*1.3)*1.5;vehPose(c)}else layout(G.train.cars,G.train.x);G.all=G.train.cars;
G.windAmp=.5+.35*Math.sin(G.t*.13);G.wind=CFG.wind*G.windAmp;
for(let n=0;n<10&&G.explQ.length;n++)explode(G.explQ.shift());
updateShots(dt);simCar(c,dt,'waste');structural(dt);updateChunks(dt);updateLights(dt);PX.kickBudget=120;pxStep(dt);pxFires(dt);updateRegions(c);updateParticles(dt);effectsTick(dt,{v:FG.previewV||0,all:!!FG.previewAll});
if(G.mouse.down&&STEPS[FG.step][0]==='test'&&!G.mouse.overUI&&(G.wsCool=(G.wsCool||0)-dt)<=0){benchFire(G.mouse.wx,G.mouse.wy)}
else if(G.mouse.down&&STEPS[FG.step][0]!=='test'&&(G.wsCool=(G.wsCool||0)-dt)<=0){G.wsCool=.18;G.explQ.push({x:G.mouse.wx,y:G.mouse.wy,r:4.5,p:85,ign:.35,cause:'test'})}
zoomTick(dt,190);const wide=innerWidth>760,tx=c.ax-S.W*(wide?.66:.5),ty=c.ay-S.H*.6;
G.camX=lerp(G.camX,tx,Math.min(1,dt*4));G.camY=lerp(G.camY,ty,Math.min(1,dt*4));G.camX=clamp(G.camX,0,G.world.W-S.W-1);G.camY=clamp(G.camY,0,G.world.H-S.H-1);
G.shake=Math.max(0,G.shake-dt*18);G.flash=Math.max(0,G.flash-dt*2.5);
if((FG.miniT-=dt)<=0&&$('wsMini')){FG.miniT=.15;$('wsMini').innerHTML=Array.from(c.regInt.subarray(0,c.regCount||8),(v,r)=>`<div style="background:${intColor(v)}">${ROLE_SHORT[c.d.roles[r]]||c.d.roles[r]} ${Math.round(v*100)}%${c.alive[r]?'':' OFF'}</div>`).join('')}
}
