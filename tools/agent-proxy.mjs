#!/usr/bin/env node
// Iron & Ash — reference endpoint for a language-model agent WITH MEMORY (see docs/AGENTS.md).
//
// Protocol 2. The game POSTs JSON with a "kind":
//   start   {episode, info:{seed, set:'practice'|'test'|'free', round, rulebook, ...}}   -> {ok, doc?}
//   decide  {episode, observation, actions}                                            -> {actions:[...], why}
//   end     {episode, report}                                                          -> {ok, lesson}
// (a protocol-1 body without "kind" is treated as decide)
//
// Memory, per agent name (the URL path: http://localhost:8787/claude-a → agent "claude-a"):
//   agent-memory/<name>/playbook.md   lessons the agent wrote itself after practice games (goes into every briefing)
//   agent-memory/<name>/skills.json   situation → orders, with how often each was tried and how it went
//   agent-memory/<name>/journal.jsonl one line per finished episode (scores; never shown to the model)
// Learning happens only after PRACTICE games: the model reads its match report and rewrites its playbook.
// TEST games read the memory but never write it, so the league's test score measures what was learned.
//
//   npm install @anthropic-ai/sdk
//   ANTHROPIC_API_KEY=... node tools/agent-proxy.mjs [port]
//   IRONASH_MOCK=1 node tools/agent-proxy.mjs          # no model, no key, no cost: checks the plumbing
//
// Settings (env): IRONASH_MODEL (default claude-opus-5-5; ?model=claude-haiku-5-5 on the URL overrides per agent),
// IRONASH_MAX_CALLS decisions per episode (default 300), IRONASH_PLAYBOOK_CHARS memory cap (default 4000).
// The API key stays on this machine; the game page never sees it.
// Refusal fallbacks are enabled (server-side, "default" routing). Remove `betas`/`fallbacks` to turn that off.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT=Number(process.argv[2]||process.env.PORT||8787);
const MOCK=!!process.env.IRONASH_MOCK;
const DEFAULT_MODEL=process.env.IRONASH_MODEL||'claude-opus-5-5';
const MAX_CALLS=Number(process.env.IRONASH_MAX_CALLS||300);
const PLAYBOOK_CHARS=Number(process.env.IRONASH_PLAYBOOK_CHARS||4000);
const MEM_ROOT=path.resolve(process.env.IRONASH_MEMORY||'agent-memory');
const HISTORY=8; // short-term memory: the last decisions of this episode, replayed into each prompt

let client=null,Anthropic=null;
if(!MOCK){({default:Anthropic}=await import('@anthropic-ai/sdk'));client=new Anthropic()}

const ROLE=`You command an armoured train in the game Iron & Ash. Every few seconds of game time you receive an observation (JSON) and reply with the orders you want carried out.
The crew drives, repairs, loots and shoots by themselves according to your DOCTRINE; change it when the situation changes, and give a direct order only when it matters.
Your PLAYBOOK holds lessons you wrote yourself after earlier games — trust it, but notice when a situation is new.
Reply with ONLY a JSON object {"actions":[...],"why":"one short sentence"}. An empty actions list means "carry on".`;

const COACH=`You are reviewing a game of Iron & Ash that you just played as the train's commander. You keep a PLAYBOOK: short, concrete lessons that will be put in front of you at the start of every future game, and a SKILLS list: situation → orders, with a running record of how they worked.
Update both from this match report. Keep what still holds, fix what the report contradicts, add at most three new lessons, merge duplicates, and drop the weakest when space runs out. Lessons must be specific and actionable (numbers, thresholds, which orders) — not general advice. Never record anything about particular seeds or map positions: future games are on worlds you have not seen.
Reply with ONLY a JSON object {"playbook":"markdown, at most ${PLAYBOOK_CHARS} characters","skills":[{"when":"situation","orders":{doctrine or action},"tries":n,"meanGain":points}],"lesson":"the one most important thing you learned, one sentence"}.`;

/* ---------- memory on disk ---------- */
const safe=s=>String(s||'claude').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').slice(0,40)||'claude';
const dir=name=>{const d=path.join(MEM_ROOT,safe(name));fs.mkdirSync(d,{recursive:true});return d};
const readText=(f,d='')=>{try{return fs.readFileSync(f,'utf8')}catch{return d}};
const loadMemory=name=>({playbook:readText(path.join(dir(name),'playbook.md')),skills:JSON.parse(readText(path.join(dir(name),'skills.json'),'[]'))});
function saveMemory(name,m){const d=dir(name);
  fs.writeFileSync(path.join(d,'playbook.md'),String(m.playbook||'').slice(0,PLAYBOOK_CHARS));
  fs.writeFileSync(path.join(d,'skills.json'),JSON.stringify((m.skills||[]).slice(0,30),null,1))}
const journal=(name,line)=>fs.appendFileSync(path.join(dir(name),'journal.jsonl'),JSON.stringify(line)+'\n');

/* ---------- episodes in flight ---------- */
const episodes=new Map();
function episodeFor(body,agent,model){
  let e=episodes.get(body.episode);
  if(!e){e={agent,model:MOCK?'mock':model,set:'free',rulebook:'',memory:loadMemory(agent),history:[],calls:0,tokens:{in:0,out:0,cached:0}};episodes.set(body.episode||'?',e)}
  return e}

/* ---------- model calls ---------- */
const textOf=r=>r.content.filter(b=>b.type==='text').map(b=>b.text).join('');
function parseJSON(t){const a=t.indexOf('{'),b=t.lastIndexOf('}');if(a<0||b<=a)return null;try{return JSON.parse(t.slice(a,b+1))}catch{return null}}
async function ask(e,system,user,maxTokens=16000){
  const r=await client.beta.messages.create({model:e.model,max_tokens:maxTokens,betas:['server-side-fallback-2026-07-01'],fallbacks:'default',
    output_config:{effort:'low'},system,messages:[{role:'user',content:user}]});
  const u=r.usage||{};e.tokens.in+=u.input_tokens||0;e.tokens.out+=u.output_tokens||0;e.tokens.cached+=u.cache_read_input_tokens||0;
  if(r.stop_reason==='refusal')return null;return parseJSON(textOf(r))}

/* the briefing (role + rulebook + playbook) is the same for every call of an episode: cache it */
const briefing=e=>[{type:'text',text:ROLE},{type:'text',cache_control:{type:'ephemeral'},
  text:`${e.rulebook}\n\nYOUR PLAYBOOK (your own lessons from earlier games):\n${e.memory.playbook||'(empty — this is your first game)'}\n\nYOUR SKILLS (situation → orders → record):\n${JSON.stringify(e.memory.skills)}`}];

async function decide(e,obs){
  if(e.calls>=MAX_CALLS)return{actions:[],why:'decision budget spent — standing orders continue'};
  e.calls++;
  if(MOCK){ // a crude rule so the plumbing can be tested without a model
    const amb=obs.threats?.obstacle?.kind==='barricade'&&obs.threats.raiders?.some(r=>r.dugIn);
    return{actions:amb&&!obs.doctrine?.standoff?[{type:'doctrine',standoff:150}]:[],why:amb?'ambush ahead: stop short':'carry on'}}
  const recent=e.history.slice(-HISTORY).map(h=>`t=${h.t} score=${h.score} you ordered ${JSON.stringify(h.actions)} (${h.why})`).join('\n');
  const out=await ask(e,briefing(e),`Your recent decisions this game:\n${recent||'(none yet)'}\n\nObservation now:\n${JSON.stringify(obs)}`);
  if(!out)return{actions:[],why:'no usable reply'};
  return{actions:Array.isArray(out.actions)?out.actions.slice(0,6):[],why:String(out.why||'').slice(0,200)}}

async function reflect(e,report){
  if(MOCK){const lesson=`${report.result}, ${report.score} pts; worst damage: ${Object.keys(report.damageBySource||{})[0]||'none'}`;
    return{playbook:(e.memory.playbook+`\n- (mock) ${lesson}`).slice(-PLAYBOOK_CHARS),skills:e.memory.skills,lesson}}
  const decisions=e.history.filter(h=>h.actions.length).slice(-40);
  const out=await ask(e,[{type:'text',text:COACH}],
    `RULEBOOK:\n${e.rulebook}\n\nCURRENT PLAYBOOK:\n${e.memory.playbook||'(empty)'}\n\nCURRENT SKILLS:\n${JSON.stringify(e.memory.skills)}\n\nMATCH REPORT:\n${JSON.stringify(report)}\n\nYOUR ORDERS DURING THE GAME (t, score then, orders, reason):\n${decisions.map(h=>`${h.t} ${h.score} ${JSON.stringify(h.actions)} ${h.why}`).join('\n')||'(you only used standing orders)'}`);
  if(!out||typeof out.playbook!=='string')return null;
  return{playbook:out.playbook.slice(0,PLAYBOOK_CHARS),skills:Array.isArray(out.skills)?out.skills:e.memory.skills,lesson:String(out.lesson||'').slice(0,300)}}

/* ---------- http ---------- */
http.createServer(async(req,res)=>{
  const cors={'access-control-allow-origin':'*','access-control-allow-headers':'content-type','access-control-allow-methods':'POST, OPTIONS'};
  if(req.method==='OPTIONS'){res.writeHead(204,cors);return res.end()}
  if(req.method!=='POST'){res.writeHead(405,cors);return res.end()}
  const url=new URL(req.url,'http://x'),seg=url.pathname.split('/').filter(Boolean)[0];
  const agent=safe(!seg||seg==='decide'?'claude':seg),qm=url.searchParams.get('model'),model=qm&&/^claude-[a-z0-9-]+$/.test(qm)?qm:DEFAULT_MODEL;
  let raw='';for await(const chunk of req)raw+=chunk;
  let out={actions:[]};
  try{
    const body=JSON.parse(raw),kind=body.kind||'decide',e=episodeFor(body,agent,model);
    if(kind==='start'){Object.assign(e,{set:body.info?.set||'free',rulebook:String(body.info?.rulebook||'').slice(0,20000),memory:loadMemory(agent),history:[],calls:0});
      console.log(`[${agent}] start ${body.info?.set} seed ${body.info?.seed} round ${body.info?.round} · playbook ${e.memory.playbook.length} chars`);out={ok:true}}
    else if(kind==='decide'){out=await decide(e,body.observation||{});const o=body.observation||{};
      e.history.push({t:o.t,score:o.score,actions:out.actions,why:out.why});if(e.history.length>300)e.history.splice(0,100);if(out.actions.length)console.log(`[${agent}] t=${o.t} ${JSON.stringify(out.actions)} — ${out.why}`)}
    else if(kind==='end'){const r=body.report||{};let lesson='';
      if(e.set==='practice'){const m=await reflect(e,r);if(m){saveMemory(agent,m);lesson=m.lesson}}
      journal(agent,{when:new Date().toISOString(),set:e.set,round:r.round,seed:r.seed,result:r.result,score:r.score,calls:e.calls,tokens:e.tokens,model:e.model,lesson});
      console.log(`[${agent}] end ${e.set} seed ${r.seed}: ${r.result} ${r.score} pts · ${e.calls} calls · tokens in ${e.tokens.in} (cached ${e.tokens.cached}) out ${e.tokens.out}${lesson?` · learned: ${lesson}`:''}`);
      episodes.delete(body.episode);out={ok:true,lesson}}
  }catch(error){
    if(Anthropic&&error instanceof Anthropic.RateLimitError)console.error('rate limited — carrying on with standing orders');
    else if(Anthropic&&error instanceof Anthropic.APIError)console.error(`API error ${error.status}: ${error.message}`);
    else console.error(error.message);
  }
  res.writeHead(200,{...cors,'content-type':'application/json'});res.end(JSON.stringify(out));
}).listen(PORT,()=>console.log(`Iron & Ash agent endpoint → http://localhost:${PORT}/<agent-name>  (${MOCK?'MOCK, no model':'model '+DEFAULT_MODEL}; memory in ${MEM_ROOT})`));
