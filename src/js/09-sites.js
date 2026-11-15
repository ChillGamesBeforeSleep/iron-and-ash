/* ---------- looting dismantles buildings; a stripped or shot-out building comes down ---------- */
function siteDepth(s){return s.stock0?1-s.stock/s.stock0:0}
function siteRisk(s,n){const D=SITES[s.type];return Math.min(.95,D.p*(1+CFG.lootDepthRisk*siteDepth(s))*(1+CFG.lootNoise*(n-1))*(2-(s.cells0?s.cellsLeft/s.cells0:1)))}
function siteCollapse(s,why){
s.collapsed=true;const nm=SITES[s.type].name;
if(why!=='stripped'){
if(s.type==='tower'){if(s.water>0)log(`${nm} collapsed — its water is gone`,'warn');s.water=0}
else if(s.stock>0)log(`${nm} collapsed — whatever was inside is buried`,'warn');
s.stock=0;s.uses=0;s.cache={};
const e=G.exp;if(e&&!e.resolved&&e.tgt.kind==='site'&&e.tgt.s===s){let dead=0;
for(const m of e.members)if(m.alive&&m.state==='work'){if(Math.random()<CFG.trapKill){killMember(m);dead++}else if(m.body)accidentHit(m,.1,.45)}
e.resolved=true;e.loot=null;for(const m of e.members)if(m.alive)m.state='back';
log(dead?`${dead} looter${dead>1?'s':''} buried inside the ${nm.toLowerCase()}`:`Looters scrambled out of the ${nm.toLowerCase()} as it fell`,'bad')}}
s.crumble=1e-3;s.colAcc=0;sfx('crash',.8,s.x);
}
function siteTear(s){
if(!PX.occ||s.collapsed||s.cellsLeft-1<=s.cells0*(CFG.collapseAt+.04))return;
for(let t=0;t<8;t++){const x=s.cx0+((Math.random()*(s.cx1-s.cx0+1))|0);if(x<0||x>=PX.W)continue;
for(let y=Math.max(0,s.by0);y<s.by0+s.bh;y++){const k=y*PX.W+x;if(PX.occ[k]!==2)continue;const c=PX.cells.get(k);if(!c||c.st!==s.si)break;
pxKick(k,rand(-20,20),-rand(5,25),99);if(Math.random()<.15)spawn(x,y,rand(-6,6),rand(-15,-4),rand(1,2),[130,122,110],2,'smoke');return}}
}
function crumbleTick(dt){
const w=G.world;if(!w||!PX.occ)return;
for(const s of w.sites){if(!s.crumble||s.cellsLeft<=0)continue;s.crumble+=dt;if(s.crumble>10){s.crumble=0;continue}
if(Math.random()<dt*8)spawn(s.x+rand(-28,28),T(s.x)-rand(0,40),rand(-12,12),rand(-22,-6),rand(1.5,3),[120,112,100],2,'smoke');
if(PX.act.length>CFG.maxActive*.6)continue;
s.colAcc+=dt*40;while(s.colAcc>=1){s.colAcc--;const x=s.cx0+((Math.random()*(s.cx1-s.cx0+1))|0);if(x<0||x>=PX.W)continue;
for(let y=Math.min(PX.H-1,s.by0+s.bh-1);y>=Math.max(0,s.by0);y--){const k=y*PX.W+x;if(PX.occ[k]!==2)continue;const c=PX.cells.get(k);if(c&&c.st===s.si){pxKick(k,rand(-14,14),-rand(0,15),0);break}}}}
}
