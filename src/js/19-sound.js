/* =====================================================================
   SOUND — everything synthesised with WebAudio, no files
   ===================================================================== */
const SND={ctx:null,master:null,on:true,noise:null,last:{},loops:{}};
function audioInit(){
if(SND.ctx){if(SND.ctx.state==='suspended')SND.ctx.resume();return}
try{SND.ctx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return}
const a=SND.ctx;SND.master=a.createGain();SND.master.gain.value=SND.on?.6:0;const comp=a.createDynamicsCompressor();SND.master.connect(comp);comp.connect(a.destination);
const buf=a.createBuffer(1,a.sampleRate,a.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;SND.noise=buf;
const nl=(type,f,q)=>{const s=a.createBufferSource();s.buffer=buf;s.loop=true;const fl=a.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=a.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(SND.master);s.start();return{g,f:fl}};
SND.loops.fire=nl('bandpass',1500,.7);SND.loops.rain=nl('highpass',2600,.4);
{const o=a.createOscillator();o.type='sawtooth';o.frequency.value=118;const fl=a.createBiquadFilter();fl.type='lowpass';fl.frequency.value=700;const g=a.createGain();g.gain.value=0;o.connect(fl);fl.connect(g);g.connect(SND.master);o.start();SND.loops.drone={g,o}}
{const o=a.createOscillator();o.type='triangle';o.frequency.value=2300;const l=a.createOscillator();l.frequency.value=7;const lg=a.createGain();lg.gain.value=60;l.connect(lg);lg.connect(o.frequency);l.start();const g=a.createGain();g.gain.value=0;o.connect(g);g.connect(SND.master);o.start();SND.loops.brake={g}}
}
function setLoop(name,v){const l=SND.loops[name];if(l&&SND.ctx)l.g.gain.setTargetAtTime(v,SND.ctx.currentTime,.1)}
function burst(o){const a=SND.ctx,t=a.currentTime+(o.delay||0),s=a.createBufferSource();s.buffer=SND.noise;s.playbackRate.value=o.rate||1;const f=a.createBiquadFilter();f.type=o.type||'bandpass';f.frequency.setValueAtTime(o.freq||800,t);f.Q.value=o.q||1;
if(o.sweep)f.frequency.exponentialRampToValueAtTime(Math.max(30,(o.freq||800)*o.sweep),t+o.dur);const g=a.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,o.vol),t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+o.dur);
s.connect(f);f.connect(g);g.connect(SND.master);s.start(t,Math.random()*.5);s.stop(t+o.dur+.05)}
function tone(o){const a=SND.ctx,t=a.currentTime+(o.delay||0),os=a.createOscillator();os.type=o.type||'sine';os.frequency.setValueAtTime(o.freq,t);if(o.slide)os.frequency.exponentialRampToValueAtTime(o.freq*o.slide,t+o.dur);
const g=a.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,o.vol),t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+o.dur);os.connect(g);g.connect(SND.master);os.start(t);os.stop(t+o.dur+.05)}
const GAP={clack:.05,boom:.035,tink:.03,shot:.025,thud:.05,break:.05,bad:.5,chuff:.03};
function sfx(name,vol=1,x){
if(!SND.ctx||!SND.on||SND.ctx.state!=='running')return;const now=SND.ctx.currentTime;if(GAP[name]&&now-(SND.last[name]||0)<GAP[name])return;SND.last[name]=now;
if(x!==undefined){const d=Math.abs(x-(G.camX+S.W*.5));vol*=clamp(1.15-d/(S.W*.9),0,1)}if(vol<.03)return;vol=Math.min(1.2,vol);
switch(name){
case 'chuff':burst({freq:rand(420,620),q:.7,dur:.17,vol:.2*vol,sweep:.55});break;
case 'clack':tone({freq:180,type:'square',dur:.025,vol:.035*vol});tone({freq:150,type:'square',dur:.025,vol:.03*vol,delay:.085});break;
case 'boom':burst({freq:1100,type:'lowpass',q:.4,dur:.45+.2*vol,vol:.8*vol,sweep:.12});tone({freq:68,dur:.4,vol:.55*vol,slide:.45});break;
case 'gun':tone({freq:130,type:'triangle',dur:.2,vol:.55,slide:.35});burst({freq:2400,type:'highpass',dur:.09,vol:.3});break;
case 'shot':tone({freq:1500,type:'square',dur:.035,vol:.05*vol,slide:.55});break;
case 'tink':tone({freq:rand(1700,3300),dur:.07,vol:.07*vol,slide:.85});break;
case 'thud':burst({freq:200,type:'lowpass',q:.5,dur:.2,vol:.4*vol,sweep:.5});break;
case 'break':burst({freq:rand(900,1600),q:2.5,dur:.18,vol:.25*vol,sweep:.5});tone({freq:rand(260,420),type:'triangle',dur:.25,vol:.12*vol,slide:.6});break;
case 'crash':burst({freq:600,type:'lowpass',dur:.5,vol:.7*vol,sweep:.25});tone({freq:rand(500,800),type:'triangle',dur:.4,vol:.1*vol,slide:.7});break;
case 'repair':tone({freq:660,type:'square',dur:.06,vol:.06});tone({freq:990,type:'square',dur:.08,vol:.06,delay:.07});break;
case 'loot':[523,659,784].forEach((f,i)=>tone({freq:f,type:'triangle',dur:.14,vol:.12,delay:i*.08}));break;
case 'bad':tone({freq:220,type:'sawtooth',dur:.22,vol:.06,slide:.7});break;
}
}
function soundLoops(){
if(!SND.ctx)return;const live=G.state==='play'&&!G.paused||G.state==='workshop';
let fires=0;if(live)for(const c of G.all)fires+=c.fires||0;setLoop('fire',live?Math.min(.32,fires/260):0);
const L=G.train&&G.train.cars[0];setLoop('rain',live&&L&&G.state==='play'&&biomeAt(L.ax).type==='acid'?.07:0);
let dn=1e9;if(live)for(const d of G.drones)if(!d.dead)dn=Math.min(dn,Math.hypot(d.x-(G.camX+S.W*.6),d.y-(G.camY+S.H*.5)));setLoop('drone',dn<1e8?clamp(.07-dn/4000,0,.07):0);
setLoop('brake',live&&((G.brake&&G.train&&Math.abs(G.train.v)>10)||(G.scrape&&Math.abs(G.train.v)>3))?.025+(G.scrape?.02:0):0);
}
addEventListener('pointerdown',audioInit,{capture:true});addEventListener('keydown',audioInit,{capture:true});
