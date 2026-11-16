/* =====================================================================
   INPUT
   ===================================================================== */
addEventListener('keydown',e=>{
if(e.target&&/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;
if(e.code==='Space'||e.code.startsWith('Arrow')||(e.code==='Tab'&&G.state==='play'))e.preventDefault();
G.keys[e.code]=true;if(e.repeat)return;
if(e.code==='BracketLeft'){setCell(G.cell-1);return}
if(e.code==='BracketRight'){setCell(G.cell+1);return}
if(e.code==='Backquote'){setRaw(!G.raw);return}
if(e.code==='KeyZ'){zoomAuto();return}
if(e.code==='F2'){e.preventDefault();toggleDev();return}
if(e.code==='Equal'||e.code==='NumpadAdd'){zoomBy(.85);return}
if(e.code==='Minus'||e.code==='NumpadSubtract'){zoomBy(1/.85);return}
/* [C]: in the Unit Forge and its test range it clears the whole screen of panels (again to bring them back); in a run it toggles the crew panel, Shift+C clears everything */
if(e.code==='KeyC'){if(G.state==='workshop'||G.sim||e.shiftKey||document.body.classList.contains('nohud')){document.body.classList.toggle('nohud');return}G.crewHidden=!G.crewHidden;G.crewHtml='';return}
if(e.code==='KeyM'){SND.on=!SND.on;if(SND.master)SND.master.gain.setTargetAtTime(SND.on?.6:0,SND.ctx.currentTime,.05);log(SND.on?'Sound on':'Sound off','');return}
if(G.state==='workshop'){if(e.code==='Escape')hideWorkshop();return}
if(e.code==='Enter'){if(document.activeElement&&document.activeElement.tagName==='BUTTON')return;if(G.state==='title'){const d=readSave();if(d)loadGame(d);else startRun()}else if(G.state==='leg'){G.leg++;startLeg()}else if(G.state==='over'&&!overlay.hidden)startRun();return}
if(G.state!=='play')return;
if(/^Digit[0-9]$/.test(e.code)){const d=+e.code.slice(5);G.party=d;log(d?`Looting party: ${d} (one always stays to drive)`:'Looting party: auto — half the crew','');return}
if(e.code==='KeyE'){if(G.piloting&&(G.vehicles||[]).includes(G.piloting))planeExpedition(G.piloting);else tryExpedition()}
if(e.code==='KeyQ')quickRepair();
if(e.code==='KeyF')craftAmmo();
if(e.code==='KeyX')salvageEquip();
if(e.code==='KeyP')G.paused=!G.paused;
if(e.code==='KeyH'){if(G.cxFromPlay)closeCodex();else showCodex('units');return}
if(e.code==='KeyV')toggleCarrierFlight();
if(e.code==='Tab')cycleControl();
if(e.code==='KeyJ')ejectPilot();
if(e.code==='KeyR')rollFlyer();
});
addEventListener('keyup',e=>{G.keys[e.code]=false});
addEventListener('blur',()=>{G.keys={};G.mouse.down=false;G.mouse.rdown=false});
view.addEventListener('pointermove',e=>{G.mouse.sx=e.clientX;G.mouse.sy=e.clientY});
view.addEventListener('pointerdown',e=>{G.mouse.sx=e.clientX;G.mouse.sy=e.clientY;if(e.button===2&&G.state==='play')G.mouse.rdown=true;if((G.state==='play'||G.state==='workshop')&&e.button===0){G.mouse.wx=G.camX+e.clientX/innerWidth*S.W;G.mouse.wy=G.camY+e.clientY/innerHeight*S.H;G.mouse.down=true}});
addEventListener('pointerup',()=>{G.mouse.down=false;G.mouse.rdown=false});
view.addEventListener('contextmenu',e=>e.preventDefault());
view.addEventListener('wheel',e=>{e.preventDefault();if(G.state==='leg'||G.state==='over')return;const d=e.deltaMode===1?e.deltaY*30:e.deltaY;zoomBy(Math.exp(clamp(d,-200,200)*.0013))},{passive:false});
