/* =====================================================================
   BLOCK ASSEMBLY (v3.43) — a vehicle is THREE BLOCKS bolted to a FRAME.

   A block is one third of a stock vehicle, pixels and all: an engine-and-tank block,
   a cab, a gun-and-bomb block, a passenger cabin. Any block can go in any position.
   The FRAME is what makes the thing a kind of machine, and it is where the "how does
   it move" pixels live:
     plane   WINGS            wing, tail fin, stabiliser — ALU skin, the lift
     heli    ROTOR            mast, rotor, tail rotor
     mole    TRACKS + DRILL   crawler tracks and a hardened drill cone — the bite
     tank    TRACKS           crawler tracks
   Nothing here decides whether the result works. The Pixel Ledger (04b) does:
   three armoured tank blocks on a wing frame is a legal build that cannot fly,
   and the checklist says so.
   ===================================================================== */
const BLOCK_BASES=['plane','heli','mole','tank'];
const FRAME_INFO={
plane:{label:'WINGS',what:'wing, tail fin and stabiliser (ALU skin — this is where the lift comes from)'},
heli:{label:'ROTOR',what:'mast, rotor and tail rotor'},
mole:{label:'TRACKS + DRILL',what:'crawler tracks and a hardened drill cone (the bite)'},
tank:{label:'TRACKS',what:'crawler tracks'},
};
const _blockArt={};
function blockArt(t){return _blockArt[t]||(_blockArt[t]=builtinArt(t))}
/* every block on offer, with what it is worth — read from the stock units' own pixels */
function blockList(){const out=[],pos=['rear','middle','front'];
for(const t of BLOCK_BASES){if(!CARS[t])continue;const c=makeCar(t,false);
for(let i=0;i<3;i++){let mass=0,fuel=0,ammo=0,eng=0,bat=0;for(let k=0;k<c.n;k++){const m=c.mat[k];if(!m||c.reg[k]!==i)continue;mass+=LMASS[m];eng+=LENG[m];if(m===M.FUEL)fuel++;else if(m===M.AMMO)ammo++;else if(m===M.BATTERY)bat++}
const gas=Math.round((fuel*CFG.px.fuel+bat*CFG.px.charge)*CFG.gasPerFuel),shots=Math.round(ammo*CFG.px.ammo*CFG.airShotsPerAmmo),role=CARS[t].roles[i];
const stat=`${(mass/CFG.px.massUnit).toFixed(2)} t${gas?` · ${gas} gas`:''}${shots?` · ${shots} shots`:''} · engine work ${Math.round(eng)}`;
out.push({id:t+':'+i,from:t,box:i,role,label:`${TYPE_LABEL[t]} ${pos[i]} — ${role} · ${stat}`});
if(role==='CAB')out.push({id:t+':'+i+':SEATS',from:t,box:i,role:'SEATS',label:`${TYPE_LABEL[t]} ${pos[i]} — as PASSENGER SEATS · ${stat}`})}}
return out}
function paintFrame(base,look,mat,W,H){
const put=(x,y,m,rgb)=>{x|=0;y|=0;if(x<0||y<0||x>=W||y>=H)return;const p=(y*W+x)*4,pal=MATS[m].pal;look.data[p]=rgb[0];look.data[p+1]=rgb[1];look.data[p+2]=rgb[2];look.data[p+3]=255;mat.data[p]=pal[0];mat.data[p+1]=pal[1];mat.data[p+2]=pal[2];mat.data[p+3]=255};
const n=(x,y,a)=>1+(hash2(x*3+1,y*7+5)-.5)*a,sh2=(c,k)=>[c[0]*k,c[1]*k,c[2]*k];
if(base==='plane'){
const y0=Math.round(H*.56),SK=[158,168,160];
for(let x=Math.round(W*.14);x<=Math.round(W*.78);x++)for(let j=0;j<3;j++)put(x,y0+j,M.ALU,sh2(SK,(j===0?1.12:j===2?.78:.95)*n(x,y0+j,.14)));
for(let x=0;x<=Math.round(W*.13);x++){const top=Math.round(H*.12+(H*.38)*(x/(W*.13)));for(let y=top;y<=Math.round(H*.5);y++)put(x,y,M.ALU,sh2(SK,(y===top?1.15:.9)*n(x,y,.14)))}
for(let x=0;x<=Math.round(W*.2);x++)for(let j=0;j<2;j++)put(x,Math.round(H*.44)+j,M.ALU,sh2(SK,(j?.8:1.05)*n(x,j,.12)));
}else if(base==='heli'){
const BL=[124,128,122],MS=[70,68,64];
for(let x=Math.round(W*.08);x<=Math.round(W*.92);x++)put(x,1,M.ALU,sh2(BL,n(x,1,.16)));
for(let y=2;y<=Math.round(H*.22);y++)for(const dx of [-1,0,1])put(Math.round(W*.5)+dx,y,M.STEEL,sh2(MS,n(dx,y,.2)));
for(let y=Math.round(H*.2);y<=Math.round(H*.5);y++)for(const x of [0,1])put(x,y,M.ALU,sh2(BL,n(x,y,.16)));
}else{
const TR=[58,54,48],x1=base==='mole'?Math.round(W*.8):W-1,h=base==='mole'?4:5;
for(let x=Math.round(W*.04);x<=x1;x++)for(let j=0;j<h;j++){const y=H-1-j;put(x,y,M.WHEEL,sh2(TR,(j===0||j===h-1?1.25:(x%3===0?1.1:.8))*n(x,y,.18)))}
if(base==='mole'){const cy=H*.62,xa=Math.round(W*.76);
for(let x=xa;x<W;x++){const r=Math.max(1,Math.round((W-x)*.52));for(let y=Math.round(cy-r);y<=Math.round(cy+r-1);y++)put(x,y,M.ARMOR,(x+y)%3===0?[210,196,160]:sh2([148,142,132],n(x,y,.2)))}}
}}
async function draftFromBlocks(base,picks,frame){
const d=blankDraft(base),S=baseSize(base),W=S.w,H=S.h,look=new ImageData(W,H),mat=new ImageData(W,H),bw=W/3;
picks.forEach((pid,slot)=>{const [t,bi]=pid.split(':'),art=blockArt(t),sw=art.look.width,sh=art.look.height,sbw=sw/3,x0=Math.round(slot*bw),x1=Math.round((slot+1)*bw);
for(let y=0;y<H;y++){const sy=Math.min(sh-1,Math.floor((y+.5)*sh/H));
for(let X=x0;X<x1;X++){const sx=Math.min(sw-1,Math.floor(+bi*sbw+(X-x0+.5)*sbw/(x1-x0))),q=(sy*sw+sx)*4,p=(y*W+X)*4;
for(let k=0;k<4;k++){look.data[p+k]=art.look.data[q+k];mat.data[p+k]=art.mat.data[q+k]}}}});
if(frame)paintFrame(base,look,mat,W,H);
d.roles=picks.map(pid=>{const [t,bi,ov]=pid.split(':');return ov||CARS[t].roles[+bi]});
d.look=look;d.mat=mat;d.lookURL=idToCanvas(look).toDataURL('image/png');d.matURL=idToCanvas(mat).toDataURL('image/png');
d.lookName=d.matName='assembled from blocks';d.dirty=true;d.from='';d.blocks=picks.slice();
d.spec.effects=JSON.parse(JSON.stringify(BUILTIN_FX[base]||[]));
return d}
function blocksHTML(){const d=FG.d;if(!BLOCK_BASES.includes(d.base))return '';
const B=blockList(),cur=FG.blocks&&FG.blocksBase===d.base?FG.blocks:[d.base+':0',d.base+':1',d.base+':2'];
const sel=(id,def)=>`<select id="${id}" style="max-width:100%">${B.map(b=>`<option value="${b.id}" ${b.id===def?'selected':''}>${b.label}</option>`).join('')}</select>`;
return `<section><h3>Assemble from blocks</h3>
<p class="note">A vehicle is <b>three blocks bolted to a frame</b>. Pick any block for each position; the <b>${FRAME_INFO[d.base].label}</b> frame of the type chosen above is added on top. Nothing stops a strange build — the checklist then tells you what it weighs, what it holds, and whether it flies, hovers or digs.</p>
<div class="fld"><label for="fgB0">Rear block</label>${sel('fgB0',cur[0])}</div>
<div class="fld" style="margin-top:6px"><label for="fgB1">Middle block</label>${sel('fgB1',cur[1])}</div>
<div class="fld" style="margin-top:6px"><label for="fgB2">Front block</label>${sel('fgB2',cur[2])}</div>
<div class="row" style="margin-top:8px;align-items:center"><label class="chk"><input type="checkbox" id="fgFrame" checked> Add the frame: ${FRAME_INFO[d.base].what}</label></div>
<div class="row" style="margin-top:8px"><button class="go" id="fgAsm" type="button" style="font-size:17px;padding:4px 14px">ASSEMBLE</button></div></section>`}
async function assembleFromForm(){const d=FG.d,picks=[$('fgB0').value,$('fgB1').value,$('fgB2').value],frame=$('fgFrame').checked;
const nd=await draftFromBlocks(d.base,picks,frame);nd.name=d.name||('CUSTOM '+BASE_INFO[d.base].label);nd.id=d.id;
FG.d=nd;FG.blocks=picks;FG.blocksBase=d.base;FG.undo=[];fgRebuild();
log(`Assembled ${nd.roles.join(' + ')}${frame?' on a '+FRAME_INFO[d.base].label.toLowerCase()+' frame':''} — read the checklist to see what you built`,'good')}
