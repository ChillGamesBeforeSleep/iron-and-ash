/* =====================================================================
   RENDER — 2D scene into a low-res buffer, then the ASCII shader
   ===================================================================== */
const view=document.getElementById('view');
const scene=document.createElement('canvas');const sctx=scene.getContext('2d');
let gl=null,prog,sceneTex,atlasTex,U={};
function initGL(){
gl=view.getContext('webgl',{antialias:false,alpha:false});if(!gl)return false;
const vs=`attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const fs=`precision highp float;
uniform sampler2D uScene,uAtlas;uniform vec2 uRes,uCell;uniform float uTime,uN,uRaw,uFlash;
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
float b2(vec2 a){a=floor(a);return fract(dot(a,vec2(.5,a.y*.75)));}
float bayer4(vec2 a){return b2(.5*a)*.25+b2(a);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
if(uRaw>.5){gl_FragColor=vec4(texture2D(uScene,px/uRes).rgb,1.);return;}
vec2 cell=floor(px/uCell),cc=(cell+.5)*uCell,o=uCell*.27;
vec3 s0=texture2D(uScene,(cc+vec2(-o.x,-o.y))/uRes).rgb,s1=texture2D(uScene,(cc+vec2(o.x,-o.y))/uRes).rgb,
s2=texture2D(uScene,(cc+vec2(-o.x,o.y))/uRes).rgb,s3=texture2D(uScene,(cc+vec2(o.x,o.y))/uRes).rgb;
vec3 avg=(s0+s1+s2+s3)*.25,mx=s0;float lm=lum(s0),l;
l=lum(s1);if(l>lm){lm=l;mx=s1;} l=lum(s2);if(l>lm){lm=l;mx=s2;} l=lum(s3);if(l>lm){lm=l;mx=s3;}
float L=max(lum(avg)*1.1,lm*.92);L=pow(clamp((L-.07)*1.5,0.,1.),.62);
float d=(bayer4(cell)-.5)*.09;
float fl=(hash(cell+floor(uTime*9.)*.137)-.5)*.06*step(.06,L);
float g=clamp(L*1.12+d+fl,0.,.999);
float idx=floor(g*uN);
vec2 lc=clamp(fract(px/uCell),.03,.97);
float m=texture2D(uAtlas,vec2((idx+lc.x)/uN,lc.y)).r;
vec3 col=mix(avg,mx,.6);float mc=max(max(col.r,col.g),col.b);
vec3 glyph=min(col/max(mc,.12)*(.42+1.05*mc),vec3(1.));
vec3 bg=vec3(.016,.015,.018)+avg*.11;
gl_FragColor=vec4(bg+m*glyph+uFlash*vec3(.22,.15,.08),1.);
}`;
const sh2=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o};
prog=gl.createProgram();gl.attachShader(prog,sh2(gl.VERTEX_SHADER,vs));gl.attachShader(prog,sh2(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);gl.useProgram(prog);
const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
const loc=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
for(const n of ['uScene','uAtlas','uRes','uCell','uTime','uN','uRaw','uFlash'])U[n]=gl.getUniformLocation(prog,n);
const mk=()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t};
sceneTex=mk();atlasTex=mk();gl.bindTexture(gl.TEXTURE_2D,sceneTex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);buildAtlas();
gl.uniform1i(U.uScene,0);gl.uniform1i(U.uAtlas,1);
return true;
}
function buildAtlas(){
const cp=CFG.cellPresets[G.cell],N=CFG.ramp.length,gw=Math.max(9,Math.round(cp[0]*dpr*3)),gh=Math.max(15,Math.round(cp[1]*dpr*3)),cv=document.createElement('canvas');cv.width=N*gw;cv.height=gh;const c=cv.getContext('2d');
c.fillStyle='#000';c.fillRect(0,0,cv.width,gh);c.fillStyle='#fff';c.font=`600 ${Math.round(gh*.84)}px "IBM Plex Mono", ui-monospace, monospace`;c.textAlign='center';c.textBaseline='middle';
for(let i=0;i<N;i++)c.fillText(CFG.ramp[i],i*gw+gw/2,gh/2+1);
gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,atlasTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cv);gl.activeTexture(gl.TEXTURE0);
}
let dpr=1;
function applyView(){
const asp=innerWidth/Math.max(1,innerHeight),maxH=G.world?G.world.H-24:CFG.zoomMax;let H=Math.round(Math.min(G.viewH,maxH)),W=Math.round(H*asp);
if(W<300){W=300;H=Math.min(CFG.zoomMax,Math.round(300/asp))}
if(scene.width!==W||scene.height!==H){scene.width=W;scene.height=H;sctx.imageSmoothingEnabled=false}
S.W=W;S.H=H;
}
function zoomTick(dt,autoH){
if(G.zoomManual&&G.t-G.wheelT>CFG.zoomIdle)G.zoomManual=false;
if(!G.zoomManual)G.zoomTarget=lerp(G.zoomTarget,clamp(autoH,CFG.zoomMin,CFG.zoomMax),Math.min(1,dt*CFG.zoomReturn));
G.viewH=lerp(G.viewH,G.zoomTarget,Math.min(1,dt*7));applyView();
}
function zoomBy(f){G.zoomTarget=clamp(G.zoomTarget*f,CFG.zoomMin,CFG.zoomMax);G.zoomManual=true;G.wheelT=G.t;updateViewbar()}
function zoomAuto(){G.zoomManual=false;G.wheelT=-99;updateViewbar()}
function playCamera(dt){
if(G.cameraPilot&&G.cameraPilot.alive&&G.cameraPilot.state==='chute'){const m=G.cameraPilot,alt=Math.max(0,groundY(m.x)-m.gy);zoomTick(dt,clamp(CFG.flightZoom+alt*.22,CFG.zoomMin,CFG.zoomMax));const tx=m.x-S.W*.5,ty=m.gy-S.H*.52;G.camX=lerp(G.camX,tx,Math.min(1,dt*5));G.camY=lerp(G.camY,ty,Math.min(1,dt*5));return}
if(G.cameraPilot&&G.cameraPilot.state!=='chute')G.cameraPilot=null;
if(G.piloting&&G.vehicles&&G.vehicles.includes(G.piloting)){const f=G.piloting,alt=Math.max(0,groundY(f.cxw)-f.cyw),asp=innerWidth/Math.max(1,innerHeight);
if(G.exp&&G.exp.craft===f){
let spanL=f.cxw-f.w/2-36,spanR=f.cxw+f.w/2+36;
for(const m of G.exp.members)if(m.alive){spanL=Math.min(spanL,m.x-CFG.camPad);spanR=Math.max(spanR,m.x+CFG.camPad)}
if(G.exp.tgt){spanL=Math.min(spanL,G.exp.tgt.x-CFG.camPad);spanR=Math.max(spanR,G.exp.tgt.x+CFG.camPad)}
zoomTick(dt,clamp(Math.max(CFG.zoomAutoMin,(spanR-spanL)/asp),CFG.zoomMin,CFG.zoomMax));
const tx=(spanL+spanR)/2-S.W*.5,ty=f.cyw-S.H*.62;
G.camX=lerp(G.camX,tx,Math.min(1,dt*5));G.camY=lerp(G.camY,ty,Math.min(1,dt*5));return;
}
zoomTick(dt,clamp(CFG.flightZoom+alt*.22,CFG.zoomMin,CFG.zoomMax));
const tx=f.cxw+f.vx*.55-S.W*.5,ty=f.cyw+f.vy*.35-S.H*.52;
G.camX=lerp(G.camX,tx,Math.min(1,dt*5));G.camY=lerp(G.camY,ty,Math.min(1,dt*5));return}
const cars=G.train.cars,L=cars[0],last=cars[cars.length-1],v=G.train.v,asp=innerWidth/Math.max(1,innerHeight);
const front=L.x+L.w/2,rear=last.x-last.w/2;
let spanL=rear-36-Math.max(0,-v)*CFG.lookAhead,spanR=front+56+Math.max(0,v)*CFG.lookAhead;
const keep=[];if(G.exp)for(const m of G.exp.members)if(m.alive&&m.state!=='in')keep.push(m.x);if(G.boarders)for(const b of G.boarders)keep.push(b.x);for(const m of G.strays||[])if(m.state==='chute')keep.push(m.x);
for(const vh of G.vehicles||[])if(Math.abs(vh.cxw-(front+rear)/2)<CFG.camVehicle)keep.push(vh.cxw);
for(const x of keep){spanL=Math.min(spanL,x-CFG.camPad);spanR=Math.max(spanR,x+CFG.camPad)}
zoomTick(dt,Math.max(CFG.zoomAutoMin,(spanR-spanL)/asp));
const W=S.W,tx=(spanR-spanL<=W)?(spanL+spanR)/2-W/2:spanR-W;
let ay=0;for(const c of cars)ay+=c.ay;ay/=cars.length;const ty=ay-S.H*(keep.length?.66:.6);
G.camX=lerp(G.camX,tx,Math.min(1,dt*3));G.camY=lerp(G.camY,ty,Math.min(1,dt*3));
}
function resize(){
dpr=Math.min(window.devicePixelRatio||1,2);
view.width=Math.max(1,Math.round(innerWidth*dpr));view.height=Math.max(1,Math.round(innerHeight*dpr));
const fxc=document.getElementById('fx');fxc.width=view.width;fxc.height=view.height;
applyView();if(gl)buildAtlas();
}
