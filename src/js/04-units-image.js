/* ---------- image-based units (Asset Workshop) ---------- */
const CUSTOM={};
const USIZE={plane:{w:72,h:26,split:26,r:3,y:24},heli:{w:66,h:26,split:26,r:3,y:24},drone:{w:27,h:12,split:12,r:2,y:11},mole:{w:64,h:26,split:26,r:3,y:23},tank:{w:72,h:26,split:26,r:3,y:23},loco:{w:120,h:50,split:34,r:7.5,y:42},tender:{w:100,h:44,split:30,r:6,y:37.5},passenger:{w:100,h:44,split:30,r:6,y:37.5},armored:{w:100,h:44,split:30,r:6,y:37.5},cargo:{w:100,h:44,split:30,r:6,y:37.5},water:{w:100,h:44,split:30,r:6,y:37.5},crane:{w:100,h:44,split:30,r:6,y:37.5},carrier:{w:100,h:44,split:30,r:6,y:37.5},helipad:{w:100,h:44,split:30,r:6,y:37.5},driller:{w:100,h:44,split:30,r:6,y:37.5}};
const isAirUnit=d=>!!(d&&(d.base==='air'||d.base==='plane'||d.base==='heli'||d.base==='drone'||d.vkind));
const regCount=d=>isAirUnit(d)?3:8;
const cellReg=(w,split,air,i,j)=>air?Math.min(2,Math.floor(i/(w/3))):Math.min(3,Math.floor(i/(w/4)))+(j>=split?4:0);
const PALETTE=(()=>{const base=['STEEL','ARMOR','WOOD','FUEL','AMMO','GLASS'].map(k=>[k,MATS[M[k]].pal,M[k]]);base.push(['CREW',[255,0,255],-1]);
for(const m of MATS)if(m.pal&&!base.some(p=>p[2]===m.id))base.push([m.key,m.pal,m.id]);return base})();
function nearestPal(r,g,b){let bi=0,bd=1e9;for(let i=0;i<PALETTE.length;i++){const c=PALETTE[i][1],d=(r-c[0])**2+(g-c[1])**2+(b-c[2])**2;if(d<bd){bd=d;bi=i}}return[bi,bd]}
const BUILTIN_TYPES=['loco','tender','passenger','armored','cargo','water','crane','carrier','helipad','driller'];
function defaultPoints(type,roles){const S=USIZE[type],w=S.w,base=(CARS[type]&&CARS[type].base)||'wagon';const p={couplerRear:[0,S.split+(base==='loco'?3:2)],couplerFront:[w-1,S.split+(base==='loco'?3:2)]};
if(base==='air'){const vk=CARS[type].vkind||type;if(vk==='plane'){p.nose=[w-1,Math.round(S.h*.42)];p.bay=[Math.round(w*.45),Math.round(S.h*.82)]}else p.gun=[w-3,Math.round(S.h*.7)];if(CARS[type].pts)for(const k of['nose','bay','gun'])if(CARS[type].pts[k]&&!CARS[type].blueprint&&type!=='__forge')p[k]=CARS[type].pts[k].slice();return p}
if(!roles&&BUILTIN_TYPES.includes(type)){if(type==='loco'){p.smoke=[95,0];p.lamp=[113,8]}if(type==='armored'){p.turret=[41,8];p.cook=[12,18]}if(type==='water')p.nozzle=[69,1];if(type==='crane'){p.hook=[93,4];p.store=[12,15]}return p}
roles=roles||CARS[type].roles;const cw=w/4,top=r=>[Math.round((r%4+.5)*cw),2],mid=r=>[Math.round((r%4+.5)*cw),Math.round(S.split*.55)];
if(base==='loco'){p.smoke=[Math.round(w*.8),0];p.lamp=[w-6,8]}
roles.forEach((ro,r)=>{if(r>=4)return;if(ro==='CANNON'&&!p.turret)p.turret=top(r);if(ro==='AMMO'&&!p.cook)p.cook=mid(r);if(ro==='PUMP'&&!p.nozzle)p.nozzle=[top(r)[0],1];if(ro==='BOOM'&&!p.hook)p.hook=[Math.min(w-6,top(r)[0]+Math.round(cw*.3)),4];if((ro==='STORE'||ro==='SCRAP')&&roles.includes('BOOM')&&!p.store)p.store=mid(r)});
if(roles.includes('BOOM')&&!p.store)p.store=[12,15];
return p}
function defaultSpec(type){const S=USIZE[type],cw=S.w/4;return{name:'',mass:CARS[type].mass,rods:CARS[type].base==='loco',roles:CARS[type].roles.slice(),wheels:CARS[type].base==='air'?[]:[0,1,2,3].map(i=>({x:cw*i+cw/2,y:S.y,r:S.r})),points:defaultPoints(type)}}
function compileUnit(type,L,Mt,spec){
const S=USIZE[type],w=S.w,h=S.h,n=w*h,rep={errors:[],warns:[],ok:[]},base=CARS[type].base||'wagon',air=base==='air',rc=air?3:8,roles=(spec&&spec.roles&&(spec.roles.length===rc||spec.roles.length===8))?(air&&spec.roles.length===8?['CAB','ENGINE','WEAPON']:spec.roles.slice(0,rc)):CARS[type].roles;
if(!L)rep.errors.push('Add a texture PNG.');else if(L.width!==w||L.height!==h)rep.errors.push(`Texture must be exactly ${w}×${h} px — this one is ${L.width}×${L.height}.`);
if(!Mt)rep.errors.push('Add a material PNG.');else if(Mt.width!==w||Mt.height!==h)rep.errors.push(`Material must be exactly ${w}×${h} px — this one is ${Mt.width}×${Mt.height}.`);
if(rep.errors.length)return{rep};
const rgb=new Uint8ClampedArray(n*3),mat=new Uint8Array(n),crew=new Uint8Array(n);
let unknown=0,near=0,noMat=0,noLook=0,wheelPx=0,solid=0;
for(let k=0;k<n;k++){const q=k*4,la=L.data[q+3]>=128,ma=Mt.data[q+3]>=128;
if(!la){if(ma)noLook++;continue}
solid++;rgb[k*3]=L.data[q];rgb[k*3+1]=L.data[q+1];rgb[k*3+2]=L.data[q+2];
if(!ma){mat[k]=M.STEEL;noMat++;continue}
const[pi,d]=nearestPal(Mt.data[q],Mt.data[q+1],Mt.data[q+2]);
if(d>2700){unknown++;mat[k]=M.STEEL;continue}if(d>0)near++;
const id=PALETTE[pi][2];if(id<0){mat[k]=M.GLASS;crew[k]=1}else mat[k]=id;if(id===M.WHEEL)wheelPx++}
if(!solid){rep.errors.push('The texture is fully transparent.');return{rep}}
if(noMat)rep.warns.push(`${noMat} texture pixels have no material — treated as STEEL.`);
if(noLook)rep.warns.push(`${noLook} material pixels have no texture under them — ignored.`);
if(unknown)rep.warns.push(`${unknown} material pixels are not palette colours — treated as STEEL.`);
if(near)rep.warns.push(`${near} material pixels were close-but-not-exact palette colours (anti-aliasing?) — snapped.`);
const cnt=new Array(rc).fill(0);for(let k=0;k<n;k++)if(mat[k]){const i=k%w,j=(k/w)|0;cnt[cellReg(w,S.split,air,i,j)]++}
cnt.forEach((c,r)=>{if(c<25)rep.warns.push(`Region [${air?r:r%4},${air?0:r>>2}] ${roles[r]} has only ${c} pixels — it will break almost instantly.`)});
const sil=new Uint8Array(n),seen=new Uint8Array(n),blobs=[];
for(let k=0;k<n;k++){if(!crew[k]||seen[k])continue;const st=[k],bl=[];seen[k]=1;while(st.length){const q=st.pop();bl.push(q);const i=q%w;for(const nb of[i>0?q-1:-1,i<w-1?q+1:-1,q-w,q+w])if(nb>=0&&nb<n&&crew[nb]&&!seen[nb]){seen[nb]=1;st.push(nb)}}
let mx=1e9;for(const q of bl)mx=Math.min(mx,q%w);const j0=(bl[0]/w)|0;blobs.push({bl,mx,r:cellReg(w,S.split,air,mx,j0)})}
blobs.sort((a,b)=>a.mx-b.mx);const perR={};
let cab=false;for(const b of blobs){let v=0;if(roles[b.r]==='CAB'&&!cab){v=1;cab=true}else if(roles[b.r]==='SEATS'){perR[b.r]=(perR[b.r]||0)+1;v=2+b.r*2+((perR[b.r]-1)%2)}for(const q of b.bl)sil[q]=v}
if(blobs.length)rep.ok.push(`${blobs.length} crew window${blobs.length>1?'s':''} found.`);
const wheels=spec.wheels.map(o=>({cx:+o.x,cy:+o.y,r:+o.r}));let inside=0;
for(let k=0;k<n;k++)if(mat[k]===M.WHEEL){const i=k%w+.5,j=((k/w)|0)+.5;if(wheels.some(o=>Math.hypot(i-o.cx,j-o.cy)<=o.r+.75))inside++}
if(base==='air'){if(wheelPx)rep.ok.push(`${wheelPx} WHEEL pixels (landing gear) — they do not spin on a flyer.`)}
else if(!wheelPx)rep.warns.push('No WHEEL (#FFFFFF) pixels in the material map — wheels will not spin.');
else if(inside<wheelPx)rep.warns.push(`${wheelPx-inside} of ${wheelPx} wheel pixels sit outside the wheel circles — move the sliders or press Auto-detect.`);
else rep.ok.push(`Wheels aligned: all ${wheelPx} wheel pixels are inside the circles.`);
if(!rep.warns.length)rep.ok.push('Texture and material match pixel for pixel.');
const regStats=Array.from({length:rc},()=>({n:0,m:{},crew:0}));for(let k=0;k<n;k++)if(mat[k]){const i=k%w,j=(k/w)|0,r=cellReg(w,S.split,air,i,j),st=regStats[r];st.n++;if(crew[k])st.crew++;st.m[mat[k]]=(st.m[mat[k]]||0)+1}
const d=Object.assign({},CARS[type],{roles:roles.slice(),base,w,h,split:S.split,mass:+spec.mass||CARS[type].mass,wheelR:wheels.length?wheels.reduce((a,o)=>a+o.r,0)/wheels.length:(CARS[type].wheelR||2),name:(spec.name||CARS[type].name).toUpperCase().slice(0,20),paint:null});
const pts=Object.assign(defaultPoints(type,spec.roles),spec.points||{});
return{rep,unit:{type,w,h,rgb,mat,sil,wheels,d,pts,rods:!!spec.rods,spec,regStats}};
}
function applyCustom(c,u){
for(let k=0;k<c.n;k++){c.mat[k]=u.mat[k];c.col[k*3]=u.rgb[k*3];c.col[k*3+1]=u.rgb[k*3+1];c.col[k*3+2]=u.rgb[k*3+2];c.sil[k]=u.sil[k]}
c.wheels=u.wheels.map(o=>({cx:o.cx,cy:o.cy,r:o.r}));c.rods=u.rods;
for(let k=0;k<c.n;k++)if(c.mat[k]===M.WHEEL){const i=k%c.w+.5,j=((k/c.w)|0)+.5;let best=-1,bd=1e9;c.wheels.forEach((o,id)=>{const dd=Math.hypot(i-o.cx,j-o.cy);if(dd<=o.r+.75&&dd<bd){bd=dd;best=id}});c.wid[k]=best}
}
for(const t in CARS){const d=CARS[t],U=USIZE[t],sx=U.w/d.w,sy=U.h/d.h;d.ow=d.w;d.oh=d.h;d.sx=sx;d.sy=sy;d.w=U.w;d.h=U.h;d.split=U.split;d.wheelR*=Math.min(sx,sy);for(const k in d.pts)d.pts[k]=[d.pts[k][0]*sx,d.pts[k][1]*sy]}
function lampAlive(c,p){for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=(p[0]|0)+dx,y=(p[1]|0)+dy;if(x>=0&&y>=0&&x<c.w&&y<c.h&&c.mat[y*c.w+x]===M.LAMP)return true}return false}
let carIds=0;
function makeCar(type,override){
if(!CARS[type])type='cargo';
const cu=override===false?null:(override||(CUSTOM[type]&&CUSTOM[type].on?CUSTOM[type]:null));
const d=cu?cu.d:CARS[type],w=d.w,h=d.h,n=w*h;
const c={type,d,w,h,n,id:++carIds,mat:new Uint8Array(n),omat:null,hp:new Float32Array(n),col:new Uint8ClampedArray(n*3),fire:new Float32Array(n),rust:new Float32Array(n),
reg:new Uint8Array(n),wid:new Int8Array(n).fill(-1),sil:new Uint8Array(n),wheels:[],x:0,ax:0,ay:0,ang:0,co:1,si:0,phase:Math.random()*6,
regMax:new Float32Array(8),regHp:new Float32Array(8),regInt:new Float32Array(8).fill(1),alive:new Array(8).fill(true),regFire:new Uint16Array(8),integrity:1,totalMax:0,occ:new Uint8Array(9),lvl:new Uint8Array(8),mul:new Float32Array(8).fill(1)};
c.custom=!!cu;c.pts=cu?cu.pts:d.pts;c.efxSrc=cu?cu.spec:null;
if(cu)applyCustom(c,cu);else d.paint(painter(c,d.sx||1,d.sy||1));
seedInit(c);
c.omat=c.mat.slice();
const air=isAirUnit(d),rc=regCount(d);c.regCount=rc;c.dirtyPaint=1;
for(let j=0;j<h;j++)for(let i=0;i<w;i++){const k=j*w+i;c.reg[k]=cellReg(w,d.split,air,i,j);if(c.mat[k]){c.hp[k]=MAXHP[c.mat[k]];c.regMax[c.reg[k]]+=MAXHP[c.mat[k]]}}
for(let r=0;r<rc;r++)c.totalMax+=c.regMax[r];
c.rad=Math.hypot(w,h)/2+1;
c.cv=document.createElement('canvas');c.cv.width=w;c.cv.height=h;c.cx2=c.cv.getContext('2d');c.img=c.cx2.createImageData(w,h);
ledger(c);
return c;
}
function setMul(c){for(let r=0;r<8;r++)c.mul[r]=r<4?1-.15*c.lvl[r]:1-.22*c.lvl[r]}
function preDamage(c,amount){
const holes=2+((Math.random()*4)|0);
for(let k=0;k<holes;k++){const cx=rand(4,c.w-4),cy=rand(2,c.h*.7),r=rand(2,4.5);
for(let j=0;j<c.h;j++)for(let i=0;i<c.w;i++){const d=Math.hypot(i+.5-cx,j+.5-cy);if(d<r){const q=j*c.w+i;if(c.mat[q]){c.hp[q]-=MAXHP[c.mat[q]]*amount*(1.6-d/r);if(c.hp[q]<=0){c.mat[q]=0;c.hp[q]=0}}}}}
for(let k=0;k<c.n*.08;k++){const q=(Math.random()*c.n)|0;if(c.mat[q])c.rust[q]=rand(.2,.9)}
updateRegions(c);
}
