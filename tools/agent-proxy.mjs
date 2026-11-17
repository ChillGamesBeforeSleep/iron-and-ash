#!/usr/bin/env node
// Iron & Ash — reference endpoint for a language-model agent (see docs/AGENTS.md).
// The game POSTs {observation, actions} here and expects {"actions":[...]} back.
// The API key stays on this machine; the game page never sees it.
//
//   npm install @anthropic-ai/sdk
//   ANTHROPIC_API_KEY=... node tools/agent-proxy.mjs [port]
//
// Refusal fallbacks are enabled (server-side, "default" routing): if the model declines a request,
// the API re-runs it on a fallback model in the same call. Remove `betas`/`fallbacks` to turn that off.
import http from 'node:http';
import Anthropic from '@anthropic-ai/sdk';

const PORT=Number(process.argv[2]||process.env.PORT||8787);
const MODEL=process.env.IRONASH_MODEL||'claude-opus-5-5';
const client=new Anthropic();

const SYSTEM=`You command an armoured train in the game Iron & Ash. Every few seconds you receive an observation (JSON) and reply with the orders you want carried out.
The crew drives, repairs, loots and shoots by themselves according to your DOCTRINE; change it when the situation changes, and give a direct order only when it matters.
What scores: finishing legs, distance, keeping crew alive, keeping wagons intact, kills, and stores.
Things worth knowing: a rocket team behind a barricade does heavy damage — stop short ("standoff" 120-170) and let the cannon work, or ram only with a healthy plough; fuel tanks burn and leak when hit, and a train without fuel is stranded; looting costs time but fills stores; low "repairAt" saves scrap, high keeps sections working.
Reply with ONLY a JSON object of the form {"actions":[...],"why":"one short sentence"}. An empty actions list means "carry on".`;

async function decide(body){
  const response=await client.beta.messages.create({
    model:MODEL,
    max_tokens:16000,
    betas:['server-side-fallback-2026-07-01'],
    fallbacks:'default',
    output_config:{effort:'low'},
    system:SYSTEM,
    messages:[{role:'user',content:`Action formats:\n${JSON.stringify(body.actions,null,1)}\n\nObservation:\n${JSON.stringify(body.observation)}`}],
  });
  if(response.stop_reason==='refusal')return{actions:[],why:'model declined'};
  let text='';
  for(const block of response.content)if(block.type==='text')text+=block.text;
  const a=text.indexOf('{'),b=text.lastIndexOf('}');
  if(a<0||b<=a)return{actions:[],why:'no JSON in reply'};
  try{const out=JSON.parse(text.slice(a,b+1));return{actions:Array.isArray(out.actions)?out.actions:[],why:String(out.why||'')}}
  catch{return{actions:[],why:'unparseable reply'}}
}

http.createServer(async(req,res)=>{
  const cors={'access-control-allow-origin':'*','access-control-allow-headers':'content-type','access-control-allow-methods':'POST, OPTIONS'};
  if(req.method==='OPTIONS'){res.writeHead(204,cors);return res.end()}
  if(req.method!=='POST'){res.writeHead(405,cors);return res.end()}
  let raw='';for await(const chunk of req)raw+=chunk;
  let out={actions:[]};
  try{out=await decide(JSON.parse(raw))}
  catch(error){
    if(error instanceof Anthropic.RateLimitError)console.error('rate limited — carrying on with standing orders');
    else if(error instanceof Anthropic.APIError)console.error(`API error ${error.status}: ${error.message}`);
    else console.error(error.message);
  }
  if(out.why)console.log(`t=${JSON.parse(raw).observation?.t??'?'}  ${JSON.stringify(out.actions)}  — ${out.why}`);
  res.writeHead(200,{...cors,'content-type':'application/json'});res.end(JSON.stringify(out));
}).listen(PORT,()=>console.log(`Iron & Ash agent endpoint → http://localhost:${PORT}/decide  (model ${MODEL})`));
