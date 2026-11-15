/* =====================================================================
   BOOT
   ===================================================================== */
try{initGL()}catch(err){console.error(err);gl=null}
addEventListener('resize',resize);resize();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{if(gl)buildAtlas()});
G.train=newTrain();genWorld(1);layout(G.train.cars,G.train.x);G.all=G.train.cars.slice();computeCaps();
G.camX=clamp(G.train.x-S.W*.6,0,G.world.W-S.W-1);G.camY=clamp(G.train.cars[0].ay-S.H*.66,0,G.world.H-S.H-1);
showTitle();loadUnits();
let last=performance.now(),hudT=0,acc=0;
const FIXED=1/60,MAX_STEPS=2;
/* v3.40: one exception inside a frame used to kill requestAnimationFrame for good — the "game freezes" bug.
   The loop now survives: the error is reported once per distinct message (console + log line + G.errors for the match report). */
function frame(now){try{frameBody(now)}catch(err){frameError(err)}requestAnimationFrame(frame)}
function frameError(err){const msg=String(err&&err.message||err);G.errors=G.errors||{};const seen=G.errors[msg];G.errors[msg]=(seen||0)+1;
if(!seen){console.error(err);try{log(`ENGINE ERROR: ${msg} — the game keeps running; see the console (F12)`,"bad")}catch(e){}}}
function frameBody(now){
const raw=Math.min(.1,(now-last)/1000),dt=Math.min(1/30,raw);last=now;
G.fps=lerp(G.fps,1000/Math.max(1,now-(G.prevNow||now-16)),.05);G.prevNow=now;
if(G.dev.auto&&G.state==='leg'){G.apT=(G.apT||0)+dt;if(G.apT>2.5){G.apT=0;apStation()}}
if(G.dev.auto&&G.state==='over'&&!overlay.hidden){G.apT=(G.apT||0)+dt;if(G.apT>4){G.apT=0;startRun()}}
const slowK=(G.slow>0)?CFG.slowmoScale:1;if(G.slow>0)G.slow-=dt;
if(G.state==='play'&&!G.paused){acc+=raw;let n=0;while(acc>=FIXED&&n<MAX_STEPS){step(FIXED*G.dev.ts*slowK);acc-=FIXED;n++}if(n===MAX_STEPS)acc=0;if(G.sim)simTick(dt)}else if(G.state==='title'){G.t+=dt;layout(G.train.cars,G.train.x);zoomTick(dt,292);G.camX=clamp(G.train.x-S.W*.6,0,G.world.W-S.W-1);G.camY=clamp(G.train.cars[0].ay-S.H*.66,0,G.world.H-S.H-1)}else if(G.state==='workshop')wsStep(dt);
G.mouse.wx=G.camX+G.mouse.sx/innerWidth*S.W;G.mouse.wy=G.camY+G.mouse.sy/innerHeight*S.H;
PT('render scene');renderScene();PT('ascii shader');present();PT('symbols');drawSymbols();PT('sound+ui');
soundLoops();if((G.vbT=(G.vbT||0)-dt)<=0){G.vbT=.25;updateViewbar();devTick()}
hudT-=dt;if(hudT<=0&&G.state!=='title'&&G.state!=='workshop'){hudT=.12;updateHUD()}
PT('');PTend();G.frameN=(G.frameN||0)+1;
if(CFG.perfGovernor){const ft=performance.now()-now;G.ftAvg=lerp(G.ftAvg||16,ft,.1);G.q=clamp((G.q||1)+(G.ftAvg>30?-.02:G.ftAvg<20?.005:0),.35,1)}else G.q=1;
}
requestAnimationFrame(frame);
window.__G=G;window.__api={explode,vehPose,updateRegions,toggleCarrierFlight,launchBay,landOnDeck,unloadVehicleToTrain,bayOf,bayService,setControl,cycleControl,ejectPilot,rollFlyer,strayTick,setGunner,planeExpedition,playerAirControl,airContacts,updateExpedition,discardInventorySlot,inventoryAddTo,transferPackToVehicle,gunnerTick,cannonTarget,sectionClick,deckLevel,ownFlyers,baysAtStation,setCruise,cruiseTick,wrapA,repairFull,botTier,crewLvl,builtinArt,defaultSpec,groundY,airInit,saveUnit,startSim,endSim,simFlyer,simTick,effectsTick,EFX,EFX_MAX,BUILTIN_FX,FG,paintReplace,airBalance,goStep,stepIdx,testSpawn,airMassProps,PX,updateShots,hitPixel,destroyPixel,MATNAME,dripFrom,spawnAir,airStep,roleShare,AIR,rollLoot,weaponOf,crewFire,raiderDie,spawnPlane,vehicleTick,MATS,M,glowBlobs,storeSpot,regionU,findTarget,giveTask,insideVisible,coverAt,dropSalvage,spawnDrone,toWorld,toWorldY:c=>toWorld(c,c.w/2,c.d.split)[1],crewTick,addCrew,killMember,initCrew,invAdd,invCount,crewSync,partyCands,buyGear,crewOnTrain,ITEMS,fireTarget,waterSpot,hurtHp,cabCar,spawnRaiders,hitRaiders,raiderTick,hitWalker,bodyInt,healthyAboard,BLUEPRINTS,importUnitText,fgRebuild,startConsist,get CONSIST(){return CONSIST},makeCar,ROLES,CARS,USIZE,GAME_VERSION,structAt,craneTick,pumpTick,computeCaps,addActive,pxStep,step,apStation,startRun,buildReport,toggleDev,CFG,zoomBy,setCell,setRaw,SND,detachCheck,CUSTOM,compileUnit,showWorkshop,readSave,saveGame,renderStation,repairRegion,quickRepair,tryExpedition,damageCircle,fireGun};
